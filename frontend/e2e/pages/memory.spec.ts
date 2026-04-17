import { test, expect } from "../fixtures/api";

test.describe("Memory page", () => {
  test("renders search UI + status bar", async ({ page }) => {
    await page.goto("/memory");
    await expect(page.getByRole("heading", { name: "Memory Search" })).toBeVisible();

    // Status bar (requires stats loaded)
    await expect(page.getByText(/청크$|청크\s/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("all-MiniLM-L6-v2 (384d)", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /문서 인제스트/ })).toBeVisible();
  });

  test("search returns results", async ({ page, be, project }) => {
    // Ensure ingest has run
    await be.post("/api/v1/memories/ingest", { data: { project_id: project.id } });

    await page.goto("/memory");
    const input = page.getByPlaceholder(/자연어로 검색하세요/);
    await input.fill("memory");
    await page.getByRole("button", { name: /^검색$/ }).click();

    // Result counter shows
    await expect(page.getByText(/\d+개 결과 — 검색어:/)).toBeVisible({ timeout: 15_000 });
  });

  test("Wing filter '전체' button renders", async ({ page }) => {
    await page.goto("/memory");
    await expect(page.getByRole("button", { name: "전체", exact: true })).toBeVisible({ timeout: 10_000 });
  });
});
