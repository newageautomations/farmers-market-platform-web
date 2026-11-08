import type { Listing, MembershipState, PreorderInput } from '@market/api';
import type { VendorService, CatalogProduct } from './service';
import {
  dateAttendance,
  readBoothAssignments,
  readMarketApplications,
  type DateAttendance,
  type UpcomingMarketDate,
} from './markets-data';

const DAY = 86400000;
/** Same horizon as the Markets overview, so counts agree across pages. */
export const MARKET_DETAIL_DAYS = 90;

/**
 * One market relationship for the vendor market page. Membership, scheduled
 * dates, participation and booth assignments remain separate backend authorities.
 */
export async function readMarketDetail(
  service: VendorService,
  membershipId: string,
  now = Date.now(),
) {
  const from = new Date(now).toISOString();
  const through = new Date(now + MARKET_DETAIL_DAYS * DAY).toISOString();
  const [state, occurrences, applications, booths] = await Promise.all([
    service.membership(membershipId),
    service.occurrences(membershipId, from, through),
    readMarketApplications(service),
    readBoothAssignments(service),
  ]);
  const marketId = String(state.membership.marketId);
  const application = applications.applications.get(marketId);
  const dates: UpcomingMarketDate[] = occurrences
    .filter(
      (o) =>
        o.status === 'scheduled' &&
        Date.parse(o.startsAt) >= now &&
        Date.parse(o.startsAt) < Date.parse(through),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((occurrence) => ({
      key: `${state.membership.id}:${occurrence.id}`,
      membership: state.membership,
      occurrence,
      participation: state.participations.find(
        (p) => p.occurrenceId === occurrence.id,
      ),
      application: application && {
        status: application.status,
        city: application.city,
        state: application.state,
      },
      booth: booths?.get(String(occurrence.id))?.space.label,
    }));
  return {
    state,
    dates,
    booths,
    boothsAvailable: !!booths,
    website: applications.websites.get(marketId),
    now,
  };
}
export type MarketDetail = Awaited<ReturnType<typeof readMarketDetail>>;

export function attendanceCounts(dates: readonly UpcomingMarketDate[]) {
  return dates.reduce<Record<DateAttendance, number>>(
    (all, d) => {
      all[dateAttendance(d.participation)]++;
      return all;
    },
    { attending: 0, tentative: 0, 'not-attending': 0, 'needs-rsvp': 0 },
  );
}

/** Listing approval as the vendor sees it: approved listings are Active. */
export type ItemStatus = 'active' | 'pending' | 'withdrawn' | 'not-listed';
export const itemStatusLabels: Record<ItemStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  withdrawn: 'Withdrawn',
  'not-listed': 'Not listed',
};
export const itemStatusTones = {
  active: 'success',
  pending: 'warning',
  withdrawn: 'neutral',
  'not-listed': 'neutral',
} as const satisfies Record<ItemStatus, string>;
export function itemStatus(listing?: Listing): ItemStatus {
  return !listing
    ? 'not-listed'
    : listing.status === 'approved'
      ? 'active'
      : listing.status === 'pending'
        ? 'pending'
        : 'withdrawn';
}

export interface MarketItem {
  key: string;
  productId: string;
  product: string;
  variantId: string;
  variant: string;
  sku: string;
  price: number;
  currency: string;
  category?: string;
  listing?: Listing;
  status: ItemStatus;
}

/** Owned catalog variants with descriptive categories. Bounded to 25 catalog pages. */
export async function readMarketCatalog(service: VendorService) {
  const products: CatalogProduct[] = [];
  for (let skip = 0, page = 0; page < 25; page++) {
    const result = await service.catalog('', skip);
    products.push(...result.items);
    skip += result.items.length;
    if (!result.items.length || skip >= result.totalItems) break;
  }
  const categories = new Map<string, string>();
  if (service.taxonomy) {
    // Categories are descriptive only; a failed read leaves the cell blank.
    for (let offset = 0; offset < products.length; offset += 6)
      await Promise.all(
        products.slice(offset, offset + 6).map(async (product) => {
          try {
            const c = await service.taxonomy!.classification(product.id);
            if (c.primaryCategory)
              categories.set(product.id, c.primaryCategory.name);
          } catch {
            /* Optional. */
          }
        }),
      );
  }
  return { products, categories };
}
/** Pair catalog variants with this market's listings. Disabled variants appear only when listed. */
export function marketItems(
  catalog: Awaited<ReturnType<typeof readMarketCatalog>>,
  listings: readonly Listing[],
) {
  const byVariant = new Map(listings.map((l) => [String(l.variantId), l]));
  return catalog.products.flatMap((product) =>
    product.variants
      .filter(
        (v) => (product.enabled && v.enabled) || byVariant.has(String(v.id)),
      )
      .map((v): MarketItem => {
        const listing = byVariant.get(String(v.id));
        return {
          key: String(v.id),
          productId: product.id,
          product: product.name,
          variantId: String(v.id),
          variant: v.name,
          sku: v.sku,
          price: v.price,
          currency: v.currency,
          category: catalog.categories.get(product.id),
          listing,
          status: itemStatus(listing),
        };
      }),
  );
}

/**
 * Participations whose offerings a market-level preorder switch writes:
 * upcoming dates the vendor has not declined.
 */
export function preorderParticipations(dates: readonly UpcomingMarketDate[]) {
  return dates
    .map((d) => d.participation)
    .filter((p): p is NonNullable<typeof p> => !!p && p.status !== 'cancelled');
}
export function preorderCoverage(
  state: MembershipState,
  participations: ReturnType<typeof preorderParticipations>,
  listingId: string,
) {
  const enabled = participations.filter((p) =>
    state.offerings.some(
      (o) =>
        o.participationId === p.id &&
        o.listingId === listingId &&
        o.enabled &&
        o.preorderEnabled,
    ),
  ).length;
  return { enabled, total: participations.length };
}

/** The market's own window when an offering reports it; otherwise unknown here. */
export function marketPreorderRule(
  state: MembershipState,
): PreorderInput | undefined {
  // Vendor-set sources are excluded; market and per-date sources describe the market's window.
  const rule = state.offerings.find(
    (o) =>
      !['membership', 'participation'].includes(
        o.windowProvenance.source.toLowerCase(),
      ),
  )?.windowProvenance.rule;
  return rule && { ...rule };
}

export const preorderDays = Array.from({ length: 31 }, (_, i) => i);
export const preorderTimes = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  return { value, label: timeLabel(value) };
});
export function timeLabel(value: string) {
  const [h = 0, m = 0] = value.split(':').map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
