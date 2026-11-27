import { useId, useMemo, useState } from 'react';
import type {
  ApplicationSubmission,
  MarketOperationsData,
  OccurrenceApproval,
  OperationsCommand,
} from '@market/api';
import { Alert, Button, Checkbox, Input } from '@market/ui';
import {
  FarmstandButton,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { date } from '../common';
import { friendlyLabel, StatusBadge } from '../presentation';
import { Check } from './common';

/**
 * Requested market dates for one application as a sortable table with
 * row selection and one bulk decision. Each date still goes through the
 * existing REVIEW_OCCURRENCE command, so the backend keeps every transition
 * rule (historical dates, confirmed-date cancellation, assignments, invoices).
 * Why not an existing component: Billing's selectable invoice table is
 * invoice-specific, and no shared table offers sortable headings.
 */
type Decision = NonNullable<OccurrenceApproval['decision']>;
const decisions: Decision[] = [
  'CONFIRMED',
  'WAITLISTED',
  'DECLINED',
  'PENDING',
  'CANCELLED',
];
const decisionLabels: Record<Decision, string> = {
  CONFIRMED: 'Confirm',
  WAITLISTED: 'Waitlist',
  DECLINED: 'Decline',
  PENDING: 'Return to pending',
  CANCELLED: 'Cancel confirmed dates',
};
/** Status filter options, in the order a manager works through them. */
const statusOrder: Decision[] = [
  'PENDING',
  'CONFIRMED',
  'WAITLISTED',
  'DECLINED',
  'CANCELLED',
];
const SELECT = 'Select';
const DATE = 'Market date';
const STATUS = 'Status';

interface Row {
  id: number;
  startsAt?: string;
  decision: Decision;
  approval?: OccurrenceApproval;
  past: boolean;
  fit: string;
  note: string;
}

/** Whether a date can move to `target` (the backend enforces the same). */
function changes(row: Row, target: Decision) {
  if (row.past || row.decision === target) return false;
  if (target === 'CANCELLED') return row.decision === 'CONFIRMED';
  return row.decision !== 'CONFIRMED';
}

function boothFit(
  s: ApplicationSubmission,
  occurrenceId: number,
  data: MarketOperationsData,
) {
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId);
  if (s.requirements.widthFeet <= 0 || s.requirements.depthFeet <= 0)
    return 'Booth size not given';
  if (!plan || !data.spaces) return 'Not checked';
  const compatible = data.spaces.some(
    (space) =>
      space.layoutVersionId === plan.layoutVersionId &&
      space.details.widthFeet >= s.requirements.widthFeet &&
      space.details.depthFeet >= s.requirements.depthFeet &&
      (!s.requirements.electricity ||
        space.details.amenities.includes('ELECTRICITY')) &&
      (!s.requirements.vehicle ||
        space.details.amenities.includes('VEHICLE')) &&
      (!s.requirements.foodTruck ||
        space.details.amenities.includes('FOOD_TRUCK')) &&
      !data.assignments?.some(
        (a) => a.occurrenceId === occurrenceId && a.spaceId === space.id,
      ),
  );
  return compatible ? 'Space available' : 'No compatible space';
}

export function RequestedDates({
  submission: s,
  data,
  canDecide,
  canBilling,
  busy,
  runBatch,
}: {
  submission: ApplicationSubmission;
  data: MarketOperationsData;
  /** Date decisions need an accepted application and permission. */
  canDecide: boolean;
  canBilling: boolean;
  busy: boolean;
  /** Runs the commands in order; resolves with each command's success. */
  runBatch: (commands: OperationsCommand[]) => Promise<boolean[]>;
}) {
  const id = useId();
  const [now] = useState(() => Date.now());
  const [descending, setDescending] = useState(false);
  const [status, setStatus] = useState<Decision | 'ALL'>('ALL');
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [decision, setDecision] = useState<Decision>('CONFIRMED');
  const [reason, setReason] = useState('');
  const [release, setRelease] = useState(false);
  const [voidDraft, setVoidDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{
    decision: Decision;
    saved: number;
    failed: string[];
  }>();
  const directory = data.directory?.find((d) => d.id === s.directoryId);

  const rows = useMemo(
    () =>
      s.requestedOccurrenceIds.map((occurrenceId): Row => {
        const occurrence = data.occurrences.find((o) => o.id === occurrenceId);
        const approval = data.approvals?.find(
          (a) => a.submissionId === s.id && a.occurrenceId === occurrenceId,
        );
        return {
          id: occurrenceId,
          startsAt: occurrence?.startsAt,
          decision: approval?.decision ?? 'PENDING',
          approval,
          past: !!occurrence && Date.parse(occurrence.startsAt) <= now,
          fit: boothFit(s, occurrenceId, data),
          note: approval?.managerNotes ?? '',
        };
      }),
    [s, data, now],
  );
  // Upcoming pending dates always come first, then by date; the status
  // filter narrows the list.
  const waiting = (r: Row) => r.decision === 'PENDING' && !r.past;
  const sorted = useMemo(() => {
    const time = (r: Row) => (r.startsAt ? Date.parse(r.startsAt) : 0);
    return rows
      .filter((r) => status === 'ALL' || r.decision === status)
      .sort(
        (a, b) =>
          Number(waiting(b)) - Number(waiting(a)) ||
          (time(a) - time(b)) * (descending ? -1 : 1),
      );
  }, [rows, status, descending]);
  const counts = new Map<Decision, number>();
  for (const r of rows)
    counts.set(r.decision, (counts.get(r.decision) ?? 0) + 1);

  // Select all covers the upcoming dates the filter shows.
  const selectable = sorted.filter((r) => !r.past);
  const chosen = rows.filter((r) => selected.has(r.id));
  const applicable = chosen.filter((r) => changes(r, decision));
  const allSelected =
    selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const pendingCount = rows.filter(waiting).length;
  const locked = busy || saving || !canDecide;
  const label = (r: Row) => date(r.startsAt, data.timeZone);
  const part = (r: Row, options: Intl.DateTimeFormatOptions) =>
    r.startsAt
      ? new Intl.DateTimeFormat('en-US', {
          timeZone: data.timeZone,
          ...options,
        }).format(new Date(r.startsAt))
      : 'Date unavailable';

  function toggle(ids: number[], on: boolean) {
    setOutcome(undefined);
    setSelected((current) => {
      const next = new Set(current);
      for (const value of ids) {
        if (on) next.add(value);
        else next.delete(value);
      }
      return next;
    });
  }

  async function apply() {
    if (!applicable.length) return;
    setSaving(true);
    setOutcome(undefined);
    try {
      const results = await runBatch(
        applicable.map((r) => ({
          action: 'REVIEW_OCCURRENCE',
          expectedRevision: r.approval?.revision,
          data: {
            submissionId: s.id,
            occurrenceId: r.id,
            decision,
            reason,
            releaseAssignments: decision === 'CANCELLED' && release,
            voidDraftInvoices: decision === 'CANCELLED' && voidDraft,
          },
        })),
      );
      const failed = applicable.filter((_, i) => !results[i]);
      setOutcome({
        decision,
        saved: applicable.length - failed.length,
        failed: failed.map(label),
      });
      setSelected(new Set(failed.map((r) => r.id)));
      if (!failed.length) setReason('');
    } finally {
      setSaving(false);
    }
  }

  async function convert(approval: OccurrenceApproval) {
    setSaving(true);
    setOutcome(undefined);
    try {
      await runBatch([
        {
          action: 'CONVERT_OCCURRENCE_IDENTITY',
          id: approval.id,
          expectedRevision: approval.revision,
          data: {},
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  const dateSort = (
    <Button
      type="button"
      variant="tertiary"
      className="requested-dates-sort"
      aria-pressed="true"
      aria-label={`Market date, ${descending ? 'latest' : 'earliest'} first`}
      onClick={() => setDescending((value) => !value)}
    >
      {DATE}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          d={descending ? 'M8 13V3m-4 4 4-4 4 4' : 'M8 3v10m-4-4 4 4 4-4'}
        />
      </svg>
    </Button>
  );
  const needsLink = (r: Row) =>
    directory?.linkState === 'LINK_VERIFIED' &&
    r.approval?.decision === 'CONFIRMED' &&
    !r.approval.participationId &&
    !r.past;
  const showLink = canDecide && rows.some(needsLink);
  const rentals = s.rentalRequests.filter((r) => r.quantity > 0);

  if (!rows.length)
    return (
      <div className="requested-dates">
        <p className="application-detail-empty">No dates requested.</p>
        <RentalLine rentals={rentals} />
      </div>
    );

  return (
    <div className="requested-dates">
      <div className="requested-dates-summary">
        <p>
          {pendingCount
            ? `${pendingCount} of ${rows.length} ${rows.length === 1 ? 'date needs' : 'dates need'} a decision.`
            : 'Every upcoming requested date has a decision.'}{' '}
          Confirming a date records attendance; it does not reserve a booth.
        </p>
        <RentalLine rentals={rentals} />
      </div>
      <div className="requested-dates-filter">
        <label htmlFor={`${id}-status`}>Status</label>
        <FarmstandSelect
          id={`${id}-status`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as Decision | 'ALL');
            // Never act on dates the filter hides.
            setSelected(new Set());
            setOutcome(undefined);
          }}
        >
          <option value="ALL">All statuses ({rows.length})</option>
          {statusOrder
            .filter((value) => counts.has(value))
            .map((value) => (
              <option key={value} value={value}>
                {friendlyLabel(value)} ({counts.get(value)})
              </option>
            ))}
        </FarmstandSelect>
      </div>
      {canDecide ? (
        <form
          className="requested-dates-bulk"
          aria-label="Decide selected dates"
          onSubmit={(event) => {
            event.preventDefault();
            void apply();
          }}
        >
          <fieldset disabled={locked}>
            <legend className="sr-only">Decision for selected dates</legend>
            <span className="requested-dates-count" aria-live="polite">
              {chosen.length} selected
            </span>
            <label className="sr-only" htmlFor={`${id}-decision`}>
              Decision
            </label>
            <FarmstandSelect
              id={`${id}-decision`}
              value={decision}
              onChange={(event) => {
                setDecision(event.target.value as Decision);
                setOutcome(undefined);
              }}
            >
              {decisions.map((value) => (
                <option key={value} value={value}>
                  {decisionLabels[value]}
                </option>
              ))}
            </FarmstandSelect>
            <label className="sr-only" htmlFor={`${id}-reason`}>
              Decision note, optional
            </label>
            <Input
              id={`${id}-reason`}
              className="requested-dates-reason"
              placeholder="Decision note, optional"
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <FarmstandButton
              type="submit"
              disabled={locked || !applicable.length}
              loading={saving}
            >
              {applicable.length
                ? `Apply to ${applicable.length} ${applicable.length === 1 ? 'date' : 'dates'}`
                : 'Apply'}
            </FarmstandButton>
          </fieldset>
          {decision === 'CANCELLED' && (
            <fieldset className="requested-dates-cancel" disabled={locked}>
              <legend className="sr-only">Cancellation obligations</legend>
              <Check
                label="Release booth assignments for these dates and keep their history"
                checked={release}
                onChange={setRelease}
              />
              {canBilling && (
                <Check
                  label="Void draft invoices and keep their snapshots"
                  checked={voidDraft}
                  onChange={setVoidDraft}
                />
              )}
              <p className="application-detail-note">
                Issued or paid invoices must be resolved in billing first.
              </p>
            </fieldset>
          )}
          {chosen.length > applicable.length && (
            <p className="application-detail-note">
              {chosen.length - applicable.length} selected{' '}
              {chosen.length - applicable.length === 1 ? 'date' : 'dates'}{' '}
              {decision === 'CANCELLED'
                ? 'are not confirmed and will be skipped.'
                : 'already have this decision or are confirmed (cancel those instead) and will be skipped.'}
            </p>
          )}
        </form>
      ) : null}
      {outcome && (
        <Alert severity={outcome.failed.length ? 'warning' : 'success'}>
          {outcome.saved > 0 &&
            `${friendlyLabel(outcome.decision)}: ${outcome.saved} ${outcome.saved === 1 ? 'date' : 'dates'}. `}
          {outcome.failed.length > 0 &&
            `Could not update ${outcome.failed.join(', ')}. Check the vendor's market membership and participation, booth assignments and invoices, then try again.`}
        </Alert>
      )}
      <div className="requested-dates-scroll">
        <FarmstandTable
          label="Requested market dates"
          className="requested-dates-table"
          selectionColumn={canDecide}
          sort={{
            heading: DATE,
            direction: descending ? 'descending' : 'ascending',
          }}
          headings={[
            ...(canDecide ? [SELECT] : []),
            DATE,
            STATUS,
            'Booth fit',
            'Decision note',
            ...(showLink ? ['Actions'] : []),
          ]}
          renderHeading={(heading) =>
            heading === SELECT ? (
              <Checkbox
                aria-label="Select all upcoming dates shown"
                checked={allSelected}
                disabled={locked || !selectable.length}
                onChange={(event) =>
                  toggle(
                    selectable.map((r) => r.id),
                    event.currentTarget.checked,
                  )
                }
              />
            ) : heading === DATE ? (
              dateSort
            ) : (
              heading
            )
          }
        >
          {sorted.map((r) => (
            <tr
              key={r.id}
              data-pending={waiting(r) || undefined}
              data-past={r.past || undefined}
            >
              {canDecide && (
                <td>
                  <Checkbox
                    aria-label={`Select ${label(r)}`}
                    checked={selected.has(r.id)}
                    disabled={locked || r.past}
                    onChange={(event) =>
                      toggle([r.id], event.currentTarget.checked)
                    }
                  />
                </td>
              )}
              <th scope="row">
                <span className="requested-dates-day">
                  {part(r, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="markets-muted">
                  {part(r, {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}
                  {r.past && ' · Past'}
                </span>
              </th>
              <td>
                <StatusBadge>{r.decision}</StatusBadge>
              </td>
              <td>{r.fit}</td>
              <td className="requested-dates-note">{r.note || '—'}</td>
              {showLink && (
                <td>
                  {needsLink(r) && r.approval && (
                    <Button
                      type="button"
                      variant="tertiary"
                      size="compact"
                      disabled={locked}
                      title="This date was confirmed before the vendor's platform account was linked."
                      onClick={() => void convert(r.approval!)}
                    >
                      Link participation
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </FarmstandTable>
      </div>
    </div>
  );
}

function RentalLine({
  rentals,
}: {
  rentals: ApplicationSubmission['rentalRequests'];
}) {
  return (
    <p className="requested-dates-rentals">
      <strong>Rentals for each date:</strong>{' '}
      {rentals.length
        ? rentals.map((r) => `${r.name} × ${r.quantity}`).join(', ')
        : 'None requested'}
    </p>
  );
}
