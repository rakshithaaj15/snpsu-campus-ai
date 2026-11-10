/// <reference lib="dom" />
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

const root = path.resolve('../artifacts/sapthagiri-ai-campus/dist/public');
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url!, 'http://localhost').pathname);
  let file = path.join(root, pathname);
  if (!file.startsWith(root + path.sep)) file = path.join(root, 'index.html');
  try {
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
  } catch {
    if (path.extname(pathname)) { response.writeHead(404); response.end(); return; }
    file = path.join(root, 'index.html');
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  response.end(await readFile(file));
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Production test server did not start');
const base = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext();
await context.addInitScript(() => {
  localStorage.setItem('sac:profile', JSON.stringify({ name: 'Production QA', role: 'faculty', srn: '', dept: 'Computer Science', year: '', academicStatus: 'not-applicable' }));
  localStorage.setItem('sac:prefs', JSON.stringify({ theme: 'dark', liveLocation: false, finderOptIn: true, showName: false }));
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
try {
  for (const route of ['/', '/demo', '/login', '/register', '/onboarding', '/explore', '/portal', '/portal/map', '/portal/find-student', '/portal/discovery', '/portal/events', '/portal/event-management', '/portal/lost-found', '/portal/investigation', '/portal/report-issue', '/portal/intelligence', '/portal/predictions', '/portal/notifications', '/portal/settings']) {
    await page.goto(base + route);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  }
  await page.goto(base + '/portal/predictions');
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await page.goto(base + '/portal');
  await page.getByTestId('input-chat').fill('Where is the library?');
  await page.getByTestId('button-send-chat').click();
  await expect(page.getByTestId('chat-log')).toContainText('Library');
  expect(errors).toEqual([]);
  console.log('PASS compiled production app: all 19 deep links, lazy modules, chart assets, dark theme and assistant');
} finally { await browser.close(); await new Promise<void>((resolve) => server.close(() => resolve())); }
