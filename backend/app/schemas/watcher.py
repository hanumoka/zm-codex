"""Pydantic schemas for file watcher API."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class WatcherStartRequest(BaseModel):
    project_id: uuid.UUID


class WatcherStopRequest(BaseModel):
    project_id: uuid.UUID


class FileChangeEvent(BaseModel):
    file_path: str
    change_type: str
    action: str
    timestamp: str


class WatcherStatusOut(BaseModel):
    project_id: uuid.UUID
    project_path: str
    active: bool
    started_at: datetime | None = None
    changes_count: int = 0
    last_change_at: datetime | None = None
    recent_changes: list[FileChangeEvent] = []
