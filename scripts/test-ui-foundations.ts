import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Button, Card } from '@market/ui';
import {
  buttonClassName,
  cardClassName,
  selectClassName,
} from '@market/ui/presentation';

// Actual Astro adapter compilation, isolated from application/auth routing.
const temporaryRoot = resolve('tests/fixtures/ui-component-gallery/.astro');
mkdirSync(temporaryRoot, { recursive: true });
const temporary = mkdtempSync(join(temporaryRoot, 'phase-a-'));
const evidence = resolve(
  'docs/UI_COMPONENTS/evidence',
  `phase-a-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`,
);
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext();
const page = await context.newPage();
const widths = [390, 600, 601, 767, 768, 1280, 1440];
const observations: unknown[] = [];

async function load(id: string, contextName = 'admin') {
  const response = await page.goto(
    `http://127.0.0.1:4343/sample/${contextName}?id=${id}`,
  );
  assert.equal(response?.status(), 200, `${id}/${contextName}`);
  await page.locator('astro-island[ssr]').waitFor({ state: 'detached' });
  await page.locator('.gallery-fieldset').waitFor();
}

try {
  const require = createRequire(import.meta.url);
  const astroRequire = createRequire(require.resolve('astro/package.json'));
  const { transform } = (await import(
    pathToFileURL(astroRequire.resolve('@astrojs/compiler-rs')).href
  )) as typeof import('@astrojs/compiler-rs');
  const source = readFileSync(
    'apps/storefront/src/components/ui/Button.astro',
    'utf8',
  );
  const compiled = transform(source, {
    filename: resolve(
      'apps/storefront/src/components/ui/Button.astro',
    ).replaceAll('\\', '/'),
    internalURL: 'astro/compiler-runtime',
    resultScopedSlot: true,
    resolvePath: (specifier) => specifier,
  });
  const modulePath = join(temporary, 'Button.mjs');
  writeFileSync(
    modulePath,
    ts.transpileModule(compiled.code, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  );
  const { default: AstroButton } = await import(pathToFileURL(modulePath).href);
  const container = await AstroContainer.create();
  const astroSubmit = await container.renderToString(AstroButton, {
    props: { type: 'submit', name: 'intent', value: 'apply' },
    slots: { default: 'Astro apply' },
  });
  const astroDefault = await container.renderToString(AstroButton, {
    slots: { default: 'Astro local action' },
  });
  const astroLoading = await container.renderToString(AstroButton, {
    props: { type: 'submit', loading: true },
    slots: { default: 'Astro working' },
  });
  assert.match(astroDefault, /type="button"/);
  const centralSource = readFileSync(
    'apps/storefront/src/components/CentralAccount.astro',
    'utf8',
  ).replace(
    /(['"])\.\/ui\/Button\.astro\1/g,
    JSON.stringify(pathToFileURL(modulePath).href),
  );
  const centralOptions = {
    filename: 'CentralAccount.astro',
    internalURL: 'astro/compiler-runtime',
    resultScopedSlot: true,
    inlineComponentAssets: true,
    resolvePath: (specifier: string) => specifier,
  };
  const centralCompiled = transform(centralSource, centralOptions);
  const centralPath = join(temporary, 'CentralAccount.mjs');
  writeFileSync(
    centralPath,
    ts.transpileModule(centralCompiled.code, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  );
  const { default: CentralAccount } = await import(
    pathToFileURL(centralPath).href
  );
  const centralMarkup = await container.renderToString(CentralAccount, {
    props: {
      account: {
        profile: {
          firstName: 'Ada',
          lastName: 'Farmer',
          emailAddress: 'ada@example.test',
          emailVerified: false,
          phoneNumber: '+12105550123',
        },
        contexts: { affiliations: [], onboarding: [] },
        preferences: [],
      },
    },
    request: new Request('http://127.0.0.1:4343/__phase_a__/central'),
  });

  let reference: unknown;
  for (const theme of ['base', 'admin', 'storefront', 'customer']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await load('BTN-01', theme);
      const button = page.getByRole('button', {
        name: 'Synthetic action',
        exact: true,
      });
      const style = await button.evaluate((el) => {
        const css = getComputedStyle(el);
        return {
          background: css.backgroundColor,
          color: css.color,
          border: css.borderRadius,
          padding: css.padding,
          minimum: css.minHeight,
        };
      });
      reference ??= style;
      assert.deepEqual(style, reference, `BTN-01 context ${theme}/${width}`);
      const geometry = await button.boundingBox();
      assert.ok(geometry && geometry.height >= 44);
      await button.hover();
      await expect(button).toHaveCSS('background-color', 'rgb(36, 74, 55)');
      const hover = await button.evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        filter: getComputedStyle(el).filter,
      }));
      assert.equal(hover.filter, 'none');
      observations.push({ category: 'BTN', theme, width, style, hover });
      const secondary = page.getByRole('button', {
        name: 'Secondary action',
        exact: true,
      });
      await secondary.hover();
      await expect(secondary).toHaveCSS(
        'background-color',
        'rgb(229, 239, 232)',
      );
    }
  }
  await load('BTN-01', 'admin');
  for (const theme of ['base', 'admin', 'storefront', 'customer']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await load('CRD-01', theme);
      const surfaces = page.locator('.card.ui-card');
      assert.equal(await surfaces.count(), 2);
      const inspectSurface = (index: number) =>
        surfaces.nth(index).evaluate((el) => {
          const css = getComputedStyle(el);
          return {
            radius: css.borderRadius,
            padding: css.padding,
            margin: css.marginBlock,
            background: css.backgroundColor,
            border: css.borderColor,
            shadow: css.boxShadow,
            minWidth: css.minWidth,
          };
        });
      const reactSurface = await inspectSurface(0);
      assert.deepEqual(
        await inspectSurface(1),
        reactSurface,
        `CRD-02 renderer ${theme}/${width}`,
      );
      assert.equal(reactSurface.radius, '10px');
      assert.equal(reactSurface.minWidth, '0px');
      observations.push({ category: 'CRD', theme, width, style: reactSurface });
      if (theme === 'admin' && [390, 1440].includes(width))
        await page.screenshot({
          path: join(evidence, `shared-cards-${width}.png`),
          fullPage: true,
        });
    }
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await load('CRD-04');
    const toggle = page.getByRole('button', {
      name: 'Saved layouts',
      exact: true,
    });
    await toggle.scrollIntoViewIfNeeded();
    const geometry = () =>
      toggle.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const text = el.firstElementChild!.getBoundingClientRect();
        const chevron = el.lastElementChild!.getBoundingClientRect();
        return {
          x: box.x + window.scrollX,
          y: box.y + window.scrollY,
          width: box.width,
          height: box.height,
          leftInset: text.left - box.left,
          rightInset: box.right - chevron.right,
        };
      });
    const before = await geometry();
    assert.ok(before.leftInset >= 12 && before.rightInset >= 12);
    await toggle.hover();
    const after = await geometry();
    for (const key of Object.keys(before) as (keyof typeof before)[])
      assert.ok(
        Math.abs(after[key] - before[key]) < 0.01,
        `CRD-04 hover geometry/${width}/${key}`,
      );
    assert.equal(
      await toggle.evaluate((el) => el.classList.contains('button-disclosure')),
      true,
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'Edit layout', exact: true })
        .evaluate((el) => el.classList.contains('ui-button')),
      true,
    );
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    const contentId = await toggle.getAttribute('aria-controls');
    assert.equal(
      await page.locator(`[id="${contentId}"]`).getAttribute('inert'),
      '',
    );
    await toggle.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    observations.push({ category: 'CRD-04', width, geometry: before });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load('CRD-04');
  await page
    .getByRole('button', { name: 'Saved layouts', exact: true })
    .hover();
  assert.equal(
    await page
      .locator('.market-disclosure-content')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  await page.screenshot({
    path: join(evidence, 'saved-layout-hover.png'),
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await load('BTN-01', 'admin');
  for (const theme of ['base', 'admin', 'storefront', 'customer']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await load('INP-01', theme);
      const input = page.getByLabel('First name');
      const inspect = () =>
        input.evaluate((el) => {
          const css = getComputedStyle(el);
          return {
            background: css.backgroundColor,
            outline: css.outlineStyle,
            shadow: css.boxShadow,
            border: css.borderColor,
            radius: css.borderRadius,
            padding: css.padding,
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          };
        });
      const normal = await inspect();
      await input.click();
      const mouse = await inspect();
      assert.equal(mouse.outline, 'none');
      assert.equal(mouse.shadow, 'none');
      assert.equal(mouse.border, normal.border);
      await input.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const keyboard = await inspect();
      assert.equal(
        await input.evaluate((el) => getComputedStyle(el).textDecorationLine),
        'none',
      );
      assert.equal(
        await input.evaluate((el) => el.matches(':focus-visible')),
        true,
      );
      assert.equal(keyboard.outline, 'none');
      assert.equal(keyboard.border, normal.border);
      assert.notEqual(keyboard.background, normal.background);
      assert.ok(Math.abs(keyboard.width - normal.width) < 0.01);
      assert.ok(Math.abs(keyboard.height - normal.height) < 0.01);
      observations.push({
        category: 'INP',
        theme,
        width,
        normal,
        mouse,
        keyboard,
      });
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await load('INP-01');
  const highContrast = page.getByLabel('First name');
  await highContrast.focus();
  assert.equal(
    await highContrast.evaluate((el) => getComputedStyle(el).forcedColorAdjust),
    'none',
  );
  assert.notEqual(
    await highContrast.evaluate((el) => getComputedStyle(el).backgroundColor),
    await page
      .locator('body')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  await page.screenshot({
    path: join(evidence, 'input-forced-colors.png'),
    fullPage: true,
  });
  await page.emulateMedia({ forcedColors: 'none' });
  await load('INP-02', 'storefront');
  await page.getByLabel('First name').focus();
  assert.equal(
    await page
      .locator('label.field')
      .evaluate((el) => getComputedStyle(el).textDecorationLine),
    'none',
  );
  await page.screenshot({
    path: join(evidence, 'native-input-focus.png'),
    fullPage: true,
  });
  await load('INP-03', 'storefront');
  const otp = page.getByLabel('Verification code digit 1 of 6');
  await otp.click();
  assert.equal(
    await otp.evaluate((el) => getComputedStyle(el).outlineStyle),
    'none',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await otp.focus();
  assert.equal(
    await otp.evaluate((el) => getComputedStyle(el).forcedColorAdjust),
    'none',
  );
  await page.emulateMedia({ forcedColors: 'none' });
  await load('BTN-01', 'admin');
  let selectReference: unknown;
  for (const theme of ['base', 'admin', 'storefront', 'customer']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await load('SEL-03', theme);
      const select = page.getByLabel('Business');
      const style = await select.evaluate((el) => {
        const css = getComputedStyle(el);
        return {
          radius: css.borderRadius,
          border: css.borderColor,
          background: css.backgroundColor,
          padding: css.padding,
          appearance: css.appearance,
          minimum: css.minHeight,
        };
      });
      selectReference ??= style;
      assert.deepEqual(
        style,
        selectReference,
        `SEL-03 context ${theme}/${width}`,
      );
      await select.selectOption('synthetic-b');
      assert.equal(await select.inputValue(), 'synthetic-b');
      observations.push({ category: 'SEL', theme, width, style });
    }
  }
  await load('SEL-03');
  if (await page.evaluate(() => CSS.supports('appearance', 'base-select'))) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['base', 'admin', 'storefront', 'customer']) {
        for (const id of [
          'SEL-01',
          'SEL-02',
          'SEL-03',
          'SEL-04',
          'SEL-05',
          'SEL-06',
        ]) {
          await load(id, theme);
          const select = page.locator('select');
          const indicator = () =>
            select.evaluate((el) => {
              const css = getComputedStyle(el, '::picker-icon');
              return {
                content: css.content,
                width: css.width,
                height: css.height,
                mask: css.maskImage,
                rotate: css.rotate,
                duration: css.transitionDuration,
                property: css.transitionProperty,
              };
            });
          const closed = await indicator();
          assert.equal(
            closed.content,
            '""',
            `${id}/${theme} native triangle removed`,
          );
          assert.equal(closed.width, '16px');
          assert.equal(closed.height, '16px');
          assert.ok(
            decodeURIComponent(closed.mask).includes("d='m4 6 4 4 4-4'"),
          );
          assert.equal(closed.rotate, '0deg');
          assert.equal(closed.duration, '0.18s');
          assert.equal(closed.property, 'rotate');
          const value = await select.inputValue();
          const before = await select.boundingBox();
          await select.click();
          await expect
            .poll(async () => (await indicator()).rotate)
            .toBe('180deg');
          assert.equal(
            await select.evaluate((el) => el.matches(':open')),
            true,
          );
          assert.equal(
            await select.evaluate((el) => getComputedStyle(el).backgroundImage),
            'none',
          );
          const after = await select.boundingBox();
          assert.ok(
            before &&
              after &&
              Math.abs(before.width - after.width) < 0.01 &&
              Math.abs(before.height - after.height) < 0.01,
          );
          observations.push({
            category: 'SEL-chevron',
            id,
            theme,
            width,
            closed,
            open: await indicator(),
          });
          if (id === 'SEL-06' && theme === 'storefront' && width === 390)
            await page.screenshot({
              path: join(evidence, 'select-chevron-native-mobile.png'),
              fullPage: true,
            });
          await select.press('Escape');
          await expect
            .poll(async () => (await indicator()).rotate)
            .toBe('0deg');
          assert.equal(await select.inputValue(), value);
        }
      }
    }
    await load('SEL-03');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(
      await page
        .locator('select')
        .evaluate(
          (el) => getComputedStyle(el, '::picker-icon').transitionDuration,
        ),
      '0s',
    );
    await page.emulateMedia({
      reducedMotion: 'no-preference',
      forcedColors: 'active',
    });
    const contrast = await page.locator('select').evaluate((el) => ({
      icon: getComputedStyle(el, '::picker-icon').backgroundColor,
      surface: getComputedStyle(el).backgroundColor,
      mask: getComputedStyle(el, '::picker-icon').maskImage,
    }));
    assert.notEqual(contrast.icon, contrast.surface);
    assert.notEqual(contrast.mask, 'none');
    await page.screenshot({
      path: join(evidence, 'select-chevron-forced-colors.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.getByLabel('Business').click();
    const nativeOption = page.locator('select option[value="synthetic-a"]');
    await nativeOption.hover();
    assert.equal(
      await nativeOption.evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(246, 249, 246)',
    );
    await page.screenshot({
      path: join(evidence, 'native-select-picker.png'),
      fullPage: true,
    });
    await nativeOption.click();
    assert.equal(await page.getByLabel('Business').inputValue(), 'synthetic-a');
  }
  await load('SEL-07', 'admin');
  const business = page.getByRole('combobox');
  const businessChevron = page.locator(
    '.market-search-select-control > .decorative-chevron',
  );
  await expect(businessChevron).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)',
  );
  await business.click();
  await expect(businessChevron).toHaveCSS(
    'transform',
    'matrix(-1, 0, 0, -1, 0, 0)',
  );
  assert.equal(await businessChevron.getAttribute('fill'), 'none');
  assert.equal(
    await businessChevron.locator('path').getAttribute('d'),
    'm4 6 4 4 4-4',
  );
  assert.equal(
    await businessChevron.evaluate((el) => getComputedStyle(el).pointerEvents),
    'none',
  );
  assert.equal(
    await page.getByRole('option', { name: 'Choose a business' }).count(),
    0,
  );
  await business.fill('Synthetic Garden');
  const garden = page.getByRole('option', {
    name: 'Synthetic Garden',
    exact: true,
  });
  await garden.hover();
  assert.equal(
    await garden.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgb(246, 249, 246)',
  );
  assert.equal(await garden.getAttribute('aria-selected'), 'false');
  assert.notEqual(
    await garden.evaluate((el) => getComputedStyle(el).boxShadow),
    'none',
  );
  await business.press('Enter');
  await business.press('ArrowDown');
  const committed = page.getByRole('option', {
    name: 'Synthetic Garden',
    exact: true,
  });
  assert.equal(await committed.getAttribute('aria-selected'), 'true');
  assert.equal(
    await committed.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgb(229, 239, 232)',
  );
  await business.press('ArrowUp');
  const activeId = await business.getAttribute('aria-activedescendant');
  assert.ok(
    activeId && (await page.locator(`[id="${activeId}"]`).count()) === 1,
  );
  await page.screenshot({
    path: join(evidence, 'combobox-selected-active.png'),
    fullPage: true,
  });
  await business.press('Escape');
  assert.equal(await business.getAttribute('aria-expanded'), 'false');
  await expect(businessChevron).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)',
  );
  await load('SEL-02');
  const status = page.getByLabel('Status');
  assert.equal(
    await status.evaluate((el) => el.classList.contains('ui-select')),
    false,
  );
  await load('BTN-01', 'admin');
  // Capture the actual bundled stylesheet rules, including all ancestor layers.
  const css = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
      .join('\n'),
  );
  const fixture = await context.newPage();
  const react = renderToStaticMarkup(
    createElement(
      Button,
      { variant: 'destructive', type: 'button' },
      'React archive',
    ),
  );
  const cards = renderToStaticMarkup(
    createElement(
      Card,
      { as: 'section', 'aria-label': 'Outer surface' },
      createElement(
        Card,
        { as: 'article', spacing: 'contained', 'aria-label': 'Inner surface' },
        'Nested card content',
      ),
    ),
  );
  const nativeCard = `<ul><li class="${cardClassName({ spacing: 'contained' })}">Native list surface</li></ul>`;
  const anchor = `<a href="http://127.0.0.1:4343/__phase_a__/target" class="${buttonClassName({ variant: 'secondary' })}">Native products</a>`;
  const html = `<!doctype html><html><head><style>${css}</style></head><body class="market-dashboard"><div class="admin-shell"><main class="admin-content"><div class="ops-workspace"><form method="get" action="http://127.0.0.1:4343/__phase_a__/submitted"><label>Search<input name="q" required value="pears"></label><label>Sort<select class="${selectClassName()}" name="sort"><option value="asc">A to Z</option><option value="desc">Z to A</option></select></label>${astroDefault}${astroLoading}${astroSubmit}</form>${react}${anchor}${cards}${nativeCard}<p id="target">Target</p></div></main></div></body></html>`;
  // Requests are fulfilled locally by Playwright. No API, transaction or gallery guard changes.
  await context.route('http://127.0.0.1:4343/__phase_a__/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: route.request().url().endsWith('/central')
        ? `<!doctype html><html><head><style>${css}</style></head><body>${centralMarkup}</body></html>`
        : html,
    }),
  );
  await fixture.goto('http://127.0.0.1:4343/__phase_a__/form');
  await fixture.getByRole('button', { name: 'Astro local action' }).click();
  assert.equal(new URL(fixture.url()).pathname, '/__phase_a__/form');
  assert.equal(
    await fixture.getByRole('button', { name: 'Astro working' }).isDisabled(),
    true,
  );
  await fixture.getByRole('button', { name: 'Astro apply' }).focus();
  await fixture.getByLabel('Sort').selectOption('desc');
  await fixture.getByRole('button', { name: 'Astro apply' }).focus();
  await fixture.keyboard.press('Enter');
  await fixture.waitForURL('**/__phase_a__/submitted?**');
  assert.deepEqual(Object.fromEntries(new URL(fixture.url()).searchParams), {
    q: 'pears',
    sort: 'desc',
    intent: 'apply',
  });
  await fixture.getByRole('link', { name: 'Native products' }).click();
  await fixture.waitForURL('**/__phase_a__/target');
  assert.equal(
    await fixture
      .getByRole('article', { name: 'Inner surface' })
      .evaluate((el) => getComputedStyle(el).marginBlock),
    '0px',
  );
  await fixture
    .getByRole('article', { name: 'Inner surface' })
    .evaluate((el) => {
      el.textContent = 'Long nested content '.repeat(20);
    });
  await fixture.locator('body').evaluate((el) => {
    el.style.zoom = '2';
  });
  const inner = await fixture
    .getByRole('article', { name: 'Inner surface' })
    .boundingBox();
  const outer = await fixture
    .getByRole('region', { name: 'Outer surface' })
    .boundingBox();
  assert.ok(inner && outer && inner.width < outer.width);
  await fixture.screenshot({
    path: join(evidence, 'native-astro-buttons.png'),
    fullPage: true,
  });
  const accountRequests: string[] = [];
  await context.route('http://127.0.0.1:4343/api/account', (route) => {
    accountRequests.push(route.request().postData() ?? '');
    return route.fulfill({
      contentType: 'text/html',
      body: '<p>Mocked account response</p>',
    });
  });
  await fixture.goto('http://127.0.0.1:4343/__phase_a__/central');
  assert.equal(await fixture.locator('button:not([type="submit"])').count(), 0);
  await fixture.getByRole('button', { name: 'Save personal profile' }).click();
  await fixture.waitForURL('**/api/account');
  assert.deepEqual(
    Object.fromEntries(new URLSearchParams(accountRequests[0])),
    { action: 'updateProfile', firstName: 'Ada', lastName: 'Farmer' },
  );
  await fixture.goto('http://127.0.0.1:4343/__phase_a__/central');
  await fixture.getByRole('button', { name: 'Sign out', exact: true }).click();
  await fixture.waitForURL('**/api/account');
  assert.deepEqual(
    Object.fromEntries(new URLSearchParams(accountRequests[1])),
    { action: 'logout' },
  );
  await fixture.close();
  writeFileSync(
    join(evidence, 'computed-styles.json'),
    JSON.stringify(observations, null, 2) + '\n',
  );
  console.log(
    `Phase A browser checks passed: Edge, seven widths, four CSS contexts, actual Astro SSR adapter, native GET/submitter/sort and anchor navigation, input/OTP focus and forced colors, native/combobox selection, shared React/native cards, nested cards at 200% CSS zoom, saved-layout hover geometry/keyboard/inert/reduced motion. Evidence: ${evidence}`,
  );
} finally {
  await browser.close();
  assert.ok(temporary.startsWith(temporaryRoot + sep));
  rmSync(temporary, { recursive: true, force: true });
}
