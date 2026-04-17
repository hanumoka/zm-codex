"""Change tracking API: git log + document changes unified timeline."""

import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.code_doc_link import CodeDocLink
from app.models.project import Project
from app.models.document import Document
from app.models.hook_event import HookEvent

router = APIRouter(prefix="/api/v1/changes", tags=["changes"])


@router.get("")
async def get_changes(
    project_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get unified timeline of git commits + document changes + hook events."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    timeline: list[dict] = []

    # Load commit → document links
    link_result = await db.execute(
        select(CodeDocLink).where(CodeDocLink.project_id == project_id)
    )
    all_links = list(link_result.scalars().all())
    links_by_commit: dict[str, list[str]] = {}
    for link in all_links:
        links_by_commit.setdefault(link.commit_hash, []).append(link.document_path)

    # 1. Git log
    git_entries = _get_git_log(project.path, limit)
    for entry in git_entries:
        commit_hash = entry["hash"]
        timeline.append({
            "type": "commit",
            "title": entry["subject"],
            "description": entry.get("body", ""),
            "timestamp": entry["timestamp"],
            "commit": commit_hash,
            "files": entry.get("files", []),
            "linked_documents": links_by_commit.get(commit_hash, []),
        })

    # 2. Recent hook events (tool calls)
    hook_result = await db.execute(
        select(HookEvent)
        .where(HookEvent.cwd.contains(project.path.replace("\\", "/")))
        .order_by(desc(HookEvent.received_at))
        .limit(limit)
    )
    for event in hook_result.scalars().all():
        timeline.append({
            "type": "hook_event",
            "title": f"{event.event_name}: {event.tool_name or 'session'}",
            "description": f"Session {(event.session_id or '')[:8]}",
            "timestamp": event.received_at.isoformat(),
            "event_name": event.event_name,
            "tool_name": event.tool_name,
        })

    # 3. Document sync records
    doc_result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(desc(Document.synced_at))
        .limit(limit)
    )
    for doc in doc_result.scalars().all():
        if doc.last_modified:
            timeline.append({
                "type": "doc_update",
                "title": f"문서 업데이트: {doc.file_name}",
                "description": f"{doc.doc_type or 'unknown'} — {doc.file_path}",
                "timestamp": doc.last_modified.isoformat(),
                "file_path": doc.file_path,
                "doc_type": doc.doc_type,
            })

    # Sort by timestamp descending
    timeline.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "project_id": str(project_id),
        "project_name": project.name,
        "timeline": timeline[:limit],
        "total": len(timeline),
    }


def _get_git_log(project_path: str, limit: int) -> list[dict]:
    """Get git log entries from a project directory."""
    try:
        result = subprocess.run(
            ["git", "log", f"--max-count={limit}", "--pretty=format:%H|%s|%aI", "--name-only"],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return []

        entries: list[dict] = []
        current: dict | None = None

        for line in result.stdout.strip().split("\n"):
            if not line:
                if current:
                    entries.append(current)
                    current = None
                continue

            if "|" in line and len(line.split("|")) >= 3:
                if current:
                    entries.append(current)
                parts = line.split("|", 2)
                current = {
                    "hash": parts[0][:7],
                    "subject": parts[1],
                    "timestamp": parts[2],
                    "files": [],
                }
            elif current:
                current["files"].append(line.strip())

        if current:
            entries.append(current)

        return entries
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []
