const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const state = '.market-checkout-test-state.json';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'] });
  try {
    const context = await browser.newContext(fs.existsSync(state) ? { storageState: state } : {});
    const page = await context.newPage();
    page.on('response', async response => {
      if (!response.url().endsWith('/api/shop')) return;
      const action = response.request().postDataJSON()?.action;
      if (!response.ok()) console.log('FAILED', action, response.status(), await response.text());
      else console.log('OK', action);
    });
    await page.goto('http://stripe-fee-d-market.localhost:4321/account');
    if (page.url().includes('auth.platform')) {
      await page.getByLabel('Email', { exact: true }).fill('stripe-fee-d-manager@example.test');
      await page.getByLabel('Password', { exact: true }).fill('Local-Fee-D-2026!');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL('http://stripe-fee-d-market.localhost:4321/**');
    }
    await context.storageState({ path: state });
    await page.goto('http://stripe-fee-d-market.localhost:4321/occurrences/64/products/436');
    console.log((await page.locator('body').innerText()).slice(-2500));
    const add = page.getByRole('button', { name: 'Add to cart', exact: true });
    // Reuse this dedicated browser's existing cart rather than adding on reruns.
    if (!(await page.locator('body').innerText()).includes('Your cart is for') && await add.isEnabled()) { await add.click(); await page.waitForTimeout(1000); }
    await page.goto('http://stripe-fee-d-market.localhost:4321/cart');
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: 'Continue to checkout', exact: true }).click();
    await page.waitForTimeout(1500);
    console.log('RESULT', page.url(), (await page.locator('body').innerText()).slice(-3000));
    if (!page.url().endsWith('/checkout')) throw new Error('Cart preparation failed');
    await page.waitForTimeout(1000);
    await page.getByLabel('First name', { exact: true }).fill('Market');
    await page.getByLabel('Last name', { exact: true }).fill('Checkout Test');
    const email = page.getByLabel('Email', { exact: true });
    if (await email.isEditable()) await email.fill('stripe-fee-d-manager@example.test');
    await page.locator('#phoneNumber').fill('2025550123');
    await page.getByRole('button', { name: 'Continue to pickup', exact: true }).click();
    await page.getByRole('button', { name: 'Review order', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue to secure card entry', exact: true }).click();
    await page.waitForTimeout(3000);
    console.log('PAYMENT', (await page.locator('body').innerText()).slice(-2500));
    if (!(await page.locator('[aria-label="Stripe card details"] iframe').count())) throw new Error('Stripe card entry not reached');
    console.log('PASS market cart, fee quote, contact, pickup, review and Stripe secure card entry');
    if (process.env.COMPLETE_STRIPE_TEST_CHECKOUT === 'true') {
      const frame = page.frameLocator('[aria-label="Stripe card details"] iframe');
      await frame.locator('[name="cardnumber"]').fill('4242424242424242');
      await frame.locator('[name="exp-date"]').fill('1230');
      await frame.locator('[name="cvc"]').fill('123');
      await frame.locator('[name="postal"]').fill('78006');
      await page.getByRole('button', { name: 'Complete purchase', exact: true }).click();
      await page.waitForURL('**/checkout/success?order=*');
      await page.getByText('Your order is confirmed.', { exact: true }).waitFor();
      await page.getByText('Payment status: Succeeded', { exact: true }).waitFor();
      console.log('PASS sandbox purchase confirmed', new URL(page.url()).searchParams.get('order'));
    }
    await context.storageState({ path: state });
  } finally { await browser.close(); fs.rmSync(state, { force: true }); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
