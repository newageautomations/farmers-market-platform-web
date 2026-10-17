import { IconButton, MarketPlatformLogo } from '@market/ui';
import { buttonClassName } from '@market/ui/presentation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { createAdminSession, type SessionState } from '@market/auth';
import { resolveAdminContext, type AdminContext } from '@market/admin-core';
import { AppError, safeError } from '@market/api';
import { Select, Button, ErrorState, Field, Input, Spinner } from '@market/ui';
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
  const [sessionEndpoint, setSessionEndpoint] = useState(endpoint);
  const [context, setContext] = useState<AdminContext | null>(null);
  const [vendorService, setVendorService] = useState<VendorService>();
  const [marketService, setMarketService] = useState<MarketService>();
  const [managementService, setManagementService] =
    useState<ManagementService>();
  const [contextError, setContextError] = useState<AppError | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<AppError | null>(null);
  const [loginMethod, setLoginMethod] = useState(
    accountOrigin ? 'account' : 'username',
  );
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
    (startup.current ??= completePlatformAccountLogin(endpoint))
      .then(() => createAdminSession(endpoint).restore())
      .then((result) => selectAuthorizedAccountContext(endpoint, result))
      .then((result) => {
        if (active && generation.current === initialGeneration) {
          const destination = new URL(window.location.href);
          if (
            accountOrigin &&
            destination.searchParams.get('account') === '1'
          ) {
            destination.searchParams.delete('account');
            window.history.replaceState(
              null,
              '',
              destination.pathname + destination.search,
            );
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
    resolveAdminContext(session, endpoint)
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
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    let navigating = false;
    try {
      if (loginMethod === 'account') {
        if (!accountOrigin) throw new AppError('unavailable');
        platformAccountLogin(accountOrigin);
        navigating = true;
        return;
      }
      setSession(
        await selectAuthorizedAccountContext(
          endpoint,
          await createAdminSession(endpoint).login(
            String(data.get('username') ?? ''),
            String(data.get('password') ?? ''),
          ),
        ),
      );
      form.reset();
    } catch (error) {
      setLoginError(safeError(error));
    } finally {
      if (!navigating) setBusy(false);
    }
  }
  async function logout() {
    // Hide tenant content immediately. Rehydrate only after a fresh backend session check.
    setContext(null);
    setVendorService(undefined);
    setMarketService(undefined);
    setManagementService(undefined);
    generation.current++;
    setContextError(null);
    setSession({ status: 'loading' });
    try {
      await createAdminSession(endpoint).logout();
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
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (session.status === 'anonymous')
    return (
      <main className="login">
        <h1>Sign in</h1>
        <p>Access your Market platform account.</p>
        <form onSubmit={login}>
          {accountOrigin && (
            <Field id="login-method" label="Sign in with">
              <Select
                id="login-method"
                value={loginMethod}
                disabled={busy}
                onChange={(event) => {
                  setLoginMethod(event.target.value);
                  setLoginError(null);
                }}
              >
                <option value="account">Platform email account</option>
                <option value="username">Administrator username</option>
              </Select>
            </Field>
          )}
          {loginMethod === 'account' ? (
            <p>
              Continue to your platform account to sign in with your email. Your
              account determines your available workspaces.
            </p>
          ) : (
            <>
              <Field id="username" label="Administrator username">
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  disabled={busy}
                />
              </Field>
              <Field id="password" label="Password">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
              </Field>
            </>
          )}
          {loginError && <ErrorState error={loginError} />}
          {accountOrigin && (
            <p>
              <a href={new URL('/account/recover', accountOrigin).toString()}>
                Forgot your password?
              </a>
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </Button>
          {accountOrigin && (
            <p className="login-signup">
              Don't have an account?{' '}
              <a href={new URL('/account/signup', accountOrigin).toString()}>
                Sign up here
              </a>
            </p>
          )}
        </form>
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
          {session.user.channels.length > 1 && (
            <>
              <label htmlFor="unavailable-workspace">Workspace</label>
              <Select
                id="unavailable-workspace"
                value={session.channel.id}
                onChange={(event) => refreshSession(event.target.value)}
              >
                {session.user.channels.map((channel, index) => (
                  <option key={channel.id} value={channel.id}>
                    Available workspace {index + 1}
                  </option>
                ))}
              </Select>
            </>
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
            onSwitch={refreshSession}
            customerOrigin={customerOrigin}
            accountOrigin={accountOrigin}
          />
        </>
      }
    />
  );
}
