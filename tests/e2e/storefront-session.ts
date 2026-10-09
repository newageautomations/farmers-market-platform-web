import { expect, type Page } from '@playwright/test';

// Earlier Storefront fixtures retain native password compatibility internally.
// Authenticate their verified fixture through the same-origin bridge, without
// reintroducing a password form into the passwordless customer experience.
export async function fixtureSession(
  page: Page,
  identifier: string,
  password: string,
) {
  const status = await page.evaluate(
    async ({ identifier, password }) => {
      const island = document.querySelector(
        'astro-island[component-export="VendorCart"], astro-island[component-export="MarketCart"]',
      );
      const storefrontId = JSON.parse(island!.getAttribute('props')!)
        .storefrontId[1];
      const response = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefrontId,
          action: 'login',
          username: identifier,
          password,
        }),
      });
      return response.status;
    },
    { identifier, password },
  );
  expect(status).toBe(200);
  await page.reload();
}
