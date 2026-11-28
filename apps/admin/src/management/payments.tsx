import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Dialog,
  ErrorState,
  UtilityIcon,
} from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import { safeError, type AppError } from '@market/api';
import type { ManagementService } from './service';
import { ReadState, useRead } from '../vendor/common';
import {
  stripeDestination,
  StripeStatusDetails,
  stripeReadiness,
} from './stripe-presentation';

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
        const destination = stripeDestination(url);
        if (tab === undefined) window.location.assign(destination);
        else if (tab) tab.location.href = destination;
        else window.open(destination, '_blank', 'noopener,noreferrer');
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
  const charge = stripeReadiness(account, 'ACCEPT_DIRECT_CHARGE');
  return (
    <>
      <ReadState skeleton="detail" {...result} retry={result.refresh} />
      {error && <ErrorState error={error} />}
      <Alert>Stripe test mode. Live payment collection is disabled.</Alert>
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
          <StripeStatusDetails account={account} mode="TEST" />
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
