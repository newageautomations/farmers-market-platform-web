import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';

const root = process.cwd();
const evidence = resolve(root, 'docs/evidence/market-dashboard');
mkdirSync(evidence, { recursive: true });
process.env.FRONTEND_FIXTURE_MODE = 'true';
process.chdir(resolve(root, 'apps/admin'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 4341, strictPort: true },
  plugins: [
    {
      name: 'manager-ui-check',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.headers.accept?.includes('text/html')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Market Manager Preview</title></head><body><div id="root"></div><script type="module" src="/@fs/${resolve(root, 'tests/fixtures/market-dashboard-preview.tsx').replaceAll('\\', '/')}"></script></body></html>`,
          );
        });
      },
    },
  ],
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      'market',
      'market/occurrences/101',
      'market/vendors',
      'market/vendors/participation/12',
      'market/vendors/listings/12',
      'market/vendors/offerings/12',
      'market/applications',
      'market/application-submissions',
      'market/directory',
      'market/rentals',
    ]) {
      await page.goto(`http://127.0.0.1:4341/${route}`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page
        .getByText('Loading current records', { exact: true })
        .waitFor({ state: 'hidden' });
      assert.equal(
        await page
          .locator('main')
          .getByRole('button', { name: /Refresh/ })
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        route,
      );
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter(
              (a) => a.effect?.getComputedTiming().iterations !== Infinity,
            )
            .map((a) => a.finished.catch(() => {})),
        ),
      );
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => ({
            target: n.target,
            html: n.html,
            failure: n.failureSummary,
          })),
        })),
        [],
        route,
      );
      await page.screenshot({
        path: resolve(evidence, `${route.replaceAll('/', '-')}-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto('http://127.0.0.1:4341/market/application-submissions');
    await page.getByRole('button', { name: 'Review Orchard Farm' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Waitlisted' }).click();
    assert.equal(
      await dialog
        .getByRole('button', { name: 'Waitlisted' })
        .getAttribute('aria-pressed'),
      'true',
    );
    await dialog
      .getByRole('combobox', { name: 'Link to an existing directory business' })
      .fill('Meadow');
    await dialog.getByRole('option', { name: 'Meadow Flowers' }).click();
    assert.equal(
      await dialog
        .getByRole('combobox', {
          name: 'Link to an existing directory business',
        })
        .inputValue(),
      'Meadow Flowers',
    );
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      ),
    );
    const modalAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    assert.deepEqual(
      modalAxe.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => ({
          target: n.target,
          html: n.html,
          failure: n.failureSummary,
        })),
      })),
      [],
    );
    await page.screenshot({
      path: resolve(evidence, `application-modal-${width}.png`),
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'Save and Close' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('cell', { name: 'Waitlisted', exact: true }).waitFor();
    await page.goto('http://127.0.0.1:4341/market/directory');
    await page.getByRole('button', { name: 'Orchard Farm' }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      await page
        .getByRole('button', { name: 'Orchard Farm' })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    if (width === 1440) {
      await page.getByRole('button', { name: 'Collapse navigation' }).click();
      await page.getByRole('button', { name: 'Open navigation' }).waitFor();
      await page.getByRole('button', { name: 'Open navigation' }).click();
    }
    console.log(
      `PASS manager pages, modals, accessibility, and responsive checks at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
