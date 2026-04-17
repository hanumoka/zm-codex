import { defineConfig, devices } from "@playwright/test";

/**
 * zm-codex E2E 설정
 * - FE(30200) 재사용 or 자동 기동
 * - BE(30100) / DB(30432)는 preflight fixture에서 검증 (기동은 사전에 수동)
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:30200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 7_000,
    navigationTimeout: 10_000,
    extraHTTPHeaders: { Accept: "application/json" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:30200",
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
