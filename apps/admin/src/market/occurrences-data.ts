import type {
  MarketConfiguration,
  MarketOccurrence,
  MarketOperationsApi,
  MarketOperationsData,
} from '@market/api';
import type { MarketService } from './service';
import { dateBounds } from './common';
import { clockTime } from './presentation';

const DAY = 86400000;
/** Backend page maximum; ranges are already bounded to 366 days. */
const PAGE = 100;
const READ_LIMIT = 500;
/** The booth schedule read accepts at most 60 days per request. */
const BOOTH_WINDOW_DAYS = 59;

export type OccurrenceRange = { from: string; through: string };

export function isoDay(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}
export function addDays(day: string, amount: number) {
  return isoDay(Date.parse(`${day}T00:00:00Z`) + amount * DAY);
}
/** The browser's calendar date, matching the market range inputs. */
export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Every occurrence in a bounded range, read in backend-sized pages. */
export async function readOccurrencesInRange(
  service: MarketService,
  range: OccurrenceRange,
) {
  const bounds = dateBounds(range.from, range.through);
  const items: MarketOccurrence[] = [];
  let totalItems = 0;
  do {
    const page = await service.occurrencePage({
      take: PAGE,
      skip: items.length,
      from: bounds.from,
      through: bounds.through,
    });
    totalItems = page.totalItems;
    items.push(...page.items);
    if (!page.items.length) break;
  } while (items.length < totalItems && items.length < READ_LIMIT);
  return { items, totalItems, truncated: items.length < totalItems };
}

export interface OccurrenceBooths {
  /** False when no layout has been selected for the date. */
  layout: boolean;
  total: number;
  assigned: number;
  /** Unassigned booths on a date that can still take assignments. */
  open: number;
}

/**
 * Booth counts per occurrence from the existing booth schedule read, split
 * into 60-day windows. Counts come from the selected layout's spaces and the
 * date's actual assignments; nothing is inferred for dates without a layout.
 */
export async function readOccurrenceBooths(
  api: MarketOperationsApi,
  occurrences: readonly MarketOccurrence[],
  now = Date.now(),
) {
  const reads = await readScheduleWindows(api, occurrences);
  const booths = new Map<string, OccurrenceBooths>();
  for (const data of reads)
    for (const occurrence of data.occurrences)
      booths.set(String(occurrence.id), boothCounts(data, occurrence, now));
  return booths;
}

/** Booth counts for one occurrence of a booth schedule read. */
export function boothCounts(
  data: MarketOperationsData,
  occurrence: MarketOperationsData['occurrences'][number],
  now = Date.now(),
): OccurrenceBooths {
  const plan = data.plans?.find((p) => p.occurrenceId === occurrence.id);
  const total = plan
    ? (data.spaces ?? []).filter(
        (s) => s.layoutVersionId === plan.layoutVersionId,
      ).length
    : 0;
  const assigned = (data.assignments ?? []).filter(
    (a) => a.occurrenceId === occurrence.id,
  ).length;
  const accepting =
    occurrence.status === 'scheduled' &&
    Date.parse(occurrence.startsAt) > now &&
    !plan?.operationsComplete;
  return {
    layout: !!plan,
    total,
    assigned,
    open: accepting ? Math.max(0, total - assigned) : 0,
  };
}

/** The booth schedule reads covering these occurrences, in 60-day windows. */
export async function readScheduleWindows(
  api: MarketOperationsApi,
  occurrences: readonly MarketOccurrence[],
) {
  const days = [
    ...new Set(
      occurrences.map((o) => o.scheduleDate || isoDay(Date.parse(o.startsAt))),
    ),
  ].sort();
  const windows: OccurrenceRange[] = [];
  for (const day of days) {
    const last = windows.at(-1);
    if (last && day <= last.through) continue;
    windows.push({ from: day, through: addDays(day, BOOTH_WINDOW_DAYS) });
  }
  return Promise.all(
    windows.map((w) =>
      api.read('SCHEDULE', undefined, {
        mode: 'SCHEDULE',
        from: w.from,
        through: w.through,
      }),
    ),
  );
}

const weekdayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
type Recurrence = NonNullable<MarketConfiguration['recurrence']>;

function list(values: string[]) {
  return values.length < 2
    ? (values[0] ?? '')
    : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
}
export function readableDate(day: string, weekday = false) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: weekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Plain-language description of the saved repeating schedule. */
export function recurrenceSummary(rule: Recurrence) {
  const days = list(
    [...rule.weekdays].sort((a, b) => a - b).map((d) => weekdayNames[d]!),
  );
  const pattern =
    rule.frequency === 'monthly'
      ? `The ${list([...(rule.monthWeeks ?? [])].sort((a, b) => a - b).map((n) => ordinals[n - 1]!))} ${days} of each month`
      : rule.weekInterval === 2
        ? `Every other ${days}`
        : `Every ${days}`;
  return {
    pattern,
    time: `${clockTime(rule.startTime)} to ${clockTime(rule.endTime)}${rule.endDayOffset ? ' the following day' : ''}`,
    effective: rule.effectiveUntil
      ? `${readableDate(rule.effectiveFrom)} to ${readableDate(rule.effectiveUntil)}`
      : `From ${readableDate(rule.effectiveFrom)}, no end date`,
  };
}

/**
 * Calendar dates the saved rule matches in an inclusive range, using the
 * backend's matching rules (weeks begin Monday; every-other-week counts from
 * the week containing the first effective date). A preview only: the backend
 * remains authoritative and skips dates whose start time has passed.
 */
export function expectedDates(
  rule: Recurrence,
  from: string,
  through: string,
  limit = 400,
) {
  const dates: string[] = [];
  const anchor = Date.parse(`${rule.effectiveFrom}T00:00:00Z`);
  const monday = anchor - ((new Date(anchor).getUTCDay() + 6) % 7) * DAY;
  for (
    let time = Date.parse(`${from}T00:00:00Z`),
      end = Date.parse(`${through}T00:00:00Z`);
    time <= end && dates.length < limit;
    time += DAY
  ) {
    const day = isoDay(time),
      date = new Date(time);
    if (
      day < rule.effectiveFrom ||
      (rule.effectiveUntil && day > rule.effectiveUntil) ||
      !rule.weekdays.includes(date.getUTCDay())
    )
      continue;
    if (rule.frequency === 'monthly') {
      if ((rule.monthWeeks ?? []).includes(Math.ceil(date.getUTCDate() / 7)))
        dates.push(day);
    } else if (
      Math.floor((time - monday) / DAY / 7) % (rule.weekInterval || 1) ===
      0
    )
      dates.push(day);
  }
  return dates;
}
