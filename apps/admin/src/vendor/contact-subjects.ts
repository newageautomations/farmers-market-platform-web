import type { ContactPage, VendorContactApi } from '@market/api';

/**
 * Older backends list contact names only. Fill subjects and emails from the
 * per-message read (which does not change read status) so the table never
 * shows blanks. Rows whose read fails keep their listed values.
 */
export async function withContactSubjects(
  api: Pick<VendorContactApi, 'detail'>,
  page: ContactPage,
): Promise<ContactPage> {
  const missing = page.items.filter((row) => row.subject === undefined);
  if (!missing.length) return page;
  const results = await Promise.allSettled(
    missing.map((row) => api.detail(row.id)),
  );
  const details = new Map(
    results.flatMap((result) =>
      result.status === 'fulfilled' ? [[result.value.id, result.value]] : [],
    ),
  );
  return {
    ...page,
    items: page.items.map((row) => {
      const detail = details.get(row.id);
      return detail
        ? { ...row, email: detail.email, subject: detail.subject }
        : row;
    }),
  };
}
