"""Document sync service — extracted from projects router for reuse by watcher."""

import uuid
from pathlib import Path

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.project import Project
from app.services.scanner import (
    scan_directory,
    SCANNABLE_EXTENSIONS,
    read_file_info,
)


async def sync_documents(db: AsyncSession, project: Project) -> dict[str, int]:
    """Scan project directory and sync all documents with DB.

    Returns dict with keys: created, updated, unchanged, total.
    """
    scanned = scan_directory(project.path)

    result = await db.execute(
        select(Document).where(Document.project_id == project.id)
    )
    existing = {doc.file_path: doc for doc in result.scalars().all()}

    created = 0
    updated = 0
    unchanged = 0
    deleted = 0

    scanned_paths = {fi["file_path"] for fi in scanned}

    for file_info in scanned:
        file_path = file_info["file_path"]

        if file_path in existing:
            doc = existing[file_path]
            if doc.content_hash != file_info["content_hash"]:
                doc.content = file_info["content"]
                doc.content_hash = file_info["content_hash"]
                doc.file_size = file_info["file_size"]
                doc.last_modified = file_info["last_modified"]
                doc.doc_type = file_info["doc_type"]
                updated += 1
            else:
                unchanged += 1
        else:
            doc = Document(
                project_id=project.id,
                file_path=file_path,
                file_name=file_info["file_name"],
                doc_type=file_info["doc_type"],
                content=file_info["content"],
                content_hash=file_info["content_hash"],
                file_size=file_info["file_size"],
                last_modified=file_info["last_modified"],
            )
            db.add(doc)
            created += 1

    # Remove documents for files that no longer exist on disk
    for file_path, doc in existing.items():
        if file_path not in scanned_paths:
            await db.delete(doc)
            deleted += 1

    await db.commit()

    return {"created": created, "updated": updated, "unchanged": unchanged, "deleted": deleted, "total": len(scanned)}


async def sync_single_file(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
    file_path_absolute: str,
    change_type: str,
    *,
    auto_commit: bool = True,
) -> dict[str, str]:
    """Sync a single file change to the DB.

    Args:
        change_type: "created", "modified", or "deleted"
        auto_commit: If False, caller is responsible for committing (batch mode).

    Returns dict with keys: action, file_path.
    """
    abs_path = Path(file_path_absolute).resolve()
    root = Path(project_path).resolve()

    # Security: ensure resolved path is within project root (blocks symlink traversal)
    try:
        relative = str(abs_path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return {"action": "skipped", "file_path": file_path_absolute}

    if change_type == "deleted":
        await db.execute(
            delete(Document).where(
                Document.project_id == project_id,
                Document.file_path == relative,
            )
        )
        if auto_commit:
            await db.commit()
        return {"action": "deleted", "file_path": relative}

    # created or modified
    if not abs_path.is_file():
        return {"action": "skipped", "file_path": relative}

    if abs_path.suffix.lower() not in SCANNABLE_EXTENSIONS:
        return {"action": "skipped", "file_path": relative}

    file_info = read_file_info(abs_path, str(root))

    # Check existing
    result = await db.execute(
        select(Document).where(
            Document.project_id == project_id,
            Document.file_path == relative,
        )
    )
    doc = result.scalar_one_or_none()

    if doc:
        if doc.content_hash != file_info["content_hash"]:
            doc.content = file_info["content"]
            doc.content_hash = file_info["content_hash"]
            doc.file_size = file_info["file_size"]
            doc.last_modified = file_info["last_modified"]
            doc.doc_type = file_info["doc_type"]
            action = "updated"
        else:
            action = "unchanged"
    else:
        doc = Document(
            project_id=project_id,
            file_path=file_info["file_path"],
            file_name=file_info["file_name"],
            doc_type=file_info["doc_type"],
            content=file_info["content"],
            content_hash=file_info["content_hash"],
            file_size=file_info["file_size"],
            last_modified=file_info["last_modified"],
        )
        db.add(doc)
        action = "created"

    if auto_commit:
        await db.commit()
    return {"action": action, "file_path": relative}
