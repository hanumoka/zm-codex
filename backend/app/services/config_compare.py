"""Compare .claude/ settings between two project paths."""

import os
from pathlib import Path

# Files to compare within .claude/
COMPARE_TARGETS = [
    "settings.json",
    "rules/backend.md",
    "rules/frontend.md",
    "rules/security.md",
    "rules/work-units.md",
    "rules/known-mistakes.md",
    "agents/be-developer.md",
    "agents/fe-developer.md",
    "agents/code-reviewer.md",
    "agents/build-checker.md",
    "agents/doc-updater.md",
    "agents/mcp-developer.md",
    "agents/req-validator.md",
    "agents/work-logger.md",
    "memory/MEMORY.md",
    "memory/policy-registry.md",
]


def compare_projects(path_a: str, path_b: str) -> list[dict]:
    """Compare .claude/ directories of two projects.

    Returns list of {file, status, project_a, project_b, diff}
    """
    results: list[dict] = []

    # Collect all .claude/ files from both projects
    all_files: set[str] = set()
    for target in COMPARE_TARGETS:
        all_files.add(target)

    # Also scan for any extra files not in COMPARE_TARGETS
    for project_path in [path_a, path_b]:
        claude_dir = Path(project_path) / ".claude"
        if claude_dir.is_dir():
            for dirpath, _, filenames in os.walk(claude_dir):
                for fname in filenames:
                    fpath = Path(dirpath) / fname
                    relative = str(fpath.relative_to(claude_dir)).replace("\\", "/")
                    all_files.add(relative)

    for relative_file in sorted(all_files):
        file_a = Path(path_a) / ".claude" / relative_file
        file_b = Path(path_b) / ".claude" / relative_file

        exists_a = file_a.is_file()
        exists_b = file_b.is_file()

        if not exists_a and not exists_b:
            continue

        if exists_a and not exists_b:
            results.append({
                "file": relative_file,
                "status": "missing_b",
                "project_a": Path(path_a).name,
                "project_b": Path(path_b).name,
                "diff": f"{Path(path_b).name}에 없음",
            })
        elif not exists_a and exists_b:
            results.append({
                "file": relative_file,
                "status": "missing_a",
                "project_a": Path(path_a).name,
                "project_b": Path(path_b).name,
                "diff": f"{Path(path_a).name}에 없음",
            })
        else:
            # Both exist — compare content
            try:
                content_a = file_a.read_text(encoding="utf-8", errors="replace")
                content_b = file_b.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            if content_a == content_b:
                results.append({
                    "file": relative_file,
                    "status": "same",
                    "project_a": Path(path_a).name,
                    "project_b": Path(path_b).name,
                    "diff": None,
                })
            else:
                # Generate summary of difference
                lines_a = len(content_a.splitlines())
                lines_b = len(content_b.splitlines())
                diff_summary = f"{Path(path_a).name}: {lines_a}줄, {Path(path_b).name}: {lines_b}줄"
                results.append({
                    "file": relative_file,
                    "status": "different",
                    "project_a": Path(path_a).name,
                    "project_b": Path(path_b).name,
                    "diff": diff_summary,
                })

    return results
