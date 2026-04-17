import uuid
from datetime import datetime

from pydantic import BaseModel


class IngestRequest(BaseModel):
    project_id: uuid.UUID


class SearchRequest(BaseModel):
    query: str
    project_id: uuid.UUID | None = None
    wing: str | None = None
    room: str | None = None
    limit: int = 10


class MemoryChunkOut(BaseModel):
    id: uuid.UUID
    wing: str
    room: str
    content: str
    source_file: str
    chunk_index: int
    similarity: float
    vector_score: float = 0.0
    keyword_score: float = 0.0
    filed_at: datetime

    model_config = {"from_attributes": True}


class IngestResult(BaseModel):
    chunks_created: int
    files_processed: int
    project_id: uuid.UUID


class SearchResult(BaseModel):
    query: str
    results: list[MemoryChunkOut]
    total: int
