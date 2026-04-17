import { test, expect } from "../fixtures/api";

test.describe("hooks router", () => {
  test("POST /hooks/events accepts minimal payload", async ({ be }) => {
    const res = await be.post("/api/hooks/events", {
      data: {
        hook_event_name: "PreToolUse",
        session_id: "e2e-session",
        tool_name: "Read",
        cwd: "/test",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.continue).toBe(true);
  });

  test("POST /hooks/events truncates large tool_response", async ({ be }) => {
    const huge = "x".repeat(5_000);
    const res = await be.post("/api/hooks/events", {
      data: {
        hook_event_name: "PostToolUse",
        session_id: "e2e-session-2",
        tool_name: "Bash",
        tool_response: { stdout: huge },
      },
    });
    expect(res.status()).toBe(200);
  });

  test("POST /hooks/events rejects missing hook_event_name", async ({ be }) => {
    const res = await be.post("/api/hooks/events", { data: { session_id: "x" } });
    expect(res.status()).toBe(422);
  });
});
