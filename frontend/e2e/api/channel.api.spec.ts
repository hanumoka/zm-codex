import { test, expect } from "../fixtures/api";

test.describe("channel router", () => {
  const SESSION = "e2e-channel-session";

  test("POST /channel/send + GET /channel/poll flow", async ({ be }) => {
    // send
    const send = await be.post("/api/v1/channel/send", {
      data: {
        session_id: SESSION,
        content: "e2e ping",
        message_type: "command",
      },
    });
    expect(send.status()).toBe(200);
    const sendBody = await send.json();
    expect(sendBody.session_id).toBe(SESSION);
    expect(sendBody.content).toBe("e2e ping");
    expect(typeof sendBody.id).toBe("string");

    // poll — should receive (short timeout since already queued)
    const poll = await be.get(`/api/v1/channel/poll?session_id=${SESSION}&timeout=2`);
    expect(poll.status()).toBe(200);
    const pollBody = await poll.json();
    expect(Array.isArray(pollBody)).toBe(true);
    expect(pollBody.find((m: { id: string }) => m.id === sendBody.id)).toBeTruthy();
  });

  test("GET /channel/status returns counts", async ({ be }) => {
    const res = await be.get("/api/v1/channel/status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // numeric keys expected; just ensure object
    expect(typeof body).toBe("object");
  });

  test("GET /channel/history returns recent messages", async ({ be }) => {
    const res = await be.get("/api/v1/channel/history?limit=5");
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("GET /channel/poll rejects invalid timeout", async ({ be }) => {
    const res = await be.get(`/api/v1/channel/poll?session_id=x&timeout=999`);
    expect(res.status()).toBe(422);
  });
});
