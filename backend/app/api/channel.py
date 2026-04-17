"""Channel API — Web → Claude Code bidirectional messaging."""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.events import broadcaster
from app.services.channel import channel_manager

router = APIRouter(prefix="/api/v1/channel", tags=["channel"])


class ChannelSendRequest(BaseModel):
    session_id: str
    content: str
    message_type: str = "command"  # command, prompt, notification
    metadata: dict[str, str] = {}


class ChannelMessageOut(BaseModel):
    id: str
    session_id: str
    content: str
    message_type: str
    created_at: str
    metadata: dict[str, str] = {}


@router.post("/send", response_model=ChannelMessageOut)
async def send_message(body: ChannelSendRequest) -> ChannelMessageOut:
    """Send a message to a Claude Code session."""
    msg = await channel_manager.send(
        session_id=body.session_id,
        content=body.content,
        message_type=body.message_type,
        metadata=body.metadata,
    )

    await broadcaster.broadcast("channel_message", {
        "id": msg.id,
        "session_id": msg.session_id,
        "content": msg.content[:200],
        "message_type": msg.message_type,
    })

    return ChannelMessageOut(
        id=msg.id,
        session_id=msg.session_id,
        content=msg.content,
        message_type=msg.message_type,
        created_at=msg.created_at,
        metadata=msg.metadata,
    )


@router.get("/poll", response_model=list[ChannelMessageOut])
async def poll_messages(
    session_id: str,
    timeout: float = Query(30.0, ge=1.0, le=60.0),
) -> list[ChannelMessageOut]:
    """Long-poll for messages targeted at a specific Claude Code session."""
    messages = await channel_manager.poll(session_id, timeout)
    return [
        ChannelMessageOut(
            id=m.id,
            session_id=m.session_id,
            content=m.content,
            message_type=m.message_type,
            created_at=m.created_at,
            metadata=m.metadata,
        )
        for m in messages
    ]


@router.get("/status")
async def channel_status() -> dict[str, int]:
    """Get channel status: active sessions and pending message counts."""
    return channel_manager.get_status()


@router.get("/history", response_model=list[ChannelMessageOut])
async def channel_history(
    limit: int = Query(20, ge=1, le=100),
) -> list[ChannelMessageOut]:
    """Get recent channel message history."""
    messages = channel_manager.get_recent_messages(limit)
    return [
        ChannelMessageOut(
            id=m.id,
            session_id=m.session_id,
            content=m.content,
            message_type=m.message_type,
            created_at=m.created_at,
            metadata=m.metadata,
        )
        for m in messages
    ]
