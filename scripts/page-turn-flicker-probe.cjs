// Reproduces the page-turn stale-content/blank-flash flicker locally.
//
// The existing Playwright tests only vary CSS viewport size while
// deviceScaleFactor stays fixed (2, from playwright.config.js) — so the
// "3840x2160" test is really a giant desktop-sized viewport at 2x, not a
// realistic high-DPR phone screen. This script instead uses a real phone-sized
// viewport at a higher deviceScaleFactor (closer to a real flagship device)
// plus actual CDP-dispatched touch events, and captures every composited
// frame via CDP screencast so a real one-frame compositor glitch can be
// caught even though it never shows up in DOM/style assertions.
//
// Usage:
//   node --require ./scripts/playwright-openharmony.cjs ./scripts/page-turn-flicker-probe.cjs <outDir> [flips] [deviceScaleFactor]
//
// Requires the dev server running at http://127.0.0.1:4173 (npm run dev / vite).
// Pair with page-turn-flicker-diff.py to find the glitch frame automatically.

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { readFileSync } = require('fs');
const { homedir } = require('os');
const { join } = require('path');

const ohosConfigPath = join(homedir(), '.playwright-ohos', 'mcp-config.json');
let launchOptions = { headless: true, args: ['--no-sandbox'] };
if (fs.existsSync(ohosConfigPath)) {
  const ohosConfig = JSON.parse(readFileSync(ohosConfigPath, 'utf8'));
  Object.assign(process.env, ohosConfig.env);
  const executableIndex = ohosConfig.args.indexOf('--executable-path');
  if (executableIndex >= 0) launchOptions.executablePath = ohosConfig.args[executableIndex + 1];
}

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', 'test-results', 'page-turn-flicker-probe');
const FLIPS = Number(process.argv[3] || 4);
const DSF = Number(process.argv[4] || 3.5);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: DSF,
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN',
    colorScheme: 'light'
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('.page');

  const cdp = await context.newCDPSession(page);
  let frameCount = 0;
  cdp.on('Page.screencastFrame', async (evt) => {
    const idx = ++frameCount;
    fs.writeFileSync(path.join(OUT_DIR, `f_${String(idx).padStart(4, '0')}.png`), Buffer.from(evt.data, 'base64'));
    await cdp.send('Page.screencastFrameAck', { sessionId: evt.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

  await page.waitForTimeout(400); // let initial prewarm settle

  const pageBox = await page.locator('.page').boundingBox();
  const startX = pageBox.x + pageBox.width - 5;
  const endX = pageBox.x + 5;
  const y = pageBox.y + pageBox.height * 0.35;

  for (let i = 0; i < FLIPS; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
    const steps = 14;
    for (let s = 1; s <= steps; s++) {
      const x = startX + ((endX - startX) * s) / steps;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(900); // let the flip settle + next prewarm fire
  }
  await page.waitForTimeout(1500); // capture the idle window too

  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();

  console.log(`captured ${frameCount} frames to ${OUT_DIR}`);
  console.log(`next: python3 scripts/page-turn-flicker-diff.py ${OUT_DIR}`);
})().catch(err => { console.error(err); process.exit(1); });
