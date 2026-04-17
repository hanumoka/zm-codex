"""Channel service — manages message queues for Web → Claude Code communication."""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class ChannelMessage:
    """A message in the channel queue."""

    id: str
    session_id: str
    content: str
    message_type: str  # "command", "prompt", "notification"
    created_at: str
    metadata: dict[str, str] = field(default_factory=dict)


class ChannelManager:
    """Manages per-session message queues for Web → Claude Code communication."""

    def __init__(self) -> None:
        self._queues: dict[str, asyncio.Queue[ChannelMessage]] = {}
        self._message_history: list[ChannelMessage] = []

    async def send(
        self,
        session_id: str,
        content: str,
        message_type: str = "command",
        metadata: dict[str, str] | None = None,
    ) -> ChannelMessage:
        """Queue a message for a Claude Code session."""
        msg = ChannelMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            content=content,
            message_type=message_type,
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata=metadata or {},
        )

        queue = self._queues.setdefault(session_id, asyncio.Queue(maxsize=50))
        try:
            queue.put_nowait(msg)
        except asyncio.QueueFull:
            # Drop oldest message to make room
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
            queue.put_nowait(msg)

        self._message_history.append(msg)
        # Keep last 200 messages
        if len(self._message_history) > 200:
            self._message_history = self._message_history[-200:]

        logger.info("Channel message queued for session %s: %s", session_id[:8], message_type)
        return msg

    async def poll(self, session_id: str, timeout: float = 30.0) -> list[ChannelMessage]:
        """Poll for pending messages. Long-polls up to timeout seconds."""
        queue = self._queues.setdefault(session_id, asyncio.Queue(maxsize=50))

        messages: list[ChannelMessage] = []

        # Drain all immediately available messages
        while not queue.empty():
            try:
                messages.append(queue.get_nowait())
            except asyncio.QueueEmpty:
                break

        # If no messages, wait for one with timeout
        if not messages:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=timeout)
                messages.append(msg)
            except asyncio.TimeoutError:
                pass

        return messages

    def get_status(self) -> dict[str, int]:
        """Get channel status: number of active sessions and pending messages."""
        active_sessions = sum(1 for q in self._queues.values() if not q.empty())
        total_pending = sum(q.qsize() for q in self._queues.values())
        return {
            "active_sessions": active_sessions,
            "total_sessions": len(self._queues),
            "total_pending": total_pending,
            "history_size": len(self._message_history),
        }

    def get_recent_messages(self, limit: int = 20) -> list[ChannelMessage]:
        """Get recent message history."""
        return self._message_history[-limit:]


# Global singleton
channel_manager = ChannelManager()
