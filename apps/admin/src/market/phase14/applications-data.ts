import type {
  ApplicationActivity,
  ApplicationDefinition,
  ApplicationTemplate,
  ApplicationVersion,
  MarketOperationsData,
} from '@market/api';

/** Manager-facing state of one application (template), derived from its versions. */
export type ApplicationState = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export const applicationStateLabels: Record<ApplicationState, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export interface ApplicationRow {
  template: ApplicationTemplate;
  state: ApplicationState;
  /** Unpublished changes (the newest draft), if any. */
  draft?: ApplicationVersion;
  /** What applicants currently see, if anything. */
  published?: ApplicationVersion;
  /** The version the builder opens: the draft, else the published version. */
  current?: ApplicationVersion;
  activity: ApplicationActivity;
  updatedAt?: string;
}

const newest = (versions: ApplicationVersion[]) =>
  [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];

export function applicationRows(data: MarketOperationsData): ApplicationRow[] {
  return (data.templates ?? []).map((template) => {
    const versions = (data.versions ?? []).filter(
      (v) => v.templateId === template.id,
    );
    const draft = newest(versions.filter((v) => v.status === 'DRAFT'));
    const published = newest(versions.filter((v) => v.status === 'PUBLISHED'));
    const state: ApplicationState = template.archivedAt
      ? 'ARCHIVED'
      : template.visibility === 'RETIRED'
        ? 'CLOSED'
        : published
          ? 'PUBLISHED'
          : 'DRAFT';
    const times = [template.updatedAt, draft?.updatedAt, published?.updatedAt]
      .filter((t): t is string => !!t && Number.isFinite(Date.parse(t)))
      .sort();
    return {
      template,
      state,
      draft,
      published,
      current: draft ?? published ?? newest(versions),
      activity: data.applicationActivity?.find(
        (a) => a.templateId === template.id,
      ) ?? {
        templateId: template.id,
        total: 0,
        awaiting: 0,
        latestSubmittedAt: null,
      },
      updatedAt: times.at(-1),
    };
  });
}

/** "YYYY-MM-DDTHH:mm" for now in the market time zone, comparable with schedule values. */
export function marketNow(timeZone?: string, now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(now)
    .replace(' ', 'T');
}

/** Readable form of a schedule value ("2027-03-10T09:00"), already in market time. */
export function scheduleLabel(value: string) {
  const [day, time = '00:00'] = value.split('T');
  const [hour, minute] = time.split(':').map(Number);
  const when = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${when} at ${hour! % 12 || 12}:${String(minute).padStart(2, '0')} ${hour! >= 12 ? 'PM' : 'AM'}`;
}

/** Submission window in plain words, for the list and the builder. */
export function windowSummary(
  definition: ApplicationDefinition | undefined,
  timeZone?: string,
) {
  const schedule = definition?.schedule;
  const now = marketNow(schedule?.timeZone ?? timeZone);
  if (schedule?.closesAt && schedule.closesAt <= now)
    return {
      open: false,
      label: 'Closed',
      detail: `Closed ${scheduleLabel(schedule.closesAt)}`,
    };
  if (schedule?.opensAt && schedule.opensAt > now)
    return {
      open: false,
      label: 'Not open yet',
      detail: `Opens ${scheduleLabel(schedule.opensAt)}`,
    };
  return {
    open: true,
    label: 'Open',
    detail: schedule?.closesAt
      ? `Closes ${scheduleLabel(schedule.closesAt)}`
      : 'No closing date',
  };
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Calendar date only, for list cells. */
export function shortDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
