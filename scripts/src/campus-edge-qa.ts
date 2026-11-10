/// <reference lib="dom" />
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://127.0.0.1:80';
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
const checkAxe = async (scope = '#root') => {
  await page.waitForTimeout(500);
  const result = await new AxeBuilder({ page }).include(scope).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
};

try {
  if (!process.env.CAMPUS_STORAGE_ONLY) {
  await page.goto(base + '/login');
  await page.getByTestId('button-login-submit').click();
  await expect(page.getByTestId('error-login-email')).toBeVisible();
  await expect(page.getByTestId('error-login-password')).toBeVisible();
  await page.getByTestId('input-login-email').fill('missing@example.test');
  await page.getByTestId('input-login-password').fill('TestPassword123');
  await page.getByTestId('button-login-submit').click();
  await expect(page.getByTestId('error-login-form')).toBeVisible();
  await checkAxe();
  console.log('PASS invalid/unknown-account login and accessible error state');

  for (const role of ['student', 'newstudent', 'parent', 'faculty']) {
    await page.goto(base + '/register');
    await page.getByTestId('button-register-submit').click();
    await expect(page.getByTestId('error-register-name')).toBeVisible();
    await page.getByTestId('input-register-name').fill(`QA ${role}`);
    await page.getByTestId('input-register-email').fill(`${role}@qa.example.test`);
    await page.getByTestId('input-register-password').fill('NotARealPassword123');
    await page.getByTestId('select-register-role').selectOption(role);
    await page.getByTestId('button-register-submit').click();
    await expect(page).toHaveURL(/onboarding/);
    await page.getByTestId('button-onboarding-next').click();
    if (role === 'student') {
      await page.getByTestId('button-onboarding-finish').click();
      await expect(page.getByTestId('error-srn')).toBeVisible();
      await page.getByTestId('input-onboarding-srn').fill('DEMO-S-106');
      await page.getByTestId('button-check-srn').click();
      await page.getByTestId('button-onboarding-finish').click();
      await expect(page.getByTestId('error-ack')).toBeVisible();
      await page.getByTestId('checkbox-ack').check();
    } else if (role === 'newstudent') {
      await page.getByTestId('input-onboarding-srn').fill('!!');
      await page.getByTestId('button-onboarding-finish').click();
      await expect(page.getByTestId('error-srn')).toBeVisible();
      await page.getByTestId('input-onboarding-srn').fill('');
    } else if (role === 'parent') {
      await page.getByTestId('input-onboarding-ward').fill('DEMO-S-102');
      await page.getByTestId('button-check-ward').click();
      await expect(page.getByTestId('panel-ward-none')).toBeVisible();
      await page.getByTestId('input-onboarding-ward').fill('DEMO-S-106');
      await page.getByTestId('button-check-ward').click();
      await page.getByTestId('checkbox-ack').check();
    } else {
      await page.getByTestId('select-title').selectOption('Head of Department');
      await page.getByTestId('select-dept').selectOption({ index: 1 });
    }
    await checkAxe();
    await page.getByTestId('button-onboarding-finish').click();
    await expect(page).toHaveURL(/\/portal$/);
    await page.goto(base + '/portal/settings');
    await page.getByTestId('input-settings-name').fill('');
    await page.getByTestId('button-save-profile').click();
    await expect(page.getByTestId('error-settings-name')).toBeVisible();
    await page.getByTestId('input-settings-name').fill(`QA ${role} Updated`);
    await page.getByTestId('button-save-profile').click();
    await expect(page.getByTestId('text-sidebar-name')).toContainText('Updated');
    if (role === 'newstudent') await expect(page.getByTestId('text-settings-status')).toContainText('Provisional');
    if (role === 'faculty') await expect(page.getByTestId('panel-profile-context')).toContainText('Head of Department');
    await page.getByTestId('theme-dark').click();
    await page.getByTestId('button-logout').click();
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('input-login-email').fill(`${role}@qa.example.test`);
    await page.getByTestId('input-login-password').fill('NotARealPassword123');
    await page.getByTestId('button-login-submit').click();
    await expect(page).toHaveURL(/\/portal$/);
    console.log(`PASS ${role}: registration, onboarding, profile validation/update, saved-role login and theme-preserving logout`);
  }

  await page.goto(base + '/register');
  await page.getByTestId('input-register-name').fill('Duplicate');
  await page.getByTestId('input-register-email').fill('student@qa.example.test');
  await page.getByTestId('input-register-password').fill('NotARealPassword123');
  await page.getByTestId('button-register-submit').click();
  await expect(page.getByTestId('error-register-email')).toContainText('already');
  await page.goto(base + '/portal/discovery');
  await page.getByTestId('tab-disc-faq').click();
  await expect(page.getByTestId('text-faq-0')).toBeVisible();
  await page.getByTestId('button-faq-0').click();
  await expect(page.getByTestId('text-faq-0')).not.toBeVisible();
  await page.getByTestId('button-faq-0').click();
  await expect(page.getByTestId('text-faq-0')).toBeVisible();
  await page.getByTestId('input-disc-search').fill('zz-no-match-zz');
  await expect(page.getByTestId('button-faq-reset')).toBeVisible();
  await page.getByTestId('button-faq-reset').click();
  await page.getByTestId('tab-disc-places').click();
  await page.getByTestId('link-place-map-b301').click();
  await expect(page.getByTestId('text-destination')).toContainText('B-301');
  await page.getByTestId('building-lib').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('text-destination')).toContainText('Library');
  await page.getByTestId('input-map-search').fill('zz-no-match-zz');
  await expect(page.getByTestId('text-map-noresults')).toBeVisible();
  console.log('PASS duplicate-account protection, discovery FAQ/empty state, directions, keyboard map and no-search-results');

  await page.goto(base + '/portal/report-issue');
  await page.getByTestId('input-report-text').fill('The Wi-Fi keeps dropping and many students cannot connect.');
  await page.getByTestId('button-submit-report').click();
  await expect(page.getByTestId('error-report')).toContainText('location');
  await page.getByTestId('select-report-location').selectOption('lib');
  await page.getByTestId('input-x-category').fill('Safety');
  await expect(page.getByTestId('text-class-team')).toContainText('Campus Helpdesk');
  await page.getByTestId('input-x-category').fill('Electrical');
  await expect(page.getByTestId('text-class-team')).toContainText('Electrical');
  await checkAxe();
  await page.getByTestId('button-submit-report').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sac:reports')!)[0].author)).toContain('Anonymous');
  console.log('PASS unknown location needs confirmation, editable classification updates routing and default anonymous author');

  await page.goto(base + '/portal/investigation');
  await page.getByTestId('button-inv-clear').click();
  await page.getByTestId('button-inv-run').click();
  await expect(page.getByTestId('error-inv')).toBeVisible();
  await page.getByTestId('input-inv-item').fill('Calculator');
  await page.getByTestId('input-inv-narrative').fill('10 am library. Then 12 pm canteen. Then 2 pm AI lab.');
  await page.getByTestId('input-inv-last').fill('09:00');
  await page.getByTestId('input-inv-noticed').fill('16:00');
  await page.getByTestId('button-inv-run').click();
  await page.getByTestId('button-cctv-0').click();
  await expect(page.getByTestId('panel-cctv-draft')).toBeVisible();
  await page.getByTestId('input-inv-item').fill('Wallet');
  await expect(page.getByTestId('panel-cctv-draft')).not.toBeVisible();
  await expect(page.getByTestId('list-inv-entries')).not.toBeVisible();
  await page.getByTestId('button-inv-run').click();
  await checkAxe();
  await page.goto(base + '/portal/investigation?item=Keys');
  await expect(page.getByTestId('input-inv-item')).toHaveValue('Keys');
  await expect(page.getByTestId('list-inv-entries')).not.toBeVisible();
  console.log('PASS investigation validation, stale analysis/draft invalidation and URL item handoff');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/portal');
  await page.getByTestId('button-open-menu').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('button-open-menu')).toBeFocused();
  await page.goto(base + '/portal/settings');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByTestId('button-reset').click();
  await expect(page).toHaveURL(/settings/);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('button-reset').click();
  await expect(page).toHaveURL(new RegExp(base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?$'));
  expect(await page.evaluate(() => localStorage.getItem('sac:investigation'))).toBeNull();
  await page.goto(base + '/portal');
  await expect(page).toHaveURL(/login/);
  console.log('PASS mobile drawer keyboard, confirmed/cancelled demo reset and signed-out portal guard');
  }

  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() => {
    localStorage.setItem('sac:prefs', 'null'); localStorage.setItem('sac:profile', '{}');
    localStorage.setItem('sac:reports', '{"bad":true}'); localStorage.setItem('sac:notices', '["bad"]');
  });
  const cp = await corrupt.newPage();
  cp.on('pageerror', (e) => errors.push(e.message));
  await cp.goto(base + '/login');
  await expect(cp.getByTestId('storage-notice')).toContainText('Safe demo defaults');
  await expect(cp.getByTestId('input-login-email')).toBeVisible();
  await corrupt.close();
  const blocked = await browser.newContext();
  // The development-only Replit banner reads storage outside the application.
  // Exclude that tool script only for this fault-injection case, not app assets.
  await blocked.route('**/@replit/vite-plugin-dev-banner/banner-script.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '// Development banner excluded from app storage fault-injection test.' }));
  await blocked.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value() { throw new Error('Blocked storage access'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new Error('Blocked storage access'); } });
  });
  const bp = await blocked.newPage();
  bp.on('pageerror', (e) => errors.push(e.message));
  await bp.goto(base + '/login');
  await expect(bp.getByTestId('storage-notice')).toContainText('session');
  await expect(bp.getByTestId('input-login-email')).toBeVisible();
  await bp.getByTestId('theme-dark').click();
  await expect(bp.locator('html')).toHaveAttribute('data-theme', 'dark');
  await blocked.close();
  expect(errors).toEqual([]);
  console.log('PASS corrupted/unavailable storage recovery without crashes or hidden persistence claims');
} finally { await browser.close(); }
