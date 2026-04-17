"""Drift detection — flags code commits that lack corresponding doc updates."""

import asyncio
import subprocess
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document

CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java"}
DOC_EXTENSIONS = {".md", ".txt", ".rst"}


@dataclass
class DriftReport:
    """A single drift detection result."""

    commit_hash: str
    commit_subject: str
    commit_timestamp: str
    code_files_changed: list[str] = field(default_factory=list)
    doc_files_changed: list[str] = field(default_factory=list)
    suggested_docs: list[str] = field(default_factory=list)
    has_drift: bool = False


async def check_drift(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
    since_commits: int = 10,
) -> list[DriftReport]:
    """Analyze recent commits for documentation drift.

    Returns list of DriftReport for commits that changed code but not docs.
    """
    commits = await asyncio.to_thread(_get_commits_with_files, project_path, since_commits)
    if not commits:
        return []

    # Load known doc paths for suggestion matching
    result = await db.execute(
        select(Document.file_path).where(Document.project_id == project_id)
    )
    known_docs = {row[0] for row in result.all()}

    reports: list[DriftReport] = []

    for commit in commits:
        code_files: list[str] = []
        doc_files: list[str] = []

        for f in commit["files"]:
            ext = Path(f).suffix.lower()
            if ext in CODE_EXTENSIONS:
                code_files.append(f)
            elif ext in DOC_EXTENSIONS:
                doc_files.append(f)

        if code_files and not doc_files:
            # Drift detected: code changed without doc updates
            suggested = _suggest_docs(code_files, known_docs)
            reports.append(DriftReport(
                commit_hash=commit["hash"],
                commit_subject=commit["subject"],
                commit_timestamp=commit["timestamp"],
                code_files_changed=code_files,
                doc_files_changed=[],
                suggested_docs=suggested,
                has_drift=True,
            ))
        elif code_files and doc_files:
            reports.append(DriftReport(
                commit_hash=commit["hash"],
                commit_subject=commit["subject"],
                commit_timestamp=commit["timestamp"],
                code_files_changed=code_files,
                doc_files_changed=doc_files,
                suggested_docs=[],
                has_drift=False,
            ))

    return reports


def _get_commits_with_files(project_path: str, limit: int) -> list[dict[str, str | list[str]]]:
    """Get recent commits with their changed files.

    Uses record separator (RS, 0x1e) to safely delimit fields,
    avoiding issues when commit subjects contain pipe characters.
    """
    sep = "\x1e"  # ASCII Record Separator — safe for git subjects
    try:
        result = subprocess.run(
            [
                "git", "log",
                f"--max-count={limit}",
                f"--pretty=format:%H{sep}%s{sep}%aI",
                "--name-only",
            ],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return []

        entries: list[dict[str, str | list[str]]] = []
        current: dict[str, str | list[str]] | None = None

        for line in result.stdout.strip().split("\n"):
            if not line:
                if current:
                    entries.append(current)
                    current = None
                continue

            if sep in line and len(line.split(sep)) >= 3:
                if current:
                    entries.append(current)
                parts = line.split(sep, 2)
                current = {
                    "hash": parts[0][:7],
                    "subject": parts[1],
                    "timestamp": parts[2],
                    "files": [],
                }
            elif current:
                files = current["files"]
                assert isinstance(files, list)
                files.append(line.strip())

        if current:
            entries.append(current)

        return entries
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []


def _suggest_docs(code_files: list[str], known_docs: set[str]) -> list[str]:
    """Suggest relevant docs that might need updating based on changed code files."""
    suggestions: list[str] = []

    for code_file in code_files:
        parts = Path(code_file).parts

        # Match docs containing similar path segments
        for doc_path in known_docs:
            for part in parts:
                stem = Path(part).stem.lower()
                if len(stem) > 2 and stem in doc_path.lower():
                    if doc_path not in suggestions:
                        suggestions.append(doc_path)
                    break

    # Always suggest session and feature docs
    for doc_path in known_docs:
        if "session/" in doc_path or "features/" in doc_path:
            if doc_path not in suggestions:
                suggestions.append(doc_path)

    return suggestions[:10]
