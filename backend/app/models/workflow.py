import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Workflow(Base):
    """워크플로우 정의 (템플릿). 프로젝트당 여러 워크플로우 존재 가능."""
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    workflow_type: Mapped[str] = mapped_column(String(32), default="custom")  # planning, development, bugfix, deployment, review, custom
    nodes: Mapped[list] = mapped_column(JSONB, default=list)   # [{id, label, type, skill?, agent?, hook?, position:{x,y}}]
    edges: Mapped[list] = mapped_column(JSONB, default=list)   # [{id, source, target, condition?}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    instances: Mapped[list["WorkflowInstance"]] = relationship(back_populates="workflow", cascade="all, delete-orphan")


class WorkflowInstance(Base):
    """워크플로우 실행 인스턴스. 하나의 작업이 워크플로우를 따라 진행."""
    __tablename__ = "workflow_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    current_node: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="active")  # active, completed, blocked, cancelled
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workflow: Mapped["Workflow"] = relationship(back_populates="instances")
    steps: Mapped[list["StepExecution"]] = relationship(back_populates="instance", cascade="all, delete-orphan")


class StepExecution(Base):
    """각 워크플로우 단계 실행 이력."""
    __tablename__ = "step_executions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_instances.id", ondelete="CASCADE"))
    node_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, running, completed, failed, skipped
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    output: Mapped[str | None] = mapped_column(Text)
    hook_events: Mapped[list | None] = mapped_column(JSONB)

    instance: Mapped["WorkflowInstance"] = relationship(back_populates="steps")
