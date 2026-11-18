import { useId, useState } from 'react';
import type {
  MarketOperationsData,
  OperationsCommand,
  RentalSnapshot,
} from '@market/api';
import { EmptyState, Field, Tabs } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSelect,
} from '@market/ui/farmstand';
import { WorkspaceFrame } from '../../WorkspaceFrame';
import { MarketsSummary } from '../../vendor/MarketsSummary';
import { SettingsPanel } from '../../settings/SettingsPanel';
import { date } from '../common';
import { MarketDialog, StatusBadge } from '../presentation';
import { BoothMap, occurrenceBooths } from './Assignments';
import { OccurrenceLayoutActions } from './OccurrenceLayoutActions';
import { CompactLabel } from '../mobile';
import { AssignmentBooths, AssignmentVendors } from './AssignmentBooths';
import '../../vendor/market-dates.css';
import './assignments.css';
type Run = (c: OperationsCommand) => Promise<unknown>;
type CopyReview = {
  proposals: Array<{
    directoryId: number;
    spaceId: number;
    rentals: RentalSnapshot[];
  }>;
  conflicts: Array<{ directoryId: number; reason: string }>;
  newVendors: number[];
};
function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
/**
 * Booth assignments for one market date in the Farmstand workspace used by
 * Rentals, Vendors and Operations. Feature composition: no shared component
 * owns date approval, assignment copying or the booth map with its dialogs.
 * Commands, permissions and the booth/assignment dialogs are unchanged.
 */
export function AssignmentsWorkspace({
  data,
  run,
  occurrenceId,
  onOccurrenceChange,
  canAssign,
  canBill,
  canEditLayout,
  commandError,
}: {
  data: MarketOperationsData;
  run: Run;
  occurrenceId: number;
  onOccurrenceChange: (occurrenceId: number) => void;
  canAssign: boolean;
  canBill: boolean;
  canEditLayout: boolean;
  commandError?: unknown;
}) {
  const id = useId();
  const [previous, setPrevious] = useState(''),
    [copy, setCopy] = useState<CopyReview | null>(null),
    [copyOpen, setCopyOpen] = useState(false),
    [mapSelection, setMapSelection] = useState(''),
    [mapNavigation, setMapNavigation] = useState(0);
  const { plan, version, assignments, approvals, spaces } = occurrenceBooths(
    data,
    occurrenceId,
  );
  const occurrence = data.occurrences.find((o) => o.id === occurrenceId);
  const businessName = (directoryId: number) =>
    data.directory?.find((d) => d.id === directoryId)?.contact.businessName;
  const boothsFor = (approvalId: number) =>
    assignments.filter((x) => x.approvalId === approvalId);
  // Summary: the backend day summary when supplied, else this date's records.
  const needsBooth = approvals.filter((a) => !boothsFor(a.id).length).length;
  const openBooths = spaces.filter(
    (s) => !assignments.some((a) => a.spaceId === s.id),
  ).length;
  const rentalTotals =
    data.daySummary?.rentalQuantities ??
    (data.allocations ?? [])
      .filter((r) => assignments.some((a) => a.id === r.assignmentId))
      .reduce<Record<string, number>>((totals, r) => {
        totals[r.snapshot.name] = (totals[r.snapshot.name] ?? 0) + r.quantity;
        return totals;
      }, {});
  const rentalCount = Object.values(rentalTotals).reduce((n, q) => n + q, 0);
  const expected = data.daySummary?.expected ?? approvals.length;
  const unassigned = data.daySummary?.unassigned ?? needsBooth;
  const startsAt = Date.parse(occurrence?.startsAt ?? '');
  const earlier = data.occurrences.filter(
    (o) => Date.parse(o.startsAt) < startsAt,
  );
  const datePicker = (
    <Field
      id={`${id}-date`}
      label={<span className="sr-only">Market date</span>}
    >
      <FarmstandSelect
        id={`${id}-date`}
        icon="calendar-days"
        value={occurrenceId}
        onChange={(e) => onOccurrenceChange(Number(e.target.value))}
      >
        {data.occurrences.map((o) => (
          <option key={o.id} value={o.id}>
            {date(o.startsAt)} · {o.venue}
          </option>
        ))}
      </FarmstandSelect>
    </Field>
  );
  return (
    <WorkspaceFrame
      icon="store"
      title="Assignments"
      description="Approve vendors, assign booths and rentals, and publish the map for each market date."
      tabs={[]}
      value="assignments"
      onChange={() => {}}
      className="market-assignments farmstand-controls"
      actions={data.occurrences.length > 0 && datePicker}
    >
      {!occurrence ? (
        <FarmstandPanel as="section" className="markets-list">
          <EmptyState title="No market dates yet">
            <p>Create a market date to start assigning booths.</p>
          </EmptyState>
        </FarmstandPanel>
      ) : (
        <>
          <MarketsSummary
            className="market-dates-summary"
            items={[
              {
                label: 'Booths assigned',
                value: version
                  ? `${spaces.length - openBooths} / ${spaces.length}`
                  : '—',
                tone:
                  version && spaces.length && !openBooths
                    ? 'success'
                    : undefined,
                hint: version
                  ? `${plural(openBooths, 'booth')} open`
                  : 'No layout selected',
                icon: 'store',
              },
              {
                label: 'Expected vendors',
                value: expected,
                tone: unassigned ? 'warning' : undefined,
                hint: unassigned
                  ? `${unassigned} without a booth`
                  : expected
                    ? 'All have a booth'
                    : 'No vendors approved yet',
                icon: 'user-round',
              },
              {
                label: 'Accepted rentals',
                value: rentalCount,
                hint: rentalCount
                  ? Object.entries(rentalTotals)
                      .filter(([, quantity]) => quantity)
                      .map(([name, quantity]) => `${name}: ${quantity}`)
                      .join(' · ')
                  : 'No accepted rentals',
                icon: 'package',
              },
              data.billingSummary
                ? {
                    label: 'Paid invoices',
                    value: data.billingSummary.paid,
                    tone: data.billingSummary.pastDue ? 'danger' : undefined,
                    hint: `${data.billingSummary.open} open · ${data.billingSummary.pastDue} past due`,
                    icon: 'receipt-text',
                  }
                : {
                    label: 'Map',
                    value: plan
                      ? plan.state === 'PUBLISHED'
                        ? 'Published'
                        : 'Draft'
                      : '—',
                    tone: plan?.state === 'PUBLISHED' ? 'success' : undefined,
                    hint: plan
                      ? plan.operationsComplete
                        ? 'Day operations complete'
                        : 'Operations open'
                      : 'No layout selected',
                    icon: 'map-pin',
                  },
            ]}
          />
          <SettingsPanel
            icon="map-pin"
            title="Market layout"
            className="assignments-map-panel"
            description={
              plan ? (
                <>
                  <StatusBadge>{plan.state}</StatusBadge>
                  <span>
                    {plan.operationsComplete
                      ? 'Day operations complete'
                      : 'Operations open'}
                  </span>
                </>
              ) : (
                'No layout has been selected for this date.'
              )
            }
            actions={
              <div className="occurrence-map-actions">
                <OccurrenceLayoutActions
                  key={`occurrence-layout:${occurrenceId}`}
                  data={data}
                  occurrenceId={occurrenceId}
                  run={run}
                  canChange={canAssign}
                  canEdit={canAssign && canEditLayout}
                  compact
                />
                {canAssign && (
                  <FarmstandButton
                    variant="secondary"
                    size="compact"
                    type="button"
                    onClick={() => setCopyOpen(true)}
                  >
                    <FarmstandIcon name="layers" />
                    <CompactLabel>Copy from an earlier date</CompactLabel>
                  </FarmstandButton>
                )}
                {plan && canAssign && (
                  <FarmstandButton
                    variant={
                      plan.state === 'PUBLISHED' ? 'secondary' : 'primary'
                    }
                    size="compact"
                    type="button"
                    onClick={() =>
                      run({
                        action: 'PUBLISH_MAP',
                        id: plan.id,
                        expectedRevision: plan.revision,
                        data: { published: plan.state !== 'PUBLISHED' },
                      })
                    }
                  >
                    <FarmstandIcon
                      name={plan.state === 'PUBLISHED' ? 'archive' : 'upload'}
                    />
                    {plan.state === 'PUBLISHED'
                      ? 'Unpublish map'
                      : 'Publish map'}
                  </FarmstandButton>
                )}
              </div>
            }
          >
            {version ? (
              <div className="settings-panel-body">
                {canAssign && (
                  <p className="markets-muted">
                    Select a booth on the map or in the table to assign a
                    business or edit the booth.
                  </p>
                )}
                <BoothMap
                  data={data}
                  occurrenceId={occurrenceId}
                  selectedId={mapSelection}
                  onSelect={(elementId) => {
                    setMapSelection(elementId);
                    setMapNavigation((n) => n + 1);
                  }}
                  showBoothList={false}
                />
              </div>
            ) : (
              <p className="markets-muted">
                {canAssign
                  ? 'Choose Change layout to place a layout for this date.'
                  : 'A layout has not been selected for this date.'}
              </p>
            )}
            <div className="settings-panel-body">
              <Tabs
                key={mapNavigation}
                className="workspace-menu"
                initialTab={mapNavigation ? 'Booths' : 'Vendors'}
                items={[
                  {
                    label: 'Vendors',
                    content: (
                      <AssignmentVendors
                        data={data}
                        occurrenceId={occurrenceId}
                        run={run}
                        canAssign={canAssign}
                        canBill={canBill}
                      />
                    ),
                  },
                  {
                    label: 'Booths',
                    content: (
                      <AssignmentBooths
                        data={data}
                        occurrenceId={occurrenceId}
                        run={run}
                        canAssign={canAssign}
                        canBill={canBill}
                        commandError={commandError}
                        selected={mapSelection}
                        onSelect={setMapSelection}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </SettingsPanel>
        </>
      )}
      {canAssign && copyOpen && (
        <MarketDialog
          open
          onClose={() => setCopyOpen(false)}
          title="Copy from an earlier date"
        >
          <p>
            Suggest booths and rentals from a previous market date, including
            cancelled dates.
          </p>
          <form
            className="settings-panel-body"
            onSubmit={async (e) => {
              e.preventDefault();
              setCopy(
                ((await run({
                  action: 'COPY_ASSIGNMENTS',
                  data: {
                    occurrenceId,
                    fromOccurrenceId: Number(previous),
                  },
                })) as CopyReview | undefined) ?? null,
              );
            }}
          >
            <Field id={`${id}-previous`} label="Earlier market date">
              <FarmstandSelect
                id={`${id}-previous`}
                required
                value={previous}
                onChange={(e) => setPrevious(e.target.value)}
              >
                <option value="">Choose earlier date</option>
                {earlier.map((o) => (
                  <option key={o.id} value={o.id}>
                    {date(o.startsAt)}
                    {o.status === 'cancelled' ? ' · Cancelled' : ''}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
            <FarmstandButton
              type="submit"
              variant="secondary"
              disabled={!plan || plan.state !== 'DRAFT'}
            >
              <FarmstandIcon name="layers" />
              Prepare copy suggestions
            </FarmstandButton>
            {plan && plan.state !== 'DRAFT' && (
              <p className="markets-muted">
                Unpublish the map to copy assignments.
              </p>
            )}
          </form>
          {copy && (
            <section
              className="assignments-copy-review"
              aria-label="Draft copy review"
            >
              <h3>Draft copy review</h3>
              <p className="markets-muted">
                {plural(copy.proposals.length, 'suggestion')} ·{' '}
                {plural(copy.conflicts.length, 'conflict')} ·{' '}
                {copy.newVendors.length} vendors needing placement
              </p>
              {copy.conflicts.length > 0 && (
                <ul className="assignments-copy-conflicts">
                  {copy.conflicts.map((c) => (
                    <li key={c.directoryId}>
                      <FarmstandIcon name="triangle-alert" />
                      <span>
                        {businessName(c.directoryId) ??
                          `Business ${c.directoryId}`}
                        : {c.reason.toLowerCase().replaceAll('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {copy.proposals.length > 0 && (
                <ul className="assignments-copy-proposals">
                  {copy.proposals.map((p) => (
                    <li key={p.directoryId}>
                      <span>
                        <strong>{businessName(p.directoryId)}</strong>
                        <small>
                          Booth{' '}
                          {spaces.find((s) => s.id === p.spaceId)?.details
                            .label ?? p.spaceId}
                        </small>
                      </span>
                      <FarmstandButton
                        variant="secondary"
                        size="compact"
                        type="button"
                        onClick={() =>
                          run({
                            action: 'ASSIGN',
                            data: { occurrenceId, ...p },
                          })
                        }
                      >
                        Confirm
                      </FarmstandButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </MarketDialog>
      )}
    </WorkspaceFrame>
  );
}
