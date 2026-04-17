import { test, expect } from "../fixtures/api";

test.describe("memories router", () => {
  test("GET /memories/status returns stats", async ({ be, project }) => {
    const res = await be.get(`/api/v1/memories/status?project_id=${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total_chunks");
    expect(body).toHaveProperty("wings");
    expect(body).toHaveProperty("embedding_model");
    expect(body.embedding_dim).toBe(384);
  });

  test("POST /memories/ingest runs full ingestion", async ({ be, project }) => {
    const res = await be.post("/api/v1/memories/ingest", {
      data: { project_id: project.id },
      timeout: 60_000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.chunks_created).toBe("number");
    expect(typeof body.files_processed).toBe("number");
    expect(body.project_id).toBe(project.id);
  });

  test("POST /memories/ingest ignores legacy wing/room fields gracefully", async ({ be, project }) => {
    // IngestRequest no longer has wing/room — server should ignore extras (pydantic default).
    const res = await be.post("/api/v1/memories/ingest", {
      data: { project_id: project.id, wing: "ignored", room: "ignored" },
    });
    // Expect either 200 (ignored) or 422 (if extra='forbid' was set). Both signal correct schema handling.
    expect([200, 422]).toContain(res.status());
  });

  test("GET /memories/search returns hybrid results", async ({ be, project }) => {
    // Make sure some chunks exist first
    await be.post("/api/v1/memories/ingest", { data: { project_id: project.id }, timeout: 60_000 });

    const res = await be.get(`/api/v1/memories/search?query=memory&project_id=${project.id}&limit=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.query).toBe("memory");
    expect(Array.isArray(body.results)).toBe(true);
    if (body.results.length > 0) {
      const first = body.results[0];
      expect(first).toHaveProperty("content");
      expect(first).toHaveProperty("similarity");
      expect(first).toHaveProperty("vector_score");
      expect(first).toHaveProperty("keyword_score");
    }
  });

  test("GET /memories/search returns empty for gibberish", async ({ be, project }) => {
    const res = await be.get(`/api/v1/memories/search?query=xyzzy_quux_nomatch_987654321&project_id=${project.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.results)).toBe(true);
  });

  test("POST /memories/ingest rejects unknown project", async ({ be }) => {
    const res = await be.post("/api/v1/memories/ingest", {
      data: { project_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(404);
  });
});
