"""Template service — generate and apply .claude/ config templates."""

import os
from pathlib import Path

from app.services.config_compare import COMPARE_TARGETS

# Additional files to include beyond COMPARE_TARGETS
EXTRA_TEMPLATE_DIRS = ["skills", "hooks", "workflows"]


def generate_template(source_path: str) -> dict[str, str | None]:
    """Generate a template from a project's .claude/ directory.

    Returns dict mapping relative file paths to their content.
    """
    claude_dir = Path(source_path) / ".claude"
    if not claude_dir.is_dir():
        return {}

    template: dict[str, str | None] = {}

    # Include COMPARE_TARGETS
    for rel_path in COMPARE_TARGETS:
        full_path = claude_dir / rel_path
        if full_path.is_file():
            try:
                template[rel_path] = full_path.read_text(encoding="utf-8")
            except (OSError, PermissionError):
                template[rel_path] = None

    # Include extra directories (skills/, hooks/, workflows/)
    for dir_name in EXTRA_TEMPLATE_DIRS:
        dir_path = claude_dir / dir_name
        if not dir_path.is_dir():
            continue
        for fpath in dir_path.rglob("*"):
            if fpath.is_file() and fpath.suffix in {".md", ".json", ".sh", ".yaml", ".yml"}:
                rel = str(fpath.relative_to(claude_dir)).replace("\\", "/")
                if rel not in template:
                    try:
                        template[rel] = fpath.read_text(encoding="utf-8")
                    except (OSError, PermissionError):
                        template[rel] = None

    return template


def apply_template(
    template: dict[str, str | None],
    target_path: str,
    *,
    overwrite: bool = False,
) -> dict[str, int]:
    """Apply a template to a target project's .claude/ directory.

    Args:
        template: dict of relative paths to content
        target_path: project root path
        overwrite: if True, overwrite existing files

    Returns dict with keys: created, skipped, failed.
    """
    claude_dir = Path(target_path) / ".claude"
    created = 0
    skipped = 0
    failed = 0

    for rel_path, content in template.items():
        if content is None:
            skipped += 1
            continue

        target_file = claude_dir / rel_path

        if target_file.exists() and not overwrite:
            skipped += 1
            continue

        try:
            target_file.parent.mkdir(parents=True, exist_ok=True)
            target_file.write_text(content, encoding="utf-8")
            created += 1
        except (OSError, PermissionError):
            failed += 1

    return {"created": created, "skipped": skipped, "failed": failed}


def get_template_summary(template: dict[str, str | None]) -> dict[str, int]:
    """Get summary of a template: file counts by directory."""
    summary: dict[str, int] = {}
    for rel_path, content in template.items():
        if content is None:
            continue
        parts = rel_path.split("/")
        category = parts[0] if len(parts) > 1 else "root"
        summary[category] = summary.get(category, 0) + 1
    return summary
