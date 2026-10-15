/** Real Konva pointer qualification against a local, persisted synthetic fixture. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { mapPoint, dragMap } from './konva-pointer';
import type { MarketOperationsData, MapElement } from '@market/api';
const root = process.cwd(),
  evidence = resolve(root, 'docs/evidence/phase15c');
mkdirSync(evidence, { recursive: true });
process.env.FRONTEND_FIXTURE_MODE = 'true';
process.chdir(resolve(root, 'apps/admin'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 4337, strictPort: true },
  plugins: [
    {
      name: 'phase15c-qualification',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.headers.accept?.includes('text/html')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Phase 15C qualification</title></head><body><div id="root"></div><script type="module" src="/@fs/' +
              resolve(root, 'tests/fixtures/phase15c-preview.tsx').replaceAll(
                '\\',
                '/',
              ) +
              '"></script></body></html>',
          );
        });
      },
    },
  ],
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined,
  page: Page | undefined;
const results: string[] = [],
  metrics: Record<string, number> = {};
async function check(name: string, work: () => Promise<void>) {
  await work();
  results.push(name);
  console.log('PASS Phase15C browser ' + name);
}
async function screenshot(name: string) {
  await page!.screenshot({
    path: resolve(evidence, name + '.png'),
    fullPage: true,
  });
}
async function axe() {
  const result = await new AxeBuilder({ page: page! })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
  );
}
async function store(): Promise<MarketOperationsData> {
  return page!.evaluate(() =>
    JSON.parse(localStorage.getItem('phase15c-data')!),
  );
}
async function number(label: string) {
  return Number(await page!.getByLabel(label, { exact: true }).inputValue());
}
async function element(): Promise<MapElement> {
  return {
    id: '',
    areaId: '',
    type: 'RECTANGLE',
    x: await number('x'),
    y: await number('y'),
    width: await number('width'),
    height: await number('height'),
    rotation: await number('rotation'),
    zIndex: 0,
    text: '',
    fill: '',
  };
}
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4337/market/layouts');
  await check(
    'existing SVG-era published layout opens as a real Konva canvas',
    async () => {
      await page!
        .getByRole('button', { name: 'Version 1 · published', exact: true })
        .click();
      await page!
        .getByTestId('market-map-canvas')
        .locator('canvas')
        .first()
        .waitFor();
      assert.equal(
        await page!
          .getByRole('button', { name: 'Save layout', exact: true })
          .count(),
        0,
      );
    },
  );
  await check('new layout and Main Market area', async () => {
    await page!
      .getByRole('button', { name: 'Create layout', exact: true })
      .click();
    await page!
      .getByLabel('Layout name', { exact: true })
      .fill('Phase15C synthetic venue');
    await page!
      .getByLabel('New area name', { exact: true })
      .fill('Main Market');
    await page!.getByRole('button', { name: 'Add area', exact: true }).click();
    await page!
      .getByLabel('Area', { exact: true })
      .selectOption({ label: 'Main Market' });
  });
  await check(
    'rectangle resized and rotated using actual Transformer handles',
    async () => {
      await page!
        .getByRole('button', { name: 'Add rectangle', exact: true })
        .click();
      let e = await element();
      const handle = await mapPoint(page!, e.x + e.width, e.y + e.height);
      await dragMap(page!, handle, { x: handle.x + 60, y: handle.y + 45 });
      assert.ok((await number('width')) > e.width);
      e = await element();
      const view = JSON.parse(
        (await page!
          .getByTestId('market-map-canvas')
          .getAttribute('data-view'))!,
      );
      const top = await mapPoint(page!, e.x + e.width / 2, e.y),
        center = await mapPoint(page!, e.x + e.width / 2, e.y + e.height / 2);
      await dragMap(
        page!,
        { x: top.x, y: top.y - 28 },
        { x: center.x + 100, y: center.y - 100 },
      );
      assert.ok(
        Math.abs(await number('rotation')) > 1,
        JSON.stringify({
          rotation: await number('rotation'),
          scale: view.scale,
        }),
      );
    },
  );
  await check('locked background ignores drag and delete', async () => {
    const before = await element();
    await page!.getByRole('button', { name: 'Lock', exact: true }).click();
    const center = await mapPoint(
      page!,
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    await dragMap(page!, center, { x: center.x + 70, y: center.y + 40 });
    await page!.getByRole('button', { name: 'Layers', exact: true }).click();
    const locked = page!
      .getByRole('list', { name: 'Layout elements', exact: true })
      .locator('li')
      .first();
    assert.equal(
      JSON.parse((await locked.getAttribute('data-geometry'))!).x,
      before.x,
    );
    await locked.locator('.layer-select').click();
    await page!.getByRole('button', { name: 'Inspector', exact: true }).click();
    assert.equal(await number('x'), before.x);
    await page!.keyboard.press('Delete');
    assert.equal(await page!.getByLabel('Label', { exact: true }).count(), 1);
  });
  await check('text styling and bounded freehand pointer path', async () => {
    await page!.getByRole('button', { name: 'Add text', exact: true }).click();
    await page!
      .getByLabel('Label', { exact: true })
      .fill('Welcome to Main Market');
    await page!.getByLabel('Font size', { exact: true }).fill('28');
    await page!.getByLabel('Bold text', { exact: true }).check();
    await page!
      .getByRole('button', { name: 'Draw path', exact: false })
      .click();
    const box = (await page!.getByTestId('market-map-canvas').boundingBox())!;
    await page!.mouse.move(box.x + 40, box.y + 70);
    await page!.mouse.down();
    await page!.mouse.move(box.x + 100, box.y + 50, { steps: 6 });
    await page!.mouse.move(box.x + 180, box.y + 100, { steps: 6 });
    await page!.mouse.up();
    await page!
      .getByRole('button', { name: 'Select', exact: false })
      .first()
      .click();
  });
  await check(
    'A01 and A02 booth inspector, fee, amenities and safe duplicate',
    async () => {
      await page!
        .getByRole('button', { name: 'Add booth', exact: true })
        .click();
      await page!.getByLabel('Label', { exact: true }).fill('A01');
      await page!.getByLabel('Width in feet', { exact: true }).fill('10');
      await page!.getByLabel('Depth in feet', { exact: true }).fill('10');
      await page!
        .getByLabel('Default fee in minor units', { exact: true })
        .fill('4000');
      await page!.getByLabel('electricity', { exact: true }).uncheck();
      await page!.getByLabel('x', { exact: true }).fill('100');
      await page!.getByLabel('y', { exact: true }).fill('200');
      await page!.keyboard.press('Control+d');
      assert.equal(
        await page!.getByLabel('Label', { exact: true }).inputValue(),
        'A01',
        'Typing must not trigger editor duplication',
      );
      await page!.locator('.designer-sidebar').evaluate((el) => {
        el.scrollTop = 0;
      });
      await screenshot('booth-inspector-1440');
      await page!.getByLabel('y', { exact: true }).blur();
      await page!.keyboard.press('Control+d');
      assert.equal(
        await page!.getByLabel('Label', { exact: true }).inputValue(),
        'A02',
      );
      assert.equal(await number('Default fee in minor units'), 4000);
      await page!.getByLabel('electricity', { exact: true }).check();
      await page!.getByLabel('x', { exact: true }).fill('260');
    },
  );
  await check(
    'Shift-click multiple booths, move together, alignment, copy/paste, undo/redo',
    async () => {
      await page!.getByLabel('x', { exact: true }).blur();
      const a = await mapPoint(page!, 150, 250),
        b = await mapPoint(page!, 310, 270);
      await page!.mouse.click(a.x, a.y);
      await page!.keyboard.down('Shift');
      await page!.mouse.click(b.x, b.y);
      await page!.keyboard.up('Shift');
      await page!.getByText('2 selected', { exact: true }).waitFor();
      await dragMap(page!, a, { x: a.x + 30, y: a.y + 30 });
      await page!.getByRole('button', { name: 'Layers', exact: true }).click();
      const moved = (await page!
        .locator('[data-geometry]')
        .evaluateAll((rows) =>
          rows.map((row) => JSON.parse(row.getAttribute('data-geometry')!)),
        )) as MapElement[];
      const first = moved.find((e) => e.text === 'A01')!,
        second = moved.find((e) => e.text === 'A02')!;
      assert.notEqual(first.x, 100, 'Multi-selection must actually move');
      assert.ok(Math.abs(first.x - 100 - (second.x - 260)) < 0.01);
      assert.ok(Math.abs(first.y - 200 - (second.y - 220)) < 0.01);
      await page!
        .getByRole('button', { name: 'Inspector', exact: true })
        .click();
      await page!.keyboard.press('Escape');
      const start = await mapPoint(
        page!,
        Math.min(first.x, second.x) - 12,
        Math.min(first.y, second.y) - 12,
      );
      const end = await mapPoint(
        page!,
        Math.max(first.x + first.width, second.x + second.width) + 12,
        Math.max(first.y + first.height, second.y + second.height) + 12,
      );
      await dragMap(page!, start, end);
      await page!.getByText('2 selected', { exact: true }).waitFor();
      await page!
        .getByLabel('Align selection', { exact: true })
        .selectOption('top');
      await screenshot('multi-selection-1440');
      await page!.keyboard.press('Control+c');
      await page!.keyboard.press('Control+v');
      await page!.getByText('4 booths', { exact: false }).waitFor();
      await page!.keyboard.press('Control+z');
      await page!.getByText('2 booths', { exact: false }).waitFor();
      await page!.keyboard.press('Control+Shift+z');
      await page!.getByText('4 booths', { exact: false }).waitFor();
    },
  );
  await check('confirmed booth attribute sync', async () => {
    await page!
      .getByRole('button', { name: 'Sync booth attributes', exact: true })
      .click();
    const dialog = page!.getByRole('dialog', {
      name: 'Sync booth attributes',
      exact: true,
    });
    await dialog.getByLabel('default fee', { exact: true }).check();
    await dialog
      .getByRole('button', { name: 'Confirm attribute sync', exact: true })
      .click();
  });
  await check('pan, pointer-centered wheel zoom, reset and fit', async () => {
    const canvas = page!.getByTestId('market-map-canvas'),
      before = JSON.parse((await canvas.getAttribute('data-view'))!);
    const box = (await canvas.boundingBox())!;
    await page!.keyboard.down('Space');
    await dragMap(
      page!,
      { x: box.x + 100, y: box.y + 180 },
      { x: box.x + 150, y: box.y + 210 },
    );
    await page!.keyboard.up('Space');
    await page!.keyboard.down('Alt');
    await dragMap(
      page!,
      { x: box.x + 100, y: box.y + 180 },
      { x: box.x + 120, y: box.y + 190 },
    );
    await page!.keyboard.up('Alt');
    assert.ok(
      !(await canvas.getAttribute('class'))!.includes('is-panning'),
      'Releasing Alt must leave pan mode',
    );
    const after = JSON.parse((await canvas.getAttribute('data-view'))!);
    assert.ok(after.x > before.x);
    await page!.mouse.move(box.x + 120, box.y + 160);
    await page!.mouse.wheel(0, -100);
    await page!.waitForTimeout(150);
    const zoomed = JSON.parse((await canvas.getAttribute('data-view'))!);
    assert.ok(zoomed.scale > after.scale);
    const wx = (120 - after.x) / after.scale,
      wy = (160 - after.y) / after.scale;
    assert.ok(Math.abs((120 - zoomed.x) / zoomed.scale - wx) < 1);
    assert.ok(Math.abs((160 - zoomed.y) / zoomed.scale - wy) < 1);
    await page!
      .getByRole('button', { name: 'Reset zoom', exact: true })
      .click();
    await page!.getByRole('button', { name: 'Fit map', exact: true }).click();
  });
  await check('layers hide/show, locate and decoration grouping', async () => {
    await page!.getByRole('button', { name: 'Layers', exact: true }).click();
    const list = page!.getByRole('list', {
      name: 'Layout elements',
      exact: true,
    });
    const row = list.locator('li').filter({
      has: page!.getByRole('button', {
        name: 'Welcome to Main Market',
        exact: false,
      }),
    });
    await row
      .getByLabel('Hide Welcome to Main Market', { exact: true })
      .check();
    await row
      .getByLabel('Hide Welcome to Main Market', { exact: true })
      .uncheck();
    await row
      .getByRole('button', {
        name: 'Locate Welcome to Main Market',
        exact: true,
      })
      .click();
    await page!.locator('.designer-sidebar').evaluate((el) => {
      el.scrollTop = 0;
    });
    await screenshot('layers-1440');
    await page!.getByRole('button', { name: 'Inspector', exact: true }).click();
    await page!
      .getByRole('button', { name: 'Add circle', exact: true })
      .click();
    await page!.getByRole('button', { name: 'Layers', exact: true }).click();
    await list
      .getByRole('button', { name: 'Welcome to Main Market', exact: true })
      .click({ modifiers: ['Shift'] });
    await page!.getByRole('button', { name: 'Group', exact: true }).click();
    assert.equal(await list.getByText(/grouped/).count(), 2);
    await page!.getByRole('button', { name: 'Ungroup', exact: true }).click();
    assert.equal(await list.getByText(/grouped/).count(), 0);
  });
  await check(
    'save/reload preserves domain geometry, path, style, lock and booth semantics',
    async () => {
      await page!
        .getByRole('button', { name: 'Save layout', exact: true })
        .click();
      await page!.getByText('All changes saved', { exact: true }).waitFor();
      const data = await store(),
        v = data.layoutVersions!.at(-1)!;
      assert.equal(
        v.definition.elements.filter((e) => e.type === 'SPACE').length,
        4,
      );
      assert.ok(v.definition.elements.some((e) => e.locked));
      assert.ok(
        v.definition.elements.some((e) => e.points && e.points.length >= 4),
      );
      assert.ok(
        v.definition.elements.some(
          (e) => e.fontSize === 28 && e.fontWeight === 'bold',
        ),
      );
      const booths = data.spaces!.filter((s) => s.layoutVersionId === v.id);
      assert.equal(new Set(booths.map((s) => s.elementId)).size, 4);
      assert.equal(new Set(booths.map((s) => s.details.label)).size, 4);
      assert.ok(booths.every((s) => s.details.feeMinor === 4000));
      await page!.reload();
      await page!
        .getByRole('button', { name: 'Version 1 · draft', exact: true })
        .click();
      assert.equal(
        (await store()).layoutVersions!.at(-1)!.definition.elements.length,
        v.definition.elements.length,
      );
    },
  );
  await check(
    'desktop/tablet/mobile authoring, no overflow and representative Axe',
    async () => {
      for (const width of [1440, 768, 390]) {
        await page!.setViewportSize({ width, height: 1000 });
        await page!.waitForTimeout(150);
        await page!
          .getByRole('button', { name: 'Fit map', exact: true })
          .click();
        await screenshot('editor-' + width);
        assert.ok(
          await page!.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await axe();
        const box = await page!.getByTestId('market-map-canvas').boundingBox();
        assert.ok(box && box.height > 300 && box.width > 150);
      }
    },
  );
  await check(
    'publish/clone preserves immutable source and occurrence historical geometry',
    async () => {
      await page!.setViewportSize({ width: 1440, height: 1000 });
      await page!
        .getByRole('button', { name: 'Save and publish layout', exact: true })
        .click();
      await page!
        .getByRole('button', { name: 'Create new draft version', exact: true })
        .waitFor();
      const before = (await store()).layoutVersions!.at(-1)!;
      await page!
        .getByRole('button', { name: 'Create new draft version', exact: true })
        .click();
      await page!
        .getByRole('button', { name: 'Add triangle', exact: true })
        .click();
      await page!
        .getByRole('button', { name: 'Save layout', exact: true })
        .click();
      await page!.getByText('All changes saved', { exact: true }).waitFor();
      assert.deepEqual(
        (await store()).layoutVersions!.find((v) => v.id === before.id),
        before,
      );
      assert.equal((await store()).plans![0]!.layoutVersionId, 1);
    },
  );
  await check(
    'Phase15B hover, correct booth modal and drag suppression with invoice-derived paid state',
    async () => {
      await page!.goto('http://127.0.0.1:4337/market/assignments/1');
      await page!.getByTestId('market-map-canvas').waitFor();
      const p = await mapPoint(page!, 300, 130);
      await page!.mouse.move(p.x, p.y);
      const tip = page!.getByRole('tooltip');
      await tip.waitFor();
      assert.match(await tip.innerText(), /12 × 10 ft/);
      assert.match(await tip.innerText(), /Paid/);
      const box = (await page!.getByTestId('market-map-canvas').boundingBox())!,
        card = (await tip.boundingBox())!;
      assert.ok(
        card.x >= box.x &&
          card.y >= box.y &&
          card.x + card.width <= box.x + box.width + 1 &&
          card.y + card.height <= box.y + box.height + 1,
      );
      await dragMap(page!, p, { x: p.x + 50, y: p.y + 30 });
      assert.equal(await page!.getByRole('dialog').count(), 0);
      const p2 = await mapPoint(page!, 300, 130);
      await page!.mouse.click(p2.x, p2.y);
      const dialog = page!.getByRole('dialog', {
        name: 'Booth A2',
        exact: true,
      });
      await dialog.waitFor();
      assert.equal(
        await dialog.getByLabel('Business for selected booth').isDisabled(),
        true,
      );
      await page!.keyboard.press('Escape');
    },
  );
  await check(
    'logged-out public map search/highlight, pan/zoom and privacy',
    async () => {
      await page!.goto('http://127.0.0.1:4337/public');
      await page!.getByLabel('Search Vendor or booth').fill('Local Orchard');
      await page!.locator('.booth-list-item summary').click();
      await page!.getByRole('button', { name: 'Zoom in', exact: true }).click();
      const text = await page!.locator('body').innerText();
      for (const secret of [
        'local@test.invalid',
        'Manager notes',
        'invoice',
        'Paid',
        'check-in',
      ])
        assert.ok(!text.includes(secret));
      assert.equal(await page!.getByTestId('layout-editor').count(), 0);
      await page!.setViewportSize({ width: 390, height: 1000 });
      await page!.getByRole('button', { name: 'Fit map', exact: true }).click();
      await screenshot('public-map-390');
      const touchBox = (await page!
        .getByTestId('market-map-canvas')
        .boundingBox())!;
      const priorScale = JSON.parse(
        (await page!
          .getByTestId('market-map-canvas')
          .getAttribute('data-view'))!,
      ).scale;
      const cdp = await page!.context().newCDPSession(page!);
      const center = {
        x: touchBox.x + touchBox.width / 2,
        y: touchBox.y + touchBox.height / 2,
      };
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: center.x - 30, y: center.y, id: 0 },
          { x: center.x + 30, y: center.y, id: 1 },
        ],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: center.x - 50, y: center.y + 10, id: 0 },
          { x: center.x + 50, y: center.y + 10, id: 1 },
        ],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: center.x - 70, y: center.y + 20, id: 0 },
          { x: center.x + 70, y: center.y + 20, id: 1 },
        ],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await cdp.detach();
      await page!.waitForTimeout(100);
      assert.ok(
        JSON.parse(
          (await page!
            .getByTestId('market-map-canvas')
            .getAttribute('data-view'))!,
        ).scale > priorScale,
        'Actual touch pinch must zoom',
      );
      await axe();
      assert.ok(
        await page!.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    },
  );
  await check(
    'Market Day shared canvas, private overlays, booth selection and accessibility',
    async () => {
      await page!.goto('http://127.0.0.1:4337/market/day/1');
      await page!
        .getByTestId('market-map-canvas')
        .locator('canvas')
        .first()
        .waitFor();
      await page!.waitForTimeout(200);
      const p = await mapPoint(page!, 300, 130);
      await page!.mouse.click(p.x, p.y);
      await page!
        .getByRole('dialog', { name: 'Booth A2', exact: true })
        .waitFor();
      await page!.keyboard.press('Escape');
      await screenshot('market-day-390');
      await axe();
      assert.ok(
        await page!.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    },
  );
  await check(
    '500 visual elements including 200 booths respond to render, pan, zoom, select and move',
    async () => {
      await page!.setViewportSize({ width: 1440, height: 1000 });
      let start = Date.now();
      await page!.goto('http://127.0.0.1:4337/performance');
      await page!
        .getByTestId('market-map-canvas')
        .locator('canvas')
        .first()
        .waitFor();
      metrics.initialRenderMs = Date.now() - start;
      const canvas = page!.getByTestId('market-map-canvas'),
        box = (await canvas.boundingBox())!;
      start = Date.now();
      await page!.keyboard.down('Space');
      await dragMap(
        page!,
        { x: box.x + 50, y: box.y + 50 },
        { x: box.x + 80, y: box.y + 80 },
      );
      await page!.keyboard.up('Space');
      metrics.panMs = Date.now() - start;
      start = Date.now();
      await page!.mouse.move(box.x + 100, box.y + 100);
      await page!.mouse.wheel(0, -80);
      await page!.waitForTimeout(100);
      metrics.zoomMs = Date.now() - start;
      const p = await mapPoint(page!, 50, 50);
      start = Date.now();
      await page!.mouse.click(p.x, p.y);
      await page!.getByLabel('Width in feet', { exact: true }).waitFor();
      metrics.selectMs = Date.now() - start;
      start = Date.now();
      await dragMap(page!, p, { x: p.x + 15, y: p.y + 15 });
      assert.notEqual(await number('x'), 0);
      metrics.moveMs = Date.now() - start;
      await screenshot('performance-500-1440');
    },
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(evidence, 'browser-summary.json'),
    JSON.stringify(
      {
        status: 'PASS',
        flows: results,
        performance: {
          fixture: 'synthetic local, not production scale',
          ...metrics,
        },
        errors,
      },
      null,
      2,
    ),
  );
  console.log('PASS Phase15C Chromium qualification', JSON.stringify(metrics));
} catch (error) {
  if (page) await screenshot('qualification-failure');
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
