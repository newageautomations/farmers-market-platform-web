import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';

const root = process.cwd();
const evidence = resolve(root, 'docs/evidence/market-fixes');
mkdirSync(evidence, { recursive: true });
process.env.FRONTEND_FIXTURE_MODE = 'true';
process.chdir(resolve(root, 'apps/admin'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 4343, strictPort: true },
  plugins: [
    {
      name: 'market-fixes-preview',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.headers.accept?.includes('text/html')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Market fixes preview</title></head><body><div id="root"></div><script type="module" src="/@fs/${resolve(root, 'tests/fixtures/occurrence-layout-preview.tsx').replaceAll('\\', '/')}"></script></body></html>`,
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
  for (const width of [2160, 1440, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const route of ['assignments', 'day']) {
      await page.goto(`http://127.0.0.1:4343/market/${route}/101?crowded`);
      await page.locator('.ops-day-summary').waitFor();
      assert.equal(await page.locator('.ops-summary').count(), 0);
      const booths = page.getByRole('list', {
        name: 'Market Vendors and booths',
      });
      const vendors = page.getByRole('region', { name: 'Expected vendors' });
      assert.equal(await booths.locator(':scope > li').count(), 12);
      assert.equal(await vendors.locator(':scope > details').count(), 12);
      for (const list of [booths, vendors]) {
        assert.ok(
          await list.evaluate((el) => el.scrollHeight > el.clientHeight),
        );
        assert.ok((await list.boundingBox())!.height < 700);
        await list.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        assert.ok(await list.evaluate((el) => el.scrollTop > 0));
      }
      await vendors.locator('summary').first().click();
      await vendors
        .getByLabel('Booth assignment')
        .first()
        .waitFor({ state: 'visible' });
      assert.equal(
        await vendors.getByLabel('Booth assignment').first().isVisible(),
        true,
      );
      if (route === 'day') {
        await vendors
          .getByRole('button', { name: 'Check in', exact: true })
          .click();
        await vendors.getByRole('button', { name: 'Undo check-in' }).waitFor();
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze()
        ).violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
      );
      await page.screenshot({
        path: resolve(evidence, `${route}-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto('http://127.0.0.1:4343/market/layouts/1/edit');
    await page.getByTestId('layout-editor').waitFor();
    const bounds = (await page.getByTestId('layout-editor').boundingBox())!;
    assert.ok(
      bounds.x < 2 && bounds.width >= width - 2,
      `Editor width ${bounds.width} at ${width}`,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: resolve(evidence, `editor-${width}.png`),
      fullPage: true,
    });
  }
  await page.goto('http://127.0.0.1:4343/market/layouts');
  const saved = page.getByRole('button', { name: 'Saved layouts' });
  const archived = page.getByRole('button', { name: 'Archived layouts' });
  await saved.waitFor();
  assert.equal(await saved.locator('svg.decorative-chevron').count(), 1);
  assert.equal(await archived.locator('svg.decorative-chevron').count(), 1);
  const original = page.getByRole('article', { name: 'Town Square' });
  page.once('dialog', (dialog) => dialog.accept());
  await original.getByRole('button', { name: 'Archive layout' }).click();
  await original.waitFor({ state: 'hidden' });
  await archived.click();
  await original.waitFor();
  assert.equal(await original.getByRole('button').count(), 1);
  await original.getByRole('button', { name: 'Unarchive layout' }).click();
  await original.getByRole('button', { name: 'Edit layout' }).waitFor();
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });
  });
  let submission: Record<string, unknown> | undefined;
  await page.route('**/api/market-application', async (route) => {
    submission = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"submitted":true}',
    });
  });
  await page.goto('http://127.0.0.1:4343/apply');
  const submit = page.getByRole('button', { name: 'Submit application' });
  await submit.waitFor();
  assert.ok(await submit.isEnabled());
  await page.getByLabel('Business name (required)').fill('Orchard Farm');
  await page
    .getByRole('group', { name: 'Requested Market dates' })
    .getByRole('checkbox')
    .first()
    .check();
  await submit.click();
  await page.getByRole('heading', { name: 'Application submitted' }).waitFor();
  assert.equal(
    (submission!.answers as Record<string, unknown>).name,
    'Orchard Farm',
  );
  assert.match(String(submission!.idempotencyKey), /^[a-f0-9-]{36}$/);
  assert.deepEqual(errors, []);
  console.log(
    'PASS application without randomUUID, archive and restore, summaries, scrollable lists, vendor controls, accessibility and editor width at 2160/1440/390px',
  );
} finally {
  await browser?.close();
  await server.close();
}
