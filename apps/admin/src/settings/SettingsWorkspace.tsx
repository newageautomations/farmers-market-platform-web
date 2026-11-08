import { EmptyState } from '@market/ui';
import { hasPermission } from '@market/auth';
import {
  notificationsHref,
  mayCommand,
  settingsHref,
  settingsView,
  settingsViewAllowed,
  settingsViews,
  vendorPath,
  type AdminContext,
  type SettingsView,
} from '@market/admin-core';
import type { FarmstandIconName } from '@market/ui/farmstand';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { go } from '../vendor/common';
import { DashboardAppearanceSettings } from '../DashboardAppearance';
import { AccountTimezoneSettings } from '../AccountTimezoneSettings';
import { NotificationPreferences } from '../notifications/NotificationPreferences';
import { VendorTaxSettings } from '../vendor/tax';
import { SquarePaymentIntegration } from '../vendor/square';
import { CloverPaymentIntegration } from '../vendor/clover';
import { Payments } from '../management/payments';
import { Pos } from '../management/pos';
import { PlatformIntegrations } from '../management/platform';
import { MarketSettings } from '../market/settings';
import type { VendorService } from '../vendor/service';
import type { MarketService } from '../market/service';
import type { ManagementService } from '../management/service';
import { SettingsLink, SettingsPanel } from './SettingsPanel';
import { ProviderLogo } from './providers';
import './settings-workspace.css';

const tabs: Record<SettingsView, { label: string; icon: FarmstandIconName }> = {
  preferences: { label: 'Preferences', icon: 'palette' },
  market: { label: 'Market', icon: 'store' },
  notifications: { label: 'Notifications', icon: 'bell' },
  taxes: { label: 'Taxes', icon: 'percent' },
  payments: { label: 'Payments', icon: 'credit-card' },
  pos: { label: 'POS', icon: 'shopping-cart' },
  integrations: { label: 'Integrations', icon: 'plug' },
};
const descriptions = {
  VENDOR:
    'Your preferences, notifications, taxes, payments and POS connections, all in one place.',
  MARKET:
    'Market details, your preferences and notifications, all in one place.',
  PLATFORM: 'Your preferences and platform integration readiness.',
};

/**
 * Consolidated Settings for every role (formerly Settings plus Integrations).
 * Tabs are role-owned route views; visibility mirrors `routeAllowed` and the
 * services available here. Every read and command stays backend-authorized.
 */
export function SettingsWorkspace({
  context,
  path,
  vendor,
  market,
  management,
  connection,
}: {
  context: AdminContext;
  path: string;
  vendor?: VendorService;
  market?: MarketService;
  management?: ManagementService;
  connection?: { endpoint: string; channelToken: string };
}) {
  const scope = context.scope;
  const notifications = vendor?.notifications ?? market?.notifications;
  const stripe =
    !!management && hasPermission(context.permissions, 'ReadOwnPaymentAccount');
  const inPerson =
    !!vendor?.pos && mayCommand(context, 'ManageOwnPosIntegrations');
  const supplied: Record<SettingsView, boolean> = {
    preferences: true,
    market: !!market,
    notifications: !!notifications,
    taxes: !!vendor,
    payments: stripe || inPerson,
    pos: !!management,
    integrations: !!management,
  };
  const views = settingsViews[scope].filter(
    (view) => supplied[view] && settingsViewAllowed(context, view),
  );
  const requested = settingsView(
    scope,
    scope === 'VENDOR' ? vendorPath(path) : path,
  );
  const view: SettingsView =
    requested && views.includes(requested)
      ? requested
      : (views[0] ?? 'preferences');
  return (
    <WorkspaceFrame
      className="settings-workspace"
      icon="settings"
      title="Settings"
      description={descriptions[scope]}
      tabs={views.map((value) => ({
        value,
        ...tabs[value],
        href: settingsHref(scope, value),
      }))}
      value={view}
      onChange={(next) => go(settingsHref(scope, next))}
    >
      <div className="markets-view settings-view" key={view}>
        {view === 'preferences' && (
          <div className="markets-columns settings-columns">
            <SettingsPanel icon="palette" title="Dashboard colors">
              <DashboardAppearanceSettings embedded />
            </SettingsPanel>
            <SettingsPanel
              icon="calendar-days"
              title="Account time zone"
              description="Personal to you and shared across your business roles. Market schedules keep their own time zone."
            >
              {connection ? (
                <AccountTimezoneSettings
                  key={connection.channelToken}
                  connection={connection}
                  embedded
                />
              ) : (
                <p className="settings-note">
                  Connect to the backend to choose a time zone.
                </p>
              )}
            </SettingsPanel>
          </div>
        )}
        {view === 'market' && market && (
          <SettingsPanel
            icon="store"
            title="Market configuration"
            module="market-workspace"
          >
            <MarketSettings key={market.readKey} service={market} embedded />
          </SettingsPanel>
        )}
        {view === 'notifications' && notifications && (
          <SettingsPanel icon="bell" title="Notification preferences">
            <NotificationPreferences
              key={`${scope}:${connection?.channelToken}`}
              context={context}
              api={notifications}
              embedded
            />
            <p className="settings-note">
              Inbox delivery and unsubscribes for your own account are in{' '}
              <SettingsLink to={notificationsHref(scope, 'settings')}>
                notification settings
              </SettingsLink>
              .
            </p>
          </SettingsPanel>
        )}
        {view === 'taxes' && vendor && (
          <SettingsPanel
            icon="percent"
            title="Sales tax rates"
            module="vendor-workspace"
          >
            <VendorTaxSettings service={vendor} embedded />
          </SettingsPanel>
        )}
        {view === 'payments' && (
          <>
            {stripe && (
              <SettingsPanel
                icon="credit-card"
                media={<ProviderLogo code="stripe" />}
                title="Marketplace Stripe Connect"
                description="Stripe Connect account for marketplace payouts. A connected account does not qualify shopper payment confirmation."
                module="management-workspace"
              >
                <Payments service={management!} embedded />
              </SettingsPanel>
            )}
            {inPerson && (
              <>
                <SettingsPanel
                  icon="credit-card"
                  media={<ProviderLogo code="square" />}
                  title="Square"
                  module="vendor-workspace"
                >
                  <SquarePaymentIntegration api={vendor!.pos!} embedded />
                </SettingsPanel>
                <SettingsPanel
                  icon="credit-card"
                  media={<ProviderLogo code="clover" />}
                  title="Clover"
                  module="vendor-workspace"
                >
                  <CloverPaymentIntegration api={vendor!.pos!} embedded />
                </SettingsPanel>
              </>
            )}
          </>
        )}
        {view === 'pos' && management && (
          <SettingsPanel
            icon="shopping-cart"
            title="POS connections"
            description="Point-of-sale providers and the connections that observe your inventory."
            module="management-workspace"
          >
            <Pos service={management} vendor={vendor} />
          </SettingsPanel>
        )}
        {view === 'integrations' && management && (
          <SettingsPanel
            icon="plug"
            title="Provider readiness"
            module="management-workspace"
          >
            <PlatformIntegrations service={management} />
            <p className="settings-note">
              Provider secrets and production deployment settings are configured
              outside product administration. Platform pricing and access
              policies have purpose-specific catalog workflows.
            </p>
            <div>
              <SettingsLink to="/platform/billing/policies" appearance="button">
                Manage subscription access policies
              </SettingsLink>
            </div>
          </SettingsPanel>
        )}
        {!views.length && (
          <EmptyState title="Settings unavailable">
            <p>Your account has no settings available here.</p>
          </EmptyState>
        )}
      </div>
    </WorkspaceFrame>
  );
}
