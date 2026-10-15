/** Read-only smoke test against the existing local demo. Never seeds or resets data. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext();
  const login = await context.request.post('http://localhost:3000/admin-api', {
    data: {
      query:
        'mutation($u:String!,$p:String!){login(username:$u,password:$p){...on CurrentUser{id}}}',
      variables: {
        u: 'market.manager@example.test',
        p: 'local-identity-regression-only-password',
      },
    },
  });
  assert.ok((await login.json()).data?.login?.id, 'Local demo manager login');
  const page = await context.newPage();
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', async (response) => {
    if (!response.url().endsWith('/admin-api')) return;
    const payload = await response.json().catch(() => ({}));
    for (const error of payload.errors ?? []) failures.push(error.message);
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://localhost:4322/market/operations');
    const choices = page.getByRole('link', { name: /View operations for/ });
    await choices.first().waitFor();
    const href = await choices.first().getAttribute('href');
    await choices.first().click();
    await page.getByText(/operational purchases in this occurrence/).waitFor();
    assert.equal(new URL(page.url()).pathname, href);
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole('link', { name: 'Choose another occurrence' }).click();
    await choices.first().waitFor();
    console.log(
      `PASS live Operations occurrence list and detail at ${width}px`,
    );
  }
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
}
