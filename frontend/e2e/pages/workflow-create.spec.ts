import { test, expect } from "../fixtures/api";
import { e2eTitle } from "../utils/cleanup";

test.describe("Workflow create UI", () => {
  test("template picker: click '생성' → 템플릿으로 생성 → review 선택하면 새 워크플로우 pill 노출", async ({
    page,
    be,
    project,
  }) => {
    // Pre-cleanup: remove any existing review workflow from prior runs
    const list = await (
      await be.get(`/api/v1/workflows?project_id=${project.id}`)
    ).json();
    for (const wf of list) {
      if (wf.workflow_type === "review") {
        await be.delete(`/api/v1/workflows/${wf.id}`);
      }
    }

    await page.goto("/workflows");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /^생성$/ }).click();
    await page.getByRole("button", { name: /템플릿으로 생성/ }).click();

    // Modal — the review card (label is the Korean workflow name, e.g. "리뷰 워크플로우")
    const reviewCard = page.locator("text=review · 4 nodes").first();
    await expect(reviewCard).toBeVisible({ timeout: 10_000 });
    await reviewCard.click();

    // New pill appears with the imported name (contains 워크플로우 typically)
    await expect(page.locator("[class*='border-violet-500/30']")).toBeVisible({ timeout: 10_000 });

    // Cleanup — the created workflow is of type review
    const after = await (
      await be.get(`/api/v1/workflows?project_id=${project.id}`)
    ).json();
    for (const wf of after) {
      if (wf.workflow_type === "review") {
        await be.delete(`/api/v1/workflows/${wf.id}`);
      }
    }
  });

  test("manual create: 직접 입력 모달 → 이름 입력 → 생성 후 pill 노출", async ({
    page,
    be,
    project,
  }) => {
    const name = e2eTitle("create");

    await page.goto("/workflows");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /^생성$/ }).click();
    await page.getByRole("button", { name: /직접 입력/ }).click();

    await page.getByPlaceholder("예: 배포 워크플로우").fill(name);
    await page.getByRole("button", { name: /^\s*생성\s*$/ }).last().click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    // Cleanup via API
    const list = await (
      await be.get(`/api/v1/workflows?project_id=${project.id}`)
    ).json();
    for (const wf of list) {
      if (wf.name === name) await be.delete(`/api/v1/workflows/${wf.id}`);
    }
  });

  test("duplicate name: 수동 생성 시 동명이면 인라인 409 에러", async ({ page, be, project }) => {
    const name = e2eTitle("dup");

    // Pre-create via API
    const created = await be.post("/api/v1/workflows", {
      data: {
        project_id: project.id,
        name,
        workflow_type: "custom",
        nodes: [{ id: "n1", label: "s", type: "start", position: { x: 0, y: 0 } }],
        edges: [],
      },
    });
    const wfId = (await created.json()).id;

    try {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: /^생성$/ }).click();
      await page.getByRole("button", { name: /직접 입력/ }).click();
      await page.getByPlaceholder("예: 배포 워크플로우").fill(name);
      await page.getByRole("button", { name: /^\s*생성\s*$/ }).last().click();

      // Expect an inline error message containing "already exists"
      await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await be.delete(`/api/v1/workflows/${wfId}`);
    }
  });
});
