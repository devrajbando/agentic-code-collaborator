import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load your test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './e2e',
  workers: 2, // Keep workers low (1 or 2) to prevent ERR_INSUFFICIENT_RESOURCES
  fullyParallel: false,

  use: {
    baseURL: 'http://localhost:5173', // Your frontend URL
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Run both backend and frontend servers automatically */
  // webServer: [
  //   {
  //     command: 'npm run dev:server',
  //     url: 'http://localhost:4000', // Update if your server runs on a different port
  //     reuseExistingServer: true,
  //     timeout: 120 * 1000,
  //   },
  //   {
  //     command: 'npm run dev:frontend',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: true,
  //     timeout: 120 * 1000,
  //   },
  // ],

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { 
      name: 'chromium', 
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' }, 
      dependencies: ['setup'] 
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup']
    },
  ],
});