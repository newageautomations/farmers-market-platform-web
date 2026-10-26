import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

/** Qualify every shared banner consumer without changing the in-memory cart. */
export async function qualifyMarketPickerInstances(
  origin: string,
  theme: string,
) {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const path of [
        '/products',
        '/products/synthetic-produce-1',
        '/cart',
        '/checkout',
      ]) {
        await page.goto(origin + path, { waitUntil: 'networkidle' });
        const trigger = page.getByRole('button', {
          name: 'Change Market',
          exact: true,
        });
        await expect(trigger).toBeVisible();
        const island = page.locator('astro-island').filter({ has: trigger });
        await expect(island).not.toHaveAttribute('ssr');
        await trigger.click();
        const dialog = page.getByRole('dialog', {
          name: 'Choose a pickup market',
        });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole('table', { name: 'October 2026' }),
        ).toBeVisible();
        const day = dialog.getByRole('button', {
          name: /^Saturday, October 31/,
        });
        await day.focus();
        await expect(dialog.getByRole('tooltip')).toContainText(
          '9:00 AM to 2:00 PM CDT',
        );
        assert.ok(
          await dialog.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1,
          ),
          `${theme} ${path} calendar fits at ${width}px`,
        );
        const paletteMatches = await day.evaluate(
          (node) =>
            getComputedStyle(node).backgroundColor ===
            getComputedStyle(document.querySelector('.shop-market-banner')!)
              .backgroundColor,
        );
        assert.ok(
          paletteMatches,
          `${theme} ${path} calendar uses current theme colors`,
        );
        await dialog
          .getByRole('button', {
            name: /^Oak Bend Saturday Market \(current\)/,
          })
          .click();
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(
    `Shared market calendar passed: ${theme}, shop/product/cart/checkout, desktop/mobile, theme colors, focus and current-market selection.`,
  );
}

/** Runs only against the HTTP harness's isolated in-memory backend. */
export async function qualifyFarmhouseShopBrowser(origin: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin + '/', { waitUntil: 'networkidle' });
      const homeCard = await page
        .locator('.farmhouse-product-card')
        .first()
        .evaluate((card) => {
          const photo = card.querySelector('.farmhouse-product-photo')!;
          const heading = card.querySelector('h3')!;
          const caption = card.querySelector('.farmhouse-product-caption')!;
          return {
            ratio: getComputedStyle(photo).aspectRatio,
            headingSize: getComputedStyle(heading).fontSize,
            headingFont: getComputedStyle(heading).fontFamily,
            captionPosition: getComputedStyle(caption).position,
            captionColor: getComputedStyle(caption).color,
            arrowBackground: getComputedStyle(
              card.querySelector('.farmhouse-circle')!,
            ).backgroundColor,
          };
        });
      await page.goto(origin + '/products', { waitUntil: 'networkidle' });
      const shopCard = await page
        .locator('.farmhouse-product-card')
        .first()
        .evaluate((card) => {
          const photo = card.querySelector('.farmhouse-product-photo')!;
          const heading = card.querySelector('h3')!;
          const caption = card.querySelector('.farmhouse-product-caption')!;
          return {
            ratio: getComputedStyle(photo).aspectRatio,
            headingSize: getComputedStyle(heading).fontSize,
            headingFont: getComputedStyle(heading).fontFamily,
            captionPosition: getComputedStyle(caption).position,
            captionColor: getComputedStyle(caption).color,
            arrowBackground: getComputedStyle(
              card.querySelector('.farmhouse-circle')!,
            ).backgroundColor,
          };
        });
      assert.deepEqual(shopCard, homeCard, `Card presentation at ${width}px`);
      const geometry = await page.evaluate(() => {
        const hero = document
          .querySelector('.farmhouse-page-hero')!
          .getBoundingClientRect();
        const pickup = document
          .querySelector('.farmhouse-shop-pickup')!
          .getBoundingClientRect();
        return {
          heroBottom: hero.bottom,
          pickupTop: pickup.top,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.ok(
        geometry.pickupTop < geometry.heroBottom,
        `Pickup overlaps hero at ${width}px`,
      );
      assert.ok(!geometry.overflow, `No horizontal overflow at ${width}px`);
      const pickupPanel = page.getByRole('region', {
        name: 'Pickup market',
        exact: true,
      });
      await expect(
        pickupPanel.getByText('Preordering for Oak Bend Saturday Market', {
          exact: true,
        }),
      ).toBeVisible();
      assert.ok(
        await pickupPanel.evaluate((node) =>
          node.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
        ),
        `Pickup stays visible at ${width}px`,
      );
      await expect(pickupPanel.locator('astro-island')).not.toHaveAttribute(
        'ssr',
      );
      await pickupPanel.getByText('Change Market', { exact: true }).click();
      const calendarDialog = page.getByRole('dialog', {
        name: 'Choose a pickup market',
      });
      await expect(calendarDialog).toBeVisible();
      await expect(
        calendarDialog.getByRole('table', { name: 'October 2026' }),
      ).toBeVisible();
      const calendarDay = calendarDialog.getByRole('button', {
        name: /^Saturday, October 31/,
      });
      await calendarDay.hover();
      await expect(calendarDialog.getByRole('tooltip')).toContainText(
        'Oak Bend Saturday Market',
      );
      await expect(calendarDialog.getByRole('tooltip')).not.toContainText(
        'October',
      );
      await calendarDay.focus();
      await expect(
        calendarDialog.getByRole('button', {
          name: /^Oak Bend Saturday Market \(current\)/,
        }),
      ).toBeVisible();
      assert.ok(
        await calendarDialog.evaluate(
          (node) => node.scrollWidth <= node.clientWidth + 1,
        ),
        `Calendar fits at ${width}px`,
      );
      await calendarDialog
        .getByRole('button', { name: 'Close', exact: true })
        .click();
      await expect(calendarDialog).not.toBeVisible();
      await expect(
        pickupPanel.getByRole('button', { name: 'Change Market' }),
      ).toBeFocused();
      const sortGeometry = await page
        .locator('[data-catalog-sort]')
        .evaluate((form) => {
          const label = form.querySelector('label')!.getBoundingClientRect();
          const menu = form.querySelector('select')!.getBoundingClientRect();
          return {
            left: label.right <= menu.left,
            aligned:
              Math.abs(
                (label.top + label.bottom) / 2 - (menu.top + menu.bottom) / 2,
              ) < 3,
          };
        });
      assert.ok(
        sortGeometry.left && sortGeometry.aligned,
        `Sort label stays left of its menu at ${width}px`,
      );
      await expect(
        page.getByRole('button', { name: 'Apply', exact: true }),
      ).toHaveCount(0);
      await expect(page.locator('#farmhouse-sort option').first()).toHaveText(
        'Default',
      );
      await page.evaluate(() => {
        (window as unknown as { testShopDocument: boolean }).testShopDocument =
          true;
      });
      await page.locator('[aria-label="Product categories"] a').nth(1).click();
      await expect(page.locator('[data-catalog-status]')).toHaveText(
        'Products updated.',
      );
      await expect(pickupPanel).toBeInViewport();
      assert.ok(
        await page.evaluate(
          () =>
            (window as unknown as { testShopDocument?: boolean })
              .testShopDocument,
        ),
      );
      await page.locator('#farmhouse-sort').selectOption('name');
      await expect(page).toHaveURL(/sort=name/);
      await expect(
        page.locator('[data-farmhouse-catalog]'),
      ).not.toHaveAttribute('aria-busy');
      await page.getByRole('link', { name: 'Next →' }).click();
      await expect(page).toHaveURL(/page=2/);
      const catalogTop = await page
        .locator('#farmhouse-catalog')
        .evaluate((node) => node.getBoundingClientRect().top);
      const headerBottom = await page
        .locator('.farmhouse-header')
        .evaluate((node) => node.getBoundingClientRect().bottom);
      assert.ok(
        catalogTop >= headerBottom - 2 && catalogTop < headerBottom + 80,
        `Pagination aligns beneath header at ${width}px`,
      );
      assert.ok(
        await page.evaluate(
          () =>
            (window as unknown as { testShopDocument?: boolean })
              .testShopDocument,
        ),
      );
      await page.reload({ waitUntil: 'networkidle' });
      const restoredTop = await page
        .locator('#farmhouse-catalog')
        .evaluate((node) => node.getBoundingClientRect().top);
      assert.ok(
        restoredTop > 0 && restoredTop < 300,
        `Reload retains catalog anchor at ${width}px`,
      );
      await page.goBack({ waitUntil: 'networkidle' });
      await expect(page).not.toHaveURL(/page=2/);
      await expect(page.locator('[data-catalog-status]')).toHaveText(
        'Products updated.',
      );
      let added: Record<string, unknown> | undefined;
      await page.route('**/api/shop', async (route) => {
        const body = route.request().postDataJSON();
        if (body.action !== 'add') return route.continue();
        added = body;
        await route.fulfill({ json: { result: {} } });
      });
      // The action island must hydrate after filtering and history restoration.
      await page
        .locator('.farmhouse-card-purchase')
        .first()
        .getByRole('button', { name: 'Add to cart', exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('Product option').selectOption({ index: 1 });
      await dialog
        .getByRole('button', { name: 'Add to cart', exact: true })
        .click();
      await expect(
        page.getByText('Added to your cart.', { exact: false }).first(),
      ).toBeVisible();
      assert.equal(added?.quantity, 1);
      assert.equal(added?.occurrenceId, '21');
      assert.deepEqual(errors, [], `No browser errors at ${width}px`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(
    'Farmhouse shop Chromium passed at 1280, 768 and 390px: matching cards, overlap, filters, sort, pagination, reload/history and hydrated cart actions. In-memory backend only.',
  );
}
