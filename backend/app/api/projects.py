"""Project registration and document scanning API."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.events import broadcaster
from app.models.document import Document
from app.models.project import Project
from app.schemas.project import (
    DocumentContentOut,
    DocumentOut,
    ProjectCreate,
    ProjectOut,
)
from app.services.linking import detect_links, get_document_links
from app.services.sync import sync_documents

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)) -> list[Project]:
    """List all registered projects."""
    result = await db.execute(select(Project).order_by(Project.created_at))
    return list(result.scalars().all())


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Register a new project by path."""
    # Validate path exists
    if not Path(body.path).is_dir():
        raise HTTPException(status_code=400, detail=f"Directory not found: {body.path}")

    # Check duplicate
    existing = await db.execute(select(Project).where(Project.path == body.path))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Project already registered")

    project = Project(name=body.name, path=body.path)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Initial scan
    await sync_documents(db, project)

    await broadcaster.broadcast("project_created", {"id": str(project.id), "name": project.name})

    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Get project details."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/sync")
async def sync_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Re-scan project documents and sync with DB."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stats = await sync_documents(db, project)
    return {"status": "ok", **stats}


@router.get("/{project_id}/documents", response_model=list[DocumentOut])
async def list_documents(
    project_id: uuid.UUID,
    doc_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Document]:
    """List documents for a project, optionally filtered by type."""
    query = select(Document).where(Document.project_id == project_id)
    if doc_type:
        query = query.where(Document.doc_type == doc_type)
    query = query.order_by(Document.file_path)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{project_id}/documents/{doc_id}", response_model=DocumentContentOut)
async def get_document(
    project_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Document:
    """Get document content."""
    doc = await db.get(Document, doc_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/{project_id}/links/detect")
async def detect_doc_links(
    project_id: uuid.UUID,
    since_commits: int = 20,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    """Auto-detect links between git commits and project documents."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stats = await detect_links(db, project.id, project.path, since_commits)
    return {"status": "detected", **stats}


@router.get("/{project_id}/documents/{doc_id}/links")
async def get_doc_links(
    project_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, str | float]]:
    """Get commit links for a specific document."""
    links = await get_document_links(db, doc_id)
    return [
        {
            "id": str(link.id),
            "commit_hash": link.commit_hash,
            "commit_subject": link.commit_subject,
            "link_type": link.link_type,
            "confidence": link.confidence,
            "detected_at": link.detected_at.isoformat() if link.detected_at else "",
        }
        for link in links
    ]


