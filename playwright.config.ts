import { defineConfig } from '@playwright/test'

const basePath = process.env.BASE_PATH ?? '/pechatnaya-plata/'
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const baseURL = `http://127.0.0.1:${port}${basePath}`
const executablePath = process.env.CHROME_PATH

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 2560, height: 1600 },
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `BASE_PATH=${basePath} bun run build && BASE_PATH=${basePath} bun run preview -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
