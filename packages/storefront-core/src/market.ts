import type { MarketCatalogOptions, PublicMarketOccurrence } from '@market/api';
import { formatDate } from '@market/config';
export function occurrenceLabel(
  occurrence: PublicMarketOccurrence,
  format: 'full' | 'compact' = 'full',
) {
  if (format === 'compact') {
    const date = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeZone: occurrence.timezone,
    }).format(new Date(occurrence.startsAt));
    const time = new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short',
      timeZone: occurrence.timezone,
    });
    return `${date}, ${time.format(new Date(occurrence.startsAt))} to ${time.format(new Date(occurrence.endsAt))}`;
  }
  return `${formatDate(occurrence.startsAt, occurrence.timezone)} to ${formatDate(occurrence.endsAt, occurrence.timezone)}`;
}
export function marketCatalogInputs(search: URLSearchParams): {
  page: number;
  options: MarketCatalogOptions;
} {
  const rawPage = Number(search.get('page') ?? 1);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 10000
      ? rawPage
      : 1;
  const requested = search.get('sort') ?? 'NAME_ASC';
  const sort = (
    ['NAME_ASC', 'NAME_DESC', 'PRICE_ASC', 'PRICE_DESC'].includes(requested)
      ? requested
      : 'NAME_ASC'
  ) as MarketCatalogOptions['sort'];
  const ids = (key: string) =>
    [
      ...new Set(
        search.getAll(key).filter((value) => /^[1-9][0-9]{0,9}$/.test(value)),
      ),
    ].slice(0, 20);
  return {
    page,
    options: {
      skip: (page - 1) * 12,
      take: 12,
      sort,
      vendorIds: ids('vendor'),
      facetValueIds: ids('facet'),
    },
  };
}
