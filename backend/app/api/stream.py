"""SSE endpoint for real-time event streaming to web dashboard."""

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.core.events import broadcaster

router = APIRouter(prefix="/api/stream", tags=["stream"])


@router.get("/events")
async def stream_events() -> EventSourceResponse:
    """SSE stream of all events (hook events, file changes, etc.)."""
    return EventSourceResponse(broadcaster.subscribe())


@router.get("/status")
async def stream_status() -> dict:
    """Check SSE broadcaster status."""
    return {
        "subscribers": broadcaster.subscriber_count,
        "status": "ok",
    }
