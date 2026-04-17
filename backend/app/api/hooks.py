"""Receive Claude Code HTTP hook events and broadcast via SSE."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.events import broadcaster
from app.models.hook_event import HookEvent
from app.schemas.hook_event import HookEventPayload

router = APIRouter(prefix="/api/hooks", tags=["hooks"])


@router.post("/events")
async def receive_hook_event(
    payload: HookEventPayload,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Receive a hook event from Claude Code and broadcast to web dashboard."""

    # Store in DB
    event = HookEvent(
        session_id=payload.session_id,
        event_name=payload.hook_event_name,
        tool_name=payload.tool_name,
        tool_input=payload.tool_input,
        tool_response=_truncate_response(payload.tool_response),
        cwd=payload.cwd,
        raw_payload=payload.model_dump(exclude={"tool_response"}),
    )
    db.add(event)
    await db.commit()

    # Broadcast via SSE
    await broadcaster.broadcast(
        event_type="hook_event",
        data={
            "id": str(event.id),
            "session_id": payload.session_id,
            "event_name": payload.hook_event_name,
            "tool_name": payload.tool_name,
            "cwd": payload.cwd,
            "source": payload.source,
        },
    )

    return {"continue": True}


def _truncate_response(response: dict | None) -> dict | None:
    """Truncate large tool responses to prevent DB bloat."""
    if response is None:
        return None
    truncated = {}
    for key, value in response.items():
        if isinstance(value, str) and len(value) > 2000:
            truncated[key] = value[:2000] + f"... [truncated, {len(value)} chars total]"
        else:
            truncated[key] = value
    return truncated
