import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Uses in-memory fixture services only. Never connects to or modifies a database.
const root = process.cwd();
const evidence = path.join(
  root,
  'docs/evidence/vendor-catalog/stock-adjustment',
);
await mkdir(evidence, { recursive: true });
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/catalog-check-'),
);
const entry = path.join(temporary, 'preview.jsx');
const fixtureModule = `
import React from 'react';
import { AppError } from '@market/api';
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import { AdminShell } from '../AdminShell';
import { fixtureContexts } from '../FixtureAdmin';
import { createFixtureVendorService } from '../vendor/fixture';
const context = { ...fixtureContexts.VENDOR, branding: { logo: null, accent: '#315b40' } };
const service = createFixtureVendorService(context);
const names = ['Heirloom tomatoes','Rainbow carrots','Lacinato kale','Butternut squash','Honeycrisp apples','Bosc pears','Pasture-raised eggs','Raw wildflower honey'];
const prices = [450,300,350,400,350,300,700,1200];
const units = ['lb','bunch','bunch','each','lb','lb','dozen','jar'];
const quantities = [48,32,6,24,36,4,18,0];
const products = names.map((name, i) => ({ id: String(1001+i), name, assetIds: [String(i)], variants: [{ id: String(1101+i), name: units[i], sku: 'GV-00'+(i+1), price: prices[i], currency: 'USD' }] }));
service.catalog = async () => ({ items: products, totalItems: 8 });
service.inventory = async () => ({ totalItems: 8, nextCursor: null, asOf: new Date().toISOString(), items: products.map((p,i) => ({ productId: p.id, productName: p.name, variantId: p.variants[0].id, variantName: units[i], sku: p.variants[0].sku, stockOnHand: quantities[i], stockAllocated: 0, physicalFree: quantities[i] })) });
service.restock = async ({variantId, quantity}) => { quantities[Number(variantId)-1101] += quantity; return { id: variantId }; };
service.adjust = async ({variantId, quantity}) => { await new Promise(resolve => setTimeout(resolve, 600)); if (window.__failStock) throw new AppError('network'); quantities[Number(variantId)-1101] += quantity; return { id: variantId }; };
service.categories = {
  list: async () => ['Vegetables','Fruit','Eggs','Pantry'].map((name,i) => ({ id: String(i), name, productIds: products.slice(...[[0,4],[4,6],[6,7],[7,8]][i]).map(p=>p.id), productCount: [4,2,1,1][i] })),
  images: async () => products.map((p,i) => ({ id: String(i), name: p.name, preview: '/catalog-check-photo/'+i })),
};
history.replaceState(null, '', '/vendor/products');
createRoot(document.getElementById('root')).render(<AdminShell context={context} vendorService={service} onLogout={() => {}} />);
`;
await writeFile(entry, fixtureModule);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1050 },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const photos = [
    'Painterly Ripe Tomato Icon.png',
    'Painterly Carrot with Lush Greens.png',
    'Painterly Bunch of Leafy Greens.png',
    'Painterly Ripe Tomato Icon.png',
    'Painterly Red Apple with Leaf.png',
    'Painterly Peach with Leaf.png',
    'Warm Painterly Egg Carton Still Life.png',
    'Golden Honey Jar Illustration.png',
  ];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname))
      return route.abort();
    if (
      url.pathname === '/vendor/products' &&
      route.request().resourceType() === 'document'
    )
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    if (url.pathname.startsWith('/catalog-check-photo/'))
      return route.fulfill({
        contentType: 'image/png',
        body: await readFile(
          path.join(
            root,
            'apps/storefront/public/assets/editorial-market/categories',
            photos[Number(url.pathname.split('/').at(-1))],
          ),
        ),
      });
    if (url.pathname.includes('admin-api') || url.pathname.includes('shop-api'))
      return route.abort();
    return route.continue();
  });
  await page.goto('http://127.0.0.1:4322/vendor/products');
  await page
    .getByRole('button', { name: 'Adjust stock for Heirloom tomatoes' })
    .waitFor()
    .catch(async (error) => {
      console.error(
        JSON.stringify({
          errors,
          body: (await page.locator('body').innerText()).slice(0, 2200),
        }),
      );
      throw error;
    });
  await page.locator('.catalog-product-photo img').last().waitFor();
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    ),
  );
  assert.equal(await page.locator('h1').count(), 1);
  const dropdown = page.getByLabel('Filter by category');
  const dropdownBackground = await dropdown.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await dropdown.hover();
  assert.equal(
    await dropdown.evaluate((element) => getComputedStyle(element).cursor),
    'pointer',
  );
  await page.waitForFunction(
    (before) =>
      getComputedStyle(document.querySelector('.farmstand-select'))
        .backgroundColor !== before,
    dropdownBackground,
  );
  const search = page.getByRole('searchbox');
  await search.fill('GV');
  await search.screenshot({ path: path.join(evidence, 'search-clear.png') });
  const searchBox = await search.boundingBox();
  await search.click({
    position: { x: searchBox.width - 20, y: searchBox.height / 2 },
  });
  assert.equal(await search.inputValue(), '');
  await page.mouse.move(0, 0);
  for (const selector of [
    '.catalog-product-name a',
    '.catalog-category-footer a',
  ]) {
    const link = page.locator(selector).first();
    await link.hover();
    await page.waitForFunction((selector) => {
      const link = document.querySelector(selector);
      const text = link.querySelector('.farmstand-text-link') || link;
      return (
        getComputedStyle(text, '::after').transform ===
        'matrix(1, 0, 0, 1, 0, 0)'
      );
    }, selector);
  }
  const description = page.locator('.catalog-price small').first();
  const originalDescription = await description.textContent();
  const clamp = await description.evaluate((element) => {
    element.textContent =
      '/ A long product variant description that should wrap across several lines and end with an ellipsis after two lines';
    const css = getComputedStyle(element);
    return {
      lines: css.webkitLineClamp,
      height: element.clientHeight,
      lineHeight: parseFloat(css.lineHeight),
      fullHeight: element.scrollHeight,
    };
  });
  assert.equal(clamp.lines, '2');
  assert(clamp.height <= Math.ceil(clamp.lineHeight * 2));
  assert(clamp.fullHeight > clamp.height);
  await description.evaluate((element, original) => {
    element.textContent = original;
  }, originalDescription);
  await page.mouse.move(0, 0);
  assert.equal(
    await page.getByRole('link', { name: 'Export', exact: true }).count(),
    0,
  );
  const geometry = await page.evaluate(() => {
    const dimensions = (selector) => {
      const element = document.querySelector(selector);
      const box = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return {
        width: box.width,
        height: box.height,
        radius: css.borderRadius,
        fontSize: css.fontSize,
        color: css.color,
        background: css.backgroundColor,
        columns: css.gridTemplateColumns,
      };
    };
    return {
      content: dimensions('.admin-content'),
      columns: dimensions('.catalog-columns'),
      panel: dimensions('.catalog-products-panel'),
      button: dimensions('.catalog-page-heading a'),
      stockAction: dimensions('.catalog-stock-actions button'),
      search: dimensions('.farmstand-search-input'),
      photo: dimensions('.catalog-product-photo img'),
      row: dimensions('.catalog-table tbody tr'),
      title: dimensions('.catalog-page-heading h1'),
      icons: [...document.querySelectorAll('.farmstand-icon')].map(
        (element) => ({
          name: element.className,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          mask: getComputedStyle(element).maskImage,
        }),
      ),
    };
  });
  assert.equal(geometry.button.height, 42);
  assert.equal(geometry.button.radius, '8px');
  assert.equal(geometry.stockAction.height, 32);
  assert.equal(geometry.search.height, 38);
  assert.equal(geometry.photo.width, 42);
  assert.equal(geometry.photo.height, 42);
  assert.equal(geometry.row.height, 82);
  assert.equal(geometry.title.fontSize, '36px');
  for (const icon of geometry.icons) {
    assert(icon.width > 0 && icon.height > 0, icon.name);
    assert.notEqual(icon.mask, 'none', icon.name);
  }
  await page.screenshot({
    path: path.join(evidence, 'desktop.png'),
    fullPage: true,
  });
  const before = await page
    .locator('.catalog-page-heading a')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  // Simulates the existing account palette provider applying saved theme variables.
  await page.locator('.admin-shell').evaluate((element) => {
    for (const [key, value] of Object.entries({
      primary: '#7752a3',
      secondary: '#635078',
      background: '#f5f0fa',
      surface: '#fffcff',
      foreground: '#302637',
      muted: '#6c6077',
      'on-primary': '#ffffff',
    }))
      element.style.setProperty('--brand-' + key, value);
  });
  await page.waitForFunction(
    (before) =>
      getComputedStyle(document.querySelector('.catalog-page-heading a'))
        .backgroundColor !== before,
    before,
  );
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('.catalog-page-heading a'))
        .backgroundColor === 'rgb(119, 82, 163)',
  );
  await page.screenshot({
    path: path.join(evidence, 'theme.png'),
    fullPage: true,
  });
  const responsive = [];
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const metrics = await page.evaluate(() => ({
      viewport: innerWidth,
      page: document.documentElement.scrollWidth,
      content: document.querySelector('.admin-content').getBoundingClientRect()
        .width,
      tableScroll: document.querySelector('.catalog-table-scroll').scrollWidth,
      tableWidth: document.querySelector('.catalog-table-scroll').clientWidth,
    }));
    assert(metrics.page <= width, JSON.stringify(metrics));
    responsive.push(metrics);
    await page.screenshot({
      path: path.join(evidence, `width-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('searchbox').fill('GV-003');
  assert.equal(await page.locator('.catalog-table tbody tr').count(), 1);
  await page.getByRole('searchbox').fill('');
  assert.equal(
    await page.getByRole('button', { name: /^Restock / }).count(),
    0,
  );
  const modalGeometry = [];
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole('button', { name: 'Adjust stock for Rainbow carrots' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Adjust inventory total' });
    await dialog.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((a) => a.finished));
    });
    const edit = await dialog.boundingBox();
    assert.equal(await dialog.getByRole('heading').count(), 1);
    assert.equal(
      await dialog.locator('.catalog-stock-cards .ui-card').count(),
      3,
    );
    assert.equal(
      await dialog
        .getByLabel('New on-hand total', { exact: true })
        .inputValue(),
      '32',
    );
    await dialog
      .getByRole('button', { name: 'Increase new on-hand total' })
      .click();
    assert.equal(
      await dialog
        .getByLabel('New on-hand total', { exact: true })
        .inputValue(),
      '33',
    );
    await dialog
      .getByRole('button', { name: 'Decrease new on-hand total' })
      .click();
    const quantity = dialog.getByLabel('New on-hand total', { exact: true });
    await quantity.fill('0');
    assert(
      await dialog
        .getByRole('button', { name: 'Decrease new on-hand total' })
        .isDisabled(),
    );
    await quantity.fill('2147483647');
    assert(
      await dialog
        .getByRole('button', { name: 'Increase new on-hand total' })
        .isDisabled(),
    );
    for (const invalid of ['', '-1', '1.5', '2147483648']) {
      await quantity.fill(invalid);
      await dialog.getByRole('button', { name: 'Review adjustment' }).click();
      assert.equal(await dialog.isVisible(), true);
      assert.equal(
        await quantity.evaluate((element) => element.validity.valid),
        false,
      );
    }
    await dialog.getByLabel('New on-hand total', { exact: true }).fill('37');
    await dialog
      .getByRole('button', { name: 'About inventory values' })
      .focus();
    assert.match(
      await page.getByRole('tooltip').textContent(),
      /On hand: your physical stock/,
    );
    await dialog.getByLabel('New on-hand total', { exact: true }).focus();
    await dialog.screenshot({
      path: path.join(evidence, `stock-edit-${width}.png`),
    });
    await dialog.getByRole('button', { name: 'Review adjustment' }).click();
    assert.equal(await page.locator('dialog[open]').count(), 1);
    const confirmation = page.getByRole('dialog', {
      name: 'Confirm adjust stock',
    });
    // Observe the real size animation while it is running, then its final bounds.
    assert(
      await confirmation.evaluate((element) =>
        element
          .getAnimations()
          .some((a) => a.effect.getKeyframes().some((frame) => frame.height)),
      ),
    );
    await confirmation.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((a) => a.finished));
    });
    const compact = await confirmation.boundingBox();
    assert(compact.height < edit.height);
    assert(compact.width <= edit.width);
    assert.equal(
      await confirmation.getByText('On hand amount: 32 \u2192 37').count(),
      1,
    );
    await confirmation.getByRole('button', { name: 'Back' }).click();
    assert.equal(
      await dialog
        .getByLabel('New on-hand total', { exact: true })
        .inputValue(),
      '37',
    );
    await dialog.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((a) => a.finished));
    });
    assert(Math.abs((await dialog.boundingBox()).height - edit.height) < 1);
    const overflow = await dialog.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
    assert(overflow.scroll <= overflow.client, JSON.stringify(overflow));
    modalGeometry.push({ width, edit, compact, overflow });
    await dialog.getByRole('button', { name: 'Review adjustment' }).click();
    await confirmation.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((a) => a.finished));
    });
    await confirmation.screenshot({
      path: path.join(evidence, `stock-confirm-${width}.png`),
    });
    await confirmation.getByRole('button', { name: 'Close' }).click();
    await confirmation.waitFor({ state: 'hidden' });
  }
  // Closing confirmation above must not save any draft.
  assert.equal(
    await page
      .locator('.catalog-table tbody tr')
      .nth(1)
      .locator('.catalog-on-hand strong')
      .textContent(),
    '32 bunches',
  );
  await page
    .getByRole('button', { name: 'Adjust stock for Rainbow carrots' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Adjust inventory total' });
  await dialog.getByLabel('New on-hand total', { exact: true }).fill('37');
  await dialog.getByRole('button', { name: 'Review adjustment' }).click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  const saving = page.getByRole('dialog', { name: 'Updating stock' });
  await saving.getByText('Saving stock').waitFor();
  assert(await saving.getByRole('button', { name: 'Close' }).isDisabled());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 1);
  const success = page.getByRole('dialog', { name: 'Stock updated' });
  await success.getByText('Inventory total updated.').waitFor();
  assert.equal(
    await success.locator('.catalog-stock-result-success svg').count(),
    1,
  );
  await success.getByRole('button', { name: 'Close' }).click();
  await success.waitFor({ state: 'hidden' });
  assert.equal(
    await page
      .locator('.catalog-table tbody tr')
      .nth(1)
      .locator('.catalog-on-hand strong')
      .textContent(),
    '37 bunches',
  );
  await page.evaluate(() => {
    window.__failStock = true;
  });
  await page
    .getByRole('button', { name: 'Adjust stock for Rainbow carrots' })
    .click();
  await dialog.getByLabel('New on-hand total', { exact: true }).fill('38');
  await dialog.getByRole('button', { name: 'Review adjustment' }).click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  const failed = page.getByRole('dialog', { name: 'Stock update failed' });
  await failed.getByText(/The command outcome is unconfirmed/).waitFor();
  const errorColor = await failed
    .locator('.catalog-stock-result-error svg')
    .evaluate((element) => getComputedStyle(element).color);
  assert.equal(
    errorColor,
    await failed
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--status-danger-fg').trim(),
      )
      .then((hex) => {
        const value = hex.replace('#', '');
        return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
      }),
  );
  await failed.screenshot({ path: path.join(evidence, 'stock-error.png') });
  await failed.getByRole('button', { name: 'Check current records' }).click();
  await failed.waitFor({ state: 'hidden' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('button', { name: 'Adjust stock for Rainbow carrots' })
    .click();
  await dialog.getByRole('button', { name: 'Review adjustment' }).click();
  assert.equal(
    await page
      .getByRole('dialog', { name: 'Confirm adjust stock' })
      .evaluate((element) => element.getAnimations().length),
    0,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(evidence, 'browser-results.json'),
    JSON.stringify(
      {
        geometry,
        responsive,
        modalGeometry,
        errors,
        checks: [
          'desktop geometry',
          'all exact Figma SVG masks',
          'palette color response',
          '1280/768/390 page overflow',
          'SKU search',
          'single dialog edit/back/confirmation and animated dimensions',
          'deferred stock save and refresh',
          'loading, failure, success and reduced motion',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    'Catalog design, SVGs, palette, responsive layout, SKU search and fixture stock command verified.',
  );
} finally {
  await browser?.close();
  // Only the verified temporary directory created above is removed.
  assert(
    temporary.startsWith(path.join(root, 'apps/admin/src/catalog-check-')),
  );
  await rm(temporary, { recursive: true, force: true });
}
