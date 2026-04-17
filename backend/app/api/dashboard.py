"""Dashboard statistics API."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project
from app.models.document import Document
from app.models.hook_event import HookEvent
from app.models.memory import MemoryChunk
from app.models.workflow import Workflow, WorkflowInstance

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(
    project_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get dashboard statistics for a project or all projects."""

    async def count_where(model: type, *filters: object) -> int:
        q = select(func.count(model.id))
        for f in filters:
            q = q.where(f)
        return (await db.execute(q)).scalar() or 0

    filters = []
    if project_id:
        filters_doc = [Document.project_id == project_id]
        filters_mem = [MemoryChunk.project_id == project_id]
        filters_wf = [Workflow.project_id == project_id]
    else:
        filters_doc = []
        filters_mem = []
        filters_wf = []

    documents = await count_where(Document, *filters_doc)
    memories = await count_where(MemoryChunk, *filters_mem)
    workflows = await count_where(Workflow, *filters_wf)

    # Count instances across workflows
    inst_q = select(func.count(WorkflowInstance.id))
    if project_id:
        inst_q = inst_q.join(Workflow).where(Workflow.project_id == project_id)
    instances = (await db.execute(inst_q)).scalar() or 0

    hook_events = await count_where(HookEvent)

    # Document type breakdown
    type_q = select(Document.doc_type, func.count(Document.id)).group_by(Document.doc_type)
    if project_id:
        type_q = type_q.where(Document.project_id == project_id)
    type_result = await db.execute(type_q)
    doc_types = {(row[0] or "unknown"): row[1] for row in type_result.all()}

    # Count specific doc types as proxy for agents, rules, etc.
    agents = doc_types.get("agent", 0)
    rules = doc_types.get("rule", 0) + doc_types.get("mistakes", 0)
    hooks = doc_types.get("hook", 0)
    skills = doc_types.get("skill", 0)
    policies = doc_types.get("policy", 0)

    return {
        "documents": documents,
        "memories": memories,
        "workflows": workflows,
        "instances": instances,
        "hook_events": hook_events,
        "agents": agents,
        "rules": rules,
        "hooks": hooks,
        "skills": skills,
        "policies": policies,
        "doc_types": doc_types,
    }
