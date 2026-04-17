import { test, expect } from "../fixtures/api";

test.describe("projects router", () => {
  test("GET /projects returns array with zm-codex", async ({ be, project }) => {
    const res = await be.get("/api/v1/projects");
    expect(res.status()).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.find((p: { id: string }) => p.id === project.id)).toBeTruthy();
  });

  test("GET /projects/:id returns details", async ({ be, project }) => {
    const res = await be.get(`/api/v1/projects/${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(project.id);
    expect(body.name).toBe(project.name);
  });

  test("GET /projects/:id returns 404 for unknown UUID", async ({ be }) => {
    const res = await be.get("/api/v1/projects/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });

  test("POST /projects/:id/sync returns stats", async ({ be, project }) => {
    const res = await be.post(`/api/v1/projects/${project.id}/sync`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    for (const key of ["created", "updated", "unchanged", "deleted", "total", "chunks_created", "files_indexed"]) {
      expect(body).toHaveProperty(key);
      expect(typeof body[key]).toBe("number");
    }
  });

  test("GET /projects/:id/documents returns list", async ({ be, project }) => {
    const res = await be.get(`/api/v1/projects/${project.id}/documents`);
    expect(res.status()).toBe(200);
    const docs = await res.json();
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThan(0);
    const first = docs[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("file_path");
    expect(first).toHaveProperty("doc_type");
  });

  test("GET /projects/:id/documents?doc_type=policy filters", async ({ be, project }) => {
    const res = await be.get(`/api/v1/projects/${project.id}/documents?doc_type=policy`);
    expect(res.status()).toBe(200);
    const docs = await res.json();
    for (const d of docs) expect(d.doc_type).toBe("policy");
  });

  test("GET /projects/:id/documents/:doc_id returns content", async ({ be, project }) => {
    const list = await (await be.get(`/api/v1/projects/${project.id}/documents`)).json();
    const target = list[0];
    const res = await be.get(`/api/v1/projects/${project.id}/documents/${target.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(target.id);
    expect(typeof body.content).toBe("string");
  });

  test("POST /projects/:id/links/detect returns stats", async ({ be, project }) => {
    const res = await be.post(`/api/v1/projects/${project.id}/links/detect?since_commits=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("detected");
    // Response carries `created` (count of links inserted) — not `links_created`.
    expect(typeof body.created).toBe("number");
  });

  test("POST /projects rejects duplicate path", async ({ be, project }) => {
    const res = await be.post("/api/v1/projects", {
      data: { name: "duplicate-attempt", path: project.path },
    });
    expect(res.status()).toBe(409);
  });

  test("POST /projects rejects invalid path", async ({ be }) => {
    const res = await be.post("/api/v1/projects", {
      data: { name: "nonexistent", path: "/does/not/exist/zzz" },
    });
    expect(res.status()).toBe(400);
  });
});
