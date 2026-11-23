import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  ErrorState,
  UtilityIcon,
} from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import { safeError, type AppError } from '@market/api';
import type { ManagementService } from './service';
import { ReadState, date, useRead } from '../vendor/common';
import { codeLabel } from '../settings/providers';

const remediation: Record<string, string> = {
  ACCOUNT_DISCONNECTED: 'Connect Stripe to continue account setup.',
  PLATFORM_IDENTITY_MISMATCH:
    'Reconnect with the configured platform. Ask support to review historical connections.',
  OWNERSHIP_UNKNOWN: 'Organization ownership needs review.',
  LIVE_ACCOUNT_ACTIVATION_DISABLED:
    'Live account activation is unavailable in this phase.',
  CONFIGURATION_INCOMPATIBLE:
    'This account must use the full Stripe Dashboard with Stripe collecting processing fees and payment losses. Ask support to review it.',
  ACCOUNT_STALE: 'Refresh status to retrieve current verification information.',
  ACCOUNT_RESTRICTED: 'Open Stripe to resolve the account restriction.',
  INFORMATION_REQUIRED:
    'Continue setup in Stripe to supply the required information.',
  VERIFICATION_PENDING:
    'Stripe is reviewing your information. Refresh status later.',
  PAYMENT_CAPABILITY_NOT_READY: 'Stripe has not enabled card payments yet.',
  PAYOUT_NOT_READY: 'Stripe has not enabled payouts yet.',
};

/** Shared vendor/market composition. Account authority and financial readiness stay on the server. */
export function Payments({
  service,
  embedded = false,
}: {
  service: ManagementService;
  embedded?: boolean;
}) {
  const read = useCallback(() => service.payments('TEST'), [service]);
  const result = useRead(
    `payments:${service.context.scope}:${JSON.stringify(service.context.subject)}`,
    read,
  );
  const savedAccount = result.data?.ownPaymentAccount;
  const account =
    savedAccount?.connectionStatus === 'DEAUTHORIZED' ? null : savedAccount;
  const config = result.data?.ownPaymentConfiguration;
  const manage =
    service.context.permissions.includes('ManageOwnPaymentAccount') &&
    service.context.membershipRole === 'owner';
  const allowed = manage && config?.providerIOAllowed;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError>();
  const [confirm, setConfirm] = useState(false);
  const [oauthFinished, setOauthFinished] = useState(false);
  const oauthAttempts = useRef(new Set<string>());
  const current = useRef<ManagementService | undefined>(service);
  current.current = service;
  const redirect = (url: string, tab?: Window | null) => {
    const target = new URL(url);
    if (
      target.protocol !== 'https:' ||
      ![
        'connect.stripe.com',
        'accounts.stripe.com',
        'dashboard.stripe.com',
      ].includes(target.hostname)
    )
      throw new Error('Unexpected Stripe destination');
    if (tab === undefined) window.location.assign(target.href);
    else if (tab) tab.location.href = target.href;
    // The placeholder tab was blocked; open the validated destination directly.
    else window.open(target.href, '_blank', 'noopener,noreferrer');
  };
  /**
   * `tab` is a placeholder window opened synchronously in the click handler so
   * popup blockers allow it; it is closed when no destination is returned.
   */
  const run = async (
    action: () => Promise<string | void>,
    tab?: Window | null,
  ) => {
    if (busy) {
      tab?.close();
      return;
    }
    const owner = service;
    setBusy(true);
    setError(undefined);
    let opened = false;
    try {
      const url = await action();
      if (current.current !== owner) return;
      if (url) {
        redirect(url, tab);
        opened = true;
      } else result.refresh();
    } catch (e) {
      if (current.current === owner) setError(safeError(e));
    } finally {
      if (!opened) tab?.close();
      if (current.current === owner) setBusy(false);
    }
  };
  useEffect(() => {
    current.current = service;
    setBusy(false);
    setError(undefined);
    setConfirm(false);
    setOauthFinished(false);
    // Invalidate in-flight redirects when the workspace unmounts or its service changes.
    return () => {
      if (current.current === service) current.current = undefined;
    };
  }, [service]);
  const params =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search);
  const nonce = params?.get('stripe_onboarding');
  const oauthState = params?.get('stripe_oauth_state');
  const oauthCode = params?.get('stripe_oauth_code');
  const refresh = result.refresh;
  useEffect(() => {
    if (!allowed || busy || !oauthState || !oauthCode || oauthFinished) return;
    // An authorization code is single use, including during StrictMode effect replay.
    const attempt = `${oauthState}:${oauthCode}`;
    if (oauthAttempts.current.has(attempt)) return;
    oauthAttempts.current.add(attempt);
    setBusy(true);
    setError(undefined);
    void (async () => {
      try {
        await service.completeStripeConnect(oauthState, oauthCode);
      } catch (e) {
        if (current.current === service) setError(safeError(e));
      } finally {
        if (current.current === service) {
          const clean = new URL(window.location.href);
          // A workspace change must not clear a different return's credentials.
          if (
            clean.searchParams.get('stripe_oauth_state') === oauthState &&
            clean.searchParams.get('stripe_oauth_code') === oauthCode
          ) {
            clean.searchParams.delete('stripe_oauth_state');
            clean.searchParams.delete('stripe_oauth_code');
            window.history.replaceState(window.history.state, '', clean.href);
          }
          setOauthFinished(true);
          setBusy(false);
          refresh();
        }
      }
    })();
  }, [allowed, busy, oauthState, oauthCode, oauthFinished, service, refresh]);
  const charge = account?.readiness.find(
    (r) => r.purpose === 'ACCEPT_DIRECT_CHARGE',
  );
  const payout = account?.readiness.find((r) => r.purpose === 'RECEIVE_PAYOUT');
  return (
    <>
      <ReadState skeleton="detail" {...result} retry={result.refresh} />
      {error && <ErrorState error={error} />}
      <Alert>
        Stripe test mode. Payment collection, checkout capture and booth invoice
        collection remain disabled.
      </Alert>
      {params?.get('stripe_oauth_error') && (
        <Alert>
          Stripe authorization was not completed. Start authorization again when
          you are ready.
        </Alert>
      )}
      {oauthState && oauthCode && !oauthFinished && (
        <Alert>
          {allowed
            ? 'Checking Stripe authorization…'
            : 'Stripe authorization will be checked automatically when payment management is available in the workspace where you started it.'}
        </Alert>
      )}
      {nonce && (
        <Alert>
          Return to the workspace where you started setup, then check your
          Stripe status. A return from Stripe does not confirm verification.
          <Button
            disabled={!allowed || busy}
            onClick={() =>
              void run(async () => {
                const response = await service.completeStripeOnboarding(
                  nonce,
                  params?.get('stripe_refresh') === '1',
                );
                if (current.current !== service) return;
                const link = response.completeOwnStripeOnboarding;
                if (link) return link.authorizationUrl;
                const clean = new URL(window.location.href);
                clean.searchParams.delete('stripe_onboarding');
                clean.searchParams.delete('stripe_refresh');
                window.history.replaceState(null, '', clean.href);
              })
            }
          >
            {params?.get('stripe_refresh') === '1'
              ? 'Resume Stripe setup'
              : 'Check returned setup'}
          </Button>
        </Alert>
      )}
      {config && (
        <Card surface={embedded ? 'embedded' : 'card'}>
          <dl className="provider-facts">
            <div>
              <dt>Connection</dt>
              <dd>
                <Badge
                  tone={
                    account?.connectionStatus === 'CONNECTED'
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {account
                    ? codeLabel(account.connectionStatus)
                    : 'Not connected'}
                </Badge>
              </dd>
            </div>
            {account && (
              <>
                <div>
                  <dt>Account</dt>
                  <dd>{account.accountReference}</dd>
                </div>
                <div>
                  <dt>Verification</dt>
                  <dd>{codeLabel(charge?.state ?? 'UNKNOWN')}</dd>
                </div>
                <div>
                  <dt>Details submitted</dt>
                  <dd>{account.detailsSubmitted ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Card payments</dt>
                  <dd>
                    {account.chargesEnabled
                      ? 'Enabled by Stripe'
                      : 'Not enabled by Stripe'}
                  </dd>
                </div>
                <div>
                  <dt>Direct charge readiness</dt>
                  <dd>
                    {charge?.ready ? 'Provider requirements met' : 'Not ready'}
                  </dd>
                </div>
                <div>
                  <dt>Payout readiness</dt>
                  <dd>{payout?.ready ? 'Ready' : 'Not ready'}</dd>
                </div>
                <div>
                  <dt>Requirements</dt>
                  <dd>
                    {account.currentlyDueCount} currently due,{' '}
                    {account.pastDueCount} past due
                  </dd>
                </div>
              </>
            )}
          </dl>
          {account && (
            <>
              <p>Last checked: {date(account.lastSyncAt)}</p>
              {account.disabledReason && (
                <Alert>
                  Stripe restriction: {codeLabel(account.disabledReason)}
                </Alert>
              )}
              <ul>
                {[
                  ...new Set([
                    ...(charge?.reasons ?? []),
                    ...(payout?.reasons ?? []),
                  ]),
                ].map((reason) => (
                  <li key={reason}>
                    {remediation[reason] ?? codeLabel(reason)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!config.providerIOAllowed && (
            <p>
              Stripe test setup is not configured on this server. An
              administrator must configure the platform identity, test keys and
              return URLs.
            </p>
          )}
          {manage && (
            <div className="ui-actions">
              {(!account || account.connectionMethod === 'HOSTED') && (
                <Button
                  disabled={!allowed || busy}
                  onClick={() =>
                    void run(
                      async () =>
                        (await service.startStripeOnboarding())
                          .beginOwnStripeOnboarding.authorizationUrl,
                    )
                  }
                >
                  {account ? 'Continue Stripe setup' : 'Set up Stripe'}
                </Button>
              )}
              {(!account ||
                (account.connectionMethod === 'OAUTH' &&
                  charge?.state === 'UNKNOWN')) && (
                <Button
                  variant="secondary"
                  disabled={!allowed || busy}
                  onClick={() =>
                    void run(
                      async () =>
                        (await service.connectStripe('TEST'))
                          .beginOwnStripeConnect.authorizationUrl,
                    )
                  }
                >
                  Connect existing Stripe account
                </Button>
              )}
              {account && (
                <>
                  <FarmstandButton
                    variant="secondary"
                    disabled={!allowed || busy}
                    onClick={() =>
                      void run(async () => {
                        await service.refreshStripe('TEST');
                      })
                    }
                  >
                    <UtilityIcon name="refresh" />
                    Refresh
                  </FarmstandButton>
                  <FarmstandButton
                    variant="secondary"
                    disabled={!allowed || busy}
                    onClick={() => {
                      const tab = window.open('', '_blank');
                      if (tab) tab.opener = null;
                      void run(
                        async () =>
                          (await service.stripeDashboard()).ownStripeDashboard,
                        tab,
                      );
                    }}
                  >
                    Open Stripe Dashboard
                    <UtilityIcon name="external" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </FarmstandButton>
                  <Button
                    variant="destructive"
                    disabled={!allowed || busy}
                    onClick={() => setConfirm(true)}
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Disconnect Stripe?"
        busy={busy}
        actions={
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await service.disconnectStripe('TEST');
                if (current.current !== service) return;
                const clean = new URL(window.location.href);
                for (const key of [
                  'stripe_oauth_state',
                  'stripe_oauth_code',
                  'stripe_oauth_error',
                  'stripe_onboarding',
                  'stripe_refresh',
                ]) {
                  clean.searchParams.delete(key);
                }
                window.history.replaceState(null, '', clean.href);
                setOauthFinished(true);
                setConfirm(false);
              })
            }
          >
            Disconnect Stripe
          </Button>
        }
      >
        <p>
          This stops new payment eligibility for this organization. Historical
          records and financial responsibilities remain. Resolve pending
          operations before disconnecting.
        </p>
        <p>
          This disconnects Stripe from this workspace. Other workspaces using
          the same Stripe account stay connected. Your Stripe account remains
          open.
        </p>
      </Dialog>
    </>
  );
}
