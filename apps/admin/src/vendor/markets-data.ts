import type { Membership, MembershipState, Occurrence } from '@market/api';
import type { VendorService } from './service';
import { safeStorefrontUrl } from '@market/api';
import { mayCommand } from '@market/admin-core';

export interface MarketOverviewRow {
  membership: Membership;
  next?: Occurrence;
  participation?: MembershipState['participations'][number];
  upcoming: Occurrence[];
  website?: string;
}

/** Use backend-supplied market origins, never construct domains from slugs. */
async function readMarketWebsites(service: VendorService) {
  const websites = new Map<string, string>();
  if (
    !service.applications ||
    !mayCommand(service.context, 'ManageOwnMarketParticipation')
  )
    return websites;
  try {
    let skip = 0;
    while (true) {
      const page = await service.applications.read({
        vendorId: Number(service.vendorId),
        skip,
      });
      for (const row of [...page.drafts, ...page.items]) {
        const url = safeStorefrontUrl(row.origin);
        if (url && row.current) websites.set(String(row.marketId), url);
      }
      skip += page.items.length;
      if (!page.items.length || skip >= page.totalItems) break;
    }
  } catch {
    /* Optional website metadata must not block memberships. */
  }
  return websites;
}

/** Membership, scheduled date and participation remain separate authorities. */
export async function readMarketsOverview(
  service: VendorService,
  now = Date.now(),
) {
  const [memberships, websites] = await Promise.all([
    service.memberships(),
    readMarketWebsites(service),
  ]);
  const from = new Date(now).toISOString();
  const through = new Date(now + 90 * 86400000).toISOString();
  const rows: MarketOverviewRow[] = [];
  // Bound concurrent reads when a vendor has many market relationships.
  for (let offset = 0; offset < memberships.length; offset += 6) {
    rows.push(
      ...(await Promise.all(
        memberships.slice(offset, offset + 6).map(async (membership) => {
          const [state, occurrences] = await Promise.all([
            service.membership(membership.id),
            service.occurrences(membership.id, from, through),
          ]);
          const upcoming = occurrences
            .filter(
              (o) =>
                o.status === 'scheduled' &&
                Date.parse(o.startsAt) >= now &&
                Date.parse(o.startsAt) < Date.parse(through),
            )
            .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
          const next = upcoming[0];
          return {
            membership: state.membership,
            website: websites.get(String(state.membership.marketId)),
            next,
            upcoming,
            participation: state.participations.find(
              (p) => p.occurrenceId === next?.id,
            ),
          };
        }),
      )),
    );
  }
  return { rows, now };
}

export function attendanceLabel(row: MarketOverviewRow) {
  if (!row.next) return 'No upcoming date';
  return row.participation?.status === 'confirmed'
    ? 'Attending'
    : row.participation?.status === 'planned'
      ? 'Planned'
      : row.participation?.status === 'cancelled'
        ? 'Not attending'
        : 'Not requested';
}

export function marketDate(occurrence: Occurrence, full = false) {
  return new Date(occurrence.startsAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(full ? ({ year: 'numeric' } as const) : {}),
    timeZone: occurrence.timezone,
  });
}
export function marketTime(occurrence: Occurrence) {
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: occurrence.timezone,
  } as const;
  return `${new Date(occurrence.startsAt).toLocaleTimeString(undefined, options)} to ${new Date(occurrence.endsAt).toLocaleTimeString(undefined, { ...options, timeZoneName: 'short' })}`;
}
