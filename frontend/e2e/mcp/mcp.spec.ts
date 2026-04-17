import { test, expect } from "../fixtures/api";

async function rpc(be: import("@playwright/test").APIRequestContext, method: string, params?: unknown) {
  const res = await be.post("/api/v1/mcp", {
    data: { jsonrpc: "2.0", id: Math.floor(Math.random() * 1e6), method, params: params ?? {} },
  });
  return { status: res.status(), body: await res.json() };
}

test.describe("MCP JSON-RPC", () => {
  test("initialize returns protocolVersion + serverInfo", async ({ be }) => {
    const { status, body } = await rpc(be, "initialize");
    expect(status).toBe(200);
    expect(body.result.protocolVersion).toBeTruthy();
    expect(body.result.serverInfo.name).toBe("zm-codex");
  });

  test("tools/list returns the 5 declared tools", async ({ be }) => {
    const { status, body } = await rpc(be, "tools/list");
    expect(status).toBe(200);
    const names = body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      "get_project_summary",
      "get_workflow_status",
      "list_documents",
      "search_memories",
      "update_step_status",
    ]);
  });

  test("tools/call search_memories returns text content", async ({ be, project }) => {
    const { status, body } = await rpc(be, "tools/call", {
      name: "search_memories",
      arguments: { query: "memory", project_id: project.id, limit: 3 },
    });
    expect(status).toBe(200);
    expect(body.result.content[0].type).toBe("text");
    expect(typeof body.result.content[0].text).toBe("string");
  });

  test("tools/call list_documents returns text", async ({ be, project }) => {
    const { status, body } = await rpc(be, "tools/call", {
      name: "list_documents",
      arguments: { project_id: project.id },
    });
    expect(status).toBe(200);
    expect(body.result.content[0].text).toContain("Documents");
  });

  test("tools/call get_workflow_status returns text", async ({ be, project }) => {
    const { status, body } = await rpc(be, "tools/call", {
      name: "get_workflow_status",
      arguments: { project_id: project.id },
    });
    expect(status).toBe(200);
    expect(body.result.content[0].type).toBe("text");
  });

  test("tools/call get_project_summary returns text", async ({ be, project }) => {
    const { status, body } = await rpc(be, "tools/call", {
      name: "get_project_summary",
      arguments: { project_id: project.id },
    });
    expect(status).toBe(200);
    expect(body.result.content[0].text).toContain(project.name);
  });

  test("tools/call update_step_status on non-existent instance returns text", async ({ be }) => {
    const { status, body } = await rpc(be, "tools/call", {
      name: "update_step_status",
      arguments: { instance_id: "00000000-0000-0000-0000-000000000000", node_id: "n1" },
    });
    expect(status).toBe(200);
    // Server should return a text result (possibly "Instance not found: ...")
    expect(body.result.content[0].type).toBe("text");
  });

  test("unknown method returns JSON-RPC error", async ({ be }) => {
    const { status, body } = await rpc(be, "unknown/method");
    expect(status).toBe(200);
    expect(body.error.code).toBe(-32601);
  });

  test("unknown tool returns JSON-RPC error", async ({ be }) => {
    const { status, body } = await rpc(be, "tools/call", {
      name: "nonexistent_tool",
      arguments: {},
    });
    expect(status).toBe(200);
    expect(body.error.code).toBe(-32602);
  });

  test("parse error returns -32700", async () => {
    // Use raw fetch so the body is sent literally (Playwright's request serializes strings as JSON).
    const res = await fetch("http://localhost:30100/api/v1/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    const body = await res.json();
    expect(body.error.code).toBe(-32700);
  });
});
