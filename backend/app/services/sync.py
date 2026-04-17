"""Document sync service — extracted from projects router for reuse by watcher."""

import uuid
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.project import Project
from app.services.ingest import delete_chunks_for_file, ingest_document, ingest_project_documents
from app.services.scanner import (
    SCANNABLE_EXTENSIONS,
    read_file_info,
    scan_directory,
)


async def sync_documents(db: AsyncSession, project: Project) -> dict[str, int]:
    """Scan project directory, sync all documents, and auto-ingest changed files.

    Returns dict with keys: created, updated, unchanged, deleted, total,
    chunks_created, files_indexed.
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
    changed_paths: set[str] = set()
    deleted_paths: set[str] = set()

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
                changed_paths.add(file_path)
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
            changed_paths.add(file_path)

    # Remove documents for files that no longer exist on disk
    for file_path, doc in existing.items():
        if file_path not in scanned_paths:
            await db.delete(doc)
            deleted += 1
            deleted_paths.add(file_path)

    await db.commit()

    # Auto-ingest: chunk + embed changed files; remove chunks for deleted files
    for path in deleted_paths:
        await delete_chunks_for_file(db, project.id, path, auto_commit=False)
    if deleted_paths:
        await db.commit()

    ingest_stats = await ingest_project_documents(db, project, only_paths=changed_paths)

    return {
        "created": created,
        "updated": updated,
        "unchanged": unchanged,
        "deleted": deleted,
        "total": len(scanned),
        "chunks_created": ingest_stats["chunks_created"],
        "files_indexed": ingest_stats["files_processed"],
    }


async def sync_single_file(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
    file_path_absolute: str,
    change_type: str,
    *,
    auto_commit: bool = True,
    project_name: str | None = None,
) -> dict[str, str | int]:
    """Sync a single file change to the DB and auto-ingest into memory chunks.

    Args:
        change_type: "created", "modified", or "deleted"
        auto_commit: If False, caller is responsible for committing (batch mode).
        project_name: Used as `wing` for memory chunks. If None, looks up Project.

    Returns dict with keys: action, file_path, chunks (chunks created or removed).
    """
    abs_path = Path(file_path_absolute).resolve()
    root = Path(project_path).resolve()

    # Security: ensure resolved path is within project root (blocks symlink traversal)
    try:
        relative = str(abs_path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return {"action": "skipped", "file_path": file_path_absolute, "chunks": 0}

    if change_type == "deleted":
        await db.execute(
            delete(Document).where(
                Document.project_id == project_id,
                Document.file_path == relative,
            )
        )
        removed = await delete_chunks_for_file(db, project_id, relative, auto_commit=False)
        if auto_commit:
            await db.commit()
        return {"action": "deleted", "file_path": relative, "chunks": removed}

    # created or modified
    if not abs_path.is_file():
        return {"action": "skipped", "file_path": relative, "chunks": 0}

    if abs_path.suffix.lower() not in SCANNABLE_EXTENSIONS:
        return {"action": "skipped", "file_path": relative, "chunks": 0}

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
            content_changed = True
        else:
            action = "unchanged"
            content_changed = False
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
        content_changed = True

    chunks_created = 0
    if content_changed:
        # Flush so the doc has its content for ingestion (no commit yet to keep batch atomic)
        await db.flush()
        wing = project_name
        if wing is None:
            project = await db.get(Project, project_id)
            wing = project.name if project else "default"
        chunks_created = await ingest_document(db, project_id, doc, wing, auto_commit=False)

    if auto_commit:
        await db.commit()
    return {"action": action, "file_path": relative, "chunks": chunks_created}
