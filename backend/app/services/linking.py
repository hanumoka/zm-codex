"""Code-Document linking service — auto-detects relationships between commits and docs."""

import asyncio
import subprocess
import uuid
from pathlib import Path

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.code_doc_link import CodeDocLink
from app.models.document import Document


async def detect_links(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
    since_commits: int = 20,
) -> dict[str, int]:
    """Auto-detect links between git commits and project documents.

    Returns dict with keys: created, total_commits, total_documents.
    """
    commits = await asyncio.to_thread(_get_commits_with_files, project_path, since_commits)
    if not commits:
        return {"created": 0, "total_commits": 0, "total_documents": 0}

    # Load all documents
    result = await db.execute(
        select(Document).where(Document.project_id == project_id)
    )
    docs = list(result.scalars().all())
    if not docs:
        return {"created": 0, "total_commits": len(commits), "total_documents": 0}

    # Build doc lookup by path segments
    doc_by_path: dict[str, Document] = {d.file_path: d for d in docs}
    doc_stems: dict[str, list[Document]] = {}
    for doc in docs:
        stem = Path(doc.file_path).stem.lower()
        if len(stem) > 2:
            doc_stems.setdefault(stem, []).append(doc)

    # Clear existing auto-detected links for this project
    await db.execute(
        delete(CodeDocLink).where(CodeDocLink.project_id == project_id)
    )

    created = 0
    seen: set[tuple[str, str]] = set()  # (commit_hash, doc_id) dedup

    for commit in commits:
        commit_hash = commit["hash"]
        subject = commit["subject"]
        files = commit["files"]

        # Strategy 1: Path segment matching (commit files ↔ doc paths)
        for changed_file in files:
            changed_stem = Path(changed_file).stem.lower()
            if len(changed_stem) <= 2:
                continue

            for doc_path, doc in doc_by_path.items():
                if changed_stem in doc_path.lower():
                    key = (commit_hash, str(doc.id))
                    if key not in seen:
                        seen.add(key)
                        db.add(CodeDocLink(
                            project_id=project_id,
                            commit_hash=commit_hash,
                            commit_subject=subject,
                            document_id=doc.id,
                            document_path=doc.file_path,
                            link_type="path_match",
                            confidence=0.7,
                        ))
                        created += 1

        # Strategy 2: Keyword matching (commit subject → doc type/name)
        subject_lower = subject.lower()
        for doc in docs:
            doc_stem = Path(doc.file_path).stem.lower()
            if len(doc_stem) > 3 and doc_stem in subject_lower:
                key = (commit_hash, str(doc.id))
                if key not in seen:
                    seen.add(key)
                    db.add(CodeDocLink(
                        project_id=project_id,
                        commit_hash=commit_hash,
                        commit_subject=subject,
                        document_id=doc.id,
                        document_path=doc.file_path,
                        link_type="keyword_match",
                        confidence=0.5,
                    ))
                    created += 1

    await db.commit()
    return {"created": created, "total_commits": len(commits), "total_documents": len(docs)}


async def get_document_links(
    db: AsyncSession,
    document_id: uuid.UUID,
    limit: int = 20,
) -> list[CodeDocLink]:
    """Get all commit links for a specific document."""
    result = await db.execute(
        select(CodeDocLink)
        .where(CodeDocLink.document_id == document_id)
        .order_by(CodeDocLink.confidence.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_commit_links(
    db: AsyncSession,
    project_id: uuid.UUID,
    commit_hash: str,
) -> list[CodeDocLink]:
    """Get all document links for a specific commit."""
    result = await db.execute(
        select(CodeDocLink)
        .where(
            CodeDocLink.project_id == project_id,
            CodeDocLink.commit_hash == commit_hash,
        )
    )
    return list(result.scalars().all())


def _get_commits_with_files(project_path: str, limit: int) -> list[dict[str, str | list[str]]]:
    """Get recent commits with changed file lists."""
    sep = "\x1e"
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
