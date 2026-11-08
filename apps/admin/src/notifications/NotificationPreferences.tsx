import { useCallback, useId, useState, type FormEvent } from 'react';
import './notification-preferences.css';
import type {
  NotificationsApi,
  NotificationPreferencesData,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
import { Alert, Button, Card, Checkbox, ErrorState } from '@market/ui';
import { replayCheck } from '@market/ui/notifications';
import { ReadState, useRead } from '../vendor/common';

const labels: Record<string, string> = {
  'compliance.upcoming.outstanding':
    'Upcoming Market dates with outstanding documentation',
  'agreements.request.created': 'New acknowledgment requests',
  'agreements.revision.requested':
    'Revised agreements requiring acknowledgment',
  'agreements.acknowledged': 'Vendor acknowledgments',
  'agreements.version.published': 'Published agreement versions',
  'documents.request.created': 'New document requests',
  'documents.submission.created': 'New submissions awaiting review',
  'documents.submission.approved': 'Document approvals',
  'documents.submission.rejected': 'Document rejections requiring action',
  'documents.requirement.waived': 'Requirement waivers',
  'documents.expiring': 'Documents approaching expiration',
  'documents.expired': 'Expired documents',
  'documents.request.overdue': 'Overdue document requests',
  'documents.compliance.changed': 'Document compliance changes',
};
/** Preference sections, in display order. Unlisted types fall into Other. */
const sections: Array<{
  title: string;
  description: string;
  match: (type: string) => boolean;
  thresholds?: boolean;
}> = [
  {
    title: 'Document requests',
    description: 'New and overdue requests for documents.',
    match: (type) => type.startsWith('documents.request.'),
  },
  {
    title: 'Submissions and reviews',
    description: 'Uploads, approvals, rejections and waivers.',
    match: (type) =>
      type.startsWith('documents.submission.') ||
      type === 'documents.requirement.waived',
  },
  {
    title: 'Expiration and compliance',
    description: 'Expiring documents and compliance changes.',
    match: (type) =>
      ['documents.expiring', 'documents.expired'].includes(type) ||
      type.startsWith('documents.compliance.') ||
      type.startsWith('compliance.'),
    thresholds: true,
  },
  {
    title: 'Agreements',
    description: 'Acknowledgment requests, revisions and new versions.',
    match: (type) => type.startsWith('agreements.'),
  },
];
export { replayCheck };
export function NotificationPreferences({
  api,
  context,
  embedded = false,
}: {
  api: NotificationsApi;
  context: AdminContext;
  /** Host panel supplies the section semantics and surface. */
  embedded?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const read = useCallback(() => api.preferences(), [api]);
  const state = useRead('notification-preferences', read);
  const canWrite = context.permissions.includes(
    context.scope === 'MARKET'
      ? 'ManageOwnMarketMemberships'
      : 'ManageOwnStorefront',
  );
  return (
    <Card
      as={embedded ? 'div' : 'section'}
      aria-label={embedded ? undefined : 'Notification preferences'}
      surface={embedded ? 'embedded' : 'card'}
    >
      <p>
        Choose document notifications for this{' '}
        {context.scope === 'MARKET' ? 'Market' : 'Vendor business'}. These
        preferences do not change document requirements or Vendor approval.
      </p>
      <Alert severity="info">
        Enabled notifications are currently written to the backend console for
        testing.
      </Alert>
      <ReadState {...state} retry={state.refresh} />
      {state.data && (
        <PreferenceForm
          key={state.data.revision}
          api={api}
          value={state.data}
          canWrite={canWrite}
          onSaved={() => {
            setSaved(true);
            state.refresh();
          }}
        />
      )}
      {saved && (
        <Alert severity="success">Notification preferences saved.</Alert>
      )}
    </Card>
  );
}
function PreferenceForm({
  api,
  value,
  canWrite,
  onSaved,
}: {
  api: NotificationsApi;
  value: NotificationPreferencesData;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.save({
        expectedRevision: value.revision,
        enabled: Object.fromEntries(
          value.supported.map((type) => [type, data.has(type)]),
        ),
        thresholds: data.getAll('thresholds').map(Number),
      });
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const groups = sections
    .map((section) => ({
      ...section,
      types: value.supported.filter((type) => section.match(type)),
    }))
    .filter((section) => section.types.length || section.thresholds);
  const other = value.supported.filter(
    (type) => !sections.some((section) => section.match(type)),
  );
  const option = (type: string) => (
    <label
      className="ops-check notification-option"
      key={type}
      htmlFor={`${id}-${type}`}
    >
      <Checkbox
        id={`${id}-${type}`}
        name={type}
        defaultChecked={value.enabled[type] === true}
        onChange={replayCheck}
      />
      <span>{labels[type] ?? type}</span>
    </label>
  );
  return (
    <form onSubmit={submit} className="notification-preferences">
      <fieldset disabled={busy || !canWrite}>
        <legend className="sr-only">Notification preferences</legend>
        <div className="notification-sections">
          {groups.map((section) => (
            <fieldset className="notification-section" key={section.title}>
              <legend>{section.title}</legend>
              <p>{section.description}</p>
              {section.types.map(option)}
              {section.thresholds && (
                <fieldset className="notification-thresholds">
                  <legend>Remind me before expiration</legend>
                  <p>
                    Applies when approaching-expiration notifications are
                    enabled. A document remains valid through its expiration
                    date.
                  </p>
                  {[30, 14, 7].map((days) => (
                    <label
                      className="ops-check notification-option"
                      key={days}
                      htmlFor={`${id}-${days}`}
                    >
                      <Checkbox
                        id={`${id}-${days}`}
                        name="thresholds"
                        value={days}
                        defaultChecked={value.thresholds.includes(days)}
                        onChange={replayCheck}
                      />
                      <span>{days} days before</span>
                    </label>
                  ))}
                </fieldset>
              )}
            </fieldset>
          ))}
          {other.length > 0 && (
            <fieldset className="notification-section">
              <legend>Other notifications</legend>
              {other.map(option)}
            </fieldset>
          )}
        </div>
        <Button type="submit" loading={busy}>
          Save notification preferences
        </Button>
      </fieldset>
      {!canWrite && (
        <p>Your current permissions allow viewing these preferences.</p>
      )}
      {!!error && <ErrorState error={error} />}
    </form>
  );
}
