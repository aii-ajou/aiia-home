import { defineConfig, devices } from "@playwright/test";
const base = process.env.AIIA_TEST_BASE_PATH || "";
const server = `http://127.0.0.1:${process.env.AIIA_TEST_PORT || 4325}`;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: process.env.AIIA_TEST_URL || server + base + "/",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: process.env.AIIA_TEST_URL
    ? undefined
    : {
        command:
          "npm run build && npm run verify:build && node scripts/serve-built.mjs",
        url: server + base + "/",
        reuseExistingServer: false,
      },
});
