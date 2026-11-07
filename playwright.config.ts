import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:43188';

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/production/**',
  fullyParallel: true,
  workers: 4,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'webkit', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
  webServer: {
    command: `npm run dev -- --port ${new URL(baseURL).port || '43187'}`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
