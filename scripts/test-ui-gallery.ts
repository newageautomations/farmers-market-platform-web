import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  candidatesForCategory,
  categories,
  readCandidates,
} from '../tests/fixtures/ui-component-gallery/candidates';
import {
  additionalCandidates,
  additionalCategoryCounts,
} from '../tests/fixtures/ui-component-gallery/additional-candidates';
import { galleryUrl } from './ui-gallery-policy';

// Start the explicit launcher separately. This harness only talks to loopback.
const response = await fetch(galleryUrl);
assert.equal(response.status, 200);
assert.match(
  response.headers.get('content-security-policy') ?? '',
  /connect-src 'none'/,
);
for (const route of ['/api/account', '/api/shop', '/market', '/account']) {
  for (const method of ['GET', 'POST'])
    assert.ok(
      [403, 404].includes(
        (await fetch(new URL(route, galleryUrl), { method })).status,
      ),
    );
}
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
const requests: string[] = [];
let blockedDevelopmentSockets = 0;
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  // Vite's development client tries HMR even when the fixture disables it.
  // The unchanged CSP rejects this loopback socket. Never relax connect-src.
  if (
    message.text().startsWith("Connecting to 'ws://127.0.0.1:4343/") &&
    message.text().includes('"connect-src \'none\'"')
  ) {
    blockedDevelopmentSockets++;
    return;
  }
  // The browser's implicit favicon request is outside the fixture route allowlist.
  if (
    message.location().url === new URL('favicon.ico', galleryUrl).href &&
    message.text() ===
      'Failed to load resource: the server responded with a status of 404 (Not Found)'
  )
    return;
  errors.push(message.text());
});
context.on('request', (request) => requests.push(request.url()));
// Every run gets its own directory; historical review images remain untouched.
const evidence = resolve(
  'tests/fixtures/ui-component-gallery/review',
  `expanded-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`,
);
mkdirSync(evidence, { recursive: true });
function route(id: string, state = 'default', variant = 'primary') {
  const candidate = readCandidates().find((c) => c.id === id)!;
  const customer =
    candidate.context === 'customer' ||
    ['DSH-02', 'SID-02', 'HDR-02', 'MOB-02'].includes(id);
  return new URL(
    `sample/${customer ? 'customer' : candidate.context}?id=${id}&state=${state}&variant=${variant}`,
    galleryUrl,
  ).href;
}
async function load(id: string, state = 'default', variant = 'primary') {
  const result = await page.goto(route(id, state, variant));
  assert.equal(result?.status(), 200, id);
  await page.locator('astro-island[ssr]').waitFor({ state: 'detached' });
}
try {
  // Every candidate at genuine desktop/mobile viewport sizes, not just container widths.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const candidate of readCandidates()) {
      await load(candidate.id);
      assert.ok(
        (await page.locator('body').innerText()).length > 20,
        candidate.id,
      );
      if (candidate.id.startsWith('SEL-'))
        assert.equal(
          await page.locator('select, [role="combobox"]').count(),
          1,
          candidate.id,
        );
      if (additionalCandidates[candidate.id]) {
        assert.equal(
          await page.locator(`[data-specimen="${candidate.id}"]`).count(),
          1,
          candidate.id,
        );
        assert.equal(
          await page.locator('[data-specimen]').getAttribute('data-rendering'),
          candidate.rendering,
        );
        if (candidate.rendering === 'evidence')
          assert.match(
            await page.locator('[data-evidence-only]').innerText(),
            /LayoutEditor.*Source:.*Route:/s,
          );
        else
          assert.ok(
            (await page
              .locator('[data-specimen]')
              .locator(
                'button, details, span, p, h1, h2, h3, form, table, dl, nav',
              )
              .count()) > 0,
            candidate.id,
          );
      }
    }
  }

  await page.setViewportSize({ width: 1280, height: 1000 });
  await load('BTN-01');
  assert.equal(
    await page
      .locator(
        'link[href*="/apps/admin/"], style[data-vite-dev-id*="/apps/admin/"]',
      )
      .count(),
    0,
    'Base specimen must not load admin CSS',
  );
  const button = page.getByRole('button', {
    name: 'Synthetic action',
    exact: true,
  });
  const background = await button.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await button.hover();
  await page.waitForTimeout(200);
  assert.notEqual(
    await button.evaluate((el) => getComputedStyle(el).backgroundColor),
    background,
  );
  await page.mouse.move(0, 0);
  for (
    let step = 0;
    step < 5 && !(await button.evaluate((el) => el === document.activeElement));
    step++
  )
    await page.keyboard.press('Tab');
  assert.equal(
    await button.evaluate(
      (el) =>
        el === document.activeElement &&
        getComputedStyle(el).outlineStyle !== 'none',
    ),
    true,
  );
  await page.screenshot({
    path: resolve(evidence, 'button-keyboard-focus.png'),
    fullPage: true,
  });
  await load('BTN-01', 'disabled');
  assert.equal(
    await page
      .getByRole('button', { name: 'Synthetic action', exact: true })
      .isDisabled(),
    true,
  );
  await load('BTN-01', 'loading');
  assert.equal(
    await page
      .getByRole('button', { name: 'Simulated working…', exact: true })
      .isDisabled(),
    true,
  );
  await load('INP-01', 'error');
  assert.equal(
    await page.getByLabel('First name').getAttribute('aria-invalid'),
    'true',
  );
  assert.match(await page.getByRole('alert').innerText(), /Simulated/);
  await load('SEL-01', 'selected');
  assert.equal(await page.getByLabel('Business').inputValue(), 'b');
  for (const id of ['SEL-02', 'SEL-03', 'SEL-04', 'SEL-05', 'SEL-07']) {
    await load(id, 'disabled');
    assert.equal(
      await page.locator('select, [role="combobox"]').isDisabled(),
      true,
      id,
    );
  }

  await load('SEL-07');
  const combobox = page.getByRole('combobox');
  await combobox.fill('Synthetic Garden');
  await combobox.press('Enter');
  assert.equal(await combobox.inputValue(), 'Synthetic Garden');
  await combobox.fill('No matching synthetic option');
  await page.getByText('No matching businesses').waitFor({ state: 'visible' });
  assert.equal(
    await page.getByText('No matching businesses').isVisible(),
    true,
  );
  await combobox.press('Escape');
  assert.equal(await combobox.getAttribute('aria-expanded'), 'false');

  for (const id of ['DLG-01', 'DLG-02']) {
    await load(id, 'loading', 'title-focus');
    await page.getByRole('button', { name: `Open ${id}` }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(
      await dialog
        .getByRole('button', { name: 'Close', exact: true })
        .isDisabled(),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), true);
    await dialog.getByRole('button', { name: 'End simulated wait' }).click();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(
      await page
        .getByRole('button', { name: `Open ${id}` })
        .evaluate((el) => el === document.activeElement),
      true,
    );
  }
  await load('DLG-01', 'default', 'drawer');
  await page.getByRole('button', { name: 'Open DLG-01' }).click();
  assert.equal(await page.getByRole('dialog').getAttribute('class'), 'drawer');
  await page.keyboard.press('Escape');
  await load('DLG-02');
  await page.getByLabel('Local close veto').check();
  await page.getByRole('button', { name: 'Open DLG-02' }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  await page.getByRole('button', { name: 'Release local close veto' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  for (const width of [390, 600, 601, 767, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ['DSH-01', 'DSH-02', 'MOB-01', 'MOB-02']) {
      await load(id);
      const sidebar = page.locator('.admin-sidebar');
      await sidebar.waitFor({ state: width > 600 ? 'visible' : 'hidden' });
      assert.equal(
        await sidebar.isVisible(),
        width > 600,
        `${id} sidebar at ${width}`,
      );
      assert.equal(
        await page.locator('.admin-mobile-nav').isVisible(),
        width <= 600,
        `${id} mobile nav at ${width}`,
      );
      if (id === 'DSH-01' || id === 'MOB-01') {
        assert.equal(
          await page.locator('.market-menu-toggle').isVisible(),
          width >= 768,
          `${id} original market toggle breakpoint`,
        );
      }
      if (width <= 600) {
        // Enter through the real keyboard path before inspecting the summary.
        // AdminShell changes its input-mode context on the first Tab event.
        if (id === 'DSH-01' || id === 'MOB-01') {
          await page.keyboard.press('Tab');
          await page
            .locator('.market-dashboard[data-input-mode="keyboard"]')
            .waitFor();
        }
        await page.locator('.admin-mobile-nav summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(
          await page.locator('.admin-mobile-nav').getAttribute('open'),
          '',
        );
        assert.ok(
          (await page
            .locator('.admin-mobile-nav a[aria-current="page"]')
            .count()) > 0,
          `${id} active navigation`,
        );
        // Market CSS animates native details content before it can receive focus.
        await page.waitForTimeout(350);
        await page.keyboard.press('Tab');
        assert.equal(
          await page
            .locator('.admin-mobile-nav a')
            .first()
            .evaluate((el) => el === document.activeElement),
          true,
          `${id} keyboard navigation`,
        );
        await page.locator('.admin-mobile-nav summary').focus();
        await page.keyboard.press('Space');
        assert.equal(
          await page.locator('.admin-mobile-nav').getAttribute('open'),
          null,
        );
      }
    }
  }
  await page.screenshot({
    path: resolve(evidence, 'customer-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  assert.match(page.url(), /sample\/customer/);
  assert.equal(
    await page.evaluate(async () => {
      try {
        await fetch('/api/account');
        return false;
      } catch {
        return true;
      }
    }),
    true,
  );

  await page.goto(`${galleryUrl}?category=SEL&width=both`);
  assert.equal(
    await page.getByLabel('Category', { exact: true }).inputValue(),
    'SEL',
  );
  assert.equal(
    await page.getByLabel('Frame viewport width').inputValue(),
    'both',
  );
  assert.equal(await page.locator('[data-candidate]').count(), 7);
  const frame = page.frameLocator('iframe[title="SEL-01 at 390px"]');
  await page
    .locator('iframe[title="SEL-01 at 390px"]')
    .scrollIntoViewIfNeeded();
  assert.equal(await frame.locator('body').evaluate(() => innerWidth), 390);
  await page
    .locator('iframe[title="SEL-01 at 1280px"]')
    .scrollIntoViewIfNeeded();
  assert.equal(
    await page
      .frameLocator('iframe[title="SEL-01 at 1280px"]')
      .locator('body')
      .evaluate(() => innerWidth),
    1280,
  );
  await page.getByLabel('Filter candidate IDs or names').fill('SEL-07');
  assert.equal(await page.locator('[data-candidate]:visible').count(), 1);
  await page.getByLabel('Filter candidate IDs or names').fill('');
  await page.getByLabel('Display state').selectOption('disabled');
  await page.waitForURL('**state=disabled');
  assert.match(page.url(), /state=disabled/);
  assert.equal(await page.getByLabel('Display state').inputValue(), 'disabled');
  assert.equal(
    await page.getByLabel('Category', { exact: true }).inputValue(),
    'SEL',
  );
  await page.screenshot({
    path: resolve(evidence, 'gallery-comparison.png'),
    fullPage: true,
  });

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  const nativePage = await noJs.newPage();
  noJs.on('request', (request) => requests.push(request.url()));
  await nativePage.goto(route('DSH-02'));
  await nativePage.locator('.admin-mobile-nav summary').click();
  assert.equal(
    await nativePage.locator('.admin-mobile-nav').getAttribute('open'),
    '',
  );
  await nativePage
    .getByRole('button', { name: 'Sign out' })
    .click({ noWaitAfter: true });
  assert.match(nativePage.url(), /sample\/customer/);
  await noJs.close();

  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const id of ['DDN-01', 'DDN-02', 'DDN-03']) {
    await load(id);
    const toggle =
      id === 'DDN-02'
        ? page.locator('.market-disclosure-toggle')
        : page
            .locator('summary')
            .filter({
              hasText:
                id === 'DDN-03' ? 'Synthetic Orchard' : 'Synthetic disclosure',
            })
            .first();
    const color = await toggle.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await toggle.hover();
    await page.waitForTimeout(200);
    if (id === 'DDN-03')
      assert.notEqual(
        await toggle.evaluate((el) => getComputedStyle(el).backgroundColor),
        color,
        'Actual booth summary hover',
      );
    await page.mouse.move(0, 0);
    await toggle.focus();
    await page.keyboard.press('Enter');
    if (id === 'DDN-02') {
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(
        await page.locator('.market-disclosure-content').getAttribute('inert'),
        null,
      );
    } else
      assert.equal(
        await toggle.evaluate(
          (el) => (el.parentElement as HTMLDetailsElement).open,
        ),
        true,
      );
    await page.keyboard.press('Space');
    if (id === 'DDN-02')
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    else
      assert.equal(
        await toggle.evaluate(
          (el) => (el.parentElement as HTMLDetailsElement).open,
        ),
        false,
      );
  }
  for (const id of ['DDN-02', 'DDN-03']) {
    await load(id, 'expanded');
    assert.equal(
      await page
        .locator(
          id === 'DDN-02' ? '.market-disclosure-toggle' : '.booth-list-item',
        )
        .getAttribute(id === 'DDN-02' ? 'aria-expanded' : 'open'),
      id === 'DDN-02' ? 'true' : '',
    );
  }
  await load('TAB-01');
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
  assert.equal(
    await tabs
      .nth(1)
      .evaluate(
        (el) =>
          el === document.activeElement &&
          getComputedStyle(el).outlineStyle !== 'none',
      ),
    true,
  );
  assert.match(await page.getByRole('tabpanel').innerText(), /orders/);
  await page.keyboard.press('End');
  assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
  await load('TAB-02', 'selected');
  assert.equal(
    await page.locator('link[href*="/designer.css"]').count(),
    1,
    'Original designer CSS is scoped to its selector specimen',
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Layers', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  assert.match(
    await page.locator('[data-simulated-panel]').innerText(),
    /Simulated inspector/,
  );
  assert.equal(
    await page.getByRole('tab').count(),
    0,
    'Designer selector is not a keyboard tablist',
  );

  for (const id of ['PAG-01', 'PAG-02', 'PAG-03']) {
    await load(id);
    const previous = page.getByRole('button', { name: /^Previous/ });
    const next = page.getByRole('button', { name: /^Next/ });
    assert.equal(await previous.isDisabled(), true, id);
    await next.click();
    assert.equal(await previous.isDisabled(), false, id);
    await next.click();
    assert.equal(await next.isDisabled(), true, id);
    await previous.click();
    assert.equal(await next.isDisabled(), false, id);
  }
  for (const id of ['PAG-04', 'PAG-05']) {
    await load(id, 'disabled');
    assert.equal(await page.getByRole('link', { name: /^Next/ }).count(), 0);
    const url = page.url();
    await page.getByRole('link', { name: /^Previous/ }).click();
    assert.equal(page.url().split('#')[0], url);
  }
  for (const id of ['FIL-01', 'FIL-02', 'FIL-03', 'FIL-04', 'FIL-05']) {
    await load(id);
    const url = page.url();
    const form = page.locator('[data-specimen] form').first();
    await form.evaluate((el) => (el as HTMLFormElement).requestSubmit());
    assert.equal(page.url(), url, `${id} submission blocked`);
    assert.equal(
      await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .some((e) => new URL(e.name).pathname.startsWith('/api/')),
      ),
      false,
    );
  }
  for (const id of ['LOD-02', 'LOD-03']) {
    await load(id, 'error');
    assert.equal(await page.getByRole('alert').count(), 1);
    await page
      .getByRole('button', {
        name: id === 'LOD-02' ? 'Refresh records' : 'Try Again',
      })
      .click();
    assert.match(await page.getByRole('status').innerText(), /No request ran/);
  }
  await load('TBL-02', 'selected');
  assert.equal(await page.locator('th[aria-sort="ascending"]').count(), 1);
  assert.equal(await page.getByRole('button', { name: /sort/i }).count(), 0);
  await load('TBL-03');
  assert.equal(
    await page.locator('[data-specimen] form').count(),
    0,
    'Read-only invoice has no command forms',
  );
  assert.equal(await page.getByRole('table').count(), 1);
  await page.setViewportSize({ width: 390, height: 900 });
  await load('TBL-02');
  assert.equal(
    await page
      .locator('.table-scroll')
      .first()
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    true,
  );
  await page.screenshot({
    path: resolve(evidence, 'expanded-table-mobile.png'),
    fullPage: true,
  });

  await page.goto(galleryUrl);
  assert.equal(
    await page.locator('#category option').count(),
    Object.keys(categories).length,
  );
  for (const category of Object.keys(categories)) {
    await page.getByLabel('Category', { exact: true }).selectOption(category);
    await page.waitForURL(
      (url) => url.searchParams.get('category') === category,
    );
    assert.deepEqual(
      await page
        .locator('[data-candidate]')
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute('data-candidate')),
        ),
      candidatesForCategory(category as keyof typeof categories).map(
        (c) => c.id,
      ),
    );
    const first = candidatesForCategory(
      category as keyof typeof categories,
    )[0]!;
    await page.getByLabel('Filter candidate IDs or names').fill(first.id);
    assert.equal(
      await page.locator('[data-candidate]:visible').count(),
      1,
      category,
    );
    await page.getByLabel('Filter candidate IDs or names').fill('');
    assert.equal(
      await page.locator('[data-candidate-details][open]').count(),
      0,
      'Technical details collapsed',
    );
  }
  assert.equal(
    Object.values(additionalCategoryCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
    48,
  );
  await page.goto(`${galleryUrl}?category=DDN&width=390`);
  const disclosureFrame = page.frameLocator('iframe[title="DDN-02 at 390px"]');
  await page
    .locator('iframe[title="DDN-02 at 390px"]')
    .scrollIntoViewIfNeeded();
  await disclosureFrame.locator('.market-disclosure-toggle').click();
  assert.equal(
    await disclosureFrame
      .locator('.market-disclosure-toggle')
      .getAttribute('aria-expanded'),
    'true',
  );
  await page.getByRole('button', { name: 'Reset specimens' }).click();
  await disclosureFrame
    .locator('.market-disclosure-toggle[aria-expanded="false"]')
    .waitFor();
  assert.equal(
    await disclosureFrame.locator('body').evaluate(() => innerWidth),
    390,
  );
  await page.screenshot({
    path: resolve(evidence, 'expanded-disclosures.png'),
    fullPage: true,
  });

  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(route('DDN-02'));
  assert.equal(
    await reducedPage
      .locator('.market-disclosure-content')
      .evaluate(
        (el) => parseFloat(getComputedStyle(el).transitionDuration) <= 0.01,
      ),
    true,
    'Original reduced-motion rule',
  );
  await reduced.close();

  assert.deepEqual(errors, [], 'No component rendering errors');
  const unexpectedRequests = requests.filter((value) => {
    const url = new URL(value);
    return (
      url.origin !== new URL(galleryUrl).origin ||
      url.pathname.startsWith('/api/')
    );
  });
  assert.deepEqual(
    unexpectedRequests,
    [],
    'No external or API requests (API package source modules are static assets)',
  );
  console.log(
    'Gallery browser checks passed: 77 unique IDs, 19 categories, all 48 requested records, desktop/mobile, real focus/hover, disclosures/tabs/local paging, original dialogs/shells, five mobile breakpoints, reset, no-JS customer disclosure, blocked forms and requests.',
  );
  console.log(`Synthetic review images: ${evidence}`);
  console.log(
    `Expected development diagnostics: ${blockedDevelopmentSockets} CSP-blocked loopback HMR attempts; implicit favicon 404 allowed. No unexpected console/runtime errors.`,
  );
} finally {
  await context.close();
  await browser.close();
}
