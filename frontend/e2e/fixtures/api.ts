import { APIRequestContext, request as pwRequest } from "@playwright/test";
import { test as preflightTest, BE_URL } from "./servers";

export interface Project {
  id: string;
  name: string;
  path: string;
}

interface ApiFixtures {
  be: APIRequestContext;
  project: Project;
}

/**
 * `be`: BE 30100 베이스URL을 가진 request context
 * `project`: zm-codex 프로젝트 (이미 등록된 상태를 전제 — 없으면 테스트 skip)
 */
export const test = preflightTest.extend<ApiFixtures>({
  be: async ({}, use) => {
    const ctx = await pwRequest.newContext({
      baseURL: BE_URL,
      extraHTTPHeaders: { "Content-Type": "application/json" },
    });
    await use(ctx);
    await ctx.dispose();
  },
  project: async ({ be }, use) => {
    const res = await be.get("/api/v1/projects");
    if (!res.ok()) throw new Error(`GET /projects failed: ${res.status()}`);
    const list = (await res.json()) as Project[];
    const first = list[0];
    if (!first) {
      throw new Error(
        "No projects registered. Please POST /api/v1/projects with { name, path } before running e2e."
      );
    }
    await use(first);
  },
});

export { expect } from "@playwright/test";
