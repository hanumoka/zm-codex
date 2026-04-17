import { test, expect } from "../fixtures/api";
import { collectSSE } from "../utils/sse-client";
import { BE_URL } from "../fixtures/servers";

test.describe("SSE stream", () => {
  test("GET /stream/status reports broadcaster state", async ({ be }) => {
    const res = await be.get("/api/stream/status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.subscribers).toBe("number");
  });

  test("SSE receives hook_event after POST /hooks/events", async ({ be }) => {
    const uniqueTool = `E2E-${Date.now()}`;

    // Wait until the first SSE chunk arrives (ping/heartbeat) to confirm subscription,
    // then fire the event. This avoids race conditions where POST lands before subscribe.
    let ready = false;
    const sseTask = collectSSE(`${BE_URL}/api/stream/events`, {
      timeoutMs: 10_000,
      predicate: (msg) => msg.event === "hook_event" && msg.data.includes(uniqueTool),
      max: 100,
      onReady: () => { ready = true; },
    });

    for (let i = 0; i < 30 && !ready; i++) {
      await new Promise((r) => setTimeout(r, 150));
      if (!ready) {
        // Also accept subscriber_count >= 1 as a readiness proxy in case no ping arrives yet.
        const s = await be.get("/api/stream/status");
        const body = await s.json();
        if ((body.subscribers ?? 0) >= 1) break;
      }
    }

    const post = await be.post("/api/hooks/events", {
      data: {
        hook_event_name: "PostToolUse",
        session_id: "e2e-sse-session",
        tool_name: uniqueTool,
      },
    });
    expect(post.status()).toBe(200);

    const messages = await sseTask;
    const match = messages.find(
      (m) => m.event === "hook_event" && m.data.includes(uniqueTool)
    );
    expect(match, `No matching SSE event in ${messages.length} messages; events=${messages.map(m => m.event).join("|")}`).toBeTruthy();
  });
});
