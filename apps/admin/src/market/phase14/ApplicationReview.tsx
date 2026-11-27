import {
  Fact,
  Panel,
  SubmittedInformation,
} from '../../vendor/application-detail';
import { ApplicationInformationReview } from './ApplicationInformationReview';
import { buttonClassName } from '@market/ui/presentation';
import { useEffect, useRef, useState } from 'react';
import { RequestedDates } from './RequestedDates';
import type {
  ApplicationSubmission,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import {
  Button,
  Tabs,
  Dropdown,
  ApplicationFields,
  ApplicationOnboarding,
  UtilityIcon,
  Badge,
} from '@market/ui';
import { platformName } from '@market/config';
import { date } from '../common';
import {
  friendlyLabel,
  SearchSelect,
  StatusBadge,
  MarketDialog,
} from '../presentation';
import { Entry, Check } from './common';
import { DocumentStatus } from '@market/ui/documents';

const decisionTitles: Record<string, string> = {
  ACCEPTED: 'Accept application',
  WAITLISTED: 'Waitlist application',
  DECLINED: 'Deny application',
};

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
  runBatch,
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
  /** Runs several commands with one refresh at the end (date decisions). */
  runBatch?: (commands: OperationsCommand[]) => Promise<boolean[]>;
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
  async function batch(commands: OperationsCommand[]) {
    setBusy(true);
    onBusy(true);
    try {
      if (runBatch) return await runBatch(commands);
      const results: boolean[] = [];
      for (const command of commands) {
        try {
          results.push((await run(command)) != null);
        } catch {
          results.push(false);
        }
      }
      return results;
    } finally {
      setBusy(false);
      onBusy(false);
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
  /** The three manager decisions; other statuses come from the applicant
   * (Withdrawn) or from information requests (Needs info, Under review). */
  function choose(next: 'ACCEPTED' | 'WAITLISTED' | 'DECLINED') {
    setStatus(next);
    setReviewed(false);
    setConditional(false);
    setConfirming(true);
  }
  // Required documents not yet approved, waived or excepted.
  const outstandingDocuments = s.documentation?.outstanding ?? [];
  function closeDecision() {
    setConfirming(false);
    setStatus(s.status);
    setReviewed(false);
    setConditional(s.conditionalAcceptance ?? false);
    setDirectory(String(s.directoryId ?? ''));
  }
  // Page: the applicant, the dates table and the answers in the main
  // column; decisions and other actions in the side panel.
  if (page)
    return (
      <div className="application-detail-columns submission-review-columns">
        <div className="application-detail-main">
          <div aria-label="Original submitted answers">
            <SubmittedInformation
              detail={{ definition: s.definitionSnapshot, answers: s.answers }}
              lead={accountFact()}
            />
          </div>
          {datesPanel()}
          {historyDropdown()}
        </div>
        <aside
          className="application-detail-sidebar application-review-inspector"
          aria-label="Application actions"
        >
          {decisionPanel()}
          {notesPanel()}
          {documentsPanel()}
          {requestsDropdown()}
          {onboardingDropdown()}
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
  /** Whether the applicant applied signed in to a platform account. */
  function accountFact() {
    const verified = ['ACCOUNT_ONLY', 'AUTHORIZED_VENDOR'].includes(
      s.identityMode ?? '',
    );
    return (
      <Fact icon={{ utility: 'user' }} label={`${platformName} account`}>
        {verified ? (
          <Badge tone="success" className="submission-account-badge">
            <UtilityIcon name="check" />
            Verified user
          </Badge>
        ) : (
          'No'
        )}
      </Fact>
    );
  }
  function answersPanel() {
    return (
      <section aria-label="Original submitted answers">
        <dl className="application-detail-summary">{accountFact()}</dl>
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
        {datesPanel()}
        {documentsPanel()}
        {requestsDropdown()}
        {historyDropdown()}
        {notesPanel()}
        {onboardingDropdown()}
        {decisionPanel()}
      </div>
    );
  }
  function datesPanel() {
    return (
      <Panel
        icon={{ utility: 'calendar' }}
        title="Requested dates and rentals"
        className="requested-dates-panel"
      >
        {s.status !== 'ACCEPTED' && s.requestedOccurrenceIds.length > 0 && (
          <p className="application-detail-note requested-dates-gate">
            Accept the application to confirm, waitlist or decline these dates.
          </p>
        )}
        <RequestedDates
          submission={s}
          data={data}
          canDecide={canConfirmDates && s.status === 'ACCEPTED'}
          canBilling={canBilling}
          busy={busy || requestDirty}
          runBatch={batch}
        />
      </Panel>
    );
  }
  function documentsPanel() {
    return (
      <>
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
                <div className="submission-document-actions">
                  <a
                    className={buttonClassName({ variant: 'secondary' })}
                    href={`/market/documents?vendor=${documentVendorId ?? ''}&channel=${new URLSearchParams(window.location.search).get('channel') ?? ''}`}
                  >
                    Review compliance
                  </a>
                  {canRequestDocuments && s.applicantVendorId && (
                    <a
                      className={buttonClassName({ variant: 'primary' })}
                      href={`/market/documents?vendor=${s.applicantVendorId}&request=1`}
                    >
                      Request documents
                    </a>
                  )}
                </div>
              </>
            )}
            {!s.documentation && <p>Document readiness unavailable.</p>}
          </div>
        </Panel>
      </>
    );
  }
  function requestsDropdown() {
    return (
      <>
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
      </>
    );
  }
  function historyDropdown() {
    return (
      <>
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
      </>
    );
  }
  function notesPanel() {
    return (
      <>
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
      </>
    );
  }
  function onboardingDropdown() {
    return (
      <>
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
      </>
    );
  }
  function decisionPanel() {
    return (
      <>
        <Panel icon={{ utility: 'check' }} title="Application decision">
          <div className="submission-review-panel-body">
            {canManage && !terminal ? (
              <fieldset disabled={busy || activeRequest || requestDirty}>
                <p>
                  {s.applicantVendorId
                    ? 'Accepting approves the business and makes this vendor an approved member of your market.'
                    : 'This applicant has no platform vendor account, so accepting adds the business to your market directory only.'}{' '}
                  Then confirm dates in Requested dates and assign compatible
                  booths.
                </p>
                <p className="submission-decision-current">
                  Current status <StatusBadge>{s.status}</StatusBadge>
                </p>
                <div className="submission-decision-actions">
                  <Button
                    type="button"
                    className="submission-decision-accept"
                    disabled={busy || s.status === 'ACCEPTED'}
                    onClick={() => choose('ACCEPTED')}
                  >
                    Accept application
                  </Button>
                  <div className="submission-decision-secondary">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || s.status === 'WAITLISTED'}
                      onClick={() => choose('WAITLISTED')}
                    >
                      Waitlist
                    </Button>
                    <Button
                      type="button"
                      variant="destructive-outline"
                      onClick={() => choose('DECLINED')}
                      disabled={busy}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
                <MarketDialog
                  open={confirming}
                  busy={busy}
                  title={
                    decisionTitles[status] ?? 'Confirm application decision'
                  }
                  onClose={closeDecision}
                >
                  {() => (
                    <>
                      <p>
                        {status === 'ACCEPTED'
                          ? `Accept ${s.applicant.businessName}?`
                          : status === 'WAITLISTED'
                            ? `Move ${s.applicant.businessName} to the waitlist?`
                            : `Deny ${s.applicant.businessName}? A denied application cannot be reopened.`}
                      </p>
                      {status === 'ACCEPTED' && (
                        <>
                          {/* Only offered while required documents are
                              outstanding, naming them. */}
                          {outstandingDocuments.length > 0 && (
                            <Check
                              label={`Accept conditionally while required documents are outstanding (${outstandingDocuments.join(', ')})`}
                              checked={conditional}
                              onChange={setConditional}
                            />
                          )}
                          <p>
                            Choose an existing market business record if this
                            applicant is already in your market directory.
                            Otherwise, a new record is created.
                          </p>
                          <SearchSelect
                            label="Existing Market Business"
                            hideLabel
                            value={directory}
                            onChange={setDirectory}
                            placeholder="Existing Market Business"
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
                        </>
                      )}
                      {s.status === 'ACCEPTED' && decisions.length > 0 && (
                        <Check
                          label="I reviewed the affected dates and their obligations. Historical records must stay intact."
                          checked={reviewed}
                          onChange={setReviewed}
                        />
                      )}
                      <div className="ui-actions">
                        <Button
                          type="button"
                          variant={
                            status === 'DECLINED' ? 'destructive' : 'primary'
                          }
                          disabled={
                            busy ||
                            (s.status === 'ACCEPTED' &&
                              decisions.length > 0 &&
                              !reviewed)
                          }
                          onClick={() => void save()}
                        >
                          {decisionTitles[status] ?? 'Confirm decision'}
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
      </>
    );
  }
}
