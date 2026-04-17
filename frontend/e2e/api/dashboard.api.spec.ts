import { test, expect } from "../fixtures/api";

test.describe("dashboard router", () => {
  const STAT_KEYS = [
    "documents", "memories", "workflows", "instances", "hook_events",
    "agents", "rules", "hooks", "skills", "policies", "doc_types",
  ];

  test("GET /dashboard/stats (no project_id) returns global stats", async ({ be }) => {
    const res = await be.get("/api/v1/dashboard/stats");
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const k of STAT_KEYS) expect(body).toHaveProperty(k);
    expect(typeof body.documents).toBe("number");
    expect(typeof body.doc_types).toBe("object");
  });

  test("GET /dashboard/stats?project_id scopes counts", async ({ be, project }) => {
    const res = await be.get(`/api/v1/dashboard/stats?project_id=${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.documents).toBeGreaterThan(0);
    expect(Object.keys(body.doc_types).length).toBeGreaterThan(0);
  });
});
