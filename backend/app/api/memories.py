"""Memory Engine API: ingest documents and search with hybrid BM25 + vector."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.events import broadcaster
from app.models.memory import MemoryChunk
from app.models.project import Project
from app.schemas.memory import IngestRequest, IngestResult, MemoryChunkOut, SearchResult
from app.services.bm25_search import build_bm25_index, normalize_scores, score_bm25
from app.services.embedding import embed_single
from app.services.ingest import ingest_project_documents

router = APIRouter(prefix="/api/v1/memories", tags=["memories"])


@router.post("/ingest", response_model=IngestResult)
async def ingest_project(
    body: IngestRequest,
    db: AsyncSession = Depends(get_db),
) -> IngestResult:
    """Ingest all documents from a project into the memory engine."""
    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    stats = await ingest_project_documents(db, project)

    await broadcaster.broadcast("ingest_complete", {
        "project_id": str(body.project_id),
        "chunks": stats["chunks_created"],
        "files": stats["files_processed"],
    })

    return IngestResult(
        chunks_created=stats["chunks_created"],
        files_processed=stats["files_processed"],
        project_id=body.project_id,
    )


@router.get("/search", response_model=SearchResult)
async def search_memories(
    query: str,
    project_id: uuid.UUID | None = None,
    wing: str | None = None,
    room: str | None = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
) -> SearchResult:
    """Hybrid search: BM25 keyword (40%) + vector cosine similarity (60%)."""
    query_embedding = embed_single(query)

    cosine_distance = MemoryChunk.embedding.cosine_distance(query_embedding)
    similarity = (1 - cosine_distance).label("similarity")

    # Fetch more candidates for BM25 re-ranking
    candidate_limit = min(limit * 3, 100)
    query_stmt = (
        select(MemoryChunk, similarity)
        .order_by(cosine_distance)
        .limit(candidate_limit)
    )

    if project_id:
        query_stmt = query_stmt.where(MemoryChunk.project_id == project_id)
    if wing:
        query_stmt = query_stmt.where(MemoryChunk.wing == wing)
    if room:
        query_stmt = query_stmt.where(MemoryChunk.room == room)

    result = await db.execute(query_stmt)
    rows = result.all()

    if not rows:
        return SearchResult(query=query, results=[], total=0)

    # BM25 scoring
    chunks_text = [chunk.content for chunk, _ in rows]
    bm25_index = build_bm25_index(chunks_text)
    bm25_scores = score_bm25(bm25_index, query)
    bm25_normalized = normalize_scores(bm25_scores)

    # Combine vector + BM25 with configured weights
    results: list[MemoryChunkOut] = []
    for (chunk, sim), kw_score in zip(rows, bm25_normalized):
        vec_score = max(0.0, float(sim))
        combined = vec_score * settings.vector_weight + kw_score * settings.bm25_weight

        results.append(MemoryChunkOut(
            id=chunk.id,
            wing=chunk.wing,
            room=chunk.room,
            content=chunk.content,
            source_file=chunk.source_file,
            chunk_index=chunk.chunk_index,
            similarity=round(combined, 4),
            vector_score=round(vec_score, 4),
            keyword_score=round(kw_score, 4),
            filed_at=chunk.filed_at,
        ))

    # Re-sort by combined score
    results.sort(key=lambda r: r.similarity, reverse=True)
    results = results[:limit]

    return SearchResult(query=query, results=results, total=len(results))


@router.get("/status")
async def memory_status(
    project_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get memory engine statistics."""
    query = select(func.count(MemoryChunk.id))
    if project_id:
        query = query.where(MemoryChunk.project_id == project_id)
    result = await db.execute(query)
    total = result.scalar() or 0

    wings_q = select(MemoryChunk.wing, func.count(MemoryChunk.id)).group_by(MemoryChunk.wing)
    if project_id:
        wings_q = wings_q.where(MemoryChunk.project_id == project_id)
    wings_result = await db.execute(wings_q)
    wings = {row[0]: row[1] for row in wings_result.all()}

    return {
        "total_chunks": total,
        "wings": wings,
        "embedding_model": settings.embedding_model,
        "embedding_dim": settings.embedding_dim,
        "chunk_size": settings.chunk_size,
    }


