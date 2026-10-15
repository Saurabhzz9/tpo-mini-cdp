import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/release",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
