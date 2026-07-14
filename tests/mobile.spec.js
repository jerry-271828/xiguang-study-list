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
  const missed = await task.boundingBox();

  expect(Math.abs(missed.x - initial.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(missed.width - initial.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(missed.height - initial.height)).toBeLessThanOrEqual(0.5);
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
        const pageElement = document.querySelector('.page');
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

  const geometry = await page.locator('.page').evaluate(element => {
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
  const runningFiniteAnimations = await page.locator('.page').evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.effect.getTiming().iterations !== Infinity && animation.playState === 'running')
    .map(animation => animation.animationName));
  expect(runningFiniteAnimations).toEqual([]);
});

test('drives StPageFlip from touch distance', async ({ page }) => {
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
    const canvas = await page.locator('.page').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth, transform: getComputedStyle(element).transform };
    });
    expect(Math.abs(canvas.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(canvas.right - canvas.viewport)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(canvas.width - canvas.viewport)).toBeLessThanOrEqual(0.5);
    expect(canvas.transform).toBe('none');
  }
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
