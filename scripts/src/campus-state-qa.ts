/// <reference lib="dom" />
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://127.0.0.1:80';
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext();
    await context.addInitScript((theme) => {
      if (!localStorage.getItem('sac:profile')) localStorage.setItem('sac:profile', JSON.stringify({ name: 'State QA', role: 'faculty', srn: '', dept: 'Computer Science', year: '', academicStatus: 'not-applicable' }));
      if (!localStorage.getItem('sac:prefs')) localStorage.setItem('sac:prefs', JSON.stringify({ theme, liveLocation: false, finderOptIn: true, showName: false }));
    }, theme);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of ['/portal/report-issue', '/portal/intelligence', '/portal/predictions']) {
      await page.goto(base + route);
      await expect(page.locator('h1').first()).toBeVisible();
      if (route.endsWith('predictions')) {
        await page.getByTestId('select-scenario').selectOption('10');
        await page.getByTestId('slider-ahead').focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByTestId('text-ahead')).toContainText('+15 min');
        await expect(page.getByTestId('text-event-bblock')).toBeVisible();
      }
      await page.waitForTimeout(650);
      const result = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
    }
    await page.goto(base + '/portal/report-issue');
    let advances = 0;
    while (await page.locator('[data-testid^="button-advance-"]').count()) {
      await page.locator('[data-testid^="button-advance-"]').first().click();
      if (++advances > 50) throw new Error('Status advance did not terminate');
    }
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sac:reports')!).every((r: { status: string }) => r.status === 'Resolved'))).toBe(true);
    await page.goto(base + '/portal/intelligence');
    await expect(page.getByTestId('text-no-priorities')).toBeVisible();
    await page.goto(base + '/portal/map?layer=issues');
    await expect(page.locator('[data-testid^="marker-issue-"]')).toHaveCount(0);
    await page.goto(base + '/portal/notifications');
    await page.getByTestId('button-mark-all').click();
    await page.getByTestId('filter-notice-unread').click();
    await expect(page.getByTestId('button-clear-filter')).toBeVisible();
    await page.getByTestId('button-clear-filter').click();
    while (await page.locator('[data-testid^="button-dismiss-"]').count()) await page.locator('[data-testid^="button-dismiss-"]').first().click();
    await expect(page.getByTestId('button-clear-filter')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('button-clear-filter')).toBeVisible();
    expect(errors).toEqual([]);
    console.log(`PASS ${theme}: populated report/intelligence and exam-prediction contrast, prediction slider, complete issue resolution and map cleanup, read/dismiss/empty notifications`);
    await context.close();
  }
} finally { await browser.close(); }
