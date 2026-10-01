import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { ...devices["Pixel 7"], baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
