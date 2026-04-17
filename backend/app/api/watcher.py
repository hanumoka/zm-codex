"""File watcher API — start/stop/status for real-time file monitoring + drift detection."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project
from app.schemas.watcher import (
    FileChangeEvent,
    WatcherStartRequest,
    WatcherStatusOut,
    WatcherStopRequest,
)
from app.services.drift import check_drift
from app.services.watcher import WatcherStatus, watcher_manager

router = APIRouter(prefix="/api/v1/watcher", tags=["watcher"])


@router.post("/start", response_model=WatcherStatusOut)
async def start_watcher(
    body: WatcherStartRequest,
    db: AsyncSession = Depends(get_db),
) -> WatcherStatusOut:
    """Start file watching for a project."""
    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    status = await watcher_manager.start(project.id, project.path)
    return _status_to_out(status)


@router.post("/stop")
async def stop_watcher(body: WatcherStopRequest) -> dict[str, str]:
    """Stop file watching for a project."""
    was_running = await watcher_manager.stop(body.project_id)
    if not was_running:
        raise HTTPException(status_code=404, detail="Watcher not running for this project")
    return {"status": "stopped", "project_id": str(body.project_id)}


@router.get("/status", response_model=list[WatcherStatusOut])
async def get_all_watcher_status(
    project_id: uuid.UUID | None = None,
) -> list[WatcherStatusOut]:
    """Get watcher status. Optional project_id filter."""
    if project_id:
        status = watcher_manager.get_status(project_id)
        if not status:
            return []
        return [_status_to_out(status)]

    all_status = watcher_manager.get_all_status()
    return [_status_to_out(s) for s in all_status.values()]


@router.get("/changes", response_model=list[FileChangeEvent])
async def get_recent_changes(
    project_id: uuid.UUID,
    limit: int = 50,
) -> list[FileChangeEvent]:
    """Get recent file changes for a project."""
    status = watcher_manager.get_status(project_id)
    if not status:
        return []

    changes = status.recent_changes[:limit]
    return [FileChangeEvent(**c) for c in changes]


@router.get("/drift")
async def get_drift_report(
    project_id: uuid.UUID,
    since_commits: int = 10,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int | list[dict[str, str | list[str] | bool]]]:
    """Get drift detection report: code commits without corresponding doc updates."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reports = await check_drift(db, project.id, project.path, since_commits)

    drift_count = sum(1 for r in reports if r.has_drift)
    return {
        "project_id": str(project_id),
        "total_commits_analyzed": len(reports),
        "drift_count": drift_count,
        "reports": [
            {
                "commit_hash": r.commit_hash,
                "commit_subject": r.commit_subject,
                "commit_timestamp": r.commit_timestamp,
                "code_files_changed": r.code_files_changed,
                "doc_files_changed": r.doc_files_changed,
                "suggested_docs": r.suggested_docs,
                "has_drift": r.has_drift,
            }
            for r in reports
        ],
    }


def _status_to_out(status: WatcherStatus) -> WatcherStatusOut:
    """Convert internal WatcherStatus to API response."""
    return WatcherStatusOut(
        project_id=status.project_id,
        project_path=status.project_path,
        active=watcher_manager.is_active(status.project_id),
        started_at=status.started_at,
        changes_count=status.changes_count,
        last_change_at=status.last_change_at,
        recent_changes=[FileChangeEvent(**c) for c in status.recent_changes[:20]],
    )
