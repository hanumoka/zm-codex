import { test, expect } from "../fixtures/api";

test.describe("watcher router", () => {
  test("GET /watcher/status returns array", async ({ be }) => {
    const res = await be.get("/api/v1/watcher/status");
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("watcher start → status → stop lifecycle", async ({ be, project }) => {
    // Ensure stopped first (ignore 404)
    await be.post("/api/v1/watcher/stop", { data: { project_id: project.id } });

    // Start
    const start = await be.post("/api/v1/watcher/start", { data: { project_id: project.id } });
    expect(start.status()).toBe(200);
    const startBody = await start.json();
    expect(startBody.project_id).toBe(project.id);
    expect(startBody.active).toBe(true);

    // Status filtered
    const status = await be.get(`/api/v1/watcher/status?project_id=${project.id}`);
    expect(status.status()).toBe(200);
    const statusList = await status.json();
    expect(statusList.length).toBe(1);
    expect(statusList[0].active).toBe(true);

    // Changes (possibly empty)
    const changes = await be.get(`/api/v1/watcher/changes?project_id=${project.id}`);
    expect(changes.status()).toBe(200);
    expect(Array.isArray(await changes.json())).toBe(true);

    // Stop
    const stop = await be.post("/api/v1/watcher/stop", { data: { project_id: project.id } });
    expect(stop.status()).toBe(200);
    const stopBody = await stop.json();
    expect(stopBody.status).toBe("stopped");
  });

  test("POST /watcher/stop returns 404 when not running", async ({ be, project }) => {
    // Make sure it's off
    await be.post("/api/v1/watcher/stop", { data: { project_id: project.id } });
    const res = await be.post("/api/v1/watcher/stop", { data: { project_id: project.id } });
    expect(res.status()).toBe(404);
  });

  test("GET /watcher/drift returns drift report", async ({ be, project }) => {
    const res = await be.get(`/api/v1/watcher/drift?project_id=${project.id}&since_commits=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.project_id).toBe(project.id);
    expect(typeof body.total_commits_analyzed).toBe("number");
    expect(Array.isArray(body.reports)).toBe(true);
  });

  test("GET /watcher/drift 404 for unknown project", async ({ be }) => {
    const res = await be.get("/api/v1/watcher/drift?project_id=00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});
