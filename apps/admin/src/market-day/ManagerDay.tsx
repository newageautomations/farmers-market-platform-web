import { useCallback, useId, useMemo, useState } from 'react';
import type {
  AttendanceApi,
  AttendanceCommand,
  AttendancePage,
  AttendanceRow,
  AttendanceStatus,
  Permission,
  PreparationVendor,
  PreparationView,
} from '@market/api';
import { safeError } from '@market/api';
import { Alert, Badge, EmptyState, Field, Textarea } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { MarketsSummary } from '../vendor/MarketsSummary';
import { MarketsPagination } from '../vendor/MarketsPagination';
import { SettingsPanel } from '../settings/SettingsPanel';
import { navigate } from '../DashboardWidgets';
import { ReadState, useRead } from '../vendor/common';
import type { MarketService } from '../market/service';
import { CompactLabel, DetailSheet } from '../market/mobile';
import { MarketDialog, StatusBadge } from '../market/presentation';
import { BoothMap, occurrenceBooths } from '../market/phase14/Assignments';
import {
  AttendanceBadge,
  AttendanceHistory,
  attendanceLabels,
} from '../market/phase14/Attendance';
import {
  PreparationStatus,
  paymentStatus,
} from '../preparation/PreparationPage';
import '@market/ui/workspace-records.css';
import '../vendor/market-dates.css';
import '../market/market-occurrences.css';
import '../market/phase14/assignments.css';
import type { DayActionParts } from './DayActions';
import { EquipmentSummary, type EquipmentItem } from './EquipmentDialog';

const PAGE_SIZE = 10;
const statuses = Object.keys(attendanceLabels) as AttendanceStatus[];
const payments = [
  ['paid', 'Paid'],
  ['due', 'Payment due'],
  ['none', 'No invoice yet'],
] as const;
const time = (value: string, timeZone: string) =>
  new Date(value).toLocaleString(undefined, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
function paymentGroup(status: string) {
  if (status === 'Complete') return 'paid';
  if (status.startsWith('Incomplete')) return 'due';
  if (status === 'Unknown (no invoice)') return 'none';
  return 'other';
}
/** Preparation facts for an attendance row: by account, directory record, then name. */
function vendorFor(row: AttendanceRow, vendors: PreparationVendor[]) {
  return (
    vendors.find((v) => row.vendorId != null && v.vendorId === row.vendorId) ??
    vendors.find(
      (v) => row.directoryId != null && v.directoryId === row.directoryId,
    ) ??
    vendors.find(
      (v) =>
        v.name.toLocaleLowerCase() ===
        row.snapshot.businessName.toLocaleLowerCase(),
    )
  );
}
/** Equipment allocations arrive as rental snapshots; anything else is unnamed. */
function rentalItem(rental: unknown): EquipmentItem {
  if (rental && typeof rental === 'object' && 'name' in rental) {
    const r = rental as { name: unknown; quantity?: unknown };
    return {
      name: String(r.name),
      quantity: typeof r.quantity === 'number' ? r.quantity : undefined,
    };
  }
  return { name: 'Equipment allocation' };
}

/**
 * Manager Market Day: summary cards, the date's booth map beside the phase
 * checklist, then vendor attendance in the Operations list layout (Farmstand
 * filters, table, row selection and side panel). Feature composition: the
 * former compact `Attendance` card and the Vendor operations table are merged
 * here because no shared component combines attendance commands with
 * preparation booth, payment and equipment facts. Attendance commands keep
 * their revision contract; `Attendance` itself is unchanged for its other route.
 */
export function ManagerDay({
  service,
  data,
  checklist,
  phase,
  parts,
}: {
  service: MarketService;
  data: PreparationView;
  checklist: React.ReactNode;
  phase?: string;
  /** Assistance and finish sections from `DayActions`, placed here. */
  parts: DayActionParts;
}) {
  const can = (permission: Permission) =>
    service.context.permissions.includes(permission);
  const id = data.occurrence.id;
  const attendanceApi = can('ReadOwnMarketAssignments')
    ? service.phase14?.attendance
    : undefined;
  const attendance = useDayAttendance(attendanceApi, id);
  const canBoothMap = !!service.phase14 && can('ReadOwnMarketAssignments');
  const mapLoad = useCallback(
    () => service.phase14!.read('ASSIGNMENTS', id),
    [service, id],
  );
  const map = useRead(
    `${service.readKey}:day-map:${id}`,
    mapLoad,
    canBoothMap,
    {
      retainPreviousData: true,
    },
  );
  const vendors = data.vendors ?? [];
  const counts = attendance.read.data?.counts;
  const summary = data.operationsSummary;
  const confirmed =
    data.vendors == null
      ? null
      : vendors.filter((v) => v.participation === 'confirmed').length;
  const paymentsDue =
    data.vendors == null
      ? null
      : vendors.filter((v) =>
          paymentStatus(v.invoices).startsWith('Incomplete'),
        ).length;
  const totalBooths =
    summary && summary.unassignedBooths != null
      ? summary.assignedBooths + summary.unassignedBooths
      : null;
  const [selected, setSelected] = useState<number>();
  // Phones and tablets open the selected vendor's details in a sheet.
  const [detailOpen, setDetailOpen] = useState(false);
  const select = (value: number) => {
    setSelected(value);
    setDetailOpen(true);
  };
  const rows = attendance.read.data?.items;
  const selectedRow = rows?.find((r) => r.id === selected);
  // The booth map and the table select the same vendor.
  const booths = map.data ? occurrenceBooths(map.data, id) : undefined;
  const mapSelection =
    selectedRow?.snapshot.booth && booths
      ? (booths.spaces.find(
          (s) =>
            s.details.label ===
            selectedRow.snapshot.booth!.split(',')[0]!.trim(),
        )?.elementId ?? '')
      : '';
  const plan = booths?.plan;
  const mapPanel = canBoothMap && (
    <SettingsPanel
      icon="map-pin"
      title="Booth map"
      className="assignments-map-panel market-day-map"
      description={
        plan ? (
          <>
            <StatusBadge>{plan.state}</StatusBadge>
            <span>Select a booth to see its vendor.</span>
          </>
        ) : map.data ? (
          'No layout has been selected for this date.'
        ) : (
          'Booths and vendors for this date.'
        )
      }
      actions={
        <FarmstandLink
          href={`/market/assignments/${id}`}
          onClick={navigate}
          variant="secondary"
          size="compact"
        >
          <FarmstandIcon name="store" />
          <CompactLabel>Manage booths</CompactLabel>
        </FarmstandLink>
      }
    >
      <ReadState
        loading={!map.data && map.loading}
        error={map.error}
        retry={map.refresh}
      />
      {map.data && booths?.version ? (
        <BoothMap
          data={map.data}
          occurrenceId={id}
          selectedId={mapSelection}
          onSelect={(elementId) => {
            const label = booths.spaces.find((s) => s.elementId === elementId)
              ?.details.label;
            const row = rows?.find((r) =>
              (r.snapshot.booth ?? '')
                .split(',')
                .map((b) => b.trim())
                .includes(label ?? ''),
            );
            if (row) select(row.id);
          }}
          showBoothList={false}
        />
      ) : (
        map.data && (
          <p className="markets-muted">
            Choose a layout in Assignments to see the booth map here.
          </p>
        )
      )}
    </SettingsPanel>
  );
  return (
    <>
      {phase === 'Setup' && (
        <MarketsSummary
          className="market-dates-summary"
          items={[
            {
              label: 'Confirmed vendors',
              value: confirmed ?? '—',
              hint:
                confirmed == null
                  ? 'Vendor information unavailable'
                  : `${plural(vendors.length, 'participating vendor')}`,
              icon: 'user-round',
            },
            {
              label: 'Booths assigned',
              value:
                summary == null
                  ? '—'
                  : totalBooths == null
                    ? summary.assignedBooths
                    : `${summary.assignedBooths} / ${totalBooths}`,
              tone:
                totalBooths && summary && !summary.unassignedBooths
                  ? 'success'
                  : undefined,
              hint:
                summary == null
                  ? 'Booth information unavailable'
                  : summary.unassignedBooths == null
                    ? 'No layout selected'
                    : `${plural(summary.unassignedBooths, 'booth')} available`,
              icon: 'store',
            },
            {
              label: 'Checked in',
              value: counts ? (counts.CHECKED_IN ?? 0) : '—',
              tone:
                counts && counts.expected && !counts.AWAITING
                  ? 'success'
                  : undefined,
              hint: counts
                ? `${counts.AWAITING ?? 0} of ${counts.expected ?? 0} expected still to arrive`
                : 'Attendance unavailable',
              icon: 'circle-check',
            },
            {
              label: 'Invoices needing attention',
              value: summary?.outstandingInvoices ?? '—',
              tone: summary?.outstandingInvoices ? 'warning' : undefined,
              hint:
                paymentsDue == null
                  ? 'Payment information unavailable'
                  : paymentsDue
                    ? `${plural(paymentsDue, 'vendor')} with payment due`
                    : 'No vendor payments due',
              icon: 'receipt-text',
            },
          ]}
        />
      )}
      {parts.alerts}
      {parts.finish}
      {mapPanel ? (
        <div className="market-day-board">
          {mapPanel}
          <div className="market-day-board-aside">
            {checklist}
            {parts.assistance}
          </div>
        </div>
      ) : (
        <div className="market-day-board-aside">
          {checklist}
          {parts.assistance}
        </div>
      )}
      {phase !== 'Market' &&
        (attendanceApi ? (
          <AttendanceList
            api={attendanceApi}
            occurrenceId={id}
            attendance={attendance}
            vendors={vendors}
            vendorsKnown={data.vendors != null}
            selected={selected}
            onSelect={select}
            detailOpen={detailOpen}
            onDetailClose={() => setDetailOpen(false)}
            canManage={can('OperateOwnMarketDay')}
            invoicesHref={
              can('ReadOwnMarketBilling')
                ? `/market/finances/invoices?occurrence=${id}`
                : undefined
            }
          />
        ) : (
          <Alert severity="info">
            Vendor attendance is unavailable for your account.
          </Alert>
        ))}
    </>
  );
}

/** All attendance rows for the date (bounded pages), plus the command runner. */
function useDayAttendance(
  api: AttendanceApi | undefined,
  occurrenceId: number,
) {
  const load = useCallback(async (): Promise<AttendancePage> => {
    const first = await api!.read({ occurrenceId, status: '', skip: 0 });
    const items = [...first.items];
    while (items.length < first.totalItems) {
      const next = await api!.read({
        occurrenceId,
        status: '',
        skip: items.length,
      });
      if (!next.items.length)
        throw new Error(
          'Attendance changed while loading. Refresh to try again.',
        );
      items.push(...next.items);
    }
    return {
      ...first,
      items: items.filter((row) => row.occurrenceId === occurrenceId),
    };
  }, [api, occurrenceId]);
  const read = useRead(`day-attendance-list:${occurrenceId}`, load, !!api, {
    retainPreviousData: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof safeError> | null>(null);
  const refresh = read.refresh;
  const run = useCallback(
    async (command: AttendanceCommand) => {
      setBusy(true);
      setError(null);
      try {
        await api!.command(command);
        return true;
      } catch (e) {
        setError(safeError(e));
        return false;
      } finally {
        refresh();
        setBusy(false);
      }
    },
    [api, refresh],
  );
  return { read, run, busy, error };
}
type DayAttendance = ReturnType<typeof useDayAttendance>;

function AttendanceList({
  api,
  occurrenceId,
  attendance,
  vendors,
  vendorsKnown,
  selected,
  onSelect,
  detailOpen,
  onDetailClose,
  canManage,
  invoicesHref,
}: {
  api: AttendanceApi;
  occurrenceId: number;
  attendance: DayAttendance;
  vendors: PreparationVendor[];
  vendorsKnown: boolean;
  selected?: number;
  onSelect: (id: number) => void;
  detailOpen: boolean;
  onDetailClose: () => void;
  canManage: boolean;
  invoicesHref?: string;
}) {
  const formId = useId();
  const { read, run, busy, error } = attendance;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [page, setPage] = useState(0);
  const [finalize, setFinalize] = useState(false);
  const data = read.data;
  const rows = useMemo(() => data?.items ?? [], [data]);
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return rows
      .filter(
        (r) =>
          (!status || r.status === status) &&
          (!payment ||
            paymentGroup(paymentStatus(vendorFor(r, vendors)?.invoices)) ===
              payment) &&
          `${r.snapshot.businessName} ${r.snapshot.booth ?? ''}`
            .toLocaleLowerCase()
            .includes(term),
      )
      .sort((a, b) =>
        a.snapshot.businessName.localeCompare(
          b.snapshot.businessName,
          undefined,
          { sensitivity: 'base', numeric: true },
        ),
      );
  }, [rows, search, status, payment, vendors]);
  // A booth chosen on the map moves the table to that vendor's page.
  const [shownSelection, setShownSelection] = useState(selected);
  if (shownSelection !== selected) {
    setShownSelection(selected);
    const index = visible.findIndex((r) => r.id === selected);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE));
  }
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current =
    rows.find((r) => r.id === selected) ?? (selected ? undefined : shown[0]);
  const finalized = !!data?.session?.finalizedAt;
  const canCheckIn =
    canManage && !finalized && data?.occurrence?.status === 'scheduled';
  function filter(update: () => void) {
    update();
    setPage(0);
  }
  return (
    <div className="markets-columns market-applications-columns market-day-attendance">
      <div className="market-applications-main">
        <FarmstandPanel
          as="section"
          className="markets-list market-applications-list"
          aria-label="Vendor attendance"
          aria-busy={busy}
        >
          <div className="market-day-list-heading">
            <h2>Vendor attendance</h2>
            <div className="market-day-list-actions">
              {invoicesHref && (
                <FarmstandLink
                  href={invoicesHref}
                  onClick={navigate}
                  variant="secondary"
                  size="compact"
                >
                  <FarmstandIcon name="receipt-text" />
                  <CompactLabel>Invoices and payments</CompactLabel>
                </FarmstandLink>
              )}
              {data &&
                (finalized ? (
                  <Badge tone="success">Attendance finalized</Badge>
                ) : (
                  <FarmstandButton
                    size="compact"
                    disabled={!canManage || busy || !data.session}
                    onClick={() => setFinalize(true)}
                  >
                    <FarmstandIcon name="circle-check" />
                    Finalize attendance
                  </FarmstandButton>
                ))}
            </div>
          </div>
          <div className="markets-filters market-day-filters">
            <Field
              id={`${formId}-search`}
              label={<span className="sr-only">Search vendor attendance</span>}
            >
              <FarmstandSearch
                id={`${formId}-search`}
                placeholder="Search vendors or booths..."
                value={search}
                onChange={(e) => filter(() => setSearch(e.target.value))}
              />
            </Field>
            <Field
              id={`${formId}-status`}
              label={<span className="sr-only">Attendance</span>}
            >
              <FarmstandSelect
                id={`${formId}-status`}
                value={status}
                onChange={(e) => filter(() => setStatus(e.target.value))}
              >
                <option value="">All attendance</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {attendanceLabels[s]}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
            <Field
              id={`${formId}-payment`}
              label={<span className="sr-only">Payment</span>}
            >
              <FarmstandSelect
                id={`${formId}-payment`}
                value={payment}
                disabled={!vendorsKnown}
                onChange={(e) => filter(() => setPayment(e.target.value))}
              >
                <option value="">All payments</option>
                {payments.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
          </div>
          {error && (
            <Alert severity="error">
              The attendance change was not confirmed. Review the refreshed
              record and try again.
            </Alert>
          )}
          <ReadState
            loading={!data && read.loading}
            error={read.error}
            retry={read.refresh}
          />
          {data &&
            (shown.length ? (
              <>
                <FarmstandTable
                  label="Vendor attendance"
                  headings={['Vendor', 'Booth', 'Attendance', 'Payment', '']}
                  sort={{ heading: 'Vendor', direction: 'ascending' }}
                >
                  {shown.map((row) => {
                    const vendor = vendorFor(row, vendors);
                    return (
                      <tr
                        key={row.id}
                        tabIndex={0}
                        className={
                          row.id === current?.id
                            ? 'market-application-selected'
                            : undefined
                        }
                        onClick={() => onSelect(row.id)}
                        onKeyDown={(event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            onSelect(row.id);
                          }
                        }}
                      >
                        <th scope="row">
                          <div className="markets-identity">
                            <span className="markets-identity-icon">
                              <FarmstandIcon name="store" />
                            </span>
                            <span>
                              <span className="market-application-name">
                                {row.snapshot.businessName}
                              </span>
                              <small>
                                {row.expected
                                  ? row.snapshot.bookingStatus
                                  : 'No longer scheduled'}
                              </small>
                            </span>
                          </div>
                        </th>
                        <td>
                          {row.snapshot.booth ?? (
                            <span className="markets-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <AttendanceBadge
                            status={row.status}
                            source={row.checkInSource}
                          />
                        </td>
                        <td>
                          {vendorsKnown ? (
                            <PreparationStatus
                              value={paymentStatus(vendor?.invoices)}
                            />
                          ) : (
                            <span className="markets-muted">Unavailable</span>
                          )}
                        </td>
                        <td className="market-day-row-action">
                          {canCheckIn &&
                            row.expected &&
                            row.status === 'AWAITING' && (
                              <FarmstandButton
                                variant="secondary"
                                size="compact"
                                disabled={busy}
                                aria-label={`Check in ${row.snapshot.businessName}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void run({
                                    action: 'UPDATE',
                                    occurrenceId,
                                    id: row.id,
                                    expectedRevision: row.revision!,
                                    status: 'CHECKED_IN',
                                  });
                                }}
                              >
                                <FarmstandIcon name="circle-check" />
                                Check in
                              </FarmstandButton>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </FarmstandTable>
                <MarketsPagination
                  label="Vendor attendance pages"
                  summary={`${plural(visible.length, 'vendor')}. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, visible.length)}.`}
                  hasPrevious={page > 0}
                  hasNext={(page + 1) * PAGE_SIZE < visible.length}
                  onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                />
              </>
            ) : (
              <EmptyState
                title={
                  rows.length ? 'No matching vendors' : 'No expected vendors'
                }
              >
                <p>
                  {rows.length
                    ? 'Try another search or filter.'
                    : 'Vendors appear here once they are approved for this date.'}
                </p>
              </EmptyState>
            ))}
        </FarmstandPanel>
      </div>
      <DetailSheet
        title="Vendor details"
        open={detailOpen}
        onClose={onDetailClose}
      >
        <VendorPanel
          key={current ? `${current.id}:${current.revision}` : 'none'}
          row={current}
          vendor={current && vendorFor(current, vendors)}
          vendorsKnown={vendorsKnown}
          api={api}
          run={run}
          busy={busy || !canManage}
        />
      </DetailSheet>
      <MarketDialog
        open={finalize}
        onClose={() => {
          if (!busy) setFinalize(false);
        }}
        title="Finalize attendance"
      >
        <p>
          {data?.counts?.expected ?? 0} expected ·{' '}
          {data?.counts?.CHECKED_IN ?? 0} checked in ·{' '}
          {data?.counts?.EXCUSED ?? 0} excused · {data?.counts?.NO_SHOW ?? 0}{' '}
          no-shows.
        </p>
        {(data?.counts?.AWAITING ?? 0) > 0 ? (
          <p role="alert">
            Resolve {data?.counts?.AWAITING} awaiting arrival records explicitly
            before finalizing. No vendors will be automatically marked as
            no-shows.
          </p>
        ) : (
          <p>
            After finalization, changes require a correction reason and are kept
            in the audit history.
          </p>
        )}
        <div className="ui-actions ui-modal-actions">
          <FarmstandButton
            variant="secondary"
            disabled={busy}
            onClick={() => setFinalize(false)}
          >
            Keep reviewing
          </FarmstandButton>
          <FarmstandButton
            disabled={busy || (data?.counts?.AWAITING ?? 0) > 0}
            onClick={async () => {
              if (
                await run({
                  action: 'FINALIZE',
                  occurrenceId,
                  expectedRevision: data!.session!.revision,
                })
              )
                setFinalize(false);
            }}
          >
            Confirm finalization
          </FarmstandButton>
        </div>
      </MarketDialog>
    </div>
  );
}

/**
 * Selected vendor side panel: the Operations side-panel presentation with the
 * vendor's booth, participation, payment and equipment facts (formerly the
 * Vendor operations table) and the attendance update and correction form.
 */
function VendorPanel({
  row,
  vendor,
  vendorsKnown,
  api,
  run,
  busy,
}: {
  row?: AttendanceRow;
  vendor?: PreparationVendor;
  vendorsKnown: boolean;
  api: AttendanceApi;
  run: (c: AttendanceCommand) => Promise<boolean>;
  busy: boolean;
}) {
  const id = useId();
  const [note, setNote] = useState(row?.note ?? '');
  const [status, setStatus] = useState(row?.status);
  const [reason, setReason] = useState('');
  const [correction, setCorrection] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [history, setHistory] = useState(false);
  const finalized = !!row?.finalizedAt;
  const disabled =
    !row ||
    busy ||
    row.occurrenceStatus === 'cancelled' ||
    (!row.expected && !finalized) ||
    (finalized && !correction);
  const save = async () => {
    if (!row || !status) return;
    if (
      await run({
        action: correction ? 'CORRECT' : 'UPDATE',
        id: row.id,
        occurrenceId: row.occurrenceId,
        expectedRevision: row.revision!,
        status,
        note,
        reason,
      })
    )
      setConfirm(false);
  };
  const rentals = vendor?.rentals ?? [];
  return (
    <FarmstandPanel
      as="section"
      className="markets-next market-application-details market-date-details market-day-vendor"
      aria-label="Vendor details"
    >
      <h2>
        <FarmstandIcon name="store" />
        Vendor details
      </h2>
      {row && status ? (
        <div className="markets-next-content">
          <div className="occurrence-details-title">
            <h3>{row.snapshot.businessName}</h3>
            <AttendanceBadge status={row.status} source={row.checkInSource} />
          </div>
          <dl className="market-application-facts">
            <div>
              <dt>Booth</dt>
              <dd>{row.snapshot.booth ?? 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Participation</dt>
              <dd>
                {vendor ? (
                  <PreparationStatus value={vendor.participation} />
                ) : row.expected ? (
                  row.snapshot.bookingStatus
                ) : (
                  'No longer scheduled'
                )}
              </dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                {vendorsKnown ? (
                  <PreparationStatus value={paymentStatus(vendor?.invoices)} />
                ) : (
                  'Unavailable'
                )}
              </dd>
            </div>
            {vendor && (
              <div>
                <dt>Readiness</dt>
                <dd>
                  <PreparationStatus value={vendor.readiness} />
                </dd>
              </div>
            )}
            <div>
              <dt>Equipment</dt>
              <dd>
                {vendor ? (
                  <EquipmentSummary
                    compact
                    items={rentals.map(rentalItem)}
                    title={`${row.snapshot.businessName} equipment`}
                  />
                ) : (
                  'Unavailable'
                )}
              </dd>
            </div>
            {row.checkedInAt && (
              <div>
                <dt>Checked in</dt>
                <dd>
                  {time(row.checkedInAt, row.snapshot.timezone)}
                  {row.checkedInBy
                    ? ` · ${row.checkInSource === 'vendor' ? 'self check-in' : `account ${row.checkedInBy}`}`
                    : ''}
                </dd>
              </div>
            )}
          </dl>
          {finalized && !correction && (
            <FarmstandButton
              variant="secondary"
              disabled={busy}
              onClick={() => setCorrection(true)}
            >
              Correct finalized record
            </FarmstandButton>
          )}
          <form
            className="market-day-attendance-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                correction ||
                (status !== row.status && status !== 'CHECKED_IN')
              )
                setConfirm(true);
              else void save();
            }}
          >
            <fieldset disabled={disabled}>
              <legend className="sr-only">Update attendance</legend>
              <Field id={`${id}-status`} label="Attendance status">
                <FarmstandSelect
                  id={`${id}-status`}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as AttendanceStatus)
                  }
                >
                  {statuses
                    .filter((s) => !finalized || s !== 'AWAITING')
                    .map((s) => (
                      <option key={s} value={s}>
                        {attendanceLabels[s]}
                      </option>
                    ))}
                </FarmstandSelect>
              </Field>
              <Field id={`${id}-note`} label="Private manager note">
                <Textarea
                  id={`${id}-note`}
                  value={note}
                  rows={3}
                  maxLength={5000}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              {correction && (
                <Field id={`${id}-reason`} label="Correction reason">
                  <Textarea
                    required
                    id={`${id}-reason`}
                    value={reason}
                    rows={3}
                    maxLength={2000}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
              )}
              <FarmstandButton
                type="submit"
                disabled={correction && !reason.trim()}
              >
                Save attendance
              </FarmstandButton>
            </fieldset>
          </form>
          <FarmstandButton variant="secondary" onClick={() => setHistory(true)}>
            <FarmstandIcon name="clock" />
            View vendor history
          </FarmstandButton>
          {!!row.audit?.length && (
            <ul className="market-day-audit" aria-label="Attendance changes">
              {row.audit.map((a) => (
                <li key={a.id}>
                  <strong>
                    {attendanceLabels[a.detail.before.status]} to{' '}
                    {attendanceLabels[a.detail.after.status]}
                  </strong>
                  <small>
                    {time(a.createdAt, row.snapshot.timezone)} · Account{' '}
                    {a.actorId}
                    {a.detail.reason ? ` · ${a.detail.reason}` : ''}
                  </small>
                  {a.detail.before.note !== a.detail.after.note && (
                    <small>
                      Note changed from “{a.detail.before.note || 'Empty'}” to “
                      {a.detail.after.note || 'Empty'}”.
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
          <MarketDialog
            open={confirm}
            onClose={() => {
              if (!busy) setConfirm(false);
            }}
            title={
              correction
                ? 'Confirm attendance correction'
                : 'Confirm attendance change'
            }
          >
            <p>
              {row.snapshot.businessName}: {attendanceLabels[row.status]} to{' '}
              {attendanceLabels[status]}.
            </p>
            {reason && <p>{reason}</p>}
            <div className="ui-actions ui-modal-actions">
              <FarmstandButton
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Keep editing
              </FarmstandButton>
              <FarmstandButton disabled={busy} onClick={() => void save()}>
                Confirm change
              </FarmstandButton>
            </div>
          </MarketDialog>
          {history && (
            <MarketDialog
              open
              onClose={() => setHistory(false)}
              title={`${row.snapshot.businessName} attendance history`}
            >
              <AttendanceHistory
                api={api}
                vendorId={row.vendorId ?? undefined}
                directoryId={
                  row.vendorId ? undefined : (row.directoryId ?? undefined)
                }
              />
            </MarketDialog>
          )}
        </div>
      ) : (
        <EmptyState title="No vendor selected">
          <p>Select a vendor or booth to review attendance and payment.</p>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}
