/// <reference lib="dom" />
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://127.0.0.1:80';
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
const page = await context.newPage();
const errors: string[] = [];
await mkdir('../screenshots/theme-audit', { recursive: true });
page.on('pageerror', (e) => errors.push(e.message));
const routes = ['/', '/login', '/register', '/onboarding', '/explore', '/portal', '/portal/map', '/portal/find-student', '/portal/discovery', '/portal/lost-found', '/portal/investigation', '/portal/report-issue', '/portal/intelligence', '/portal/predictions', '/portal/notifications', '/portal/settings'];
await context.addInitScript(() => {
  if (!localStorage.getItem('sac:profile')) localStorage.setItem('sac:profile', JSON.stringify({ name: 'Theme Test Faculty', role: 'faculty', srn: '', dept: 'Computer Science', year: '', academicStatus: 'not-applicable' }));
});

async function checkTheme(mode: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toEqual(mode);
  await expect(page.getByTestId(`theme-${mode}`).first()).toHaveAttribute('aria-pressed', 'true');
}

async function contrast() {
  return page.evaluate<{ fg: string; bg: string; ratio: number }[]>(String.raw`(() => {
    const probe = document.createElement('span'); probe.style.setProperty('transition', 'none', 'important'); document.body.appendChild(probe);
    const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number)
      .map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const rgb = (variable) => {
      probe.style.color = 'hsl(' + getComputedStyle(document.documentElement).getPropertyValue(variable) + ')';
      return luminance(getComputedStyle(probe).color);
    };
    const pairs = [['--foreground', '--background'], ['--muted-foreground', '--card'], ['--primary-foreground', '--primary'], ['--popover-foreground', '--popover'], ['--map-warn-fg', '--map-warn'], ['--destructive-foreground', '--destructive'], ['--map-event-fg', '--chart-5'], ['--chart-axis', '--card']];
    const out = pairs.map(([fg, bg]) => { const f = rgb(fg), b = rgb(bg); return { fg, bg, ratio: (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05) }; });
    const card = rgb('--card');
    for (const name of ['text-primary', 'text-destructive']) {
      probe.style.removeProperty('color'); probe.className = name;
      const fg = luminance(getComputedStyle(probe).color);
      out.push({ fg: name + ' utility', bg: '--card', ratio: (Math.max(fg, card) + .05) / (Math.min(fg, card) + .05) });
    }
    probe.className = 'btn btn-primary';
    const buttonFg = luminance(getComputedStyle(probe).color);
    for (const [i, color] of (getComputedStyle(probe).backgroundImage.match(/rgba?\([^)]+\)/g) || []).entries()) {
      const bg = luminance(color);
      out.push({ fg: 'Primary button label', bg: 'gradient stop ' + i, ratio: (Math.max(buttonFg, bg) + .05) / (Math.min(buttonFg, bg) + .05) });
    }
    probe.remove(); return out;
  })()`);
}

try {
  await page.goto(base);
  // Light stays default even for users whose OS is dark until they choose System.
  await checkTheme('light');
  await page.getByTestId('theme-dark').first().click();
  await checkTheme('dark');
  await page.reload();
  await checkTheme('dark');
  console.log('PASS light-first default, accessible toggle and reload persistence');
  for (const theme of ['light', 'dark'] as const) {
    await page.getByTestId(`theme-${theme}`).first().click();
    for (const route of routes) {
      await page.goto(`${base}${route}`);
      await checkTheme(theme);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
      if (['/explore', '/portal/predictions', '/login'].includes(route)) await page.screenshot({ path: `../screenshots/theme-audit/${theme}-${route.split('/').pop()}.jpg` });
    }
    const readings = await contrast();
    for (const reading of readings) expect(reading.ratio, `${theme}: ${reading.fg} on ${reading.bg}`).toBeGreaterThanOrEqual(4.5);
    console.log(`PASS ${theme}: all 16 screens, overflow checks, WCAG AA core text/control pairs`, readings);
  }

  // Provider dialog is nested UI, not a different theme tree.
  await page.goto(`${base}/login`);
  await page.getByTestId('button-google').click();
  await expect(page.getByTestId('dialog-google')).toBeVisible();
  await page.screenshot({ path: '../screenshots/theme-audit/dark-provider-modal.jpg' });
  const dialogBox = (await page.getByTestId('dialog-google').boundingBox())!;
  expect(Math.abs(dialogBox.x + dialogBox.width / 2 - 720)).toBeLessThan(2);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dialog-google')).not.toBeVisible();
  await expect(page.getByTestId('button-google')).toBeFocused();
  console.log('PASS viewport-centered themed portal dialog, keyboard focus containment, Escape and focus restoration');
  await page.goto(`${base}/portal/settings`);
  await page.getByTestId('button-theme-light').click();
  await checkTheme('light');
  await page.getByTestId('button-theme-dark').click();
  await checkTheme('dark');
  await page.getByTestId('button-theme-system').click();
  // In System mode only System is selected, even though Dark is resolved.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('theme-system').first()).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('theme-light').first().click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await checkTheme('light');
  console.log('PASS settings synchronization, System OS changes and explicit override');

  const second = await context.newPage();
  await second.goto(`${base}/explore`);
  await second.getByTestId('theme-dark').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  console.log('PASS synchronized theme across browser tabs');
  await second.close();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/login', '/onboarding', '/portal/map']) {
    await page.goto(`${base}${route}`);
    await expect(page.getByTestId('theme-light').first()).toBeVisible();
    await page.getByTestId('theme-light').first().click();
    await checkTheme('light');
    await page.getByTestId('theme-dark').first().click();
    await checkTheme('dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('theme-light').first().click();
  await checkTheme('light');
  expect(await page.locator('html').getAttribute('class')).not.toContain('theme-transition');
  expect(errors).toEqual([]);
  console.log('PASS mobile theme controls, reduced motion and no uncaught errors');
} finally {
  await browser.close();
}
