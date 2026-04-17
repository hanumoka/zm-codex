"""Workflow CRUD and instance management API."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.events import broadcaster
from app.models.project import Project
from app.models.workflow import StepExecution, Workflow, WorkflowInstance
from app.schemas.workflow import (
    InstanceCreate,
    InstanceOut,
    InstanceUpdate,
    WorkflowCreate,
    WorkflowOut,
    WorkflowUpdate,
)
from app.services.seed import create_from_template, list_builtin_templates
from app.services.workflow_classifier import classify_workflow
from app.services.workflow_sync import export_workflow, import_workflows

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


class TemplateCreateRequest(BaseModel):
    project_id: uuid.UUID
    template_name: str


# ── Workflow templates (must be declared BEFORE /{wf_id} to avoid path conflicts) ──


@router.get("/templates")
async def list_templates() -> list[dict[str, str | int]]:
    """List bundled workflow templates available for seeding."""
    return list_builtin_templates()


@router.post("/from-template", response_model=WorkflowOut, status_code=201)
async def create_workflow_from_template(
    body: TemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> Workflow:
    """Create a workflow from a bundled template. Copies the template .md into
    the project's .claude/workflows/ directory and imports into DB via the
    canonical pipeline.

    Errors:
      404 — project or template not found
      409 — a workflow with the template's name already exists in this project
    """
    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    try:
        wf = await create_from_template(db, project.id, project.path, body.template_name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e)) from e
    except ValueError as e:
        message = str(e)
        if "already exists" in message:
            raise HTTPException(409, message) from e
        raise HTTPException(400, message) from e

    await broadcaster.broadcast("workflow_created", {"id": str(wf.id), "name": wf.name})
    return wf


# ── Workflow auto-detection ──


@router.get("/auto-detect")
async def auto_detect_workflow(
    project_id: uuid.UUID,
    since_commits: int = 5,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | float | int | list[str] | None]:
    """Analyze recent commits and detect the likely workflow type."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await classify_workflow(db, project.id, project.path, since_commits)
    return {
        "detected_type": result.detected_type,
        "confidence": result.confidence,
        "matching_workflow_id": result.matching_workflow_id,
        "commits_analyzed": result.commits_analyzed,
        "commit_subjects": result.commit_subjects,
    }


# ── Workflow .md sync ──


@router.post("/{wf_id}/export")
async def export_workflow_to_md(
    wf_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Export a workflow to .claude/workflows/{name}.md."""
    wf = await db.get(Workflow, wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")

    project = await db.get(Project, wf.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    file_path = await export_workflow(db, wf_id, project.path)
    return {"status": "exported", "file_path": file_path}


@router.post("/import")
async def import_workflows_from_md(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    """Import workflows from .claude/workflows/*.md files."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    stats = await import_workflows(db, project.id, project.path)
    return {"status": "imported", **stats}


# ── Workflow definitions ──


@router.get("", response_model=list[WorkflowOut])
async def list_workflows(
    project_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Workflow]:
    query = select(Workflow).order_by(Workflow.created_at)
    if project_id:
        query = query.where(Workflow.project_id == project_id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=WorkflowOut, status_code=201)
async def create_workflow(
    body: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
) -> Workflow:
    wf = Workflow(
        project_id=body.project_id,
        name=body.name,
        description=body.description,
        workflow_type=body.workflow_type,
        nodes=[n.model_dump() for n in body.nodes],
        edges=[e.model_dump() for e in body.edges],
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    await broadcaster.broadcast("workflow_created", {"id": str(wf.id), "name": wf.name})
    return wf


@router.get("/{wf_id}", response_model=WorkflowOut)
async def get_workflow(wf_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Workflow:
    wf = await db.get(Workflow, wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


@router.patch("/{wf_id}", response_model=WorkflowOut)
async def update_workflow(
    wf_id: uuid.UUID,
    body: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
) -> Workflow:
    wf = await db.get(Workflow, wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")

    if body.name is not None:
        wf.name = body.name
    if body.description is not None:
        wf.description = body.description
    if body.nodes is not None:
        wf.nodes = [n.model_dump() for n in body.nodes]
    if body.edges is not None:
        wf.edges = [e.model_dump() for e in body.edges]

    await db.commit()
    await db.refresh(wf)
    await broadcaster.broadcast("workflow_updated", {"id": str(wf.id), "name": wf.name})
    return wf


@router.delete("/{wf_id}", status_code=204)
async def delete_workflow(wf_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    wf = await db.get(Workflow, wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    await db.delete(wf)
    await db.commit()


# ── Workflow instances ──


@router.get("/{wf_id}/instances", response_model=list[InstanceOut])
async def list_instances(
    wf_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[WorkflowInstance]:
    result = await db.execute(
        select(WorkflowInstance)
        .where(WorkflowInstance.workflow_id == wf_id)
        .options(selectinload(WorkflowInstance.steps))
        .order_by(WorkflowInstance.started_at.desc())
    )
    return list(result.scalars().all())


@router.post("/{wf_id}/instances", response_model=InstanceOut, status_code=201)
async def create_instance(
    wf_id: uuid.UUID,
    body: InstanceCreate,
    db: AsyncSession = Depends(get_db),
) -> WorkflowInstance:
    wf = await db.get(Workflow, wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")

    # Find start node
    start_node = body.current_node
    if not start_node:
        for node in wf.nodes:
            if node.get("type") == "start":
                start_node = node["id"]
                break

    inst = WorkflowInstance(
        workflow_id=wf_id,
        title=body.title,
        current_node=start_node,
    )
    db.add(inst)
    await db.flush()

    # Create step executions for all nodes
    for node in wf.nodes:
        step = StepExecution(
            instance_id=inst.id,
            node_id=node["id"],
            status="running" if node["id"] == start_node else "pending",
        )
        db.add(step)

    await db.commit()

    # Re-fetch with steps loaded
    result = await db.execute(
        select(WorkflowInstance)
        .where(WorkflowInstance.id == inst.id)
        .options(selectinload(WorkflowInstance.steps))
    )
    inst = result.scalar_one()

    await broadcaster.broadcast("instance_created", {"id": str(inst.id), "title": inst.title})
    return inst


@router.patch("/{wf_id}/instances/{inst_id}", response_model=InstanceOut)
async def update_instance(
    wf_id: uuid.UUID,
    inst_id: uuid.UUID,
    body: InstanceUpdate,
    db: AsyncSession = Depends(get_db),
) -> WorkflowInstance:
    result = await db.execute(
        select(WorkflowInstance)
        .where(WorkflowInstance.id == inst_id, WorkflowInstance.workflow_id == wf_id)
        .options(selectinload(WorkflowInstance.steps))
    )
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(404, "Instance not found")

    if body.current_node is not None:
        inst.current_node = body.current_node
        # Update step statuses
        for step in inst.steps:
            if step.node_id == body.current_node:
                step.status = "running"
            elif step.status == "running":
                step.status = "completed"

    if body.status is not None:
        inst.status = body.status

    await db.commit()
    await db.refresh(inst)
    await broadcaster.broadcast("instance_updated", {"id": str(inst.id), "current_node": inst.current_node})
    return inst
