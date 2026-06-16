import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const lines = readFileSync(resolve(__dirname, '../backend/.env'), 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'off',
    actionTimeout: 15000,
  },
  outputDir: './e2e/test-results',
  globalSetup: './e2e/global-setup.js',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev --prefix ../backend',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        FRONTEND_URL: 'http://localhost:5173',
        AUTH_RATE_LIMIT_MAX: '1000',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173/QRypticRx/',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        VITE_API_URL: 'http://localhost:3000',
      },
    },
  ],
});
