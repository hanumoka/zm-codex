"""Config comparison, synchronization, and change history API."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.config_history import ConfigChange
from app.models.project import Project
from app.services.config_compare import compare_projects
from app.services.template import apply_template, generate_template, get_template_summary

router = APIRouter(prefix="/api/v1/config", tags=["config"])


@router.get("/compare")
async def compare_config(
    project_a: uuid.UUID = Query(..., description="First project ID"),
    project_b: uuid.UUID = Query(..., description="Second project ID"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Compare .claude/ settings between two projects."""
    pa = await db.get(Project, project_a)
    pb = await db.get(Project, project_b)
    if not pa or not pb:
        raise HTTPException(404, "One or both projects not found")

    results = compare_projects(pa.path, pb.path)

    same = sum(1 for r in results if r["status"] == "same")
    different = sum(1 for r in results if r["status"] == "different")
    missing = sum(1 for r in results if r["status"].startswith("missing"))

    return {
        "project_a": {"id": str(pa.id), "name": pa.name, "path": pa.path},
        "project_b": {"id": str(pb.id), "name": pb.name, "path": pb.path},
        "summary": {"same": same, "different": different, "missing": missing, "total": len(results)},
        "comparisons": results,
    }


@router.get("/history")
async def config_change_history(
    project_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | list[dict[str, str | None]]]:
    """Get .claude/ config file change history for a project."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(ConfigChange)
        .where(ConfigChange.project_id == project_id)
        .order_by(desc(ConfigChange.detected_at))
        .limit(limit)
    )
    changes = list(result.scalars().all())

    return {
        "project_id": str(project_id),
        "changes": [
            {
                "id": str(c.id),
                "file_path": c.file_path,
                "change_type": c.change_type,
                "old_hash": c.old_hash,
                "new_hash": c.new_hash,
                "detected_at": c.detected_at.isoformat() if c.detected_at else None,
            }
            for c in changes
        ],
    }


@router.post("/template/generate")
async def generate_config_template(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int | dict[str, int]]:
    """Generate a template from a project's .claude/ directory."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    template = generate_template(project.path)
    summary = get_template_summary(template)

    return {
        "project_id": str(project_id),
        "project_name": project.name,
        "total_files": sum(1 for v in template.values() if v is not None),
        "summary": summary,
    }


@router.post("/template/apply")
async def apply_config_template(
    source_project_id: uuid.UUID,
    target_project_id: uuid.UUID,
    overwrite: bool = False,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    """Apply a source project's .claude/ template to a target project."""
    source = await db.get(Project, source_project_id)
    target = await db.get(Project, target_project_id)
    if not source or not target:
        raise HTTPException(404, "One or both projects not found")

    template = generate_template(source.path)
    if not template:
        raise HTTPException(400, "Source project has no .claude/ configuration")

    stats = apply_template(template, target.path, overwrite=overwrite)
    return {"status": "applied", "source": source.name, "target": target.name, **stats}
