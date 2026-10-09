import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  routeAllowed,
  visibleNavigation,
  vendorPath,
  marketPath,
  type AdminContext,
} from '@market/admin-core';
import { AppError } from '@market/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@market/ui';
import { adminTheme, themeVariables } from '@market/theme';
import type { CSSProperties } from 'react';
import type { VendorService } from './vendor/service';
import { VendorRoutes } from './vendor/VendorRoutes';
import './vendor.css';
const MarketRoutes = lazy(() =>
  import('./market/MarketRoutes').then((module) => ({
    default: module.MarketRoutes,
  })),
);
import type { MarketService } from './market/service';
import './market.css';
import type { ManagementService } from './management/service';
import { isManagementRoute } from './management/routes';
const ManagementRoutes = lazy(() =>
  import('./management/ManagementRoutes').then((module) => ({
    default: module.ManagementRoutes,
  })),
);
import './management.css';
import './phase15.css';
import './phase15b.css';
import { NavigationIcon, Chevron } from './NavigationIcon';
export function AdminShell({
  context,
  onLogout,
  controls,
  vendorService,
  marketService,
  managementService,
}: {
  context: AdminContext;
  onLogout: () => void;
  controls?: ReactNode;
  vendorService?: VendorService;
  marketService?: MarketService;
  managementService?: ManagementService;
}) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const items = visibleNavigation(context);
  const current = [...items]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) =>
        item.path === path ||
        (context.scope === 'PLATFORM' &&
          ((path === '/' && item.path === '/platform') ||
            (item.path !== '/platform' && path.startsWith(item.path + '/')))) ||
        (context.scope === 'MARKET' &&
          (item.path === marketPath(path) ||
            (item.path !== '/market' &&
              marketPath(path).startsWith(`${item.path}/`)))) ||
        (context.scope === 'VENDOR' && item.path === vendorPath(path)) ||
        (context.scope === 'VENDOR' &&
          vendorPath(path).startsWith(`${item.path}/`)) ||
        (context.scope === 'VENDOR' &&
          item.path === '/' &&
          vendorPath(path) === '/vendor'),
    );
  function navigate(event: MouseEvent<HTMLAnchorElement>, next: string) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    window.history.pushState(null, '', next);
    setPath(next);
    document.querySelector<HTMLElement>('#main')?.focus();
  }
  const links = (
    <nav aria-label="Workspace navigation">
      {items
        .filter((item) => !item.parent)
        .map((item) => {
          const children = items.filter((child) => child.parent === item.path);
          const isExpanded =
            current?.path === item.path || current?.parent === item.path;
          return (
            <div
              key={item.path}
              className={`nav-group ${isExpanded ? 'expanded' : ''}`}
            >
              <div className="nav-parent">
                <a
                  href={item.path}
                  aria-current={
                    current?.path === item.path ? 'page' : undefined
                  }
                  onClick={(event) => navigate(event, item.path)}
                >
                  <NavigationIcon path={item.path} />
                  <span>{item.label}</span>
                  {children.length > 0 && <Chevron />}
                </a>
              </div>
              {children.length > 0 && (
                <div className="nav-subpages">
                  {children.map((child) => (
                    <a
                      key={child.path}
                      href={child.path}
                      aria-current={
                        current?.path === child.path ? 'page' : undefined
                      }
                      onClick={(event) => navigate(event, child.path)}
                    >
                      <NavigationIcon path={child.path} />
                      <span>{child.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </nav>
  );
  return (
    <div style={themeVariables(adminTheme(context.branding)) as CSSProperties}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {context.source === 'fixture' && (
        <aside className="fixture-notice" aria-label="Development preview">
          Development fixture · Simulated identity and permissions
        </aside>
      )}
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <a
            className="brand"
            href="/"
            onClick={(event) => navigate(event, '/')}
          >
            Market platform
          </a>
          {links}
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <span className="brand">
              {context.branding?.logo && (
                <img
                  src={adminTheme(context.branding).logo ?? undefined}
                  alt=""
                  width="30"
                  height="30"
                />
              )}
              {context.name}
            </span>
            <div className="actions">
              {controls}
              <Button className="secondary" onClick={onLogout}>
                Sign out
              </Button>
            </div>
          </header>
          <details className="admin-mobile-nav">
            <summary>Workspace navigation</summary>
            {links}
          </details>
          <main className="admin-content" id="main" tabIndex={-1}>
            {!routeAllowed(context, path) ? (
              <>
                <h1>Access restricted</h1>
                <ErrorState error={new AppError('forbidden')} />
              </>
            ) : (
              <>
                <PageHeader title={current?.label ?? 'Overview'}>
                  {context.scope === 'PLATFORM' && (
                    <p>
                      {context.scope === 'PLATFORM'
                        ? 'Shared platform administration'
                        : 'Your Market workspace'}
                    </p>
                  )}
                </PageHeader>
                {managementService && isManagementRoute(context.scope, path) ? (
                  <div className="management-workspace">
                    <Suspense
                      fallback={
                        <Spinner label="Loading administration module" />
                      }
                    >
                      <ManagementRoutes
                        key={`${context.scope}:${JSON.stringify(context.subject)}:${path}`}
                        service={managementService}
                        path={path}
                        vendor={vendorService}
                      />
                    </Suspense>
                  </div>
                ) : context.scope === 'VENDOR' && vendorService ? (
                  <div className="vendor-workspace">
                    <VendorRoutes
                      key={`${vendorService.vendorId}:${vendorPath(path)}`}
                      service={vendorService}
                      path={path}
                    />
                  </div>
                ) : context.scope === 'MARKET' && marketService ? (
                  <div className="market-workspace">
                    <Suspense
                      fallback={<Spinner label="Loading Market module" />}
                    >
                      <MarketRoutes
                        key={`${marketService.marketId}:${marketPath(path)}`}
                        service={marketService}
                        path={path}
                      />
                    </Suspense>
                  </div>
                ) : path === '/' ? (
                  <>
                    <Card>
                      <h2>Your workspace is ready</h2>
                      <p>
                        This shared application will connect your operational
                        tools to the backend as they become available.
                      </p>
                      <p>
                        Orders, catalogs, schedules, and financial records
                        remain managed by the backend.
                      </p>
                    </Card>
                    <EmptyState title="No operational data is loaded">
                      <p>
                        This foundation does not display sample business
                        metrics.
                      </p>
                    </EmptyState>
                  </>
                ) : (
                  <EmptyState
                    title={`${current?.label ?? 'This area'} will be connected in a later phase`}
                  >
                    <p>
                      The route boundary is ready. Operational workflows are not
                      available yet.
                    </p>
                  </EmptyState>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
