import { test, expect } from "../fixtures/api";

test.describe("Policies page", () => {
  test("renders header and SSOT info card", async ({ page }) => {
    await page.goto("/policies");
    await expect(page.getByRole("heading", { name: "Policy Registry" })).toBeVisible();
    await expect(page.getByText("정책 레지스트리 (policy-registry.md)")).toBeVisible();
    await expect(page.getByText("SSOT", { exact: true })).toBeVisible();
  });

  test("renders policy content OR not-found message", async ({ page }) => {
    await page.goto("/policies");
    await page.waitForLoadState("networkidle");
    // Either the markdown content renders (we can look for the markdown container) or the not-found block
    const content = page.locator(".markdown-body").first();
    const notFound = page.getByText("policy-registry.md를 찾을 수 없습니다");
    await expect.poll(async () => (await content.count()) > 0 || (await notFound.count()) > 0, { timeout: 10_000 }).toBe(true);
  });
});
