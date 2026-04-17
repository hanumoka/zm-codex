import { test, expect } from "../fixtures/api";

test.describe("Documents page", () => {
  test("renders tree + selects first file", async ({ page }) => {
    await page.goto("/documents");

    await expect(page.getByRole("heading", { name: "Document Explorer" })).toBeVisible();

    // Wait for tree to populate (look for at least one folder or file label)
    await page.waitForLoadState("networkidle");

    // Root entries we expect: .claude, backend, docs, frontend at minimum
    await expect(page.getByText(".claude").first()).toBeVisible({ timeout: 10_000 });

    // Expand .claude folder (click the row)
    await page.getByText(".claude").first().click();

    // Select a known file — CLAUDE.md at root is reliable
    const claudeMd = page.getByText("CLAUDE.md", { exact: true }).first();
    if (await claudeMd.count() > 0) {
      await claudeMd.click();
      // File title appears in right panel as <h2>
      await expect(page.getByRole("heading", { name: "CLAUDE.md", level: 2 })).toBeVisible({ timeout: 10_000 });
    }
  });
});
