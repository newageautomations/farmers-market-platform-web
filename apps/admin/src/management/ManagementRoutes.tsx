import type { ManagementService } from './service';
import type { VendorService } from '../vendor/service';
import { PlatformOverview, TenantDirectory, TenantDetail } from './platform';
import { Catalog } from './catalog';
import { Billing } from './billing';
import { AccountOnboardingReview } from './AccountOnboardingReview';
import { PlatformTestAccounts } from './PlatformTestAccounts';
import { StripeConnections } from './StripeConnections';
import type { ReactNode } from 'react';
import type { FarmstandIconName } from '@market/ui/farmstand';
import { WorkspaceFrame } from '../WorkspaceFrame';

/** Platform pages share the Markets workspace heading and Farmstand controls. */
function PlatformFrame({
  icon,
  title,
  description,
  children,
}: {
  icon: FarmstandIconName;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <WorkspaceFrame
      icon={icon}
      title={title}
      description={description}
      tabs={[]}
      value="platform"
      onChange={() => {}}
      className="platform-workspace farmstand-controls"
    >
      {children}
    </WorkspaceFrame>
  );
}
export function ManagementRoutes({
  service,
  path,
}: {
  service: ManagementService;
  path: string;
  /** Retained for callers; tenant POS now renders in Settings. */
  vendor?: VendorService;
}) {
  if (service.context.scope === 'PLATFORM') {
    if (
      path === '/platform/test-accounts' &&
      service.context.testAccountsAvailable
    )
      return (
        <PlatformFrame
          icon="user-round"
          title="Test Accounts"
          description="Create test logins for customers, vendor owners, and market managers."
        >
          <PlatformTestAccounts service={service} />
        </PlatformFrame>
      );
    if (path === '/platform/stripe-connections')
      return (
        <PlatformFrame
          icon="credit-card"
          title="Stripe Connections"
          description="Manage and monitor Stripe payment connections for vendors and markets."
        >
          <StripeConnections service={service} />
        </PlatformFrame>
      );
    if (path === '/platform/tenants')
      return (
        <PlatformFrame
          icon="store"
          title="Tenants"
          description="Review onboarding requests and manage Vendor and Market businesses."
        >
          <AccountOnboardingReview service={service} />
          <TenantDirectory service={service} />
        </PlatformFrame>
      );
    const detail = /^\/platform\/tenants\/(vendor|market)\/([1-9][0-9]*)$/.exec(
      path,
    );
    if (detail)
      return (
        <PlatformFrame
          icon="store"
          title="Tenant"
          description="Subscription, entitlements and module readiness for this business."
        >
          <TenantDetail
            service={service}
            kind={detail[1] === 'vendor' ? 'VENDOR' : 'MARKET'}
            id={detail[2]!}
          />
        </PlatformFrame>
      );
    if (path.startsWith('/platform/billing'))
      return (
        <PlatformFrame
          icon="receipt-text"
          title="Billing catalog"
          description="Plans, versions and offers available to platform tenants."
        >
          <Catalog key={path} service={service} path={path} />
        </PlatformFrame>
      );
    return (
      <PlatformFrame
        icon="layers"
        title="Overview"
        description="Shared platform administration"
      >
        <PlatformOverview service={service} />
      </PlatformFrame>
    );
  }
  // Tenant Settings tabs (taxes, payments, POS) live in the Settings workspace.
  return <Billing service={service} />;
}
