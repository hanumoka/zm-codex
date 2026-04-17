"""SSE event broadcaster for real-time streaming to web dashboard."""

import asyncio
import json
from datetime import datetime, timezone
from typing import AsyncGenerator


class EventBroadcaster:
    """Simple in-memory SSE broadcaster. Clients subscribe and receive events."""

    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue[dict]] = []

    async def subscribe(self) -> AsyncGenerator[dict, None]:
        """Subscribe to the event stream. Yields dicts that sse_starlette formats as SSE frames."""
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=100)
        self._subscribers.append(queue)
        try:
            while True:
                data = await queue.get()
                yield data
        finally:
            self._subscribers.remove(queue)

    async def broadcast(self, event_type: str, data: dict) -> None:
        """Send an event to all connected subscribers."""
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # sse_starlette formats a dict with keys {event, data} into proper SSE frames.
        message = {"event": event_type, "data": json.dumps(payload, default=str)}

        dead_queues: list[asyncio.Queue[dict]] = []
        for queue in list(self._subscribers):  # copy to avoid mutation during iteration
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                dead_queues.append(queue)

        for q in dead_queues:
            if q in self._subscribers:
                self._subscribers.remove(q)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)


# Global singleton
broadcaster = EventBroadcaster()
