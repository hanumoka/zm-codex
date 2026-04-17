"""Regression tests for MCP workflow tools (create_workflow_from_template, create_instance).

Exercises the JSON-RPC 2.0 endpoint via tools/call, matching how Claude Code
invokes the server over Streamable HTTP.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest

from app.models.project import Project


async def _call_tool(
    client: httpx.AsyncClient, tool: str, arguments: dict
) -> tuple[int, dict]:
    r = await client.post(
        "/api/v1/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool, "arguments": arguments},
        },
    )
    return r.status_code, r.json()


async def _delete_by_type(client: httpx.AsyncClient, project_id: str, workflow_type: str) -> None:
    r = await client.get(f"/api/v1/workflows?project_id={project_id}")
    for wf in r.json():
        if wf.get("workflow_type") == workflow_type:
            await client.delete(f"/api/v1/workflows/{wf['id']}")


async def test_tools_list_includes_new_workflow_tools(client: httpx.AsyncClient) -> None:
    r = await client.post(
        "/api/v1/mcp",
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert r.status_code == 200
    names = {t["name"] for t in r.json()["result"]["tools"]}
    assert {
        "create_workflow_from_template",
        "create_instance",
        "update_step_status",
    } <= names


async def test_create_workflow_from_template_then_create_and_advance_instance(
    client: httpx.AsyncClient, zm_project: Project, tracker: list[str]
) -> None:
    pid = str(zm_project.id)
    await _delete_by_type(client, pid, "bugfix")

    status, body = await _call_tool(
        client,
        "create_workflow_from_template",
        {"project_id": pid, "template_name": "bugfix"},
    )
    assert status == 200
    text = body["result"]["content"][0]["text"]
    assert "Created workflow" in text
    assert "[bugfix]" in text

    # Locate the workflow just created so the tracker can delete it (which will
    # also remove the disk .md via the new delete_workflow behavior).
    r = await client.get(f"/api/v1/workflows?project_id={pid}")
    wf = next(w for w in r.json() if w["workflow_type"] == "bugfix")
    tracker.append(wf["id"])

    # Now start an instance via MCP
    status, body = await _call_tool(
        client,
        "create_instance",
        {"workflow_id": wf["id"], "title": "[pytest-mcp] bug triage"},
    )
    assert status == 200
    text = body["result"]["content"][0]["text"]
    assert "Started instance" in text
    assert wf["name"] in text

    # Advance via update_step_status (sibling tool)
    nodes = wf["nodes"]
    assert len(nodes) >= 2
    second_node = nodes[1]["id"]

    # Grab the instance id from the listing
    r = await client.get(f"/api/v1/workflows/{wf['id']}/instances")
    assert r.status_code == 200
    inst = r.json()[0]
    inst_id = inst["id"]

    status, body = await _call_tool(
        client,
        "update_step_status",
        {"instance_id": inst_id, "node_id": second_node, "status": "active"},
    )
    assert status == 200
    text = body["result"]["content"][0]["text"]
    assert second_node in text

    # Final: confirm instance moved
    r = await client.get(f"/api/v1/workflows/{wf['id']}/instances")
    assert r.json()[0]["current_node"] == second_node


@pytest.mark.parametrize("template_name", ["nonexistent", "../etc/passwd", "review\x00.md"])
async def test_create_workflow_from_template_rejects_bad(
    client: httpx.AsyncClient, zm_project: Project, template_name: str
) -> None:
    status, body = await _call_tool(
        client,
        "create_workflow_from_template",
        {"project_id": str(zm_project.id), "template_name": template_name},
    )
    assert status == 200  # JSON-RPC conveys the error in the result payload
    text = body["result"]["content"][0]["text"]
    assert ("Template not found" in text) or ("Error:" in text)


async def test_create_instance_on_unknown_workflow(client: httpx.AsyncClient) -> None:
    status, body = await _call_tool(
        client,
        "create_instance",
        {
            "workflow_id": "00000000-0000-0000-0000-000000000000",
            "title": "ghost",
        },
    )
    assert status == 200
    text = body["result"]["content"][0]["text"]
    assert "Workflow not found" in text


@pytest.fixture(autouse=True)
def _cleanup_bugfix_md(zm_project: Project):
    """Safety net: the MCP template test writes .claude/workflows/bugfix.md.
    The tracker fixture deletes the DB row (which now also unlinks the file),
    but in case a test aborts before tracker runs, remove it here too.
    """
    yield
    bugfix_md = Path(zm_project.path) / ".claude" / "workflows" / "bugfix.md"
    if bugfix_md.is_file():
        try:
            os.remove(bugfix_md)
        except OSError:
            pass
    wdir = bugfix_md.parent
    if wdir.is_dir():
        try:
            if not any(wdir.iterdir()):
                wdir.rmdir()
        except OSError:
            pass
