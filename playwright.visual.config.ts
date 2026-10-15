import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results/visual",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
  },
  snapshotPathTemplate: "{testDir}/../../tmp/visual-baseline/{arg}{ext}",
  reporter: "list",
});
