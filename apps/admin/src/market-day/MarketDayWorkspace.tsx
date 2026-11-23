import { useCallback, useEffect, useId, useState } from 'react';
import type {
  Permission,
  PreparationView,
  VendorBoothAssignment,
} from '@market/api';
import {
  Alert,
  Badge,
  Dialog,
  EmptyState,
  Field,
  MarketMap,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { MarketsPagination } from '../vendor/MarketsPagination';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { navigate } from '../DashboardWidgets';
import { SettingsPanel } from '../settings/SettingsPanel';
import {
  PreparationPage,
  PreparationStatus,
  paymentStatus,
} from '../preparation/PreparationPage';
import {
  usePreparationDates,
  type PreparationDates,
} from '../preparation/PreparationWorkspace';
import { AttendanceBadge } from '../market/phase14/Attendance';
import type { MarketService } from '../market/service';
import type { VendorService } from '../vendor/service';
import { go, ReadState, useRead } from '../vendor/common';
import { PickupDetails, PickupStatus } from '../vendor/pickup';
import { vendorOrderStatus } from '../vendor/order-presentation';
import { pickupState, readPickupOrders } from '../vendor/pickup-data';
import '../vendor/orders.css';
import '../vendor/application-detail.css';
import './market-day.css';
import { DayActions, type DayActionParts } from './DayActions';
import { ManagerDay } from './ManagerDay';
import { EquipmentSummary } from './EquipmentDialog';

type Phase = 'Setup' | 'Market' | 'Closing';
const phases: Phase[] = ['Setup', 'Market', 'Closing'];
const time = (value: string, timezone: string) =>
  new Date(value).toLocaleString(undefined, {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
const clock = (value: string, timezone: string) =>
  new Date(value).toLocaleTimeString(undefined, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  });
const day = (value: string, timezone: string) =>
  new Date(value).toLocaleDateString(undefined, {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function VendorMarketDay({
  service,
  occurrenceId,
  dates,
}: {
  service: VendorService;
  occurrenceId?: number;
  dates?: PreparationDates;
}) {
  if (!dates)
    return (
      <VendorMarketDayDates service={service} occurrenceId={occurrenceId} />
    );
  return (
    <DaySelector vendor={service} occurrenceId={occurrenceId} dates={dates} />
  );
}
function VendorMarketDayDates({
  service,
  occurrenceId,
}: {
  service: VendorService;
  occurrenceId?: number;
}) {
  const dates = usePreparationDates(service);
  return (
    <DaySelector vendor={service} occurrenceId={occurrenceId} dates={dates} />
  );
}
export function ManagerMarketDay({
  service,
  occurrenceId,
  dates,
}: {
  service: MarketService;
  occurrenceId?: number;
  dates?: PreparationDates;
}) {
  if (!dates)
    return (
      <ManagerMarketDayDates service={service} occurrenceId={occurrenceId} />
    );
  return (
    <DaySelector market={service} occurrenceId={occurrenceId} dates={dates} />
  );
}
function ManagerMarketDayDates({
  service,
  occurrenceId,
}: {
  service: MarketService;
  occurrenceId?: number;
}) {
  const dates = usePreparationDates(undefined, service);
  return (
    <DaySelector market={service} occurrenceId={occurrenceId} dates={dates} />
  );
}
/** Heading date picker, as in Assignments: the frame's top-right action. */
function DaySelector({
  vendor,
  market,
  occurrenceId,
  dates,
}: {
  vendor?: VendorService;
  market?: MarketService;
  occurrenceId?: number;
  dates: PreparationDates;
}) {
  const id = useId();
  const base = market ? '/market/day' : '/vendor/day';
  const [entryTime] = useState(Date.now);
  const defaultDate = dates.data
    ?.filter((d) => Date.parse(d.endsAt) > entryTime)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const defaultDateId = defaultDate?.id;
  useEffect(() => {
    if (!occurrenceId && defaultDateId) go(`${base}/${defaultDateId}`);
  }, [occurrenceId, defaultDateId, base]);
  const selector = (
    <Field
      id={`${id}-date`}
      label={<span className="sr-only">Market date</span>}
    >
      <FarmstandSelect
        id={`${id}-date`}
        icon="calendar-days"
        value={occurrenceId ?? ''}
        onChange={(e) => go(`${base}/${e.target.value}`)}
      >
        <option value="" disabled>
          {dates.loading ? 'Loading market dates...' : 'Choose a market date'}
        </option>
        {occurrenceId && !dates.data?.some((d) => d.id === occurrenceId) && (
          <option value={occurrenceId}>Selected market date</option>
        )}
        {dates.data?.map((d) => (
          <option key={d.id} value={d.id}>
            {market
              ? time(d.startsAt, d.timezone)
              : `${d.name} · ${time(d.startsAt, d.timezone)}`}
          </option>
        ))}
      </FarmstandSelect>
    </Field>
  );
  if (!occurrenceId)
    return (
      <WorkspaceFrame
        icon="calendar-days"
        title="Market Day"
        description="Choose a date to open your operational workspace."
        tabs={[]}
        value="Setup"
        onChange={() => {}}
        className="market-day-workspace farmstand-controls"
        actions={selector}
      >
        <ReadState
          loading={dates.loading}
          error={dates.error}
          retry={dates.refresh}
        />
        {dates.data && (
          <FarmstandPanel as="section" className="markets-list">
            <EmptyState
              title={
                dates.data.length
                  ? 'Choose a market date'
                  : 'No upcoming market dates'
              }
            >
              <p>
                {dates.data.length
                  ? 'Pick a date from the menu above to open its setup, market and closing tools.'
                  : 'Market dates appear here once they are scheduled.'}
              </p>
            </EmptyState>
          </FarmstandPanel>
        )}
      </WorkspaceFrame>
    );
  return (
    <DayWorkspace
      key={`${market?.readKey ?? vendor?.vendorId}:${occurrenceId}`}
      vendor={vendor}
      market={market}
      occurrenceId={occurrenceId}
      selector={selector}
    />
  );
}

function DayWorkspace({
  vendor,
  market,
  occurrenceId,
  selector,
}: {
  vendor?: VendorService;
  market?: MarketService;
  occurrenceId: number;
  selector: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>(
    () =>
      phases.find((p) => `#${p.toLowerCase()}` === window.location.hash) ??
      'Setup',
  );
  const [initialPhaseChosen, setInitialPhaseChosen] = useState(() =>
    phases.some((p) => `#${p.toLowerCase()}` === window.location.hash),
  );
  const [observedAt] = useState(Date.now);
  const api = market?.preparation ?? vendor?.preparation;
  const scope = market ? 'MANAGER' : 'VENDOR';
  const permissions = (market ?? vendor)!.context.permissions;
  const can = (permission: Permission) => permissions.includes(permission);
  const load = useCallback(async () => {
    if (!api) throw new Error('Market Day information is unavailable.');
    const data = await api.read(scope, occurrenceId);
    if (data.occurrence.id !== occurrenceId)
      throw new Error('Market date does not match this workspace.');
    return data;
  }, [api, scope, occurrenceId]);
  const query = useRead(`day:${scope}:${occurrenceId}`, load, !!api);
  const data = query.data;
  const base = market ? '/market/day' : '/vendor/day';
  const attendanceLoad = useCallback(async () => {
    if (data?.privateMarket || market) return true;
    const attendance = vendor?.marketAttendance;
    if (!attendance) return false;
    const page = await attendance.vendor({ occurrenceId });
    return page.items.some(
      (row) => row.occurrenceId === occurrenceId && row.status === 'CHECKED_IN',
    );
  }, [vendor, market, occurrenceId, data?.privateMarket]);
  const ownAttendance = useRead(
    `day-entry:${scope}:${occurrenceId}`,
    attendanceLoad,
    !!data,
  );
  useEffect(() => {
    if (initialPhaseChosen || !data || ownAttendance.data === undefined) return;
    const tasks = data.tasks.filter(
      (task) => !task.title.startsWith('[Closing] '),
    );
    const ready =
      ownAttendance.data &&
      tasks.length > 0 &&
      tasks.every((task) => !!task.completedAt);
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (ready) setPhase('Market');
      setInitialPhaseChosen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [data, ownAttendance.data, initialPhaseChosen]);
  const checklist = phase !== 'Market' && (
    <PreparationPage
      key={`${scope}:${occurrenceId}:${phase}`}
      api={api}
      scope={scope}
      occurrenceId={occurrenceId}
      taskPhase={phase}
      canManage={can(
        market ? 'OperateOwnMarketDay' : 'ManageOwnMarketParticipation',
      )}
    />
  );
  function body(data: PreparationView, parts: DayActionParts) {
    if (market)
      return (
        <ManagerDay
          service={market}
          phase={phase}
          data={data}
          checklist={checklist}
          parts={parts}
        />
      );
    if (!vendor) return null;
    return phase === 'Setup' ? (
      <VendorSetup
        service={vendor}
        data={data}
        occurrenceId={occurrenceId}
        checklist={checklist}
      />
    ) : (
      <VendorOperations
        service={vendor}
        data={data}
        phase={phase}
        occurrenceId={occurrenceId}
        checklist={checklist}
        parts={parts}
      />
    );
  }
  return (
    <WorkspaceFrame
      icon="calendar-days"
      title={data?.occurrence.marketName ?? 'Market Day'}
      description={
        data ? (
          <span className="market-day-description">
            <span>
              {day(data.occurrence.startsAt, data.occurrence.timezone)} ·{' '}
              {clock(data.occurrence.startsAt, data.occurrence.timezone)} to{' '}
              {clock(data.occurrence.endsAt, data.occurrence.timezone)}
            </span>
            <span>{data.occurrence.venue || 'Location unavailable'}</span>
            <PreparationStatus value={data.occurrence.status} />
          </span>
        ) : (
          'Occurrence-specific operations'
        )
      }
      tabs={
        data
          ? phases.map((p) => ({
              value: p,
              label: p,
              href: `${base}/${occurrenceId}#${p.toLowerCase()}`,
              icon:
                p === 'Setup'
                  ? 'calendar-days'
                  : p === 'Market'
                    ? 'store'
                    : 'circle-check',
            }))
          : []
      }
      value={phase}
      onChange={(value) => {
        setInitialPhaseChosen(true);
        setPhase(value);
        window.history.replaceState(
          null,
          '',
          `${base}/${occurrenceId}#${value.toLowerCase()}`,
        );
      }}
      className="market-day-workspace farmstand-controls"
      actions={selector}
    >
      {!api && (
        <Alert severity="info">
          Market Day is unavailable in this environment.
        </Alert>
      )}
      <ReadState
        skeleton="detail"
        loading={query.loading}
        error={query.error}
        retry={query.refresh}
      />
      {data && (
        <>
          {Date.parse(data.occurrence.endsAt) < observedAt && (
            <Alert severity="info">
              The scheduled end time has passed. This does not close market
              operations.
            </Alert>
          )}
          {market?.marketDay || vendor?.marketDay ? (
            <DayActions
              vendor={vendor}
              market={market}
              data={data}
              phase={phase}
            >
              {(parts) => body(data, parts)}
            </DayActions>
          ) : (
            body(data, { alerts: null, assistance: null, finish: null })
          )}
        </>
      )}
    </WorkspaceFrame>
  );
}

/**
 * Vendor Setup: booth allocation and the booth map as the main column, with
 * attendance and the Setup checklist in the sidebar.
 */
function VendorSetup({
  service,
  data,
  occurrenceId,
  checklist,
}: {
  service: VendorService;
  data: PreparationView;
  occurrenceId: number;
  checklist: React.ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const assignments = data.assignments ?? [];
  const current = assignments[selected] ?? assignments[0];
  return (
    <div className="market-day-vendor-columns">
      <div className="market-day-vendor-main">
        {data.privateMarket ? (
          <Alert severity="info">
            Private vendor-managed date. Manager check-in, booths and equipment
            are not applicable.
          </Alert>
        ) : (
          <>
            <BoothAllocation data={data} occurrenceId={occurrenceId} />
            <VendorBoothMap
              assignments={assignments}
              assignment={current}
              onSelect={setSelected}
              known={data.assignments != null}
            />
          </>
        )}
      </div>
      <aside
        className="market-day-vendor-aside"
        aria-label="Attendance and setup checklist"
      >
        {!data.privateMarket && (
          <VendorCheckIn service={service} occurrenceId={occurrenceId} />
        )}
        {checklist}
      </aside>
    </div>
  );
}

/**
 * Vendor Market and Closing: pickups as the main column; market
 * tools, the Closing checklist and assistance requests in the sidebar. The
 * Closing finish panel spans the page above them.
 */
function VendorOperations({
  service,
  phase,
  occurrenceId,
  checklist,
  parts,
}: {
  service: VendorService;
  data: PreparationView;
  phase: Phase;
  occurrenceId: number;
  checklist: React.ReactNode;
  parts: DayActionParts;
}) {
  const can = (permission: Permission) =>
    service.context.permissions.includes(permission);
  const tools = [
    service.pos &&
      can('OperateOwnPos') && {
        href: `/vendor/pos?occurrence=${occurrenceId}`,
        icon: 'credit-card' as const,
        label: 'Open POS',
      },
    can('ReadOwnOrders') && {
      href: `/vendor/orders/pickup?occurrence=${occurrenceId}`,
      icon: 'shopping-bag' as const,
      label: 'Open Order Pickup',
    },
    can('ReadOwnOrders') && {
      href: `/vendor/orders?occurrence=${occurrenceId}`,
      icon: 'receipt-text' as const,
      label: 'View orders',
    },
    service.finance &&
      can('ReadOwnVendorFinance') && {
        href: '/vendor/finances',
        icon: 'chart-column' as const,
        label: 'Sales and reconciliation',
      },
  ].filter((tool) => !!tool);
  return (
    <>
      {parts.alerts}
      {parts.finish}
      <div className="market-day-vendor-columns">
        <div className="market-day-vendor-main">
          {can('ReadOwnOrders') ? (
            <DayPickups
              key={occurrenceId}
              service={service}
              occurrenceId={occurrenceId}
            />
          ) : (
            <Alert severity="info">
              Order permission is required to view pickups.
            </Alert>
          )}
        </div>
        <aside
          className="market-day-vendor-aside"
          aria-label="Market tools and requests"
        >
          {phase === 'Closing' && checklist}
          {tools.length > 0 && (
            <SettingsPanel
              icon="store"
              title="Market tools"
              className="day-tools"
            >
              <div className="application-detail-quick-actions">
                {tools.map((tool) => (
                  <FarmstandLink
                    key={tool.href}
                    href={tool.href}
                    onClick={navigate}
                    variant={
                      tool.label === 'Open POS' ? 'primary' : 'secondary'
                    }
                    className="application-detail-arrow"
                  >
                    <FarmstandIcon name={tool.icon} />
                    {tool.label}
                    <FarmstandIcon name="arrow-right" />
                  </FarmstandLink>
                ))}
              </div>
            </SettingsPanel>
          )}
          {parts.assistance}
        </aside>
      </div>
    </>
  );
}

/**
 * The published market map (as on Booth assignments) in the manager Booth
 * map panel presentation, highlighting the vendor's booth. Vendors with
 * several booths choose which one to highlight from the heading select.
 */
function VendorBoothMap({
  assignments,
  assignment,
  onSelect,
  known,
}: {
  assignments: VendorBoothAssignment[];
  assignment?: VendorBoothAssignment;
  onSelect: (index: number) => void;
  known: boolean;
}) {
  const id = useId();
  return (
    <SettingsPanel
      icon="map-pin"
      title="Booth map"
      className="assignments-map-panel market-day-map"
      description={
        assignment?.map
          ? `Booth ${assignment.space.label} is highlighted.`
          : 'Find your booth once the market publishes its map.'
      }
      actions={
        assignments.length > 1 && (
          <Field
            id={`${id}-booth`}
            label={<span className="sr-only">Booth to highlight</span>}
          >
            <FarmstandSelect
              id={`${id}-booth`}
              icon="store"
              value={Math.max(0, assignments.indexOf(assignment!))}
              onChange={(e) => onSelect(Number(e.target.value))}
            >
              {assignments.map((a, index) => (
                <option key={`${a.elementId}:${index}`} value={index}>
                  Booth {a.space.label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
        )
      }
    >
      {assignment?.map ? (
        <MarketMap
          definition={assignment.map.definition}
          spaces={assignment.map.spaces}
          selectedId={assignment.elementId}
          showBoothList={false}
        />
      ) : (
        <p className="markets-muted">
          {!known
            ? 'Map information is unavailable.'
            : assignment
              ? 'The market map is awaiting publication.'
              : 'The map appears here once your booth is assigned.'}
        </p>
      )}
    </SettingsPanel>
  );
}

/**
 * The vendor's booth for this date: one booth gets a large card; several
 * booths become a grid of smaller cards. Cards are informational only.
 * Equipment opens in a dialog so long rental lists stay off the page.
 */
function BoothAllocation({
  data,
  occurrenceId,
}: {
  data: PreparationView;
  occurrenceId: number;
}) {
  const assignments = data.assignments;
  const multiple = (assignments?.length ?? 0) > 1;
  const href = `/vendor/booths?occurrence=${occurrenceId}`;
  return (
    <SettingsPanel
      icon="store"
      title={multiple ? 'Your booths' : 'Your booth'}
      className="day-booth-panel"
      description={
        assignments == null
          ? 'Assignment information is unavailable.'
          : !assignments.length
            ? 'The market has not assigned your booth yet.'
            : multiple
              ? `${assignments.length} booths allocated for this date.`
              : 'Allocated for this market date.'
      }
      actions={
        <FarmstandLink
          onClick={navigate}
          href={href}
          variant="secondary"
          size="compact"
        >
          <FarmstandIcon name="receipt-text" />
          Assignment and invoices
        </FarmstandLink>
      }
    >
      {assignments == null ? (
        <p className="markets-muted">
          Booth details could not be read. Open your assignment to check it.
        </p>
      ) : !assignments.length ? (
        <EmptyState title="No booth allocated yet">
          <p>
            Your booth and any equipment appear here once the market assigns
            them.
          </p>
        </EmptyState>
      ) : (
        <div className={multiple ? 'day-booth-grid' : undefined}>
          {assignments.map((a, index) => (
            <BoothCard
              key={`${a.elementId}:${index}`}
              assignment={a}
              compact={multiple}
            />
          ))}
        </div>
      )}
    </SettingsPanel>
  );
}
function BoothCard({
  assignment: a,
  compact,
}: {
  assignment: VendorBoothAssignment;
  compact: boolean;
}) {
  const payment = paymentStatus(a.invoices);
  return (
    <article
      className={`day-booth${compact ? ' day-booth-compact' : ''}`}
      aria-label={`Booth ${a.space.label}`}
    >
      <div className="day-booth-summary">
        <span className="day-booth-tile" aria-hidden="true">
          <UtilityIcon name="booth" />
        </span>
        <div className="day-booth-facts">
          <span className="day-booth-name">Booth {a.space.label}</span>
          <span className="day-booth-meta">
            <span>
              {a.space.widthFeet} × {a.space.depthFeet} ft
            </span>
            {a.space.amenities.map((amenity) => (
              <Badge key={amenity} tone="neutral">
                {amenity.charAt(0) + amenity.slice(1).toLowerCase()}
              </Badge>
            ))}
          </span>
          <span className="day-booth-payment">
            Booth fee <PreparationStatus value={payment} />
          </span>
        </div>
      </div>
      {a.publicInstructions && (
        <p className="market-application-guidance day-booth-instructions">
          <FarmstandIcon name="info" />
          {a.publicInstructions}
        </p>
      )}
      {a.rentals.length > 0 && (
        <EquipmentSummary
          buttonOnly
          items={a.rentals.map((r) => ({ name: r.name, quantity: r.quantity }))}
          title={`Booth ${a.space.label} equipment`}
        />
      )}
    </article>
  );
}

/** Compact sidebar card: the vendor's check-in for this date. */
function VendorCheckIn({
  service,
  occurrenceId,
}: {
  service: VendorService;
  occurrenceId: number;
}) {
  const api = service.marketAttendance;
  const load = useCallback(
    () => api!.vendor({ occurrenceId }),
    [api, occurrenceId],
  );
  const query = useRead(
    `day-attendance:${service.vendorId}:${occurrenceId}`,
    load,
    !!api,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const row = query.data?.items.find((r) => r.occurrenceId === occurrenceId);
  return (
    <SettingsPanel
      icon="circle-check"
      title="Attendance"
      className="day-check-in"
      description="Check in when you arrive. Readiness is shared separately."
    >
      <ReadState
        skeleton="detail"
        rows={2}
        loading={query.loading}
        error={query.error}
        retry={query.refresh}
      />
      {!!error && (
        <Alert severity="error">
          Check-in was not confirmed. Refresh and review your attendance before
          trying again.
        </Alert>
      )}
      {!api ? (
        <p className="markets-muted">Attendance unavailable.</p>
      ) : row ? (
        <>
          <div className="day-check-in-status">
            <span>Status</span>
            <AttendanceBadge status={row.status} source={row.checkInSource} />
          </div>
          {row.checkedInAt && (
            <p className="markets-muted">
              Checked in {time(row.checkedInAt, row.snapshot.timezone)}
            </p>
          )}
          {row.canSelfCheckIn && row.revision != null ? (
            <FarmstandButton
              disabled={busy || query.loading}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                setError(undefined);
                try {
                  await api.selfCheckIn(occurrenceId, row.revision!);
                } catch (e) {
                  setError(e);
                } finally {
                  query.refresh();
                  setBusy(false);
                }
              }}
            >
              <FarmstandIcon name="circle-check" />
              Check in
            </FarmstandButton>
          ) : (
            row.status !== 'CHECKED_IN' && (
              <p className="market-application-guidance">
                Self-check-in opens during the scheduled market window when you
                are eligible. Ask market staff for corrections.
              </p>
            )
          )}
        </>
      ) : (
        !query.loading &&
        !query.error && (
          <p className="markets-muted">
            No attendance record is available for this date.
          </p>
        )
      )}
      <FarmstandLink
        appearance="text"
        onClick={navigate}
        href="/vendor/day/history"
        className="day-check-in-history"
      >
        <span className="farmstand-text-link">Attendance history</span>
        <FarmstandIcon name="arrow-right" />
      </FarmstandLink>
    </SettingsPanel>
  );
}

export function DayPickups({
  service,
  occurrenceId,
}: {
  service: VendorService;
  occurrenceId: number;
}) {
  const load = useCallback(
    async () =>
      (await readPickupOrders(service, String(occurrenceId))).filter(
        (o) =>
          o.portion.occurrenceId === String(occurrenceId) &&
          o.portion.vendorId === service.vendorId,
      ),
    [service, occurrenceId],
  );
  const query = useRead(
    `day-pickups:${service.vendorId}:${occurrenceId}`,
    load,
  );
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const orders = query.data ?? [];
  const outstanding = orders.filter(
    (o) => !['Picked up', 'Cancelled'].includes(pickupState(o)),
  );
  const pickups = orders.filter((o) => pickupState(o) !== 'Cancelled');
  const visible = pickups
    .filter((o) =>
      `${o.customer} ${o.orderCode}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(pickupState(a) === 'Picked up') -
        Number(pickupState(b) === 'Picked up'),
    );
  const order = visible.find((o) => o.portion.operationalOrderId === selected);
  // Pickups change at the counter: re-read when the window regains focus.
  const refreshPickups = query.refresh;
  useEffect(() => {
    const visibleRefresh = () => {
      if (document.visibilityState === 'visible' && !busy) refreshPickups();
    };
    window.addEventListener('focus', visibleRefresh);
    return () => window.removeEventListener('focus', visibleRefresh);
  }, [refreshPickups, busy]);
  const pickedUp = orders.filter((o) => pickupState(o) === 'Picked up').length;
  return (
    <FarmstandPanel
      as="section"
      className="markets-list market-applications-list market-day-pickups"
      aria-label="Pickups"
    >
      <div className="market-day-list-heading">
        <h2>Pickups</h2>
        {query.data && (
          <div className="market-day-list-actions">
            <Badge tone={outstanding.length ? 'warning' : 'success'}>
              {outstanding.length} awaiting
            </Badge>
            <Badge tone="neutral">{pickedUp} picked up</Badge>
          </div>
        )}
      </div>
      <div className="markets-filters market-day-pickup-filters">
        <Field
          id={`${searchId}-search`}
          label={<span className="sr-only">Search pickup orders</span>}
        >
          <FarmstandSearch
            id={`${searchId}-search`}
            aria-label="Search pickup orders"
            placeholder="Customer name or order number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </Field>
      </div>
      <ReadState
        loading={!query.data && query.loading}
        error={query.error}
        retry={query.refresh}
      />
      {query.data &&
        (visible.length ? (
          <>
            <FarmstandTable
              label="Occurrence pickup orders"
              headings={['Customer', 'Items', 'Order', 'Pickup', '']}
            >
              {visible.slice(page * 10, (page + 1) * 10).map((o) => (
                <tr key={o.portion.operationalOrderId}>
                  <th scope="row">
                    <div className="markets-identity">
                      <span className="markets-identity-icon">
                        <FarmstandIcon name="shopping-bag" />
                      </span>
                      <span>
                        <span className="market-application-name">
                          {o.customer}
                        </span>
                        <small>{o.orderCode}</small>
                      </span>
                    </div>
                  </th>
                  <td className="market-day-pickup-items">
                    {o.portion.lines.reduce(
                      (total, line) => total + line.quantity,
                      0,
                    )}
                  </td>
                  <td>
                    <Badge
                      tone={
                        vendorOrderStatus('order', o.portion.nativeState).tone
                      }
                    >
                      {vendorOrderStatus('order', o.portion.nativeState).label}
                    </Badge>
                  </td>
                  <td>
                    <PickupStatus order={o} />
                  </td>
                  <td className="market-day-row-action">
                    <FarmstandButton
                      variant="secondary"
                      size="compact"
                      disabled={busy}
                      onClick={() => setSelected(o.portion.operationalOrderId)}
                    >
                      Review pickup
                    </FarmstandButton>
                  </td>
                </tr>
              ))}
            </FarmstandTable>
            <MarketsPagination
              label="Pickup pages"
              summary={`${visible.length} matching ${visible.length === 1 ? 'order' : 'orders'}`}
              hasPrevious={page > 0}
              hasNext={(page + 1) * 10 < visible.length}
              onPrevious={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        ) : (
          <EmptyState
            title={
              pickups.length ? 'No matching pickups' : 'No outstanding pickups'
            }
          >
            <p>
              {pickups.length
                ? 'Try another name or order number.'
                : 'Preorders awaiting pickup for this date appear here.'}
            </p>
          </EmptyState>
        ))}
      <Dialog
        open={!!order}
        busy={busy}
        title="Review pickup"
        onClose={() => {
          if (!busy) setSelected(undefined);
        }}
      >
        {order && (
          <PickupDetails
            key={`${order.portion.operationalOrderId}:${JSON.stringify(order.portion.lines)}`}
            service={service}
            order={order}
            itemChecklist
            onPendingChange={setBusy}
            refresh={() => {
              setSelected(undefined);
              query.refresh();
            }}
          />
        )}
      </Dialog>
    </FarmstandPanel>
  );
}
