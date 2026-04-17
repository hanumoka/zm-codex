import { test, expect } from "../fixtures/api";

test.describe("Watcher page", () => {
  test("renders heading + control button + status cards", async ({ page, be, project }) => {
    // Ensure watcher is stopped for deterministic initial state
    await be.post("/api/v1/watcher/stop", { data: { project_id: project.id } });

    await page.goto("/watcher");
    await expect(page.getByRole("heading", { name: "File Watcher" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "실시간 변경 피드" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "드리프트 감지" })).toBeVisible();

    // Stop-state button should read "감시 시작"
    await expect(page.getByRole("button", { name: /감시 시작/ })).toBeVisible();
  });

  test("start → status flips → stop", async ({ page, be, project }) => {
    await be.post("/api/v1/watcher/stop", { data: { project_id: project.id } });
    await page.goto("/watcher");

    const startBtn = page.getByRole("button", { name: /감시 시작/ });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    // Button flips to 감시 중지
    await expect(page.getByRole("button", { name: /감시 중지/ })).toBeVisible({ timeout: 10_000 });

    // Click stop
    await page.getByRole("button", { name: /감시 중지/ }).click();
    await expect(page.getByRole("button", { name: /감시 시작/ })).toBeVisible({ timeout: 10_000 });
  });
});
