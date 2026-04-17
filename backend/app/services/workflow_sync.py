"""Workflow ↔ .md bidirectional sync service."""

import hashlib
import re
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow

WORKFLOW_DIR = ".claude/workflows"


def export_to_md(workflow: Workflow) -> str:
    """Convert a Workflow DB record to markdown string."""
    lines: list[str] = [
        "---",
        f"name: {workflow.name}",
        f"type: {workflow.workflow_type}",
        f"id: {workflow.id}",
        "---",
        "",
        f"# {workflow.name}",
        "",
    ]

    if workflow.description:
        lines.append(workflow.description)
        lines.append("")

    # Nodes table
    lines.append("## Nodes")
    lines.append("")
    lines.append("| ID | Label | Type | Skill | Agent | Hook |")
    lines.append("|-----|-------|------|-------|-------|------|")
    for node in workflow.nodes:
        lines.append(
            f"| {node.get('id', '')} "
            f"| {node.get('label', '')} "
            f"| {node.get('type', 'step')} "
            f"| {node.get('skill', '') or ''} "
            f"| {node.get('agent', '') or ''} "
            f"| {node.get('hook', '') or ''} |"
        )
    lines.append("")

    # Edges table
    lines.append("## Edges")
    lines.append("")
    lines.append("| Source | Target | Condition |")
    lines.append("|--------|--------|-----------|")
    for edge in workflow.edges:
        lines.append(
            f"| {edge.get('source', '')} "
            f"| {edge.get('target', '')} "
            f"| {edge.get('condition', '') or ''} |"
        )
    lines.append("")

    return "\n".join(lines)


def parse_workflow_md(content: str, file_name: str) -> dict | None:
    """Parse a workflow markdown file into a dict suitable for Workflow creation.

    Returns None if parsing fails.
    """
    # Normalize line endings (Windows \r\n → \n)
    content = content.replace("\r\n", "\n")

    # Extract frontmatter
    fm_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not fm_match:
        return None

    fm_text = fm_match.group(1)
    fm: dict[str, str] = {}
    for line in fm_text.strip().split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            fm[key.strip()] = val.strip()

    name = fm.get("name", Path(file_name).stem)
    workflow_type = fm.get("type", "custom")
    original_id = fm.get("id")

    # Parse nodes table
    nodes = _parse_table(content, "## Nodes", ["ID", "Label", "Type", "Skill", "Agent", "Hook"])
    parsed_nodes: list[dict[str, str | dict[str, int]]] = []
    for i, row in enumerate(nodes):
        node: dict[str, str | dict[str, int]] = {
            "id": row.get("ID", f"node-{i}"),
            "label": row.get("Label", ""),
            "type": row.get("Type", "step"),
            "position": {"x": 250 * (i % 4), "y": 150 * (i // 4)},
        }
        if row.get("Skill"):
            node["skill"] = row["Skill"]
        if row.get("Agent"):
            node["agent"] = row["Agent"]
        if row.get("Hook"):
            node["hook"] = row["Hook"]
        parsed_nodes.append(node)

    # Parse edges table
    edges = _parse_table(content, "## Edges", ["Source", "Target", "Condition"])
    parsed_edges: list[dict[str, str | None]] = []
    for i, row in enumerate(edges):
        edge: dict[str, str | None] = {
            "id": f"edge-{i}",
            "source": row.get("Source", ""),
            "target": row.get("Target", ""),
            "condition": row.get("Condition") or None,
        }
        parsed_edges.append(edge)

    return {
        "name": name,
        "workflow_type": workflow_type,
        "original_id": original_id,
        "description": _extract_description(content),
        "nodes": parsed_nodes,
        "edges": parsed_edges,
    }


async def export_workflow(
    db: AsyncSession,
    workflow_id: uuid.UUID,
    project_path: str,
) -> str:
    """Export a workflow to .claude/workflows/{name}.md. Returns the file path."""
    wf = await db.get(Workflow, workflow_id)
    if not wf:
        raise ValueError(f"Workflow not found: {workflow_id}")

    md_content = export_to_md(wf)

    wf_dir = Path(project_path) / WORKFLOW_DIR
    wf_dir.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r"[^\w\-]", "_", wf.name.lower())
    file_path = wf_dir / f"{safe_name}.md"
    file_path.write_text(md_content, encoding="utf-8")

    return str(file_path)


async def import_workflows(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
) -> dict[str, int]:
    """Import all .md files from .claude/workflows/ into DB.

    Returns dict with keys: created, updated, skipped.
    """
    wf_dir = Path(project_path) / WORKFLOW_DIR
    if not wf_dir.is_dir():
        return {"created": 0, "updated": 0, "skipped": 0}

    created = 0
    updated = 0
    skipped = 0

    for md_file in sorted(wf_dir.glob("*.md")):
        try:
            content = md_file.read_text(encoding="utf-8")
        except (OSError, PermissionError):
            skipped += 1
            continue

        parsed = parse_workflow_md(content, md_file.name)
        if not parsed or not parsed["nodes"]:
            skipped += 1
            continue

        # Check if workflow already exists by original_id or name
        existing: Workflow | None = None
        if parsed.get("original_id"):
            try:
                existing = await db.get(Workflow, uuid.UUID(parsed["original_id"]))
            except (ValueError, TypeError):
                pass

        if not existing:
            result = await db.execute(
                select(Workflow).where(
                    Workflow.project_id == project_id,
                    Workflow.name == parsed["name"],
                )
            )
            existing = result.scalar_one_or_none()

        if existing:
            # Update if content changed
            content_hash = hashlib.sha256(content.encode()).hexdigest()
            existing_hash = hashlib.sha256(export_to_md(existing).encode()).hexdigest()
            if content_hash != existing_hash:
                existing.nodes = parsed["nodes"]
                existing.edges = parsed["edges"]
                existing.description = parsed.get("description")
                existing.workflow_type = parsed["workflow_type"]
                updated += 1
            else:
                skipped += 1
        else:
            wf = Workflow(
                project_id=project_id,
                name=parsed["name"],
                workflow_type=parsed["workflow_type"],
                description=parsed.get("description"),
                nodes=parsed["nodes"],
                edges=parsed["edges"],
            )
            db.add(wf)
            created += 1

    await db.commit()
    return {"created": created, "updated": updated, "skipped": skipped}


async def import_single_workflow_file(
    db: AsyncSession,
    project_id: uuid.UUID,
    file_path: Path,
) -> str:
    """Import a single workflow .md file. Returns action taken."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except (OSError, PermissionError):
        return "skipped"

    parsed = parse_workflow_md(content, file_path.name)
    if not parsed or not parsed["nodes"]:
        return "skipped"

    # Check existing (filter by project_id to avoid cross-project overwrites)
    result = await db.execute(
        select(Workflow).where(
            Workflow.project_id == project_id,
            Workflow.name == parsed["name"],
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.nodes = parsed["nodes"]
        existing.edges = parsed["edges"]
        existing.description = parsed.get("description")
        existing.workflow_type = parsed["workflow_type"]
        return "updated"
    else:
        wf = Workflow(
            project_id=project_id,
            name=parsed["name"],
            workflow_type=parsed["workflow_type"],
            description=parsed.get("description"),
            nodes=parsed["nodes"],
            edges=parsed["edges"],
        )
        db.add(wf)
        return "created"


def _parse_table(content: str, section_header: str, columns: list[str]) -> list[dict[str, str]]:
    """Parse a markdown table under a section header."""
    # Find section
    idx = content.find(section_header)
    if idx == -1:
        return []

    section_text = content[idx:]
    lines = section_text.split("\n")

    rows: list[dict[str, str]] = []
    header_found = False

    for line in lines[1:]:  # skip header line
        line = line.strip()
        if not line:
            continue
        if line.startswith("##"):
            break  # next section
        if line.startswith("|") and "---" in line:
            header_found = True
            continue
        if line.startswith("|") and header_found:
            cells = [c.strip() for c in line.split("|")[1:-1]]
            row: dict[str, str] = {}
            for i, col in enumerate(columns):
                if i < len(cells) and cells[i]:
                    row[col] = cells[i]
            if row:
                rows.append(row)

    return rows


def _extract_description(content: str) -> str | None:
    """Extract description text between the title and first ## section."""
    # Skip frontmatter
    body_start = content.find("---", 3)
    if body_start == -1:
        return None
    body = content[body_start + 3:].strip()

    # Skip title line (# ...)
    lines = body.split("\n")
    desc_lines: list[str] = []
    title_found = False
    for line in lines:
        if line.startswith("# ") and not title_found:
            title_found = True
            continue
        if line.startswith("## "):
            break
        if title_found and line.strip():
            desc_lines.append(line.strip())

    return "\n".join(desc_lines) if desc_lines else None
