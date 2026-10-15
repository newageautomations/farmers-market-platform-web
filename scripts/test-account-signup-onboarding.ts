import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium, type Page, type Request } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
const backend = resolve('../farmers-market-platform'),
  children: ChildProcess[] = [],
  origin =
    'http://127.0.0.1:' + (process.env.PHONE_TEST_STOREFRONT_PORT ?? 4337),
  adminOrigin =
    'http://localhost:' + (process.env.PHONE_TEST_ADMIN_PORT ?? 4555);
function child(
  cwd: string,
  args: string[],
  env: Record<string, string>,
  ipc = false,
) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  children.push(p);
  p.stdout?.on('data', (d) => process.stdout.write(d));
  p.stderr?.on('data', (d) => process.stderr.write(d));
  return p;
}
async function healthy(url: string) {
  for (let i = 0; i < 120; i++) {
    if (children.some((p) => p.exitCode !== null))
      throw new Error(
        'A local test server stopped. Check that the requested ports are available.',
      );
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* Local startup. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Local server readiness failed');
}
function message<T>(p: ChildProcess, kind: string): Promise<T> {
  return new Promise((accept, reject) => {
    function cleanup() {
      clearTimeout(timeout);
      p.off('message', listener);
      p.off('exit', exited);
    }
    const exited = (code: number | null) => {
      cleanup();
      reject(new Error('Harness exited ' + code));
    };
    const listener = (m: unknown) => {
      if (m && typeof m === 'object' && 'kind' in m && m.kind === kind) {
        cleanup();
        accept(m as T);
      }
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Local test message timeout'));
    }, 120000);
    p.on('message', listener);
    p.once('exit', exited);
  });
}
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log('PASS unified browser ' + name);
}
async function accessible(page: Page) {
  const fields = page.locator(
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select',
  );
  if (await fields.count()) {
    const field = fields.first();
    const before = await field.evaluate(
      (n) => getComputedStyle(n).backgroundColor,
    );
    await field.focus();
    const style = await field.evaluate((n) => ({
      shadow: getComputedStyle(n).boxShadow,
      background: getComputedStyle(n).backgroundColor,
      outline: getComputedStyle(n).outlineWidth,
      outlineColor: getComputedStyle(n).outlineColor,
    }));
    assert.equal(style.shadow, 'none');
    assert.equal(style.background, before);
    assert.equal(style.outline, '2px');
    assert.equal(style.outlineColor, 'rgb(95, 99, 104)');
  }
  const a = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
}
async function main() {
  const server = child(
    backend,
    [
      'node_modules/ts-node/dist/bin.js',
      '--project',
      'test/market-operations/tsconfig.json',
      'test/market-operations/account-experience-server.ts',
    ],
    { DB_HOST: '127.0.0.1' },
    true,
  );
  let success = false;
  try {
    const ready = await message<{
      endpoint: string;
      shopEndpoint: string;
      slug: string;
      database: string;
      vendorName: string;
      marketName: string;
    }>(server, 'ready');
    assert.match(ready.database, /^vendure_test_/);
    const env = {
      APP_ENV: 'test',
      NODE_ENV: 'test',
      FRONTEND_FIXTURE_MODE: 'false',
      SHOP_API_URL: ready.shopEndpoint,
      PUBLIC_ADMIN_API_URL: ready.endpoint.replace('127.0.0.1', 'localhost'),
      PLATFORM_ACCOUNT_ORIGIN:
        'http://auth.platform.localhost:' + new URL(origin).port,
      PLATFORM_ACCOUNT_BRIDGE_KEY: 'unified-disposable-test-bridge-secret-only',
      ADMIN_ORIGIN: adminOrigin,
      CUSTOMER_STOREFRONT_ORIGIN: origin,
    };
    child(
      resolve('apps/storefront'),
      [
        '--input-type=module',
        '--eval',
        `import { dev } from 'astro'; await dev({server:{host:'127.0.0.1',port:${new URL(origin).port}},vite:{server:{strictPort:true}}});`,
      ],
      env,
    );
    child(
      resolve('apps/admin'),
      [
        resolve('node_modules/vite/bin/vite.js'),
        '--host',
        'localhost',
        '--port',
        new URL(adminOrigin).port,
        '--strictPort',
      ],
      env,
    );
    await Promise.all([
      healthy(origin + '/apply/' + ready.slug),
      healthy(adminOrigin),
    ]);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext(),
        page = await context.newPage();
      const centralOrigin =
        'http://auth.platform.localhost:' + new URL(origin).port;
      const applicant = await browser.newContext(),
        accountPage = await applicant.newPage();
      const injectedScriptWarnings: string[] = [];
      accountPage.on('console', (event) => {
        if (
          /MaxListenersExceededWarning|ObjectMultiplex|orphaned data/.test(
            event.text(),
          )
        )
          injectedScriptWarnings.push(event.text());
      });
      const mailbox = async (email: string) => {
        const receipt = message<{ url: string }>(server, 'mailbox');
        server.send({ mailbox: email });
        return (await receipt).url;
      };
      let invitedAnswers: Record<string, unknown> | undefined;
      await check(
        'real signup requires SMS phone proof and creates a free dashboard with onboarding entries',
        async () => {
          await accountPage.goto(origin + '/apply/' + ready.slug);
          await accountPage.waitForFunction(
            () =>
              document
                .querySelector('form.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          await accountPage.getByLabel('No', { exact: true }).check();
          await accountPage
            .getByLabel('Business name (required)', { exact: true })
            .fill('Invitation Orchard');
          await accountPage
            .getByLabel('Contact first name (required)', { exact: true })
            .fill('Submitted');
          await accountPage
            .getByLabel('Contact last name (required)', { exact: true })
            .fill('Applicant');
          await accountPage
            .getByLabel('Email (required)', { exact: true })
            .fill('browser-free@test.invalid');
          await accountPage
            .getByRole('group', { name: 'Requested Market dates' })
            .getByRole('checkbox')
            .first()
            .check();
          await accountPage
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await accountPage
            .getByRole('heading', {
              name: 'Application submitted successfully.',
              exact: true,
            })
            .waitFor();
          const submitted = message<{
            rows: Array<{ answers: Record<string, unknown> }>;
          }>(server, 'submissions');
          server.send({ inspect: true });
          invitedAnswers = (await submitted).rows[0]!.answers;
          await accountPage
            .getByRole('link', { name: 'Claim My Free Account' })
            .click();
          await accountPage
            .getByRole('heading', { name: 'Create your free account' })
            .waitFor();
          await accountPage.getByLabel('First name').fill('Browser');
          await accountPage.getByLabel('Last name').fill('Applicant');
          await accountPage
            .getByLabel('Email', { exact: true })
            .fill('browser-free@test.invalid');
          await accountPage.waitForSelector('.phone-field[data-ready=true]');
          assert.equal(
            await accountPage
              .getByText(/Next, verify your personal phone number/)
              .count(),
            0,
          );
          assert.equal(
            await accountPage.getByText(/^Maximum 72 characters/).count(),
            0,
          );
          const national = accountPage.getByLabel(
            'Personal phone number (required)',
            { exact: true },
          );
          await national.fill('210555');
          await accountPage
            .getByLabel('Password', { exact: true })
            .fill('Browser-signup-password-1!');
          await accountPage
            .getByLabel('Confirm password', { exact: true })
            .fill('Browser-signup-password-1!');
          assert.equal(
            await national.evaluate((n: HTMLInputElement) => n.checkValidity()),
            false,
          );
          let invalidPosts = 0;
          const recordInvalidPost = (request: Request) => {
            if (
              request.url() === centralOrigin + '/api/account' &&
              request.method() === 'POST'
            )
              invalidPosts++;
          };
          accountPage.on('request', recordInvalidPost);
          await accountPage
            .getByRole('button', { name: 'Send Verification Code' })
            .click();
          accountPage.off('request', recordInvalidPost);
          assert.equal(
            invalidPosts,
            0,
            'An incomplete phone must not submit a signup request',
          );
          await accountPage
            .getByLabel('Personal phone number (required)', { exact: true })
            .fill('+4930901820');
          await accountPage
            .getByLabel('Password', { exact: true })
            .fill('Browser-signup-password-1!');
          await accountPage
            .getByLabel('Confirm password', { exact: true })
            .fill('Browser-signup-password-1!');
          const rejected = accountPage.waitForResponse(
            (response) =>
              response.url() === centralOrigin + '/api/account' &&
              response.request().method() === 'POST',
          );
          await accountPage
            .getByRole('button', { name: 'Send Verification Code' })
            .click();
          await accountPage.getByRole('alert').waitFor();
          assert.equal((await rejected).status(), 503);
          assert.equal(
            await accountPage
              .getByLabel('Password', { exact: true })
              .inputValue(),
            '',
          );
          assert.equal(
            await accountPage
              .getByLabel('Confirm password', { exact: true })
              .inputValue(),
            '',
          );
          assert.equal(accountPage.url(), centralOrigin + '/account/signup');
          assert.equal(
            await accountPage.getByLabel('First name').inputValue(),
            'Browser',
          );
          assert.equal(
            await accountPage.getByLabel('Email', { exact: true }).inputValue(),
            'browser-free@test.invalid',
          );
          assert.equal(
            await accountPage
              .getByRole('combobox', {
                name: 'Country calling code for Personal phone number',
              })
              .inputValue(),
            'DE',
          );
          await accessible(accountPage);
          await accountPage
            .getByRole('combobox', {
              name: 'Country calling code for Personal phone number',
            })
            .selectOption('US');
          await accountPage
            .getByLabel('Personal phone number (required)', { exact: true })
            .fill('2105550123');
          assert.equal(
            await accountPage
              .getByRole('combobox', {
                name: 'Country calling code for Personal phone number',
              })
              .inputValue(),
            'US',
          );
          assert.equal(
            await accountPage
              .getByLabel('Personal phone number (required)', { exact: true })
              .inputValue(),
            '(210) 555-0123',
          );
          assert.equal(
            await accountPage.locator('.phone-field small').isVisible(),
            false,
          );
          assert.equal(
            await national.evaluate((n: HTMLInputElement) => n.checkValidity()),
            true,
          );
          await accountPage
            .getByLabel('Password', { exact: true })
            .fill('Browser-signup-password-1!');
          await accountPage
            .getByLabel('Confirm password', { exact: true })
            .fill('Browser-signup-password-1!');
          await accountPage
            .getByRole('button', { name: 'Send Verification Code' })
            .click();
          await accountPage.waitForURL(centralOrigin + '/account/verify');
          const before = message<{ verified: boolean }>(server, 'account');
          server.send({ account: 'browser-free@test.invalid' });
          assert.equal((await before).verified, false);
          await accessible(accountPage);
          const sms = message<{ code: string }>(server, 'sms');
          server.send({ smsPhone: '+12105550123' });
          const firstCode = (await sms).code;
          const otp = accountPage.locator('[data-otp-digit]');
          assert.equal(await otp.count(), 6);
          assert.equal(
            await accountPage.locator('input[type=password]').count(),
            0,
          );
          assert.equal(await otp.first().getAttribute('inputmode'), 'numeric');
          assert.equal(
            await otp.first().getAttribute('autocomplete'),
            'one-time-code',
          );
          await otp.first().pressSequentially('123456');
          assert.deepEqual(
            await otp.evaluateAll((nodes) =>
              nodes.map((n) => (n as HTMLInputElement).value),
            ),
            ['1', '2', '3', '4', '5', '6'],
          );
          assert.equal(
            await otp.nth(5).evaluate((n) => n === document.activeElement),
            true,
          );
          await otp.nth(5).press('Backspace');
          assert.equal(await otp.nth(5).inputValue(), '');
          await otp.nth(5).press('Backspace');
          assert.equal(
            await otp.nth(4).evaluate((n) => n === document.activeElement),
            true,
          );
          await otp.nth(4).press('ArrowLeft');
          assert.equal(
            await otp.nth(3).evaluate((n) => n === document.activeElement),
            true,
          );
          await otp.nth(3).press('ArrowRight');
          await otp.first().fill('a');
          assert.equal(await otp.first().inputValue(), '');
          await otp.first().evaluate((input, code) => {
            const clipboard = new DataTransfer();
            clipboard.setData(
              'text/plain',
              code.slice(0, 3) + ' - ' + code.slice(3),
            );
            input.dispatchEvent(
              new ClipboardEvent('paste', {
                clipboardData: clipboard,
                bubbles: true,
                cancelable: true,
              }),
            );
          }, firstCode);
          assert.equal(
            await accountPage.locator('input[name=code]').inputValue(),
            firstCode,
          );
          const originalReceipt = (await applicant.cookies()).find(
            (c) => c.name === 'phone-challenge',
          )!;
          // Regression for the former accepted-but-throttled restart: the active
          // browser cookie must survive a rejected restart.
          const restart = await accountPage.evaluate(async () => {
            const r = await fetch('/api/account', {
              method: 'POST',
              headers: { 'x-account-form': 'json' },
              body: new URLSearchParams({
                action: 'register',
                firstName: 'Browser',
                lastName: 'Applicant',
                email: 'browser-free@test.invalid',
                phone: '+12105550123',
                password: 'Browser-signup-password-1!',
                confirmPassword: 'Browser-signup-password-1!',
              }),
            });
            return { status: r.status, result: await r.json() };
          });
          assert.equal(restart.status, 429);
          assert.equal(
            (await applicant.cookies()).find(
              (c) => c.name === 'phone-challenge',
            )!.value,
            originalReceipt.value,
          );
          assert.ok(
            !JSON.stringify(await applicant.cookies()).includes(
              'Browser-signup-password-1!',
            ),
          );
          // The rejected duplicate start must leave the SMS allowance available.
          await accountPage
            .getByRole('button', { name: 'Resend code', exact: true })
            .click();
          await accountPage
            .getByText('A new verification code has been sent.', {
              exact: true,
            })
            .waitFor();
          const next = message<{ code: string }>(server, 'sms');
          server.send({ smsPhone: '+12105550123' });
          const latestCode = (await next).code;
          assert.notEqual(latestCode, firstCode);
          assert.match(
            (await accountPage
              .locator('[data-resend-countdown]')
              .textContent())!,
            /Resend code in (60|59) seconds/,
          );
          await accountPage.waitForTimeout(1200);
          assert.match(
            (await accountPage
              .locator('[data-resend-countdown]')
              .textContent())!,
            /Resend code in 5[0-9] seconds/,
          );
          await accountPage.reload();
          assert.equal(
            await accountPage
              .getByRole('button', {
                name: 'Resend code',
                exact: true,
                includeHidden: true,
              })
              .isDisabled(),
            true,
          );
          const tab = await applicant.newPage();
          await tab.goto(centralOrigin + '/account/verify');
          assert.equal(
            await tab.locator('[data-resend-form] button').isDisabled(),
            true,
          );
          const blocked = await tab.evaluate(async () => {
            const r = await fetch('/api/account', {
              method: 'POST',
              headers: { 'x-account-form': 'json' },
              body: new URLSearchParams({ action: 'resendPhoneRegistration' }),
            });
            return { status: r.status, body: await r.json() };
          });
          assert.equal(blocked.status, 429);
          assert.ok(blocked.body.error);
          assert.ok(!blocked.body.accepted);
          await tab.close();
          await otp.first().fill(firstCode);
          await accountPage
            .getByRole('button', { name: 'Verify & Create Account' })
            .click();
          await accountPage
            .locator('[data-account-error]')
            .filter({ hasText: /Verification could not be completed/ })
            .waitFor();
          assert.equal(await otp.first().isEnabled(), true);
          await accessible(accountPage);
          await otp.first().fill(latestCode);
          await accountPage
            .getByRole('button', { name: 'Verify & Create Account' })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage
            .getByLabel('Email', { exact: true })
            .fill('browser-free@test.invalid');
          await accountPage
            .getByLabel('Password', { exact: true })
            .fill('Browser-signup-password-1!');
          await accountPage
            .getByRole('button', { name: 'Sign in', exact: true })
            .click();
          await accountPage
            .getByRole('heading', { name: 'Your account', exact: true })
            .waitFor();
          await accountPage
            .getByRole('link', { name: 'Become a Vendor', exact: true })
            .waitFor();
          await accountPage
            .getByRole('link', {
              name: 'Create / Manage a Market',
              exact: true,
            })
            .waitFor();
          assert.equal(
            await accountPage
              .getByRole('link', { name: /Open Vendor mode/ })
              .count(),
            0,
          );
          await accessible(accountPage);
        },
      );
      await check(
        'mobile signup and later resend wait a real server-enforced minute',
        async () => {
          const mobileContext = await browser.newContext({
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
          });
          const mobile = await mobileContext.newPage();
          try {
            await mobile.goto(centralOrigin + '/account/signup');
            await mobile.getByLabel('First name').fill('Mobile');
            await mobile.getByLabel('Last name').fill('Applicant');
            await mobile
              .getByLabel('Email', { exact: true })
              .fill('mobile-sms@test.invalid');
            await mobile.waitForSelector('.phone-field[data-ready=true]');
            const phone = mobile.getByLabel(
              'Personal phone number (required)',
              { exact: true },
            );
            await phone.pressSequentially('2105550170');
            assert.equal(await phone.inputValue(), '(210) 555-0170');
            await phone.pressSequentially('a!?9');
            assert.equal(await phone.inputValue(), '(210) 555-0170');
            await phone.fill('2105550170');
            const pw = mobile.getByLabel('Password', { exact: true }),
              confirm = mobile.getByLabel('Confirm password', { exact: true });
            await pw.fill('Mobile-password-1!');
            await confirm.fill('Mobile-password-2!');
            assert.equal(
              await confirm.evaluate((n) =>
                (n as HTMLInputElement).checkValidity(),
              ),
              false,
            );
            await mobile
              .getByText('Passwords do not match', { exact: true })
              .waitFor();
            await confirm.fill('Mobile-password-1!');
            await accessible(mobile);
            await mobile
              .getByRole('button', {
                name: 'Send Verification Code',
                exact: true,
              })
              .click();
            await mobile.waitForURL(centralOrigin + '/account/verify');
            const lookup = () => {
              const value = message<{ code: string }>(server, 'sms');
              server.send({ smsPhone: '+12105550170' });
              return value;
            };
            const initial = (await lookup()).code;
            await mobile
              .getByRole('button', { name: 'Resend code', exact: true })
              .click();
            await mobile
              .getByText('A new verification code has been sent.', {
                exact: true,
              })
              .waitFor();
            const second = (await lookup()).code;
            assert.notEqual(initial, second);
            await accessible(mobile);
            await mobile.screenshot({
              path:
                process.env.PHONE_TEST_SCREENSHOT ??
                'sms-mobile-verification.png',
              fullPage: true,
            });
            await mobile.waitForFunction(
              () =>
                !document.querySelector<HTMLButtonElement>(
                  '[data-resend-form] button',
                )?.disabled,
              {},
              { timeout: 65000 },
            );
            await mobile
              .getByRole('button', { name: 'Resend code', exact: true })
              .click();
            await mobile
              .getByText('A new verification code has been sent.', {
                exact: true,
              })
              .waitFor();
            const third = (await lookup()).code;
            assert.notEqual(second, third);
            assert.match(
              (await mobile.locator('[data-resend-countdown]').textContent())!,
              /Resend code in (60|59) seconds/,
            );
            await mobile.locator('[data-otp-digit]').first().fill(second);
            await mobile
              .getByRole('button', {
                name: 'Verify & Create Account',
                exact: true,
              })
              .click();
            await mobile
              .locator('[data-account-error]')
              .filter({ hasText: /Verification could not be completed/ })
              .waitFor();
            await mobile.locator('[data-otp-digit]').first().fill(third);
            await mobile
              .getByRole('button', {
                name: 'Verify & Create Account',
                exact: true,
              })
              .click();
            await mobile.waitForURL(
              centralOrigin + '/account/login?verified=1',
            );
          } finally {
            await mobileContext.close();
          }
        },
      );
      await check(
        'verified free account can apply as account-only without claiming its earlier anonymous submission',
        async () => {
          const submitted = message<{
            rows: Array<{
              principalId: number | null;
              mode: string;
              answers: Record<string, unknown>;
            }>;
          }>(server, 'submissions');
          server.send({ inspect: true });
          const before = (await submitted).rows;
          assert.equal(before.length, 1);
          assert.equal(before[0]!.principalId, null);
          assert.equal(before[0]!.mode, 'ANONYMOUS');
          assert.deepEqual(before[0]!.answers, invitedAnswers);
          await accountPage.goto(origin + '/apply/' + ready.slug);
          await accountPage.waitForFunction(
            () =>
              document
                .querySelector('form.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          await accountPage.getByLabel('Yes', { exact: true }).check();
          await accountPage
            .getByRole('button', { name: 'Sign in to my platform account' })
            .click();
          await accountPage.waitForURL(origin + '/apply/' + ready.slug);
          await accountPage
            .getByRole('button', { name: 'Fill empty fields from my account' })
            .click();
          assert.equal(
            await accountPage
              .getByRole('combobox', { name: 'Business for this application' })
              .count(),
            0,
          );
          await accountPage
            .getByLabel('Business name (required)', { exact: true })
            .fill('Account Only Orchard');
          await accountPage
            .getByRole('group', { name: 'Requested Market dates' })
            .getByRole('checkbox')
            .first()
            .check();
          await accountPage
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await accountPage
            .getByRole('heading', {
              name: 'Application submitted successfully.',
              exact: true,
            })
            .waitFor();
          await accountPage.goto(centralOrigin + '/account');
          await accountPage
            .getByRole('heading', { name: 'Your account', exact: true })
            .waitFor();
        },
      );
      await check(
        'profile edits and role drafts resume with the verified phone and no address field',
        async () => {
          await accountPage.getByLabel('First name').fill('Changed');
          await accountPage
            .getByRole('button', { name: 'Save personal profile' })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage.reload();
          assert.equal(
            await accountPage.getByLabel('First name').inputValue(),
            'Changed',
          );
          await accountPage
            .getByRole('link', { name: 'Become a Vendor', exact: true })
            .click();
          await accountPage.waitForSelector('.phone-field[data-ready=true]');
          assert.equal(
            await accountPage.locator('input[name=phone]').inputValue(),
            '+12105550123',
          );
          assert.equal(
            await accountPage.locator('input[name=location]').count(),
            0,
          );
          await accountPage
            .getByLabel('Business name')
            .fill('Browser Free Orchard');
          await accountPage
            .getByLabel('Contact phone', { exact: true })
            .fill('');
          await accountPage
            .getByRole('button', { name: 'Save progress', exact: true })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage.reload();
          assert.equal(
            await accountPage.getByLabel('Business name').inputValue(),
            'Browser Free Orchard',
          );
          assert.equal(
            await accountPage.locator('input[name=phone]').inputValue(),
            '+12105550123',
          );
          if (process.env.ONBOARDING_TEST_EVIDENCE_DIR)
            await accountPage.screenshot({
              path: resolve(
                process.env.ONBOARDING_TEST_EVIDENCE_DIR,
                'vendor.png',
              ),
              fullPage: true,
            });
          await accountPage.goto(centralOrigin + '/account');
          assert.equal(
            await accountPage
              .getByRole('link', { name: /Open Vendor mode/ })
              .count(),
            0,
          );
        },
      );
      let replacementCode = '';
      await check(
        'international replacement requires password and wrong code preserves the current phone',
        async () => {
          await accountPage.goto(centralOrigin + '/account/phone');
          await accountPage.waitForSelector('.phone-field[data-ready=true]');
          await accountPage
            .getByRole('combobox', {
              name: 'Country calling code for Personal phone number',
            })
            .selectOption('GB');
          await accountPage
            .getByLabel('Personal phone number (required)', { exact: true })
            .fill('02079460018');
          assert.equal(
            await accountPage
              .getByLabel('Personal phone number (required)', { exact: true })
              .inputValue(),
            '020 7946 0018',
          );
          await accountPage
            .getByLabel('Current password', { exact: true })
            .fill('Browser-signup-password-1!');
          await accountPage
            .getByRole('button', {
              name: 'Send SMS verification code',
              exact: true,
            })
            .click();
          await accountPage.waitForURL(centralOrigin + '/account/phone?sent=1');
          const sms = message<{ code: string }>(server, 'sms');
          server.send({ smsPhone: '+442079460018' });
          replacementCode = (await sms).code;
          await accountPage
            .getByLabel('SMS verification code', { exact: true })
            .fill(replacementCode === '000000' ? '000001' : '000000');
          await accountPage
            .getByRole('button', { name: 'Verify personal phone', exact: true })
            .click();
          await accountPage.getByRole('alert').waitFor();
          await accountPage.goto(centralOrigin + '/account');
          await accountPage
            .getByText('+12105550123', { exact: false })
            .waitFor();
        },
      );
      await check(
        'correct international replacement preserves published application snapshots',
        async () => {
          const before = message<{ rows: unknown[] }>(server, 'submissions');
          server.send({ inspect: true });
          const rows = (await before).rows;
          await accountPage.goto(centralOrigin + '/account/phone?sent=1');
          await accountPage
            .getByLabel('SMS verification code', { exact: true })
            .fill(replacementCode);
          await accountPage
            .getByRole('button', { name: 'Verify personal phone', exact: true })
            .click();
          await accountPage
            .getByText('+442079460018', { exact: false })
            .waitFor();
          const after = message<{ rows: unknown[] }>(server, 'submissions');
          server.send({ inspect: true });
          assert.deepEqual((await after).rows, rows);
          await accessible(accountPage);
        },
      );
      await check(
        'verified Vendor signup activates immediately without administrator approval',
        async () => {
          const start = accountPage.getByRole('link', {
            name: 'Become a Vendor',
            exact: true,
          });
          assert.ok((await start.getAttribute('class'))?.includes('button'));
          await start.click();
          assert.equal(
            await accountPage.getByLabel('Business name').inputValue(),
            'Browser Free Orchard',
          );
          await accountPage
            .getByRole('button', { name: 'Finish Vendor signup', exact: true })
            .click();
          await accountPage.waitForURL(
            centralOrigin + '/account?onboarded=vendor',
          );
          await accountPage
            .getByText('Your Vendor account is ready.', { exact: true })
            .waitFor();
          await accountPage
            .getByRole('link', {
              name: 'Open Vendor mode: Browser Free Orchard',
              exact: true,
            })
            .waitFor();
        },
      );
      await check(
        'Customer to Vendor and Vendor to Customer use one identity and the secure handoff',
        async () => {
          await accountPage
            .getByRole('link', {
              name: 'Open Vendor mode: Browser Free Orchard',
              exact: true,
            })
            .click();
          await accountPage
            .getByRole('button', { name: 'Use my platform account' })
            .click();
          await accountPage.getByLabel('Account mode').waitFor();
          assert.equal(
            await accountPage.getByLabel('Account mode').inputValue(),
            'VENDOR',
          );
          await accountPage.getByLabel('Account mode').selectOption('CUSTOMER');
          await accountPage.waitForURL(centralOrigin + '/account');
          await accountPage
            .getByText('Current mode: Customer.', { exact: false })
            .waitFor();
        },
      );
      await check(
        'verified Market signup reuses the timezone selector and opens its dashboard without approval',
        async () => {
          await accountPage
            .getByRole('link', {
              name: 'Create / Manage a Market',
              exact: true,
            })
            .click();
          await accountPage
            .getByLabel('Market name')
            .fill('Browser Free Market');
          await accountPage.waitForSelector('.phone-field[data-ready=true]');
          assert.equal(
            await accountPage.locator('input[name=phone]').inputValue(),
            '+442079460018',
          );
          assert.equal(
            await accountPage.locator('input[name=location]').count(),
            0,
          );
          const timezone = accountPage.getByLabel('Market timezone', {
            exact: true,
          });
          assert.equal(await timezone.evaluate((n) => n.tagName), 'SELECT');
          assert.equal(await timezone.locator('option').count(), 8);
          await timezone.selectOption('America/Denver');
          await accessible(accountPage);
          if (process.env.ONBOARDING_TEST_EVIDENCE_DIR)
            await accountPage.screenshot({
              path: resolve(
                process.env.ONBOARDING_TEST_EVIDENCE_DIR,
                'market.png',
              ),
              fullPage: true,
            });
          await accountPage
            .getByRole('button', { name: 'Finish Market signup', exact: true })
            .click();
          await accountPage.waitForURL(
            centralOrigin + '/account?onboarded=market',
          );
          await accountPage
            .getByText('Your Market Manager account is ready.', { exact: true })
            .waitFor();
          const marketLink = accountPage.getByRole('link', {
            name: 'Open Market Manager mode: Browser Free Market',
            exact: true,
          });
          const marketChannel = new URL(
            (await marketLink.getAttribute('href'))!,
          ).searchParams.get('channel')!;
          await marketLink.click();
          await accountPage.getByLabel('Account mode').waitFor();
          assert.equal(
            await accountPage.getByLabel('Account mode').inputValue(),
            'MARKET_MANAGER',
          );
          await accountPage.goto(
            adminOrigin + '/market/settings?channel=' + marketChannel,
          );
          assert.equal(
            await accountPage
              .getByLabel('Time zone', { exact: true })
              .inputValue(),
            'America/Denver',
          );
          await accountPage.getByLabel('Account mode').selectOption('VENDOR');
          await accountPage
            .locator('.brand')
            .filter({ hasText: 'Browser Free Orchard' })
            .waitFor();
          assert.equal(
            await accountPage.getByLabel('Account mode').inputValue(),
            'VENDOR',
          );
        },
      );
      await check(
        'account page and selector are accessible and fit a mobile viewport',
        async () => {
          await accountPage.setViewportSize({ width: 390, height: 844 });
          await accountPage
            .getByRole('link', { name: 'Your account', exact: true })
            .click();
          await accountPage.waitForURL(centralOrigin + '/account');
          await accessible(accountPage);
          assert.ok(
            await accountPage.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          );
          await accountPage.keyboard.press('Tab');
          await accountPage
            .getByRole('link', {
              name: 'Open Vendor mode: Browser Free Orchard',
              exact: true,
            })
            .click();
          await accountPage.getByLabel('Account mode').waitFor();
          await accountPage.getByLabel('Account mode').focus();
          assert.equal(
            await accountPage
              .getByLabel('Account mode')
              .evaluate((e) => document.activeElement === e),
            true,
          );
          assert.ok(
            await accountPage.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          );
        },
      );
      await check(
        'browser password recovery invalidates the prior session and supports login again',
        async () => {
          await accountPage.goto(centralOrigin + '/account');
          await accountPage
            .getByRole('button', { name: 'Send optional email verification' })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage.goto(await mailbox('browser-free@test.invalid'));
          await accountPage
            .getByRole('button', { name: 'Verify account email' })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage.goto(centralOrigin + '/account/recover');
          await accountPage
            .getByLabel('Email', { exact: true })
            .fill('browser-free@test.invalid');
          await accountPage
            .getByRole('button', { name: 'Send recovery email' })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage.goto(await mailbox('browser-free@test.invalid'));
          await accountPage
            .getByLabel('New password')
            .fill('Browser-replacement-1!password');
          await accountPage
            .getByRole('button', { name: 'Reset password', exact: true })
            .click();
          await accountPage.getByRole('status').waitFor();
          await accountPage
            .getByLabel('Email', { exact: true })
            .fill('browser-free@test.invalid');
          await accountPage
            .getByLabel('Password', { exact: true })
            .fill('Browser-replacement-1!password');
          await accountPage
            .getByRole('button', { name: 'Sign in', exact: true })
            .click();
          await accountPage
            .getByRole('heading', { name: 'Your account', exact: true })
            .waitFor();
          await accountPage
            .getByRole('button', { name: 'Sign out', exact: true })
            .click();
          await accountPage.goto(centralOrigin + '/account');
          await accountPage
            .getByRole('heading', { name: /Sign in to/ })
            .waitFor();
        },
      );
      const fill = async () => {
        await page
          .getByLabel('Business name (required)', { exact: true })
          .fill('Browser Orchard');
        await page
          .getByLabel('Contact first name (required)', { exact: true })
          .fill('Draft');
        await page
          .getByLabel('Contact last name (required)', { exact: true })
          .fill('Farmer');
        await page
          .getByLabel('Email (required)', { exact: true })
          .fill('anonymous@test.invalid');
        await page
          .getByRole('group', { name: 'Requested Market dates' })
          .getByRole('checkbox')
          .first()
          .check();
      };
      await check(
        'advertised Market homepage links to the published application',
        async () => {
          await page.goto(origin);
          await page.getByRole('link', { name: /Apply/ }).first().click();
          await page.getByLabel('No', { exact: true }).waitFor();
          assert.match(page.url(), /\/apply/);
        },
      );
      await check(
        'mandatory question precedes fields and anonymous submission shows a dismissible invitation',
        async () => {
          await page.waitForFunction(
            () =>
              document
                .querySelector('form.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          assert.match(
            (await page
              .locator('form.ops-application fieldset')
              .first()
              .textContent()) ?? '',
            /Do you have an account/,
          );
          await page.getByLabel('No', { exact: true }).check();
          await fill();
          await accessible(page);
          await page
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await page
            .getByRole('heading', {
              name: 'Application submitted successfully.',
              exact: true,
            })
            .waitFor();
          await page
            .getByRole('link', { name: 'Claim My Free Account' })
            .waitFor();
          await page.getByRole('button', { name: 'Maybe Later' }).click();
          assert.equal(
            await page
              .getByRole('link', { name: 'Claim My Free Account' })
              .count(),
            0,
          );
          await page
            .getByRole('heading', {
              name: 'Application submitted successfully.',
            })
            .waitFor();
        },
      );
      await check(
        'signup uses central registration and preserves the existing claim route',
        async () => {
          await page.goto(origin + '/account/signup');
          await page
            .getByRole('heading', { name: 'Create your free account' })
            .waitFor();
          await page.getByLabel('First name').waitFor();
          assert.match(page.url(), /auth\.platform\.localhost/);
          await accessible(page);
          const claim = await page.goto(centralOrigin + '/auth/claim');
          assert.notEqual(claim?.status(), 404);
        },
      );
      await check(
        'real central login returns to the same application with encrypted progress and scoped autofill',
        async () => {
          await page.goto(origin + '/apply/' + ready.slug);
          await page.waitForFunction(
            () =>
              document
                .querySelector('form.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          await page.getByLabel('Yes', { exact: true }).check();
          await page
            .getByLabel('Business name (required)', { exact: true })
            .fill('Retained Browser Orchard');
          await page
            .getByLabel('Contact first name (required)', { exact: true })
            .fill('Retained Contact');
          await page
            .getByRole('button', { name: 'Sign in to my platform account' })
            .click();
          await page.waitForURL(centralOrigin + '/account/login**');
          await page
            .getByLabel('Email', { exact: true })
            .fill('identity-owner-0@test.invalid');
          await page
            .getByLabel('Password', { exact: true })
            .fill('local-identity-regression-only-password');
          await page
            .getByRole('button', { name: 'Sign in', exact: true })
            .click();
          await page.waitForURL(origin + '/apply/' + ready.slug);
          await page
            .getByRole('combobox', { name: 'Business for this application' })
            .waitFor();
          assert.equal(
            await page
              .getByLabel('Business name (required)', { exact: true })
              .inputValue(),
            'Retained Browser Orchard',
          );
          assert.equal(
            await page
              .getByLabel('Contact first name (required)', { exact: true })
              .inputValue(),
            'Retained Contact',
          );
          await page
            .getByRole('combobox', { name: 'Business for this application' })
            .selectOption({ label: ready.vendorName });
          await page
            .getByRole('button', { name: 'Fill empty fields from my account' })
            .click();
          assert.equal(
            await page
              .getByLabel('Email (required)', { exact: true })
              .inputValue(),
            'identity-owner-0@test.invalid',
          );
          await page
            .getByRole('group', { name: 'Requested Market dates' })
            .getByRole('checkbox')
            .first()
            .check();
          await accessible(page);
          await page
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await page
            .getByRole('heading', {
              name: 'Application submitted successfully.',
            })
            .waitFor();
          assert.equal(
            await page
              .getByRole('link', { name: 'Claim My Free Account' })
              .count(),
            0,
          );
        },
      );
      await check(
        'the same browser account enters Admin and switches Vendor, Market and Customer contexts',
        async () => {
          page.on('pageerror', (e) =>
            console.error('Browser error:', e.message),
          );
          await page.goto(adminOrigin);
          await page
            .getByRole('button', { name: 'Use my platform account' })
            .click();
          try {
            await page.getByLabel('Account mode').waitFor();
          } catch (e) {
            console.error(
              'Account return state:',
              page.url(),
              await page.locator('body').innerText(),
            );
            throw e;
          }
          await page.getByLabel('Account mode').selectOption('VENDOR');
          await page
            .locator('.brand')
            .filter({ hasText: ready.vendorName })
            .waitFor();
          await page.getByLabel('Business', { exact: true }).waitFor();
          const vendorOptions = await page
            .getByLabel('Business', { exact: true })
            .locator('option')
            .allTextContents();
          assert.equal(vendorOptions.length, 2);
          await page
            .getByLabel('Business', { exact: true })
            .selectOption({ label: vendorOptions[1]! });
          await page
            .locator('.brand')
            .filter({ hasText: vendorOptions[1]! })
            .waitFor();
          await page
            .getByLabel('Business', { exact: true })
            .selectOption({ label: vendorOptions[0]! });
          await page
            .locator('.brand')
            .filter({ hasText: vendorOptions[0]! })
            .waitFor();
          await page.getByLabel('Account mode').selectOption('MARKET_MANAGER');
          await page
            .locator('.brand')
            .filter({ hasText: ready.marketName })
            .waitFor();
          await page
            .getByLabel('Business', { exact: true })
            .locator('option')
            .nth(1)
            .waitFor({ state: 'attached' });
          const marketOptions = await page
            .getByLabel('Business', { exact: true })
            .locator('option')
            .allTextContents();
          assert.equal(marketOptions.length, 2);
          await page
            .getByLabel('Business', { exact: true })
            .selectOption({ label: marketOptions[1]! });
          await page
            .locator('.brand')
            .filter({ hasText: marketOptions[1]! })
            .waitFor();
          await page
            .getByLabel('Business', { exact: true })
            .selectOption({ label: marketOptions[0]! });
          await page
            .locator('.brand')
            .filter({ hasText: marketOptions[0]! })
            .waitFor();
          await page.getByLabel('Account mode').selectOption('CUSTOMER');
          await page.waitForURL(centralOrigin + '/account');
          await page
            .getByText('identity-owner-0@test.invalid', { exact: true })
            .first()
            .waitFor();
        },
      );
      await check(
        'browser submissions have durable authoritative anonymous and Vendor provenance',
        async () => {
          const result = message<{
            rows: Array<{
              mode: string;
              principalId: number | null;
              vendorId: number | null;
              answers: Record<string, unknown>;
            }>;
          }>(server, 'submissions');
          server.send({ inspect: true });
          const rows = (await result).rows;
          assert.equal(rows.length, 4);
          const [invited, accountOnly, anonymous, vendor] = rows;
          assert.equal(invited!.principalId, null);
          assert.equal(invited!.mode, 'ANONYMOUS');
          assert.deepEqual(invited!.answers, invitedAnswers);
          assert.equal(accountOnly!.mode, 'ACCOUNT_ONLY');
          assert.ok(accountOnly!.principalId);
          assert.equal(accountOnly!.vendorId, null);
          assert.ok(anonymous && vendor);
          assert.equal(anonymous.mode, 'ANONYMOUS');
          assert.equal(anonymous.vendorId, null);
          assert.equal(vendor.mode, 'AUTHORIZED_VENDOR');
          assert.ok(vendor.vendorId);
          assert.equal(vendor.answers.businessName, 'Retained Browser Orchard');
        },
      );
      await check(
        'Customer dashboard business selectors open only their authorized workspace choices',
        async () => {
          await page.getByLabel('Vendor business', { exact: true }).waitFor();
          const choices = await page
            .getByLabel('Vendor business', { exact: true })
            .locator('option')
            .allTextContents();
          assert.equal(choices.length, 2);
          await page
            .getByLabel('Vendor business', { exact: true })
            .selectOption({ label: choices[1]! });
          await page
            .getByRole('link', {
              name: 'Open selected Vendor mode',
              exact: true,
            })
            .click();
          await page
            .locator('.brand')
            .filter({ hasText: choices[1]! })
            .waitFor();
          await page.getByLabel('Account mode').selectOption('CUSTOMER');
          await page.waitForURL(centralOrigin + '/account');
          const markets = await page
            .getByLabel('Market organization', { exact: true })
            .locator('option')
            .allTextContents();
          assert.equal(markets.length, 2);
          await page
            .getByLabel('Market organization', { exact: true })
            .selectOption({ label: markets[1]! });
          await page
            .getByRole('link', {
              name: 'Open selected Market Manager mode',
              exact: true,
            })
            .click();
          await page
            .locator('.brand')
            .filter({ hasText: markets[1]! })
            .waitFor();
        },
      );
      await check(
        'legacy multi-role login requires SMS and retains both Vendor and Market choices',
        async () => {
          const pending = message(server, 'legacy');
          server.send({ legacy: 'identity-owner-0@test.invalid' });
          await pending;
          const legacyContext = await browser.newContext(),
            legacy = await legacyContext.newPage();
          try {
            await legacy.goto(centralOrigin + '/account/login');
            await legacy
              .getByLabel('Email', { exact: true })
              .fill('identity-owner-0@test.invalid');
            await legacy
              .getByLabel('Password', { exact: true })
              .fill('local-identity-regression-only-password');
            await legacy
              .getByRole('button', { name: 'Sign in', exact: true })
              .click();
            await legacy
              .getByRole('heading', {
                name: 'Verify your personal phone',
                exact: true,
              })
              .waitFor();
            assert.equal(
              await legacy
                .getByRole('link', { name: /Open selected Vendor mode/ })
                .count(),
              0,
            );
            await legacy.waitForSelector('.phone-field[data-ready=true]');
            await legacy
              .getByLabel('Personal phone number (required)', { exact: true })
              .fill('2105550135');
            await legacy
              .getByLabel('Current password', { exact: true })
              .fill('local-identity-regression-only-password');
            await legacy
              .getByRole('button', {
                name: 'Send SMS verification code',
                exact: true,
              })
              .click();
            await legacy.waitForURL(centralOrigin + '/account/phone?sent=1');
            const sms = message<{ code: string }>(server, 'sms');
            server.send({ smsPhone: '+12105550135' });
            await legacy
              .getByLabel('SMS verification code', { exact: true })
              .fill((await sms).code);
            await legacy
              .getByRole('button', {
                name: 'Verify personal phone',
                exact: true,
              })
              .click();
            await legacy
              .getByRole('heading', { name: 'Your account', exact: true })
              .waitFor();
            assert.equal(
              await legacy
                .getByLabel('Vendor business', { exact: true })
                .locator('option')
                .count(),
              2,
            );
            assert.equal(
              await legacy
                .getByLabel('Market organization', { exact: true })
                .locator('option')
                .count(),
              2,
            );
            await accessible(legacy);
          } finally {
            await legacyContext.close();
          }
        },
      );
      await check(
        'cross-origin account form requests fail before applying a profile or session change',
        async () => {
          const denied = await applicant.request.post(origin + '/api/account', {
            headers: {
              host: new URL(centralOrigin).host,
              origin: 'http://attacker.invalid',
            },
            form: {
              action: 'updateProfile',
              firstName: 'Forged',
              lastName: 'Update',
              phoneNumber: '',
            },
          });
          assert.equal(denied.status(), 403);
        },
      );
      assert.deepEqual(
        injectedScriptWarnings,
        [],
        'Clean Chromium must not produce extension-style stream warnings',
      );
      if (process.argv.includes('--serve')) {
        await check(
          'manual demo starts with fresh owned SMS limits after automated checks',
          async () => {
            const prepared = message<{ rateRows: number }>(
              server,
              'manual-ready',
            );
            server.send({ prepareManual: true });
            assert.equal((await prepared).rateRows, 0);
            assert.equal(
              server.listenerCount('exit'),
              0,
              'Finished IPC requests must release their exit listeners',
            );
          },
        );
      }
      success = true;
      console.log(
        JSON.stringify({
          suite: 'account-signup-onboarding-browser',
          passed,
          failed: 0,
          database: ready.database,
        }),
      );
      if (process.argv.includes('--serve')) {
        console.log(
          'Manual SMS allowance starts fresh now: normal phone/client/global limits remain enforced.',
        );
        console.log(
          'Disposable manual environment ready: ' +
            centralOrigin +
            '/account and ' +
            adminOrigin +
            '. Press Enter to stop and clean up this successful test database.',
        );
        console.log(
          'Local SMS lookup: enter sms +12105550123. An empty line stops this disposable environment.',
        );
        await new Promise<void>((resolve) => {
          process.stdin.resume();
          const input = createInterface({ input: process.stdin });
          input.on('line', async (line) => {
            if (line.startsWith('sms ')) {
              const reply = message<{ code?: string }>(server, 'sms');
              server.send({ smsPhone: line.slice(4).trim() });
              console.log(
                'Latest accepted development SMS code (unchanged after a rejected send): ' +
                  ((await reply).code ?? 'No matching message'),
              );
            } else if (!line.trim()) {
              input.close();
              resolve();
            }
          });
          process.once('SIGINT', () => resolve());
          process.once('SIGTERM', () => resolve());
        });
        process.stdin.pause();
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (server.connected && server.exitCode === null) {
      const exit = new Promise((r) => server.once('exit', r));
      server.send({ close: true, success });
      await exit;
    }
    for (const p of children) if (p.exitCode === null) p.kill();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
