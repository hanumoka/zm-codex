"""Memory ingestion service — shared chunking/embedding for sync and manual ingest."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import Document
from app.models.memory import MemoryChunk
from app.models.project import Project
from app.services.chunker import chunk_text
from app.services.embedding import embed_texts
from app.services.scanner import detect_doc_type


def detect_room(file_path: str) -> str:
    doc_type = detect_doc_type(file_path)
    if doc_type:
        return doc_type
    parts = file_path.replace("\\", "/").split("/")
    if len(parts) >= 2:
        return parts[-2]
    return "general"


async def ingest_document(
    db: AsyncSession,
    project_id: uuid.UUID,
    doc: Document,
    wing: str,
    *,
    auto_commit: bool = True,
) -> int:
    """Chunk + embed a single Document and replace existing chunks for that file.

    Returns number of chunks created.
    """
    if not doc.content or len(doc.content.strip()) < settings.min_chunk_size:
        return 0

    chunks = chunk_text(doc.content, doc.file_path)
    if not chunks:
        return 0

    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)

    existing = await db.execute(
        select(MemoryChunk.id).where(
            MemoryChunk.project_id == project_id,
            MemoryChunk.source_file == doc.file_path,
        )
    )
    existing_ids = [row[0] for row in existing.all()]
    if existing_ids:
        await db.execute(
            MemoryChunk.__table__.delete().where(MemoryChunk.id.in_(existing_ids))
        )

    room = detect_room(doc.file_path)
    for chunk_data, embedding in zip(chunks, embeddings):
        chunk = MemoryChunk(
            project_id=project_id,
            wing=wing,
            room=room,
            content=chunk_data["content"],
            embedding=embedding,
            source_file=doc.file_path,
            chunk_index=chunk_data["chunk_index"],
            source_mtime=doc.last_modified.timestamp() if doc.last_modified else None,
        )
        db.add(chunk)

    if auto_commit:
        await db.commit()
    return len(chunks)


async def delete_chunks_for_file(
    db: AsyncSession,
    project_id: uuid.UUID,
    file_path: str,
    *,
    auto_commit: bool = True,
) -> int:
    """Delete all memory chunks for a removed file."""
    existing = await db.execute(
        select(MemoryChunk.id).where(
            MemoryChunk.project_id == project_id,
            MemoryChunk.source_file == file_path,
        )
    )
    ids = [row[0] for row in existing.all()]
    if ids:
        await db.execute(
            MemoryChunk.__table__.delete().where(MemoryChunk.id.in_(ids))
        )
        if auto_commit:
            await db.commit()
    return len(ids)


async def ingest_project_documents(
    db: AsyncSession,
    project: Project,
    *,
    only_paths: set[str] | None = None,
) -> dict[str, int]:
    """Ingest all (or selected) documents for a project.

    Args:
        only_paths: If provided, only these file_paths will be ingested.
                    None means ingest all documents.

    Returns dict with chunks_created, files_processed.
    """
    query = select(Document).where(
        Document.project_id == project.id,
        Document.content.isnot(None),
    )
    if only_paths is not None:
        if not only_paths:
            return {"chunks_created": 0, "files_processed": 0}
        query = query.where(Document.file_path.in_(only_paths))

    result = await db.execute(query)
    docs = list(result.scalars().all())

    total_chunks = 0
    files_processed = 0
    for doc in docs:
        n = await ingest_document(db, project.id, doc, project.name, auto_commit=False)
        if n > 0:
            files_processed += 1
            total_chunks += n

    await db.commit()
    return {"chunks_created": total_chunks, "files_processed": files_processed}
