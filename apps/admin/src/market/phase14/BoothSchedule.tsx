import './booth-schedule.css';
import { useCallback, useEffect, useState } from 'react';
import type {
  BoothRecurringRule,
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
  ScheduleCell,
  SchedulePreview,
} from '@market/api';
import { safeError } from '@market/api';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  SelectField,
  Spinner,
  Table,
  Textarea,
} from '@market/ui';
import { MarketDialog, date } from '../presentation';
import { Control } from './common';
import { RouteLink } from '../../vendor/common';

const day = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: string, amount: number) =>
  day(new Date(Date.parse(d) + amount * 86400000));
const currentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const scheduleDateLabel = (occurrence: {
  startsAt: string;
  scheduleDate?: string;
}) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(
    new Date(
      `${occurrence.scheduleDate ?? occurrence.startsAt.slice(0, 10)}T12:00:00Z`,
    ),
  );
const statusLabel = (s: string) => s.toLowerCase().replaceAll('_', ' ');

export function BoothSchedule({
  api,
  canManage,
  canBill,
}: {
  api: MarketOperationsApi;
  canManage: boolean;
  canBill: boolean;
}) {
  const [today] = useState(currentDate);
  const latestDate = shift(today, 60);
  const [from, setFrom] = useState(today);
  const [through, setThrough] = useState(() => shift(today, 30));
  const [dateWindow, setDateWindow] = useState('30');
  const [revision, refresh] = useState(0);
  const [data, setData] = useState<MarketOperationsData>();
  const [error, setError] = useState<ReturnType<typeof safeError>>();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScheduleCell>();
  const [mobileDate, setMobileDate] = useState(0);
  const [filter, setFilter] = useState('');
  const validRange = Boolean(
    from &&
    through &&
    from >= today &&
    through >= from &&
    through <= latestDate,
  );
  useEffect(() => {
    let current = true;
    setLoading(true);
    setData(undefined);
    setError(undefined);
    setSelected(undefined);
    if (!validRange) {
      setLoading(false);
      return;
    }
    api
      .read('SCHEDULE', undefined, { mode: 'SCHEDULE', from, through })
      .then((d) => {
        if (current) setData(d);
      })
      .catch((e) => {
        if (current) setError(safeError(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, from, through, revision, validRange]);
  const updated = useCallback(() => refresh((n) => n + 1), []);
  const occurrences = data?.occurrences ?? [];
  const booths = (data?.physicalBooths ?? []).filter(
    (b) =>
      !filter ||
      b.name.toLowerCase().includes(filter.toLowerCase()) ||
      data?.cells?.some(
        (c) =>
          c.physicalBoothId === b.id &&
          (c.label.toLowerCase().includes(filter.toLowerCase()) ||
            data.assignments
              ?.find((a) => a.id === c.assignmentId)
              ?.businessSnapshot.businessName.toLowerCase()
              .includes(filter.toLowerCase())),
      ),
  );
  const activeDate = occurrences.some((o) => o.id === mobileDate)
    ? mobileDate
    : occurrences[0]?.id;
  function cellContent(cell: ScheduleCell) {
    const assignment = data?.assignments?.find(
      (a) => a.id === cell.assignmentId,
    );
    return (
      <Button
        variant="tertiary"
        type="button"
        className="schedule-cell"
        onClick={() => setSelected(cell)}
        aria-label={`${cell.label}, ${scheduleDateLabel(occurrences.find((o) => o.id === cell.occurrenceId)!)}, ${assignment?.businessSnapshot.businessName ?? cell.reason ?? 'Available'}`}
      >
        <span>
          {assignment?.businessSnapshot.businessName ??
            (cell.status === 'AVAILABLE' ? 'Available' : 'Unavailable')}
        </span>
        <small>
          {assignment?.recurringRuleId
            ? 'Recurring'
            : assignment
              ? 'One date'
              : cell.reason}
        </small>
      </Button>
    );
  }
  return (
    <Card as="section" className="booth-schedule" aria-label="Booth schedule">
      <div className="ui-control-row schedule-date-controls">
        <SelectField
          label="Date window"
          value={dateWindow}
          onChange={(e) => {
            const value = e.target.value;
            setDateWindow(value);
            if (value !== 'custom') {
              setFrom(today);
              setThrough(shift(today, Number(value)));
            }
          }}
        >
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="custom">Custom dates</option>
        </SelectField>
        {dateWindow === 'custom' && (
          <>
            <Control label="From date">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  min={today}
                  max={through && through < latestDate ? through : latestDate}
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setDateWindow('custom');
                  }}
                />
              )}
            </Control>
            <Control label="To date">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  min={from || today}
                  max={latestDate}
                  value={through}
                  onChange={(e) => {
                    setThrough(e.target.value);
                    setDateWindow('custom');
                  }}
                />
              )}
            </Control>
          </>
        )}
      </div>
      {!validRange && (
        <p role="alert">
          Choose a From date and To date between today and 60 days from today,
          with the To date on or after the From date.
        </p>
      )}
      <Control label="Find booth or vendor">
        {(id) => (
          <Input
            id={id}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        )}
      </Control>
      {error && <ErrorState error={error} />}
      {loading ? (
        <Spinner label="Loading booth schedule" />
      ) : (
        data && (
          <>
            {!occurrences.length || !booths.length ? (
              <EmptyState title="No booths in this date range">
                Select layouts for these market dates, adjust the dates, or
                clear your search.
              </EmptyState>
            ) : (
              <>
                <div className="schedule-desktop">
                  <Table>
                    <caption className="sr-only">Booths by market date</caption>
                    <thead>
                      <tr>
                        <th scope="col">Booth</th>
                        {occurrences.map((o) => (
                          <th scope="col" key={o.id}>
                            {scheduleDateLabel(o)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {booths.map((b) => (
                        <tr key={b.id}>
                          <th scope="row">{b.name}</th>
                          {occurrences.map((o) => {
                            const c = data.cells?.find(
                              (c) =>
                                c.physicalBoothId === b.id &&
                                c.occurrenceId === o.id,
                            );
                            return (
                              <td key={o.id} data-state={c?.status}>
                                {c && cellContent(c)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <div className="schedule-mobile">
                  <SelectField
                    label="Schedule date"
                    value={activeDate}
                    onChange={(e) => setMobileDate(Number(e.target.value))}
                  >
                    {occurrences.map((o) => (
                      <option key={o.id} value={o.id}>
                        {scheduleDateLabel(o)}
                      </option>
                    ))}
                  </SelectField>
                  <ul>
                    {booths.map((b) => {
                      const c = data.cells?.find(
                        (c) =>
                          c.physicalBoothId === b.id &&
                          c.occurrenceId === activeDate,
                      );
                      return (
                        <li key={b.id}>
                          <strong>{c?.label ?? b.name}</strong>
                          {c && cellContent(c)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
            {data.ruleResults?.some(
              (r) => !['ASSIGNED', 'EXCEPTION', 'ENDED'].includes(r.status),
            ) && (
              <details className="market-disclosure">
                <summary>Recurring assignment conflicts</summary>
                <ul>
                  {data.ruleResults
                    .filter(
                      (r) =>
                        !['ASSIGNED', 'EXCEPTION', 'ENDED'].includes(r.status),
                    )
                    .map((r) => (
                      <li key={`${r.ruleId}:${r.occurrenceId}`}>
                        {date(
                          occurrences.find((o) => o.id === r.occurrenceId)!
                            .startsAt,
                        )}
                        : {statusLabel(r.status)}
                      </li>
                    ))}
                </ul>
              </details>
            )}
            {selected && (
              <ScheduleDetails
                key={`${selected.physicalBoothId}:${selected.occurrenceId}`}
                cell={selected}
                data={data}
                api={api}
                canManage={canManage}
                canBill={canBill}
                onClose={() => setSelected(undefined)}
                onSaved={updated}
              />
            )}
          </>
        )
      )}
    </Card>
  );
}

function ScheduleDetails({
  cell,
  data,
  api,
  canManage,
  canBill,
  onClose,
  onSaved,
}: {
  cell: ScheduleCell;
  data: MarketOperationsData;
  api: MarketOperationsApi;
  canManage: boolean;
  canBill: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const assignment = data.assignments?.find((a) => a.id === cell.assignmentId);
  const occurrence = data.occurrences.find((o) => o.id === cell.occurrenceId)!;
  const existingRule = data.rules?.find(
    (r) => r.id === assignment?.recurringRuleId,
  );
  const [vendor, setVendor] = useState(String(assignment?.directoryId ?? ''));
  const [mode, setMode] = useState('date');
  const [sourceId, setSourceId] = useState(0);
  const [ruleId, setRuleId] = useState(existingRule?.id ?? 0);
  const rule = data.rules?.find((r) => r.id === ruleId);
  const [fromDate, setFromDate] = useState(
    existingRule?.fromDate ??
      occurrence.scheduleDate ??
      occurrence.startsAt.slice(0, 10),
  );
  const [throughDate, setThroughDate] = useState(
    existingRule?.throughDate ??
      occurrence.scheduleDate ??
      occurrence.startsAt.slice(0, 10),
  );
  const [preview, setPreview] = useState<SchedulePreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof safeError>>();
  const [voidDraft, setVoidDraft] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState<
    'assignment' | 'cancel' | null
  >(null);
  const [impact, setImpact] = useState<{
    assignments: number;
    previewToken: string;
  }>();
  const eligible =
    data.approvals?.filter(
      (a) => a.occurrenceId === cell.occurrenceId && a.decision === 'CONFIRMED',
    ) ?? [];
  const billing =
    data.billingRestrictions?.filter(
      (b) => b.assignmentId === assignment?.id,
    ) ?? [];
  const available = !cell.reason && canManage;
  const recurringData = {
    directoryId: Number(vendor),
    physicalBoothId: cell.physicalBoothId,
    fromDate,
    throughDate,
    voidDraftInvoices: voidDraft,
  };
  async function run(command: OperationsCommand, saved = false) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.command(command);
      if (saved) {
        onClose();
        onSaved();
      }
      return result;
    } catch (e) {
      setError(safeError(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  function chooseRule(r: BoothRecurringRule | undefined) {
    setRuleId(r?.id ?? 0);
    if (r) {
      setVendor(String(r.directoryId));
      setFromDate(r.fromDate);
      setThroughDate(r.throughDate);
    }
    setPreview(undefined);
  }
  const vendorAssignments =
    data.assignments?.filter(
      (a) =>
        a.occurrenceId === cell.occurrenceId &&
        a.directoryId === Number(vendor),
    ) ?? [];
  const movingAssignment =
    assignment ??
    (vendorAssignments.length > 1
      ? vendorAssignments.find((a) => a.id === sourceId)
      : vendorAssignments[0]);
  const needsSource =
    !assignment && vendorAssignments.length > 1 && !movingAssignment;
  const approval = data.approvals?.find(
    (a) =>
      a.occurrenceId === cell.occurrenceId &&
      a.directoryId === assignment?.directoryId,
  );
  return (
    <MarketDialog
      open
      drawer
      size="standard"
      title={`Booth ${cell.label}`}
      description={date(occurrence.startsAt)}
      onClose={onClose}
      busy={busy}
    >
      {error && <ErrorState error={error} />}
      <p>
        {assignment?.businessSnapshot.businessName ??
          cell.reason ??
          'Available'}{' '}
        {assignment && (
          <Badge tone="neutral">
            {assignment.recurringRuleId ? 'Recurring assignment' : 'One date'}
          </Badge>
        )}
      </p>
      <RouteLink to={`/market/day/${cell.occurrenceId}`}>
        Open this date’s Market Day map
      </RouteLink>
      {data.exceptions
        ?.filter(
          (e) =>
            e.occurrenceId === cell.occurrenceId &&
            (!assignment || e.directoryId === assignment.directoryId),
        )
        .map((e) => (
          <p key={e.directoryId}>
            {
              data.directory?.find((d) => d.id === e.directoryId)?.contact
                .businessName
            }
            :{' '}
            {e.kind === 'CANCELLED'
              ? 'Participation cancelled'
              : 'Date-specific exception'}
            {e.note && ` · ${e.note}`}
          </p>
        ))}
      {available && (
        <fieldset disabled={busy} className="ops-controls">
          <legend className="sr-only">Assignment changes</legend>
          <SelectField
            label="Edit scope"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setPreview(undefined);
            }}
          >
            <option value="date">This date only</option>
            <option value="recurring">
              Future dates covered by a recurring assignment
            </option>
          </SelectField>
          <SelectField
            label="Vendor"
            value={vendor}
            onChange={(e) => {
              setVendor(e.target.value);
              setPreview(undefined);
            }}
          >
            <option value="">
              {mode === 'date' ? 'Leave booth unassigned' : 'Select vendor'}
            </option>
            {(data.directory ?? [])
              .filter(
                (d) =>
                  d.status !== 'INACTIVE' &&
                  (mode === 'recurring' ||
                    eligible.some((a) => a.directoryId === d.id)),
              )
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.contact.businessName}
                </option>
              ))}
          </SelectField>
          <p>
            Only confirmed, eligible vendors can receive an assignment. Booth
            compatibility and rental capacity are checked when saving.
          </p>
          {billing.some((b) => b.issued) && (
            <p role="status">
              Resolve issued or paid invoices in Booth billing before releasing
              or changing this assignment.
            </p>
          )}
          {canBill && (
            <label>
              <Checkbox
                checked={voidDraft}
                onChange={(e) => {
                  setVoidDraft(e.target.checked);
                  setPreview(undefined);
                }}
              />{' '}
              Allow voiding affected draft invoices when releasing booths
            </label>
          )}
          {!assignment && mode === 'date' && vendorAssignments.length > 1 && (
            <SelectField
              label="Booth assignment to move"
              value={sourceId}
              onChange={(e) => setSourceId(Number(e.target.value))}
            >
              <option value={0}>Select existing booth</option>
              {vendorAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.spaceSnapshot.label}
                </option>
              ))}
            </SelectField>
          )}
          {mode === 'date' ? (
            <>
              <p>
                This change becomes an explicit exception. Other dates and
                recurring rules stay unchanged.
              </p>
              <div className="ui-actions">
                <Button
                  type="button"
                  disabled={(!assignment && !vendor) || needsSource}
                  onClick={() => setConfirmation('assignment')}
                >
                  Review assignment change
                </Button>
                {assignment && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const result = await run({
                        action: 'CANCEL_PARTICIPATION',
                        expectedRevision: approval?.revision,
                        data: {
                          occurrenceId: cell.occurrenceId,
                          directoryId: assignment.directoryId,
                          preview: true,
                          voidDraftInvoices: voidDraft,
                        },
                      });
                      if (result) {
                        setImpact(
                          result as {
                            assignments: number;
                            previewToken: string;
                          },
                        );
                        setConfirmation('cancel');
                      }
                    }}
                  >
                    Cancel participation
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <SelectField
                label="Recurring assignment"
                value={ruleId}
                onChange={(e) =>
                  chooseRule(
                    data.rules?.find((r) => r.id === Number(e.target.value)),
                  )
                }
              >
                <option value={0}>Create recurring assignment</option>
                {data.rules?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {
                      data.directory?.find((d) => d.id === r.directoryId)
                        ?.contact.businessName
                    }{' '}
                    · {r.fromDate} to {r.throughDate}
                  </option>
                ))}
              </SelectField>
              {rule && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    shift(
                      occurrence.scheduleDate ??
                        occurrence.startsAt.slice(0, 10),
                      -1,
                    ) < rule.fromDate
                  }
                  onClick={() => {
                    setFromDate(rule.fromDate);
                    setThroughDate(
                      shift(
                        occurrence.scheduleDate ??
                          occurrence.startsAt.slice(0, 10),
                        -1,
                      ),
                    );
                    setPreview(undefined);
                  }}
                >
                  End before this date
                </Button>
              )}
              <Control label="Effective from">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPreview(undefined);
                    }}
                  />
                )}
              </Control>
              <Control label="Effective through">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={throughDate}
                    onChange={(e) => {
                      setThroughDate(e.target.value);
                      setPreview(undefined);
                    }}
                  />
                )}
              </Control>
              <p>
                Uses existing market dates, up to one year. To end a rule,
                shorten its effective through date. Existing exceptions are
                preserved. Future dates require a selected layout and confirmed
                participation.
              </p>
              <Button
                type="button"
                disabled={!vendor || !fromDate || !throughDate}
                onClick={async () => {
                  const result = await run({
                    action: 'PREVIEW_SCHEDULE_RULE',
                    id: ruleId || undefined,
                    expectedRevision: rule?.revision,
                    data: recurringData,
                  });
                  if (result) setPreview(result as SchedulePreview);
                }}
              >
                Preview recurring assignment
              </Button>
              {preview && (
                <>
                  <ul aria-label="Recurring assignment preview">
                    {preview.preview.map((p) => (
                      <li key={p.occurrenceId}>
                        {date(p.startsAt)}:{' '}
                        {p.change === 'None' ? '' : `${p.change} · `}
                        {statusLabel(p.status)}
                      </li>
                    ))}
                  </ul>
                  {!preview.preview.length && (
                    <p>
                      No existing future dates in this range. The rule will
                      evaluate newly created dates.
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={() =>
                      run(
                        {
                          action: 'SAVE_SCHEDULE_RULE',
                          id: ruleId || undefined,
                          expectedRevision: rule?.revision,
                          data: {
                            ...recurringData,
                            confirm: true,
                            previewToken: preview.previewToken,
                          },
                        },
                        true,
                      )
                    }
                  >
                    Confirm recurring assignment
                  </Button>
                </>
              )}
            </>
          )}
        </fieldset>
      )}
      {confirmation && (
        <MarketDialog
          open
          title={
            confirmation === 'cancel'
              ? 'Cancel participation'
              : 'Confirm assignment change'
          }
          busy={busy}
          onClose={() => setConfirmation(null)}
        >
          {confirmation === 'cancel' ? (
            <>
              <p>
                Cancel {assignment?.businessSnapshot.businessName} for{' '}
                {date(occurrence.startsAt)} and release {impact?.assignments}{' '}
                booth assignment(s). This date becomes a recurring exception.
                Participation history remains. No refund or issued invoice is
                changed.
              </p>
              <Control label="Cancellation note (optional)">
                {(id) => (
                  <Textarea
                    id={id}
                    value={reason}
                    maxLength={2000}
                    onChange={(e) => setReason(e.target.value)}
                  />
                )}
              </Control>
            </>
          ) : (
            <p>
              {vendor
                ? `Assign ${data.directory?.find((d) => d.id === Number(vendor))?.contact.businessName} to ${cell.label}`
                : `Release ${cell.label}`}{' '}
              for {date(occurrence.startsAt)}. Any existing booth for the
              selected vendor will move to this booth. This affects this date
              only and does not publish the public map.
            </p>
          )}
          {error && <ErrorState error={error} />}
          <Button
            type="button"
            variant={confirmation === 'cancel' ? 'destructive' : 'primary'}
            onClick={() =>
              run(
                confirmation === 'cancel'
                  ? {
                      action: 'CANCEL_PARTICIPATION',
                      expectedRevision: approval?.revision,
                      data: {
                        occurrenceId: cell.occurrenceId,
                        directoryId: assignment!.directoryId,
                        reason,
                        previewToken: impact?.previewToken,
                        confirm: true,
                        voidDraftInvoices: voidDraft,
                      },
                    }
                  : {
                      action: 'SCHEDULE_CHANGE',
                      id: movingAssignment?.id,
                      expectedRevision: movingAssignment?.revision,
                      data: {
                        occurrenceId: cell.occurrenceId,
                        spaceId: cell.spaceId,
                        directoryId: vendor ? Number(vendor) : null,
                        confirm: true,
                        voidDraftInvoices: voidDraft,
                      },
                    },
                true,
              )
            }
          >
            Confirm{' '}
            {confirmation === 'cancel' ? 'cancellation' : 'assignment change'}
          </Button>
        </MarketDialog>
      )}
    </MarketDialog>
  );
}
