import { test, expect } from "../fixtures/api";
import { e2eTitle } from "../utils/cleanup";

async function createWfWithNodes(
  be: import("@playwright/test").APIRequestContext,
  projectId: string,
  name: string,
): Promise<string> {
  const r = await be.post("/api/v1/workflows", {
    data: {
      project_id: projectId,
      name,
      workflow_type: "custom",
      nodes: [
        { id: "n1", label: "start", type: "start", position: { x: 0, y: 0 } },
        { id: "n2", label: "step", type: "step", position: { x: 120, y: 0 } },
        { id: "n3", label: "end", type: "end", position: { x: 240, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  });
  return (await r.json()).id as string;
}

test.describe("Workflow instance UI", () => {
  test("create + advance: '+ 인스턴스' → 제목 입력 → 생성 후 카드 노출, 펼쳐서 현재 노드 이동", async ({
    page,
    be,
    project,
  }) => {
    const name = e2eTitle("inst-wf");
    const title = e2eTitle("inst");
    const wfId = await createWfWithNodes(be, project.id, name);

    try {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");

      // Ensure the workflow is selected (pill with name)
      const pill = page.getByRole("button", { name: new RegExp(name.replace(/[[\]]/g, "\\$&")) });
      await pill.click();

      // '+ 인스턴스' button in InstancePanel header
      await page.getByRole("button", { name: /\+\s*인스턴스/ }).click();
      await page.getByPlaceholder(/버그 수정 작업/).fill(title);
      await page.getByRole("button", { name: /^\s*생성\s*$/ }).last().click();

      // Card with title should appear
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
      // current_node display "@ n1" (start)
      await expect(page.locator("text=@ n1").first()).toBeVisible();

      // Expand controls: click Chevron (title="펼치기")
      await page.getByTitle("펼치기").first().click();

      // Move to n2 via the current node select
      const nodeSelect = page.locator("select").first();
      await nodeSelect.selectOption("n2");

      // current_node label updates
      await expect(page.locator("text=@ n2").first()).toBeVisible({ timeout: 10_000 });

      // Status 3-way: click "차단" and verify the pill status indicator changes
      await page.getByRole("button", { name: /^\s*차단\s*$/ }).click();
      // amber dot after blocked
      await expect(page.locator(".bg-amber-400").first()).toBeVisible({ timeout: 10_000 });
    } finally {
      // Cleanup: deleting the workflow cascades instances
      await be.delete(`/api/v1/workflows/${wfId}`);
    }
  });

  test("highlight toggle: Radar 클릭 시 pill에 violet ring", async ({ page, be, project }) => {
    const name = e2eTitle("hl-wf");
    const title = e2eTitle("hl-inst");
    const wfId = await createWfWithNodes(be, project.id, name);

    // Pre-create instance via API for speed
    await be.post(`/api/v1/workflows/${wfId}/instances`, {
      data: { workflow_id: wfId, title },
    });

    try {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");

      const pill = page.getByRole("button", { name: new RegExp(name.replace(/[[\]]/g, "\\$&")) });
      await pill.click();

      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

      // Click the Radar (title starts with "파이프라인")
      await page.getByTitle(/파이프라인에 표시|파이프라인 하이라이트 해제/).first().click();

      // The card should now have a violet ring class (ring-violet-500/20)
      await expect(page.locator("[class*='ring-violet-500/20']").first()).toBeVisible({
        timeout: 5_000,
      });
    } finally {
      await be.delete(`/api/v1/workflows/${wfId}`);
    }
  });
});
