import {
  AppError,
  createAdminApi,
  createManagementApi,
  type Entitlement,
  type Permission,
} from '@market/api';
import { hasPermission, type SessionState } from '@market/auth';
export type AdminScope = 'VENDOR' | 'MARKET' | 'PLATFORM';
export interface AdminContext {
  scope: AdminScope;
  name: string;
  branding?: { logo: string | null; accent: string };
  permissions: readonly Permission[];
  subject?: { vendorId: string } | { marketId: string };
  source: 'fixture' | 'backend';
  membershipRole?: 'owner' | 'administrator' | 'lead' | 'staff';
  marketStatus?: 'active' | 'suspended';
}
export interface NavItem {
  label: string;
  path: string;
  scopes: readonly AdminScope[];
  permission?: Permission;
  parent?: string;
}
export const navigation: readonly NavItem[] = [
  { label: 'Team', path: '/vendor/team', scopes: ['VENDOR'] },
  { label: 'Team', path: '/market/team', scopes: ['MARKET'] },
  // One inbox per role, each under its own scope so a page refresh keeps the role.
  { label: 'Notifications', path: '/vendor/notifications', scopes: ['VENDOR'] },
  { label: 'Notifications', path: '/market/notifications', scopes: ['MARKET'] },
  {
    label: 'Notifications',
    path: '/platform/notifications',
    scopes: ['PLATFORM'],
  },
  {
    label: 'Documents',
    path: '/market/documents',
    scopes: ['MARKET'],
    permission: 'ReadOwnDocuments',
  },
  {
    label: 'Submitted applications',
    path: '/market/application-submissions',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketApplications',
    parent: '/market/applications',
  },
  {
    label: 'Rentals',
    path: '/market/rentals',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketApplications',
  },
  {
    label: 'Generate occurrences',
    path: '/market/occurrences/generate',
    scopes: ['MARKET'],
    permission: 'ManageOwnMarketSchedule',
    parent: '/market/occurrences',
  },
  {
    label: 'Manual occurrence',
    path: '/market/occurrences/new',
    scopes: ['MARKET'],
    permission: 'ManageOwnMarketOccurrences',
    parent: '/market/occurrences',
  },
  {
    label: 'Business memberships',
    path: '/market/vendors/memberships',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
    parent: '/market/vendors',
  },
  {
    label: 'Occurrence participation',
    path: '/market/vendors/participation',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
    parent: '/market/vendors',
  },
  {
    label: 'Listing approvals',
    path: '/market/vendors/listings',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
    parent: '/market/vendors',
  },
  {
    label: 'Product offerings',
    path: '/market/vendors/offerings',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
    parent: '/market/vendors',
  },
  {
    label: 'Applications',
    path: '/market/applications',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketApplications',
  },
  {
    label: 'Layouts',
    path: '/market/layouts',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketLayouts',
  },
  {
    label: 'Assignments',
    path: '/market/assignments',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketAssignments',
  },
  {
    label: 'Market Day',
    path: '/market/day',
    scopes: ['MARKET'],
    permission: 'OperateOwnMarketDay',
  },
  {
    label: 'Dashboard',
    path: '/',
    scopes: ['VENDOR'],
  },
  {
    label: 'In-Person Checkout',
    path: '/vendor/pos',
    scopes: ['VENDOR'],
    permission: 'OperateOwnPos',
  },
  {
    label: 'Products & Inventory',
    path: '/vendor/products',
    scopes: ['VENDOR'],
    permission: 'ReadOwnCatalog',
  },
  {
    label: 'Orders',
    path: '/vendor/orders',
    scopes: ['VENDOR'],
    permission: 'ReadOwnOrders',
  },
  {
    label: 'Packing & Fulfillment',
    path: '/vendor/orders/packing',
    parent: '/vendor/orders',
    scopes: ['VENDOR'],
    permission: 'ReadOwnOrders',
  },
  {
    label: 'Pickup',
    path: '/vendor/orders/pickup',
    parent: '/vendor/orders',
    scopes: ['VENDOR'],
    permission: 'ReadOwnOrders',
  },
  {
    label: 'Contact Submissions',
    path: '/vendor/contact-submissions',
    scopes: ['VENDOR'],
    permission: 'ReadOwnCRM',
  },
  {
    label: 'Customers',
    path: '/vendor/customers',
    scopes: ['VENDOR'],
    permission: 'ReadOwnCRM',
  },
  {
    label: 'Applications',
    path: '/vendor/applications',
    parent: '/vendor/markets',
    scopes: ['VENDOR'],
    permission: 'ManageOwnMarketParticipation',
  },
  {
    label: 'Market Day',
    path: '/vendor/day',
    scopes: ['VENDOR'],
    permission: 'ReadOwnVendorIdentity',
  },
  {
    label: 'Markets',
    path: '/vendor/markets',
    scopes: ['VENDOR'],
    permission: 'ReadOwnVendorIdentity',
  },
  {
    label: 'Documents',
    path: '/vendor/documents',
    parent: '/vendor/markets',
    scopes: ['VENDOR'],
    permission: 'ReadOwnDocuments',
  },
  {
    label: 'Occurrences',
    path: '/market/occurrences',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
  },
  {
    label: 'Overview',
    path: '/platform',
    scopes: ['PLATFORM'],
    permission: 'SuperAdmin',
  },
  {
    label: 'Tenants',
    path: '/platform/tenants',
    scopes: ['PLATFORM'],
    permission: 'SuperAdmin',
  },
  {
    label: 'Billing catalog',
    path: '/platform/billing',
    scopes: ['PLATFORM'],
    permission: 'SuperAdmin',
  },
  {
    label: 'Settings',
    path: '/platform/settings',
    scopes: ['PLATFORM'],
    permission: 'SuperAdmin',
  },
  {
    label: 'Subscription',
    path: '/vendor/billing',
    scopes: ['VENDOR'],
    permission: 'ReadOwnBilling',
  },
  {
    label: 'Website',
    path: '/vendor/storefront',
    scopes: ['VENDOR'],
    permission: 'ManageOwnStorefront',
  },
  {
    label: 'Settings',
    path: '/vendor/settings',
    scopes: ['VENDOR'],
    permission: 'ReadOwnVendorIdentity',
  },
  {
    label: 'Subscription',
    path: '/market/billing',
    scopes: ['MARKET'],
    permission: 'ReadOwnBilling',
  },
  {
    label: 'Loyalty',
    path: '/market/loyalty',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
  },
  {
    label: 'Loyalty',
    path: '/vendor/loyalty',
    parent: '/vendor/customers',
    scopes: ['VENDOR'],
    permission: 'ReadOwnCRM',
  },
  {
    label: 'Finances',
    path: '/vendor/finances',
    scopes: ['VENDOR'],
    permission: 'ReadOwnVendorFinance',
  },
  {
    label: 'Finances',
    path: '/market/finances',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketBilling',
  },
  {
    label: 'Overview',
    path: '/market',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
  },
  {
    label: 'Vendors',
    path: '/market/vendors',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
  },
  {
    label: 'Operations',
    path: '/market/operations',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarketOrders',
  },
  {
    label: 'Storefront Appearance',
    path: '/market/storefront',
    scopes: ['MARKET'],
    permission: 'ManageMarketStorefront',
  },
  {
    label: 'Settings',
    path: '/market/settings',
    scopes: ['MARKET'],
    permission: 'ReadOwnMarket',
  },
];
export function visibleNavigation(context: AdminContext) {
  const items = navigation.filter(
    (item) =>
      (!item.path.endsWith('/team') ||
        context.membershipRole === 'owner' ||
        (context.membershipRole === 'administrator' &&
          context.permissions.includes(
            context.scope === 'VENDOR'
              ? 'ManageOwnVendorMembership'
              : 'ManageOwnMarketTeam',
          ))) &&
      (item.path !== '/vendor/applications' ||
        context.permissions.includes('ManageOwnMarketParticipation')) &&
      item.scopes.includes(context.scope) &&
      (!item.permission ||
        hasPermission(context.permissions, item.permission) ||
        (item.path === '/vendor/products' &&
          hasPermission(context.permissions, 'ReadOwnInventory')) ||
        // Finances also hosts the optional sales/market insights overview.
        (item.path === '/vendor/finances' &&
          hasPermission(context.permissions, 'ReadOwnVendorAnalytics')) ||
        (item.path === '/market/finances' &&
          hasPermission(context.permissions, 'ReadOwnMarketAnalytics'))),
  );
  if (context.scope === 'VENDOR') {
    const order = [
      '/',
      '/vendor/notifications',
      '/vendor/pos',
      '/vendor/products',
      '/vendor/orders',
      '/vendor/orders/packing',
      '/vendor/orders/pickup',
      '/vendor/customers',
      '/vendor/loyalty',
      '/vendor/markets',
      '/vendor/documents',
      '/vendor/applications',
      '/vendor/storefront',
      '/vendor/finances',
      '/vendor/settings',
      '/vendor/billing',
    ];
    const rank = (path: string) => {
      const index = order.indexOf(path);
      return index < 0 ? order.length : index;
    };
    return items
      .map((item) =>
        item.parent && !items.some((parent) => parent.path === item.parent)
          ? { ...item, parent: undefined }
          : item,
      )
      .sort((a, b) => rank(a.path) - rank(b.path));
  }
  return context.scope === 'MARKET'
    ? [
        'Overview',
        'Notifications',
        'Occurrences',
        'Vendors',
        'Operations',
        'Applications',
        'Rentals',
        'Layouts',
        'Assignments',
        'Finances',
        'Market Day',
        'Documents',
        'Loyalty',
        'Subscription',
        'Storefront Appearance',
        'Team',
        'Settings',
        'Submitted applications',
        'Add external business',
        'Generate occurrences',
        'Manual occurrence',
        'Business memberships',
        'Occurrence participation',
        'Listing approvals',
        'Product offerings',
      ].flatMap((label) => items.filter((item) => item.label === label))
    : items;
}
/** Inbox, settings and unsubscribed views of the notification workspace. */
export type NotificationsView = 'inbox' | 'trash' | 'settings' | 'unsubscribed';
/** Scoped notification inbox route, e.g. `/vendor/notifications`. */
export function notificationsBase(scope: AdminScope) {
  return `/${scope.toLowerCase()}/notifications`;
}
export function notificationsHref(scope: AdminScope, view: NotificationsView) {
  return view === 'inbox'
    ? notificationsBase(scope)
    : `${notificationsBase(scope)}/${view}`;
}
/** The notification view a path opens in this scope, or null. */
export function notificationsView(
  scope: AdminScope,
  path: string,
): NotificationsView | null {
  const base = notificationsBase(scope);
  if (path === base) return 'inbox';
  if (path === `${base}/trash`) return 'trash';
  if (path === `${base}/settings`) return 'settings';
  if (path === `${base}/unsubscribed`) return 'unsubscribed';
  return null;
}
/**
 * Former unscoped `/notifications`, `/notifications/settings` and
 * `/notifications/unsubscribed` routes, mapped onto the current role's routes.
 */
export function canonicalNotificationsPath(scope: AdminScope, path: string) {
  const match = /^\/notifications(\/trash|\/settings|\/unsubscribed)?\/?$/.exec(
    path,
  );
  return match ? `${notificationsBase(scope)}${match[1] ?? ''}` : null;
}
/** True for an unscoped legacy notification path (no role in the URL). */
export function isLegacyNotificationsPath(path: string) {
  return /^\/notifications(\/|$)/.test(path);
}
/** Tabs of the consolidated Settings workspace, per role. */
export type SettingsView =
  | 'preferences'
  | 'market'
  | 'notifications'
  | 'taxes'
  | 'payments'
  | 'pos'
  | 'integrations';
export const settingsViews: Record<AdminScope, readonly SettingsView[]> = {
  VENDOR: ['preferences', 'notifications', 'taxes', 'payments', 'pos'],
  MARKET: ['market', 'preferences', 'notifications'],
  PLATFORM: ['preferences', 'integrations'],
};
/** Former Integrations routes now open their Settings tab. */
const settingsLegacyRoutes: Record<string, string> = {
  '/vendor/integrations': '/vendor/settings',
  '/vendor/integrations/payments': '/vendor/settings/payments',
  '/vendor/integrations/pos': '/vendor/settings/pos',
  '/platform/integrations': '/platform/settings/integrations',
};
export function canonicalSettingsPath(path: string) {
  return settingsLegacyRoutes[path] ?? path;
}
export function settingsBase(scope: AdminScope) {
  return `/${scope.toLowerCase()}/settings`;
}
/** Route for a Settings tab; each role's first tab is the bare base route. */
export function settingsHref(scope: AdminScope, view: SettingsView) {
  return view === settingsViews[scope][0]
    ? settingsBase(scope)
    : `${settingsBase(scope)}/${view}`;
}
/** The Settings tab a path names, or undefined when it is not a Settings tab. */
export function settingsView(
  scope: AdminScope,
  path: string,
): SettingsView | undefined {
  const base = settingsBase(scope);
  if (path === base) return settingsViews[scope][0];
  const view = path.startsWith(base + '/')
    ? (path.slice(base.length + 1) as SettingsView)
    : undefined;
  return view &&
    view !== settingsViews[scope][0] &&
    settingsViews[scope].includes(view)
    ? view
    : undefined;
}
/** Visibility only. Every read and command remains backend-authorized. */
export function settingsViewAllowed(context: AdminContext, view: SettingsView) {
  if (!settingsViews[context.scope].includes(view)) return false;
  switch (view) {
    case 'taxes':
      return mayCommand(context, 'ManageOwnCatalog');
    case 'payments':
      return (
        hasPermission(context.permissions, 'ReadOwnPaymentAccount') ||
        mayCommand(context, 'ManageOwnPosIntegrations')
      );
    case 'pos':
      return hasPermission(context.permissions, 'ReadOwnPosIntegrations');
    case 'integrations':
      return context.permissions.includes('SuperAdmin');
    default:
      return true;
  }
}
export function routeAllowed(context: AdminContext, path: string) {
  const settings = settingsView(
    context.scope,
    context.scope === 'VENDOR' ? vendorPath(path) : path,
  );
  if (settings)
    return (
      visibleNavigation(context).some(
        (item) => item.path === settingsBase(context.scope),
      ) && settingsViewAllowed(context, settings)
    );
  if (path === `/${context.scope.toLowerCase()}/team`)
    return (
      context.scope !== 'PLATFORM' &&
      (context.membershipRole === 'owner' ||
        (context.membershipRole === 'administrator' &&
          context.permissions.includes(
            context.scope === 'VENDOR'
              ? 'ManageOwnVendorMembership'
              : 'ManageOwnMarketTeam',
          )))
    );

  if (notificationsView(context.scope, path)) return true;
  if (context.scope === 'PLATFORM') {
    const canonical = path === '/' ? '/platform' : path;
    return (
      context.permissions.includes('SuperAdmin') &&
      visibleNavigation(context).some(
        (item) =>
          item.path === canonical ||
          (item.path === '/platform/tenants' &&
            /^\/platform\/tenants\/(vendor|market)\/[1-9][0-9]*$/.test(
              canonical,
            )) ||
          (item.path === '/platform/billing' &&
            /^\/platform\/billing\/(plans|versions|rules|offers|features|metrics|policies|change-policies|provider-mappings|overrides)$/.test(
              canonical,
            )),
      )
    );
  }
  if (context.scope === 'MARKET') {
    const canonical = marketPath(path);
    if (
      /^\/market\/(?:finances\/(?:transactions|expenses|quickbooks|invoices)|booth-billing(?:\/[1-9][0-9]*)?)$/.test(
        canonical,
      )
    )
      return context.permissions.includes('ReadOwnMarketBilling');
    // The overview (and the former Analytics route) also serve analytics-only roles.
    if (canonical === '/market/finances' || canonical === '/market/analytics')
      return (
        context.permissions.includes('ReadOwnMarketBilling') ||
        context.permissions.includes('ReadOwnMarketAnalytics')
      );
    if (
      /^\/market\/loyalty(?:\/(?:challenges(?:\/(?:new|[1-9][0-9]*(?:\/(?:edit|replace))?))?|rewards))?$/.test(
        canonical,
      )
    )
      return context.permissions.includes('ReadOwnMarket');
    if (/^\/market\/assignments\/[1-9][0-9]*\/edit-layout$/.test(canonical))
      return context.permissions.includes('ReadOwnMarketAssignments');
    // The former directory pages open the combined Vendors list.
    if (/^\/market\/directory(\/new)?$/.test(canonical))
      return visibleNavigation(context).some(
        (item) => item.path === '/market/vendors',
      );
    // Legacy creation links open the inventory's modal, with no sidebar page.
    if (canonical === '/market/rentals/new')
      return visibleNavigation(context).some(
        (item) => item.path === '/market/rentals',
      );
    if (
      /^\/market\/(applications|layouts)\/(new|[1-9][0-9]*(?:\/edit)?)$/.test(
        canonical,
      )
    )
      return visibleNavigation(context).some((item) =>
        canonical.startsWith(item.path + '/'),
      );
    return visibleNavigation(context).some(
      (item) =>
        item.path === canonical ||
        ([
          '/market/occurrences',
          '/market/vendors',
          '/market/vendors/memberships',
          '/market/vendors/participation',
          '/market/vendors/listings',
          '/market/vendors/offerings',
          '/market/operations',
          '/market/applications',
          '/market/application-submissions',
          '/market/layouts',
          '/market/assignments',
          '/market/day',
        ].includes(item.path) &&
          new RegExp(`^${item.path}/[1-9][0-9]*$`).test(canonical)),
    );
  }
  const canonical = vendorPath(path);
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/finances\/(?:transactions|expenses|quickbooks)$/.test(canonical)
  )
    return context.permissions.includes('ReadOwnVendorFinance');
  // The overview (and the former Analytics route) also serve analytics-only roles.
  if (
    context.scope === 'VENDOR' &&
    (canonical === '/vendor/finances' || canonical === '/vendor/analytics')
  )
    return (
      context.permissions.includes('ReadOwnVendorFinance') ||
      context.permissions.includes('ReadOwnVendorAnalytics')
    );
  if (
    context.scope === 'VENDOR' &&
    canonical === '/vendor/settings/clover-return'
  )
    return mayCommand(context, 'ManageOwnPosIntegrations');
  if (context.scope === 'VENDOR' && canonical === '/vendor/pos/square-return')
    return context.permissions.includes('OperateOwnPos');
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/loyalty(?:\/(?:rewards(?:\/(?:new|[1-9][0-9]*\/edit))?|leaderboard|redemptions))?$/.test(
      canonical,
    )
  )
    return context.permissions.includes('ReadOwnCRM');
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/applications(?:\/(?:continue|[1-9]\d*|drafts\/[1-9]\d*))?$/.test(
      canonical,
    )
  )
    return context.permissions.includes('ManageOwnMarketParticipation');
  if (context.scope === 'VENDOR' && canonical === '/vendor/booths')
    return context.permissions.includes('ReadOwnVendorIdentity');
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/products\/[^/]+\/setup(?:\/preview|\/variants\/[^/]+)?$/.test(
      canonical,
    )
  )
    return (
      hasPermission(context.permissions, 'ReadOwnCatalog') &&
      mayCommand(context, 'ManageOwnCatalog')
    );
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/products\/[^/]+\/variants\/[^/]+$/.test(canonical)
  )
    return (
      hasPermission(context.permissions, 'ReadOwnCatalog') &&
      mayCommand(context, 'ManageOwnCatalog')
    );
  if (context.scope === 'VENDOR' && canonical === '/vendor/products/new')
    return mayCommand(context, 'ManageOwnCatalog');
  // Market date pages inherit the Markets entry's visibility; commands stay backend-authorized.
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/markets\/[^/]+\/dates\/[^/]+$/.test(canonical)
  )
    return visibleNavigation(context).some(
      (item) => item.path === '/vendor/markets',
    );
  if (context.scope === 'VENDOR' && canonical === '/vendor/inventory')
    return hasPermission(context.permissions, 'ReadOwnInventory');
  if (
    context.scope === 'VENDOR' &&
    /^\/vendor\/products\/[^/]+$/.test(canonical)
  )
    return hasPermission(context.permissions, 'ReadOwnCatalog');
  if (context.scope !== 'VENDOR')
    return visibleNavigation(context).some((item) => item.path === path);
  return visibleNavigation(context).some((item) => {
    if (item.path === '/' && canonical === '/vendor') return true;
    if (item.path === canonical) return true;
    return (
      [
        '/vendor/products',
        '/vendor/orders',
        '/vendor/customers',
        '/vendor/markets',
        '/vendor/applications',
      ].includes(item.path) &&
      new RegExp(`^${item.path}/[^/]+$`).test(canonical)
    );
  });
}
export function marketPath(path: string) {
  return ['/', '/market', '/market/overview'].includes(path) ? '/market' : path;
}
export function mayMarketCommand(
  context: AdminContext,
  permission: Permission,
) {
  return (
    context.scope === 'MARKET' &&
    context.permissions.includes('ReadOwnMarket') &&
    context.permissions.includes(permission)
  );
}
export function vendorPath(path: string) {
  if (path === '/' || path === '/vendor' || path === '/vendor/overview')
    return '/vendor';
  return /^\/(products|inventory|orders|customers|markets|analytics)(\/[^/]+)?$/.test(
    path,
  )
    ? `/vendor${path}`
    : path;
}
export function mayCommand(context: AdminContext, permission: Permission) {
  return (
    context.scope === 'VENDOR' &&
    (!['ManageOwnPaymentAccount', 'ManageOwnPosIntegrations'].includes(
      permission,
    ) ||
      context.membershipRole === 'owner') &&
    hasPermission(context.permissions, permission)
  );
}
export function optionalFeature(
  entitlements: readonly Entitlement[] | undefined,
  featureCode: string,
): 'allowed' | 'denied' | 'unknown' {
  const result = entitlements?.find((item) => item.featureCode === featureCode);
  return result ? (result.allowed ? 'allowed' : 'denied') : 'unknown';
}
// Only optional product capabilities may use this boundary. Safety operations have no gate API.
export type OptionalFeatureSlot = 'analytics' | 'marketing' | 'pos';
export async function resolveAdminContext(
  session: SessionState,
  endpoint: string,
  requestedScope?: AdminScope,
): Promise<AdminContext> {
  if (session.status !== 'authenticated') throw new AppError('authentication');
  const permissions = session.channel.permissions;
  if (
    permissions.includes('SuperAdmin') &&
    (!requestedScope || requestedScope === 'PLATFORM')
  ) {
    const scope = await createManagementApi({
      endpoint,
      channelToken: session.channel.token,
    }).platformScope();
    if (!scope.permissions.includes('SuperAdmin'))
      throw new AppError('forbidden');
    return {
      scope: 'PLATFORM',
      name: 'Platform administration',
      permissions,
      source: 'backend',
    };
  }
  if (
    permissions.includes('ReadOwnVendorIdentity') &&
    (!requestedScope || requestedScope === 'VENDOR')
  ) {
    const result = await createAdminApi({
      endpoint,
      channelToken: session.channel.token,
    }).vendorIdentity();
    const identity = result.ownVendorIdentity;
    if (
      identity.status !== 'active' ||
      identity.channelId !== session.channel.id
    )
      throw new AppError('forbidden');
    const membership = identity.memberships.find(
      (item) =>
        item.principalId === session.user.id && item.status === 'active',
    );
    if (
      !membership ||
      !['owner', 'administrator', 'lead', 'staff'].includes(membership.role)
    )
      throw new AppError('forbidden');
    return {
      scope: 'VENDOR',
      name: result.ownVendorIdentity.name,
      subject: { vendorId: result.ownVendorIdentity.id },
      permissions: identity.permissions.filter((p): p is Permission =>
        permissions.includes(p as Permission),
      ),
      source: 'backend',
      membershipRole: membership.role as
        'owner' | 'administrator' | 'lead' | 'staff',
    };
  }
  if (
    permissions.includes('ReadOwnMarket') &&
    (!requestedScope || requestedScope === 'MARKET')
  ) {
    const result = await createAdminApi({
      endpoint,
      channelToken: session.channel.token,
    }).marketIdentity();
    const identity = result.ownMarketIdentity;
    if (
      identity.channelId !== session.channel.id ||
      identity.membership.principalId !== session.user.id ||
      identity.membership.marketId !== identity.id ||
      identity.membership.status !== 'active' ||
      !['owner', 'administrator', 'lead', 'staff', 'marketAdmin'].includes(
        identity.membership.role,
      ) ||
      !identity.permissions.includes('ReadOwnMarket') ||
      !['active', 'suspended'].includes(identity.status)
    )
      throw new AppError('forbidden');
    return {
      scope: 'MARKET',
      name: identity.name,
      permissions: identity.permissions.filter((p): p is Permission =>
        permissions.includes(p as Permission),
      ),
      subject: { marketId: identity.id },
      source: 'backend',
      membershipRole:
        identity.membership.role === 'marketAdmin'
          ? 'administrator'
          : (identity.membership.role as AdminContext['membershipRole']),
      marketStatus: identity.status as 'active' | 'suspended',
    };
  }
  throw new AppError('forbidden');
}
