import { test, expect } from "../fixtures/api";

test.describe("changes router", () => {
  test("GET /changes returns timeline structure", async ({ be, project }) => {
    const res = await be.get(`/api/v1/changes?project_id=${project.id}&limit=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.project_id).toBe(project.id);
    expect(body.project_name).toBe(project.name);
    expect(Array.isArray(body.timeline)).toBe(true);
    for (const entry of body.timeline) {
      expect(["commit", "hook_event", "doc_update"]).toContain(entry.type);
      expect(entry).toHaveProperty("title");
      expect(entry).toHaveProperty("timestamp");
      if (entry.type === "commit") {
        expect(Array.isArray(entry.linked_documents)).toBe(true);
      }
    }
  });

  test("GET /changes returns 404 for unknown project", async ({ be }) => {
    const res = await be.get("/api/v1/changes?project_id=00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });

  test("GET /changes rejects limit > 100", async ({ be, project }) => {
    const res = await be.get(`/api/v1/changes?project_id=${project.id}&limit=999`);
    expect(res.status()).toBe(422);
  });
});
