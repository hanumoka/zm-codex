import { test, expect } from "../fixtures/api";

test.describe("Workflow page", () => {
  test("renders header + view toggles + workflow selector", async ({ page }) => {
    await page.goto("/workflows");
    await expect(page.getByRole("heading", { name: "Workflow Manager" })).toBeVisible();

    // View toggle buttons
    await expect(page.getByRole("button", { name: /파이프라인/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /칸반/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /자동 감지/ })).toBeVisible();
  });

  test("pipeline → kanban toggle works", async ({ page, be, project }) => {
    // Ensure at least one workflow exists so KanbanView renders
    const list = await (await be.get(`/api/v1/workflows?project_id=${project.id}`)).json();
    let cleanupWfId: string | null = null;
    if (!list || list.length === 0) {
      const created = await be.post("/api/v1/workflows", {
        data: {
          project_id: project.id,
          name: "[e2e-kanban-temp]",
          description: "seed for kanban test",
          workflow_type: "custom",
          nodes: [{ id: "n1", label: "start", type: "start", position: { x: 0, y: 0 } }],
          edges: [],
        },
      });
      cleanupWfId = (await created.json()).id;
    }

    try {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: /칸반/ }).click();
      // Kanban view shows "대기", "진행 중", "완료", "실패" as <h3> column headings
      await expect(page.getByRole("heading", { name: "대기" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("heading", { name: /진행\s*중/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "완료" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "실패" })).toBeVisible();

      await page.getByRole("button", { name: /파이프라인/ }).click();
      await expect(page.locator(".react-flow").first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (cleanupWfId) await be.delete(`/api/v1/workflows/${cleanupWfId}`);
    }
  });

  test("auto-detect shows result banner", async ({ page }) => {
    await page.goto("/workflows");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /자동 감지/ }).click();
    await expect(page.getByText(/감지된 워크플로우:/)).toBeVisible({ timeout: 15_000 });
  });
});
