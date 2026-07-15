import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('does not replace untouched tasks when one status changes', async ({ page }) => {
  await page.evaluate(() => {
    window.__untouchedTask = document.querySelector('[data-task-index="1"]');
  });

  await page.locator('[data-status-index="0"]').click();

  await expect(page.locator('[data-task-index="0"]')).toHaveClass(/done/);
  expect(await page.evaluate(() => window.__untouchedTask === document.querySelector('[data-task-index="1"]'))).toBe(true);
});

test('keeps the day DOM stable while toggling the menu and quote favorite', async ({ page }) => {
  await page.evaluate(() => {
    window.__stableTask = document.querySelector('[data-task-index="0"]');
  });

  await page.locator('[data-action="menu"]').click();
  await expect(page.locator('.menu-sheet')).toHaveClass(/is-open/);
  expect(await page.evaluate(() => window.__stableTask === document.querySelector('[data-task-index="0"]'))).toBe(true);

  await page.locator('.menu-head [data-action="close-menu"]').click();
  await page.locator('[data-action="like"]').click();
  await expect(page.locator('[data-action="like"]')).toHaveClass(/is-liked/);
  expect(await page.evaluate(() => window.__stableTask === document.querySelector('[data-task-index="0"]'))).toBe(true);
});

test('keeps missed task geometry inside the original row', async ({ page }) => {
  const task = page.locator('[data-task-index="0"]');
  const initial = await task.boundingBox();

  await page.locator('[data-status-index="0"]').click();
  await page.locator('[data-status-index="0"]').click();
  await expect(task).toHaveClass(/missed/);
  await page.waitForTimeout(450);
  const missed = await task.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      width: rect.width,
      height: rect.height,
      borderRadius: getComputedStyle(element).borderRadius
    };
  });

  expect(Math.abs(missed.x - initial.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(missed.width - initial.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(missed.height - initial.height)).toBeLessThanOrEqual(0.5);
  expect(missed.borderRadius).toBe('0px');
});

test('grows editable task lines, wraps with repeated rules, and centers row controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const input = page.locator('[data-extra-index="3"]');
  const task = page.locator('[data-task-index="3"]');
  const initialInput = await input.boundingBox();

  await input.fill('disjffnvidsfb');
  const shortInput = await input.boundingBox();
  expect(shortInput.width).toBeGreaterThan(initialInput.width);
  expect(Math.abs(shortInput.height - initialInput.height)).toBeLessThanOrEqual(1);

  let wrapLength = 1;
  for (; wrapLength <= 80; wrapLength += 1) {
    await input.fill('测'.repeat(wrapLength));
    if (await task.locator('.line-input-rule').count() > 1) break;
  }
  expect(wrapLength).toBeLessThanOrEqual(80);
  const justWrappedWidths = await task.locator('.line-input-rule').evaluateAll(rules => rules.map(rule => rule.getBoundingClientRect().width));
  expect(justWrappedWidths).toHaveLength(2);
  expect(justWrappedWidths[1]).toBeLessThan(justWrappedWidths[0] / 2);

  await input.fill('测'.repeat(wrapLength + 4));
  const grownSecondLineWidths = await task.locator('.line-input-rule').evaluateAll(rules => rules.map(rule => rule.getBoundingClientRect().width));
  expect(grownSecondLineWidths).toHaveLength(2);
  expect(grownSecondLineWidths[1]).toBeGreaterThan(justWrappedWidths[1] + 10);

  await input.fill('这是一段需要在达到一行上限之后自动换行并继续显示新横线的待办事项内容'.repeat(3));
  const metrics = await task.evaluate(element => {
    const inputElement = element.querySelector('.line-input');
    const content = element.querySelector('.task-content');
    const number = element.querySelector('.task-number');
    const button = element.querySelector('.status-button');
    const taskRect = element.getBoundingClientRect();
    const inputRect = inputElement.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const numberRect = number.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const taskCenter = taskRect.top + taskRect.height / 2;
    return {
      inputHeight: inputRect.height,
      inputRight: inputRect.right,
      contentRight: contentRect.right,
      scrollHeight: inputElement.scrollHeight,
      clientHeight: inputElement.clientHeight,
      taskHeight: taskRect.height,
      numberCenterDelta: Math.abs(numberRect.top + numberRect.height / 2 - taskCenter),
      buttonCenterDelta: Math.abs(buttonRect.top + buttonRect.height / 2 - taskCenter),
      ruleWidths: [...element.querySelectorAll('.line-input-rule')].map(rule => rule.getBoundingClientRect().width)
    };
  });

  expect(metrics.inputHeight).toBeGreaterThan(shortInput.height * 2);
  expect(metrics.taskHeight).toBeGreaterThan(58);
  expect(metrics.inputRight).toBeLessThanOrEqual(metrics.contentRight + 0.5);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  expect(metrics.numberCenterDelta).toBeLessThanOrEqual(0.5);
  expect(metrics.buttonCenterDelta).toBeLessThanOrEqual(0.5);
  expect(metrics.ruleWidths.length).toBeGreaterThan(2);

  for (let turn = 0; turn < 6; turn += 1) {
    await input.fill('短');
    await input.fill('循环输入用于确认横线节点不会持续累积'.repeat(4));
  }
  await input.fill('短');
  expect(await task.locator('.line-input-rule').count()).toBe(1);
  expect(await page.locator('[data-line-input-measure]').count()).toBe(2);
  expect(await page.locator('[data-line-input-measure]').evaluateAll(elements => elements.every(element => element.textContent === ''))).toBe(true);
});

test('keeps the page canvas anchored during rapid mobile paging', async ({ page }) => {
  const samples = [];
  for (let turn = 0; turn < 5; turn += 1) {
    await page.locator('[data-action="next-day"]').click();
    samples.push(...await page.evaluate(async () => {
      const frames = [];
      for (let frame = 0; frame < 4; frame += 1) {
        await new Promise(requestAnimationFrame);
        const pageElement = document.querySelector('#app > .page');
        const rect = pageElement.getBoundingClientRect();
        frames.push({
          left: rect.left,
          right: rect.right,
          width: rect.width,
          viewport: innerWidth,
          transform: getComputedStyle(pageElement).transform
        });
      }
      return frames;
    }));
  }

  for (const frame of samples) {
    expect(Math.abs(frame.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(frame.right - frame.viewport)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(frame.width - frame.viewport)).toBeLessThanOrEqual(0.5);
    expect(frame.transform).toBe('none');
  }
  await expect(page.locator('.page-turn-host')).toHaveCount(1);
});

test('uses StPageFlip while the live page stays fixed', async ({ page }) => {
  await page.locator('[data-action="next-day"]').click();

  const turnState = await page.evaluate(() => {
    const element = document.querySelector('[data-page-turn="next"]');
    return {
      attached: Boolean(element),
      model: element?.dataset.pageTurnModel,
      pointerEvents: element ? getComputedStyle(element).pointerEvents : null
    };
  });
  expect(turnState).toEqual({ attached: true, model: 'st-page-flip', pointerEvents: 'none' });

  const geometry = await page.locator('#app > .page').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewport: innerWidth,
      transform: getComputedStyle(element).transform
    };
  });
  expect(Math.abs(geometry.left)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(geometry.right - geometry.viewport)).toBeLessThanOrEqual(0.5);
  expect(geometry.transform).toBe('none');
  await expect(page.locator('.date-heading strong')).toHaveText('07 / 14');
  const runningFiniteAnimations = await page.locator('#app > .page').evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.effect.getTiming().iterations !== Infinity && animation.playState === 'running')
    .map(animation => animation.animationName));
  expect(runningFiniteAnimations).toEqual([]);
});

test('preserves the live typography roles in page-turn snapshots', async ({ page }) => {
  const fontState = await page.evaluate(() => window.__study.getPageTurnFontState());

  expect(fontState.forcesUniversalFont).toBe(false);
  expect(fontState.serifStack).toContain('Noto Serif SC');
  expect(fontState.sansStack).toContain('Urbanist');
  const fontFamilies = value => value.split(',').map(family => family.trim().replace(/^['"]|['"]$/g, ''));
  expect(fontFamilies(fontState.dateFamily)).toEqual(fontFamilies(fontState.numericStack));
  expect(fontState.dateFamily).not.toContain('Urbanist');

  const numericRoles = await page.locator('#app > .page').evaluate(element => {
    const selectors = ['.date-heading strong', '.task-number', '.task-content'];
    return selectors.map(selector => getComputedStyle(element.querySelector(selector)).fontFamily);
  });
  expect(numericRoles.every(family => fontFamilies(family)[0] === 'Xiguang Numerals')).toBe(true);

  await page.waitForTimeout(500);
  await expect(page.locator('.page-turn-host')).toHaveAttribute(
    'data-page-turn-font-mode',
    /^(role-preserving-fallback|embedded-webfonts)$/
  );
});

test('keeps responsive quote size in page-turn rasters', async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 452 });
  await page.reload();
  await page.waitForFunction(() => window.__study.isPageTurnReady());

  const metrics = await page.evaluate(() => {
    const quoteText = document.querySelector('#app > .page .quote > span:nth-child(2)');
    const range = document.createRange();
    range.selectNodeContents(quoteText);
    const liveRect = range.getBoundingClientRect();
    const engine = window.__study.getPageTurnEngine();
    const image = engine.pageFlip.getPageCollection().getPage(engine.currentIndex).image;
    const canvas = document.createElement('canvas');
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, innerWidth, innerHeight);

    const startX = Math.floor(liveRect.left);
    const startY = Math.floor(liveRect.top);
    const width = Math.ceil(liveRect.right) - startX;
    const height = Math.ceil(liveRect.bottom) - startY;
    const pixels = context.getImageData(startX, startY, width, height).data;
    let firstInkX = width;
    let lastInkX = -1;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset] + pixels[offset + 1] + pixels[offset + 2] >= 360) continue;
      const pixelX = (offset / 4) % width;
      firstInkX = Math.min(firstInkX, pixelX);
      lastInkX = Math.max(lastInkX, pixelX);
    }
    return {
      liveFontSize: getComputedStyle(quoteText).fontSize,
      liveWidth: liveRect.width,
      rasterInkWidth: lastInkX - firstInkX + 1
    };
  });

  expect(metrics.liveFontSize).toBe('17px');
  expect(metrics.rasterInkWidth / metrics.liveWidth).toBeGreaterThan(.9);
});

test('draws mirrored muted content on the paper backside', async ({ page }) => {
  await page.waitForFunction(() => {
    const engine = window.__study.getPageTurnEngine();
    const current = engine?.pageFlip.getPageCollection().getPage(engine.currentIndex);
    return current?.image?.complete && current?.pageTurnBacksideStyle;
  });

  const faces = await page.evaluate(() => {
    const engine = window.__study.getPageTurnEngine();
    const current = engine.pageFlip.getPageCollection().getPage(engine.currentIndex);
    return {
      mirrored: current.pageTurnBacksideStyle.mirrored,
      opacity: current.pageTurnBacksideStyle.opacity,
      paperColor: current.pageTurnBacksideStyle.paperColor
    };
  });

  expect(faces.mirrored).toBe(true);
  expect(faces.opacity).toBeLessThan(.3);
  expect(faces.paperColor).toBe('#f6f3eb');

  const drewBackside = await page.evaluate(() => new Promise(resolve => {
    const engine = window.__study.getPageTurnEngine();
    const current = engine.pageFlip.getPageCollection().getPage(engine.currentIndex);
    const initialDrawCount = current.pageTurnBacksideDrawCount;
    const target = document.querySelector('#app');
    const touch = x => new Touch({ identifier: 30, target, clientX: x, clientY: 430 });
    const start = touch(350);
    const move = touch(165);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
    requestAnimationFrame(() => resolve(current.pageTurnBacksideActive && current.pageTurnBacksideDrawCount > initialDrawCount));
  }));

  expect(drewBackside).toBe(true);
});

test('hides the fixed spine shadow at the left viewport edge', async ({ page }) => {
  await page.waitForFunction(() => window.__study.isPageTurnReady());
  const render = await page.evaluate(() => {
    const engine = window.__study.getPageTurnEngine();
    const pageRender = engine.pageFlip.getRender();
    return {
      spineShadowHidden: pageRender.pageTurnSpineShadowHidden,
      drawBookShadowSource: String(pageRender.drawBookShadow)
    };
  });

  expect(render.spineShadowHidden).toBe(true);
  expect(render.drawBookShadowSource).toContain('=> {}');
});

// The old HTML-mode tests for clip-path transitions, z-index ordering and
// mask handoff remain obsolete: Canvas mode has no corresponding DOM layers.

test('keeps next-day INP below 150ms with 4x CPU throttling', async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__interactionDurations = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) window.__interactionDurations.push(entry.duration);
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 0 });
  });

  let durations;
  try {
    await page.reload();
    await page.waitForTimeout(500);
    await page.locator('[data-action="next-day"]').click();
    await page.waitForTimeout(800);
    durations = await page.evaluate(() => window.__interactionDurations);
  } finally {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }

  expect(durations.length).toBeGreaterThan(0);
  expect(Math.max(...durations)).toBeLessThan(150);
});

test('keeps the previous-page animation between different day layouts', async ({ page }) => {
  await page.locator('[data-action="menu"]').click();
  await page.getByRole('button', { name: /月视图/ }).click();
  await page.locator('[data-date="2026-07-18"]').click();
  await expect(page.locator('.date-heading strong')).toHaveText('07 / 18');

  await page.locator('[data-action="prev-day"]').click();
  await page.waitForFunction(() => ['user_fold', 'flipping'].includes(
    document.querySelector('.page-turn-host')?.dataset.pageTurnState
  ));
  await expect(page.locator('.date-heading strong')).toHaveText('07 / 17');
  await expect(page.locator('.page-turn-host')).toBeHidden();
});

test('keeps both swipe directions animated from the Saturday layout', async ({ page }) => {
  const openSaturday = async () => {
    await page.locator('[data-action="menu"]').click();
    await page.getByRole('button', { name: /月视图/ }).click();
    await page.locator('[data-date="2026-07-18"]').click();
    await expect(page.locator('.date-heading strong')).toHaveText('07 / 18');
    // Rasterizing the flip overlay's page bitmaps is async (SVG serialize +
    // image decode), unlike the old synchronous DOM-clone snapshot pipeline
    // — give the idle-scheduled prewarm time to finish before swiping, or
    // the engine won't be ready yet and this swipe becomes a plain
    // (correctly) un-animated date change instead of a tracked flip. This
    // helper runs twice per test (once per swipe direction, re-navigating
    // to Saturday each time), so under load the second rebuild can still be
    // in flight at 500ms — use a bit more margin.
    await page.waitForTimeout(800);
  };
  const startSwipe = async (startX, moveX, identifier) => page.evaluate(({ startX, moveX, identifier }) => {
    const target = document.querySelector('#app');
    const touch = x => new Touch({ identifier, target, clientX: x, clientY: 360 });
    const start = touch(startX);
    const move = touch(moveX);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
  }, { startX, moveX, identifier });
  const finishSwipe = async (endX, identifier) => page.evaluate(({ endX, identifier }) => {
    const target = document.querySelector('#app');
    const end = new Touch({ identifier, target, clientX: endX, clientY: 360 });
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
  }, { endX, identifier });

  await openSaturday();
  await startSwipe(340, 200, 31);
  await expect(page.locator('.page-turn-host')).toHaveAttribute('data-page-turn-state', 'user_fold');
  await expect(page.locator('.page-turn-host')).toBeVisible();
  await finishSwipe(35, 31);
  await expect(page.locator('.stats-page')).toBeVisible();
  await expect(page.locator('.stats-hero h1')).toContainText('07 / 13 — 07 / 19');
  await expect(page.locator('.page-turn-host')).toBeHidden();

  await openSaturday();
  await startSwipe(45, 200, 32);
  await expect(page.locator('.page-turn-host')).toHaveAttribute('data-page-turn-state', 'user_fold');
  await expect(page.locator('.page-turn-host')).toBeVisible();
  await finishSwipe(355, 32);
  await expect(page.locator('.date-heading strong')).toHaveText('07 / 17');
  await expect(page.locator('.page-turn-host')).toBeHidden();
});

test('keeps a viewport-sized flip engine across scrolling and the short Saturday page', async ({ page }) => {
  await page.locator('[data-action="menu"]').click();
  await page.getByRole('button', { name: /月视图/ }).click();
  await page.locator('[data-date="2026-07-17"]').click();
  await page.evaluate(() => scrollTo(0, 220));
  // Scrolling marks the prepared engine dirty and reschedules the prewarm
  // with its own 120ms delay before the (async, rasterization-based) rebuild
  // even starts — on top of the margin noted in "keeps both swipe
  // directions animated..." above, so this needs more headroom than a
  // same-page swipe does.
  await page.waitForFunction(() => window.__study.isPageTurnReady());

  await page.evaluate(() => {
    const target = document.querySelector('#app');
    const touch = x => new Touch({ identifier: 41, target, clientX: x, clientY: 520 });
    const start = touch(340);
    const move = touch(190);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
  });
  // Unlike a single unretried read, wait for the state via Playwright's
  // built-in polling — Canvas mode's changeState event can lag a touchmove
  // by a frame or two (the old HTML mode set this synchronously via CSS
  // class changes within the same call stack).
  await expect(page.locator('.page-turn-host')).toHaveAttribute('data-page-turn-state', 'user_fold');
  const engineMetrics = await page.locator('.page-turn-host').evaluate(element => ({
    height: element.getBoundingClientRect().height,
    viewport: innerHeight
  }));
  expect(Math.abs(engineMetrics.height - engineMetrics.viewport)).toBeLessThanOrEqual(0.5);

  await page.evaluate(() => {
    const target = document.querySelector('#app');
    const end = new Touch({ identifier: 41, target, clientX: 35, clientY: 520 });
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
  });
  await expect(page.locator('.date-heading strong')).toHaveText('07 / 18');
  await expect(page.locator('.page-turn-host')).toBeHidden();

  await page.evaluate(() => {
    const target = document.querySelector('#app');
    const touch = x => new Touch({ identifier: 42, target, clientX: x, clientY: 360 });
    const start = touch(340);
    const move = touch(180);
    const end = touch(35);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
  });
  await expect(page.locator('.stats-page')).toBeVisible();
  await expect(page.locator('.page-turn-host')).toBeHidden();
});

for (const viewport of [
  { width: 1080, height: 1920 },
  { width: 1440, height: 3200 },
  { width: 3840, height: 2160 }
]) {
  test(`keeps Saturday turns animated at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize(viewport);
    await page.reload();

    const openSaturday = async () => {
      await page.locator('[data-action="menu"]').click();
      await page.getByRole('button', { name: /月视图/ }).click();
      await page.locator('[data-date="2026-07-18"]').click();
      await expect(page.locator('.date-heading strong')).toHaveText('07 / 18');
      // See the comment in "keeps both swipe directions animated..." above.
      // This test also reloads at a synthetic desktop-sized viewport (up to
      // 3840x2160), so the rasterized bitmaps and their backing canvas are
      // far larger than on a real phone — give it more headroom than the
      // realistic-viewport tests need.
      await page.waitForTimeout(1200);
    };
    const startSwipe = async (direction, identifier) => page.locator('.page').evaluate((element, { direction, identifier }) => {
      const target = document.querySelector('#app');
      const rect = element.getBoundingClientRect();
      const startX = direction > 0 ? rect.right - 35 : rect.left + 35;
      const moveX = rect.left + rect.width / 2;
      const y = Math.min(innerHeight - 80, Math.max(80, rect.top + 360));
      const touch = x => new Touch({ identifier, target, clientX: x, clientY: y });
      const start = touch(startX);
      const move = touch(moveX);
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
      const startedAt = performance.now();
      target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
      return {
        moveDuration: performance.now() - startedAt,
        endX: direction > 0 ? rect.left + 20 : rect.right - 20,
        y
      };
    }, { direction, identifier });
    const finishSwipe = async ({ endX, y }, identifier) => page.evaluate(({ endX, y, identifier }) => {
      const target = document.querySelector('#app');
      const end = new Touch({ identifier, target, clientX: endX, clientY: y });
      target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
    }, { endX, y, identifier });

    // The touchmove handler itself stays cheap regardless of viewport size —
    // rasterization happens ahead of time during prewarm, not on this call
    // stack — but drawImage()'ing the flip frame onto a canvas whose backing
    // store is sized to this synthetic viewport. The renderer caps its pixel
    // budget for these oversized canvases; 150ms matches the INP budget used
    // elsewhere while realistic phone-sized turns retain their full DPR.
    await openSaturday();
    const forward = await startSwipe(1, 51);
    expect(forward.moveDuration).toBeLessThan(150);
    await expect(page.locator('.page-turn-host')).toHaveAttribute('data-page-turn-state', 'user_fold');
    await finishSwipe(forward, 51);
    await expect(page.locator('.stats-page')).toBeVisible();
    await expect(page.locator('.page-turn-host')).toBeHidden();

    await openSaturday();
    const backward = await startSwipe(-1, 52);
    expect(backward.moveDuration).toBeLessThan(150);
    await expect(page.locator('.page-turn-host')).toHaveAttribute('data-page-turn-state', 'user_fold');
    await finishSwipe(backward, 52);
    await expect(page.locator('.date-heading strong')).toHaveText('07 / 17');
    await expect(page.locator('.page-turn-host')).toBeHidden();
  });
}

test('drives StPageFlip from touch distance', async ({ page }) => {
  // See the comment in "keeps both swipe directions animated..." above —
  // rasterizing the flip overlay's bitmaps is async now, so the prewarm
  // needs time to finish after beforeEach's reload before this swipe.
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const target = document.querySelector('#app');
    const touch = (x, y) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
    const start = touch(340, 360);
    const move = touch(200, 362);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
  });

  const turnLayer = page.locator('[data-page-turn="next"]');
  await expect(turnLayer).toBeAttached();
  const progress = Number(await turnLayer.getAttribute('data-page-turn-progress'));
  expect(progress).toBeGreaterThan(0.35);
  expect(progress).toBeLessThan(0.5);
  await expect(turnLayer).toHaveAttribute('data-page-turn-model', 'st-page-flip');
  await expect(page.locator('.date-heading strong')).toHaveText('07 / 13');

  await page.evaluate(() => {
    const target = document.querySelector('#app');
    const end = new Touch({ identifier: 1, target, clientX: 35, clientY: 362 });
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
  });

  await expect(page.locator('.date-heading strong')).toHaveText('07 / 14');
  await expect(page.locator('.page-turn-host')).toBeHidden();

  await page.evaluate(() => {
    const target = document.querySelector('#app');
    const touch = (x, y) => new Touch({ identifier: 2, target, clientX: x, clientY: y });
    const start = touch(45, 360);
    const move = touch(245, 362);
    const end = touch(355, 362);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
  });

  await expect(page.locator('.date-heading strong')).toHaveText('07 / 13');
  await expect(page.locator('.page-turn-host')).toHaveCount(1);
  await expect(page.locator('.page-turn-host')).toBeHidden();
});

test('supports repeated touch swipes without moving the page canvas', async ({ page }) => {
  for (let turn = 0; turn < 4; turn += 1) {
    await page.evaluate(() => {
      const target = document.querySelector('#app');
      const start = new Touch({ identifier: 1, target, clientX: 340, clientY: 360 });
      const end = new Touch({ identifier: 1, target, clientX: 35, clientY: 362 });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
    });
    await expect(page.locator('.date-heading strong')).toBeVisible();
    const canvas = await page.evaluate(() => {
      const element = document.querySelector('#app > .page');
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth, transform: getComputedStyle(element).transform };
    });
    expect(Math.abs(canvas.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(canvas.right - canvas.viewport)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(canvas.width - canvas.viewport)).toBeLessThanOrEqual(0.5);
    expect(canvas.transform).toBe('none');
  }
});

test('recovers the flip animation after a burst of rapid swipes', async ({ page, context }) => {
  // Regression: each flip rebuild is a multi-page rasterization, and rebuild
  // requests used to run concurrently and invalidate each other — a few fast
  // swipes stacked enough overlapping builds that none ever won, the engine
  // stayed stale permanently, and every later swipe silently used the
  // un-animated fallback. Individual swipes in the burst may legitimately
  // fall back while a rebuild is in flight; what must never happen is the
  // engine failing to recover once given breathing room. CPU throttling
  // widens the build/gesture race the same way a loaded phone does — without
  // it the 2x-DPR test rasters finish fast enough to drain the old storm
  // within this test's patience, hiding the regression.
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const swipe = () => page.evaluate(() => {
    const target = document.querySelector('#app');
    const touch = (x, y) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
    const start = touch(340, 360);
    const move = touch(200, 362);
    const end = touch(35, 362);
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move], changedTouches: [move] }));
    target.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [end] }));
  });

  let animated = false;
  try {
    await page.waitForTimeout(1200); // initial async prewarm (throttled)
    for (let turn = 0; turn < 6; turn += 1) {
      await swipe();
      await page.waitForTimeout(250);
    }

    // body.page-turn-active only appears on animated turns, never on the
    // fallback path. Allow a few attempts so a slow shared-CI rebuild can
    // finish; before the fix no amount of waiting ever animated again.
    for (let attempt = 0; attempt < 3 && !animated; attempt += 1) {
      await page.waitForTimeout(1500);
      const sawTurn = page.evaluate(() => new Promise(resolve => {
        const deadline = performance.now() + 2500;
        const poll = () => {
          if (document.body.classList.contains('page-turn-active')) return resolve(true);
          if (performance.now() > deadline) return resolve(false);
          requestAnimationFrame(poll);
        };
        poll();
      }));
      await swipe();
      animated = await sawTurn;
    }
  } finally {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  expect(animated).toBe(true);
});

test('claims horizontal swipes before browser navigation but preserves vertical scrolling', async ({ page }) => {
  const result = await page.evaluate(() => {
    const target = document.querySelector('#app');
    const touch = (x, y) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
    const dispatch = (type, touches, changedTouches = touches) => target.dispatchEvent(new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches,
      targetTouches: touches,
      changedTouches
    }));

    const horizontalStart = touch(12, 360);
    dispatch('touchstart', [horizontalStart]);
    const horizontalMoveAllowed = dispatch('touchmove', [touch(90, 362)]);
    dispatch('touchcancel', [], [touch(90, 362)]);

    const verticalStart = touch(190, 360);
    dispatch('touchstart', [verticalStart]);
    const verticalMoveAllowed = dispatch('touchmove', [touch(192, 440)]);
    dispatch('touchcancel', [], [touch(192, 440)]);

    return {
      horizontalMoveAllowed,
      verticalMoveAllowed,
      appTouchAction: getComputedStyle(target).touchAction,
      bodyOverscrollX: getComputedStyle(document.body).overscrollBehaviorX
    };
  });

  expect(result.horizontalMoveAllowed).toBe(false);
  expect(result.verticalMoveAllowed).toBe(true);
  expect(result.appTouchAction).toBe('pan-y');
  expect(result.bodyOverscrollX).toBe('none');
});

test('removes the unsolicited start shortcut but keeps weekly-summary return', async ({ page }) => {
  await expect(page.getByRole('button', { name: '回到起点' })).toHaveCount(0);

  await page.getByRole('button', { name: /本周小结/ }).click();
  await expect(page.getByRole('button', { name: /返回日清单/ }).last()).toBeVisible();

  await page.getByRole('button', { name: /返回日清单/ }).last().click();
  await expect(page.locator('.task-list')).toBeVisible();
});

test('uses the refined wheel pointer and view-level motion', async ({ page }) => {
  await page.locator('[data-action="menu"]').click();
  await page.getByRole('button', { name: /摸鱼转盘/ }).click();

  await expect(page.locator('.wheel-pointer svg')).toBeVisible();
  await expect(page.locator('.pointer-ring')).toHaveCount(1);
  expect(await page.locator('.wheel-stage').evaluate(element => getComputedStyle(element).animationName)).toBe('wheelEnter');
});
