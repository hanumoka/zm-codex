"""Regression tests for bundled workflow templates + /from-template endpoint."""
from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest

from app.models.project import Project
from tests.conftest import detail


async def _delete_by_type(client: httpx.AsyncClient, project_id: str, workflow_type: str) -> None:
    """Best-effort precondition: remove any leftover workflow of the given type."""
    r = await client.get(f"/api/v1/workflows?project_id={project_id}")
    for wf in r.json():
        if wf.get("workflow_type") == workflow_type:
            await client.delete(f"/api/v1/workflows/{wf['id']}")


async def test_list_templates_returns_four_bundled(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/v1/workflows/templates")
    assert r.status_code == 200
    data = r.json()
    names = {t["template_name"] for t in data}
    assert {"bugfix", "deployment", "development", "review"} <= names
    for t in data:
        assert int(t["nodes_count"]) > 0
        assert int(t["edges_count"]) >= 0


async def test_from_template_creates_then_409_on_duplicate(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    await _delete_by_type(client, pid, "review")

    r1 = await client.post(
        "/api/v1/workflows/from-template",
        json={"project_id": pid, "template_name": "review"},
    )
    assert r1.status_code == 201, detail(r1)
    tracker.append(r1.json()["id"])
    assert r1.json()["workflow_type"] == "review"

    # create_from_template also wrote `.claude/workflows/review.md` into the
    # project tree. Track it for cleanup — otherwise subsequent `Import`
    # operations in the dev session would silently re-create this row.
    review_md = Path(zm_project.path) / ".claude" / "workflows" / "review.md"

    try:
        r2 = await client.post(
            "/api/v1/workflows/from-template",
            json={"project_id": pid, "template_name": "review"},
        )
        assert r2.status_code == 409
        assert "already exists" in detail(r2)
    finally:
        if review_md.is_file():
            try:
                os.remove(review_md)
            except OSError:
                pass
        # Remove the workflows dir if we left it empty.
        wdir = review_md.parent
        if wdir.is_dir() and not any(wdir.iterdir()):
            try:
                wdir.rmdir()
            except OSError:
                pass


@pytest.mark.parametrize("bad_name", ["../etc/passwd", "nonexistent", "review\x00.mdx"])
async def test_from_template_rejects_bad_names(
    client: httpx.AsyncClient, zm_project: Project, bad_name: str
) -> None:
    r = await client.post(
        "/api/v1/workflows/from-template",
        json={"project_id": str(zm_project.id), "template_name": bad_name},
    )
    assert r.status_code == 404, detail(r)


async def test_from_template_unknown_project_404(client: httpx.AsyncClient) -> None:
    r = await client.post(
        "/api/v1/workflows/from-template",
        json={
            "project_id": "00000000-0000-0000-0000-000000000000",
            "template_name": "bugfix",
        },
    )
    assert r.status_code == 404
