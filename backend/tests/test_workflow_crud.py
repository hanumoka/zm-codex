"""Regression tests for workflow CRUD + rename/duplicate guards + export/import."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

import httpx
import pytest

from app.models.project import Project
from tests.conftest import detail


def _pytest_name(suffix: str = "") -> str:
    token = uuid.uuid4().hex[:8]
    return f"[pytest-{token}]{suffix}"


async def test_create_list_get_update_delete(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    name = _pytest_name("-crud")

    node = {"id": "n1", "label": "start", "type": "start", "position": {"x": 0, "y": 0}}
    r = await client.post(
        "/api/v1/workflows",
        json={
            "project_id": pid,
            "name": name,
            "workflow_type": "custom",
            "nodes": [node],
            "edges": [],
        },
    )
    assert r.status_code == 201, detail(r)
    wf = r.json()
    tracker.append(wf["id"])
    assert wf["name"] == name

    # List
    r = await client.get(f"/api/v1/workflows?project_id={pid}")
    assert r.status_code == 200
    assert any(w["id"] == wf["id"] for w in r.json())

    # Get
    r = await client.get(f"/api/v1/workflows/{wf['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == name

    # Update description
    r = await client.patch(
        f"/api/v1/workflows/{wf['id']}", json={"description": "updated by pytest"}
    )
    assert r.status_code == 200
    assert r.json()["description"] == "updated by pytest"


async def test_duplicate_name_returns_409(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    name = _pytest_name("-dup")

    r = await client.post(
        "/api/v1/workflows",
        json={
            "project_id": pid,
            "name": name,
            "workflow_type": "custom",
            "nodes": [{"id": "n1", "label": "s", "type": "start", "position": {"x": 0, "y": 0}}],
            "edges": [],
        },
    )
    assert r.status_code == 201
    tracker.append(r.json()["id"])

    # Same name → 409
    r2 = await client.post(
        "/api/v1/workflows",
        json={"project_id": pid, "name": name, "workflow_type": "custom", "nodes": [], "edges": []},
    )
    assert r2.status_code == 409


async def test_rename_to_existing_name_returns_409(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    name_a = _pytest_name("-rnA")
    name_b = _pytest_name("-rnB")

    node = {"id": "n1", "label": "s", "type": "start", "position": {"x": 0, "y": 0}}

    async def make(name: str) -> str:
        r = await client.post(
            "/api/v1/workflows",
            json={
                "project_id": pid,
                "name": name,
                "workflow_type": "custom",
                "nodes": [node],
                "edges": [],
            },
        )
        assert r.status_code == 201, detail(r)
        tracker.append(r.json()["id"])
        return r.json()["id"]

    id_a = await make(name_a)
    id_b = await make(name_b)

    # B → A (conflict)
    r = await client.patch(f"/api/v1/workflows/{id_b}", json={"name": name_a})
    assert r.status_code == 409

    # A → A (self-rename no-op, should succeed)
    r = await client.patch(f"/api/v1/workflows/{id_a}", json={"name": name_a})
    assert r.status_code == 200


async def test_instance_create_and_advance(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    name = _pytest_name("-inst")

    r = await client.post(
        "/api/v1/workflows",
        json={
            "project_id": pid,
            "name": name,
            "workflow_type": "custom",
            "nodes": [
                {"id": "n1", "label": "start", "type": "start", "position": {"x": 0, "y": 0}},
                {"id": "n2", "label": "do", "type": "step", "position": {"x": 100, "y": 0}},
            ],
            "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
        },
    )
    assert r.status_code == 201
    wf_id = r.json()["id"]
    tracker.append(wf_id)

    r = await client.post(
        f"/api/v1/workflows/{wf_id}/instances",
        json={"workflow_id": wf_id, "title": _pytest_name("-inst-title")},
    )
    assert r.status_code == 201, detail(r)
    inst = r.json()
    assert inst["current_node"] == "n1"
    assert len(inst["steps"]) == 2

    # Advance node → step statuses should update server-side
    r = await client.patch(
        f"/api/v1/workflows/{wf_id}/instances/{inst['id']}", json={"current_node": "n2"}
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["current_node"] == "n2"
    steps_by_id = {s["node_id"]: s for s in updated["steps"]}
    assert steps_by_id["n2"]["status"] == "running"
    assert steps_by_id["n1"]["status"] == "completed"


async def test_export_import_round_trip(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    name = _pytest_name("-export")

    r = await client.post(
        "/api/v1/workflows",
        json={
            "project_id": pid,
            "name": name,
            "workflow_type": "custom",
            "nodes": [{"id": "n1", "label": "s", "type": "start", "position": {"x": 0, "y": 0}}],
            "edges": [],
        },
    )
    assert r.status_code == 201
    wf_id = r.json()["id"]
    tracker.append(wf_id)

    r = await client.post(f"/api/v1/workflows/{wf_id}/export", json={})
    assert r.status_code == 200, detail(r)
    file_path = r.json()["file_path"]

    try:
        # Delete row; file stays on disk
        r = await client.delete(f"/api/v1/workflows/{wf_id}")
        assert r.status_code == 204

        # Import → recreate
        r = await client.post(f"/api/v1/workflows/import?project_id={pid}", json={})
        assert r.status_code == 200
        stats = r.json()
        assert stats["created"] + stats["updated"] >= 1

        # Recapture the freshly-created row for cleanup
        r = await client.get(f"/api/v1/workflows?project_id={pid}")
        for wf in r.json():
            if wf["name"] == name:
                tracker.append(wf["id"])
                break
    finally:
        if Path(file_path).is_file():
            try:
                os.remove(file_path)
            except OSError:
                pass


@pytest.mark.parametrize("bad_id", ["00000000-0000-0000-0000-000000000000"])
async def test_get_unknown_returns_404(client: httpx.AsyncClient, bad_id: str) -> None:
    r = await client.get(f"/api/v1/workflows/{bad_id}")
    assert r.status_code == 404
