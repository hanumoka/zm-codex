"""Code-Document bidirectional link model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CodeDocLink(Base):
    __tablename__ = "code_doc_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    commit_hash: Mapped[str] = mapped_column(String(7), nullable=False)
    commit_subject: Mapped[str] = mapped_column(String(256), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    document_path: Mapped[str] = mapped_column(String(512), nullable=False)
    link_type: Mapped[str] = mapped_column(String(32), nullable=False)  # path_match, keyword_match
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
