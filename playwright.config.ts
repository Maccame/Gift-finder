import { defineConfig, devices } from "@playwright/test";

// Les appels /api/* sont toujours interceptés par les tests (tests/e2e/helpers/mock-api.ts) :
// aucun test n'appelle l'API payante ni la base D1.
export default defineConfig({
  testDir: "tests/e2e",
  // Sous-dossier : Playwright vide outputDir au démarrage, test-results/vitest.json doit survivre.
  outputDir: "test-results/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "test-results/playwright.json" }]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
  ],
});
