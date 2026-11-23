import {
  marketPage,
  type MarketPageId,
  type StorefrontAppearance,
} from '@market/theme/storefront';
import type {
  PublicMarketOccurrence,
  StorefrontCategory,
  StorefrontTaxonomy,
} from '@market/api';

/** Market Harvest website pages, in navigation order. */
export const marketPageIds = [
  'market-dates',
  'vendors',
  'applications',
] as const satisfies readonly MarketPageId[];

/** A disabled page stays reachable only inside the private editor preview. */
export function marketPageAvailable(
  appearance: StorefrontAppearance | undefined,
  id: MarketPageId,
  preview: boolean,
) {
  return preview || marketPage(appearance, id).enabled;
}

export function marketNavigation(
  appearance: StorefrontAppearance | undefined,
  preview: boolean,
) {
  return [
    { href: '/shop', label: 'Shop' },
    ...marketPageIds
      .filter((id) => marketPageAvailable(appearance, id, preview))
      .map((id) => ({
        href: `/${id}`,
        label: marketPage(appearance, id).title,
      })),
  ];
}

/** Every header link of a market website: market pages, then enabled content pages. Policies live only in the footer. */
export function marketSiteNavigation(
  appearance: StorefrontAppearance | undefined,
  preview: boolean,
) {
  return [
    ...marketNavigation(appearance, preview),
    ...(appearance?.faq?.enabled
      ? [{ href: '/faq', label: appearance.faq.title }]
      : []),
    ...(appearance?.contact?.enabled
      ? [{ href: '/contact', label: appearance.contact.title }]
      : []),
  ];
}

/** Calendar parts in the market date's own time zone. */
export function marketDateParts(occurrence: PublicMarketOccurrence) {
  const start = new Date(occurrence.startsAt);
  const end = new Date(occurrence.endsAt);
  const format = (options: Intl.DateTimeFormatOptions, value = start) =>
    new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: occurrence.timezone,
    }).format(value);
  return {
    month: format({ month: 'short' }),
    day: format({ day: 'numeric' }),
    weekday: format({ weekday: 'long' }),
    date: format({ weekday: 'long', month: 'long', day: 'numeric' }),
    hours: `${format({ timeStyle: 'short' })} – ${format({ timeStyle: 'short' }, end)}`,
  };
}

/** Initial shown when a vendor has no public profile image. */
export function vendorInitial(name: string) {
  return (name.trim()[0] ?? '•').toUpperCase();
}

/**
 * Homepage category sources: the shopper's chosen market date, or every
 * upcoming date (earliest first) when none is chosen. Each category links to
 * the earliest of those dates that offers it.
 */
export function marketCategorySources(
  sources: readonly { occurrenceId: string; taxonomy: StorefrontTaxonomy }[],
): { taxonomy: StorefrontTaxonomy; occurrenceIds: Record<string, string> } {
  const categories = new Map<string, StorefrontCategory>();
  const occurrenceIds: Record<string, string> = {};
  for (const { occurrenceId, taxonomy } of sources)
    for (const category of taxonomy.categories) {
      const known = categories.get(category.id);
      // The same product may be offered on several dates, so counts are not summed.
      categories.set(
        category.id,
        known && known.count >= category.count ? known : category,
      );
      if (category.count > 0) occurrenceIds[category.id] ??= occurrenceId;
    }
  return {
    taxonomy: { categories: [...categories.values()], tags: [] },
    occurrenceIds,
  };
}
