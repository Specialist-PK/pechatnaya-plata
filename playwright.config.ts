import { defineConfig } from '@playwright/test'

const basePath = '/pechatnaya-plata/'
const baseURL = `http://127.0.0.1:4173${basePath}`
const executablePath = process.env.CHROME_PATH

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 1050 },
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `BASE_PATH=${basePath} bun run build && BASE_PATH=${basePath} bun run preview -- --port 4173`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
