import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

const ohosHome = process.env.PLAYWRIGHT_OHOS_HOME || join(homedir(), '.playwright-ohos');
const ohosConfigPath = join(ohosHome, 'mcp-config.json');
const launchOptions = {};

if (existsSync(ohosConfigPath)) {
  const ohosConfig = JSON.parse(readFileSync(ohosConfigPath, 'utf8'));
  Object.assign(process.env, ohosConfig.env);
  const executableIndex = ohosConfig.args.indexOf('--executable-path');
  if (executableIndex >= 0) launchOptions.executablePath = ohosConfig.args[executableIndex + 1];
  launchOptions.args = ['--no-sandbox'];
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN',
    colorScheme: 'light',
    launchOptions
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
