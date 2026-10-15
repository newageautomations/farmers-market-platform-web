import { buttonClassName } from '@market/ui/presentation';
import { useState } from 'react';
import type {
  ApplicationSubmission,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { Button, Card, Select, ApplicationFields } from '@market/ui';
import { date } from '../common';
import { friendlyLabel, SearchSelect, statusTone } from '../presentation';
import { Entry, Check } from './common';

export function ApplicationReview({
  submission: s,
  data,
  run,
  canManage,
  canConfirmDates = false,
  canBilling = false,
  onSaved,
  onBusy,
  onClose,
}: {
  submission: ApplicationSubmission;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates?: boolean;
  canBilling?: boolean;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  onClose?: () => void;
}) {
  const [status, setStatus] = useState(s.status),
    [notes, setNotes] = useState(s.managerNotes),
    [directory, setDirectory] = useState(String(s.directoryId ?? '')),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const decisions =
    data.approvals?.filter((a) => a.submissionId === s.id) ?? [];
  async function save() {
    setBusy(true);
    onBusy(true);
    setFailed(false);
    try {
      const result = await run({
        action: 'REVIEW_APPLICATION',
        id: s.id,
        expectedRevision: s.revision,
        data: {
          status,
          managerNotes: notes,
          directoryId: directory ? Number(directory) : null,
          reviewedOccurrenceIds: reviewed
            ? decisions.map((d) => d.occurrenceId)
            : [],
        },
      });
      if (result === undefined || result === null) setFailed(true);
      else onSaved();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <Card
      as="section"
      surface="embedded"
      className="ops-editor"
      aria-label="Application review"
    >
      <h2 className="ui-section-title-dashboard">{s.applicant.businessName}</h2>
      <p>
        {s.applicant.firstName} {s.applicant.lastName} · {s.applicant.email}
      </p>
      <p>Identity: {friendlyLabel(s.identityMode ?? 'LEGACY_UNKNOWN')}</p>
      <ApplicationFields
        definition={s.definitionSnapshot}
        answers={s.answers}
        readOnly
      />
      <p>
        Acceptance approves the business for consideration. Confirm dates
        separately, then assign compatible booths and review billing.
      </p>
      <fieldset
        disabled={
          !canManage || busy || ['DECLINED', 'WITHDRAWN'].includes(s.status)
        }
      >
        <legend>Application decision</legend>
        {s.status !== 'ACCEPTED' && (
          <SearchSelect
            label="Directory business"
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
                label: d.contact.businessName,
              }))}
          />
        )}
        <Entry
          label="Private manager notes and decision reason"
          value={notes}
          onChange={setNotes}
        />
        <div className="ops-toolbar">
          {[
            'UNDER_REVIEW',
            'NEEDS_INFO',
            'WAITLISTED',
            'ACCEPTED',
            'DECLINED',
            'WITHDRAWN',
          ].map((value) => (
            <Button
              variant="secondary"
              className="application-status-action"
              data-tone={statusTone(value)}
              size="compact"
              type="button"
              key={value}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {value === 'ACCEPTED' ? 'Accept business' : friendlyLabel(value)}
            </Button>
          ))}
        </div>
        {s.status === 'ACCEPTED' && decisions.length > 0 && (
          <Check
            label="I reviewed the affected dates and their obligations. Historical records must stay intact."
            checked={reviewed}
            onChange={setReviewed}
          />
        )}
      </fieldset>
      <div className="ui-actions ui-modal-actions">
        <Button
          variant="primary"
          type="button"
          disabled={
            !canManage ||
            busy ||
            ['DECLINED', 'WITHDRAWN'].includes(s.status) ||
            (s.status === 'ACCEPTED' && status === 'ACCEPTED')
          }
          onClick={() => void save()}
        >
          {busy ? 'Saving' : 'Save and Close'}
        </Button>
        {onClose && (
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      {failed && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          The decision could not be saved. Confirmed dates and active
          obligations must be reviewed and resolved explicitly before
          withdrawing acceptance.
        </p>
      )}
      {s.status === 'ACCEPTED' && (
        <>
          <fieldset disabled={!canConfirmDates || busy}>
            <legend>Requested dates</legend>
            <p>
              Date confirmation records attendance approval without reserving or
              guaranteeing a booth. Booth compatibility and availability are
              checked when assigning.
            </p>
            {s.requestedOccurrenceIds.map((id) => (
              <DateDecision
                key={id}
                submission={s}
                occurrenceId={id}
                data={data}
                run={run}
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
              href={`/market/assignments?directory=${s.directoryId}`}
            >
              Assign confirmed dates
            </a>
          )}
        </>
      )}
    </Card>
  );
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
        {date(occurrence?.startsAt)} ·{' '}
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
