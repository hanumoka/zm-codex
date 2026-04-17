import { test as base, request as pwRequest } from "@playwright/test";

export const BE_URL = process.env.ZM_BE_URL || "http://localhost:30100";
export const FE_URL = process.env.ZM_FE_URL || "http://localhost:30200";

/**
 * Preflight fixture — BE / DB readiness 검증.
 * - BE health check 200 확인
 * - 실패 시 명확한 에러로 hard-fail (docker compose + uvicorn 기동 안내)
 */
export const test = base.extend<{ preflight: void }>({
  preflight: [
    async ({}, use) => {
      const ctx = await pwRequest.newContext({ baseURL: BE_URL });
      try {
        const res = await ctx.get("/api/v1/health", { timeout: 8_000 });
        if (!res.ok()) {
          throw new Error(
            `BE preflight failed: /api/v1/health returned ${res.status()}. ` +
              `Ensure 'uvicorn app.main:app --port 30100' is running.`
          );
        }
        const payload = await res.json();
        if (payload.status !== "ok") {
          throw new Error(`BE preflight: unexpected payload ${JSON.stringify(payload)}`);
        }
      } finally {
        await ctx.dispose();
      }
      await use();
    },
    { scope: "test", auto: true },
  ],
});

export { expect } from "@playwright/test";
