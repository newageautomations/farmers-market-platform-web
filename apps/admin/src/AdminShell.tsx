import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
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
  DashboardFrame,
  DashboardMenu,
  Tooltip,
  IconButton,
  MarketPlatformLogo,
} from '@market/ui';
import {
  adminTheme,
  dashboardTheme,
  themeVariables,
  dashboardPaletteDefaults,
} from '@market/theme';
import { dashboardClasses } from '@market/ui/presentation';
import {
  DashboardAppearanceProvider,
  DashboardAppearanceSettings,
  useDashboardAppearance,
} from './DashboardAppearance';
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
import './market/dashboard.css';
import { NavigationIcon, Chevron } from './NavigationIcon';
import { NotificationPreferences } from './notifications/NotificationPreferences';
import { AccountTimezoneSettings } from './AccountTimezoneSettings';
import {
  StorefrontAppearanceSettings,
  ViewStorefront,
} from './StorefrontAppearance';
import { NotificationCenter } from '@market/ui/notifications';
import '@market/ui/notifications.css';
const notificationAccountOrigin =
  typeof __PLATFORM_ACCOUNT_ORIGIN__ === 'undefined'
    ? undefined
    : __PLATFORM_ACCOUNT_ORIGIN__ || undefined;
const DocumentsWorkspace = lazy(() =>
  import('./documents/DocumentsWorkspace').then((module) => ({
    default: module.DocumentsWorkspace,
  })),
);
function Shell({
  context,
  onLogout,
  onLogoutEverywhere,
  controls,
  vendorService,
  marketService,
  managementService,
  documentConnection,
}: {
  context: AdminContext;
  onLogout: () => void;
  onLogoutEverywhere?: () => void;
  controls?: ReactNode;
  vendorService?: VendorService;
  marketService?: MarketService;
  managementService?: ManagementService;
  documentConnection?: {
    endpoint: string;
    channelToken: string;
    channelId?: string;
    onAuthorityFailure?: () => void;
  };
}) {
  const appearance = useDashboardAppearance();
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputMode, setInputMode] = useState('pointer');
  useEffect(() => {
    if (context.scope !== 'MARKET') return;
    const pointer = () => setInputMode('pointer');
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Tab') setInputMode('keyboard');
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', keyboard);
    };
  }, [context.scope]);
  const items = visibleNavigation(context).filter(
    (item) =>
      context.scope !== 'MARKET' ||
      ![
        '/market/vendors/memberships',
        '/market/vendors/participation',
        '/market/vendors/listings',
        '/market/vendors/offerings',
      ].includes(item.path),
  );
  const current = [...items]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) =>
        item.path === path ||
        (item.path === '/notifications' &&
          path.startsWith('/notifications/')) ||
        (context.scope === 'PLATFORM' &&
          ((path === '/' && item.path === '/platform') ||
            (item.path !== '/platform' && path.startsWith(item.path + '/')))) ||
        (context.scope === 'MARKET' &&
          (item.path === marketPath(path) ||
            (item.path !== '/market' &&
              marketPath(path).startsWith(`${item.path}/`)))) ||
        (context.scope === 'VENDOR' && item.path === vendorPath(path)) ||
        (context.scope === 'VENDOR' &&
          item.path === '/vendor/products' &&
          vendorPath(path) === '/vendor/inventory') ||
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
    if (next === '/vendor/storefront' || path === '/vendor/storefront') {
      const destination = new URL(next, window.location.origin);
      if (documentConnection?.channelId)
        destination.searchParams.set('channel', documentConnection.channelId);
      window.location.assign(destination.pathname + destination.search);
      return;
    }
    window.history.pushState(null, '', next);
    setPath(window.location.pathname);
    window.dispatchEvent(new PopStateEvent('popstate'));
    document.querySelector<HTMLElement>('#main')?.focus();
  }
  const links = (rail = false) => (
    <nav aria-label="Workspace navigation">
      {items
        .filter((item) => !item.parent)
        .map((item) => {
          const children = items.filter((child) => child.parent === item.path);
          const financeApi =
            context.scope === 'MARKET'
              ? marketService?.finance
              : vendorService?.finance;
          if (
            item.path === '/vendor/finances' ||
            item.path === '/market/finances'
          ) {
            for (const [suffix, label] of [
              ...(financeApi?.quickbooks
                ? [['/quickbooks', 'QuickBooks Online']]
                : []),
              ['/expenses?action=add-expense', 'Add Expense'],
              ['/transactions', 'View Transactions'],
              ['/expenses', 'Manage Expenses'],
            ])
              children.push({
                ...item,
                path: item.path + suffix,
                label: label!,
                parent: item.path,
              });
          }
          const isExpanded =
            current?.path === item.path || current?.parent === item.path;
          return (
            <div
              key={item.path}
              className={`nav-group ${isExpanded ? 'expanded' : ''}`}
            >
              <div className="nav-parent">
                <Tooltip label={item.label} enabled={rail && sidebarCollapsed}>
                  <a
                    href={item.path}
                    aria-label={item.label}
                    aria-current={
                      current?.path === item.path ? 'page' : undefined
                    }
                    onClick={(event) => navigate(event, item.path)}
                  >
                    <NavigationIcon path={item.path} />
                    <span className="ui-nav-label">{item.label}</span>
                    {children.length > 0 && <Chevron />}
                  </a>
                </Tooltip>
              </div>
              {children.length > 0 && (
                <div className="nav-subpages">
                  {children.map((child) => (
                    <Tooltip
                      key={child.path}
                      label={child.label}
                      enabled={rail && sidebarCollapsed}
                    >
                      <a
                        href={child.path}
                        aria-label={child.label}
                        aria-current={
                          current?.path === child.path ? 'page' : undefined
                        }
                        onClick={(event) => navigate(event, child.path)}
                      >
                        <NavigationIcon path={child.path} />
                        <span className="ui-nav-label">{child.label}</span>
                      </a>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </nav>
  );
  return (
    <div
      className={
        'admin-dashboard ' +
        (context.scope === 'MARKET' ? 'market-dashboard' : '')
      }
      data-input-mode={inputMode}
      style={
        themeVariables(
          dashboardTheme(adminTheme(context.branding), appearance.palette),
        ) as CSSProperties
      }
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {context.source === 'fixture' && (
        <aside className="fixture-notice" aria-label="Development preview">
          Development fixture · Simulated identity and permissions
        </aside>
      )}
      <DashboardFrame
        collapsed={sidebarCollapsed}
        sidebar={
          <aside id="market-sidebar" className="admin-sidebar">
            <div className="ui-sidebar-brand">
              <a
                className="brand"
                href="/"
                onClick={(event) => navigate(event, '/')}
              >
                <MarketPlatformLogo compact={sidebarCollapsed} />
              </a>
              <IconButton
                icon="panel"
                label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={dashboardClasses.sidebarToggle}
                aria-expanded={!sidebarCollapsed}
                aria-controls="market-sidebar"
                onClick={() => setSidebarCollapsed((value) => !value)}
              />
            </div>
            {links(true)}
          </aside>
        }
        header={
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
            {documentConnection && (
              <NotificationCenter
                view="bell"
                connection={documentConnection}
                personalOrigin={notificationAccountOrigin}
              />
            )}
            <DashboardMenu navigation={links()}>
              {documentConnection &&
                context.scope !== 'PLATFORM' &&
                context.subject && (
                  <ViewStorefront
                    key={`${context.scope}:${documentConnection.channelToken}`}
                    connection={documentConnection}
                  />
                )}
              {controls}
              <Button
                className="secondary"
                onClick={() => {
                  if (
                    window.dispatchEvent(
                      new Event('storefront-editor:before-exit', {
                        cancelable: true,
                      }),
                    )
                  )
                    onLogout();
                }}
              >
                Sign out
              </Button>
              {onLogoutEverywhere && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (
                      window.dispatchEvent(
                        new Event('storefront-editor:before-exit', {
                          cancelable: true,
                        }),
                      )
                    )
                      onLogoutEverywhere();
                  }}
                >
                  Sign out everywhere
                </Button>
              )}
            </DashboardMenu>
          </header>
        }
      >
        <main className="admin-content" id="main" tabIndex={-1}>
          {!routeAllowed(context, path) ? (
            <>
              <h1>Access restricted</h1>
              <ErrorState error={new AppError('forbidden')} />
            </>
          ) : (
            <>
              {!(
                context.scope === 'VENDOR' &&
                ['/vendor/products', '/vendor/inventory'].includes(
                  vendorPath(path),
                )
              ) && (
                <PageHeader
                  title={
                    path.startsWith('/notifications')
                      ? path.endsWith('/settings')
                        ? 'Notification settings'
                        : path.endsWith('/unsubscribed')
                          ? 'Unsubscribed notifications'
                          : 'Notifications'
                      : path === '/vendor/settings/payments'
                        ? 'Payment Integrations'
                        : path === '/vendor/pos/square-return'
                          ? 'Check Square payment'
                          : (current?.label ?? 'Overview')
                  }
                >
                  {context.scope === 'PLATFORM' && (
                    <p>
                      {context.scope === 'PLATFORM'
                        ? 'Shared platform administration'
                        : 'Your Market workspace'}
                    </p>
                  )}
                </PageHeader>
              )}
              {[
                '/vendor/settings',
                '/market/settings',
                '/platform/settings',
              ].includes(path) && <DashboardAppearanceSettings />}
              {[
                '/vendor/settings',
                '/market/settings',
                '/platform/settings',
              ].includes(path) &&
                documentConnection && (
                  <AccountTimezoneSettings
                    key={documentConnection.channelToken}
                    connection={documentConnection}
                  />
                )}
              {['/vendor/settings', '/market/settings'].includes(path) &&
                (marketService?.notifications ||
                  vendorService?.notifications) && (
                  <NotificationPreferences
                    key={`${context.scope}:${documentConnection?.channelToken}`}
                    context={context}
                    api={
                      (marketService?.notifications ||
                        vendorService?.notifications)!
                    }
                  />
                )}
              {['/vendor/storefront', '/market/storefront'].includes(path) ? (
                <StorefrontAppearanceSettings
                  key={`${context.scope}:${documentConnection?.channelToken}`}
                  connection={documentConnection}
                  market={context.scope === 'MARKET'}
                />
              ) : path.startsWith('/notifications') ? (
                documentConnection ? (
                  <NotificationCenter
                    connection={documentConnection}
                    personalOrigin={notificationAccountOrigin}
                    view={
                      path.endsWith('/settings')
                        ? 'settings'
                        : path.endsWith('/unsubscribed')
                          ? 'unsubscribed'
                          : 'inbox'
                    }
                  />
                ) : (
                  <EmptyState title="Connect to the backend to view notifications" />
                )
              ) : ['/vendor/documents', '/market/documents'].includes(path) ? (
                documentConnection ? (
                  <Suspense fallback={<Spinner label="Loading documents" />}>
                    <DocumentsWorkspace
                      key={`${context.scope}:${documentConnection.channelToken}`}
                      context={context}
                      connection={documentConnection}
                    />
                  </Suspense>
                ) : (
                  <EmptyState title="Connect to the backend to manage documents">
                    <p>
                      Document uploads and private libraries are available in
                      the live workspace. This fixture preview has no document
                      service.
                    </p>
                  </EmptyState>
                )
              ) : managementService &&
                isManagementRoute(context.scope, path) ? (
                <div className="management-workspace">
                  <Suspense
                    fallback={<Spinner label="Loading administration module" />}
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
                    <h2 className="ui-section-title-dashboard">
                      Your workspace is ready
                    </h2>
                    <p>
                      This shared application will connect your operational
                      tools to the backend as they become available.
                    </p>
                    <p>
                      Orders, catalogs, schedules, and financial records remain
                      managed by the backend.
                    </p>
                  </Card>
                  <EmptyState title="No operational data is loaded">
                    <p>
                      This foundation does not display sample business metrics.
                    </p>
                  </EmptyState>
                </>
              ) : (
                <EmptyState
                  level={2}
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
      </DashboardFrame>
    </div>
  );
}

export function AdminShell(
  props: Parameters<typeof Shell>[0] & { accountId?: string },
) {
  const defaults = useMemo(
    () => ({
      ...dashboardPaletteDefaults,
      primary:
        props.context.branding?.accent ?? dashboardPaletteDefaults.primary,
    }),
    [props.context.branding?.accent],
  );
  return (
    <DashboardAppearanceProvider
      key={props.accountId ?? 'fixture'}
      accountId={props.accountId}
      connection={props.documentConnection}
      defaults={defaults}
    >
      <Shell {...props} />
    </DashboardAppearanceProvider>
  );
}
