"""File watcher service — monitors project directories for changes using watchfiles."""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import watchfiles

from app.core.config import settings
from app.core.database import async_session
from app.core.events import broadcaster
from app.models.config_history import ConfigChange
from app.services.scanner import SCANNABLE_EXTENSIONS, SKIP_DIRS
from app.services.sync import sync_single_file

logger = logging.getLogger(__name__)


@dataclass
class WatcherStatus:
    """Status of a single project watcher."""

    project_id: uuid.UUID
    project_path: str
    active: bool = True
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    changes_count: int = 0
    last_change_at: datetime | None = None
    recent_changes: list[dict[str, str]] = field(default_factory=list)


def _should_watch(path: str) -> bool:
    """Filter function: only watch scannable files, skip unwanted dirs."""
    p = Path(path)

    # Skip unwanted directories
    for part in p.parts:
        if part in SKIP_DIRS:
            return False

    # Only watch scannable extensions (or directories for delete detection)
    if p.suffix and p.suffix.lower() not in SCANNABLE_EXTENSIONS:
        return False

    return True


def _change_type_label(change: watchfiles.Change) -> str:
    """Convert watchfiles Change enum to string label."""
    if change == watchfiles.Change.added:
        return "created"
    if change == watchfiles.Change.modified:
        return "modified"
    if change == watchfiles.Change.deleted:
        return "deleted"
    return "unknown"


class FileWatcherManager:
    """Manages per-project file watching background tasks."""

    def __init__(self) -> None:
        self._tasks: dict[uuid.UUID, asyncio.Task[None]] = {}
        self._status: dict[uuid.UUID, WatcherStatus] = {}

    async def start(self, project_id: uuid.UUID, project_path: str) -> WatcherStatus:
        """Start watching a project directory."""
        if project_id in self._tasks and not self._tasks[project_id].done():
            return self._status[project_id]

        status = WatcherStatus(project_id=project_id, project_path=project_path)
        self._status[project_id] = status

        task = asyncio.create_task(
            self._watch_loop(project_id, project_path),
            name=f"watcher-{project_id}",
        )
        self._tasks[project_id] = task

        await broadcaster.broadcast(
            "watcher_started",
            {"project_id": str(project_id), "project_path": project_path},
        )
        logger.info("Started watcher for project %s at %s", project_id, project_path)
        return status

    async def stop(self, project_id: uuid.UUID) -> bool:
        """Stop watching a project. Returns True if was running."""
        task = self._tasks.pop(project_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        status = self._status.get(project_id)
        if status:
            status.active = False

        await broadcaster.broadcast(
            "watcher_stopped",
            {"project_id": str(project_id)},
        )
        logger.info("Stopped watcher for project %s", project_id)
        return task is not None

    async def stop_all(self) -> None:
        """Stop all watchers. Called during application shutdown."""
        project_ids = list(self._tasks.keys())
        for pid in project_ids:
            await self.stop(pid)

    def get_status(self, project_id: uuid.UUID) -> WatcherStatus | None:
        return self._status.get(project_id)

    def get_all_status(self) -> dict[uuid.UUID, WatcherStatus]:
        return dict(self._status)

    def is_active(self, project_id: uuid.UUID) -> bool:
        task = self._tasks.get(project_id)
        return task is not None and not task.done()

    async def _watch_loop(self, project_id: uuid.UUID, project_path: str) -> None:
        """Core watch loop using watchfiles.awatch."""
        rust_timeout = settings.watcher_debounce_ms

        try:
            async for changes in watchfiles.awatch(
                project_path,
                watch_filter=lambda _, path: _should_watch(path),
                rust_timeout=rust_timeout,
                yield_on_timeout=False,
            ):
                await self._process_changes(project_id, project_path, changes)
        except asyncio.CancelledError:
            logger.info("Watch loop cancelled for project %s", project_id)
            raise
        except Exception:
            logger.exception("Watch loop error for project %s", project_id)
            status = self._status.get(project_id)
            if status:
                status.active = False

    async def _process_changes(
        self,
        project_id: uuid.UUID,
        project_path: str,
        changes: set[tuple[watchfiles.Change, str]],
    ) -> None:
        """Process a batch of file changes."""
        status = self._status.get(project_id)
        if not status:
            return

        change_events: list[dict[str, str]] = []

        async with async_session() as db:
            for change, path in changes:
                change_type = _change_type_label(change)

                result = await sync_single_file(
                    db=db,
                    project_id=project_id,
                    project_path=project_path,
                    file_path_absolute=path,
                    change_type=change_type,
                    auto_commit=False,
                )

                if result["action"] != "skipped":
                    event = {
                        "file_path": result["file_path"],
                        "change_type": change_type,
                        "action": result["action"],
                    }
                    change_events.append(event)

            # Record config changes for .claude/ files
            for change, path in changes:
                rel = Path(path)
                try:
                    rel_str = str(
                        rel.resolve().relative_to(Path(project_path).resolve())
                    ).replace("\\", "/")
                except ValueError:
                    continue
                if rel_str.startswith(".claude/"):
                    ct = _change_type_label(change)
                    db.add(ConfigChange(
                        project_id=project_id,
                        file_path=rel_str,
                        change_type=ct,
                    ))

            # Auto-import workflow .md files when changed
            workflow_changes = [
                path for change, path in changes
                if ".claude/workflows/" in path.replace("\\", "/")
                and path.endswith(".md")
                and _change_type_label(change) != "deleted"
            ]
            if workflow_changes:
                from app.services.workflow_sync import import_single_workflow_file
                for wf_path in workflow_changes:
                    await import_single_workflow_file(db, project_id, Path(wf_path))

            # Commit entire batch atomically
            await db.commit()

        if change_events:
            now = datetime.now(timezone.utc)
            status.changes_count += len(change_events)
            status.last_change_at = now

            # Keep last 100 changes
            for evt in change_events:
                evt["timestamp"] = now.isoformat()
            status.recent_changes = (change_events + status.recent_changes)[:100]

            await broadcaster.broadcast(
                "file_changed",
                {
                    "project_id": str(project_id),
                    "changes": change_events,
                    "batch_size": len(change_events),
                },
            )


# Global singleton
watcher_manager = FileWatcherManager()
