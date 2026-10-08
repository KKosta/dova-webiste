// End-to-end QA for the splash page and both waitlist flows.
// Usage: npm run build && npx vite preview --port 4173 & node tests/qa.mjs
// Env: BASE_URL (default http://localhost:4173), CHROMIUM_PATH, SHOTS_DIR (screenshots, optional).
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) failures++; };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: opts.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const posts = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/waitlist') && r.method() === 'POST') posts.push(r.postDataJSON()); });
  await page.goto(BASE);
  return { ctx, page, errors, posts };
}

const dialog = (page) => page.getByRole('dialog');
const cont = (page, name = /^(continue|finish|skip)$/i) => dialog(page).getByRole('button', { name });
const heading = (page) => dialog(page).locator('h1').first();
const errText = (page) => dialog(page).locator('[role=alert], span').filter({ hasText: /continue|look right|whole number|what else|their name/i }).first();
async function pickFromSelect(page, label, search, option) {
  await dialog(page).getByRole('combobox', { name: label }).click();
  await page.keyboard.type(search);
  await page.getByRole('option', { name: option, exact: true }).click();
}

/* ── 1. Splash entrance ─────────────────────────────────────── */
console.log('Splash · desktop 1440×900');
{
  const { ctx, page, errors } = await open({ width: 1440, height: 900 });
  await page.waitForSelector('h1');
  const anims = await page.evaluate(() => document.getAnimations().map((a) => ({ delay: a.effect.getTiming().delay, dur: a.effect.getTiming().duration })));
  ok(anims.length === 6, `entrance runs 6 animations (got ${anims.length})`);
  ok(JSON.stringify(anims.map((a) => a.delay)) === '[0,550,800,880,1180,1300]', `beats in order photo→Dova→H1 lines→buttons: ${anims.map((a) => a.delay).join(',')}`);
  await wait(250); await shot(page, '01-splash-mid-entrance');
  await wait(1600);
  ok(await page.evaluate(() => document.getAnimations().length === 0), 'entrance finishes within ~1.7s');
  ok(await page.getByText('A New Partner for').isVisible() && await page.getByText('Couples’ Therapy.').isVisible(), 'headline lines visible');
  ok(await page.getByRole('button', { name: 'For therapists' }).isVisible() && await page.getByRole('button', { name: 'For couples' }).isVisible(), 'both CTAs visible');
  const font = await page.evaluate(() => document.fonts.check("72px 'Aimee'") && getComputedStyle(document.querySelector('h1')).fontFamily);
  ok(String(font).includes('Aimee'), `headline font is Aimee (${font})`);
  const bodyFont = await page.evaluate(() => getComputedStyle(document.querySelector('.dova-btn')).fontFamily);
  ok(bodyFont.includes('Instrument Sans'), 'buttons use Instrument Sans');
  await shot(page, '02-splash-desktop');

  // Wordmark sits in the same spot on the splash and in the form header.
  const splashMark = await page.locator('main > header img').boundingBox();
  await page.getByRole('button', { name: 'For therapists' }).click();
  await wait(400);
  const formMark = await dialog(page).locator('header img').boundingBox();
  ok(Math.abs(splashMark.x - formMark.x) < 1 && Math.abs(splashMark.y - formMark.y) < 1, `wordmark aligned splash→form (Δx ${(formMark.x - splashMark.x).toFixed(2)}, Δy ${(formMark.y - splashMark.y).toFixed(2)})`);
  ok(errors.length === 0, `no console errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── 2. Therapist flow ──────────────────────────────────────── */
console.log('Therapist flow');
{
  const { ctx, page, errors, posts } = await open({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'For therapists' }).click();
  ok(await dialog(page).isVisible(), 'form opens in place');
  ok(await page.evaluate(() => document.getAnimations().length >= 2), 'open animation runs (backdrop + card)');
  await wait(300);
  ok((await heading(page).textContent()) === 'A new partner for your couples practice', 'intro title');
  ok(await dialog(page).getByText('Private by design. HIPAA-compliant.').isVisible(), 'intro note');
  await shot(page, '03-therapist-intro');
  await dialog(page).getByRole('button', { name: /join the waitlist/i }).click();
  await wait(250);

  ok((await heading(page).textContent()) === 'Your name', 'Q1 name');
  ok(await page.evaluate(() => document.activeElement.tagName === 'INPUT'), 'input auto-focused');
  await cont(page).click();
  ok(await dialog(page).getByText('Add your name to continue.').isVisible(), 'empty name → error');
  await shot(page, '04-therapist-name-error');
  await dialog(page).getByRole('textbox').click();
  await page.keyboard.type('Ada Lovelace');
  ok(!(await dialog(page).getByText('Add your name to continue.').isVisible()), 'error clears on typing');
  await page.keyboard.press('Enter');
  await wait(250);

  ok((await heading(page).textContent()) === 'Email', 'Q2 email');
  await page.keyboard.type('ada@nope');
  await page.keyboard.press('Enter');
  ok(await dialog(page).getByText("That email doesn't look right.").isVisible(), 'bad email → error');
  await page.keyboard.type('.com');
  await page.keyboard.press('Enter');
  await wait(250);

  ok((await heading(page).textContent()) === 'Where do you practice?', 'Q3 location');
  await cont(page).click();
  ok(await dialog(page).getByText('Choose a country to continue.').isVisible(), 'no country → error');
  await pickFromSelect(page, 'Country', 'canada', 'Canada');
  ok(!(await dialog(page).getByRole('combobox', { name: 'State' }).isVisible()), 'State hidden for non-US');
  await pickFromSelect(page, 'Country', 'united st', 'United States');
  ok(await dialog(page).getByRole('combobox', { name: 'State' }).isVisible(), 'State appears for United States');
  // Esc closes an open dropdown, not the form.
  await dialog(page).getByRole('combobox', { name: 'State' }).click();
  await page.keyboard.press('Escape');
  await wait(50);
  ok(await dialog(page).isVisible() && !(await page.getByRole('listbox').isVisible()), 'Esc with dropdown open closes only the dropdown');
  await pickFromSelect(page, 'State', 'calif', 'California');
  await shot(page, '05-therapist-location');
  await cont(page).click();
  await wait(250);

  ok((await heading(page).textContent()) === 'How long have you been practicing?', 'Q4 years (optional)');
  ok(await cont(page, /^skip$/i).isVisible(), 'optional & empty → "Skip"');
  await dialog(page).getByText('6 to 10 years').click();
  await wait(600);
  ok((await heading(page).textContent()).startsWith('How many couples'), 'single choice auto-advances');

  await page.keyboard.type('eight');
  await page.keyboard.press('Enter');
  ok(await dialog(page).getByText('Enter a whole number, 0 or more.').isVisible(), 'non-number → error');
  await dialog(page).getByRole('textbox').fill('8');
  await page.keyboard.press('Enter');
  await wait(250);

  ok((await heading(page).textContent()).startsWith('What does a couples session'), 'Q6 fee');
  ok((await dialog(page).getByRole('radio').count()) === 5, 'fee has 5 options ("It varies" removed)');
  await cont(page).click();
  ok(await dialog(page).getByText('Choose one to continue.').isVisible(), 'required single → error');
  await dialog(page).getByText('$150 to $250').click();
  await wait(600);
  ok((await heading(page).textContent()).startsWith('How do couples usually pay'), 'Q7 pay');
  await dialog(page).getByText('A mix').click();
  await wait(600);

  ok((await heading(page).textContent()).startsWith("What's hardest"), 'Q8 hardest');
  ok(await dialog(page).getByText('Pick two. 0 of 2 chosen.').isVisible(), 'helper + count on one line');
  await cont(page).click();
  ok(await dialog(page).getByText('Choose at least one to continue.').isVisible(), 'empty multi → error');
  await dialog(page).getByRole('checkbox', { name: 'Notes and admin' }).click();
  await dialog(page).getByRole('checkbox', { name: 'Something else' }).click();
  ok(await dialog(page).getByText('Pick two. 2 of 2 chosen.').isVisible(), 'count updates');
  ok(await dialog(page).getByRole('checkbox', { name: 'Couples dropping out early' }).isDisabled(), 'third option disabled at max');
  ok(await dialog(page).getByLabel('Something else, in your words').isVisible(), '"Something else" reveals text box');
  await cont(page).click();
  ok(await dialog(page).getByText('Tell us what else, in a few words.').isVisible(), 'empty "something else" → error');
  await dialog(page).getByLabel('Something else, in your words').fill('Scheduling across time zones');
  await shot(page, '06-therapist-multi');
  await cont(page).click();
  await wait(250);

  ok((await heading(page).textContent()).startsWith('How did you hear'), 'Q9 source');
  ok(await dialog(page).getByText('If a colleague already using Dova sent you').isVisible(), 'referral description');
  ok(await cont(page, /^skip$/i).isVisible(), 'last optional → "Skip" when empty');
  await page.keyboard.type('Dr. Grace Hopper');
  ok(await cont(page, /^finish$/i).isVisible(), 'last question → "Finish"');
  ok((await page.getByTestId('progress').evaluate((el) => el.style.width)) === '89%', 'progress bar at 8/9');

  // Back keeps answers.
  await dialog(page).getByRole('button', { name: 'Back' }).click();
  await wait(250);
  ok(await dialog(page).getByRole('checkbox', { name: 'Notes and admin' }).getAttribute('aria-checked') === 'true', 'Back keeps previous answers');
  await cont(page).click();
  await wait(250);

  await cont(page, /^finish$/i).click();
  await dialog(page).getByText('You’re on the list.').waitFor();
  ok(await page.evaluate(() => document.getAnimations().length >= 5), 'success animation runs (card, badge, tick, text, actions)');
  await wait(1100);
  ok(await dialog(page).getByText('Dova onboards new therapists in small groups.', { exact: false }).isVisible(), 'therapist done copy');
  await shot(page, '07-therapist-done');
  const p = posts[0];
  ok(p && p.flow === 'therapists' && p.answers.name === 'Ada Lovelace' && p.answers.email === 'ada@nope.com'
    && p.answers.country === 'United States' && p.answers.state === 'California' && p.answers.years === '6 to 10 years'
    && p.answers.caseload === '8' && p.answers.hardest.length === 2 && p.answers.hardest_other === 'Scheduling across time zones'
    && p.answers.source === 'Dr. Grace Hopper', `submitted payload correct ${JSON.stringify(p)}`);
  await dialog(page).getByRole('button', { name: 'Close' }).last().click();
  ok(!(await dialog(page).isVisible()), 'Close returns to splash');
  ok(errors.length === 0, `no console errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── 3. Couples flow, with therapist referral ───────────────── */
console.log('Couples flow');
{
  const { ctx, page, errors, posts } = await open({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'For couples' }).click();
  await wait(300);
  ok((await heading(page).textContent()) === 'Coaching that comes home with you', 'intro title');
  await dialog(page).getByRole('button', { name: /join the waitlist/i }).click();
  await wait(250);
  await page.keyboard.type('Sam'); await page.keyboard.press('Enter'); await wait(250);
  await page.keyboard.type('sam@example.com'); await page.keyboard.press('Enter'); await wait(250);
  await pickFromSelect(page, 'Country', 'ireland', 'Ireland');
  await cont(page).click(); await wait(250);
  ok((await heading(page).textContent()).startsWith('Are you working with a couples therapist'), 'Q4 therapist');
  await dialog(page).getByText('Yes', { exact: true }).click();
  await wait(600);
  ok((await heading(page).textContent()) === 'Would you like Dova to reach out to them?', 'referral appears after "Yes"');
  await dialog(page).getByText("Yes, here's their name and email").click();
  await cont(page).click();
  ok(await dialog(page).getByText('Add their name, or choose "Not yet".').isVisible(), 'referral needs name');
  await dialog(page).getByRole('textbox', { name: 'Their name' }).fill('Dr. Lee');
  await dialog(page).getByRole('textbox', { name: 'Their email' }).fill('lee@');
  await cont(page).click();
  ok(await dialog(page).getByText("Their email doesn't look right.").isVisible(), 'referral needs valid email');
  await dialog(page).getByRole('textbox', { name: 'Their email' }).fill('lee@clinic.com');
  await shot(page, '08-couples-referral');
  await cont(page).click(); await wait(250);
  ok((await heading(page).textContent()) === 'What are you hoping to work on?', 'Q6 goals');
  for (const g of ['Feeling closer', 'Rebuilding trust', 'Having more fun together']) await dialog(page).getByRole('checkbox', { name: g }).click();
  ok(await dialog(page).getByText('Choose up to three. 3 of 3 chosen.').isVisible(), 'max 3 count');
  ok(await dialog(page).getByRole('checkbox', { name: 'Feeling appreciated and understood' }).isDisabled(), '4th option disabled');
  await cont(page).click(); await wait(250);
  ok(await cont(page, /^skip$/i).isVisible(), 'source optional → Skip');
  await cont(page, /^skip$/i).click();
  await dialog(page).getByText('You’re on the list.').waitFor();
  await wait(1100);
  ok(await dialog(page).getByText('We’ll be in touch soon!').isVisible(), 'couples done copy');
  const p = posts[0];
  ok(p && p.flow === 'couples' && p.answers.referral === 'yes' && p.answers.therapistEmail === 'lee@clinic.com' && p.answers.goals.length === 3 && !('state' in p.answers), `payload correct ${JSON.stringify(p)}`);
  ok(errors.length === 0, `no console errors ${errors.join(' | ')}`);

  // Second run: "No" skips the referral question. Answers were cleared after submitting.
  await dialog(page).getByRole('button', { name: 'Close' }).last().click();
  await page.getByRole('button', { name: 'For couples' }).click(); await wait(300);
  await dialog(page).getByRole('button', { name: /join the waitlist/i }).click(); await wait(250);
  ok((await dialog(page).getByRole('textbox').inputValue()) === '', 'answers cleared after a submission');
  await page.keyboard.type('Kim'); await page.keyboard.press('Enter'); await wait(250);
  await page.keyboard.type('kim@example.com'); await page.keyboard.press('Enter'); await wait(250);
  await pickFromSelect(page, 'Country', 'japan', 'Japan'); await cont(page).click(); await wait(250);
  await dialog(page).getByText('No, looking for one').click(); await wait(600);
  ok((await heading(page).textContent()) === 'What are you hoping to work on?', 'referral skipped when not "Yes"');
  // Esc closes the form.
  await page.keyboard.press('Escape'); await wait(50);
  ok(!(await dialog(page).isVisible()), 'Esc closes the form');
  await ctx.close();
}

/* ── 4. Submission failure ──────────────────────────────────── */
console.log('Submission failure');
{
  const { ctx, page } = await open({ width: 1280, height: 800 });
  await page.route('**/api/waitlist', (r) => r.fulfill({ status: 502, body: '{}' }));
  await page.getByRole('button', { name: 'For couples' }).click(); await wait(300);
  await dialog(page).getByRole('button', { name: /join the waitlist/i }).click(); await wait(250);
  await page.keyboard.type('Pat'); await page.keyboard.press('Enter'); await wait(250);
  await page.keyboard.type('pat@example.com'); await page.keyboard.press('Enter'); await wait(250);
  await pickFromSelect(page, 'Country', 'spain', 'Spain'); await cont(page).click(); await wait(250);
  await dialog(page).getByText('Not sure yet').click(); await wait(600);
  await dialog(page).getByRole('checkbox', { name: 'Feeling closer' }).click(); await cont(page).click(); await wait(250);
  await cont(page, /^skip$/i).click();
  await dialog(page).getByText("We couldn't save your answers.", { exact: false }).waitFor({ timeout: 3000 }).catch(() => {});
  ok(await dialog(page).getByText("We couldn't save your answers.", { exact: false }).isVisible(), 'failed save shows an error and keeps the form');
  await ctx.close();
}

/* ── 5. Mobile ──────────────────────────────────────────────── */
// Heights are the VISIBLE area with the browser bars showing (e.g. iPhone 14 Safari ≈ 390×664, Pixel Chrome ≈ 412×780).
for (const vp of [{ width: 390, height: 844 }, { width: 390, height: 664 }, { width: 412, height: 780 }, { width: 360, height: 560 }, { width: 430, height: 932 }, { width: 320, height: 640 }]) {
  console.log(`Mobile ${vp.width}×${vp.height}`);
  const { ctx, page, errors } = await open(vp);
  await wait(1900);
  const t = await page.getByRole('button', { name: 'For therapists' }).boundingBox();
  const c = await page.getByRole('button', { name: 'For couples' }).boundingBox();
  ok(c.y > t.y && Math.abs(t.width - c.width) < 1, 'CTAs stacked, same width');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll');
  const h1 = await page.locator('h1').boundingBox();
  ok(h1.x + h1.width <= vp.width, `headline fits (${Math.round(h1.x + h1.width)} ≤ ${vp.width})`);
  ok(c.y + c.height <= vp.height - 16, `both buttons fully on screen (bottom ${Math.round(c.y + c.height)} of ${vp.height})`);
  ok(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), 'page fits the screen, no scrolling needed');
  const photo = await page.locator('main img[alt^="A couple"]').boundingBox();
  ok(photo.height > vp.height * 0.55 && photo.height < vp.height * 0.7, `photo scales with screen height (${Math.round(photo.height)}px of ${vp.height})`);
  const fit = await page.evaluate(() => {
    const [l1, l2] = [...document.querySelectorAll('main h1 span')].map((e) => e.getBoundingClientRect());
    const btn = document.querySelector('main .dova-btn').getBoundingClientRect();
    const mark = document.querySelector('main > header img').getBoundingClientRect();
    const mid = (r) => r.left + r.width / 2;
    const size = parseFloat(getComputedStyle(document.querySelector('main h1 span')).fontSize);
    return { size, widest: Math.max(l1.width, l2.width), btn: btn.width, l1mid: mid(l1), l2mid: mid(l2), btnMid: mid(btn), markMid: mid(mark) };
  });
  const capped = fit.size >= vp.height * 0.06 - 0.5;
  ok(capped ? fit.widest <= fit.btn + 1 : Math.abs(fit.widest - fit.btn) <= 3, `headline ${capped ? 'capped by screen height, within' : 'spans'} the button width (${fit.widest.toFixed(1)} vs ${fit.btn.toFixed(1)})`);
  ok([fit.l1mid, fit.l2mid, fit.markMid].every((m) => Math.abs(m - fit.btnMid) < 1.5), 'headline lines and wordmark centred on the buttons');
  const splashMark = await page.locator('main > header img').boundingBox();
  await shot(page, `09-mobile-${vp.width}-splash`);
  await page.getByRole('button', { name: 'For therapists' }).click(); await wait(300);
  const formMark = await dialog(page).locator('header img').boundingBox();
  ok(Math.abs(splashMark.x - formMark.x) < 1 && Math.abs(splashMark.y - formMark.y) < 1, `wordmark stays put splash→form (Δx ${(formMark.x - splashMark.x).toFixed(2)}, Δy ${(formMark.y - splashMark.y).toFixed(2)})`);
  await shot(page, `09b-mobile-${vp.width}-intro`);
  await dialog(page).getByRole('button', { name: /join the waitlist/i }).click(); await wait(250);
  await page.keyboard.type('A B'); await page.keyboard.press('Enter'); await wait(250);
  await page.keyboard.type('a@b.co'); await page.keyboard.press('Enter'); await wait(250);
  await pickFromSelect(page, 'Country', 'united st', 'United States');
  await shot(page, `10-mobile-${vp.width}-location`);
  ok(await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); return d.scrollWidth <= d.clientWidth; }), 'form has no horizontal overflow');
  await cont(page).click(); await wait(250);
  await dialog(page).getByText('15+ years').click(); await wait(600);
  await shot(page, `11-mobile-${vp.width}-question`);
  ok(errors.length === 0, `no console errors ${errors.join(' | ')}`);
  await ctx.close();
}

/* ── 6. Reduced motion ──────────────────────────────────────── */
console.log('Reduced motion');
{
  const { ctx, page } = await open({ width: 1280, height: 800 }, { reducedMotion: 'reduce' });
  await page.waitForSelector('h1');
  const anims = await page.evaluate(() => document.getAnimations().map((a) => [a.effect.getTiming().duration, a.effect.getTiming().delay]));
  ok(anims.length === 6 && anims.every(([d, dl]) => d === 200 && dl === 0), 'entrance becomes a single 200ms fade');
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
