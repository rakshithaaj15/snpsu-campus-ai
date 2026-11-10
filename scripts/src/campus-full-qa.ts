/// <reference lib="dom" />
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://127.0.0.1:80';
const routes = ['/', '/demo', '/login', '/register', '/onboarding', '/explore', '/portal', '/portal/map', '/portal/find-student', '/portal/discovery', '/portal/events', '/portal/event-management', '/portal/lost-found', '/portal/investigation', '/portal/report-issue', '/portal/intelligence', '/portal/predictions', '/portal/notifications', '/portal/settings', '/unknown-page'];
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const violations: unknown[] = [];
const layout: unknown[] = [];
const errors: string[] = [];
const assetErrors: string[] = [];
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript((theme) => {
      localStorage.setItem('sac:prefs', JSON.stringify({ theme, liveLocation: false, finderOptIn: true, showName: false }));
      if (!localStorage.getItem('sac:profile')) localStorage.setItem('sac:profile', JSON.stringify({ name: 'QA Faculty', role: 'faculty', dept: 'Computer Science', srn: '', year: '', academicStatus: 'not-applicable' }));
    }, theme);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`${theme} ${page.url()}: ${e.message}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`${theme} ${page.url()}: ${message.text()}`); });
    page.on('response', (response) => { if (response.status() >= 400 && response.url().startsWith(base)) assetErrors.push(`${response.status()} ${response.url()}`); });
    for (const route of routes) {
      await page.goto(base + route);
      await expect(page.locator('h1').first()).toBeVisible();
      // Audit settled content, not temporarily transparent entrance-animation frames.
      await page.waitForTimeout(route === '/' ? 1800 : 650);
      const result = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const violation of result.violations) violations.push({ theme, route, id: violation.id, impact: violation.impact, nodes: violation.nodes.map((n) => ({ target: n.target, html: n.html, summary: n.failureSummary })) });
      const links = await page.locator('#root a').evaluateAll((nodes) => nodes.map((n) => ({ href: n.getAttribute('href'), text: n.textContent })));
      for (const link of links) {
        if (link.href?.startsWith('/') && !routes.includes(link.href.split(/[?#]/)[0])) errors.push(`Unregistered route ${route}: ${link.href}`);
        if (link.href?.startsWith('#') && !await page.locator(`[id="${link.href.slice(1)}"]`).count()) errors.push(`Missing anchor ${route}: ${link.href}`);
      }
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
        if (overflow) {
          const wide = await page.locator('#root *').evaluateAll((nodes) => nodes.filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 2 || b.left < -2) && getComputedStyle(n).position !== 'fixed'; }).slice(0, 8).map((n) => ({ tag: n.tagName, id: n.getAttribute('data-testid'), text: n.textContent?.slice(0, 70), class: n.className })));
          layout.push({ theme, route, width, wide });
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      console.log(`AUDITED ${theme} ${route}`);
    }
    await context.close();
  }
  await writeFile('/tmp/campus-full-qa.json', JSON.stringify({ violations, layout, errors, assetErrors }, null, 2));
  console.log({ accessibilityFindings: violations.length, layoutFindings: layout.length, errors, assetErrors });
  expect(violations, 'Accessibility findings in /tmp/campus-full-qa.json').toEqual([]);
  expect(layout, 'Layout findings in /tmp/campus-full-qa.json').toEqual([]);
  expect(errors).toEqual([]);
  expect(assetErrors).toEqual([]);
} finally { await browser.close(); }
