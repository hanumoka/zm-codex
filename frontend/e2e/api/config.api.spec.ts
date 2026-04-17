import { test, expect } from "../fixtures/api";

test.describe("config router", () => {
  test("GET /config/history returns array", async ({ be, project }) => {
    const res = await be.get(`/api/v1/config/history?project_id=${project.id}&limit=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.project_id).toBe(project.id);
    expect(Array.isArray(body.changes)).toBe(true);
  });

  test("GET /config/compare same project returns 'same' only", async ({ be, project }) => {
    const res = await be.get(`/api/v1/config/compare?project_a=${project.id}&project_b=${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.summary.different).toBe(0);
    expect(body.summary.total).toBe(body.summary.same);
  });

  test("GET /config/compare rejects unknown UUID", async ({ be, project }) => {
    const res = await be.get(
      `/api/v1/config/compare?project_a=${project.id}&project_b=00000000-0000-0000-0000-000000000000`
    );
    expect(res.status()).toBe(404);
  });

  test("POST /config/template/generate returns summary", async ({ be, project }) => {
    const res = await be.post(`/api/v1/config/template/generate?project_id=${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.project_id).toBe(project.id);
    expect(typeof body.total_files).toBe("number");
    expect(body).toHaveProperty("summary");
  });

  test("POST /config/template/apply rejects missing source", async ({ be, project }) => {
    const res = await be.post(
      `/api/v1/config/template/apply?source_project_id=00000000-0000-0000-0000-000000000000&target_project_id=${project.id}`
    );
    expect(res.status()).toBe(404);
  });
});
