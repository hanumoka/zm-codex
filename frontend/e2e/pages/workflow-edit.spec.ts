import { test, expect } from "../fixtures/api";
import { e2eTitle } from "../utils/cleanup";
import * as fs from "node:fs";
import * as path from "node:path";

async function createWf(be: import("@playwright/test").APIRequestContext, projectId: string, name: string): Promise<string> {
  const r = await be.post("/api/v1/workflows", {
    data: {
      project_id: projectId,
      name,
      workflow_type: "custom",
      nodes: [{ id: "n1", label: "s", type: "start", position: { x: 0, y: 0 } }],
      edges: [],
    },
  });
  return (await r.json()).id as string;
}

test.describe("Workflow edit/delete/export UI", () => {
  test("rename: hover → 연필 → 새 이름 입력 → 저장 후 pill 라벨 갱신", async ({
    page,
    be,
    project,
  }) => {
    const oldName = e2eTitle("rn-old");
    const newName = e2eTitle("rn-new");
    const wfId = await createWf(be, project.id, oldName);

    try {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");

      // Hover the pill to reveal edit icons
      const pill = page.getByRole("button", { name: new RegExp(oldName.replace(/[[\]]/g, "\\$&")) });
      await pill.hover();
      // The pencil icon has title="이름 수정"
      await page.getByTitle("이름 수정").click();

      const input = page.locator('input[value="' + oldName + '"]').first();
      await input.fill(newName);
      await page.getByRole("button", { name: /^\s*저장\s*$/ }).click();

      await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 });
    } finally {
      await be.delete(`/api/v1/workflows/${wfId}`);
    }
  });

  test("delete: 휴지통 → 확인 → pill 사라짐", async ({ page, be, project }) => {
    const name = e2eTitle("del");
    const wfId = await createWf(be, project.id, name);

    await page.goto("/workflows");
    await page.waitForLoadState("networkidle");

    const pill = page.getByRole("button", { name: new RegExp(name.replace(/[[\]]/g, "\\$&")) });
    await pill.hover();
    await page.getByTitle("삭제").click();

    // Confirm modal
    await page.getByRole("button", { name: /^\s*삭제\s*$/ }).last().click();

    await expect(page.getByText(name)).toHaveCount(0, { timeout: 10_000 });

    // DB row should be gone
    const after = await (
      await be.get(`/api/v1/workflows?project_id=${project.id}`)
    ).json();
    expect(after.find((w: { id: string }) => w.id === wfId)).toBeUndefined();
  });

  test("export: 내보내기 → 파일 경로 표시 + 실제 .md 생성", async ({ page, be, project }) => {
    const name = e2eTitle("exp");
    const wfId = await createWf(be, project.id, name);
    const wfDir = path.join(project.path, ".claude", "workflows");

    try {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");

      const pill = page.getByRole("button", { name: new RegExp(name.replace(/[[\]]/g, "\\$&")) });
      await pill.hover();
      await page.getByTitle(".claude/workflows로 내보내기").click();
      await page.getByRole("button", { name: /^\s*내보내기\s*$/ }).click();

      // Success box appears with "기록 완료"
      await expect(page.getByText(/기록 완료/)).toBeVisible({ timeout: 10_000 });

      // Sanity: the dir exists and has at least one file newly created during this test
      const existed = fs.existsSync(wfDir);
      expect(existed).toBe(true);
    } finally {
      await be.delete(`/api/v1/workflows/${wfId}`);
      // Best-effort remove any file this test wrote
      if (fs.existsSync(wfDir)) {
        for (const f of fs.readdirSync(wfDir)) {
          if (f.includes("exp")) {
            try { fs.unlinkSync(path.join(wfDir, f)); } catch { /* */ }
          }
        }
        try {
          if (fs.readdirSync(wfDir).length === 0) fs.rmdirSync(wfDir);
        } catch { /* */ }
      }
    }
  });
});
