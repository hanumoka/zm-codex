"""MCP Server — Streamable HTTP transport for Claude Code tool integration.

Implements JSON-RPC 2.0 protocol with MCP tool calling:
- initialize: server capabilities
- tools/list: available tools
- tools/call: execute a tool
"""

import asyncio
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.document import Document
from app.models.memory import MemoryChunk
from app.models.project import Project
from app.models.workflow import Workflow, WorkflowInstance
from app.services.embedding import embed_single
from app.services.watcher import watcher_manager

router = APIRouter(prefix="/api/v1/mcp", tags=["mcp"])

SERVER_INFO = {
    "name": "zm-codex",
    "version": "0.1.0",
}

MCP_TOOLS = [
    {
        "name": "search_memories",
        "description": "Search project documentation using semantic vector search. Returns relevant text chunks ranked by similarity.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query text"},
                "project_id": {"type": "string", "description": "Project UUID (optional)"},
                "limit": {"type": "integer", "description": "Max results (default 10)", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "list_documents",
        "description": "List scanned documents for a project, optionally filtered by doc type.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Project UUID"},
                "doc_type": {"type": "string", "description": "Filter by type: memory, policy, rule, agent, skill, hook, prd, roadmap, session, feature, archive, config"},
            },
            "required": ["project_id"],
        },
    },
    {
        "name": "get_workflow_status",
        "description": "Get status of workflows and their active instances for a project.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Project UUID (optional, lists all if omitted)"},
                "workflow_id": {"type": "string", "description": "Specific workflow UUID (optional)"},
            },
        },
    },
    {
        "name": "update_step_status",
        "description": "Advance a workflow instance to the next step or update step status.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instance_id": {"type": "string", "description": "Workflow instance UUID"},
                "node_id": {"type": "string", "description": "Target node ID to move to"},
                "status": {"type": "string", "description": "New instance status: running, completed, failed"},
            },
            "required": ["instance_id", "node_id"],
        },
    },
    {
        "name": "get_project_summary",
        "description": "Get a quick summary of a project: document counts, memory stats, watcher status.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Project UUID"},
            },
            "required": ["project_id"],
        },
    },
]


@router.post("")
async def mcp_handler(request: Request, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Main MCP JSON-RPC endpoint."""
    # Parse JSON safely (JSON-RPC §4.1: Parse Error = -32700)
    try:
        body = await request.json()
    except Exception:
        return _jsonrpc_error(None, -32700, "Parse error: invalid JSON")

    if not isinstance(body, dict) or "method" not in body:
        return _jsonrpc_error(None, -32600, "Invalid Request: missing 'method'")

    method: str = body.get("method", "")
    req_id = body.get("id")
    params: dict = body.get("params") or {}

    if method == "initialize":
        return _jsonrpc_result(req_id, {
            "protocolVersion": "2025-03-26",
            "capabilities": {"tools": {}},
            "serverInfo": SERVER_INFO,
        })

    # Notifications (no id) → return 204 No Content per JSON-RPC spec
    if method.startswith("notifications/"):
        return JSONResponse(content=None, status_code=204)

    if method == "tools/list":
        return _jsonrpc_result(req_id, {"tools": MCP_TOOLS})

    if method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments") or {}
        return await _handle_tool_call(req_id, tool_name, arguments, db)

    return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")


async def _handle_tool_call(
    req_id: int | str | None,
    tool_name: str,
    arguments: dict,
    db: AsyncSession,
) -> JSONResponse:
    """Route tool calls to their implementations."""
    try:
        if tool_name == "search_memories":
            result = await _tool_search_memories(arguments, db)
        elif tool_name == "list_documents":
            result = await _tool_list_documents(arguments, db)
        elif tool_name == "get_workflow_status":
            result = await _tool_get_workflow_status(arguments, db)
        elif tool_name == "update_step_status":
            result = await _tool_update_step_status(arguments, db)
        elif tool_name == "get_project_summary":
            result = await _tool_get_project_summary(arguments, db)
        else:
            return _jsonrpc_error(req_id, -32602, f"Unknown tool: {tool_name}")

        return _jsonrpc_result(req_id, {
            "content": [{"type": "text", "text": str(result)}],
        })

    except Exception as e:
        return _jsonrpc_error(req_id, -32000, str(e))


# ── Tool implementations ──


async def _tool_search_memories(args: dict, db: AsyncSession) -> str:
    """Search memories using vector similarity."""
    query = args["query"]
    limit = args.get("limit", 10)
    project_id_str = args.get("project_id")

    query_embedding = await asyncio.to_thread(embed_single, query)
    cosine_distance = MemoryChunk.embedding.cosine_distance(query_embedding)
    similarity = (1 - cosine_distance).label("similarity")

    stmt = select(MemoryChunk, similarity).order_by(cosine_distance).limit(limit)

    if project_id_str:
        stmt = stmt.where(MemoryChunk.project_id == uuid.UUID(project_id_str))

    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return f"No results found for query: {query}"

    lines: list[str] = [f"Search results for '{query}' ({len(rows)} matches):"]
    for chunk, sim in rows:
        lines.append(f"\n--- [{chunk.source_file}] (similarity: {max(0, float(sim)):.3f}) ---")
        lines.append(chunk.content[:500])

    return "\n".join(lines)


async def _tool_list_documents(args: dict, db: AsyncSession) -> str:
    """List documents for a project."""
    project_id = uuid.UUID(args["project_id"])
    doc_type = args.get("doc_type")

    stmt = select(Document).where(Document.project_id == project_id)
    if doc_type:
        stmt = stmt.where(Document.doc_type == doc_type)
    stmt = stmt.order_by(Document.file_path)

    result = await db.execute(stmt)
    docs = list(result.scalars().all())

    if not docs:
        return "No documents found."

    lines: list[str] = [f"Documents ({len(docs)}):"]
    for doc in docs:
        size_kb = doc.file_size / 1024 if doc.file_size else 0
        lines.append(f"  [{doc.doc_type or 'unknown'}] {doc.file_path} ({size_kb:.1f}KB)")

    return "\n".join(lines)


async def _tool_get_workflow_status(args: dict, db: AsyncSession) -> str:
    """Get workflow and instance status."""
    project_id_str = args.get("project_id")
    workflow_id_str = args.get("workflow_id")

    stmt = select(Workflow)
    if workflow_id_str:
        stmt = stmt.where(Workflow.id == uuid.UUID(workflow_id_str))
    elif project_id_str:
        stmt = stmt.where(Workflow.project_id == uuid.UUID(project_id_str))

    result = await db.execute(stmt)
    workflows = list(result.scalars().all())

    if not workflows:
        return "No workflows found."

    lines: list[str] = []
    for wf in workflows:
        lines.append(f"\nWorkflow: {wf.name} ({wf.workflow_type})")
        lines.append(f"  Nodes: {len(wf.nodes)}, Edges: {len(wf.edges)}")

        # Get instances
        inst_result = await db.execute(
            select(WorkflowInstance)
            .where(WorkflowInstance.workflow_id == wf.id)
            .options(selectinload(WorkflowInstance.steps))
            .order_by(WorkflowInstance.started_at.desc())
            .limit(5)
        )
        instances = list(inst_result.scalars().all())

        for inst in instances:
            completed = sum(1 for s in inst.steps if s.status == "completed")
            total = len(inst.steps)
            lines.append(f"  Instance: {inst.title} [{inst.status}] — {completed}/{total} steps @ {inst.current_node}")

    return "\n".join(lines)


async def _tool_update_step_status(args: dict, db: AsyncSession) -> str:
    """Advance a workflow instance step."""
    instance_id = uuid.UUID(args["instance_id"])
    node_id = args["node_id"]
    new_status = args.get("status")

    result = await db.execute(
        select(WorkflowInstance)
        .where(WorkflowInstance.id == instance_id)
        .options(selectinload(WorkflowInstance.steps))
    )
    inst = result.scalar_one_or_none()
    if not inst:
        return f"Instance not found: {instance_id}"

    inst.current_node = node_id
    for step in inst.steps:
        if step.node_id == node_id:
            step.status = "running"
        elif step.status == "running":
            step.status = "completed"

    if new_status:
        inst.status = new_status

    await db.commit()
    return f"Instance {inst.title} moved to node '{node_id}'. Status: {inst.status}"


async def _tool_get_project_summary(args: dict, db: AsyncSession) -> str:
    """Get quick project summary."""
    project_id = uuid.UUID(args["project_id"])
    project = await db.get(Project, project_id)
    if not project:
        return f"Project not found: {project_id}"

    # Document counts
    doc_count = await db.execute(
        select(func.count(Document.id)).where(Document.project_id == project_id)
    )
    total_docs = doc_count.scalar() or 0

    doc_types = await db.execute(
        select(Document.doc_type, func.count(Document.id))
        .where(Document.project_id == project_id)
        .group_by(Document.doc_type)
    )
    type_counts = {row[0] or "unknown": row[1] for row in doc_types.all()}

    # Memory chunks
    chunk_count = await db.execute(
        select(func.count(MemoryChunk.id)).where(MemoryChunk.project_id == project_id)
    )
    total_chunks = chunk_count.scalar() or 0

    # Watcher status
    watcher_status = watcher_manager.get_status(project_id)
    watcher_active = watcher_manager.is_active(project_id)

    lines = [
        f"Project: {project.name}",
        f"Path: {project.path}",
        f"Documents: {total_docs}",
    ]

    if type_counts:
        lines.append("  By type: " + ", ".join(f"{k}={v}" for k, v in type_counts.items()))

    lines.append(f"Memory chunks: {total_chunks}")
    lines.append(f"Watcher: {'active' if watcher_active else 'inactive'}")

    if watcher_status and watcher_active:
        lines.append(f"  Changes detected: {watcher_status.changes_count}")

    return "\n".join(lines)


# ── JSON-RPC helpers ──


def _jsonrpc_result(req_id: int | str | None, result: dict) -> JSONResponse:
    return JSONResponse(content={
        "jsonrpc": "2.0",
        "id": req_id,
        "result": result,
    })


def _jsonrpc_error(req_id: int | str | None, code: int, message: str) -> JSONResponse:
    return JSONResponse(content={
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": code, "message": message},
    })
