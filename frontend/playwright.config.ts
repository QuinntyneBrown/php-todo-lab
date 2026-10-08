import { defineConfig, devices } from '@playwright/test';

// Core flows run at every width named in L2-052 criterion 3; the other checks
// (layout, accessibility, theme, motion) set their own viewports.
const widths = [360, 576, 768, 992, 1280];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    ...widths.map((width) => ({
      name: `flows-${String(width)}`,
      testMatch: 'core-flows.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width, height: 900 } },
    })),
    {
      name: 'checks',
      testIgnore: ['core-flows.spec.ts', 'full-stack.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      // Against the real API: start the backend first, then run with E2E_FULL_STACK=1.
      name: 'full-stack',
      testMatch: 'full-stack.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
