import { defineConfig, devices } from "@playwright/test";
import { BACKEND_ENV, BACKEND_PORT, BACKEND_URL, FRONTEND_ENV, FRONTEND_PORT, FRONTEND_URL } from "./e2e/stack.mjs";

/**
 * End-to-end tests (plan §13). Run them with `npm run e2e` from the repository root: that
 * script seeds a fresh database and builds the frontend first, then Playwright starts the
 * two servers below, runs the tests in a real browser and stops the servers.
 *
 * One worker: the tests share one database and sign in and out of the same accounts.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    {
      name: "chromium",
      // The window of the captures (docs/parity-notes.md).
      use: { ...devices["Desktop Chrome"], viewport: { width: 1521, height: 695 } },
    },
  ],
  webServer: [
    {
      command: `node ../scripts/uv.mjs run uvicorn app.main:create_app --factory --port ${BACKEND_PORT}`,
      url: `${BACKEND_URL}/api/health`,
      env: BACKEND_ENV,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx next start --port ${FRONTEND_PORT}`,
      url: FRONTEND_URL,
      env: FRONTEND_ENV,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
