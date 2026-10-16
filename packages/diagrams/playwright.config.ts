import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, defineConfig, devices } from '@playwright/test';

function resolveChromiumExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  try {
    const defaultPath = chromium.executablePath();
    if (defaultPath && fs.existsSync(defaultPath)) {
      return undefined;
    }
  } catch {
    // Fall through to cache lookup
  }

  const cacheDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cacheDir)) return undefined;

  const shellDirs = fs
    .readdirSync(cacheDir)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort()
    .reverse();

  for (const dir of shellDirs) {
    const candidate = path.join(
      cacheDir,
      dir,
      'chrome-headless-shell-linux64',
      'chrome-headless-shell',
    );
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

const executablePath = resolveChromiumExecutable();
const launchOptions = executablePath ? { executablePath } : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    launchOptions,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions,
      },
    },
  ],
});
