from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.changes import router as changes_router
from app.api.channel import router as channel_router
from app.api.config import router as config_router
from app.api.dashboard import router as dashboard_router
from app.api.hooks import router as hooks_router
from app.api.mcp import router as mcp_router
from app.api.memories import router as memories_router
from app.api.projects import router as projects_router
from app.api.stream import router as stream_router
from app.api.watcher import router as watcher_router
from app.api.workflows import router as workflows_router
from app.core.database import init_db
from app.services.watcher import watcher_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize DB on startup, cleanup watchers on shutdown."""
    await init_db()
    yield
    await watcher_manager.stop_all()


app = FastAPI(
    title="zm-codex",
    description="Claude Code Management System",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:30200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hooks_router)
app.include_router(projects_router)
app.include_router(stream_router)
app.include_router(workflows_router)
app.include_router(memories_router)
app.include_router(config_router)
app.include_router(changes_router)
app.include_router(dashboard_router)
app.include_router(watcher_router)
app.include_router(mcp_router)
app.include_router(channel_router)


@app.get("/api/v1/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "zm-codex"}
