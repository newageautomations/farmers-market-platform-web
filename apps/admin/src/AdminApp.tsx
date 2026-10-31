import { IconButton, MarketPlatformLogo } from '@market/ui';
import { buttonClassName } from '@market/ui/presentation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAdminSession, type SessionState } from '@market/auth';
import { resolveAdminContext, type AdminContext } from '@market/admin-core';
import { AppError, safeError } from '@market/api';
import { Button, ErrorState, Spinner } from '@market/ui';
import { AdminShell } from './AdminShell';
import { AccountModes } from './AccountModes';
import {
  completePlatformAccountLogin,
  platformAccountLogin,
  selectAuthorizedAccountContext,
} from './account-login';
import { createLiveVendorService, type VendorService } from './vendor/service';
import { createLiveMarketService, type MarketService } from './market/service';
import {
  createManagementService,
  type ManagementService,
} from './management/service';

export function AdminApp({
  endpoint,
  accountOrigin,
  customerOrigin,
}: {
  endpoint: string;
  accountOrigin?: string;
  customerOrigin?: string;
}) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [signedOutEverywhere, setSignedOutEverywhere] = useState(false);
  const [sessionEndpoint, setSessionEndpoint] = useState(endpoint);
  const [context, setContext] = useState<AdminContext | null>(null);
  const [vendorService, setVendorService] = useState<VendorService>();
  const [marketService, setMarketService] = useState<MarketService>();
  const [managementService, setManagementService] =
    useState<ManagementService>();
  const [contextError, setContextError] = useState<AppError | null>(null);
  const generation = useRef(0);
  const startup = useRef<Promise<void> | null>(null);
  const refreshSession = useCallback(
    (channelId?: string) => {
      const request = ++generation.current;
      setContext(null);
      setVendorService(undefined);
      setMarketService(undefined);
      setManagementService(undefined);
      setContextError(null);
      setSession({ status: 'loading' });
      createAdminSession(endpoint)
        .restore(channelId)
        .then((result) => {
          if (request === generation.current) setSession(result);
        })
        .catch((error) => {
          if (request === generation.current)
            setSession({ status: 'error', error: safeError(error) });
        });
    },
    [endpoint],
  );
  useEffect(() => {
    let active = true;
    const initialGeneration = ++generation.current;
    const destination = new URL(window.location.href);
    if (accountOrigin && destination.searchParams.get('account') === '1') {
      platformAccountLogin(accountOrigin);
      return;
    }
    (startup.current ??= completePlatformAccountLogin(endpoint))
      .then(() => createAdminSession(endpoint).restore())
      .then((result) => {
        if (
          result.status === 'authenticated' &&
          window.location.pathname === '/' &&
          accountOrigin
        ) {
          platformAccountLogin(accountOrigin, result.user.id);
          return { status: 'loading' } as const;
        }
        return selectAuthorizedAccountContext(endpoint, result);
      })
      .then((result) => {
        if (active && generation.current === initialGeneration) {
          if (result.status === 'anonymous' && accountOrigin) {
            platformAccountLogin(accountOrigin);
            return;
          }
          setContext(null);
          setVendorService(undefined);
          setMarketService(undefined);
          setManagementService(undefined);
          setContextError(null);
          setSessionEndpoint(endpoint);
          setSession(result);
        }
      })
      .catch((error) => {
        if (active && generation.current === initialGeneration) {
          setSessionEndpoint(endpoint);
          setSession({ status: 'error', error: safeError(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [endpoint, accountOrigin]);
  useEffect(() => {
    if (session.status !== 'authenticated' || endpoint !== sessionEndpoint)
      return;
    let active = true;
    const contextGeneration = generation.current;
    resolveAdminContext(
      session,
      endpoint,
      window.location.pathname.startsWith('/platform')
        ? 'PLATFORM'
        : window.location.pathname.startsWith('/vendor')
          ? 'VENDOR'
          : 'MARKET',
    )
      .then((value) => {
        if (active && generation.current === contextGeneration) {
          setContext(value);
          setManagementService(
            createManagementService(
              value,
              endpoint,
              session.channel.token,
              () => {
                if (generation.current === contextGeneration)
                  refreshSession(session.channel.id);
              },
            ),
          );
          setMarketService(
            value.scope === 'MARKET'
              ? createLiveMarketService(
                  value,
                  endpoint,
                  session.channel.token,
                  () => {
                    if (generation.current === contextGeneration) {
                      window.history.replaceState(null, '', '/market');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      refreshSession(session.channel.id);
                    }
                  },
                )
              : undefined,
          );
          setVendorService(
            value.scope === 'VENDOR'
              ? createLiveVendorService(
                  value,
                  endpoint,
                  session.channel.token,
                  () => {
                    if (generation.current === contextGeneration) {
                      // A foreign resource can be denied while the tenant identity remains valid.
                      // Re-enter the safe workspace root before revalidation to avoid retrying that route indefinitely.
                      window.history.replaceState(null, '', '/vendor');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      refreshSession(session.channel.id);
                    }
                  },
                )
              : undefined,
          );
        }
      })
      .catch((error) => {
        if (active && generation.current === contextGeneration)
          setContextError(safeError(error));
      });
    return () => {
      active = false;
    };
  }, [session, endpoint, sessionEndpoint, refreshSession]);
  async function logout(everywhere = true) {
    // Hide tenant content immediately. Rehydrate only after a fresh backend session check.
    setContext(null);
    setVendorService(undefined);
    setMarketService(undefined);
    setManagementService(undefined);
    generation.current++;
    setContextError(null);
    setSession({ status: 'loading' });
    try {
      await createAdminSession(endpoint).logout(everywhere);
      setSignedOutEverywhere(everywhere);
      setSession({ status: 'anonymous' });
    } catch (error) {
      setSession({ status: 'error', error: safeError(error) });
    }
  }
  if (session.status === 'loading' || endpoint !== sessionEndpoint)
    return (
      <main className="login">
        <h1>
          <MarketPlatformLogo />
        </h1>
        <Spinner label="Checking your session" />
      </main>
    );
  if (session.status === 'error')
    return (
      <main className="login">
        <h1>
          <MarketPlatformLogo />
        </h1>
        <ErrorState error={session.error} />
        {new URL(window.location.href).searchParams.get('account') === '1' && (
          <p>
            The sign-in return could not be completed. It may have expired. Try
            again to start a fresh central sign-in.
          </p>
        )}
        {accountOrigin && (
          <a
            href={new URL(
              '/account/workspaces?unavailable=1',
              accountOrigin,
            ).toString()}
          >
            Choose an available workspace
          </a>
        )}
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (session.status === 'anonymous')
    return (
      <main className="login">
        <h1>You are signed out</h1>
        <p>
          {signedOutEverywhere
            ? 'Your platform sessions have been revoked everywhere.'
            : 'Your other account sessions remain active.'}
        </p>
        {accountOrigin && (
          <Button onClick={() => platformAccountLogin(accountOrigin)}>
            Sign in
          </Button>
        )}
      </main>
    );
  if (
    !session.user.channels.some((channel) =>
      channel.permissions.some((permission) =>
        ['SuperAdmin', 'ReadOwnVendorIdentity', 'ReadOwnMarket'].includes(
          permission,
        ),
      ),
    )
  )
    return (
      <main className="login">
        <h1>Your account</h1>
        {accountOrigin ? (
          <p>
            <a href={new URL('/account/login', accountOrigin).toString()}>
              Open your customer dashboard
            </a>
          </p>
        ) : (
          <p>Personal account sign-in is temporarily unavailable.</p>
        )}
        <Button variant="secondary" onClick={() => void logout()}>
          Sign out
        </Button>
      </main>
    );
  if (contextError)
    return (
      <main className="login">
        <h1>Workspace unavailable</h1>
        {accountOrigin && (
          <p>
            <a
              className={buttonClassName({ variant: 'secondary' })}
              href={new URL('/account/phone', accountOrigin).toString()}
            >
              Verify your personal phone in your platform account
            </a>
          </p>
        )}
        <ErrorState error={contextError} />
        <div className="ui-actions">
          <IconButton
            icon="refresh"
            label="Refresh workspace"
            onClick={() => refreshSession(session.channel.id)}
          />
          {accountOrigin && (
            <a
              href={new URL(
                '/account/workspaces?unavailable=1',
                accountOrigin,
              ).toString()}
            >
              Choose an available workspace
            </a>
          )}
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </main>
    );
  if (!context)
    return (
      <main className="login">
        <h1>
          <MarketPlatformLogo />
        </h1>
        <Spinner label="Loading your workspace" />
      </main>
    );
  return (
    <AdminShell
      context={context}
      accountId={session.user.id}
      vendorService={vendorService}
      marketService={marketService}
      managementService={managementService}
      documentConnection={{
        endpoint,
        channelToken: session.channel.token,
        channelId: session.channel.id,
        onAuthorityFailure: () => refreshSession(session.channel.id),
      }}
      onLogout={() => void logout()}
      controls={
        <>
          <IconButton
            icon="refresh"
            label="Refresh workspace"
            onClick={() => refreshSession(session.channel.id)}
          />
          <AccountModes
            endpoint={endpoint}
            channelToken={session.channel.token}
            context={context}
            principalId={session.user.id}
            customerOrigin={customerOrigin}
            accountOrigin={accountOrigin}
          />
        </>
      }
    />
  );
}
