import { AppError } from '@market/api';
import type { PublicCatalog, PublicProduct } from '@market/api';
import { formatMoney } from '@market/config';

export function catalogInputs(params: URLSearchParams) {
  const raw = params.get('page') ?? '1',
    page = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000
  )
    throw new AppError('validation');
  const search = (params.get('q') ?? '').trim().slice(0, 200),
    sort = params.get('sort') === 'desc' ? 'desc' : 'asc';
  return { page, search, sort, skip: (page - 1) * 12, take: 12 };
}
export function plainDescription(value: string) {
  // Render descriptions as escaped text. Never trust catalog HTML as executable markup.
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function safeAsset(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return value.startsWith('/assets/') &&
      !value.startsWith('//') &&
      !/[?#\\]/.test(value)
      ? value
      : undefined;
  }
}
export function priceLabel(
  variants:
    PublicCatalog['items'][number]['variants'] | PublicProduct['variants'],
) {
  if (!variants.length) return 'Price not listed';
  const currency = variants[0]!.currencyCode;
  if (
    variants.some(
      (v) =>
        v.currencyCode !== currency || !Number.isSafeInteger(v.priceWithTax),
    )
  )
    return 'View options for pricing';
  const prices = variants.map((v) => BigInt(v.priceWithTax)),
    min = prices.reduce((a, b) => (a < b ? a : b)),
    max = prices.reduce((a, b) => (a > b ? a : b));
  return min === max
    ? formatMoney(min, currency)
    : `${formatMoney(min, currency)} to ${formatMoney(max, currency)}`;
}
