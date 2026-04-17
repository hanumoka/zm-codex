import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.config import settings


class MemoryChunk(Base):
    """벡터 임베딩이 포함된 메모리 청크. MemPalace의 Drawer에 해당."""
    __tablename__ = "memory_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    wing: Mapped[str] = mapped_column(String(128), nullable=False)
    room: Mapped[str] = mapped_column(String(128), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim))  # type: ignore[assignment]
    source_file: Mapped[str] = mapped_column(String(512), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    entities: Mapped[str | None] = mapped_column(Text)  # semicolon-separated
    filed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source_mtime: Mapped[float | None] = mapped_column(Float)

    __table_args__ = (
        Index("idx_chunks_embedding", "embedding", postgresql_using="hnsw",
              postgresql_with={"m": 16, "ef_construction": 64},
              postgresql_ops={"embedding": "vector_cosine_ops"}),
        Index("idx_chunks_project", "project_id"),
        Index("idx_chunks_wing_room", "wing", "room"),
    )
