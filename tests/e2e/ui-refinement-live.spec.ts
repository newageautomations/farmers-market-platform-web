import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.skip(
  process.env.UI_REFINEMENT_DISPOSABLE !== 'true',
  'Requires the existing disposable Documents demo. Never run against the protected development database.',
);
const password = 'local-identity-regression-only-password'; // Existing backend test fixture, never a production credential.
async function fixtureEntry(page: Page) {
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const fixture = source.replace(
      /if\s*\(\s*(?:false|__FIXTURE_MODE__)\s*\)/,
      'if (true)',
    );
    expect(fixture).not.toBe(source);
    await route.fulfill({ response, body: fixture });
  });
}
async function login(page: Page, username: string, path: string) {
  await page.goto(path);
  await page
    .getByLabel('Sign in with', { exact: true })
    .selectOption('username');
  await page
    .getByLabel('Administrator username', { exact: true })
    .fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toBeVisible();
  await page.goto(path);
}
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
}
async function check(page: Page, _name: string, selector?: string) {
  await settled(page);
  const axe = new AxeBuilder({ page });
  if (selector) axe.include(selector);
  expect((await axe.analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
for (const width of [390, 768, 1280]) {
  test(`document library, readiness, reports and vendor selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, 'market-a@test.invalid', '/market/documents');
    const library = page.getByRole('tab', { name: 'Library', exact: true });
    const agreements = page.getByRole('tab', {
      name: 'Agreements',
      exact: true,
    });
    await expect(library).not.toHaveClass(/\bbutton\b/);
    await expect
      .poll(() =>
        library.evaluate((el) => getComputedStyle(el, '::after').opacity),
      )
      .toBe('1');
    await agreements.hover();
    await expect(agreements).toHaveCSS('transform', 'none');
    await expect(agreements).toHaveCSS('box-shadow', 'none');
    await expect(agreements).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(agreements).toHaveCSS('border-radius', '0px');
    await expect
      .poll(() =>
        agreements.evaluate((el) => getComputedStyle(el, '::after').opacity),
      )
      .toBe('0.35');
    await agreements.click();
    await expect(agreements).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() =>
        agreements.evaluate((el) => getComputedStyle(el, '::after').opacity),
      )
      .toBe('1');
    await library.click();
    await expect(library).toHaveAttribute('aria-selected', 'true');
    const card = page.locator('.ui-record-card').first();
    await expect(card).toBeVisible();
    await expect(card.getByRole('button')).toHaveCount(1);
    const trigger = card.getByRole('button');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('combobox', { name: 'File version' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Download', exact: true }),
    ).toBeEnabled();
    await check(page, `library-detail-${width}`, 'dialog[open]');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await check(page, `library-${width}`);
    await page
      .getByRole('tab', { name: 'Vendor compliance', exact: true })
      .click();
    const readiness = page.getByRole('table', {
      name: 'Vendor documentation readiness',
    });
    await expect(readiness.getByRole('columnheader')).toHaveText([
      'Vendor',
      'Readiness',
    ]);
    await readiness.locator('tbody tr').first().click();
    await expect(
      page
        .getByRole('dialog')
        .getByText('Outstanding required', { exact: true }),
    ).toBeVisible();
    await check(page, `readiness-${width}`, 'dialog[open]');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page
      .getByRole('tab', { name: 'Readiness and reports', exact: true })
      .click();
    const report = page.getByRole('table', {
      name: 'Compliance report',
      exact: true,
    });
    await expect(report.getByRole('columnheader')).toHaveCount(2);
    await report.getByRole('button').first().click();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('link', { name: 'Open Vendor compliance' }),
    ).toBeVisible();
    await check(page, `report-${width}`, 'dialog[open]');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Requirements', exact: true }).click();
    const nativeSelect = page
      .getByRole('combobox', { name: 'Collection stage', exact: true })
      .first();
    const nativeHeight = await nativeSelect.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    const nativeGeometry = await nativeSelect.evaluate((el) => {
      (el as HTMLSelectElement).add(
        new Option(
          'A very long selected label '.repeat(12),
          'presentation-test',
          true,
          true,
        ),
      );
      const style = getComputedStyle(el),
        arrow = getComputedStyle(el, '::picker-icon');
      return {
        height: el.getBoundingClientRect().height,
        overflow: style.textOverflow,
        wrap: style.whiteSpace,
        right: arrow.right,
      };
    });
    expect(nativeGeometry.height).toBe(nativeHeight);
    expect(nativeGeometry.overflow).toBe('ellipsis');
    expect(nativeGeometry.wrap).toBe('nowrap');
    expect(nativeGeometry.right).toBe('12px');
    const vendors = page
      .getByRole('combobox', { name: 'Add vendors', exact: true })
      .first();
    await vendors.click();
    const list = page.getByRole('listbox', {
      name: 'Add vendors',
      exact: true,
    });
    const chosen = list.getByRole('option').last(),
      chosenName = (await chosen.innerText()).trim();
    await chosen.click();
    await expect(list.getByRole('option').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(list.getByRole('option').first()).toContainText(chosenName);
    await vendors.fill(chosenName.slice(0, 5));
    await expect(list.getByRole('option').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(vendors).toHaveAttribute('aria-expanded', 'false');
    await settled(page);
    expect(
      await vendors.evaluate((el) => getComputedStyle(el).whiteSpace),
    ).toBe('nowrap');
    expect(
      await vendors.evaluate((el) => getComputedStyle(el).textOverflow),
    ).toBe('ellipsis');
    const geometry = await vendors.evaluate((el) => {
      const control = el.parentElement!,
        arrow = control.querySelector('svg')!;
      return {
        right:
          control.getBoundingClientRect().right -
          arrow.getBoundingClientRect().right,
        height: el.getBoundingClientRect().height,
      };
    });
    expect(geometry.right).toBeGreaterThanOrEqual(10);
    expect(geometry.right).toBeLessThan(16);
    expect(geometry.height).toBe(40);
    await check(page, `multiselect-${width}`, '.documents-workspace');
  });
  for (const [user, scope] of [
    ['market-a@test.invalid', 'market'],
    ['identity-owner-0@test.invalid', 'vendor'],
    ['identity-regression-superadmin', 'platform'],
  ]) {
    test(`${scope} sidebar and settings at ${width}px`, async ({ page }) => {
      if (scope === 'platform') {
        // The Documents harness has no platform-management API. Use the existing
        // fixture entry for this shared shell without altering application code.
        await fixtureEntry(page);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto('/platform/settings');
        await page.getByLabel('Preview scope').selectOption('PLATFORM');
        await page
          .locator('#market-sidebar')
          .getByRole('link', { name: 'Settings', exact: true })
          .click();
        await expect(
          page.getByText('Sign in to save your dashboard colors.'),
        ).toBeVisible();
        await page.setViewportSize({ width, height: 900 });
      } else {
        await page.setViewportSize({ width, height: 900 });
        await login(page, user!, `/${scope}/settings`);
        await expect(
          page.getByRole('region', { name: 'Dashboard colors' }),
        ).toBeVisible();
        const colors = page.getByRole('region', { name: 'Dashboard colors' });
        const primary = colors.getByLabel('Primary', { exact: true });
        const original = await primary.inputValue();
        const wrapper = page.locator('.admin-dashboard');
        const savedPrimary = await wrapper.evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--brand-primary').trim(),
        );
        await colors
          .getByRole('combobox', { name: 'Theme preset' })
          .selectOption('ocean');
        await expect(primary).toHaveValue('#245A75');
        await expect(wrapper).toHaveCSS('--brand-primary', savedPrimary);
        const preview = colors.getByLabel('Dashboard color preview');
        await expect(preview).toHaveCSS('--brand-primary', '#245A75');
        const tertiary = preview.getByRole('button', {
          name: 'Tertiary',
          exact: true,
        });
        await tertiary.hover();
        await expect(tertiary).toHaveCSS('transform', 'none');
        await expect(tertiary).not.toHaveCSS('box-shadow', 'none');
        await colors
          .getByRole('button', { name: 'Cancel', exact: true })
          .click();
        await expect(primary).toHaveValue(original);
      }
      if (width >= 768) {
        const sidebar = page.locator('#market-sidebar');
        await page.getByRole('button', { name: 'Collapse sidebar' }).click();
        await settled(page);
        await expect(sidebar).toBeVisible();
        expect((await sidebar.boundingBox())!.width).toBeLessThan(85);
        const link = sidebar.getByRole('link').nth(1);
        await link.focus();
        await expect(page.getByRole('tooltip')).toHaveText(
          (await link.getAttribute('aria-label'))!,
        );
        await page.keyboard.press('Escape');
        await expect(page.getByRole('tooltip')).toHaveCount(0);
        await check(page, `${scope}-rail-${width}`);
        await page.getByRole('button', { name: 'Expand sidebar' }).click();
        await settled(page);
        expect((await sidebar.boundingBox())!.width).toBeGreaterThan(180);
      } else {
        await expect(page.locator('#market-sidebar')).toBeHidden();
        await page.getByText('Dashboard menu', { exact: true }).count();
        await page.locator('.ui-dashboard-menu > summary').click();
        await expect(
          page.locator('.ui-dashboard-mobile-links').getByRole('navigation'),
        ).toBeVisible();
      }
      await check(page, `${scope}-settings-${width}`);
    });
  }
}
test('Market utility and record controls stay stationary', async ({ page }) => {
  await fixtureEntry(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/market');
  const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
  await collapse.hover();
  await expect(collapse).toHaveCSS('transform', 'none');
  await collapse.click();
  const expand = page.getByRole('button', { name: 'Expand sidebar' });
  await expand.hover();
  await expect(expand).toHaveCSS('transform', 'none');
  await expand.click();
  const record = page
    .getByRole('table', { name: 'Vendor relationships' })
    .getByRole('button')
    .first();
  await record.hover();
  await expect(record).toHaveCSS('transform', 'none');
  await record.click();
  const close = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true });
  await close.hover();
  await expect(close).toHaveCSS('transform', 'none');
  await close.click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(record).toBeFocused();
});

test('equivalent Market and Vendor record lists reuse accessible detail behavior', async ({
  page,
}) => {
  await fixtureEntry(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [scope, path, label] of [
    ['MARKET', '/market/occurrences', 'Market occurrences'],
    ['MARKET', '/market/vendors', 'Vendor business relationships'],
    ['VENDOR', '/vendor/products', 'Owned products'],
    ['VENDOR', '/vendor/customers', 'Owned customer relationships'],
    ['VENDOR', '/vendor/markets', 'Owned Market relationships'],
  ]) {
    await page.goto(path!);
    await page.getByLabel('Preview scope').selectOption(scope!);
    const table = page.getByRole('table', { name: label!, exact: true });
    await expect(table.getByRole('columnheader')).toHaveCount(2);
    const record = table.getByRole('button').first();
    await record.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(page, path!, 'dialog[open]');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(record).toBeFocused();
  }
});
test('account palette persists across reload and sign-in, isolates users and rejects invalid writes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, 'market-a@test.invalid', '/market/settings');
  const colors = page.getByRole('region', { name: 'Dashboard colors' });
  await colors
    .getByRole('button', { name: 'Restore defaults', exact: true })
    .click();
  const initialSave = page.waitForRequest(
    (request) =>
      request.postData()?.includes('SaveOwnDashboardPalette') ?? false,
  );
  await colors.getByRole('button', { name: 'Save', exact: true }).click();
  const preferenceRequest = await initialSave;
  const preferenceHeaders = await preferenceRequest.allHeaders();
  await expect(colors.getByText('Dashboard colors saved.')).toBeVisible();
  const original = await colors
    .getByLabel('Primary', { exact: true })
    .inputValue();
  await colors
    .getByRole('combobox', { name: 'Theme preset' })
    .selectOption('ocean');
  await colors.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(colors.getByText('Dashboard colors saved.')).toBeVisible();
  await page.reload();
  await expect(
    colors.getByRole('combobox', { name: 'Theme preset' }),
  ).toHaveValue('ocean');
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    '#245A75',
  );
  await colors.getByLabel('Primary', { exact: true }).fill('#ffffff');
  await colors.getByLabel('Secondary', { exact: true }).fill('#702080');
  await colors.getByLabel('Card background', { exact: true }).fill('#101820');
  await expect(colors.getByText(/Tip:/)).toBeVisible();
  await expect(
    colors.getByRole('button', { name: 'Save', exact: true }),
  ).toBeEnabled();
  await colors.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(colors.getByText('Dashboard colors saved.')).toBeVisible();
  await page.reload();
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    '#ffffff',
  );
  await expect(
    colors.getByLabel('Card background', { exact: true }),
  ).toHaveValue('#101820');
  await expect(
    page.locator('#market-sidebar nav a:not([aria-current="page"])').first(),
  ).toHaveCSS('color', 'rgb(112, 32, 128)');
  const secondary = colors.getByRole('button', { name: 'Cancel', exact: true });
  await secondary.hover();
  await expect(secondary).toHaveCSS('border-color', 'rgb(112, 32, 128)');
  await colors
    .getByRole('button', { name: 'Restore defaults', exact: true })
    .click();
  await colors.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(colors.getByText('Dashboard colors saved.')).toBeVisible();
  await colors.getByLabel('Primary', { exact: true }).fill('#492d65');
  await expect(page.locator('.admin-dashboard')).not.toHaveCSS(
    '--brand-primary',
    '#492d65',
  );
  await colors.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    original,
  );
  await colors.getByLabel('Primary', { exact: true }).fill('#492d65');
  await colors.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(colors.getByText('Dashboard colors saved.')).toBeVisible();
  await page.reload();
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    '#492d65',
  );
  await page.goto('/market/documents');
  await expect(page.locator('.admin-dashboard')).toHaveCSS(
    '--brand-primary',
    '#492d65',
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await login(page, 'market-b@test.invalid', '/market/settings');
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    original,
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await login(page, 'market-a@test.invalid', '/market/settings');
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    '#492d65',
  );
  const rejected = await page.evaluate(
    async ({ query, channelToken }) => {
      const response = await fetch('http://localhost:3000/admin-api', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'vendure-token': channelToken,
        },
        body: JSON.stringify({
          query,
          variables: {
            input: {
              key: 'marketDashboard.palette',
              value: {
                primary: 'red;display:none',
                secondary: '#344A42',
                background: '#F5F6F3',
                surface: '#FFFFFF',
                userId: 2,
              },
            },
          },
        }),
      });
      return response.json();
    },
    {
      query: preferenceRequest.postDataJSON().query as string,
      channelToken: preferenceHeaders['vendure-token']!,
    },
  );
  expect(rejected.data.setSettingsStoreValue.result).toBe(false);
  await colors
    .getByRole('button', { name: 'Restore defaults', exact: true })
    .click();
  await expect(page.locator('.admin-dashboard')).toHaveCSS(
    '--brand-primary',
    '#492d65',
  );
  await colors.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(colors.getByText('Dashboard colors saved.')).toBeVisible();
  await page.reload();
  await expect(colors.getByLabel('Primary', { exact: true })).toHaveValue(
    original,
  );
});

for (const width of [390, 768, 1280]) {
  test(`shared control geometry, top-layer help and keyboard-only outlines at ${width}px`, async ({
    page,
  }) => {
    await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `import '/@fs/${process.cwd().replaceAll('\\', '/')}/tests/fixtures/control-refinement-preview.tsx';`,
      }),
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const secondary = page.getByRole('button', { name: 'Secondary action' });
    for (const name of [
      'Primary action',
      'Secondary action',
      'Tertiary action',
      'Compact action',
    ]) {
      const action = page.getByRole('button', { name, exact: true });
      await expect(action).toHaveCSS('height', '40px');
      await expect(action).toHaveCSS('border-radius', '22px');
      await expect(action).toHaveCSS('padding-left', '18px');
      await action.hover();
      await expect(action).toHaveCSS(
        'transform',
        name === 'Tertiary action' ? 'none' : 'matrix(1, 0, 0, 1, 0, -4)',
      );
      await expect(action).not.toHaveCSS('box-shadow', 'none');
      const expected = await action.evaluate(
        (el, primary) => {
          const style = getComputedStyle(el),
            probe = document.createElement('span');
          probe.style.backgroundColor = primary
            ? `color-mix(in srgb, ${style.getPropertyValue('--brand-primary')}, black 28%)`
            : `color-mix(in srgb, ${style.getPropertyValue('--brand-primary')} 10%, ${style.getPropertyValue('--brand-surface')})`;
          document.body.append(probe);
          const color = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return color;
        },
        name === 'Primary action' || name === 'Compact action',
      );
      await expect(action).toHaveCSS('background-color', expected);
      if (name === 'Tertiary action') {
        await page.mouse.move(0, 0);
        await action.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(action).toBeFocused();
        await expect(action).toHaveCSS('transform', 'none');
        await expect(action).not.toHaveCSS('box-shadow', 'none');
        await expect(action).toHaveCSS('outline-width', '2px');
      }
    }
    const disabled = page.getByRole('button', { name: 'Unavailable action' });
    await disabled.hover({ force: true });
    await expect(disabled).toHaveCSS('transform', 'none');
    await expect(disabled).toHaveCSS('box-shadow', 'none');
    const actionLink = page.getByRole('link', { name: 'Action link' });
    await expect(actionLink).toHaveCSS('height', '40px');
    await actionLink.hover();
    await expect(actionLink).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, -4)',
    );
    await expect(secondary).toHaveCSS('height', '40px');
    await expect(secondary).toHaveCSS('border-radius', '22px');
    await expect(secondary).toHaveCSS('padding-left', '18px');
    await secondary.hover();
    await expect(secondary).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -4)');
    await expect(secondary).toHaveCSS('border-color', 'rgb(112, 32, 128)');
    const refresh = page.getByRole('button', { name: 'Refresh preview' });
    await expect(refresh).toHaveCSS('border-width', '0px');
    await refresh.hover();
    await expect(refresh).toHaveCSS('transform', 'none');
    await expect(refresh).not.toHaveCSS('box-shadow', 'none');
    await expect(page.getByRole('tooltip')).toHaveCSS(
      'background-color',
      'rgb(112, 32, 128)',
    );
    await page.mouse.move(0, 0);
    const select = page.getByRole('combobox', { name: 'Long selection' });
    const geometry = await select.evaluate((el) => {
      const content = el
        .querySelector('selectedcontent')!
        .getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return {
        end: content.right,
        limit: box.right - 36,
        overflow: getComputedStyle(el.querySelector('selectedcontent')!)
          .textOverflow,
      };
    });
    expect(geometry.end).toBeLessThanOrEqual(geometry.limit);
    expect(geometry.overflow).toBe('ellipsis');
    await page.getByRole('combobox', { name: 'Multiple choices' }).click();
    const option = page.getByRole('option', { name: 'Alpha', exact: true });
    const checkbox = option.locator('input[type="checkbox"]');
    const alignment = await checkbox.evaluate((el) => {
      const box = el.getBoundingClientRect(),
        parent = el.parentElement!.getBoundingClientRect();
      return Math.abs(
        box.top + box.height / 2 - (parent.top + parent.height / 2),
      );
    });
    expect(alignment).toBeLessThan(1);
    await option.click();
    await expect(checkbox).toBeChecked();
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Edit insurance', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Edit insurance' });
    await settled(page);
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await expect(close).toHaveText('');
    await expect(close.locator('svg')).toHaveCount(1);
    await close.hover();
    await expect(close).toHaveCSS('transform', 'none');
    await expect(
      dialog.locator('.ui-modal-actions').getByRole('button'),
    ).toHaveText(['Save']);
    const help = dialog.getByRole('button', { name: 'About Policy' });
    const before = await help.boundingBox();
    await help.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(help).toHaveCSS('transform', 'none');
    expect(await tooltip.evaluate((el) => el.matches(':popover-open'))).toBe(
      true,
    );
    const moved = (await help.boundingBox())!;
    expect(moved.x).toBe(before!.x);
    expect(moved.y).toBeCloseTo(before!.y, 1);
    const tip = (await tooltip.boundingBox())!;
    expect(tip.x).toBeGreaterThanOrEqual(8);
    expect(tip.x + tip.width).toBeLessThanOrEqual(width - 8);
    expect(
      Math.abs(tip.y + tip.height / 2 - (before!.y + before!.height / 2)),
    ).toBeLessThan(2);
    await check(page, 'shared-controls', 'dialog[open]');
    await close.click();
    await expect(dialog).toBeHidden();
    const record = page.getByRole('button', { name: 'Open Example record' });
    const row = page
      .getByRole('table', { name: 'Records' })
      .locator('tbody tr');
    await record.hover();
    await expect(record).toHaveCSS('transform', 'none');
    await record.click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(row).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(record).toBeFocused();
    await expect(row).toHaveCSS('outline-style', 'solid');
    await expect(row).toHaveCSS('outline-width', '2px');
  });
}
