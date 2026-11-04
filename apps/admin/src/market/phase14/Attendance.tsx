import './attendance.css';
import {
  useCallback,
  useId,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react';
import type {
  AttendanceApi,
  AttendanceCommand,
  AttendanceFilter,
  AttendancePage,
  AttendanceRow,
  AttendanceStatus,
} from '@market/api';
import { safeError } from '@market/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  IconButton,
  Pagination,
  SelectField,
  Spinner,
  Textarea,
  Table,
} from '@market/ui';
import { useRead } from '../../vendor/common';

import { MarketDialog, date } from '../presentation';

export const attendanceLabels: Record<AttendanceStatus, string> = {
  AWAITING: 'Awaiting arrival',
  CHECKED_IN: 'Checked In',
  EXCUSED: 'Excused absence',
  NO_SHOW: 'No-show',
};
const statuses = Object.keys(attendanceLabels) as AttendanceStatus[];
export function AttendanceBadge({
  status,
  source,
}: {
  status: AttendanceStatus;
  source?: AttendanceRow['checkInSource'];
}) {
  return (
    <Badge
      tone={
        status === 'CHECKED_IN'
          ? 'success'
          : status === 'NO_SHOW'
            ? 'danger'
            : status === 'AWAITING'
              ? 'warning'
              : 'neutral'
      }
    >
      {status === 'CHECKED_IN' && source === 'vendor'
        ? 'Self Check-In'
        : attendanceLabels[status]}
    </Badge>
  );
}
export function AppearanceFacts({ row }: { row: AttendanceRow }) {
  return (
    <>
      <p>{row.snapshot.marketName}</p>
      <p>
        {date(row.snapshot.startsAt, row.snapshot.timezone)} to{' '}
        {date(row.snapshot.endsAt, row.snapshot.timezone)} (
        {row.snapshot.timezone})
      </p>
      <p>
        {row.snapshot.venue}
        {row.snapshot.booth ? ` · Booth ${row.snapshot.booth}` : ''}
      </p>
      <p>
        {row.occurrenceStatus === 'cancelled'
          ? 'Market cancelled'
          : row.expected
            ? row.snapshot.bookingStatus
            : 'No longer scheduled'}{' '}
        · <AttendanceBadge status={row.status} source={row.checkInSource} />
      </p>
      {row.checkedInAt && (
        <p>Checked in {date(row.checkedInAt, row.snapshot.timezone)}</p>
      )}
      {row.finalizedAt && (
        <p>
          Attendance finalized {date(row.finalizedAt, row.snapshot.timezone)}
        </p>
      )}
    </>
  );
}
export function Attendance({
  api,
  occurrenceId,
}: {
  api: AttendanceApi;
  occurrenceId: number;
}) {
  const [status, setStatus] = useState(''),
    [skip, setSkip] = useState(0),
    [selected, select] = useState<number | null>(null),
    [panelClosing, setPanelClosing] = useState(false);
  useEffect(() => {
    if (!panelClosing) return;
    const timer = setTimeout(() => {
      select(null);
      setPanelClosing(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [panelClosing]);
  const load = useCallback(
    () => api.read({ occurrenceId, status, skip }),
    [api, occurrenceId, status, skip],
  );
  const read = useRead(
    `attendance:${occurrenceId}:${status}:${skip}`,
    load,
    true,
    { retainPreviousData: true },
  );
  const [error, setError] = useState<ReturnType<typeof safeError> | null>(null),
    [busy, setBusy] = useState(false),
    [finalize, setFinalize] = useState(false);
  async function run(command: AttendanceCommand) {
    setBusy(true);
    setError(null);
    try {
      await api.command(command);
      read.refresh();
      return true;
    } catch (e) {
      setError(safeError(e));
      read.refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }
  const data: AttendancePage = read.data ?? {
      items: [],
      totalItems: 0,
      counts: null,
      session: null,
      occurrence: null,
      serverNow: '',
    },
    row = data?.items.find((r) => r.id === selected);
  return (
    <section
      className="attendance-workspace"
      aria-label="Market attendance"
      aria-busy={busy}
    >
      {error && <ErrorState error={error} />}
      {read.error && <ErrorState error={read.error} />}
      {data && (
        <>
          <dl className="ui-kpi-grid">
            {[
              ['expected', 'Expected vendors'],
              ['CHECKED_IN', 'Checked in'],
              ['AWAITING', 'Awaiting arrival'],
              ['EXCUSED', 'Excused absences'],
              ['NO_SHOW', 'No-shows'],
            ].map(([key, label]) => (
              <Card as="div" key={key}>
                <dt>{label}</dt>
                <dd>{data.counts?.[key!] ?? 0}</dd>
              </Card>
            ))}
          </dl>
          <div className="ui-actions">
            {data.session?.finalizedAt ? (
              <Badge tone="success">Attendance finalized</Badge>
            ) : (
              <>
                <Button
                  disabled={busy || !data.session}
                  onClick={() => setFinalize(true)}
                >
                  Finalize attendance
                </Button>
              </>
            )}
          </div>
          <AttendanceFilters status={status}>
            {[
              ['', 'All'],
              ...statuses.map((s) => [s, attendanceLabels[s]]),
            ].map(([s, label]) => (
              <Button
                key={s}
                variant="tertiary"
                size="compact"
                aria-pressed={status === s}
                onClick={() => {
                  setStatus(s!);
                  setSkip(0);
                  select(null);
                }}
              >
                {label}
              </Button>
            ))}
          </AttendanceFilters>
          <div
            className={`attendance-columns ${row && !panelClosing ? 'has-selection' : ''}`}
          >
            <div>
              <AttendanceTable
                loading={read.loading}
                rows={data.items}
                onSelect={(r) => {
                  setPanelClosing(false);
                  select(r.id);
                }}
                onCheckIn={
                  !data.session?.finalizedAt &&
                  data.occurrence?.status === 'scheduled'
                    ? (r) =>
                        void run({
                          action: 'UPDATE',
                          occurrenceId,
                          id: r.id,
                          expectedRevision: r.revision!,
                          status: 'CHECKED_IN',
                        })
                    : undefined
                }
                busy={busy}
              />
              <Pagination
                hasPrevious={skip > 0}
                hasNext={skip + 50 < data.totalItems}
                onPrevious={() => setSkip(Math.max(0, skip - 50))}
                onNext={() => setSkip(skip + 50)}
              />
            </div>
            {row && (
              <div
                key={row.id}
                className={`attendance-detail-shell ${panelClosing ? 'is-closing' : ''}`}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget && panelClosing) {
                    select(null);
                    setPanelClosing(false);
                  }
                }}
              >
                <AttendanceDetail
                  key={`${row.id}:${row.revision}`}
                  row={row}
                  busy={busy}
                  run={run}
                  close={() => {
                    if (
                      window.matchMedia?.('(prefers-reduced-motion: reduce)')
                        .matches
                    ) {
                      select(null);
                      setPanelClosing(false);
                    } else setPanelClosing(true);
                  }}
                  api={api}
                />
              </div>
            )}
          </div>
          <MarketDialog
            open={finalize}
            onClose={() => {
              if (!busy) setFinalize(false);
            }}
            title="Finalize attendance"
          >
            <p>
              {data.counts?.expected ?? 0} expected ·{' '}
              {data.counts?.CHECKED_IN ?? 0} checked in ·{' '}
              {data.counts?.EXCUSED ?? 0} excused · {data.counts?.NO_SHOW ?? 0}{' '}
              no-shows.
            </p>
            {(data.counts?.AWAITING ?? 0) > 0 ? (
              <p role="alert">
                Resolve {data.counts?.AWAITING} awaiting arrival records
                explicitly before finalizing. No vendors will be automatically
                marked as no-shows.
              </p>
            ) : (
              <p>
                After finalization, changes require a correction reason and are
                kept in the audit history.
              </p>
            )}
            <div className="ui-actions ui-modal-actions">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setFinalize(false)}
              >
                Keep reviewing
              </Button>
              <Button
                disabled={busy || (data.counts?.AWAITING ?? 0) > 0}
                onClick={async () => {
                  if (
                    await run({
                      action: 'FINALIZE',
                      occurrenceId,
                      expectedRevision: data.session!.revision,
                    })
                  )
                    setFinalize(false);
                }}
              >
                Confirm finalization
              </Button>
            </div>
          </MarketDialog>
        </>
      )}
    </section>
  );
}
function AttendanceTable({
  rows,
  loading,
  onSelect,
  onCheckIn,
  busy,
}: {
  rows: AttendanceRow[];
  loading?: boolean;
  onSelect: (row: AttendanceRow) => void;
  onCheckIn?: (row: AttendanceRow) => void;
  busy?: boolean;
}) {
  const [sort, setSort] = useState<{
    key: 'businessName' | 'booth';
    descending: boolean;
  }>({ key: 'businessName', descending: false });
  const sorted = [...rows].sort(
    (a, b) =>
      (a.snapshot[sort.key] ?? '').localeCompare(
        b.snapshot[sort.key] ?? '',
        undefined,
        { numeric: true, sensitivity: 'base' },
      ) * (sort.descending ? -1 : 1),
  );
  return (
    <Table aria-label="Vendor attendance" className="attendance-table">
      <thead>
        <tr>
          {(['businessName', 'booth'] as const).map((key) => (
            <th
              key={key}
              aria-sort={
                sort.key === key
                  ? sort.descending
                    ? 'descending'
                    : 'ascending'
                  : 'none'
              }
            >
              <Button
                type="button"
                variant="tertiary"
                className="attendance-sort"
                aria-pressed={sort.key === key}
                onClick={() =>
                  setSort({
                    key,
                    descending: sort.key === key ? !sort.descending : false,
                  })
                }
              >
                {key === 'businessName' ? 'Vendor' : 'Booth'}
                {sort.key === key && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d={
                        sort.descending
                          ? 'M8 13V3m-4 4 4-4 4 4'
                          : 'M8 3v10m-4-4 4 4 4-4'
                      }
                    />
                  </svg>
                )}
              </Button>
            </th>
          ))}
          <th>Attendance</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody
        key={
          loading
            ? 'loading'
            : rows.map((r) => `${r.id}:${r.revision}`).join(':')
        }
        className={loading ? 'attendance-loading' : 'attendance-reveal'}
      >
        {loading ? (
          <tr>
            <td colSpan={4} className="attendance-table-message">
              <Spinner label="Loading" />
            </td>
          </tr>
        ) : !rows.length ? (
          <tr>
            <td colSpan={4} className="attendance-table-message">
              No attendance records match this view.
            </td>
          </tr>
        ) : (
          sorted.map((r) => (
            <tr
              key={r.id}
              onPointerUp={(event) => {
                if (
                  (event.button != null && event.button !== 0) ||
                  (event.target as HTMLElement).closest(
                    'button, a, input, select, textarea',
                  )
                )
                  return;
                onSelect(r);
              }}
            >
              <td>
                <Button variant="tertiary" onClick={() => onSelect(r)}>
                  {r.snapshot.businessName}
                </Button>
                {!r.expected && <p>No longer scheduled</p>}
              </td>
              <td>{r.snapshot.booth ?? 'Unassigned'}</td>
              <td>
                <AttendanceBadge status={r.status} source={r.checkInSource} />
              </td>
              <td>
                {onCheckIn && r.expected && r.status === 'AWAITING' && (
                  <Button
                    className="attendance-check-in"
                    style={
                      {
                        '--button-hover-transform': 'none',
                      } as import('react').CSSProperties
                    }
                    disabled={busy}
                    onClick={() => onCheckIn(r)}
                  >
                    Check in
                  </Button>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}
function AttendanceDetail({
  row,
  run,
  busy,
  close,
  api,
}: {
  row: AttendanceRow;
  run: (c: AttendanceCommand) => Promise<boolean>;
  busy: boolean;
  close: () => void;
  api: AttendanceApi;
}) {
  const id = useId(),
    [note, setNote] = useState(row.note ?? ''),
    [status, setStatus] = useState(row.status),
    [reason, setReason] = useState(''),
    [correction, setCorrection] = useState(false),
    [confirm, setConfirm] = useState(false),
    [history, setHistory] = useState(false);
  const finalized = !!row.finalizedAt,
    disabled =
      busy ||
      row.occurrenceStatus === 'cancelled' ||
      (!row.expected && !finalized) ||
      (finalized && !correction);
  const save = async () => {
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
  return (
    <Card
      as="section"
      className="attendance-inspector"
      aria-label={`Attendance for ${row.snapshot.businessName}`}
    >
      <div className="ui-actions">
        <h2>{row.snapshot.businessName}</h2>
        <IconButton
          icon="close"
          label="Close details"
          variant="secondary"
          disabled={busy}
          onClick={close}
        />
      </div>
      <AppearanceFacts row={row} />
      {row.checkedInBy && (
        <p>
          {row.checkInSource === 'vendor' ? 'Self Check-In' : 'Checked In'} by
          account {row.checkedInBy}
        </p>
      )}
      {finalized && !correction && (
        <Button variant="secondary" onClick={() => setCorrection(true)}>
          Correct finalized record
        </Button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (correction || (status !== row.status && status !== 'CHECKED_IN'))
            setConfirm(true);
          else void save();
        }}
      >
        <fieldset disabled={disabled}>
          <legend className="sr-only">Update attendance</legend>
          <SelectField
            label="Attendance status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
          >
            {statuses
              .filter((s) => !finalized || s !== 'AWAITING')
              .map((s) => (
                <option key={s} value={s}>
                  {attendanceLabels[s]}
                </option>
              ))}
          </SelectField>
          <Field id={`${id}-note`} label="Private manager note">
            <Textarea
              id={`${id}-note`}
              value={note}
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
                maxLength={2000}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}
          <Button type="submit" disabled={correction && !reason.trim()}>
            Save attendance
          </Button>
        </fieldset>
      </form>
      <Button
        variant="secondary"
        onClick={() => setHistory(!history)}
        aria-expanded={history}
      >
        {history ? 'Hide vendor history' : 'View vendor history'}
      </Button>
      {history && (
        <AttendanceHistory
          api={api}
          vendorId={row.vendorId ?? undefined}
          directoryId={
            row.vendorId ? undefined : (row.directoryId ?? undefined)
          }
        />
      )}
      {row.audit?.map((a) => (
        <div key={a.id}>
          <p>
            {date(a.createdAt, row.snapshot.timezone)} · Account {a.actorId}
          </p>
          <p>
            {attendanceLabels[a.detail.before.status]} to{' '}
            {attendanceLabels[a.detail.after.status]}
            {a.detail.reason ? ` · ${a.detail.reason}` : ''}
          </p>
          {a.detail.before.note !== a.detail.after.note && (
            <p>
              Note changed from “{a.detail.before.note || 'Empty'}” to “
              {a.detail.after.note || 'Empty'}”.
            </p>
          )}
        </div>
      ))}
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
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Keep editing
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            Confirm change
          </Button>
        </div>
      </MarketDialog>
    </Card>
  );
}
export function attendanceCsv(rows: AttendanceRow[]) {
  const cell = (v: unknown) =>
    `"${String(v ?? '')
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  return [
    [
      'Vendor',
      'Market',
      'Start',
      'End',
      'Time zone',
      'Location',
      'Booth',
      'Booking',
      'Attendance',
      'Checked in',
      'Check-in source',
      'Private note',
      'Finalized at',
      'Corrections',
    ],
    ...rows.map((r) => [
      r.snapshot.businessName,
      r.snapshot.marketName,
      r.snapshot.startsAt,
      r.snapshot.endsAt,
      r.snapshot.timezone,
      r.snapshot.venue,
      r.snapshot.booth,
      r.expected ? r.snapshot.bookingStatus : 'No longer scheduled',
      attendanceLabels[r.status],
      r.checkedInAt,
      r.checkInSource,
      r.note,
      r.finalizedAt,
      r.audit
        ?.filter((a) => a.action === 'ATTENDANCE_CORRECT')
        .map(
          (a) =>
            `${a.createdAt}: ${attendanceLabels[a.detail.before.status]} to ${attendanceLabels[a.detail.after.status]} (${a.detail.reason})`,
        )
        .join('; '),
    ]),
  ]
    .map((r) => r.map(cell).join(','))
    .join('\r\n');
}
export function AttendanceHistory({
  api,
  vendorId,
  directoryId,
  vendor = false,
  initialFrom = '',
  renderVendorExtra,
}: {
  api: AttendanceApi;
  vendorId?: number;
  directoryId?: number;
  vendor?: boolean;
  initialFrom?: string;
  renderVendorExtra?: (row: AttendanceRow) => import('react').ReactNode;
}) {
  const id = useId(),
    [from, setFrom] = useState(initialFrom),
    [through, setThrough] = useState(''),
    [status, setStatus] = useState(''),
    [skip, setSkip] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof safeError> | null>(null),
    [selected, select] = useState<AttendanceRow | null>(null),
    [success, setSuccess] = useState<number | null>(null);
  const filter: AttendanceFilter = {
    vendorId,
    directoryId,
    from,
    through,
    status,
    skip,
  };
  const load = useCallback(
    () =>
      (vendor ? api.vendor : api.read)({
        vendorId,
        directoryId,
        from,
        through,
        status,
        skip,
      }),
    [api, vendor, vendorId, directoryId, from, through, status, skip],
  );
  const read = useRead(
    `attendance-history:${vendorId}:${directoryId}:${from}:${through}:${status}:${skip}`,
    load,
  );
  const refreshAppearances = read.refresh,
    appearances = read.data;
  useEffect(() => {
    if (!vendor) return;
    const refresh = () => refreshAppearances();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    const now = Date.parse(appearances?.serverNow ?? '');
    const boundaries =
      appearances?.items
        .flatMap((r) => [
          Date.parse(r.snapshot.startsAt),
          Date.parse(r.snapshot.endsAt),
        ])
        .filter((t) => t > now) ?? [];
    const delay = Math.min(...boundaries) - now;
    const boundary =
      Number.isFinite(delay) && delay < 2147483647
        ? setTimeout(refresh, delay + 10)
        : undefined;
    return () => {
      clearInterval(interval);
      clearTimeout(boundary);
      window.removeEventListener('focus', refresh);
    };
  }, [vendor, appearances, refreshAppearances]);
  async function exportCsv() {
    setBusy(true);
    setError(null);
    try {
      const rows: AttendanceRow[] = [];
      let page: AttendancePage;
      do {
        page = await api.read({ ...filter, skip: rows.length, take: 200 });
        rows.push(...page.items);
      } while (rows.length < page.totalItems && page.items.length);
      const url = URL.createObjectURL(
        new Blob([attendanceCsv(rows)], { type: 'text/csv;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'market-attendance.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(safeError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="attendance-workspace"
      aria-label={
        vendor ? 'Your market appearances' : 'Vendor attendance history'
      }
    >
      <div className="attendance-filters">
        <Field id={`${id}-from`} label="From date">
          <Input
            id={`${id}-from`}
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setSkip(0);
            }}
          />
        </Field>
        <Field id={`${id}-through`} label="Through date">
          <Input
            id={`${id}-through`}
            type="date"
            value={through}
            min={from}
            onChange={(e) => {
              setThrough(e.target.value);
              setSkip(0);
            }}
          />
        </Field>
        <SelectField
          label="Attendance"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSkip(0);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {attendanceLabels[s]}
            </option>
          ))}
        </SelectField>
        {!vendor && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void exportCsv()}
          >
            Export CSV
          </Button>
        )}
      </div>
      {error && <ErrorState error={error} />}
      {read.loading && <Spinner label="Loading market appearances" />}
      {read.error && <ErrorState error={read.error} />}
      {read.data && (
        <>
          {!read.data.items.length && (
            <EmptyState title="No scheduled appearances or history in this view" />
          )}
          {read.data.items.map((r) => (
            <Card as="article" key={r.id} className="attendance-appearance">
              <AppearanceFacts row={r} />
              {vendor && renderVendorExtra?.(r)}
              {vendor && success === r.id && (
                <p role="status">You are checked in.</p>
              )}
              {vendor && r.canSelfCheckIn && r.status === 'AWAITING' && (
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await api.selfCheckIn(r.occurrenceId, r.revision!);
                      setSuccess(r.id);
                      read.refresh();
                    } catch (e) {
                      setError(safeError(e));
                      read.refresh();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Check In
                </Button>
              )}
              {!vendor && (
                <Button variant="secondary" onClick={() => select(r)}>
                  View notes and corrections
                </Button>
              )}
            </Card>
          ))}
          <Pagination
            hasPrevious={skip > 0}
            hasNext={skip + 50 < read.data.totalItems}
            onPrevious={() => setSkip(Math.max(0, skip - 50))}
            onNext={() => setSkip(skip + 50)}
          />
        </>
      )}
      {!vendor && selected && (
        <MarketDialog
          open
          onClose={() => select(null)}
          title={selected.snapshot.businessName}
        >
          <AppearanceFacts row={selected} />
          <p>{selected.note || 'No private note'}</p>
          {selected.audit?.map((a) => (
            <p key={a.id}>
              {date(a.createdAt, selected.snapshot.timezone)} · Account{' '}
              {a.actorId} · {attendanceLabels[a.detail.before.status]} to{' '}
              {attendanceLabels[a.detail.after.status]} ·{' '}
              {a.detail.reason || 'Status or note update'} · Previous note:{' '}
              {a.detail.before.note || 'Empty'} · Updated note:{' '}
              {a.detail.after.note || 'Empty'}
            </p>
          ))}
        </MarketDialog>
      )}
    </section>
  );
}

function AttendanceFilters({
  status,
  children,
}: {
  status: string;
  children: import('react').ReactNode;
}) {
  const group = useRef<HTMLDivElement>(null),
    backdrop = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const b = group.current?.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"]',
      );
      if (b && backdrop.current) {
        backdrop.current.style.visibility = 'visible';
        backdrop.current.style.transform = `translateX(${b.offsetLeft}px)`;
        backdrop.current.style.width = `${b.offsetWidth}px`;
        backdrop.current.style.height = `${b.offsetHeight}px`;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (group.current) {
      observer.observe(group.current);
      for (const button of group.current.querySelectorAll('button'))
        observer.observe(button);
    }
    return () => observer.disconnect();
  }, [status]);
  return (
    <div
      ref={group}
      className="application-quick-views"
      role="group"
      aria-label="Attendance filters"
    >
      <span
        ref={backdrop}
        className="application-quick-backdrop"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
