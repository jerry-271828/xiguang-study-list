// Diagnoses "page-turn animation stops happening after several swipes".
// For each swipe it records whether the flip animation actually engaged
// (body.page-turn-active observed + host progress advanced) and dumps the
// engine's prepared-state before/after, plus console/page errors.
//
// Usage:
//   node --require ./scripts/playwright-openharmony.cjs <this file> [flips] [pauseMs] [deviceScaleFactor]

const { chromium } = require('@playwright/test');
const fs = require('fs');
const { homedir } = require('os');
const { join } = require('path');

const ohosConfigPath = join(homedir(), '.playwright-ohos', 'mcp-config.json');
let launchOptions = { headless: true, args: ['--no-sandbox'] };
if (fs.existsSync(ohosConfigPath)) {
  const ohosConfig = JSON.parse(fs.readFileSync(ohosConfigPath, 'utf8'));
  Object.assign(process.env, ohosConfig.env);
  const executableIndex = ohosConfig.args.indexOf('--executable-path');
  if (executableIndex >= 0) launchOptions.executablePath = ohosConfig.args[executableIndex + 1];
}

const FLIPS = Number(process.argv[2] || 10);
const PAUSE = Number(process.argv[3] || 1200);
const DSF = Number(process.argv[4] || 3.5);

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
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[console.${msg.type()}] ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('.page');
  await page.waitForTimeout(1500); // initial prewarm

  // Deep instrumentation: log every engine mutation + rasterization step so a
  // silently swallowed exception (or a hung Image decode) becomes visible.
  await page.evaluate(() => {
    window.__prepLog = [];
    const log = (...entry) => {
      window.__prepLog.push([Math.round(performance.now()), ...entry]);
      if (window.__prepLog.length > 400) window.__prepLog.shift();
    };
    const wrap = (obj, name) => {
      const orig = obj[name].bind(obj);
      obj[name] = (...args) => {
        try { const r = orig(...args); log(name, 'ok'); return r; }
        catch (e) { log(name, 'THROW', String((e && e.message) || e)); throw e; }
      };
    };
    const engine = window.__study.getPageTurnEngine();
    if (!engine) { log('NO ENGINE AT INSTRUMENT TIME'); return; }
    ['updateFromImages', 'turnToPage', 'update'].forEach(n => wrap(engine.pageFlip, n));
    wrap(engine.pageFlip.getRender(), 'finishAnimation');
    const OrigImage = window.Image;
    window.Image = function (...a) {
      const img = new OrigImage(...a);
      const id = (window.__imgSeq = (window.__imgSeq || 0) + 1);
      log('Image.new', id);
      img.addEventListener('load', () => log('Image.load', id));
      img.addEventListener('error', e => log('Image.ERROR', id, String(e?.message || 'error')));
      return img;
    };
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...a) {
      try { const r = origToDataURL.apply(this, a); log('toDataURL.ok', r.length); return r; }
      catch (e) { log('toDataURL.THROW', String((e && e.message) || e)); throw e; }
    };
  });

  const cdp = await context.newCDPSession(page);
  const pageBox = await page.locator('.page').boundingBox();
  const startX = pageBox.x + pageBox.width - 5;
  const endX = pageBox.x + 5;
  const y = 300;

  const engineState = () => page.evaluate(() => {
    const e = window.__study.getPageTurnEngine?.();
    const host = document.querySelector('.page-turn-host');
    return {
      hasEngine: Boolean(e),
      preparedDate: e?.preparedDate ?? null,
      currentIndex: e?.currentIndex ?? null,
      dateKeys: e?.dateKeys ?? null,
      contentOffsetY: e?.contentOffsetY ?? null,
      pageTop: document.querySelector('.page')?.getBoundingClientRect().top ?? null,
      hostVisibility: host ? getComputedStyle(host).visibility : null,
      hostDataset: host ? { ...host.dataset } : null,
      title: document.querySelector('.view-title')?.textContent?.trim() ?? null,
      scrollY: window.scrollY
    };
  });

  const results = [];
  for (let i = 0; i < FLIPS; i++) {
    const before = await engineState();
    await page.evaluate(() => {
      window.__diag = { sawActive: false, maxProgress: 0, states: [] };
      const poll = () => {
        if (document.body.classList.contains('page-turn-active')) window.__diag.sawActive = true;
        const host = document.querySelector('.page-turn-host');
        if (host) {
          const p = Number(host.dataset.pageTurnProgress || 0);
          if (p > window.__diag.maxProgress) window.__diag.maxProgress = p;
          const s = host.dataset.pageTurnState;
          if (s && window.__diag.states[window.__diag.states.length - 1] !== s) window.__diag.states.push(s);
        }
        window.__diagRaf = requestAnimationFrame(poll);
      };
      poll();
    });

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
    const steps = 14;
    for (let s = 1; s <= steps; s++) {
      const x = startX + ((endX - startX) * s) / steps;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(PAUSE);

    const diag = await page.evaluate(() => { cancelAnimationFrame(window.__diagRaf); return window.__diag; });
    const after = await engineState();
    const animated = diag.sawActive && diag.maxProgress > 0.05;
    results.push({ flip: i + 1, animated, ...diag, beforePrepared: before.preparedDate, beforeTitle: before.title, afterPrepared: after.preparedDate, afterTitle: after.title, afterIndex: after.currentIndex, contentOffsetY: after.contentOffsetY, pageTop: after.pageTop, scrollY: after.scrollY, hostDataset: after.hostDataset });
    console.log(JSON.stringify(results[results.length - 1]));
  }

  // Recovery check: wait long, then one more swipe — does animation come back?
  await page.waitForTimeout(3000);
  const recoveryBefore = await engineState();
  await page.evaluate(() => {
    window.__diag = { sawActive: false, maxProgress: 0, states: [] };
    const poll = () => {
      if (document.body.classList.contains('page-turn-active')) window.__diag.sawActive = true;
      const host = document.querySelector('.page-turn-host');
      if (host) {
        const p = Number(host.dataset.pageTurnProgress || 0);
        if (p > window.__diag.maxProgress) window.__diag.maxProgress = p;
      }
      window.__diagRaf = requestAnimationFrame(poll);
    };
    poll();
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
  for (let s = 1; s <= 14; s++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + ((endX - startX) * s) / 14, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(1200);
  const recoveryDiag = await page.evaluate(() => { cancelAnimationFrame(window.__diagRaf); return window.__diag; });
  console.log('RECOVERY(after 3s idle): ' + JSON.stringify({ animated: recoveryDiag.sawActive && recoveryDiag.maxProgress > 0.05, ...recoveryDiag, beforePrepared: recoveryBefore.preparedDate }));

  console.log('\nSUMMARY: ' + results.map(r => (r.animated ? 'A' : '.')).join('') + `  (A=animated, .=fallback)  pause=${PAUSE}ms dsf=${DSF}`);
  if (errors.length) console.log('\nERRORS:\n' + errors.join('\n'));
  const prepLog = await page.evaluate(() => window.__prepLog || []);
  console.log('\nPREP LOG (last 150):');
  for (const entry of prepLog.slice(-150)) console.log('  ' + JSON.stringify(entry));
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
