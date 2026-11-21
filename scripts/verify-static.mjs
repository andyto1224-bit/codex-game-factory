import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, cli, isMain, parseArgs, projectPath, safePath } from './lib/common.mjs';

/** Verify the actual production bytes under a non-root URL, without a dev server. */
export async function verifyStatic(args) {
  const project = await projectPath(Object.keys(args).length ? args : { project: path.relative(ROOT, process.cwd()) });
  const dist = await safePath(project, 'dist');
  const require = createRequire(path.join(project, 'package.json'));
  const loaded = await import(pathToFileURL(require.resolve('@playwright/test')).href);
  const { chromium } = loaded.default ?? loaded;
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const prefix = '/factory-check/';
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '', 'http://localhost');
      if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
      const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
      const file = await safePath(dist, relative);
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': `${mime[path.extname(file)] ?? 'application/octet-stream'}; charset=utf-8` });
      response.end(content);
    } catch { response.writeHead(404).end(); }
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No listening port');
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`http://127.0.0.1:${address.port}${prefix}`);
    await page.locator('#ui-root[data-screen="start"]').waitFor();
    assert.equal(await page.evaluate(() => '__GAME_TEST__' in window), false, 'Production must not expose TestBridge');
    await page.getByRole('button', { name: '开始游戏' }).click();
    await page.locator('#game-canvas').click();
    await page.getByText('1', { exact: true }).waitFor();
    const screenshots = await safePath(project, '_artifacts/_screenshots/production');
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, 'subpath-hud.png') });
    assert.deepEqual(errors, [], 'Production page must load without errors or missing resources');
    console.log(`Production subpath verified: ${path.relative(ROOT, project)}; no TestBridge, canvas input works, no resource errors.`);
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

if (isMain(import.meta.url)) await cli(() => verifyStatic(parseArgs(process.argv.slice(2), ['app', 'project'])));
