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
import { Button, ErrorState, Field, Input, Spinner } from '@market/ui';
import { AdminShell } from './AdminShell';
import { createLiveVendorService, type VendorService } from './vendor/service';
import { createLiveMarketService, type MarketService } from './market/service';
import {
  createManagementService,
  type ManagementService,
} from './management/service';

export function AdminApp({ endpoint }: { endpoint: string }) {
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
  const generation = useRef(0);
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
    createAdminSession(endpoint)
      .restore()
      .then((result) => {
        if (active && generation.current === initialGeneration) {
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
  }, [endpoint]);
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
    try {
      setSession(
        await createAdminSession(endpoint).login(
          String(data.get('username') ?? ''),
          String(data.get('password') ?? ''),
        ),
      );
      form.reset();
    } catch (error) {
      setLoginError(safeError(error));
    } finally {
      setBusy(false);
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
        <h1>Market platform</h1>
        <Spinner label="Checking your session" />
      </main>
    );
  if (session.status === 'error')
    return (
      <main className="login">
        <h1>Market platform</h1>
        <ErrorState error={session.error} />
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (session.status === 'anonymous')
    return (
      <main className="login">
        <h1>Sign in</h1>
        <p>Access your Market platform workspace.</p>
        <form onSubmit={login}>
          <Field id="username" label="Email or username">
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
          {loginError && <ErrorState error={loginError} />}
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </Button>
        </form>
      </main>
    );
  if (contextError)
    return (
      <main className="login">
        <h1>Workspace unavailable</h1>
        <ErrorState error={contextError} />
        <Button onClick={() => refreshSession(session.channel.id)}>
          Refresh workspace
        </Button>
        {session.user.channels.length > 1 && (
          <>
            <label htmlFor="unavailable-workspace">Workspace</label>
            <select
              id="unavailable-workspace"
              value={session.channel.id}
              onChange={(event) => refreshSession(event.target.value)}
            >
              {session.user.channels.map((channel, index) => (
                <option key={channel.id} value={channel.id}>
                  Available workspace {index + 1}
                </option>
              ))}
            </select>
          </>
        )}
        <Button onClick={() => void logout()}>Sign out</Button>
      </main>
    );
  if (!context)
    return (
      <main className="login">
        <h1>Market platform</h1>
        <Spinner label="Loading your workspace" />
      </main>
    );
  return (
    <AdminShell
      context={context}
      vendorService={vendorService}
      marketService={marketService}
      managementService={managementService}
      onLogout={() => void logout()}
      controls={
        <>
          <Button
            className="secondary"
            onClick={() => refreshSession(session.channel.id)}
          >
            Refresh workspace
          </Button>
          {session.user.channels.length > 1 ? (
            <>
              <label htmlFor="channel">Workspace</label>
              <select
                id="channel"
                value={session.channel.id}
                onChange={(event) => {
                  const id = event.target.value;
                  refreshSession(id);
                }}
              >
                {session.user.channels.map((channel, index) => (
                  <option key={channel.id} value={channel.id}>
                    {context.scope === 'MARKET'
                      ? channel.id === session.channel.id
                        ? context.name
                        : `Available workspace ${index + 1}`
                      : channel.code}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </>
      }
    />
  );
}
