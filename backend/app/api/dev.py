"""Developer utilities — reset, diagnostics."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/api/v1/dev", tags=["dev"])


@router.post("/reset")
async def dev_reset(db: AsyncSession = Depends(get_db)) -> dict[str, str | int]:
    """Truncate all tables and return summary. DEV ONLY."""
    # projects CASCADE covers: documents, memory_chunks, workflows,
    # workflow_instances, step_executions, code_doc_links, config_changes
    await db.execute(text("TRUNCATE TABLE projects CASCADE"))
    # hook_events has no FK to projects — truncate separately
    await db.execute(text("TRUNCATE TABLE hook_events"))
    await db.commit()
    return {"status": "ok", "tables_cleared": 9}
