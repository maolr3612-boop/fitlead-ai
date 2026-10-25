import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-v2",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  use: {
    baseURL: process.env.FITLEAD_TEST_WEB || "http://127.0.0.1:3002",
    headless: true,
    channel: process.env.PW_CHANNEL || "msedge",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      proxy: process.env.FITLEAD_BROWSER_PROXY
        ? {
            server: process.env.FITLEAD_BROWSER_PROXY,
            bypass: "127.0.0.1,localhost",
          }
        : undefined,
    },
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-v2" }],
  ],
});
