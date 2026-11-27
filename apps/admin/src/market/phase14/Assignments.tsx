import { MarketDialog as Dialog } from '../presentation';
import { useRef, useState } from 'react';
import type {
  MarketOperationsData,
  OccurrenceApproval,
  OperationsCommand,
  SpaceAssignment,
  RentalSnapshot,
  SpaceDetails,
} from '@market/api';
import {
  Alert,
  Button,
  Select,
  Card,
  MarketMap,
  ErrorState,
  UtilityIcon,
} from '@market/ui';
import { Check, Control, Entry, moneyLabel } from './common';
import { Invoice } from './Billing';
import { OccurrenceLayoutActions } from './OccurrenceLayoutActions';
import { boothStatus } from './booth-status';
import './assignment-rentals.css';
import './booth-dialog.css';
import { BoothDetailsFields } from './BoothDetailsFields';
import { useWizardDialogHeight } from '../../WizardProgress';
import { MinorPriceInput } from '../../PriceInput';
import { FarmstandIcon } from '@market/ui/farmstand';
import {
  amenityText,
  missingAmenities,
  requiredAmenities,
} from './booth-amenities';
export { boothStatus } from './booth-status';

type Run = (c: OperationsCommand) => Promise<unknown>;

/**
 * Why a directory business cannot be approved for the selected date, or null.
 * Verified platform Vendors need an approved membership and confirmed
 * attendance (the backend's rule); external businesses have no such check.
 */
export function approvalBlocker(
  data: MarketOperationsData,
  directoryId: number,
): string | null {
  const state = data.platformEligibility?.find(
    (e) => e.directoryId === directoryId,
  )?.state;
  const name =
    data.directory?.find((d) => d.id === directoryId)?.contact.businessName ??
    'This vendor';
  if (state === 'MEMBERSHIP_REQUIRED')
    return `${name} needs an approved market membership before it can be approved for a date.`;
  if (state === 'PARTICIPATION_CANCELLED')
    return `${name} cancelled attendance for this date. They need to confirm attendance again before you can approve them.`;
  if (state === 'PARTICIPATION_REQUIRED')
    return `${name} has not confirmed attendance for this date yet. You can approve them after they confirm.`;
  return null;
}
/** Short dropdown suffix for a business that cannot be approved yet. */
export function approvalBlockerLabel(
  data: MarketOperationsData,
  directoryId: number,
) {
  const state = data.platformEligibility?.find(
    (e) => e.directoryId === directoryId,
  )?.state;
  return state === 'MEMBERSHIP_REQUIRED'
    ? ' · Membership not approved'
    : state === 'PARTICIPATION_CANCELLED'
      ? ' · Attendance cancelled'
      : state === 'PARTICIPATION_REQUIRED'
        ? ' · Attendance not confirmed'
        : '';
}

/** One date's plan, layout, approvals, assignments and booths. */
export function occurrenceBooths(
  data: MarketOperationsData,
  occurrenceId: number,
) {
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId),
    version = data.layoutVersions?.find((v) => v.id === plan?.layoutVersionId),
    assignments =
      data.assignments?.filter((a) => a.occurrenceId === occurrenceId) ?? [],
    approvals =
      data.approvals?.filter((a) => a.occurrenceId === occurrenceId) ?? [],
    spaces =
      data.spaces?.filter((s) => s.layoutVersionId === version?.id) ?? [];
  return { plan, version, assignments, approvals, spaces };
}

/**
 * The date's booth map with assignment statuses, invoice/rental overlays and
 * booth facts. Shared by the Assignments workspace and the Market Day page.
 */
export function BoothMap({
  data,
  occurrenceId,
  selectedId,
  onSelect,
  showBoothList = true,
}: {
  data: MarketOperationsData;
  occurrenceId: number;
  selectedId: string;
  onSelect: (elementId: string) => void;
  /** Off where the page shows its own booth table. */
  showBoothList?: boolean;
}) {
  const { version, assignments, approvals, spaces } = occurrenceBooths(
    data,
    occurrenceId,
  );
  if (!version) return null;
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
    spaceType: s.details.spaceType,
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
        `${(invoice?.billingStatus ?? invoice?.status)?.toLowerCase().replaceAll('_', ' ') ?? 'No invoice'} · ${data.allocations?.filter((r) => r.assignmentId === a.id).reduce((n, r) => n + r.quantity, 0) ?? 0} rentals${approval?.managerNotes ? ' · Note' : ''}`,
      ];
    }),
  );
  return (
    <MarketMap
      key={`map:${version.id}`}
      boothListLimit={10}
      boothCards
      showBoothList={showBoothList}
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
      selectedId={selectedId}
      onSelect={(id) => {
        if (spaces.some((s) => s.elementId === id)) onSelect(id);
      }}
    />
  );
}

/**
 * Market Day map, vendor list and closeout. The Assignments route uses
 * `AssignmentsWorkspace`, which owns date approval, copying and the summary.
 */
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
  const [search, setSearch] = useState(''),
    [mapSelection, setMapSelection] = useState(''),
    [vendorDetail, setVendorDetail] = useState<number | null>(null);
  const { plan, version, assignments, approvals, spaces } = occurrenceBooths(
    data,
    occurrenceId,
  );
  const selectedBooth = spaces.find((s) => s.elementId === mapSelection);
  return (
    <>
      <Card as="section" className="attendance-map-card">
        <div className="attendance-map-actions">
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
                  {plan.state === 'PUBLISHED' ? 'Unpublish map' : 'Publish map'}
                </Button>
              )}
            </div>
          )}
        </div>
        {version && (
          <BoothMap
            data={data}
            occurrenceId={occurrenceId}
            selectedId={mapSelection}
            onSelect={setMapSelection}
          />
        )}
      </Card>
      {selectedBooth && (
        <BoothAssignmentDialog
          key={mapSelection}
          data={data}
          occurrenceId={occurrenceId}
          elementId={mapSelection}
          run={run}
          canAssign={canAssign}
          canDay={canDay && day}
          canBill={canBill}
          commandError={commandError}
          onClose={() => setMapSelection('')}
        />
      )}
      <Card as="section" className="attendance-vendors-card">
        <Entry
          label="Search vendors"
          type="search"
          value={search}
          onChange={setSearch}
        />
        <ul
          className="attendance-record-grid"
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
              <li key={a.id}>
                <Button
                  variant="disclosure"
                  onClick={() => setVendorDetail(a.id)}
                >
                  <span>
                    {assignments
                      .filter((x) => x.approvalId === a.id)
                      .map((x) => x.spaceSnapshot.label)
                      .join(', ')}
                    {assignments.some((x) => x.approvalId === a.id)
                      ? ' - '
                      : ''}
                    {data.directory?.find((d) => d.id === a.directoryId)
                      ?.contact.businessName ?? 'Unknown business'}
                  </span>
                  <span
                    className={`booth-state ${assignments.some((x) => x.approvalId === a.id) ? 'assigned' : 'unassigned'}`}
                  >
                    {assignments.some((x) => x.approvalId === a.id)
                      ? 'assigned'
                      : 'unassigned'}
                  </span>
                </Button>
                <Dialog
                  open={vendorDetail === a.id}
                  onClose={() => setVendorDetail(null)}
                  title={
                    data.directory?.find((d) => d.id === a.directoryId)?.contact
                      .businessName ?? 'Vendor'
                  }
                >
                  <AssignmentCard
                    embedded
                    key={`${a.id}:${a.revision}:${assignments
                      .filter((x) => x.approvalId === a.id)
                      .map((x) => x.revision)
                      .join(':')}`}
                    approval={a}
                    data={data}
                    assignments={assignments.filter(
                      (x) => x.approvalId === a.id,
                    )}
                    run={run}
                    canAssign={canAssign}
                    canDay={canDay && day}
                    canBill={canBill}
                  />
                </Dialog>
              </li>
            ))}
        </ul>
      </Card>
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
/**
 * One booth's assignment dialog: its details, the business dropdown, date
 * approval and the assignment form. Shared by the Assignments workspace and
 * the occurrence detail map; callers own the selection and command runner.
 */
export function BoothAssignmentDialog({
  data,
  occurrenceId,
  elementId,
  run,
  canAssign,
  canDay,
  canBill,
  commandError,
  onClose,
  presentation = 'dialog',
}: {
  data: MarketOperationsData;
  occurrenceId: number;
  elementId: string;
  run: Run;
  canAssign: boolean;
  canDay: boolean;
  canBill: boolean;
  commandError?: unknown;
  onClose: () => void;
  /** `panel` renders inline (the Assignments booth side panel). */
  presentation?: 'dialog' | 'panel';
}) {
  const mapSelection = elementId;
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId),
    assignments =
      data.assignments?.filter((a) => a.occurrenceId === occurrenceId) ?? [],
    approvals =
      data.approvals?.filter((a) => a.occurrenceId === occurrenceId) ?? [],
    spaces =
      data.spaces?.filter((s) => s.layoutVersionId === plan?.layoutVersionId) ??
      [];
  const selectedBooth = spaces.find((s) => s.elementId === elementId),
    selectedAssignment = assignments.find(
      (a) => a.spaceId === selectedBooth?.id,
    );
  const [mapDirectory, setMapDirectory] = useState(
    String(
      selectedAssignment?.directoryId ??
        selectedBooth?.details.preferredDirectoryId ??
        '',
    ),
  );
  // Edit swaps the dialog body for the booth details form; the dialog eases
  // between the two heights, as the wizard dialogs do.
  const [editing, setEditing] = useState<SpaceDetails | null>(null),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const captureHeight = useWizardDialogHeight(root, editing ? 'edit' : 'view');
  if (!selectedBooth) return null;
  const version = data.layoutVersions?.find(
    (v) => v.id === plan?.layoutVersionId,
  );
  const canEditBooth = canAssign && !!plan && !!version;
  function switchView(next: SpaceDetails | null) {
    captureHeight();
    setSaveError('');
    setEditing(next);
  }
  async function saveBooth() {
    if (!editing || !plan || !version || saving) return;
    setSaving(true);
    setSaveError('');
    const result = await run({
      action: 'SAVE_LAYOUT',
      id: version.id,
      expectedRevision: version.revision,
      data: {
        definition: version.definition,
        spaces: Object.fromEntries(
          spaces.map((s) => [
            s.elementId,
            s.elementId === elementId ? editing : s.details,
          ]),
        ),
        occurrenceId,
        expectedPlanRevision: plan.revision,
      },
    });
    setSaving(false);
    if (result) switchView(null);
    else
      setSaveError(
        'The booth could not be saved. Your changes are still here.',
      );
  }
  const title = editing
    ? `Edit booth ${selectedBooth.details.label}`
    : `Booth ${selectedBooth.details.label}`;
  const editButton = canEditBooth && !editing && (
    <Button
      variant="secondary"
      size="compact"
      type="button"
      onClick={() => switchView({ ...selectedBooth.details })}
    >
      <UtilityIcon name="edit" />
      Edit booth
    </Button>
  );
  const editActions = editing && (
    <>
      <Button
        variant="secondary"
        type="button"
        disabled={saving}
        onClick={() => switchView(null)}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        type="button"
        disabled={saving}
        onClick={saveBooth}
      >
        {saving ? 'Saving booth...' : 'Save booth'}
      </Button>
    </>
  );
  const body = editing ? (
    <div ref={root} key="edit" className="booth-dialog-view booth-edit">
      <p className="booth-modal-info">
        {selectedBooth.details.widthFeet} × {selectedBooth.details.depthFeet} ft
        · Changes apply to this market date only. Assignments and accepted
        rentals are kept.
      </p>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      {!!commandError && <ErrorState error={commandError} />}
      <BoothDetailsFields
        details={editing}
        data={data}
        onChange={(patch) =>
          setEditing((current) => current && { ...current, ...patch })
        }
      />
      {presentation === 'panel' && (
        <div className="ui-actions booth-edit-actions">{editActions}</div>
      )}
    </div>
  ) : (
    <div ref={root} key="view" className="booth-dialog-view">
      <p className="booth-modal-info">
        {selectedBooth.details.widthFeet} × {selectedBooth.details.depthFeet} ft
        ·{' '}
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
          Assigned to {selectedAssignment.businessSnapshot.businessName}. You
          can update its existing assignment below.
        </p>
      )}
      {canAssign ? (
        <>
          <div className="attendance-business-selector">
            <Control label="Business for selected booth">
              {(id) => (
                <Select
                  id={id}
                  value={mapDirectory}
                  onChange={(e) => setMapDirectory(e.target.value)}
                >
                  <option value="">Choose business</option>
                  {data.directory?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.contact.businessName}
                      {assignments.some((a) => a.directoryId === d.id)
                        ? ` · Assigned to Booth ${assignments
                            .filter((a) => a.directoryId === d.id)
                            .map((a) => a.spaceSnapshot.label)
                            .join(', ')}`
                        : ' · Unassigned'}
                      {approvals.some((a) => a.directoryId === d.id)
                        ? ''
                        : approvalBlockerLabel(data, d.id)}
                    </option>
                  ))}
                </Select>
              )}
            </Control>
          </div>
          {mapDirectory &&
            !approvals.some((a) => a.directoryId === Number(mapDirectory)) && (
              <Card as="div" className="dashboard-card">
                <p>
                  This business needs approval for this market date before it
                  can receive a booth.
                </p>
                {approvalBlocker(data, Number(mapDirectory)) && (
                  <Alert severity="warning">
                    {approvalBlocker(data, Number(mapDirectory))}
                  </Alert>
                )}
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  disabled={!!approvalBlocker(data, Number(mapDirectory))}
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
                assignments={assignments.filter((x) => x.approvalId === a.id)}
                run={run}
                canAssign={canAssign}
                canDay={canDay}
                canBill={canBill}
                embedded={presentation === 'panel'}
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
    </div>
  );
  if (presentation === 'panel')
    return (
      <section
        className="booth-panel"
        aria-label={title}
        aria-busy={saving}
        data-height-ease=""
      >
        <header className="booth-panel-header">
          <h2>
            <FarmstandIcon name="store" />
            {title}
          </h2>
          {editButton}
        </header>
        {body}
      </section>
    );
  return (
    <Dialog
      open
      title={title}
      focusTitle
      className="booth-dialog"
      busy={saving}
      onClose={onClose}
      headerActions={editButton || undefined}
      actions={editActions || undefined}
    >
      {body}
    </Dialog>
  );
}

export function AssignmentCard({
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
    [confirmAssignment, setConfirmAssignment] = useState(false),
    // Amenities the chosen booth lacks, awaiting the manager's choice.
    [amenityGap, setAmenityGap] = useState<string[] | null>(null),
    [allowMissing, setAllowMissing] = useState(false),
    [savingAssignment, setSavingAssignment] = useState(false),
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
  // What the vendor asked for on the application, shown first; every other
  // enabled rental sits in the Additional rentals disclosure.
  const requests = submission?.rentalRequests ?? [];
  const requestedRentals = (data.rentals ?? []).filter((r) =>
      requests.some((x) => x.optionId === r.id),
    ),
    additionalRentals = (data.rentals ?? []).filter(
      (r) => r.details.enabled && !requests.some((x) => x.optionId === r.id),
    );
  const rentalField = (
    r: NonNullable<MarketOperationsData['rentals']>[number],
  ) => {
    const accepted = rentals.find((x) => x.optionId === r.id),
      requested = requests.find((x) => x.optionId === r.id);
    return (
      <div className="assignment-rental" key={r.id}>
        <Entry
          label={`${r.details.name} quantity`}
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
                unitMinor: accepted?.unitMinor ?? r.details.priceMinor,
                currency: accepted?.currency ?? r.details.currency,
                name: accepted?.name ?? r.details.name,
                requiredAmenity: r.details.requiredAmenity,
              },
            ])
          }
        />
        {requested && (
          <p className="assignment-rental-requested">
            Requested {requested.quantity}
            {!r.details.enabled && ' · no longer offered'}
          </p>
        )}
        {accepted && (
          <Control label={`${r.details.name} price`}>
            {(id) => (
              <MinorPriceInput
                id={id}
                currency={accepted.currency}
                valueMinor={accepted.unitMinor}
                onMinorChange={(unitMinor) =>
                  setRentals((rows) =>
                    rows.map((x) =>
                      x.optionId === r.id ? { ...x, unitMinor } : x,
                    ),
                  )
                }
              />
            )}
          </Control>
        )}
      </div>
    );
  };
  const otherAssignments = assignments.filter(
    (x) => x.spaceId !== Number(space),
  );
  const required = requiredAmenities(
    a.requirements ?? submission?.requirements,
    rentals,
  );
  /** After any amenity gap is accepted: ask about an existing booth, or save. */
  function proceed(allow: boolean) {
    setAllowMissing(allow);
    if (otherAssignments.length && assignment?.spaceId !== Number(space)) {
      setConfirmAssignment(true);
      return;
    }
    return saveAssignment(false, allow);
  }
  async function saveAssignment(additional = false, allow = allowMissing) {
    if (savingAssignment) return;
    setSavingAssignment(true);
    try {
      await run({
        action: 'ASSIGN',
        id: additional ? undefined : assignment?.id,
        expectedRevision: additional ? undefined : assignment?.revision,
        data: {
          occurrenceId: a.occurrenceId,
          directoryId: a.directoryId,
          spaceId: Number(space),
          rentals,
          allowMultipleSpaces: additional,
          billingAction: keep ? 'KEEP' : null,
          allowMissingAmenities: allow,
        },
      });
    } finally {
      setSavingAssignment(false);
      setConfirmAssignment(false);
    }
  }
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
          'Needs a booth'}
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
            const missing = missingAmenities(
              required,
              booths.find((s) => s.id === Number(space))?.details.amenities ??
                [],
            );
            if (missing.length) {
              setAmenityGap(missing);
              return;
            }
            return proceed(false);
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
          {requestedRentals.length > 0 ? (
            <section
              className="assignment-rentals"
              aria-label="Requested rentals"
            >
              <h3>Requested rentals</h3>
              <div className="assignment-rental-grid">
                {requestedRentals.map(rentalField)}
              </div>
            </section>
          ) : (
            <p className="assignment-rentals-none">
              {submission
                ? 'No rentals were requested on the application.'
                : 'No application is linked, so no rentals were requested.'}
            </p>
          )}
          {additionalRentals.length > 0 && (
            <details
              className="ui-disclosure assignment-rentals-more"
              open={additionalRentals.some((r) =>
                rentals.some((x) => x.optionId === r.id && x.quantity > 0),
              )}
            >
              <summary>Additional rentals ({additionalRentals.length})</summary>
              <div className="ui-disclosure-content assignment-rental-grid">
                {additionalRentals.map(rentalField)}
              </div>
            </details>
          )}
          {issued && (
            <Check
              label="Keep the issued invoice unchanged after this move or rental change"
              checked={keep}
              onChange={setKeep}
            />
          )}
          <div className="ui-actions attendance-assignment-actions">
            <Button
              type="submit"
              variant="primary"
              size="compact"
              disabled={savingAssignment || (!!issued && !keep)}
            >
              {assignment
                ? 'Save booth and rental changes'
                : 'Confirm booth and accepted rentals'}
            </Button>
          </div>
        </form>
      )}
      <Dialog
        open={confirmAssignment}
        title="Vendor already has a booth"
        size="standard"
        className="farmstand-controls"
        busy={savingAssignment}
        onClose={() => setConfirmAssignment(false)}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={savingAssignment}
              onClick={() => saveAssignment(true)}
            >
              Keep existing booth and add this booth
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={savingAssignment}
              onClick={() => saveAssignment()}
            >
              Move to this booth
            </Button>
          </>
        }
      >
        <p>
          This vendor is already assigned to Booth{' '}
          {otherAssignments.map((x) => x.spaceSnapshot.label).join(', ')} for
          this market date. Move their selected assignment to Booth{' '}
          {booths.find((s) => s.id === Number(space))?.details.label}, or keep
          their existing booth and add this one.
        </p>
      </Dialog>
      <Dialog
        open={!!amenityGap}
        title="Booth is missing requested amenities"
        size="standard"
        className="farmstand-controls"
        busy={savingAssignment}
        onClose={() => setAmenityGap(null)}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={savingAssignment}
              onClick={() => setAmenityGap(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={savingAssignment}
              onClick={() => {
                setAmenityGap(null);
                void proceed(true);
              }}
            >
              Assign booth
            </Button>
          </>
        }
      >
        <p>
          Booth {booths.find((s) => s.id === Number(space))?.details.label}{' '}
          doesn&apos;t have the requested amenities:{' '}
          <strong>{amenityText(amenityGap ?? [])}</strong>. Would you still like
          to assign this vendor to it?
        </p>
      </Dialog>
      <div className="assignment-rentals-summary">
        <span>Required amenities:</span>
        {required.length ? (
          <span>{amenityText(required)}</span>
        ) : (
          <span className="assignment-rentals-summary-none">None</span>
        )}
      </div>
      <div className="assignment-rentals-summary">
        <span>Rentals:</span>
        {prior.length ? (
          <ul>
            {prior.map((r) => (
              <li key={r.optionId}>
                {r.name} <strong>× {r.quantity}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <span className="assignment-rentals-summary-none">None</span>
        )}
      </div>
      {invoice && (
        <details className="ui-disclosure assignment-invoice">
          <summary>
            Invoice {invoice.id}: {invoice.status.toLowerCase()}
          </summary>
          <div className="ui-disclosure-content">
            <Invoice
              key={invoice.id}
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
