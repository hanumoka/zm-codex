"""Workflow template seed service.

Reads bundled .md templates from app/resources/workflow_seeds/ and creates
workflows in the target project by copying the .md into the project's
.claude/workflows/ directory and reusing the existing import pipeline.
"""

import shutil
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow
from app.services.workflow_sync import (
    WORKFLOW_DIR,
    import_single_workflow_file,
    parse_workflow_md,
)

SEEDS_DIR = Path(__file__).resolve().parent.parent / "resources" / "workflow_seeds"


def list_builtin_templates() -> list[dict[str, str | int]]:
    """Return metadata for all bundled workflow templates."""
    if not SEEDS_DIR.is_dir():
        return []

    templates: list[dict[str, str | int]] = []
    for md_file in sorted(SEEDS_DIR.glob("*.md")):
        try:
            content = md_file.read_text(encoding="utf-8")
        except OSError:
            continue

        parsed = parse_workflow_md(content, md_file.name)
        if not parsed:
            continue

        templates.append({
            "template_name": md_file.stem,
            "name": str(parsed.get("name", md_file.stem)),
            "workflow_type": str(parsed.get("workflow_type", "custom")),
            "description": str(parsed.get("description") or ""),
            "nodes_count": len(parsed.get("nodes") or []),
            "edges_count": len(parsed.get("edges") or []),
        })
    return templates


def get_template_path(template_name: str) -> Path | None:
    """Resolve a template .md file by stem name. Returns None if missing or unsafe."""
    # Disallow path traversal and NULL byte injection
    if (
        "/" in template_name
        or "\\" in template_name
        or ".." in template_name
        or "\x00" in template_name
    ):
        return None

    candidate = SEEDS_DIR / f"{template_name}.md"
    if not candidate.is_file():
        return None
    # Ensure the resolved path is still inside SEEDS_DIR
    try:
        candidate.resolve().relative_to(SEEDS_DIR.resolve())
    except ValueError:
        return None
    return candidate


async def create_from_template(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
    template_name: str,
) -> Workflow:
    """Create a workflow in the target project from a bundled template.

    Steps:
      1. Validate template exists.
      2. Parse template to get the canonical workflow name.
      3. Reject if a workflow with the same name already exists (409 equivalent).
      4. Copy the .md into the project's .claude/workflows/ directory.
      5. Delegate to import_single_workflow_file() to insert DB row.
      6. Return the fresh Workflow.

    Raises:
      FileNotFoundError: template_name not found
      ValueError:        template parse error or name conflict
    """
    src = get_template_path(template_name)
    if src is None:
        raise FileNotFoundError(f"Template not found: {template_name}")

    content = src.read_text(encoding="utf-8")
    parsed = parse_workflow_md(content, src.name)
    if not parsed or not parsed["nodes"]:
        raise ValueError(f"Template {template_name} is invalid or has no nodes")

    wf_name = str(parsed["name"])

    # Duplicate name check (idempotency guard)
    existing_stmt = select(Workflow).where(
        Workflow.project_id == project_id,
        Workflow.name == wf_name,
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        raise ValueError(f"Workflow already exists with name '{wf_name}'")

    # Copy template into project's .claude/workflows/
    wf_dir = Path(project_path) / WORKFLOW_DIR
    wf_dir.mkdir(parents=True, exist_ok=True)
    dest = wf_dir / src.name
    # If dest already exists (stale file), overwrite — import_single_workflow_file
    # will update by-name anyway.
    shutil.copyfile(src, dest)

    # Import via the canonical pipeline. Reject anything other than a fresh
    # creation — if a concurrent request raced past the duplicate pre-check,
    # import_single_workflow_file() will return "updated" and we want the
    # router to surface a 409 rather than silently mutate the existing row.
    action = await import_single_workflow_file(db, project_id, dest)
    if action != "created":
        await db.rollback()
        raise ValueError(
            f"Workflow already exists with name '{wf_name}' (concurrent {action})"
        )
    await db.commit()

    # Fetch the freshly-created workflow
    fresh_stmt = select(Workflow).where(
        Workflow.project_id == project_id,
        Workflow.name == wf_name,
    )
    fresh = (await db.execute(fresh_stmt)).scalar_one_or_none()
    if fresh is None:
        raise RuntimeError(f"Seed import reported '{action}' but workflow not found")
    return fresh
