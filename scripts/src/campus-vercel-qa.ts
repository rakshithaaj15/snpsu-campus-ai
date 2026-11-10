import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = join(root, 'artifacts/sapthagiri-ai-campus/dist/public');
const require = createRequire(import.meta.url);
const config = require(join(root, 'vercel.json'));
const api: Record<string, any> = {
  '/api/campus-guide/status': require(join(root, 'api/campus-guide/status.js')),
  '/api/campus-guide/chat': require(join(root, 'api/campus-guide/chat.js')),
};
const missing = require(join(root, 'api/not-found.js'));
const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};
// Production bundle + actual portable handlers; no Replit dev server or proxy.
// This is a local routing smoke test, not a claim of a deployed Vercel project.
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
    const response = Object.assign(res, {
      status(code: number) { this.statusCode = code; return this; },
      json(data: unknown) { this.setHeader('Content-Type', 'application/json'); this.end(JSON.stringify(data)); return this; },
    });
    if (path.startsWith('/api/')) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      (req as any).body = raw || undefined;
      (api[path] || missing)(req, response);
      return;
    }
    let file = resolve(output, `.${path}`);
    if (!file.startsWith(output + '/') && file !== output) { res.writeHead(403).end(); return; }
    const exists = await stat(file).then(s => s.isFile()).catch(() => false);
    if (!exists) {
      const rule = config.routes.find((r: any) => r.src && new RegExp(`^${r.src}$`).test(path));
      if (rule?.status) { res.writeHead(rule.status).end(); return; }
      file = join(output, 'index.html');
    }
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(500).end('Local smoke server failed.'); }
});
await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const routes = ['/', '/demo', '/login', '/register', '/onboarding', '/explore',
  '/portal', '/portal/map', '/portal/find-student', '/portal/discovery', '/portal/events',
  '/portal/event-management', '/portal/lost-found', '/portal/investigation',
  '/portal/report-issue', '/portal/intelligence', '/portal/predictions',
  '/portal/notifications', '/portal/settings', '/unknown-page'];
let checks = 0;
try {
  const status = await context.request.get(`${base}/api/campus-guide/status`);
  assert.equal(status.status(), 200);
  assert.equal((await status.json()).mode, 'demo');
  assert.equal((await context.request.get(`${base}/api/missing`)).status(), 404);
  assert.equal((await context.request.get(`${base}/assets/missing.js`)).status(), 404);
  console.log('PASS portable API routes, JSON 404 and missing-asset 404');

  await page.goto(`${base}/`);
  assert.equal(await page.getByTestId('button-page-back').isDisabled(), true);
  await page.locator('a[href="/demo"]:visible').first().click();
  await page.waitForURL('**/demo');
  await page.getByTestId('button-page-back').click();
  await page.waitForURL(`${base}/`);
  console.log('PASS public Back navigation stays inside the app');

  for (const role of ['student', 'newstudent', 'parent', 'faculty', 'organizer', 'admin']) {
    await page.goto(`${base}/demo`);
    await page.getByTestId(`demo-role-${role}`).click();
    await page.waitForURL('**/portal**');
    await page.getByTestId('text-sidebar-name').waitFor();
    await page.getByTestId('button-page-back').click();
    await page.waitForURL('**/demo');
    checks++;
  }
  console.log('PASS six one-click persona entries and Back to demo chooser');
  await page.getByTestId('demo-role-admin').click();
  await page.waitForURL('**/portal/intelligence');

  for (const theme of ['light', 'dark']) {
    await page.goto(`${base}/portal/settings`);
    await page.getByTestId(`button-theme-${theme}`).click();
    await page.waitForFunction(`document.documentElement.dataset.theme === '${theme}'`);
    for (const route of routes) {
      await page.goto(base + route);
      await page.getByTestId('button-page-back').waitFor();
      await page.waitForFunction(`document.documentElement.dataset.theme === '${theme}'`);
      await page.locator('h1, h2, main, form').first().waitFor();
      const box = await page.getByTestId('button-page-back').boundingBox();
      assert.ok(box && box.x <= 12 && box.y <= 6 && box.width >= 40, `${theme} ${route}: arrow is not top-left`);
      assert.ok(await page.locator('h1, h2, main, form').count(), `${route}: no meaningful screen`);
      checks++;
    }
  }
  console.log('PASS all 20 screens: visible top-left arrow in light and dark');

  await page.goto(`${base}/portal/map?focus=lib&date=2026-10-09`);
  await page.getByTestId('nav-events').click();
  await page.waitForURL('**/portal/events');
  await page.getByTestId('button-page-back').click();
  await page.waitForURL('**/portal/map?focus=lib&date=2026-10-09');
  console.log('PASS Back preserves map focus and event-date query context');

  await page.goto(`${base}/portal/events`);
  await page.getByTestId('button-page-back').click();
  await page.waitForURL(`${base}/portal`);
  console.log('PASS refreshed/direct portal deep link has a safe parent fallback');

  await page.goto(`${base}/portal/settings`);
  await page.getByTestId('button-logout').click();
  await page.waitForURL('**/login');
  await page.getByTestId('button-page-back').click();
  await page.waitForURL(`${base}/`);
  console.log('PASS signing out clears protected-page Back history');
  await page.goto(`${base}/demo`);
  await page.getByTestId('demo-role-student').click();
  await page.waitForURL(`${base}/portal`);

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/portal/settings`);
    await page.waitForTimeout(400);
    const box = await page.getByTestId('button-page-back').boundingBox();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width);
    assert.equal(await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1'), false);
    if (width < 1024) {
      await page.getByTestId('button-open-menu').click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    checks++;
  }
  console.log('PASS mobile/tablet/desktop Back positioning, layout, menu focus/Escape');
  assert.deepEqual(errors, []);
  console.log(`PASS ${checks} production UI checks; no browser runtime or console errors`);
} finally {
  await context.close();
  await browser.close();
  await new Promise<void>(done => server.close(() => done()));
}
