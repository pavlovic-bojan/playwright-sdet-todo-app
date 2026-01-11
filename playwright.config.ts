import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Load .env file if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch (e) {
  // dotenv not installed, environment variables will come from system env
}

/**
 * Shared test configuration
 */
export const testConfig = {
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 20000,
    modal: 15000,
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: parseInt(process.env.TIMEOUT || '30000', 10),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests */
  retries: process.env.CI ? 2 : 1,
  /* Number of workers for parallel test execution */
  workers: process.env.CI ? 5 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: testConfig.baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Action timeout - how long to wait for action to complete */
    actionTimeout: testConfig.timeouts.medium,
    
    /* Navigation timeout - how long to wait for navigation */
    navigationTimeout: testConfig.timeouts.long,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'api',
      testMatch: /.*\/api\/.*\.spec\.ts/,
      retries: process.env.CI ? 2 : 2, // More retries for API tests due to transient server errors
    },
    {
      name: 'e2e-chromium',
      testMatch: /.*\/e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'e2e-firefox',
      testMatch: /.*\/e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'e2e-webkit',
      testMatch: /.*\/e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});