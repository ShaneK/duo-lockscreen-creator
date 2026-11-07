import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const baseURL = process.env.PLAYWRIGHT_PRODUCTION_URL ?? 'http://127.0.0.1:43187/';

export default defineConfig({
  ...base,
  testDir: './tests/production',
  testIgnore: [],
  use: { ...base.use, baseURL },
  webServer: {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: true,
  },
});
