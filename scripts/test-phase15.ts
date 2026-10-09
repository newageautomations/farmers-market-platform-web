/** Local-only browser qualification with explicit in-memory data, no backend or external services. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';

const root = process.cwd();
const evidence = resolve(root, 'docs/evidence/phase15');
mkdirSync(evidence, { recursive: true });
process.env.FRONTEND_FIXTURE_MODE = 'true';
process.chdir(resolve(root, 'apps/admin'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 4335, strictPort: true },
  plugins: [
    {
      name: 'phase15-local-test-page',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (
            !req.url?.startsWith('/market') ||
            !req.headers.accept?.includes('text/html')
          )
            return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Phase 15 local qualification</title></head><body><div id="root"></div><script type="module" src="/@fs/' +
              resolve(root, 'tests/fixtures/phase15-preview.tsx').replaceAll(
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
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4335/market/applications');
  await page.getByRole('button', { name: 'Version 1 · draft' }).click();
  await page
    .getByLabel('Application name', { exact: true })
    .fill('Fall season application');
  await page
    .getByRole('button', { name: 'Edit Products sold', exact: true })
    .click();
  await page.getByLabel('Option 1', { exact: true }).fill('Baked goods');
  await page.getByRole('button', { name: 'Add option', exact: true }).click();
  await page.getByRole('button', { name: 'Add section', exact: true }).click();
  await page.getByRole('button', { name: 'Move section Section 3 up' }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForFunction(
    () => !document.querySelector('.ops-workspace[aria-busy="true"]'),
  );
  await page.getByLabel('Application name', { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel('Application name', { exact: true }).inputValue(),
    'Fall season application',
  );
  const handle = page.getByRole('button', {
    name: 'Drag Setup notes',
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const sourceBox = await handle.boundingBox();
  assert.ok(sourceBox);
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 15,
    sourceBox.y + sourceBox.height / 2 + 15,
    { steps: 5 },
  );
  const target = page.locator('.application-question').filter({
    has: page.getByRole('button', {
      name: 'Edit Products sold',
      exact: true,
    }),
  });
  await target.scrollIntoViewIfNeeded();
  const targetBox = await target.boundingBox();
  assert.ok(targetBox);
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 8 },
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2 + 2,
  );
  await page.mouse.up();
  assert.equal(
    await page
      .locator('.application-section')
      .filter({
        has: page.getByLabel('Section name: Products', { exact: true }),
      })
      .getByRole('button', { name: 'Edit Setup notes', exact: true })
      .count(),
    1,
  );
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    [],
  );
  await page.screenshot({
    path: resolve(evidence, 'application-builder-1440.png'),
    fullPage: true,
  });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: resolve(evidence, `application-builder-${width}.png`),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Builder overflows at ${width}`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Applications', exact: true })
    .hover();
  await page
    .getByRole('link', { name: 'Submitted applications', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Local Orchard', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert.equal(await dialog.evaluate((element) => element.scrollTop), 0);
  const modalBox = await dialog.boundingBox();
  assert.ok(modalBox && Math.abs(modalBox.x - (1440 - modalBox.width) / 2) < 2);
  await dialog
    .getByRole('heading', { name: 'Application from Local Orchard' })
    .waitFor();
  assert.equal(
    await dialog.getByText('Setup notes', { exact: true }).count(),
    0,
  );
  assert.ok(
    await dialog.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
    'Submission modal must scroll within the viewport',
  );
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    [],
  );
  await page.screenshot({
    path: resolve(evidence, 'application-review-modal.png'),
  });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  for (const path of [
    '/market/occurrences/generate',
    '/market/occurrences/new',
    '/market/rentals/new',
    '/market/directory/new',
    '/market/settings',
    '/market/vendors/participation/11',
  ]) {
    await page.goto(`http://127.0.0.1:4335${path}`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector(
          '[role="status"][aria-label="Loading current records"]',
        ),
    );
    const expected = path.includes('/generate')
      ? 'Market starts at'
      : path.includes('/occurrences/new')
        ? 'Start date'
        : path.includes('/rentals/new')
          ? 'Rental name'
          : path.includes('/directory/new')
            ? 'business name'
            : path.includes('/settings')
              ? 'Market name'
              : 'Participation status';
    await page.getByLabel(expected, { exact: true }).first().waitFor();
    const axe = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      axe.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
      [],
      `Accessibility violations on ${path}`,
    );
    await page.screenshot({
      path: resolve(
        evidence,
        path.replace('/market/', '').replaceAll('/', '-') + '-1440.png',
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Page overflows: ${path}`,
    );
    await page.screenshot({
      path: resolve(
        evidence,
        path.replace('/market/', '').replaceAll('/', '-') + '-390.png',
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS Phase 15 local browser qualification: builder persistence, modal, responsive pages, accessibility, and runtime errors.',
  );
} finally {
  await browser?.close();
  await server.close();
}
