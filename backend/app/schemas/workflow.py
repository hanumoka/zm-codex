import uuid
from datetime import datetime

from pydantic import BaseModel


class WorkflowNodeSchema(BaseModel):
    id: str
    label: str
    type: str = "step"  # start, step, decision, end
    skill: str | None = None
    agent: str | None = None
    hook: str | None = None
    position: dict = {"x": 0, "y": 0}


class WorkflowEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    condition: str | None = None


class WorkflowCreate(BaseModel):
    project_id: uuid.UUID
    name: str
    description: str | None = None
    workflow_type: str = "custom"
    nodes: list[WorkflowNodeSchema] = []
    edges: list[WorkflowEdgeSchema] = []


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    nodes: list[WorkflowNodeSchema] | None = None
    edges: list[WorkflowEdgeSchema] | None = None


class WorkflowOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    workflow_type: str
    nodes: list[dict]
    edges: list[dict]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InstanceCreate(BaseModel):
    workflow_id: uuid.UUID
    title: str
    current_node: str | None = None


class InstanceUpdate(BaseModel):
    current_node: str | None = None
    status: str | None = None


class StepExecutionOut(BaseModel):
    id: uuid.UUID
    node_id: str
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    output: str | None

    model_config = {"from_attributes": True}


class InstanceOut(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    title: str
    current_node: str | None
    status: str
    started_at: datetime
    completed_at: datetime | None
    steps: list[StepExecutionOut] = []

    model_config = {"from_attributes": True}
