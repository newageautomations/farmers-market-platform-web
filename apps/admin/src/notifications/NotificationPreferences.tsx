import { useCallback, useId, useState, type FormEvent } from 'react';
import type {
  NotificationsApi,
  NotificationPreferencesData,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
import { Alert, Button, Card, Checkbox, ErrorState } from '@market/ui';
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
export function NotificationPreferences({
  api,
  context,
}: {
  api: NotificationsApi;
  context: AdminContext;
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
    <Card as="section" aria-label="Notification preferences">
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
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy || !canWrite}>
        <legend className="sr-only">Notification preferences</legend>
        {value.supported.map((type) => (
          <label className="ops-check" key={type} htmlFor={`${id}-${type}`}>
            <Checkbox
              id={`${id}-${type}`}
              name={type}
              defaultChecked={value.enabled[type] === true}
            />{' '}
            {labels[type] ?? type}
          </label>
        ))}
        <fieldset>
          <legend>Remind me before expiration</legend>
          <p>
            Applies when approaching-expiration notifications are enabled. A
            document remains valid through its expiration date.
          </p>
          {[30, 14, 7].map((days) => (
            <label className="ops-check" key={days} htmlFor={`${id}-${days}`}>
              <Checkbox
                id={`${id}-${days}`}
                name="thresholds"
                value={days}
                defaultChecked={value.thresholds.includes(days)}
              />{' '}
              {days} days before
            </label>
          ))}
        </fieldset>
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
