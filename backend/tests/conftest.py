"""Shared fixtures for backend regression tests.

These tests hit the real dev PostgreSQL (the app's configured database) via an
in-process ASGI transport — no separate test DB. Each test must clean up any
workflows it creates; the `tracker` fixture provides a best-effort helper.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest_asyncio
from httpx import ASGITransport
from sqlalchemy import select

from app.core.database import async_session
from app.main import app
from app.models.project import Project


@pytest_asyncio.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def zm_project() -> Project:
    async with async_session() as db:
        result = await db.execute(select(Project).where(Project.name == "zm-codex"))
        project = result.scalar_one_or_none()
        assert project is not None, "zm-codex project is required for these tests"
        return project


@pytest_asyncio.fixture
async def tracker(client: httpx.AsyncClient) -> AsyncIterator[list[str]]:
    """Accumulate workflow IDs created during the test; delete them at teardown.

    Usage:
        tracker.append(workflow_id)
    """
    created: list[str] = []
    try:
        yield created
    finally:
        for wf_id in created:
            try:
                await client.delete(f"/api/v1/workflows/{wf_id}")
            except Exception:  # noqa: BLE001 — best-effort cleanup
                pass


def detail(response: httpx.Response) -> Any:
    try:
        return response.json().get("detail")
    except Exception:
        return response.text
