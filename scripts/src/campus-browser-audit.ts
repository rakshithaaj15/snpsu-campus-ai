/// <reference lib="dom" />
import { chromium, expect } from '@playwright/test';

const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://127.0.0.1:80';
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const profile = { name: 'Blueprint Test Student', role: 'student', email: 'student@example.test', srn: 'DEMO-S-106', dept: 'Computer Science', year: '2', section: 'A', academicStatus: 'registered' };
const testTheme = process.env.CAMPUS_TEST_THEME === 'dark' ? 'dark' : 'light';
await context.addInitScript((p) => {
  if (!localStorage.getItem('sac:profile')) localStorage.setItem('sac:profile', JSON.stringify(p));
}, profile);
await context.addInitScript((theme) => {
  if (!localStorage.getItem('sac:prefs')) localStorage.setItem('sac:prefs', JSON.stringify({ theme, liveLocation: false, finderOptIn: true, showName: false }));
}, testTheme);

const routes = [
  ['/', /SAPTHAGIRI/i], ['/demo', /Explore Demo/i], ['/login', /Sign|Welcome|Log|demo/i], ['/register', /Create|Register/i], ['/onboarding', /role|campus/i],
  ['/portal', /Hello|Good|Welcome|morning|afternoon|evening/i], ['/portal/map', /Campus map/i],
  ['/portal/find-student', /Find a student/i], ['/portal/discovery', /Discovery/i],
  ['/portal/lost-found', /Lost and found/i], ['/portal/investigation', /Investigation/i],
  ['/portal/report-issue', /Report an issue/i], ['/portal/intelligence', /Intelligence/i],
  ['/portal/predictions', /Predictions/i], ['/portal/notifications', /Notifications/i], ['/portal/settings', /Settings/i],
] as const;

try {
  for (const [route, heading] of routes) {
    await page.goto(`${base}${route}`);
    await expect(page.locator('h1').first()).toContainText(heading);
    await expect(page.locator('html')).toHaveAttribute('data-theme', testTheme);
    if (route.startsWith('/portal')) {
      await expect(page.getByTestId('nav-map')).toHaveCount(1);
      await expect(page.getByTestId('nav-settings')).toHaveCount(1);
      await expect(page.getByTestId('theme-dark')).toBeEnabled();
    }
    console.log(`PASS route ${route}`);
  }

  await page.goto(`${base}/portal`);
  for (const [id, path] of [['map', 'map'], ['find', 'find-student'], ['discovery', 'discovery'], ['lostfound', 'lost-found'], ['investigation', 'investigation'], ['report', 'report-issue'], ['intelligence', 'intelligence'], ['predictions', 'predictions'], ['notifications', 'notifications']] as const) {
    await page.getByTestId(`nav-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`/portal/${path}$`));
    await expect(page.locator('h1')).toHaveCount(1);
  }
  console.log('PASS coherent sidebar navigation');

  await page.goto(`${base}/portal/map`);
  await page.getByTestId('input-map-search').fill('B-301');
  await page.getByTestId('result-map-f-b301').click();
  await expect(page.getByTestId('text-destination')).toContainText('B-301');
  await expect(page.getByTestId('panel-building-issues')).toContainText('Lift');
  await page.getByTestId('button-navigate').click();
  await expect(page.getByTestId('panel-route')).toBeVisible();
  await page.getByTestId('link-map-report').click();
  await expect(page.getByTestId('select-report-location')).toHaveValue('bblock');
  console.log('PASS room search, route planning, access overlays and issue location handoff');

  await page.goto(`${base}/portal/find-student?q=Ramesh`);
  await page.getByTestId('select-purpose').selectOption({ index: 1 });
  await page.getByTestId('input-purpose-detail').fill('Returning a lost calculator with consent.');
  await page.getByTestId('checkbox-consent').check();
  await page.getByTestId('button-unlock').click();
  await page.getByTestId('select-filter-dept').selectOption('Computer Science');
  await page.getByTestId('select-filter-year').selectOption('2');
  await page.getByTestId('select-filter-section').selectOption('A');
  await page.getByTestId('button-finder-search').click();
  await expect(page.getByTestId('result-DEMO-S-106')).toBeVisible();
  await expect(page.getByTestId('result-DEMO-S-104')).toHaveCount(0);
  await expect(page.getByTestId('likelihoods-DEMO-S-106')).toContainText(/Unknown|unaccounted/i);
  console.log('PASS authorized finder query, department/year/section filters and uncertainty');

  await page.goto(`${base}/portal/report-issue`);
  await page.getByTestId('input-report-text').fill('B Block lift has failed again before the exam affecting 120 students.');
  await expect(page.getByTestId('text-class-priority')).toHaveText('Critical');
  await page.getByTestId('button-submit-report').click();
  await expect(page.getByText('B Block lift has failed again before the exam affecting 120 students.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('B Block lift has failed again before the exam affecting 120 students.', { exact: true })).toBeVisible();
  console.log('PASS issue classification, submission and persistence');

  await page.goto(`${base}/portal/investigation`);
  await page.getByTestId('input-inv-narrative').fill('I visited the library. Then put my calculator down on a canteen bench. Then went to the AI lab.');
  await page.getByTestId('input-inv-last').fill('');
  await page.getByTestId('input-inv-noticed').fill('');
  await page.getByTestId('button-inv-run').click();
  await expect(page.getByTestId('list-inv-entries')).toBeVisible();
  await expect(page.getByTestId('list-inv-entries')).toContainText(/not provided|unknown/i);
  await expect(page.getByTestId('text-unknown-share')).toContainText(/unknown/i);
  const prior = await page.getByTestId('window-0').innerText();
  await page.getByTestId('input-inv-facts').fill('I checked the canteen and it was not there.');
  await page.getByTestId('button-inv-recalc').click();
  await expect(page.getByTestId('list-inv-facts')).toContainText('checked the canteen');
  expect(await page.getByTestId('window-0').innerText()).not.toEqual(prior);
  await page.getByTestId('button-cctv-0').click();
  await expect(page.getByTestId('text-cctv-clarify')).toContainText('unknown');
  await page.reload();
  await expect(page.getByTestId('list-inv-facts')).toContainText('checked the canteen');
  console.log('PASS natural-language investigation preserves unknown times');

  await page.goto(`${base}/demo`);
  await page.getByTestId('demo-role-student').click();
  await page.goto(`${base}/onboarding`);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByTestId('button-onboarding-next').click();
  await page.getByTestId('input-onboarding-srn').fill('DEMO-S-106');
  await page.getByTestId('button-check-srn').click();
  await expect(page.getByTestId('text-match-dept')).toContainText('Computer Science');
  await page.getByTestId('checkbox-ack').check();
  await page.getByTestId('button-onboarding-finish').click();
  await expect(page).toHaveURL(/\/portal$/);
  await page.getByTestId('select-scenario').selectOption('10');
  await expect(page.getByTestId('text-next-class')).toContainText('Data Structures');
  await page.getByTestId('input-chat').fill('where is my next class?');
  await page.getByTestId('button-send-chat').click();
  await expect(page.getByTestId('chat-log')).toContainText('B-301');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('NotARealPassword-123');
  await page.goto(`${base}/login`);
  await page.getByTestId('input-login-email').fill('blueprint@example.test');
  await page.getByTestId('input-login-password').fill('DemoPassword-Only');
  await page.getByTestId('button-login-submit').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('error-login-form')).toBeVisible();
  console.log('PASS registered demo onboarding and assistant; unconfigured real login does not claim success');

  await page.goto(`${base}/login`);
  await page.getByTestId('button-google').click();
  await expect(page.getByTestId('dialog-google')).toContainText(/not configured/i);
  await page.keyboard.press('Escape');
  await page.goto(`${base}/demo`);
  await page.getByTestId('demo-role-student').click();
  await page.goto(`${base}/onboarding`);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByTestId('card-role-student').click();
  await page.getByTestId('button-onboarding-next').click();
  await page.getByTestId('input-onboarding-srn').fill('PROV-UNREGISTERED');
  await page.getByTestId('button-check-srn').click();
  await expect(page.getByTestId('panel-srn-none')).toBeVisible();
  await page.getByTestId('button-provisional').click();
  await page.getByTestId('button-onboarding-finish').click();
  await expect(page.getByTestId('text-no-timetable')).toBeVisible();
  await expect(page.getByTestId('text-orient-progress')).toBeVisible();
  console.log('PASS first-time simulated Google and provisional orientation without invented timetable');

  await page.evaluate(() => localStorage.setItem('sac:profile', JSON.stringify({ name: 'Demo Parent', role: 'parent', srn: '', dept: '', year: '', academicStatus: 'not-applicable' })));
  await page.goto(`${base}/portal/find-student`);
  await page.getByTestId('input-ward-srn').fill('DEMO-S-102');
  await page.getByTestId('button-ward-check').click();
  await expect(page.getByTestId('text-ward-none')).toBeVisible();
  await page.getByTestId('input-ward-srn').fill('DEMO-S-106');
  await page.getByTestId('button-ward-check').click();
  await page.getByTestId('checkbox-ward-ack').check();
  await page.getByTestId('button-ward-associate').click();
  await expect(page.getByTestId('result-DEMO-S-106')).toBeVisible();
  await expect(page.getByTestId('input-finder-search')).toHaveCount(0);
  await expect(page.locator('[data-testid^="result-DEMO-S-"]')).toHaveCount(1);
  console.log('PASS parent cannot find arbitrary students and sees only authorized associated child');

  await page.evaluate(() => localStorage.setItem('sac:profile', JSON.stringify({ name: 'Demo Faculty', role: 'faculty', srn: '', dept: 'Computer Science', year: '', facultyTitle: 'Assistant Professor', academicStatus: 'not-applicable' })));
  await page.goto(`${base}/portal/investigation`);
  await page.getByTestId('button-inv-clear').click();
  await page.getByTestId('input-inv-item').fill('Calculator');
  await page.getByTestId('input-inv-narrative').fill('10 am library. Then 12 pm canteen. Then 2 pm AI lab.');
  await page.getByTestId('input-inv-last').fill('09:00');
  await page.getByTestId('input-inv-noticed').fill('16:00');
  await page.getByTestId('button-inv-run').click();
  await page.getByTestId('button-cctv-0').click();
  await expect(page.getByTestId('panel-cctv-draft')).toBeVisible();
  await expect(page.getByTestId('text-cctv-item')).toHaveText('Calculator');
  await page.getByTestId('checkbox-cctv-ack').check();
  await page.getByTestId('button-cctv-submit').click();
  await expect(page.getByTestId('panel-cctv-log')).toContainText('Local request log');
  await page.goto(`${base}/portal/intelligence`);
  await expect(page.getByTestId('panel-priorities')).toContainText(/Lift|lift/);
  await expect(page.getByTestId('panel-priorities')).toContainText(/120|recurring|Recurring/);
  await page.goto(`${base}/portal/predictions`);
  await expect(page.locator('main')).toContainText(/Lift|lift/);
  console.log('PASS evidence-derived faculty-demo CCTV request, intelligence and connected predictions');

  await page.goto(`${base}/portal/lost-found`);
  await page.getByTestId('tab-report').click();
  await page.getByTestId('input-item-title').fill('Scientific calculator');
  await page.getByTestId('select-item-category').selectOption('Stationery');
  await page.getByTestId('input-item-desc').fill('Lost during a lecture in Main Block.');
  await page.getByTestId('input-item-secret').fill('private-test-mark');
  await page.getByTestId('button-submit-item').click();
  await expect(page.getByTestId('tab-browse')).toBeVisible();
  await expect(page.locator('[data-testid^="matches-"]').first()).toContainText('Scientific calculator');
  await expect(page.locator('main')).not.toContainText('private-test-mark');
  await page.getByTestId(/^button-match-verify-.*-i4$/).first().click();
  await page.getByTestId('input-verify-guess').fill('initials scratched on back');
  await page.getByTestId('button-verify').click();
  await expect(page.getByTestId('text-verify-ok')).toBeVisible();
  await page.getByTestId('button-close-verify').click();
  console.log('PASS lost report, opposite-kind matching and masked ownership verification');

  await page.goto(`${base}/portal/notifications`);
  await page.getByTestId('button-mark-all').click();
  await expect(page.getByTestId('button-mark-all')).toBeDisabled();
  console.log('PASS connected notifications and mark-all-read');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/portal`);
  await page.getByTestId('button-open-menu').click();
  await page.getByTestId('nav-map').last().click();
  await expect(page).toHaveURL(/\/portal\/map$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
  console.log('PASS mobile portal navigation and no horizontal overflow');
  expect(errors).toEqual([]);
  console.log('PASS no uncaught browser errors');
} finally {
  await browser.close();
}
