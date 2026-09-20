/**
 * Browser smoke test: onboarding -> Alerts survey -> checklist ticks -> 72h confirm step -> every screen.
 * Not part of `npm test` (needs a browser). To run:
 *   npm i -D --no-save playwright-core && npm run build && npx vite preview --port 4173 &
 *   CHROME=/path/to/chrome node scripts/smoke.cjs
 * Screenshots land in scripts/shots/.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const S = `${__dirname}/shots`;
fs.mkdirSync(S, { recursive: true });
const BASE = 'http://localhost:4173/civil-preparation-app/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-GB' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${S}/${n}.png` });
  const click = async (text, opts = {}) => { await page.getByRole('button', { name: text, ...opts }).first().click(); await page.waitForTimeout(150); };

  await page.goto(BASE);
  await page.waitForSelector('text=/Three days|Trys dienos/', { timeout: 15000 });
  await shot('01-onboarding');
  await click(/Let's start|Pradėkime/);
  await shot('02-look');
  await click(/^Next$|^Toliau$/);
  await page.waitForSelector('text=/badges earned|ženkliukų/');
  await shot('03-home');

  // Start the Alerts badge
  await page.locator('a[href="#/badge/alerts"]').click();
  await page.waitForTimeout(200);
  await shot('04-badge-intro');
  await click(/Start this badge|Pradėti/);
  await page.waitForTimeout(200);
  // household: you -> name
  await shot('05-survey-name');
  await page.getByRole('textbox').fill('Martynas');
  await click(/^Next$|^Toliau$/);
  await shot('06-survey-age');
  await click(/18 to 64/);
  await click(/^Yes$/);            // meds
  await click(/^No$/);             // mobility
  await click(/^No$/);             // diet
  await shot('07-survey-more');
  await click(/Add another/);
  await page.getByRole('textbox').fill('Ieva');
  await click(/^Next$/);
  await click(/2 to 12/);
  await click(/^No$/); await click(/^No$/); await click(/^No$/);
  await click(/That's everyone/);
  await shot('08-survey-home');
  await click(/Apartment/);
  await page.waitForTimeout(300);
  const confirmSeenOnFirst = await page.getByRole('button', { name: /Looks right/ }).count();
  console.log('confirm shown on first badge (should be 0):', confirmSeenOnFirst);
  if (confirmSeenOnFirst) await click(/Looks right/);
  await page.waitForSelector('li.card');
  await shot('09-checklist');
  const rows = await page.locator('li.card').count();
  console.log('alerts checklist rows:', rows);
  // tick the first three items
  const boxes = page.locator('li.card > div > button[aria-pressed]');
  await boxes.nth(0).click(); await page.waitForTimeout(400);
  await shot('10-first-tick');
  // close celebration if present
  const nice = page.getByRole('button', { name: /Nice|Puiku/ });
  if (await nice.count()) await nice.click();
  await boxes.nth(1).click(); await boxes.nth(2).click(); await boxes.nth(3).click(); await boxes.nth(4).click();
  await page.waitForTimeout(500);
  await shot('11-badge-earned');
  if (await nice.count()) await nice.click();
  await page.locator('li.card > div > button.flex-1').first().click();
  await page.waitForTimeout(200);
  await shot('12-item-expanded');

  // Home with avatar + gear
  await page.goto(BASE + '#/');
  await page.waitForTimeout(300);
  await shot('13-home-after');

  // 72h badge: should ask fewer questions and show confirm
  await page.locator('a[href="#/badge/shelter72"]').click();
  await page.waitForTimeout(200);
  await shot('14-72h-intro');
  await click(/Start this badge/);
  await page.waitForTimeout(200);
  await shot('15-72h-survey');
  await click(/^No$/); // pets gate
  await page.waitForTimeout(200);
  await page.getByRole('textbox', { name: '' }).first().fill('7').catch(() => {});
  await click(/^Next$/).catch(() => {});
  await click(/^Yes$/).catch(() => {}); // lift
  await click(/District heating/).catch(() => {});
  await page.waitForTimeout(300);
  await shot('16-72h-confirm');
  console.log('confirm shown on 72h (should be 1):', await page.getByRole('button', { name: /Looks right/ }).count());
  await click(/Looks right/).catch(() => {});
  await page.waitForTimeout(300);
  await shot('17-72h-checklist');
  const water = page.locator('li.card', { hasText: 'Drinking water' });
  console.log('water row:', (await water.innerText()).replace(/\n/g, ' | ').slice(0, 200));

  // Profile, Right now, Shelters, About
  await page.goto(BASE + '#/profile'); await page.waitForTimeout(300); await shot('18-profile');
  await page.goto(BASE + '#/now'); await page.waitForTimeout(300); await shot('19-now');
  await page.goto(BASE + '#/shelters'); await page.waitForTimeout(500); await shot('20-shelters');
  await page.goto(BASE + '#/about'); await page.waitForTimeout(500); await shot('21-about');

  // Light theme + LT
  await page.goto(BASE + '#/profile'); await page.waitForTimeout(200);
  await click(/^Light$/); await click(/Lietuvių/);
  await page.goto(BASE + '#/'); await page.waitForTimeout(300); await shot('22-home-light-lt');

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('SMOKE FAILED', e); process.exit(1); });
