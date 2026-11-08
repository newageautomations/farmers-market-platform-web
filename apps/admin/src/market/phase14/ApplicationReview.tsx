import {
  Fact,
  Panel,
  SubmittedInformation,
} from '../../vendor/application-detail';
import { ApplicationInformationReview } from './ApplicationInformationReview';
import { buttonClassName } from '@market/ui/presentation';
import { useEffect, useRef, useState } from 'react';
import type {
  ApplicationSubmission,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import {
  Button,
  Card,
  Select,
  SelectField,
  Tabs,
  Dropdown,
  ApplicationFields,
  ApplicationOnboarding,
  UtilityIcon,
} from '@market/ui';
import { date } from '../common';
import {
  friendlyLabel,
  SearchSelect,
  StatusBadge,
  statusTone,
  MarketDialog,
} from '../presentation';
import { Entry, Check } from './common';
import { DocumentStatus } from '@market/ui/documents';

function statusColors(value: string) {
  const tone = statusTone(value);
  return {
    backgroundColor: `var(--status-${tone}-bg)`,
    color: `var(--status-${tone}-fg)`,
  };
}

export function ApplicationReview({
  submission: s,
  data,
  run,
  canManage,
  canConfirmDates = false,
  canBilling = false,
  canRequestDocuments = false,
  onSaved,
  onBusy,
  onRefresh,
  onDirty,
  page = false,
}: {
  submission: ApplicationSubmission;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates?: boolean;
  canBilling?: boolean;
  canRequestDocuments?: boolean;
  onRefresh?: () => void;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  onDirty?: (dirty: boolean) => void;
  page?: boolean;
}) {
  const [status, setStatus] = useState(s.status),
    [notes, setNotes] = useState(s.managerNotes),
    [directory, setDirectory] = useState(String(s.directoryId ?? '')),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const [conditional, setConditional] = useState(
    s.conditionalAcceptance ?? false,
  );
  const decisions =
    data.approvals?.filter((a) => a.submissionId === s.id) ?? [];
  const documentVendorId =
    s.onboarding?.platformVendorId ?? s.applicantVendorId;
  const editable =
    canManage &&
    !['DECLINED', 'WITHDRAWN'].includes(s.status) &&
    (s.status !== 'ACCEPTED' || status !== 'ACCEPTED');
  const terminal = ['DECLINED', 'WITHDRAWN'].includes(s.status);
  const activeRequest = s.informationRequests?.some((r) =>
    ['AWAITING_RESPONSE', 'RESPONDED'].includes(r.status),
  );
  const [requestDirty, setRequestDirty] = useState(false);
  const decisionDirty =
    status !== s.status ||
    directory !== String(s.directoryId ?? '') ||
    conditional !== (s.conditionalAcceptance ?? false) ||
    reviewed;
  const dirty = notes !== s.managerNotes || decisionDirty || requestDirty;
  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty, onDirty]);
  const [desktop, setDesktop] = useState(
    () => window.matchMedia?.('(min-width: 1100px)').matches ?? true,
  );
  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 1100px)');
    if (!query) return;
    const change = () => setDesktop(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  async function relatedCommand(command: OperationsCommand) {
    const reviewDirty = notes !== s.managerNotes || decisionDirty;
    if (
      reviewDirty &&
      !window.confirm(
        'This action refreshes the application. Discard unsaved notes and decision changes and continue?',
      )
    )
      return undefined;
    setBusy(true);
    onBusy(true);
    try {
      return await run(command);
    } finally {
      setBusy(false);
      onBusy(false);
      setConfirming(false);
    }
  }
  const notesOnly = useRef(false);
  const [confirming, setConfirming] = useState(false);
  async function save(onlyNotes = false) {
    notesOnly.current = onlyNotes;
    setBusy(true);
    onBusy(true);
    setFailed(false);
    try {
      const result = await run({
        action: 'REVIEW_APPLICATION',
        id: s.id,
        expectedRevision: s.revision,
        data: {
          status: onlyNotes ? s.status : status,
          conditionalAcceptance: onlyNotes
            ? (s.conditionalAcceptance ?? false)
            : conditional,
          managerNotes: notes,
          directoryId: onlyNotes
            ? s.directoryId
            : directory
              ? Number(directory)
              : null,
          reviewedOccurrenceIds:
            !onlyNotes && reviewed ? decisions.map((d) => d.occurrenceId) : [],
        },
      });
      if (result == null) setFailed(true);
      else {
        onDirty?.(false);
        onSaved();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      onBusy(false);
      setConfirming(false);
    }
  }
  if (page)
    return (
      <div className="application-detail-columns submission-review-columns">
        <div
          className="application-detail-main"
          aria-label="Original submitted answers"
        >
          <SubmittedInformation
            detail={{ definition: s.definitionSnapshot, answers: s.answers }}
          />
        </div>
        <aside
          className="application-detail-sidebar"
          aria-label="Application details and actions"
        >
          {detailsPanel()}
        </aside>
      </div>
    );
  return (
    <div className="application-review-panels">
      <Tabs
        split={desktop}
        items={[
          { label: 'Submitted Answers', content: answersPanel() },
          { label: 'Details & Actions', content: detailsPanel() },
        ]}
      />
    </div>
  );
  function answersPanel() {
    return (
      <section aria-label="Original submitted answers">
        <ApplicationFields
          definition={s.definitionSnapshot}
          answers={s.answers}
          readOnly
          compact
        />
      </section>
    );
  }
  function detailsPanel() {
    return (
      <div className="application-review-inspector">
        <Panel icon={{ utility: 'user' }} title="Applicant information">
          <div className="submission-review-panel-body">
            <dl className="application-detail-summary submission-applicant-facts">
              <Fact icon={{ utility: 'user' }} label="Contact">
                {[s.applicant.firstName, s.applicant.lastName]
                  .filter(Boolean)
                  .join(' ') || 'Not provided'}
              </Fact>
              <Fact icon={{ utility: 'email' }} label="Email">
                {s.applicant.email || 'Not provided'}
              </Fact>
              {s.applicant.phone && (
                <Fact icon={{ utility: 'phone' }} label="Phone">
                  {s.applicant.phone}
                </Fact>
              )}
              <Fact icon={{ farmstand: 'tag' }} label="Category">
                {s.applicant.category || 'Not provided'}
              </Fact>
              <Fact icon={{ utility: 'user' }} label="Identity">
                {friendlyLabel(s.identityMode ?? 'LEGACY_UNKNOWN')}
              </Fact>
              <Fact icon={{ farmstand: 'store' }} label="Platform vendor">
                {s.applicantVendorId ?? 'Not linked'}
              </Fact>
              {s.onboarding?.platformVendorId && (
                <Fact
                  icon={{ farmstand: 'circle-check' }}
                  label="Verified vendor"
                >
                  {s.onboarding.platformVendorId}
                </Fact>
              )}
              {s.directoryId && (
                <Fact icon={{ farmstand: 'store' }} label="Market business">
                  {data.directory?.find((d) => d.id === s.directoryId)?.contact
                    .businessName ?? `Directory record ${s.directoryId}`}
                </Fact>
              )}
            </dl>
          </div>
        </Panel>
        <Panel
          icon={{ utility: 'calendar' }}
          title="Requested dates and rentals"
        >
          <div className="submission-review-panel-body">
            <section>
              {s.requestedOccurrenceIds.length ? (
                <ul>
                  {s.requestedOccurrenceIds.map((id) => (
                    <li key={id}>
                      {date(
                        data.occurrences.find((o) => o.id === id)?.startsAt,
                        data.timeZone,
                      )}{' '}
                      ·{' '}
                      <StatusBadge>
                        {decisions.find((d) => d.occurrenceId === id)
                          ?.decision ?? 'PENDING'}
                      </StatusBadge>
                      <p>
                        {s.rentalRequests
                          .filter((r) => r.quantity > 0)
                          .map((r) => `${r.name}: ${r.quantity}`)
                          .join(', ') || 'No rentals requested.'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No dates requested.</p>
              )}
            </section>
            {s.status === 'ACCEPTED' && (
              <>
                <fieldset disabled={!canConfirmDates || busy || requestDirty}>
                  <legend>Requested dates</legend>
                  <p>
                    Date confirmation records attendance approval without
                    reserving or guaranteeing a booth. Booth compatibility and
                    availability are checked when assigning.
                  </p>
                  {s.requestedOccurrenceIds.map((id) => (
                    <DateDecision
                      key={id}
                      submission={s}
                      occurrenceId={id}
                      data={data}
                      run={relatedCommand}
                      canBilling={canBilling}
                    />
                  ))}
                </fieldset>
                {canConfirmDates && (
                  <a
                    className={buttonClassName({
                      variant: 'secondary',
                      className: 'button secondary',
                    })}
                    href={`/market/assignments?directory=${s.directoryId}&channel=${new URLSearchParams(window.location.search).get('channel') ?? ''}`}
                  >
                    Assign confirmed dates
                  </a>
                )}
              </>
            )}
          </div>
        </Panel>
        <Panel
          icon={{ utility: 'document-check' }}
          title="Documents and compliance"
        >
          <div className="submission-review-panel-body">
            {s.documentation && (
              <>
                <DocumentStatus value={s.documentation.status} />
                {s.documentation.total > 0 && (
                  <p>
                    Documents: {s.documentation.complete} of{' '}
                    {s.documentation.total} complete. Missing:{' '}
                    {s.documentation.missing}. Awaiting review:{' '}
                    {s.documentation.pending}. Expired:{' '}
                    {s.documentation.expired}. Rejected:{' '}
                    {s.documentation.rejected}.
                  </p>
                )}
                {s.documentation.outstanding.length > 0 && (
                  <p>Outstanding: {s.documentation.outstanding.join(', ')}</p>
                )}
                <p>
                  Documentation readiness is separate from acceptance and does
                  not change attendance.
                </p>
                <a
                  className={buttonClassName({ variant: 'secondary' })}
                  href={`/market/documents?vendor=${documentVendorId ?? ''}&channel=${new URLSearchParams(window.location.search).get('channel') ?? ''}`}
                >
                  Review document readiness
                </a>
                {canRequestDocuments && s.applicantVendorId && (
                  <a
                    className={buttonClassName({ variant: 'secondary' })}
                    href={`/market/documents?vendor=${s.applicantVendorId}&request=1`}
                  >
                    Request an additional document
                  </a>
                )}
              </>
            )}
            {!s.documentation && <p>Document readiness unavailable.</p>}
          </div>
        </Panel>
        <Dropdown
          label={
            <span className="application-review-card-heading">
              <UtilityIcon name="email" />
              <span>Additional information requests and amendments</span>
            </span>
          }
          open={s.informationRequests?.some((r) =>
            ['AWAITING_RESPONSE', 'RESPONDED'].includes(r.status),
          )}
        >
          <ApplicationInformationReview
            onRefresh={onRefresh}
            onDirty={setRequestDirty}
            submission={s}
            run={relatedCommand}
            canManage={canManage}
            canRequestDocuments={canRequestDocuments}
            onBusy={(value) => {
              setBusy(value);
              onBusy(value);
            }}
          />
        </Dropdown>
        <Dropdown
          label={
            <span className="application-review-card-heading">
              <UtilityIcon name="refresh" />
              <span>Application history</span>
            </span>
          }
        >
          <section aria-label="Application history">
            <p>
              Internal notes stay in the private notes area. This timeline lists
              application and date events.
            </p>
            <ul>
              {s.history?.map((h) => (
                <li key={h.id}>
                  {date(h.at, data.timeZone)} · {friendlyLabel(h.event)}
                  {h.status && h.status !== h.event
                    ? ` · ${friendlyLabel(h.status)}`
                    : ''}
                  {h.occurrenceId ? ` · Market date ${h.occurrenceId}` : ''}
                  {h.actorId ? ` · Actor ${h.actorId}` : ''}
                </li>
              ))}
            </ul>
          </section>
        </Dropdown>
        <Panel icon={{ utility: 'notebook' }} title="Private manager notes">
          <div className="submission-review-panel-body">
            <p>
              Private Manager Notes are visible only to authorized managers.
              Applicants cannot see these notes or the private decision reason.
            </p>
            {editable ? (
              <fieldset disabled={busy}>
                <Entry
                  label="Private Manager Notes and decision reason"
                  value={notes}
                  onChange={setNotes}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    busy ||
                    s.status === 'ACCEPTED' ||
                    notes === s.managerNotes ||
                    requestDirty ||
                    decisionDirty
                  }
                  onClick={() => void save(true)}
                >
                  Save notes
                </Button>
                {decisionDirty && (
                  <p>Save the decision below to include these notes.</p>
                )}
              </fieldset>
            ) : (
              <p>{s.managerNotes || 'No private notes recorded.'}</p>
            )}
          </div>
        </Panel>
        {s.onboarding && (
          <Dropdown
            label={
              <span className="application-review-card-heading">
                <UtilityIcon name="check" />
                <span>Next steps after acceptance</span>
              </span>
            }
          >
            <ApplicationOnboarding summary={s.onboarding} />
          </Dropdown>
        )}
        <Panel icon={{ utility: 'check' }} title="Application decision">
          <div className="submission-review-panel-body">
            {canManage && !terminal ? (
              <fieldset disabled={busy || activeRequest || requestDirty}>
                <p>
                  Acceptance approves the business for consideration. Confirm
                  dates separately, then assign compatible booths and review
                  billing.
                </p>
                {status === 'ACCEPTED' && (
                  <Check
                    label="Accept conditionally while required documentation remains outstanding"
                    checked={conditional}
                    onChange={setConditional}
                  />
                )}
                {status === 'ACCEPTED' && s.status !== 'ACCEPTED' && (
                  <SearchSelect
                    label="Existing Market Business"
                    value={directory}
                    onChange={setDirectory}
                    placeholder="Create a directory business"
                    allowClear
                    clearLabel="Create a directory business instead"
                    options={(data.directory ?? [])
                      .filter((d) =>
                        s.applicantVendorId
                          ? d.linkedVendorId === s.applicantVendorId &&
                            d.linkState === 'LINK_VERIFIED'
                          : !d.linkedVendorId,
                      )
                      .map((d) => ({
                        value: String(d.id),
                        label: `${d.contact.businessName} (${d.linkState === 'LINK_VERIFIED' ? 'Verified platform Vendor' : 'External directory record'})`,
                      }))}
                  />
                )}
                {status === 'ACCEPTED' && s.status !== 'ACCEPTED' && (
                  <p>
                    Choose an existing market business record if this applicant
                    is already in your market directory. Otherwise, a new record
                    can be created during acceptance.
                  </p>
                )}
                <SelectField
                  label="Application status"
                  value={status}
                  style={statusColors(status)}
                  onChange={(e) => {
                    setStatus(e.target.value as typeof status);
                    setConfirming(false);
                  }}
                >
                  <option value={s.status} style={statusColors(s.status)}>
                    {friendlyLabel(s.status)}
                  </option>
                  {[
                    'UNDER_REVIEW',
                    'WAITLISTED',
                    'ACCEPTED',
                    'DECLINED',
                    'WITHDRAWN',
                  ]
                    .filter((value) => value !== s.status)
                    .map((value) => (
                      <option
                        key={value}
                        value={value}
                        style={statusColors(value)}
                      >
                        {friendlyLabel(value)}
                      </option>
                    ))}
                </SelectField>
                {s.status === 'ACCEPTED' && decisions.length > 0 && (
                  <Check
                    label="I reviewed the affected dates and their obligations. Historical records must stay intact."
                    checked={reviewed}
                    onChange={setReviewed}
                  />
                )}
                <Button
                  type="button"
                  disabled={
                    busy ||
                    status === s.status ||
                    (s.status === 'ACCEPTED' &&
                      decisions.length > 0 &&
                      !reviewed)
                  }
                  onClick={() => setConfirming(true)}
                >
                  Review decision
                </Button>
                <MarketDialog
                  open={confirming}
                  busy={busy}
                  title="Confirm application decision"
                  onClose={() => setConfirming(false)}
                >
                  {() => (
                    <>
                      <p>
                        Change {s.applicant.businessName} to{' '}
                        {friendlyLabel(status)}? The private decision reason
                        uses the manager notes above.
                      </p>
                      <div className="ui-actions">
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => void save()}
                        >
                          Confirm decision
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setConfirming(false)}
                        >
                          Keep reviewing
                        </Button>
                      </div>
                    </>
                  )}
                </MarketDialog>
              </fieldset>
            ) : (
              <p>
                <StatusBadge>{s.status}</StatusBadge> This application is
                read-only.
              </p>
            )}
            {(activeRequest || requestDirty) && (
              <p>
                Resolve or cancel the current information request and finish any
                draft before changing the application decision.
              </p>
            )}
            {failed && (
              <p className="alert ui-alert ui-alert-error" role="alert">
                {notesOnly.current
                  ? 'The private notes could not be saved.'
                  : 'The decision could not be saved. Confirmed dates and active obligations must be reviewed and resolved explicitly before withdrawing acceptance.'}
              </p>
            )}
          </div>
        </Panel>
      </div>
    );
  }
}
function DateDecision({
  submission,
  occurrenceId,
  data,
  run,
  canBilling,
}: {
  submission: ApplicationSubmission;
  occurrenceId: number;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canBilling: boolean;
}) {
  const [reviewStartedAt] = useState(() => Date.now());
  const approval = data.approvals?.find(
    (a) => a.submissionId === submission.id && a.occurrenceId === occurrenceId,
  );
  const [decision, setDecision] = useState(approval?.decision ?? 'PENDING'),
    [reason, setReason] = useState(''),
    [release, setRelease] = useState(false),
    [voidDraft, setVoidDraft] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const occurrence = data.occurrences.find((o) => o.id === occurrenceId);
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId);
  const directory = data.directory?.find(
    (d) => d.id === submission.directoryId,
  );
  const compatible = data.spaces?.filter(
    (space) =>
      space.layoutVersionId === plan?.layoutVersionId &&
      space.details.widthFeet >= submission.requirements.widthFeet &&
      space.details.depthFeet >= submission.requirements.depthFeet &&
      (!submission.requirements.electricity ||
        space.details.amenities.includes('ELECTRICITY')) &&
      (!submission.requirements.vehicle ||
        space.details.amenities.includes('VEHICLE')) &&
      (!submission.requirements.foodTruck ||
        space.details.amenities.includes('FOOD_TRUCK')) &&
      !data.assignments?.some(
        (a) => a.occurrenceId === occurrenceId && a.spaceId === space.id,
      ),
  );
  return (
    <Card as="div" className="ops-section">
      <p>
        {date(occurrence?.startsAt, data.timeZone)} ·{' '}
        {friendlyLabel(approval?.decision ?? 'PENDING')}
      </p>
      <p>
        {submission.requirements.widthFeet <= 0 ||
        submission.requirements.depthFeet <= 0
          ? 'Booth dimensions are incomplete. Review requirements before assignment.'
          : !plan || !data.spaces
            ? 'Booth availability has not been checked.'
            : compatible?.length
              ? 'Compatible space is currently available. It has not been reserved.'
              : 'No compatible space is currently available.'}
      </p>
      <label className="ops-field">
        Date decision
        <Select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          disabled={
            busy ||
            (!!occurrence && Date.parse(occurrence.startsAt) <= reviewStartedAt)
          }
        >
          {['PENDING', 'CONFIRMED', 'WAITLISTED', 'DECLINED', 'CANCELLED'].map(
            (d) => (
              <option key={d} value={d}>
                {friendlyLabel(d)}
              </option>
            ),
          )}
        </Select>
      </label>
      <Entry
        label="Date decision reason"
        required={false}
        value={reason}
        onChange={setReason}
      />
      {directory?.linkState === 'LINK_VERIFIED' &&
        approval &&
        !approval.participationId && (
          <>
            <p>
              This date was originally external. A verified Market membership
              and an existing confirmed canonical participation are required
              before explicitly associating this future date.
            </p>
            <Button
              variant="secondary"
              size="compact"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setFailed(false);
                try {
                  const result = await run({
                    action: 'CONVERT_OCCURRENCE_IDENTITY',
                    id: approval.id,
                    expectedRevision: approval.revision,
                    data: {},
                  });
                  setFailed(result === null || result === undefined);
                } catch {
                  setFailed(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Associate existing canonical participation
            </Button>
          </>
        )}
      {decision === 'CANCELLED' && (
        <>
          <Check
            label="Release active booth assignments and retain their history"
            checked={release}
            onChange={setRelease}
          />
          {canBilling && (
            <Check
              label="Void draft invoices and retain their snapshots"
              checked={voidDraft}
              onChange={setVoidDraft}
            />
          )}
          <p>
            Issued or paid invoices must be resolved through billing before
            cancellation.
          </p>
        </>
      )}
      <Button
        variant="secondary"
        size="compact"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            const result = await run({
              action: 'REVIEW_OCCURRENCE',
              expectedRevision: approval?.revision,
              data: {
                submissionId: submission.id,
                occurrenceId,
                decision,
                reason,
                releaseAssignments: release,
                voidDraftInvoices: voidDraft,
              },
            });
            setFailed(result === null || result === undefined);
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving date' : 'Save date decision'}
      </Button>
      {failed && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          This date decision could not be saved. Check canonical participation
          and any assignment or billing obligations.
        </p>
      )}
    </Card>
  );
}
