import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('five screens, real canvas input, revive and deterministic restart', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const folder = path.join('_artifacts', '_screenshots', testInfo.project.name);
  await mkdir(folder, { recursive: true });
  const screenshot = async (name: string): Promise<void> => {
    await page.screenshot({ path: path.join(folder, `${name}.png`), animations: 'disabled' });
  };
  await page.goto('./');
  await page.waitForFunction(() => window.__GAME_TEST__?.ready === true);
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'start');
  await screenshot('01-start');
  await page.getByRole('button', { name: '开始游戏' }).click();
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toHaveJSProperty('clientWidth', page.viewportSize()?.width);
  await expect(canvas).toHaveJSProperty('clientHeight', page.viewportSize()?.height);
  await canvas.click();
  await expect.poll(() => page.evaluate(() => window.__GAME_TEST__?.getSnapshot().score)).toBe(1);
  await expect(page.locator('.ftue')).toHaveCount(0);
  await screenshot('02-hud');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'pause');
  await screenshot('03-pause');
  expect(await page.evaluate(() => window.__GAME_TEST__?.getSnapshot().score)).toBe(1);
  await page.getByRole('button', { name: '继续游戏' }).click();
  for (let hit = 1; hit < 10; hit += 1) await canvas.click();
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'revive');
  await screenshot('04-revive');
  await page.getByRole('button', { name: '复活', exact: true }).click();
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'hud');
  for (let hit = 0; hit < 10; hit += 1) await canvas.click();
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'gameover');
  await screenshot('05-gameover');
  await page.getByRole('button', { name: '再玩一次' }).click();
  await expect.poll(() => page.evaluate(() => window.__GAME_TEST__?.getSnapshot().score)).toBe(0);
  await page.evaluate(() => window.__GAME_TEST__?.start(123));
  expect(await page.evaluate(() => window.__GAME_TEST__?.getSnapshot().seed)).toBe(123);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(canvas).toHaveJSProperty('clientWidth', 320);
  await canvas.click();
  await expect.poll(() => page.evaluate(() => window.__GAME_TEST__?.getSnapshot().score)).toBe(1);
  // Deterministic visibility injection exercises the real document event handlers.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'pause');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#ui-root')).toHaveAttribute('data-screen', 'pause');
  await page.getByRole('button', { name: '继续游戏' }).click();
  expect(await page.evaluate(() => window.__GAME_TEST__?.getSnapshot().score)).toBe(1);
  expect(errors).toEqual([]);
});
