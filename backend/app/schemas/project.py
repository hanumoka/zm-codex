import uuid
from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    path: str


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    path: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: uuid.UUID
    file_path: str
    file_name: str
    doc_type: str | None
    file_size: int
    last_modified: datetime | None

    model_config = {"from_attributes": True}


class DocumentContentOut(BaseModel):
    id: uuid.UUID
    file_path: str
    file_name: str
    doc_type: str | None
    content: str | None
    last_modified: datetime | None

    model_config = {"from_attributes": True}
