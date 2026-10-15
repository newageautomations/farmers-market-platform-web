import { date } from '../presentation';
import { MarketDialog as Dialog } from '../presentation';
import { useState } from 'react';
import type {
  MarketOperationsData,
  OccurrenceApproval,
  OperationsCommand,
  SpaceAssignment,
  RentalSnapshot,
  BoothInvoice,
} from '@market/api';
import {
  Button,
  Select,
  Card,
  MarketMap,
  ErrorState,
  type BoothStatus,
} from '@market/ui';
import { Check, Control, Entry, moneyLabel } from './common';
import { Invoice } from './Billing';
import { OccurrenceLayoutActions } from './OccurrenceLayoutActions';
import { Chevron } from '../../NavigationIcon';
type Run = (c: OperationsCommand) => Promise<unknown>;
export function boothStatus(
  assignment: SpaceAssignment | undefined,
  invoices: BoothInvoice[] = [],
): BoothStatus {
  if (!assignment) return 'available';
  return invoices.some(
    (i) =>
      i.assignmentId === assignment.id &&
      i.status !== 'VOID' &&
      (i.status === 'PAID' || i.billingStatus === 'PAID'),
  )
    ? 'paid'
    : 'assigned';
}
export function Assignments({
  data,
  run,
  occurrenceId,
  day = false,
  canAssign,
  canDay,
  canBill,
  commandError,
  canEditLayout = false,
}: {
  data: MarketOperationsData;
  run: Run;
  occurrenceId: number;
  day?: boolean;
  canAssign: boolean;
  canDay: boolean;
  canBill: boolean;
  commandError?: unknown;
  canEditLayout?: boolean;
}) {
  const [directory, setDirectory] = useState(''),
    [previous, setPrevious] = useState(''),
    [copy, setCopy] = useState<{
      proposals: Array<{
        directoryId: number;
        spaceId: number;
        rentals: RentalSnapshot[];
      }>;
      conflicts: Array<{ directoryId: number; reason: string }>;
      newVendors: number[];
    } | null>(null),
    [search, setSearch] = useState(''),
    [mapSelection, setMapSelection] = useState(''),
    [mapDirectory, setMapDirectory] = useState('');
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId),
    version = data.layoutVersions?.find((v) => v.id === plan?.layoutVersionId),
    assignments =
      data.assignments?.filter((a) => a.occurrenceId === occurrenceId) ?? [],
    approvals =
      data.approvals?.filter((a) => a.occurrenceId === occurrenceId) ?? [],
    spaces =
      data.spaces?.filter((s) => s.layoutVersionId === version?.id) ?? [];
  const selectedBooth = spaces.find((s) => s.elementId === mapSelection),
    selectedAssignment = assignments.find(
      (a) => a.spaceId === selectedBooth?.id,
    );
  const statuses = Object.fromEntries(
    spaces.map((s) => [
      s.elementId,
      boothStatus(
        assignments.find((a) => a.spaceId === s.id),
        data.invoices,
      ),
    ]),
  );
  const mapSpaces = spaces.map((s) => ({
    elementId: s.elementId,
    label: s.details.label,
    widthFeet: s.details.widthFeet,
    depthFeet: s.details.depthFeet,
    amenities: s.details.amenities,
    vendor:
      assignments.find((a) => a.spaceId === s.id)?.businessSnapshot ?? null,
  }));
  const overlays = Object.fromEntries(
    assignments.map((a) => {
      const s = spaces.find((s) => s.id === a.spaceId),
        approval = approvals.find((p) => p.id === a.approvalId),
        invoice = data.invoices?.find(
          (i) => i.assignmentId === a.id && i.status !== 'VOID',
        );
      return [
        s?.elementId ?? '',
        `${approval?.checkIn === 'CHECKED_IN' ? 'Checked in' : 'Awaiting arrival'} · ${approval?.attendance.toLowerCase().replaceAll('_', ' ') ?? 'not recorded'} · ${(invoice?.billingStatus ?? invoice?.status)?.toLowerCase().replaceAll('_', ' ') ?? 'No invoice'} · ${data.allocations?.filter((r) => r.assignmentId === a.id).reduce((n, r) => n + r.quantity, 0) ?? 0} rentals${approval?.managerNotes ? ' · Note' : ''}`,
      ];
    }),
  );
  return (
    <>
      {data.daySummary && (
        <dl
          className="ops-day-summary ui-kpi-grid"
          aria-label="Occurrence summary"
          aria-live="polite"
        >
          <div>
            <dt>Expected vendors</dt>
            <dd>{data.daySummary.expected}</dd>
            <dd className="ops-day-summary-detail">
              {data.daySummary.assigned} assigned · {data.daySummary.unassigned}{' '}
              unassigned
            </dd>
          </div>
          <div>
            <dt>Checked in</dt>
            <dd>{data.daySummary.checkedIn}</dd>
            <dd className="ops-day-summary-detail">
              {data.daySummary.notCheckedIn} awaiting arrival
            </dd>
          </div>
          <div>
            <dt>Attendance</dt>
            <dd className="ops-day-summary-detail">
              {Object.entries(data.daySummary.attendance).map(
                ([status, count]) => (
                  <span key={status}>
                    {count} {status.toLowerCase().replaceAll('_', ' ')}
                  </span>
                ),
              )}
            </dd>
          </div>
          <div>
            <dt>Accepted rentals</dt>
            <dd>
              {Object.values(data.daySummary.rentalQuantities).reduce(
                (sum, quantity) => sum + quantity,
                0,
              )}
            </dd>
            <dd className="ops-day-summary-detail">
              {Object.entries(data.daySummary.rentalQuantities).map(
                ([name, quantity]) => (
                  <span key={name}>
                    {name}: {quantity}
                  </span>
                ),
              )}
              {!Object.keys(data.daySummary.rentalQuantities).length &&
                'No accepted rentals'}
            </dd>
          </div>
          {data.billingSummary && (
            <div>
              <dt>Paid invoices</dt>
              <dd>{data.billingSummary.paid}</dd>
              <dd className="ops-day-summary-detail">
                {data.billingSummary.open} open · {data.billingSummary.pastDue}{' '}
                past due
              </dd>
            </div>
          )}
        </dl>
      )}
      <OccurrenceLayoutActions
        key={`occurrence-layout:${occurrenceId}`}
        data={data}
        occurrenceId={occurrenceId}
        run={run}
        canChange={canAssign}
        canEdit={canAssign && canEditLayout}
      />
      {plan && (
        <div className="ops-toolbar">
          <p>
            Map {plan.state.toLowerCase()} ·{' '}
            {plan.operationsComplete
              ? 'Day operations complete'
              : 'Operations open'}
          </p>
          {canAssign && (
            <Button
              variant="secondary"
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
              {plan.state === 'PUBLISHED'
                ? 'Unpublish map'
                : 'Publish occurrence map'}
            </Button>
          )}
        </div>
      )}
      {version && (
        <MarketMap
          key={`map:${version.id}`}
          boothListLimit={10}
          definition={version.definition}
          spaces={mapSpaces}
          overlays={overlays}
          statuses={statuses}
          renderSpaceDetails={(id) => {
            const booth = spaces.find((s) => s.elementId === id)!;
            return (
              <dl className="facts">
                <div>
                  <dt>Booth type</dt>
                  <dd>
                    {booth.details.spaceType.toLowerCase().replaceAll('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt>Booth fee</dt>
                  <dd>
                    {moneyLabel(booth.details.feeMinor, booth.details.currency)}
                  </dd>
                </div>
                {booth.details.description && (
                  <div>
                    <dt>Description</dt>
                    <dd>{booth.details.description}</dd>
                  </div>
                )}
                {booth.details.managerNotes && (
                  <div>
                    <dt>Manager notes</dt>
                    <dd>{booth.details.managerNotes}</dd>
                  </div>
                )}
                {booth.details.preferredDirectoryId && (
                  <div>
                    <dt>Preferred business</dt>
                    <dd>
                      {data.directory?.find(
                        (d) => d.id === booth.details.preferredDirectoryId,
                      )?.contact.businessName ?? 'Not available'}
                    </dd>
                  </div>
                )}
              </dl>
            );
          }}
          selectedId={mapSelection}
          onSelect={(id) => {
            const booth = spaces.find((s) => s.elementId === id);
            if (!booth) return;
            setMapSelection(id);
            setMapDirectory(
              String(
                assignments.find((a) => a.spaceId === booth?.id)?.directoryId ??
                  booth?.details.preferredDirectoryId ??
                  '',
              ),
            );
          }}
        />
      )}
      {selectedBooth && (
        <Dialog
          open
          title={`Booth ${selectedBooth.details.label}`}
          focusTitle
          onClose={() => setMapSelection('')}
        >
          <p className="booth-modal-info">
            {selectedBooth.details.widthFeet} ×{' '}
            {selectedBooth.details.depthFeet} ft ·{' '}
            {moneyLabel(
              selectedBooth.details.feeMinor,
              selectedBooth.details.currency,
            )}{' '}
            booth fee
          </p>
          {selectedBooth.details.amenities.length > 0 && (
            <p>
              Amenities:{' '}
              {selectedBooth.details.amenities
                .map((a) => a.toLowerCase().replaceAll('_', ' '))
                .join(', ')}
            </p>
          )}
          {!!commandError && <ErrorState error={commandError} />}
          {selectedAssignment && (
            <p>
              Assigned to {selectedAssignment.businessSnapshot.businessName}.
              You can update its existing assignment below.
            </p>
          )}
          {canAssign ? (
            <>
              <Control label="Business for selected booth">
                {(id) => (
                  <Select
                    id={id}
                    value={mapDirectory}
                    disabled={!!selectedAssignment}
                    onChange={(e) => setMapDirectory(e.target.value)}
                  >
                    <option value="">Choose business</option>
                    {data.directory?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.contact.businessName}
                      </option>
                    ))}
                  </Select>
                )}
              </Control>
              {mapDirectory &&
                !approvals.some(
                  (a) => a.directoryId === Number(mapDirectory),
                ) && (
                  <Card as="div" className="dashboard-card">
                    <p>
                      This business needs approval for this market date before
                      it can receive a booth.
                    </p>
                    <Button
                      variant="secondary"
                      size="compact"
                      type="button"
                      onClick={() =>
                        run({
                          action: 'APPROVE_OCCURRENCE',
                          data: {
                            occurrenceId,
                            directoryId: Number(mapDirectory),
                          },
                        })
                      }
                    >
                      Approve business for this date
                    </Button>
                  </Card>
                )}
              {approvals
                .filter((a) => a.directoryId === Number(mapDirectory))
                .map((a) => (
                  <AssignmentCard
                    key={`map:${mapSelection}:${a.id}:${a.revision}:${assignments.map((x) => x.revision).join(':')}`}
                    approval={a}
                    data={data}
                    assignments={assignments.filter(
                      (x) => x.approvalId === a.id,
                    )}
                    run={run}
                    canAssign={canAssign}
                    canDay={canDay && day}
                    canBill={canBill}
                    initialSpaceId={
                      spaces.find((s) => s.elementId === mapSelection)?.id
                    }
                  />
                ))}
            </>
          ) : (
            <p>
              {selectedAssignment
                ? 'You have read-only access to this assignment.'
                : 'This booth is available. Assignment permission is required to add a business.'}
            </p>
          )}
        </Dialog>
      )}
      {!day && canAssign && (
        <>
          <form
            className="ops-toolbar ui-control-row ui-control-row-lookup"
            onSubmit={(e) => {
              e.preventDefault();
              return run({
                action: 'APPROVE_OCCURRENCE',
                data: { occurrenceId, directoryId: Number(directory) },
              });
            }}
          >
            <Control label="Approve directory business">
              {(id) => (
                <Select
                  id={id}
                  required
                  value={directory}
                  onChange={(e) => setDirectory(e.target.value)}
                >
                  <option value="">Choose business</option>
                  {data.directory
                    ?.filter(
                      (d) => !approvals.some((a) => a.directoryId === d.id),
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.contact.businessName}
                      </option>
                    ))}
                </Select>
              )}
            </Control>
            <div className="ui-field-action">
              <Button type="submit" variant="primary">
                Approve occurrence
              </Button>
            </div>
          </form>
          <form
            className="ops-toolbar ui-control-row ui-control-row-lookup"
            onSubmit={async (e) => {
              e.preventDefault();
              setCopy(
                (await run({
                  action: 'COPY_ASSIGNMENTS',
                  data: { occurrenceId, fromOccurrenceId: Number(previous) },
                })) as NonNullable<typeof copy>,
              );
            }}
          >
            <Control label="Previous occurrence">
              {(id) => (
                <Select
                  id={id}
                  value={previous}
                  required
                  onChange={(e) => setPrevious(e.target.value)}
                >
                  <option value="">Choose earlier occurrence</option>
                  {data.occurrences
                    .filter(
                      (o) =>
                        new Date(o.startsAt) <
                        new Date(
                          data.occurrences.find((o) => o.id === occurrenceId)
                            ?.startsAt ?? '',
                        ),
                    )
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {date(o.startsAt)}
                      </option>
                    ))}
                </Select>
              )}
            </Control>
            <div className="ui-field-action">
              <Button
                type="submit"
                variant="primary"
                disabled={!plan || plan.state !== 'DRAFT'}
              >
                Prepare copy suggestions
              </Button>
            </div>
          </form>
          {copy && (
            <section>
              <h2 className="ui-section-title-dashboard">Draft copy review</h2>
              <p>
                {copy.proposals.length} suggestions · {copy.conflicts.length}{' '}
                conflicts · {copy.newVendors.length} Vendors needing placement
              </p>
              {copy.conflicts.map((c) => (
                <p key={c.directoryId}>
                  Business {c.directoryId}:{' '}
                  {c.reason.toLowerCase().replaceAll('_', ' ')}
                </p>
              ))}
              {copy.proposals.map((p) => (
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  key={p.directoryId}
                  onClick={() =>
                    run({ action: 'ASSIGN', data: { occurrenceId, ...p } })
                  }
                >
                  Confirm{' '}
                  {
                    data.directory?.find((d) => d.id === p.directoryId)?.contact
                      .businessName
                  }
                </Button>
              ))}
            </section>
          )}
        </>
      )}
      <Entry
        label="Search expected Vendors"
        type="search"
        value={search}
        onChange={setSearch}
      />
      <div
        className="ops-vendor-list ops-scroll-list"
        role="region"
        aria-label="Expected vendors"
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- Keyboard users need to scroll the bounded vendor list.
        tabIndex={0}
      >
        {approvals
          .filter((a) =>
            data.directory
              ?.find((d) => d.id === a.directoryId)
              ?.contact.businessName.toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((a) => (
            <details className="booth-list-item ui-disclosure" key={a.id}>
              <summary>
                <span>
                  {data.directory?.find((d) => d.id === a.directoryId)?.contact
                    .businessName ?? 'Unknown business'}
                </span>
                <span className="ops-vendor-booths">
                  {assignments
                    .filter((x) => x.approvalId === a.id)
                    .map((x) => x.spaceSnapshot.label)
                    .join(', ') || 'Needs a booth'}
                </span>
                <Chevron />
              </summary>
              <div className="booth-list-details ui-disclosure-content">
                <AssignmentCard
                  embedded
                  key={`${a.id}:${a.revision}:${assignments
                    .filter((x) => x.approvalId === a.id)
                    .map((x) => x.revision)
                    .join(':')}`}
                  approval={a}
                  data={data}
                  assignments={assignments.filter((x) => x.approvalId === a.id)}
                  run={run}
                  canAssign={canAssign}
                  canDay={canDay && day}
                  canBill={canBill}
                />
              </div>
            </details>
          ))}
      </div>
      {day && plan && canDay && (
        <Card as="section" className="ops-editor">
          <h2 className="ui-section-title-dashboard">Day closeout</h2>
          <p>
            {data.daySummary?.attendance.NOT_RECORDED ?? 0} attendance records
            missing · {data.billingSummary?.open ?? 0} unpaid invoices ·{' '}
            {data.daySummary?.unassigned ?? 0} unassigned Vendors ·{' '}
            {data.daySummary?.notes ?? 0} manager notes
          </p>
          <Button
            variant="secondary"
            size="compact"
            type="button"
            disabled={plan.operationsComplete}
            onClick={() =>
              run({
                action: 'CLOSE_DAY',
                id: plan.id,
                expectedRevision: plan.revision,
                data: {},
              })
            }
          >
            Mark day operations complete
          </Button>
        </Card>
      )}
    </>
  );
}
function AssignmentCard({
  approval: a,
  data,
  assignments,
  run,
  canAssign,
  canDay,
  canBill,
  initialSpaceId,
  embedded = false,
}: {
  approval: OccurrenceApproval;
  data: MarketOperationsData;
  assignments: SpaceAssignment[];
  run: Run;
  canAssign: boolean;
  canDay: boolean;
  canBill: boolean;
  initialSpaceId?: number;
  embedded?: boolean;
}) {
  const [selected, setSelected] = useState(
      assignments.find((a) => a.spaceId === initialSpaceId)?.id ??
        assignments[0]?.id ??
        0,
    ),
    [space, setSpace] = useState(
      String(initialSpaceId ?? assignments[0]?.spaceId ?? ''),
    ),
    [notes, setNotes] = useState(a.managerNotes),
    [multiple, setMultiple] = useState(false),
    [keep, setKeep] = useState(false);
  const assignment = assignments.find((x) => x.id === selected),
    plan = data.plans?.find((p) => p.occurrenceId === a.occurrenceId),
    booths =
      data.spaces?.filter((s) => s.layoutVersionId === plan?.layoutVersionId) ??
      [],
    prior =
      data.allocations
        ?.filter((r) => r.assignmentId === assignment?.id)
        .map((r) => r.snapshot) ?? [],
    submission = data.submissions?.find((s) => s.id === a.submissionId);
  const [rentals, setRentals] = useState<RentalSnapshot[]>(
    prior.length ? prior : (submission?.rentalRequests ?? []),
  );
  const invoice = data.invoices?.find(
      (i) => i.assignmentId === assignment?.id && i.status !== 'VOID',
    ),
    issued = invoice && invoice.status !== 'DRAFT';
  const update = (d: Record<string, unknown>) =>
    run({
      action: 'DAY_UPDATE',
      id: a.id,
      expectedRevision: a.revision,
      data: d,
    });
  return (
    <Card
      as="article"
      className="ops-day-card"
      surface={embedded ? 'embedded' : 'card'}
    >
      <h2 className="ui-section-title-dashboard">
        {
          data.directory?.find((d) => d.id === a.directoryId)?.contact
            .businessName
        }
      </h2>
      <p>
        {assignments.map((x) => x.spaceSnapshot.label).join(', ') ||
          'Needs a booth'}{' '}
        · {a.checkIn === 'CHECKED_IN' ? 'Checked in' : 'Not checked in'} ·{' '}
        {a.attendance.toLowerCase().replaceAll('_', ' ')}
      </p>
      {canDay && (
        <>
          <Button
            variant="secondary"
            size="compact"
            type="button"
            onClick={() =>
              update({
                checkIn:
                  a.checkIn === 'CHECKED_IN' ? 'NOT_CHECKED_IN' : 'CHECKED_IN',
              })
            }
          >
            {a.checkIn === 'CHECKED_IN' ? 'Undo check-in' : 'Check in'}
          </Button>
          <Control label="Final attendance">
            {(id) => (
              <Select
                id={id}
                value={a.attendance}
                onChange={(e) => update({ attendance: e.target.value })}
              >
                {[
                  'NOT_RECORDED',
                  'ATTENDED',
                  'APPROVED_ABSENCE',
                  'UNAPPROVED_ABSENCE',
                  'NO_SHOW',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase().replaceAll('_', ' ')}
                  </option>
                ))}
              </Select>
            )}
          </Control>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              return update({ managerNotes: notes });
            }}
          >
            <Entry
              label="Private occurrence notes"
              value={notes}
              onChange={setNotes}
            />
            <Button type="submit" variant="primary" size="compact">
              Save manager note
            </Button>
          </form>
        </>
      )}
      {canAssign && plan && (
        <form
          className="ops-assignment"
          onSubmit={(e) => {
            e.preventDefault();
            return run({
              action: 'ASSIGN',
              id: assignment?.id,
              expectedRevision: assignment?.revision,
              data: {
                occurrenceId: a.occurrenceId,
                directoryId: a.directoryId,
                spaceId: Number(space),
                rentals,
                allowMultipleSpaces: multiple,
                billingAction: keep ? 'KEEP' : null,
              },
            });
          }}
        >
          {assignments.length > 1 && (
            <Control label="Assignment to edit">
              {(id) => (
                <Select
                  id={id}
                  value={selected}
                  onChange={(e) => {
                    const row = assignments.find(
                      (x) => x.id === Number(e.target.value),
                    )!;
                    setSelected(row.id);
                    setSpace(String(row.spaceId));
                    setRentals(
                      data.allocations
                        ?.filter((r) => r.assignmentId === row.id)
                        .map((r) => r.snapshot) ?? [],
                    );
                  }}
                >
                  {assignments.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.spaceSnapshot.label}
                    </option>
                  ))}
                </Select>
              )}
            </Control>
          )}
          <Control label="Booth assignment">
            {(id) => (
              <Select
                id={id}
                required
                value={space}
                onChange={(e) => setSpace(e.target.value)}
              >
                <option value="">Choose booth</option>
                {booths.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={data.assignments?.some(
                      (x) =>
                        x.spaceId === s.id &&
                        x.occurrenceId === a.occurrenceId &&
                        x.id !== assignment?.id,
                    )}
                  >
                    {s.details.label} · {s.details.widthFeet} ×{' '}
                    {s.details.depthFeet} ft{' '}
                    {s.details.preferredDirectoryId === a.directoryId
                      ? ' · Preferred'
                      : ''}
                  </option>
                ))}
              </Select>
            )}
          </Control>
          {data.rentals
            ?.filter((r) => r.details.enabled)
            .map((r) => {
              const accepted = rentals.find((x) => x.optionId === r.id);
              return (
                <div key={r.id}>
                  <Entry
                    label={`${r.details.name} accepted quantity`}
                    type="number"
                    min={0}
                    max={r.details.maxQuantity}
                    value={accepted?.quantity ?? 0}
                    onChange={(v) =>
                      setRentals((rows) => [
                        ...rows.filter((x) => x.optionId !== r.id),
                        {
                          optionId: r.id,
                          quantity: Number(v),
                          unitMinor:
                            accepted?.unitMinor ?? r.details.priceMinor,
                          currency: accepted?.currency ?? r.details.currency,
                          name: accepted?.name ?? r.details.name,
                          requiredAmenity: r.details.requiredAmenity,
                        },
                      ])
                    }
                  />
                  {accepted && (
                    <Entry
                      label={`${r.details.name} accepted unit price in minor units`}
                      type="number"
                      min={0}
                      value={accepted.unitMinor}
                      onChange={(v) =>
                        setRentals((rows) =>
                          rows.map((x) =>
                            x.optionId === r.id
                              ? { ...x, unitMinor: Number(v) }
                              : x,
                          ),
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          {issued && (
            <Check
              label="Keep the issued invoice unchanged after this move or rental change"
              checked={keep}
              onChange={setKeep}
            />
          )}
          <Check
            label="Deliberately allocate an additional space"
            checked={multiple}
            onChange={setMultiple}
          />
          <div className="actions">
            <Button
              type="submit"
              variant="primary"
              size="compact"
              disabled={!!issued && !keep}
            >
              {assignment
                ? 'Save booth and rental changes'
                : 'Confirm booth and accepted rentals'}
            </Button>
            {assignment && (
              <Button
                variant="secondary"
                size="compact"
                type="button"
                onClick={() => {
                  setSelected(0);
                  setSpace('');
                  setMultiple(true);
                  setRentals([]);
                }}
              >
                Assign an additional space
              </Button>
            )}
          </div>
        </form>
      )}
      <p>
        Accepted rentals:{' '}
        {prior.map((r) => `${r.name} × ${r.quantity}`).join(', ') || 'None'}
      </p>
      {invoice && (
        <details className="ui-disclosure">
          <summary>
            Invoice {invoice.id}: {invoice.status.toLowerCase()}
          </summary>
          <div className="ui-disclosure-content">
            <Invoice
              key={`${invoice.id}:${invoice.revision}`}
              invoice={invoice}
              run={run}
              canManage={canBill}
            />
          </div>
        </details>
      )}
    </Card>
  );
}
