import type {
  ApplicantApplicationRow,
  Membership,
  MembershipState,
  Occurrence,
} from '@market/api';
import type { VendorService } from './service';
import { safeStorefrontUrl } from '@market/api';
import { mayCommand } from '@market/admin-core';
import { hasPermission } from '@market/auth';

export type Participation = MembershipState['participations'][number];
export interface MarketApplicationSummary {
  status: string;
  city?: string | null;
  state?: string | null;
}
export interface MarketOverviewRow {
  membership: Membership;
  next?: Occurrence;
  participation?: Participation;
  /** Every participation in the membership projection. */
  participations: readonly Participation[];
  upcoming: Occurrence[];
  website?: string;
  application?: MarketApplicationSummary;
}

/** Prefer the market's current submission, then its current draft, then the newest record. */
function applicationRank(row: ApplicantApplicationRow) {
  return (
    (row.current ? 2 : 0) +
    (row.status === 'DRAFT' ? 0 : 1) +
    (Date.parse(row.createdAt ?? row.updatedAt ?? '') || 0) / 1e14
  );
}

/** Use backend-supplied market origins, never construct domains from slugs. */
async function readMarketApplications(service: VendorService) {
  const websites = new Map<string, string>();
  const applications = new Map<
    string,
    MarketApplicationSummary & { rank: number }
  >();
  if (
    !service.applications ||
    !mayCommand(service.context, 'ManageOwnMarketParticipation')
  )
    return { websites, applications };
  try {
    let skip = 0;
    while (true) {
      const page = await service.applications.read({
        vendorId: Number(service.vendorId),
        skip,
      });
      for (const row of [...page.drafts, ...page.items]) {
        const market = String(row.marketId);
        const url = safeStorefrontUrl(row.origin);
        if (url && row.current) websites.set(market, url);
        const rank = applicationRank(row);
        if (row.status && (applications.get(market)?.rank ?? -1) < rank)
          applications.set(market, {
            status: row.status,
            city: row.city,
            state: row.state,
            rank,
          });
      }
      skip += page.items.length;
      if (!page.items.length || skip >= page.totalItems) break;
    }
  } catch {
    /* Optional website and application metadata must not block memberships. */
  }
  return { websites, applications };
}

/** Membership, scheduled date and participation remain separate authorities. */
export async function readMarketsOverview(
  service: VendorService,
  now = Date.now(),
) {
  const [memberships, { websites, applications }] = await Promise.all([
    service.memberships(),
    readMarketApplications(service),
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
          const application = applications.get(
            String(state.membership.marketId),
          );
          return {
            membership: state.membership,
            website: websites.get(String(state.membership.marketId)),
            application: application && {
              status: application.status,
              city: application.city,
              state: application.state,
            },
            next,
            upcoming,
            participations: state.participations,
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

export interface UpcomingMarketDate {
  key: string;
  membership: Membership;
  occurrence: Occurrence;
  participation?: Participation;
  application?: MarketApplicationSummary;
  booth?: string;
}

/** Booth labels come from verified assignments; a failed read is never shown as unassigned. */
async function readBoothLabels(service: VendorService) {
  if (
    !service.boothAssignments ||
    !hasPermission(service.context.permissions, 'ReadOwnVendorIdentity')
  )
    return undefined;
  try {
    const booths = new Map<string, string>();
    for (const assignment of await service.boothAssignments())
      booths.set(String(assignment.occurrenceId), assignment.space.label);
    return booths;
  } catch {
    return undefined;
  }
}

/** Scheduled dates for approved memberships only; participation and booths remain separate authorities. */
export async function readUpcomingMarketDates(
  service: VendorService,
  now = Date.now(),
) {
  const [overview, booths] = await Promise.all([
    readMarketsOverview(service, now),
    readBoothLabels(service),
  ]);
  const dates: UpcomingMarketDate[] = overview.rows
    .filter((row) => row.membership.status === 'approved')
    .flatMap((row) =>
      row.upcoming.map((occurrence) => ({
        key: `${row.membership.id}:${occurrence.id}`,
        membership: row.membership,
        occurrence,
        participation: row.participations.find(
          (p) => p.occurrenceId === occurrence.id,
        ),
        application: row.application,
        booth: booths?.get(String(occurrence.id)),
      })),
    )
    .sort(
      (a, b) =>
        Date.parse(a.occurrence.startsAt) - Date.parse(b.occurrence.startsAt) ||
        a.membership.market.name.localeCompare(b.membership.market.name),
    );
  return { dates, now, boothsAvailable: !!booths };
}

export type DateAttendance =
  'attending' | 'tentative' | 'not-attending' | 'needs-rsvp';
/** Only confirmed participation is Attending; no participation needs a response. */
export function dateAttendance(participation?: Participation): DateAttendance {
  return participation?.status === 'confirmed'
    ? 'attending'
    : participation?.status === 'planned'
      ? 'tentative'
      : participation?.status === 'cancelled'
        ? 'not-attending'
        : 'needs-rsvp';
}
export const dateAttendanceLabels: Record<DateAttendance, string> = {
  attending: 'Attending',
  tentative: 'Tentative',
  'not-attending': 'Not attending',
  'needs-rsvp': 'Needs RSVP',
};
export const dateAttendanceTones = {
  attending: 'success',
  tentative: 'neutral',
  'not-attending': 'danger',
  'needs-rsvp': 'warning',
} as const satisfies Record<DateAttendance, string>;
export function dateLocation(date: UpcomingMarketDate) {
  return (
    [date.application?.city, date.application?.state]
      .filter(Boolean)
      .join(', ') || date.occurrence.venue
  );
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
export function marketTime(occurrence: Occurrence, zone = true) {
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: occurrence.timezone,
  } as const;
  return `${new Date(occurrence.startsAt).toLocaleTimeString(undefined, options)} to ${new Date(occurrence.endsAt).toLocaleTimeString(undefined, zone ? { ...options, timeZoneName: 'short' } : options)}`;
}
