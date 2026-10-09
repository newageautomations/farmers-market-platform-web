import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import {
  AppError,
  safeError,
  type CommunicationPurpose,
  type CommunicationSettings,
} from '@market/api';
import { Alert, Button, ErrorState } from '@market/ui';
import { shopCall } from './shop-client';
const labels: Record<CommunicationPurpose, string> = {
  PREORDER_WINDOW_OPEN: 'Preorder window updates',
  RESTOCK: 'Restock updates',
  VENDOR_ANNOUNCEMENT: 'Vendor announcements',
  MARKET_ANNOUNCEMENT: 'Market announcements',
};
export default function CommunicationPreferences({
  storefrontId,
  initial,
}: {
  storefrontId: string;
  initial: CommunicationSettings;
}) {
  const [state, setState] = useState(initial),
    [pending, setPending] = useState(false),
    [error, setError] = useState<AppError | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const generation = useRef(0),
    busy = useRef(false);
  useEffect(() => {
    const token = ++generation.current;
    return () => {
      generation.current = token + 1;
    };
  }, [storefrontId]);
  async function change(
    event: SubmitEvent<HTMLFormElement>,
    preference: CommunicationSettings['preferences'][number],
  ) {
    event.preventDefault();
    if (busy.current) return;
    const withdraw =
      preference.status === 'SUBSCRIBED' && !preference.renewalRequired;
    if (
      !withdraw &&
      new FormData(event.currentTarget).get('explicitConsent') !== 'on'
    )
      return;
    const request = generation.current;
    busy.current = true;
    setPending(true);
    setError(null);
    setConfirmed(false);
    try {
      await shopCall(storefrontId, 'communication-change', {
        medium: preference.medium,
        purpose: preference.purpose,
        subscribed: !withdraw,
        noticeVersion: state.noticeVersion ?? '',
      });
      const current = await shopCall<CommunicationSettings>(
        storefrontId,
        'communication-settings',
      );
      if (generation.current === request) {
        setState(current);
        setConfirmed(true);
      }
    } catch (e) {
      if (generation.current === request) setError(safeError(e));
    } finally {
      busy.current = false;
      if (generation.current === request) setPending(false);
    }
  }
  return (
    <>
      <p>
        Preferences for {state.displayName}. Your verified shared account owns
        these choices. Email, SMS and each purpose are independent.
      </p>
      <p>
        Purchases and account claim do not grant marketing consent. Required
        transactional messages remain separate.
      </p>
      {error && <ErrorState error={error} />}{' '}
      {confirmed && (
        <Alert>Current preferences confirmed by the backend.</Alert>
      )}
      <div className="preference-grid">
        {state.preferences.map((p) => {
          const key = `${p.medium}-${p.purpose}`,
            withdraw = p.status === 'SUBSCRIBED' && !p.renewalRequired;
          return (
            <section className="card" key={`${key}:${p.version}`}>
              <h2>{labels[p.purpose]}</h2>
              <p>
                {p.medium === 'EMAIL' ? 'Email' : 'SMS'} ·{' '}
                {p.renewalRequired
                  ? 'Consent needs renewal'
                  : p.status === 'SUBSCRIBED'
                    ? 'Subscribed'
                    : 'Not subscribed'}
              </p>
              {!p.grantAvailable && (
                <p>
                  {p.medium === 'SMS'
                    ? 'SMS is unavailable until an approved verified destination policy is configured.'
                    : 'Consent policy is not configured.'}
                </p>
              )}
              <form onSubmit={(e) => void change(e, p)} aria-busy={pending}>
                <fieldset disabled={pending}>
                  {!withdraw && p.grantAvailable && (
                    <label>
                      <input type="checkbox" name="explicitConsent" required />{' '}
                      I agree to receive {labels[p.purpose].toLowerCase()} from{' '}
                      {state.displayName} by{' '}
                      {p.medium === 'EMAIL' ? 'email' : 'SMS'} under notice{' '}
                      {state.noticeVersion}.
                    </label>
                  )}
                  <Button
                    type="submit"
                    disabled={pending || (!withdraw && !p.grantAvailable)}
                  >
                    {withdraw
                      ? 'Withdraw preference'
                      : p.renewalRequired
                        ? 'Renew consent'
                        : 'Grant preference'}
                  </Button>
                </fieldset>
              </form>
              {p.renewalRequired && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void change(e, { ...p, renewalRequired: false });
                  }}
                >
                  <Button type="submit" disabled={pending}>
                    Withdraw preference
                  </Button>
                </form>
              )}
            </section>
          );
        })}
      </div>
      <p>
        Provider STOP and suppression remain authoritative. These settings
        cannot override them, and changing a preference sends no campaign.
      </p>
    </>
  );
}
