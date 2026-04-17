import { test, expect } from "../fixtures/api";
import { e2eTitle } from "../utils/cleanup";

test.describe("workflows router", () => {
  test("GET /workflows returns list", async ({ be }) => {
    const res = await be.get("/api/v1/workflows");
    expect(res.status()).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    for (const wf of list) {
      expect(wf).toHaveProperty("nodes");
      expect(wf).toHaveProperty("edges");
    }
  });

  test("GET /workflows?project_id filters", async ({ be, project }) => {
    const res = await be.get(`/api/v1/workflows?project_id=${project.id}`);
    expect(res.status()).toBe(200);
    const list = await res.json();
    for (const wf of list) expect(wf.project_id).toBe(project.id);
  });

  test("GET /workflows/auto-detect returns analysis", async ({ be, project }) => {
    const res = await be.get(`/api/v1/workflows/auto-detect?project_id=${project.id}&since_commits=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("detected_type");
    expect(typeof body.commits_analyzed).toBe("number");
    expect(Array.isArray(body.commit_subjects)).toBe(true);
  });

  test("CRUD workflow + instance lifecycle", async ({ be, project }) => {
    const createdWfs: string[] = [];
    try {
      // Create workflow
      const create = await be.post("/api/v1/workflows", {
        data: {
          project_id: project.id,
          name: e2eTitle("wf"),
          description: "e2e test workflow",
          workflow_type: "custom",
          nodes: [
            { id: "n1", label: "start", type: "start", position: { x: 0, y: 0 } },
            { id: "n2", label: "do", type: "step", position: { x: 100, y: 0 } },
          ],
          edges: [{ id: "e1", source: "n1", target: "n2" }],
        },
      });
      expect(create.status()).toBe(201);
      const wf = await create.json();
      createdWfs.push(wf.id);

      // Get
      const get = await be.get(`/api/v1/workflows/${wf.id}`);
      expect(get.status()).toBe(200);

      // Update
      const patch = await be.patch(`/api/v1/workflows/${wf.id}`, {
        data: { description: "updated" },
      });
      expect(patch.status()).toBe(200);
      expect((await patch.json()).description).toBe("updated");

      // Instance create
      const inst = await be.post(`/api/v1/workflows/${wf.id}/instances`, {
        data: { workflow_id: wf.id, title: e2eTitle("inst") },
      });
      expect(inst.status()).toBe(201);
      const instBody = await inst.json();
      expect(instBody.current_node).toBe("n1");
      expect(instBody.steps).toHaveLength(2);

      // Instance list
      const list = await be.get(`/api/v1/workflows/${wf.id}/instances`);
      expect(list.status()).toBe(200);
      expect((await list.json()).length).toBeGreaterThanOrEqual(1);

      // Instance advance
      const advance = await be.patch(`/api/v1/workflows/${wf.id}/instances/${instBody.id}`, {
        data: { current_node: "n2", status: "running" },
      });
      expect(advance.status()).toBe(200);
      expect((await advance.json()).current_node).toBe("n2");
    } finally {
      for (const id of createdWfs) {
        await be.delete(`/api/v1/workflows/${id}`);
      }
    }
  });

  test("GET /workflows/:id returns 404 for unknown", async ({ be }) => {
    const res = await be.get("/api/v1/workflows/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});
