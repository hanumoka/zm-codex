import { test, expect } from "../fixtures/api";

test.describe("Config page", () => {
  test("renders heading + .claude/ summary + 템플릿 생성 버튼", async ({ page }) => {
    await page.goto("/config");
    await expect(page.getByRole("heading", { name: "Config Sync", exact: true })).toBeVisible();
    await expect(page.getByText(".claude/ 디렉토리")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /템플릿 생성/ })).toBeVisible();
  });

  test("템플릿 생성 버튼 클릭 시 summary 배너 노출", async ({ page }) => {
    await page.goto("/config");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /템플릿 생성/ }).click();
    await expect(page.getByText("생성된 템플릿")).toBeVisible({ timeout: 10_000 });
  });
});
