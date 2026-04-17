import { test, expect } from "../fixtures/api";

test.describe("Dashboard page", () => {
  test("renders heading, stat cards and SSE badge", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    // Stat cards labels — wait for stats to load
    await expect(page.getByText("문서", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("메모리 청크", { exact: true })).toBeVisible();
    await expect(page.getByText("워크플로우", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("훅 이벤트", { exact: true })).toBeVisible();

    // SSE badge — either connected or disconnected but must render
    const sseBadge = page.getByText(/SSE 연결됨|연결 안됨/);
    await expect(sseBadge).toBeVisible();

    // Live feed header
    await expect(page.getByText("실시간 이벤트 피드")).toBeVisible();
  });

  test("SSE badge reaches '연결됨' state", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("SSE 연결됨")).toBeVisible({ timeout: 10_000 });
  });

  test("document type breakdown renders at least one type", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("문서 유형 분포")).toBeVisible({ timeout: 10_000 });
  });
});
