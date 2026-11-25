import { usePreparationDates } from './preparation/PreparationWorkspace';
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
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
  canonicalSettingsPath,
  canonicalNotificationsPath,
  notificationsBase,
  notificationsView,
  type AdminContext,
  type AdminScope,
} from '@market/admin-core';
import { AppError, createMarketContactApi } from '@market/api';
import {
  storefrontEditorDocument,
  stripeInvoiceDocument,
} from '@market/config';
import { ContactSubmissions } from './vendor/contact-submissions';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  DashboardFrame,
  DashboardMenu,
  Tooltip,
  IconButton,
  MarketPlatformLogo,
  HeaderMenu,
  AccountIcon,
  UtilityIcon,
  LoadingSkeleton,
  LoadGateProvider,
  PageLoad,
  Skeleton,
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
import { MarketCompactProvider, PhoneSheet } from './market/mobile';
import type { ManagementService } from './management/service';
import { isManagementRoute, isSettingsRoute } from './management/routes';
const SettingsWorkspace = lazy(() =>
  import('./settings/SettingsWorkspace').then((module) => ({
    default: module.SettingsWorkspace,
  })),
);
const ManagementRoutes = lazy(() =>
  import('./management/ManagementRoutes').then((module) => ({
    default: module.ManagementRoutes,
  })),
);
import './management.css';
import './phase15.css';
import './phase15b.css';
import './market/dashboard.css';
import '@market/ui/shell.css';
import { NavigationIcon, Chevron } from './NavigationIcon';
import {
  StorefrontAppearanceSettings,
  ViewStorefront,
} from './StorefrontAppearance';
import { NotificationCenter } from '@market/ui/notifications';
import '@market/ui/notifications.css';
import { NotificationsWorkspace } from './notifications/NotificationsWorkspace';
const notificationAccountOrigin =
  typeof __PLATFORM_ACCOUNT_ORIGIN__ === 'undefined'
    ? undefined
    : __PLATFORM_ACCOUNT_ORIGIN__ || undefined;
const DocumentsWorkspace = lazy(() =>
  import('./documents/DocumentsWorkspace').then((module) => ({
    default: module.DocumentsWorkspace,
  })),
);
/**
 * Current pathname, replacing a former Integrations route with its Settings tab
 * and a former unscoped `/notifications` route with this role's inbox.
 */
function currentPath(scope: AdminScope) {
  const path = window.location.pathname,
    next =
      canonicalNotificationsPath(scope, path) ?? canonicalSettingsPath(path);
  if (next !== path)
    window.history.replaceState(
      window.history.state,
      '',
      next + window.location.search + window.location.hash,
    );
  return next;
}
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
  // The shell stays hidden until the account's saved dashboard colors load,
  // then fades in, so it never paints in the default palette first. A stalled
  // color read reveals it in the defaults after a short limit. Once shown it
  // stays shown: later re-reads (a refreshed channel token) never hide it.
  const [revealed, setRevealed] = useState(appearance.loaded);
  useEffect(() => {
    if (revealed) return;
    if (appearance.loaded) {
      setRevealed(true);
      return;
    }
    const limit = setTimeout(() => setRevealed(true), 3000);
    return () => clearTimeout(limit);
  }, [appearance.loaded, revealed]);
  const colorsPending = !revealed && !appearance.loaded;
  const [path, setPath] = useState(() => currentPath(context.scope));
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [path]);
  useEffect(() => {
    const update = (event: PopStateEvent) => {
      // Ask mounted forms before a route update can unmount their leave guards.
      if (
        !window.dispatchEvent(
          new CustomEvent('vendor:before-route-change', {
            cancelable: true,
            detail: event,
          }),
        )
      )
        return;
      setPath(currentPath(context.scope));
    };
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, [context.scope]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputMode, setInputMode] = useState('pointer');
  useEffect(() => {
    if (context.scope !== 'MARKET' && context.scope !== 'VENDOR') return;
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
  const preparationDates = usePreparationDates(vendorService, marketService);
  const baseItems = visibleNavigation(context).filter(
    (item) =>
      context.scope !== 'MARKET' ||
      ![
        '/market/vendors/memberships',
        '/market/vendors/participation',
        '/market/vendors/listings',
        '/market/vendors/offerings',
      ].includes(item.path),
  );
  const preparationPath =
    context.scope === 'MARKET' ? '/market/preparation' : '/vendor/preparation';
  const preparationActive = path.includes('/preparation');
  const items =
    (preparationDates.due || preparationActive) && context.scope !== 'PLATFORM'
      ? [
          {
            path: preparationPath,
            label: 'Market Preparation',
            scopes: [context.scope],
          },
          ...baseItems,
        ]
      : baseItems;
  const current = [...items]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) =>
        item.path === path ||
        (preparationActive && item.path === preparationPath) ||
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
    visit(next);
  }
  /** In-app navigation: keeps the current workspace scope and channel. */
  function visit(next: string) {
    if (
      storefrontEditorDocument(next) ||
      storefrontEditorDocument(path) ||
      (typeof __STAGING_BUILD__ !== 'undefined' &&
        __STAGING_BUILD__ &&
        stripeInvoiceDocument(next) !== stripeInvoiceDocument(path))
    ) {
      const destination = new URL(next, window.location.origin);
      if (destination.origin !== window.location.origin) return;
      if (documentConnection?.channelId)
        destination.searchParams.set('channel', documentConnection.channelId);
      window.location.assign(destination.href);
      return;
    }
    window.history.pushState(null, '', next);
    setPath(currentPath(context.scope));
    window.dispatchEvent(new PopStateEvent('popstate'));
    document.querySelector<HTMLElement>('#main')?.focus();
  }
  // Market Manager, Vendor and Platform share the compact shell (sidebar
  // rail, 56px topbar and account menu) and a sectioned sidebar without
  // dropdowns.
  const compactShell =
    context.scope === 'MARKET' ||
    context.scope === 'VENDOR' ||
    context.scope === 'PLATFORM';
  const flatNavigation = compactShell;
  const renderItem = (item: (typeof items)[number], rail: boolean) => {
    const children = flatNavigation
      ? []
      : items.filter((child) => child.parent === item.path);
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
              aria-current={current?.path === item.path ? 'page' : undefined}
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
  };
  const topLevel = items.filter((item) => !item.parent);
  const links = (rail = false) => (
    <nav aria-label="Workspace navigation">
      {flatNavigation
        ? navigationSections(
            // Vendor subpages are listed alongside their parents; Market
            // subsections stay inside their workspaces.
            context.scope === 'VENDOR' ? items : topLevel,
            context.scope === 'VENDOR'
              ? vendorSections
              : context.scope === 'PLATFORM'
                ? platformSections
                : marketSections,
          ).map((section) => (
            <div
              key={section.title ?? 'main'}
              className="nav-section"
              role="group"
              aria-label={section.title ?? 'Main'}
            >
              {section.title && (
                <span className="nav-section-title" aria-hidden="true">
                  <span className="ui-nav-label">{section.title}</span>
                </span>
              )}
              {section.items.map((item) => renderItem(item, rail))}
            </div>
          ))
        : topLevel.map((item) => renderItem(item, rail))}
    </nav>
  );
  return (
    <>
      {colorsPending && <AdminShellSkeleton label="Loading your workspace" />}
      <div
        className={
          'admin-dashboard ' +
          (compactShell ? 'ui-shell ' : '') +
          (context.scope === 'MARKET'
            ? 'market-dashboard'
            : context.scope === 'VENDOR'
              ? 'vendor-admin'
              : '')
        }
        data-input-mode={inputMode}
        data-colors-pending={colorsPending ? '' : undefined}
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
                  <MarketPlatformLogo
                    compact={sidebarCollapsed && !compactShell}
                  />
                </a>
                <IconButton
                  icon="panel"
                  label={
                    sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                  }
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
            compactShell ? (
              <header className="admin-topbar shell-topbar">
                <span className="brand">
                  {context.branding?.logo && (
                    <img
                      src={adminTheme(context.branding).logo ?? undefined}
                      alt=""
                      width="24"
                      height="24"
                    />
                  )}
                  {context.name}
                </span>
                <DashboardMenu navigation={links()}>
                  {documentConnection && context.subject && (
                    <ViewStorefront
                      key={`${context.scope}:${documentConnection.channelToken}`}
                      connection={documentConnection}
                      compact
                    />
                  )}
                </DashboardMenu>
                {documentConnection && (
                  <NotificationCenter
                    view="bell"
                    compactBell
                    connection={documentConnection}
                    personalOrigin={notificationAccountOrigin}
                    basePath={notificationsBase(context.scope)}
                    navigate={visit}
                  />
                )}
                <HeaderMenu
                  className="shell-account-menu"
                  label="Account"
                  icon={<AccountIcon />}
                >
                  <div className="shell-account-header">
                    <span className="shell-account-avatar" aria-hidden="true">
                      <AccountIcon />
                    </span>
                    <span>
                      <strong>{context.name}</strong>
                      <span>
                        {context.scope === 'MARKET'
                          ? 'Market manager'
                          : context.scope === 'PLATFORM'
                            ? 'Platform administrator'
                            : 'Vendor'}
                      </span>
                    </span>
                  </div>
                  {controls && (
                    <div className="shell-account-controls">{controls}</div>
                  )}
                  <div className="shell-account-actions">
                    <button
                      type="button"
                      className="shell-menu-item"
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
                      <UtilityIcon name="exit" />
                      Sign out
                    </button>
                    {onLogoutEverywhere && (
                      <button
                        type="button"
                        className="shell-menu-item"
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
                        <UtilityIcon name="exit" />
                        Sign out everywhere
                      </button>
                    )}
                  </div>
                </HeaderMenu>
              </header>
            ) : (
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
                    basePath={notificationsBase(context.scope)}
                    navigate={visit}
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
            )
          }
        >
          <main className="admin-content" id="main" tabIndex={-1}>
            <LoadGateProvider>
              <PageLoad pageKey={pageLoadKey(context.scope, path)}>
                <MarketCompactProvider
                  enabled={
                    context.scope === 'MARKET' || context.scope === 'VENDOR'
                  }
                  summaryCarousel={context.scope === 'VENDOR'}
                >
                  {!routeAllowed(context, path) ? (
                    <>
                      <h1>Access restricted</h1>
                      <ErrorState error={new AppError('forbidden')} />
                    </>
                  ) : (
                    <>
                      {!(
                        // The Finances, Settings, Notifications and Documents workspaces render their own heading.
                        isSettingsRoute(context.scope, path) ||
                        !!notificationsView(context.scope, path) ||
                        (!!documentConnection &&
                          ['/vendor/documents', '/market/documents'].includes(
                            path,
                          )) ||
                        (context.scope === 'VENDOR' &&
                          /^\/vendor\/(finances(\/|$)|analytics$)/.test(
                            vendorPath(path),
                          )) ||
                        (context.scope === 'MARKET' &&
                          /^\/market\/(finances(\/|$)|analytics$|booth-billing(\/|$))/.test(
                            path,
                          ))
                      ) &&
                        !(
                          context.scope === 'VENDOR' &&
                          // The vendor dashboard renders its own heading.
                          (path === '/' ||
                            vendorPath(path) === '/vendor' ||
                            vendorPath(path) === '/vendor/inventory' ||
                            vendorPath(path) === '/vendor/products' ||
                            vendorPath(path) === '/vendor/orders' ||
                            vendorPath(path) === '/vendor/team' ||
                            vendorPath(path) === '/vendor/customers' ||
                            vendorPath(path) ===
                              '/vendor/contact-submissions' ||
                            vendorPath(path) === '/vendor/markets' ||
                            vendorPath(path).startsWith('/vendor/markets/') ||
                            vendorPath(path) === '/vendor/booths' ||
                            /^\/vendor\/day(?:\/[1-9][0-9]*)?$/.test(
                              vendorPath(path),
                            ) ||
                            vendorPath(path) === '/vendor/applications' ||
                            /^\/vendor\/applications\/[1-9]\d*$/.test(
                              vendorPath(path),
                            ) ||
                            vendorPath(path) === '/vendor/loyalty' ||
                            vendorPath(path) ===
                              '/vendor/loyalty/leaderboard' ||
                            vendorPath(path) ===
                              '/vendor/loyalty/redemptions' ||
                            vendorPath(path).startsWith('/vendor/customers/') ||
                            vendorPath(path).startsWith('/vendor/products/') ||
                            vendorPath(path).startsWith('/vendor/orders/') ||
                            // Workspace headings: Website, POS and Market Preparation.
                            /^\/vendor\/(storefront|pos|preparation(\/.*)?)$/.test(
                              vendorPath(path),
                            ))
                        ) &&
                        // Management pages (Platform, and Vendor/Market Subscription)
                        // render their own workspace heading when the module loads.
                        !(
                          !!managementService &&
                          isManagementRoute(context.scope, path)
                        ) &&
                        !(
                          context.scope === 'MARKET' &&
                          // Overview, Team, Occurrences, Operations and Applications render their own heading.
                          (marketPath(path) === '/market' ||
                            path === '/market/team' ||
                            path === '/market/contact-submissions' ||
                            /^\/market\/(occurrences|preparation|day|operations|applications|application-submissions|rentals|directory|vendors)(\/|$)/.test(
                              path,
                            ) ||
                            // Assignments too; its layout editor keeps the page heading.
                            /^\/market\/assignments(\/\d+)?$/.test(path) ||
                            // Workspace headings; the full-screen layout editor
                            // renders its own title bar.
                            /^\/market\/(storefront|layouts(\/\d+\/edit)?|loyalty(\/.*)?)$/.test(
                              path,
                            ))
                        ) && (
                          <PageHeader
                            title={
                              path === '/vendor/pos/square-return'
                                ? 'Check Square payment'
                                : (current?.label ?? 'Overview')
                            }
                          />
                        )}
                      {['/vendor/storefront', '/market/storefront'].includes(
                        path,
                      ) ? (
                        <StorefrontAppearanceSettings
                          key={`${context.scope}:${documentConnection?.channelToken}`}
                          connection={documentConnection}
                          market={context.scope === 'MARKET'}
                        />
                      ) : context.scope === 'MARKET' &&
                        path === '/market/contact-submissions' ? (
                        documentConnection ? (
                          <ContactSubmissions
                            key={documentConnection.channelToken}
                            api={createMarketContactApi({
                              endpoint: documentConnection.endpoint,
                              channelToken: documentConnection.channelToken,
                            })}
                          />
                        ) : (
                          <EmptyState title="Connect to the backend to view website messages" />
                        )
                      ) : notificationsView(context.scope, path) ? (
                        documentConnection ? (
                          <NotificationsWorkspace
                            scope={context.scope}
                            path={path}
                            navigate={visit}
                          >
                            {(view) => (
                              <PhoneSheet>
                                {(sheet) => (
                                  <NotificationCenter
                                    connection={documentConnection}
                                    personalOrigin={notificationAccountOrigin}
                                    view={view}
                                    tabs={false}
                                    basePath={notificationsBase(context.scope)}
                                    navigate={visit}
                                    detailSheet={sheet}
                                  />
                                )}
                              </PhoneSheet>
                            )}
                          </NotificationsWorkspace>
                        ) : (
                          <EmptyState title="Connect to the backend to view notifications" />
                        )
                      ) : ['/vendor/documents', '/market/documents'].includes(
                          path,
                        ) ? (
                        documentConnection ? (
                          <Suspense
                            fallback={
                              <LoadingSkeleton
                                variant="detail"
                                label="Loading documents"
                              />
                            }
                          >
                            <DocumentsWorkspace
                              key={`${context.scope}:${documentConnection.channelToken}`}
                              context={context}
                              connection={documentConnection}
                            />
                          </Suspense>
                        ) : (
                          <EmptyState title="Connect to the backend to manage documents">
                            <p>
                              Document uploads and private libraries are
                              available in the live workspace. This fixture
                              preview has no document service.
                            </p>
                          </EmptyState>
                        )
                      ) : isSettingsRoute(context.scope, path) ? (
                        <Suspense
                          fallback={
                            <LoadingSkeleton
                              variant="detail"
                              label="Loading settings"
                            />
                          }
                        >
                          <SettingsWorkspace
                            key={`${context.scope}:${JSON.stringify(context.subject)}`}
                            context={context}
                            path={path}
                            vendor={vendorService}
                            market={marketService}
                            management={managementService}
                            connection={documentConnection}
                          />
                        </Suspense>
                      ) : managementService &&
                        isManagementRoute(context.scope, path) ? (
                        <div className="management-workspace">
                          <Suspense
                            fallback={
                              <LoadingSkeleton
                                variant="detail"
                                label="Loading administration module"
                              />
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
                            key={`${vendorService.vendorId}:${workspaceKey(vendorPath(path))}`}
                            service={vendorService}
                            preparationDates={preparationDates}
                            path={path}
                          />
                        </div>
                      ) : context.scope === 'MARKET' && marketService ? (
                        <div className="market-workspace">
                          <Suspense
                            fallback={
                              <LoadingSkeleton
                                variant="detail"
                                label="Loading Market module"
                              />
                            }
                          >
                            <MarketRoutes
                              key={`${marketService.marketId}:${workspaceKey(marketPath(path))}`}
                              service={marketService}
                              preparationDates={preparationDates}
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
                              This shared application will connect your
                              operational tools to the backend as they become
                              available.
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
                          level={2}
                          title={`${current?.label ?? 'This area'} will be connected in a later phase`}
                        >
                          <p>
                            The route boundary is ready. Operational workflows
                            are not available yet.
                          </p>
                        </EmptyState>
                      )}
                    </>
                  )}
                </MarketCompactProvider>
              </PageLoad>
            </LoadGateProvider>
          </main>
        </DashboardFrame>
      </div>
    </>
  );
}

/** Sidebar sections, keyed by the page's last path segment ('' is the
 * Vendor Dashboard at `/`). Pages not listed fall into the final section. */
type NavigationSection = { title: string | null; pages: string[] };
const marketSections: NavigationSection[] = [
  { title: null, pages: ['market', 'notifications', 'preparation'] },
  {
    title: 'Market days',
    pages: [
      'occurrences',
      'day',
      'operations',
      'layouts',
      'assignments',
      'rentals',
    ],
  },
  { title: 'Vendors', pages: ['vendors', 'applications', 'documents'] },
  {
    title: 'Business',
    pages: ['finances', 'billing', 'loyalty', 'storefront'],
  },
  { title: 'Workspace', pages: ['team', 'settings'] },
];
const platformSections: NavigationSection[] = [
  { title: null, pages: ['platform', 'notifications'] },
  { title: 'Administration', pages: ['tenants', 'test-accounts', 'billing'] },
  { title: 'Workspace', pages: ['settings'] },
];
const vendorSections: NavigationSection[] = [
  { title: null, pages: ['', 'notifications', 'preparation'] },
  {
    title: 'Selling',
    pages: ['pos', 'products', 'orders', 'packing', 'pickup'],
  },
  { title: 'Markets', pages: ['markets', 'day', 'applications', 'documents'] },
  {
    title: 'Customers',
    pages: ['customers', 'loyalty', 'contact-submissions'],
  },
  { title: 'Business', pages: ['finances', 'storefront', 'billing'] },
  { title: 'Workspace', pages: ['team', 'settings'] },
];
function navigationSections<T extends { path: string }>(
  items: T[],
  layout: NavigationSection[],
) {
  const key = (item: T) => item.path.split('/').filter(Boolean).pop() ?? '';
  const sections = layout.map((section) => ({
    title: section.title,
    items: section.pages.flatMap((page) =>
      items.filter((item) => key(item) === page),
    ),
  }));
  const placed = new Set(sections.flatMap((section) => section.items));
  sections[sections.length - 1]!.items.push(
    ...items.filter((item) => !placed.has(item)),
  );
  return sections.filter((section) => section.items.length > 0);
}
/** Finance tabs (and their former Analytics/Booth billing routes) share one
 * mounted workspace so its heading, actions and reads persist across tabs;
 * Market occurrence dialogs keep the list mounted the same way. */
/**
 * One loading phase per page (PageLoad). Workspaces that keep their heading
 * and tabs across routes (settings, notifications, finances, applications and
 * occurrences) count as one page, so switching inside them keeps section-level
 * skeletons.
 */
function pageLoadKey(scope: string, path: string) {
  if (isSettingsRoute(scope, path)) return 'settings';
  if (notificationsView(scope as never, path)) return 'notifications';
  if (scope === 'VENDOR') return workspaceKey(vendorPath(path));
  if (scope === 'MARKET') return workspaceKey(marketPath(path));
  return path;
}
function workspaceKey(path: string) {
  if (/^\/market\/(applications|application-submissions)$/.test(path))
    return 'market/applications';
  if (/^\/market\/occurrences(\/(generate|new))?$/.test(path))
    // The Generate and single-date dialogs open over the mounted list.
    return 'market/occurrences';
  return /^\/(vendor|market)\/(finances(\/|$)|analytics$|booth-billing(\/|$))/.test(
    path,
  )
    ? path.split('/')[1] + '/finances'
    : path;
}
/**
 * Skeletons for the compact shell's sidebar (brand and links) and topbar
 * (workspace name and controls), shown on a full page load until the real
 * shell can paint in the account's colors: through the session and workspace
 * load, then the saved-color read. Only the skeleton blocks render, laid over
 * the page with the shell's layout classes so each sits where the real item
 * renders; the shell's surfaces, borders and colors are not painted. The
 * content area stays empty (pages have their own skeletons).
 */
export function AdminShellSkeleton({ label }: { label?: string }) {
  const sections = [4, 5, 3];
  return (
    <div className="admin-dashboard ui-shell admin-shell-skeleton">
      <DashboardFrame
        sidebar={
          <aside className="admin-sidebar" aria-hidden="true">
            <div className="ui-sidebar-brand">
              <Skeleton className="admin-shell-skeleton-brand" />
            </div>
            <nav>
              {sections.map((rows, section) => (
                <div className="nav-section" key={section}>
                  {section > 0 && (
                    <span className="nav-section-title">
                      <Skeleton className="admin-shell-skeleton-title" />
                    </span>
                  )}
                  {Array.from({ length: rows }, (_, row) => (
                    <span className="admin-shell-skeleton-row" key={row}>
                      <Skeleton className="admin-shell-skeleton-icon" />
                      <Skeleton className="admin-shell-skeleton-label" />
                    </span>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        }
        header={
          <header className="admin-topbar shell-topbar" aria-hidden="true">
            <span className="brand">
              <Skeleton className="admin-shell-skeleton-name" />
            </span>
            <Skeleton className="admin-shell-skeleton-control" />
            <Skeleton className="admin-shell-skeleton-control" />
          </header>
        }
      >
        {label && (
          <p className="sr-only" role="status">
            {label}
          </p>
        )}
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
