import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';

const root = process.cwd();
const evidence = resolve(root, 'docs/evidence/occurrence-layouts');
mkdirSync(evidence, { recursive: true });
process.env.FRONTEND_FIXTURE_MODE = 'true';
process.chdir(resolve(root, 'apps/admin'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 4342, strictPort: true },
  plugins: [
    {
      name: 'occurrence-layout-preview',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.headers.accept?.includes('text/html')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Occurrence layout preview</title></head><body><div id="root"></div><script type="module" src="/@fs/${resolve(root, 'tests/fixtures/occurrence-layout-preview.tsx').replaceAll('\\', '/')}"></script></body></html>`,
          );
        });
      },
    },
  ],
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://127.0.0.1:4342');
    await page.getByText('A1 - Orchard Farm', { exact: true }).waitFor();
    const change = page.getByRole('button', {
      name: 'Change layout',
      exact: true,
    });
    const edit = page.getByRole('button', { name: 'Edit layout', exact: true });
    const left = await change.boundingBox();
    const right = await edit.boundingBox();
    assert.ok(
      left && right && right.x > left.x && Math.abs(right.y - left.y) < 2,
    );
    await change.click();
    const picker = page.getByRole('dialog', {
      name: 'Change layout',
      exact: true,
    });
    assert.equal(
      await picker
        .locator('.occurrence-layout-options > .market-disclosure.is-open')
        .count(),
      0,
    );
    await picker.getByText('South Lot', { exact: true }).click();
    const optionHeader = picker
      .locator('.market-disclosure')
      .filter({ hasText: 'South Lot' })
      .locator('.market-disclosure-header');
    const nameBox = await optionHeader
      .locator('.market-disclosure-toggle')
      .boundingBox();
    const selectBox = await optionHeader
      .getByRole('button', { name: 'Select layout', exact: true })
      .boundingBox();
    assert.ok(
      nameBox &&
        selectBox &&
        selectBox.x > nameBox.x &&
        Math.abs(nameBox.y - selectBox.y) < 2,
    );
    assert.match(
      (await optionHeader
        .getByRole('button', { name: 'Select layout', exact: true })
        .getAttribute('class')) ?? '',
      /button/,
    );
    await picker.locator('canvas').first().waitFor();
    assert.deepEqual(
      (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
      [],
    );
    await page.screenshot({ path: resolve(evidence, `picker-${width}.png`) });
    await picker
      .locator('.market-disclosure')
      .filter({ hasText: 'South Lot' })
      .getByRole('button', { name: 'Select layout', exact: true })
      .click();
    await picker.getByText(/erase all booth assignments/).waitFor();
    await picker
      .getByRole('button', { name: 'Keep current layout', exact: true })
      .click();
    await picker.getByRole('button', { name: 'Close', exact: true }).click();
    await picker.waitFor({ state: 'hidden' });
    await edit.click();
    const editor = page.getByTestId('layout-editor');
    await editor.waitFor();
    assert.match(page.url(), /\/market\/assignments\/101\/edit-layout$/);
    assert.equal(await page.locator('.admin-sidebar').isVisible(), false);
    const screenBox = await page.locator('.layout-editor-screen').boundingBox();
    assert.ok(screenBox && screenBox.x < 2 && screenBox.width >= width - 2);
    await editor.getByRole('button', { name: 'Layers', exact: true }).click();
    await editor.getByRole('button', { name: 'A1', exact: true }).click();
    assert.equal(
      await editor
        .getByRole('button', { name: 'Delete', exact: true })
        .isEnabled(),
      false,
    );
    await editor
      .getByRole('button', { name: 'Inspector', exact: true })
      .click();
    await editor.getByLabel('x', { exact: true }).fill('300');
    await page.screenshot({ path: resolve(evidence, `editor-${width}.png`) });
    assert.deepEqual(
      (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
      [],
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await editor
      .getByRole('button', { name: 'Save layout', exact: true })
      .click();
    await editor.getByText('All changes saved', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Back to occurrence' }).click();
    await editor.waitFor({ state: 'hidden' });
    await page.getByText('A1 - Orchard Farm', { exact: true }).waitFor();
    await change.click();
    await picker.getByText('South Lot', { exact: true }).click();
    await picker
      .locator('.market-disclosure')
      .filter({ hasText: 'South Lot' })
      .getByRole('button', { name: 'Select layout', exact: true })
      .click();
    await picker
      .getByRole('button', {
        name: 'Erase map data and change layout',
        exact: true,
      })
      .click();
    await picker.waitFor({ state: 'hidden' });
    await page.locator('summary').filter({ hasText: /^A1/ }).waitFor();
    assert.equal(
      await page
        .locator('.ops-map-list summary')
        .filter({ hasText: 'Orchard Farm' })
        .count(),
      0,
    );
    console.log(
      `PASS occurrence layout picker, warning, editor, assignment preservation, confirmed switch and accessibility at ${width}px`,
    );
    await page.goto('http://127.0.0.1:4342/market/layouts');
    const saved = page.getByRole('button', { name: /Saved layouts/ });
    await saved.waitFor();
    assert.equal(await page.getByTestId('layout-editor').count(), 0);
    assert.equal(await page.locator('.layout-card').count(), 2);
    assert.equal((await page.locator('.layout-card canvas').count()) > 0, true);
    await page.screenshot({ path: resolve(evidence, `library-${width}.png`) });
    assert.deepEqual(
      (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
      [],
    );
    const card = page.getByRole('article', { name: 'Town Square' });
    await card
      .getByRole('button', { name: 'Edit layout', exact: true })
      .click();
    await editor.waitFor();
    assert.match(page.url(), /\/market\/layouts\/1\/edit$/);
    assert.equal(
      await page.getByText('Create new draft', { exact: true }).count(),
      0,
    );
    await editor
      .getByLabel('Area name', { exact: true })
      .fill('Updated library area');
    await editor
      .getByRole('button', { name: 'Save layout', exact: true })
      .click();
    await editor.getByText('All changes saved', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Back to layouts' }).click();
    await saved.waitFor();
    await card
      .getByRole('button', { name: 'Copy Layout', exact: true })
      .click();
    await editor.waitFor();
    await page
      .getByRole('heading', { name: 'Copy - Town Square', exact: true })
      .waitFor();
    await editor
      .locator('.designer-header .market-status')
      .filter({ hasText: 'Draft' })
      .waitFor();
    await page.getByRole('link', { name: 'Back to layouts' }).click();
    const copyCard = page.getByRole('article', { name: 'Copy - Town Square' });
    page.once('dialog', (dialog) => dialog.accept());
    await copyCard
      .getByRole('button', { name: 'Archive layout', exact: true })
      .click();
    await copyCard.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.layout-card').count(), 2);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log(
      `PASS layout previews, single current card, separate editor, independent copy and archive at ${width}px`,
    );
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:4342/market/layouts');
  const disclosure = page
    .locator('.saved-layouts-card')
    .filter({ has: page.getByRole('button', { name: 'Saved layouts' }) });
  const body = disclosure.locator('.market-disclosure-content');
  const expanded = (await body.boundingBox())!.height;
  assert.ok(expanded > 100);
  await disclosure.getByRole('button', { name: /Saved layouts/ }).click();
  await page.waitForTimeout(90);
  const halfway = (await body.boundingBox())!.height;
  assert.ok(
    halfway > 0 && halfway < expanded,
    `collapse height ${halfway} should animate from ${expanded}`,
  );
  assert.ok((await body.locator('canvas').count()) > 0);
  await page.waitForTimeout(230);
  assert.ok((await body.boundingBox())!.height < 2);
  await disclosure.getByRole('button', { name: /Saved layouts/ }).click();
  await page.waitForTimeout(280);
  assert.ok((await body.boundingBox())!.height > 100);
  console.log('PASS opening and closing animation retain map previews');
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await server.close();
}
