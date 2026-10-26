import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: process.env.QA_FULL === "1" ? "." : "./tests-qa",
  testMatch:
    process.env.QA_FULL === "1"
      ? ["**/tests-qa/*.spec.ts", "**/tests-v2/*.spec.ts"]
      : ["**/*.spec.ts"],
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 20000 },
  use: {
    baseURL: process.env.QA_WEB || "https://maolr3612-boop.github.io",
    headless: true,
    channel: "msedge",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    proxy: process.env.QA_PROXY
      ? { server: process.env.QA_PROXY, bypass: "127.0.0.1,localhost" }
      : undefined,
    launchOptions: {
      proxy: process.env.QA_PROXY
        ? { server: process.env.QA_PROXY, bypass: "127.0.0.1,localhost" }
        : undefined,
    },
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-qa" }],
  ],
});
