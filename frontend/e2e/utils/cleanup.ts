import { APIRequestContext } from "@playwright/test";

export const E2E_PREFIX = "[e2e-";

/** Generate a unique e2e-marked title. */
export function e2eTitle(suffix = ""): string {
  return `${E2E_PREFIX}${Date.now()}-${Math.floor(Math.random() * 1e4)}${suffix ? "-" + suffix : ""}]`;
}

/** Return true if the given title was created by e2e tests. */
export function isE2ETitle(title: string): boolean {
  return title.startsWith(E2E_PREFIX);
}

/** Best-effort delete a list of workflow instance IDs. */
export async function deleteWorkflows(be: APIRequestContext, ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await be.delete(`/api/v1/workflows/${id}`);
    } catch {
      /* swallow */
    }
  }
}
