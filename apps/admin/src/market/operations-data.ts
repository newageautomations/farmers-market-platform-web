import type {
  MarketDayChecklist,
  MarketOccurrence,
  MarketOperationsApi,
} from '@market/api';
import type { FarmstandIconName } from '@market/ui/farmstand';
import type { MarketService } from './service';
import {
  boothCounts,
  readScheduleWindows,
  type OccurrenceBooths,
} from './occurrences-data';

/**
 * Market operations facts for one date, composed from the existing booth
 * schedule read and the backend Market Day Checklist. Nothing here is a
 * completion flag: counts come from current source state only.
 */
export interface DateOperations extends OccurrenceBooths {
  /** Vendors whose participation is confirmed for the date. */
  confirmed: number;
  /** Confirmed vendors without a booth assignment. */
  unassigned: number;
  checkedIn: number;
  notCheckedIn: number;
}

export interface AttentionItem {
  id: string;
  title: string;
  status: string;
  count: number;
  detail: string;
  href: string;
  action: string;
  icon: FarmstandIconName;
}

/** Where a date is in its lifecycle, from the manager's point of view. */
export type DatePhase = 'upcoming' | 'today' | 'ended' | 'cancelled';

export function datePhase(
  occurrence: Pick<MarketOccurrence, 'status' | 'startsAt' | 'endsAt'> & {
    timezone?: string;
  },
  now = Date.now(),
): DatePhase {
  if (occurrence.status !== 'scheduled') return 'cancelled';
  if (Date.parse(occurrence.endsAt) < now) return 'ended';
  const day = (time: number) =>
    new Date(time).toLocaleDateString('en-CA', {
      timeZone: occurrence.timezone,
    });
  return day(Date.parse(occurrence.startsAt)) === day(now) ||
    Date.parse(occurrence.startsAt) <= now
    ? 'today'
    : 'upcoming';
}

/** Booth and vendor counts for each occurrence, from the booth schedule read. */
export async function readDateOperations(
  api: MarketOperationsApi,
  occurrences: readonly MarketOccurrence[],
  now = Date.now(),
) {
  const reads = await readScheduleWindows(api, occurrences);
  const facts = new Map<string, DateOperations>();
  for (const data of reads)
    for (const occurrence of data.occurrences) {
      const id = occurrence.id;
      const confirmed = (data.approvals ?? []).filter(
        (a) => a.occurrenceId === id && a.decision === 'CONFIRMED',
      );
      const assignments = (data.assignments ?? []).filter(
        (a) => a.occurrenceId === id,
      );
      facts.set(String(id), {
        ...boothCounts(data, occurrence, now),
        confirmed: confirmed.length,
        unassigned: confirmed.filter(
          (a) => !assignments.some((x) => x.approvalId === Number(a.id)),
        ).length,
        checkedIn: confirmed.filter((a) => a.checkIn === 'CHECKED_IN').length,
        notCheckedIn: confirmed.filter((a) => a.checkIn === 'NOT_CHECKED_IN')
          .length,
      });
    }
  return facts;
}

/** One checklist per date; a failed or unavailable read stays unknown. */
export async function readChecklists(
  service: MarketService,
  ids: readonly string[],
) {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return [id, await service.checklist!(id)] as const;
      } catch {
        return [id, undefined] as const;
      }
    }),
  );
  return new Map(results);
}

const checklistIcons: Record<string, FarmstandIconName> = {
  'Participation confirmations': 'user-round',
  'Required Vendor documents': 'file-check',
  'Required policy acknowledgments': 'shield-check',
  'Readiness warnings': 'triangle-alert',
  'Manager exceptions': 'clipboard-list',
};
/** The schedule row only repeats the date, which the page already shows. */
const SCHEDULE_ITEM = 'Occurrence schedule';

export function checklistItems(checklist: MarketDayChecklist) {
  return checklist.items
    .filter((item) => item.title !== SCHEDULE_ITEM)
    .map((item): AttentionItem => ({
      id: `checklist:${item.title}`,
      title: item.title,
      status: item.status,
      count: item.count,
      detail: item.explanation,
      href: item.href,
      action: item.action,
      icon: checklistIcons[item.title] ?? 'info',
    }));
}

/** Booth and check-in items that need the manager, for an active date. */
export function boothItems(
  occurrenceId: string,
  phase: DatePhase,
  facts: DateOperations | undefined,
  canOperateDay: boolean,
): AttentionItem[] {
  if (!facts || phase === 'ended' || phase === 'cancelled') return [];
  const assignments = `/market/assignments/${occurrenceId}`;
  const items: AttentionItem[] = [];
  if (!facts.layout)
    items.push({
      id: 'booths:layout',
      title: 'Booth layout',
      status: 'No layout selected',
      count: 1,
      detail: 'Choose a layout for this date so vendors can be given booths.',
      href: assignments,
      action: 'Choose a layout',
      icon: 'map-pin',
    });
  else if (facts.unassigned)
    items.push({
      id: 'booths:unassigned',
      title: 'Vendors without a booth',
      status: 'Needs attention',
      count: facts.unassigned,
      detail: `${plural(facts.unassigned, 'confirmed vendor')} ${facts.unassigned === 1 ? 'has' : 'have'} no booth assignment yet.`,
      href: assignments,
      action: 'Assign booths',
      icon: 'store',
    });
  if (phase === 'today' && canOperateDay && facts.notCheckedIn)
    items.push({
      id: 'day:check-in',
      title: 'Vendors not checked in',
      status: 'Needs attention',
      count: facts.notCheckedIn,
      detail: `${facts.checkedIn} of ${facts.confirmed} confirmed vendors have checked in.`,
      href: `/market/day/${occurrenceId}`,
      action: 'Open market day',
      icon: 'circle-check',
    });
  return items;
}

/**
 * Readiness for one date. `known` is false when the checklist could not be
 * read or its sources are unavailable, so the date is never shown as ready.
 */
export function dateReadiness(
  occurrenceId: string,
  phase: DatePhase,
  checklist: MarketDayChecklist | undefined,
  facts: DateOperations | undefined,
  canOperateDay: boolean,
) {
  const sourced = !!checklist && ['today', 'future'].includes(checklist.status);
  const items = [
    ...boothItems(occurrenceId, phase, facts, canOperateDay),
    ...(sourced ? checklistItems(checklist) : []),
  ];
  return {
    attention: items.filter((item) => item.count > 0),
    clear: items.filter((item) => item.count === 0),
    known: sourced,
  };
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}
