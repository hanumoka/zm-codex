import { test, expect } from "../fixtures/api";

test.describe("Changes page", () => {
  test("renders heading and timeline", async ({ page }) => {
    await page.goto("/changes");
    await expect(page.getByRole("heading", { name: "Change Tracker" })).toBeVisible({ timeout: 10_000 });
    // Either "변경 이력이 없습니다" empty state or timeline badge text (COMMIT/DOC/HOOK/OTHER)
    const empty = page.getByText("변경 이력이 없습니다");
    const badge = page.getByText(/^(COMMIT|DOC|HOOK|OTHER)$/).first();
    await expect.poll(
      async () => (await empty.count()) > 0 || (await badge.count()) > 0,
      { timeout: 15_000 }
    ).toBe(true);
  });

  test("at least one commit entry renders with hash", async ({ page, be, project }) => {
    // Trigger link detection to ensure timeline has commits
    await be.post(`/api/v1/projects/${project.id}/links/detect?since_commits=5`);

    await page.goto("/changes");
    await page.waitForLoadState("networkidle");

    // There should be at least one commit entry — match 7-char hex hash pattern
    const hashPattern = /^[0-9a-f]{7}$/;
    const spans = page.locator("span.font-mono");
    const count = await spans.count();
    let foundHash = false;
    for (let i = 0; i < count; i++) {
      const text = (await spans.nth(i).textContent())?.trim();
      if (text && hashPattern.test(text)) { foundHash = true; break; }
    }
    expect(foundHash, "Expected at least one 7-char commit hash").toBe(true);
  });
});
