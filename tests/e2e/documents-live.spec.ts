import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

const applicationUrl = process.env.DOCUMENTS_APPLICATION_B_URL;
test.skip(
  !applicationUrl,
  'Start demo:documents and supply its printed Market B application URL.',
);
if (
  applicationUrl &&
  !/^http:\/\/documents-market-1\.platform\.localhost:4321\/apply\/[a-f0-9-]+$/.test(
    applicationUrl,
  )
)
  throw new Error(
    'Documents browser tests require the disposable local Market B URL.',
  );
const password = 'local-identity-regression-only-password';
async function login(page: Page, email: string) {
  await page.goto('/market/documents');
  await page
    .getByLabel('Sign in with', { exact: true })
    .selectOption('username');
  await page.getByLabel('Administrator username', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toBeVisible();
  await page.goto('/market/documents');
  await expect(
    page.getByRole('tab', { name: 'Library', exact: true }),
  ).toBeVisible();
}
async function check(page: Page, scope: string, name: string) {
  // Inspect settled approved dialog presentation, after its entrance transition.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(scope).analyze()).violations,
  ).toEqual([]);
  await mkdir('.runtime/documents-ui', { recursive: true });
  await page.screenshot({
    path: `.runtime/documents-ui/${name}.png`,
    fullPage: true,
  });
}
for (const width of [390, 1280]) {
  test(`manager requirements and compliance at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, 'market-b@test.invalid');
    await page.getByRole('tab', { name: 'Requirements', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Turn off automatic requests' }),
    ).toBeVisible();
    await check(page, '.documents-workspace', `requirements-${width}`);
    await page
      .getByRole('button', { name: 'Request documents', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByLabel('Distribution', { exact: true }),
    ).toHaveValue('manual');
    await expect(dialog.getByLabel('Submission stage')).toBeVisible();
    expect(await dialog.locator('select:not(.ui-select)').count()).toBe(0);
    await check(page, 'dialog', `requirement-dialog-${width}`);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole('tab', { name: 'Vendor compliance', exact: true })
      .click();
    await expect(
      page.getByRole('table', { name: 'Vendor documentation readiness' }),
    ).toBeVisible();
    await check(page, '.documents-workspace', `compliance-${width}`);
  });
  test(`applicant reuses saved-document and upload controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(applicationUrl!);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('radio', { name: 'Yes', exact: true }).check();
    await page
      .getByRole('button', { name: 'Sign in to my platform account' })
      .click();
    await page
      .getByLabel('Email', { exact: true })
      .fill('documents-applicant@test.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(applicationUrl!);
    await page
      .getByLabel('Business for this application')
      .selectOption({ label: 'Applicant Orchard' });
    await expect(
      page.getByRole('button', { name: 'Choose saved document', exact: true }),
    ).toBeVisible();
    await check(
      page,
      '[aria-label="Application documents"]',
      `application-${width}`,
    );
    await page
      .getByRole('button', { name: 'Choose saved document', exact: true })
      .click();
    let dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText(/Other markets do not receive access/),
    ).toBeVisible();
    await expect(dialog.getByLabel('Saved document')).toBeVisible();
    await check(page, 'dialog', `share-${width}`);
    if (width === 1280) {
      const saved = await dialog
        .getByLabel('Saved document')
        .locator('option')
        .filter({ hasText: 'Applicant insurance' })
        .getAttribute('value');
      await dialog.getByLabel('Saved document').selectOption(saved!);
      await dialog
        .getByRole('button', { name: 'Share with market-b', exact: true })
        .click();
    } else
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole('button', { name: 'Upload for request', exact: true })
      .click();
    dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText(/Do not upload sensitive information/),
    ).toBeVisible();
    await expect(dialog.getByLabel(/File \(/)).toHaveAttribute(
      'accept',
      '.pdf,.jpg,.jpeg,.png,.webp',
    );
    expect(await page.locator('form form').count()).toBe(0);
    await check(page, 'dialog', `upload-${width}`);
    if (width === 1280) {
      await dialog
        .getByLabel('Document title', { exact: true })
        .fill('Browser qualification insurance');
      await dialog
        .getByLabel('Expiration date', { exact: true })
        .fill('2030-10-31');
      const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
        '<< /Length 0 >>\nstream\nendstream',
      ];
      let pdf = '%PDF-1.4\n';
      const offsets = [0];
      for (const [i, object] of objects.entries()) {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
      }
      const xref = Buffer.byteLength(pdf);
      pdf += `xref\n0 5\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n')
        .join(
          '',
        )}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      await dialog.getByLabel(/File \(/).setInputFiles({
        name: 'browser-insurance.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(pdf),
      });
      await dialog
        .getByRole('button', { name: 'Upload and scan', exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
      await expect(
        page
          .locator('[aria-label="Application documents"]')
          .getByText('Pending review', { exact: true }),
      ).toBeVisible();
    }
  });
}
