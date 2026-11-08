import { useCallback, useId, useMemo, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import type { PreorderInput, VendorBoothAssignment } from '@market/api';
import { formatMoney } from '@market/config';
import { Alert, Badge, Checkbox, Dialog, EmptyState, Field } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { ReadState, useRead } from './common';
import type { VendorService } from './service';
import { Fact, Panel, VisitMarket } from './application-detail';
import { navigate } from './MarketApplications';
import { MarketsPagination as Pagination } from './MarketsPagination';
import { AttendanceBadge } from './UpcomingMarketDates';
import { VendorSwitch } from './VendorSwitch';
import { hasLeafCategory } from './PublicationControls';
import {
  dateAttendance,
  dateLocation,
  marketDate,
  marketTime,
  type Participation,
  type UpcomingMarketDate,
} from './markets-data';
import {
  attendanceCounts,
  itemStatusLabels,
  itemStatusTones,
  MARKET_DETAIL_DAYS,
  marketItems,
  marketPreorderRule,
  preorderCoverage,
  preorderDays,
  preorderParticipations,
  preorderTimes,
  readMarketCatalog,
  readMarketDetail,
  type ItemStatus,
  type MarketDetail,
  type MarketItem,
} from './market-detail-data';
import './market-applications.css';
import './markets-workspace.css';
import './market-detail.css';

/**
 * Vendor market page. Composes the application-detail panels and overview
 * strip, Farmstand tables and controls, the market-discovery "View more"
 * expansion and the shared vendor switch. Backend commands keep authority.
 */
const PREVIEW = 5;
const PAGE_SIZE = 10;

export const occurrenceHref = (membershipId: string, occurrenceId: string) =>
  `/vendor/markets/${encodeURIComponent(membershipId)}/dates/${encodeURIComponent(occurrenceId)}`;

export function MarketDetailPage({
  service,
  id,
}: {
  service: VendorService;
  id: string;
}) {
  const read = useCallback(() => readMarketDetail(service, id), [service, id]);
  const query = useRead(`market-detail:${id}`, read, true, {
    retainPreviousData: true,
  });
  const detail = query.data;
  return (
    <div className="application-detail market-detail">
      <FarmstandLink
        href="/vendor/markets"
        variant="secondary"
        onClick={navigate}
        className="application-detail-back application-detail-arrow"
      >
        <FarmstandIcon name="arrow-left" />
        Back to markets
      </FarmstandLink>
      {/* Refreshes after a command run in the background; only the first load shows progress. */}
      <ReadState
        loading={!detail && query.loading}
        error={query.error}
        retry={query.refresh}
      />
      {detail && (
        <MarketDetailContent
          service={service}
          detail={detail}
          refresh={query.refresh}
        />
      )}
    </div>
  );
}

function MarketDetailContent({
  service,
  detail,
  refresh,
}: {
  service: VendorService;
  detail: MarketDetail;
  refresh: () => void;
}) {
  const { state, dates } = detail;
  const next = dates[0];
  const nextBooth = next && detail.booths?.get(String(next.occurrence.id));
  const counts = attendanceCounts(dates.slice(0, PREVIEW));
  const can = mayCommand(service.context, 'ManageOwnMarketParticipation');
  return (
    <>
      <header className="application-detail-heading">
        <div className="market-detail-title">
          <h1>{state.membership.market.name}</h1>
          <p>
            Manage your participation, attendance, and preordering settings for
            this market.
          </p>
        </div>
        <VisitMarket origin={detail.website ?? null} />
      </header>
      <FarmstandPanel
        as="section"
        aria-label="Market overview"
        className="application-detail-overview"
      >
        <dl>
          <Fact icon={{ farmstand: 'calendar-days' }} label="Next market date">
            {next ? marketDate(next.occurrence, true) : 'None scheduled'}
          </Fact>
          <Fact
            icon={{ farmstand: 'receipt-text' }}
            label="Total upcoming dates"
          >
            {dates.length}
          </Fact>
          <Fact icon={{ farmstand: 'store' }} label="Your booth assignment">
            {boothText(next, detail.boothsAvailable)}
          </Fact>
          <Fact
            icon={{ farmstand: 'user-round' }}
            label={
              dates.length === 1
                ? 'Attendance (next date)'
                : `Attendance (next ${Math.min(PREVIEW, dates.length) || PREVIEW} dates)`
            }
          >
            {dates.length
              ? [
                  `${counts.attending} Attending`,
                  `${counts.tentative} Tentative`,
                  `${counts['not-attending']} Not attending`,
                  ...(counts['needs-rsvp']
                    ? [`${counts['needs-rsvp']} Needs RSVP`]
                    : []),
                ].join(' • ')
              : 'No upcoming dates'}
          </Fact>
        </dl>
      </FarmstandPanel>
      <div className="application-detail-columns">
        <div className="application-detail-main">
          <AutoEnroll
            service={service}
            detail={detail}
            refresh={refresh}
            can={can}
          />
          <MarketDates detail={detail} />
        </div>
        <aside
          className="application-detail-sidebar"
          aria-label="Next market date and booth"
        >
          <Panel
            icon={{ farmstand: 'calendar-days' }}
            title="Next market occurrence"
          >
            {next ? (
              <dl className="application-detail-summary">
                <Fact icon={{ farmstand: 'calendar-days' }} label="Date">
                  {marketDate(next.occurrence, true)}
                </Fact>
                <Fact icon={{ utility: 'clock' }} label="Time">
                  {marketTime(next.occurrence)}
                </Fact>
                {next.occurrence.venue && (
                  <Fact icon={{ farmstand: 'map-pin' }} label="Venue">
                    {next.occurrence.venue}
                  </Fact>
                )}
                <Fact icon={{ farmstand: 'store' }} label="Your booth">
                  {boothText(next, detail.boothsAvailable)}
                </Fact>
                <Fact icon={{ farmstand: 'circle-check' }} label="Attendance">
                  <AttendanceBadge value={dateAttendance(next.participation)} />
                </Fact>
              </dl>
            ) : (
              <p className="application-detail-empty">
                No dates are scheduled in the next {MARKET_DETAIL_DAYS} days.
              </p>
            )}
          </Panel>
          <BoothAssignment
            marketName={state.membership.market.name}
            assignment={nextBooth}
            available={detail.boothsAvailable}
          />
        </aside>
      </div>
      <Preordering
        service={service}
        detail={detail}
        refresh={refresh}
        can={can}
      />
    </>
  );
}

function boothText(date: UpcomingMarketDate | undefined, available: boolean) {
  if (!date) return 'No upcoming date';
  return date.booth
    ? `Booth ${date.booth}`
    : available
      ? 'Not assigned'
      : 'Unavailable';
}

/** Shared by the market page and its date page. */
export function BoothAssignment({
  marketName,
  assignment,
  available,
}: {
  marketName: string;
  assignment?: VendorBoothAssignment;
  available: boolean;
}) {
  return (
    <Panel icon={{ farmstand: 'store' }} title="Booth assignment">
      {assignment ? (
        <div className="market-detail-booth">
          <div>
            <h3>Booth {assignment.space.label}</h3>
            <p className="markets-venue">
              <FarmstandIcon name="map-pin" />
              {marketName}
            </p>
            {assignment.publicInstructions && (
              <p>{assignment.publicInstructions}</p>
            )}
            {assignment.space.widthFeet > 0 && (
              <p className="markets-muted">
                {assignment.space.widthFeet} ft × {assignment.space.depthFeet}{' '}
                ft
              </p>
            )}
          </div>
          <div className="market-detail-booth-art" aria-hidden="true">
            <FarmstandIcon name="store" />
            <span>{assignment.space.label}</span>
          </div>
        </div>
      ) : (
        <p className="application-detail-empty">
          {available
            ? 'No booth is assigned for the next market date yet.'
            : 'Booth assignments are unavailable right now.'}
        </p>
      )}
    </Panel>
  );
}

/** Standing opt-in: the backend confirms attendance on dates the market adds later. */
function AutoEnroll({
  service,
  detail,
  refresh,
  can,
}: {
  service: VendorService;
  detail: MarketDetail;
  refresh: () => void;
  can: boolean;
}) {
  const { membership } = detail.state;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    // The chosen value shows until a membership with a newer version arrives.
    [pending, setPending] = useState<{ value: boolean; version: number }>();
  const approved = membership.status === 'approved';
  const checked =
    pending?.version === membership.version
      ? pending.value
      : membership.autoEnroll;
  async function change(enabled: boolean) {
    setBusy(true);
    setError(false);
    setPending({ value: enabled, version: membership.version });
    try {
      await service.autoEnroll(membership.id, membership.version, enabled);
    } catch {
      setPending(undefined);
      setError(true);
    } finally {
      setBusy(false);
      refresh();
    }
  }
  return (
    <Panel
      icon={{ utility: 'refresh' }}
      title="Auto-enroll in new market dates"
    >
      <div className="market-detail-auto-enroll">
        <VendorSwitch
          tone="neutral"
          checked={checked}
          disabled={!can || busy || (!approved && !checked)}
          onChange={(e) => void change(e.currentTarget.checked)}
          label={checked ? 'Auto-enroll enabled' : 'Auto-enroll disabled'}
        />
        <div>
          <p>Automatically enroll me in any new dates added to this market.</p>
          <p className="markets-muted">
            When enabled, you&apos;ll be added to new market dates as
            &ldquo;Attending&rdquo; and can adjust your attendance later for
            each date. Dates already on the calendar keep your current response.
            {!approved &&
              ' Available once your membership with this market is approved.'}
          </p>
        </div>
      </div>
      {error && (
        <div className="market-detail-auto-enroll-result">
          <Alert severity="error" role="alert">
            Auto-enroll could not be changed. The latest setting has been
            reloaded; try again.
          </Alert>
        </div>
      )}
    </Panel>
  );
}

function MarketDates({ detail }: { detail: MarketDetail }) {
  const { dates, state } = detail;
  const [expanded, setExpanded] = useState(false),
    [page, setPage] = useState(0);
  const shown = expanded
    ? dates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : dates.slice(0, PREVIEW);
  return (
    <Panel icon={{ farmstand: 'calendar-days' }} title="Upcoming market dates">
      {shown.length ? (
        <FarmstandTable
          label="Upcoming market dates"
          headings={[
            'Date',
            'Time',
            'Location',
            'Booth',
            'Attendance status',
            'Action',
          ]}
        >
          {shown.map((date) => {
            const href = occurrenceHref(
              state.membership.id,
              date.occurrence.id,
            );
            return (
              <tr key={date.key}>
                <th scope="row">{marketDate(date.occurrence, true)}</th>
                <td className="market-detail-wrap">
                  {marketTime(date.occurrence, false)}
                </td>
                <td className="market-detail-wrap">
                  <span className="application-detail-cell">
                    <FarmstandIcon name="map-pin" />
                    {dateLocation(date)}
                  </span>
                </td>
                <td>
                  {date.booth ?? (
                    <span className="markets-muted">
                      {detail.boothsAvailable ? 'Not assigned' : 'Unavailable'}
                    </span>
                  )}
                </td>
                <td>
                  <AttendanceBadge value={dateAttendance(date.participation)} />
                </td>
                <td>
                  <FarmstandLink
                    href={href}
                    variant="secondary"
                    size="compact"
                    onClick={navigate}
                    className="application-detail-arrow"
                    aria-label={`Manage ${marketDate(date.occurrence, true)}`}
                  >
                    Manage
                    <FarmstandIcon name="chevron-right" />
                  </FarmstandLink>
                </td>
              </tr>
            );
          })}
        </FarmstandTable>
      ) : (
        <p className="application-detail-empty">
          No dates are scheduled in the next {MARKET_DETAIL_DAYS} days.
        </p>
      )}
      {!expanded && dates.length > PREVIEW && (
        <div className="market-discovery-more">
          <FarmstandButton
            variant="tertiary"
            className="market-discovery-arrow market-discovery-more-action"
            onClick={() => {
              setExpanded(true);
              setPage(0);
            }}
          >
            View more dates
            <FarmstandIcon name="arrow-right" />
          </FarmstandButton>
        </div>
      )}
      {expanded && (
        <div className="market-detail-pagination">
          <Pagination
            label="Market date pages"
            summary={`${dates.length} market dates. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, dates.length)}.`}
            hasPrevious={page > 0}
            hasNext={(page + 1) * PAGE_SIZE < dates.length}
            onPrevious={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        </div>
      )}
    </Panel>
  );
}

const DEFAULT_RULE: PreorderInput = {
  opensDaysBefore: 7,
  opensTime: '08:00',
  closesDaysBefore: 1,
  closesTime: '18:00',
};

/**
 * Preorder window editor shared by the market page (membership default) and a
 * date page (participation override). The backend applies market policy.
 */
export function PreorderWindow({
  rule,
  fallback,
  timezone,
  can,
  notice,
  onSave,
}: {
  /** The saved override, or null when none exists. */
  rule: PreorderInput;
  /** The window that applies without this override, when known. */
  fallback?: PreorderInput;
  timezone?: string;
  can: boolean;
  notice: { active: string; inactive: string };
  onSave: (rule: PreorderInput) => Promise<unknown>;
}) {
  const id = useId();
  const initial = rule ?? fallback ?? DEFAULT_RULE;
  const [value, setValue] = useState(initial!),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ ok: boolean; text: string }>();
  const dirty =
    !rule ||
    (Object.keys(value) as Array<keyof NonNullable<PreorderInput>>).some(
      (k) => value[k] !== rule[k],
    );
  async function save(next: PreorderInput) {
    setBusy(true);
    setResult(undefined);
    try {
      await onSave(next);
      if (!next) setValue((fallback ?? DEFAULT_RULE)!);
    } catch {
      setResult({
        ok: false,
        text: 'The preorder window could not be saved. The market may not allow vendor overrides, or the window falls outside its limits. Reload and try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  const update = (patch: Partial<NonNullable<PreorderInput>>) =>
    setValue((v) => ({ ...v!, ...patch }));
  const days = (n: number) => (n === 1 ? 'day before at' : 'days before at');
  return (
    <div className="market-detail-preorder">
      <Alert severity={rule ? 'warning' : 'info'}>
        <strong>{rule ? 'Manual override active.' : 'No override set.'}</strong>{' '}
        {rule ? notice.active : notice.inactive}
      </Alert>
      <div className="market-detail-windows">
        {(
          [
            ['opens', 'Preorders open'],
            ['closes', 'Preorders close'],
          ] as const
        ).map(([edge, label]) => {
          const dayKey = `${edge}DaysBefore` as const,
            timeKey = `${edge}Time` as const;
          return (
            <fieldset key={edge} className="market-detail-window">
              <legend>
                <FarmstandIcon name="calendar-days" />
                {label}
              </legend>
              <div className="market-detail-window-fields">
                <Field
                  id={`${id}-${edge}-days`}
                  label={<span className="sr-only">{label}: days before</span>}
                >
                  <FarmstandSelect
                    id={`${id}-${edge}-days`}
                    value={value![dayKey]}
                    disabled={!can || busy}
                    onChange={(e) =>
                      update({ [dayKey]: Number(e.target.value) })
                    }
                  >
                    {preorderDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </FarmstandSelect>
                </Field>
                <span>{days(value![dayKey])}</span>
                <Field
                  id={`${id}-${edge}-time`}
                  label={<span className="sr-only">{label}: local time</span>}
                >
                  <FarmstandSelect
                    id={`${id}-${edge}-time`}
                    value={value![timeKey]}
                    disabled={!can || busy}
                    onChange={(e) => update({ [timeKey]: e.target.value })}
                  >
                    {!preorderTimes.some(
                      (t) => t.value === value![timeKey],
                    ) && (
                      <option value={value![timeKey]}>{value![timeKey]}</option>
                    )}
                    {preorderTimes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </FarmstandSelect>
                </Field>
              </div>
            </fieldset>
          );
        })}
      </div>
      {timezone && (
        <p className="application-detail-note market-detail-zone">
          Times use the market&apos;s local time ({timezone}).
        </p>
      )}
      {result && (
        <Alert
          severity={result.ok ? 'success' : 'error'}
          role={result.ok ? 'status' : 'alert'}
        >
          {result.text}
        </Alert>
      )}
      {can && (
        <div className="application-detail-panel-actions">
          <FarmstandButton
            loading={busy}
            disabled={busy || !dirty}
            onClick={() => void save(value)}
          >
            {rule ? 'Save override' : 'Create override'}
          </FarmstandButton>
          {rule && (
            <FarmstandButton
              variant="secondary"
              disabled={busy}
              onClick={() => void save(null)}
            >
              Remove override
            </FarmstandButton>
          )}
        </div>
      )}
    </div>
  );
}

/** Preorder window shown in the Settings dialog, with what saving it overrides. */
export interface PreorderSettings {
  rule: PreorderInput;
  fallback?: PreorderInput;
  timezone?: string;
  notice: { active: string; inactive: string };
  onSave: (rule: PreorderInput) => Promise<unknown>;
}

/**
 * Approved items for preordering, with Settings and Request listing. Shared by
 * the market page (all undeclined upcoming dates) and a date page (that date).
 */
export function PreorderingPanel({
  service,
  detail,
  refresh,
  can,
  participations,
  scope,
  settings,
}: {
  service: VendorService;
  detail: MarketDetail;
  refresh: () => void;
  can: boolean;
  /** The dates whose offerings the preorder switches write. */
  participations: Participation[];
  /** Copy for the date scope: the lead sentence and why switches may be off. */
  scope: { lead: string; noDates: string };
  /** Omit when there is nothing to configure yet; the button explains why. */
  settings?: PreorderSettings;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FarmstandPanel
      as="section"
      aria-label="Approved items for preordering"
      className="application-detail-panel market-detail-preordering"
    >
      <PreorderItems
        service={service}
        detail={detail}
        refresh={refresh}
        can={can}
        participations={participations}
        scope={scope}
        onSettings={settings ? () => setOpen(true) : undefined}
      />
      {settings && (
        <Dialog
          open={open}
          size="standard"
          title="Preorder settings"
          description="Set when customers can place preorders."
          onClose={() => setOpen(false)}
          className="market-detail-settings"
        >
          <PreorderWindow
            rule={settings.rule}
            fallback={settings.fallback}
            timezone={settings.timezone}
            can={can}
            notice={settings.notice}
            onSave={async (rule) => {
              await settings.onSave(rule);
              setOpen(false);
            }}
          />
        </Dialog>
      )}
    </FarmstandPanel>
  );
}

function Preordering({
  service,
  detail,
  refresh,
  can,
}: {
  service: VendorService;
  detail: MarketDetail;
  refresh: () => void;
  can: boolean;
}) {
  const { state, dates } = detail;
  const participations = useMemo(() => preorderParticipations(dates), [dates]);
  return (
    <PreorderingPanel
      service={service}
      detail={detail}
      refresh={refresh}
      can={can}
      participations={participations}
      scope={{
        lead: `Choose which approved products customers can preorder at this market. Preorder applies to upcoming dates you haven't declined (${participations.length} ${participations.length === 1 ? 'date' : 'dates'}).`,
        noDates: 'RSVP to an upcoming date first',
      }}
      settings={{
        rule: state.membership.preorderDefault,
        fallback: marketPreorderRule(state),
        timezone:
          dates[0]?.occurrence.timezone ?? state.occurrences[0]?.timezone,
        notice: {
          active:
            "These times replace the market's default preorder window for your products at this market only. A window set on an individual date still takes priority.",
          inactive:
            "Your products follow the market's default preorder window. Saving these times creates a manual override for this market only. There is no vendor-wide preorder setting.",
        },
        onSave: async (rule) => {
          await service.marketDefault(
            state.membership.id,
            state.membership.version,
            rule,
          );
          refresh();
        },
      }}
    />
  );
}

function PreorderItems({
  service,
  detail,
  refresh,
  can,
  participations,
  scope,
  onSettings,
}: {
  service: VendorService;
  detail: MarketDetail;
  refresh: () => void;
  can: boolean;
  participations: Participation[];
  scope: { lead: string; noDates: string };
  onSettings?: () => void;
}) {
  const id = useId();
  const { state } = detail;
  const readCatalog = useCallback(() => readMarketCatalog(service), [service]);
  const catalog = useRead(`market-catalog:${service.vendorId}`, readCatalog);
  const items = useMemo(
    () => (catalog.data ? marketItems(catalog.data, state.listings) : []),
    [catalog.data, state.listings],
  );
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState<'all' | ItemStatus>('all'),
    [selected, setSelected] = useState<ReadonlySet<string>>(new Set()),
    [busy, setBusy] = useState<string>(),
    [result, setResult] = useState<{
      severity: 'warning' | 'error';
      text: string;
    }>();
  const visible = items.filter(
    (item) =>
      (status === 'all' || item.status === status) &&
      `${item.product} ${item.variant} ${item.sku} ${item.category ?? ''}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const allSelected =
    visible.length > 0 && visible.every((i) => selected.has(i.key));
  const requestable = items.filter(
    (i) => selected.has(i.key) && i.status === 'not-listed',
  );
  function toggleSelect(keys: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }
  async function requestListings() {
    setBusy('request');
    setResult(undefined);
    let failed = 0;
    for (const item of requestable) {
      try {
        await service.requestListing(state.membership.id, item.variantId);
      } catch {
        failed++;
      }
    }
    // Success needs no message: the new Pending status shows the request was sent.
    const sent = requestable.length - failed;
    if (failed)
      setResult({
        severity: sent ? 'warning' : 'error',
        text: `${failed} listing ${failed === 1 ? 'request' : 'requests'} could not be sent. Reload and try again.`,
      });
    setSelected(new Set());
    setBusy(undefined);
    refresh();
  }
  async function setPreorder(item: MarketItem, on: boolean) {
    const listing = item.listing!;
    setBusy(item.key);
    setResult(undefined);
    let failed = 0;
    for (const p of participations) {
      const existing = state.offerings.find(
        (o) => o.participationId === p.id && o.listingId === listing.id,
      );
      if (!on && !existing?.preorderEnabled) continue;
      try {
        await service.offering({
          participationId: p.id,
          listingId: listing.id,
          variantId: listing.variantId,
          expectedVersion: existing?.version ?? null,
          enabled: on ? true : (existing?.enabled ?? false),
          preorderEnabled: on,
          salesCap: existing?.salesCap ?? null,
        });
      } catch {
        failed++;
      }
    }
    let unpublished = false;
    if (on && mayCommand(service.context, 'ManageCatalogPublication'))
      try {
        const publication = await service.publication(listing.id);
        if (publication.state !== 'PUBLISHED') {
          if (!(await hasLeafCategory(service, publication.productId)))
            throw new Error('category required');
          await service.publish(listing.id);
        }
      } catch {
        unpublished = true;
      }
    setResult(
      failed
        ? {
            severity: 'error',
            text: `Preorder could not be updated for ${failed} of ${participations.length} dates. The latest settings have been reloaded.`,
          }
        : unpublished
          ? {
              severity: 'warning',
              text: `Preorder is on for ${item.product}, but the listing could not be published. Choose a category for the product, then try again.`,
            }
          : // Success needs no message: the switch shows the new state.
            undefined,
    );
    setBusy(undefined);
    refresh();
  }
  return (
    <>
      <header className="application-detail-panel-header">
        <h2>
          <FarmstandIcon name="package" />
          Approved items for preordering
        </h2>
        <div className="market-detail-header-actions">
          <FarmstandButton
            variant="secondary"
            size="compact"
            disabled={!onSettings}
            title={onSettings ? undefined : scope.noDates}
            onClick={onSettings}
          >
            <FarmstandIcon name="shopping-cart" />
            Settings
          </FarmstandButton>
          {can && (
            <FarmstandButton
              variant="secondary"
              size="compact"
              loading={busy === 'request'}
              disabled={!!busy || !requestable.length}
              title={
                requestable.length
                  ? undefined
                  : 'Select items that are not listed at this market yet'
              }
              onClick={() => void requestListings()}
            >
              <FarmstandIcon name="plus" />
              Request listing
              {requestable.length > 0 && ` (${requestable.length})`}
            </FarmstandButton>
          )}
        </div>
      </header>
      <p className="application-detail-note market-detail-lead">{scope.lead}</p>
      <ReadState {...catalog} retry={catalog.refresh} />
      {catalog.data && (
        <>
          <div className="markets-filters market-detail-item-filters">
            <label className="market-detail-select-all">
              <Checkbox
                checked={allSelected}
                disabled={!visible.length}
                onChange={(e) =>
                  toggleSelect(
                    visible.map((i) => i.key),
                    e.currentTarget.checked,
                  )
                }
              />
              Select all ({visible.length})
            </label>
            <Field
              id={id + '-search'}
              label={<span className="sr-only">Search products</span>}
            >
              <FarmstandSearch
                id={id + '-search'}
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            <Field
              id={id + '-status'}
              label={<span className="sr-only">Listing status</span>}
            >
              <FarmstandSelect
                id={id + '-status'}
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'all' | ItemStatus)
                }
              >
                <option value="all">All statuses</option>
                {(Object.keys(itemStatusLabels) as ItemStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {itemStatusLabels[s]}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
          </div>
          {result && (
            <Alert severity={result.severity} role="alert">
              {result.text}
            </Alert>
          )}
          {visible.length ? (
            <FarmstandTable
              label="Items for preordering"
              headings={[
                'Select',
                'Product',
                'Variant',
                'Category',
                'Price',
                'Status',
                'Enable preorder',
              ]}
            >
              {visible.map((item) => {
                const coverage =
                  item.listing &&
                  preorderCoverage(state, participations, item.listing.id);
                const on =
                  !!coverage &&
                  coverage.total > 0 &&
                  coverage.enabled === coverage.total;
                const reason =
                  item.status !== 'active'
                    ? 'Available once the market manager approves this listing'
                    : !participations.length
                      ? scope.noDates
                      : coverage && coverage.enabled > 0 && !on
                        ? `On for ${coverage.enabled} of ${coverage.total} dates`
                        : undefined;
                return (
                  <tr key={item.key}>
                    <td>
                      <Checkbox
                        aria-label={`Select ${item.product} ${item.variant}`}
                        checked={selected.has(item.key)}
                        onChange={(e) =>
                          toggleSelect([item.key], e.currentTarget.checked)
                        }
                      />
                    </td>
                    <th scope="row">{item.product}</th>
                    <td>{item.variant}</td>
                    <td>
                      {item.category ?? (
                        <span className="markets-muted">Uncategorized</span>
                      )}
                    </td>
                    <td>{formatMoney(item.price, item.currency)}</td>
                    <td>
                      <Badge tone={itemStatusTones[item.status]}>
                        {itemStatusLabels[item.status]}
                      </Badge>
                    </td>
                    <td title={reason}>
                      <VendorSwitch
                        tone="neutral"
                        aria-label={`Enable preorder for ${item.product} ${item.variant}`}
                        checked={on}
                        disabled={
                          !can ||
                          item.status !== 'active' ||
                          !participations.length ||
                          !!busy
                        }
                        onChange={(e) =>
                          void setPreorder(item, e.currentTarget.checked)
                        }
                      />
                      {reason && item.status === 'active' && (
                        <small className="market-detail-switch-note">
                          {reason}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </FarmstandTable>
          ) : (
            <EmptyState
              title={items.length ? 'No matching products' : 'No products yet'}
            >
              <p>
                {items.length
                  ? 'Try another search or status.'
                  : 'Add products to your catalog to list them at this market.'}
              </p>
            </EmptyState>
          )}
        </>
      )}
    </>
  );
}
