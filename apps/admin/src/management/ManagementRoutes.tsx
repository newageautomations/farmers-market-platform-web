import type { ManagementService } from './service';
import type { VendorService } from '../vendor/service';
import { RouteLink } from '../vendor/common';
import {
  PlatformOverview,
  PlatformIntegrations,
  TenantDirectory,
  TenantDetail,
} from './platform';
import { Catalog } from './catalog';
import { Payments } from './payments';
import { Pos } from './pos';
import { Billing } from './billing';
export function ManagementRoutes({
  service,
  path,
  vendor,
}: {
  service: ManagementService;
  path: string;
  vendor?: VendorService;
}) {
  if (service.context.scope === 'PLATFORM') {
    if (path === '/platform/tenants')
      return <TenantDirectory service={service} />;
    const detail = /^\/platform\/tenants\/(vendor|market)\/([1-9][0-9]*)$/.exec(
      path,
    );
    if (detail)
      return (
        <TenantDetail
          service={service}
          kind={detail[1] === 'vendor' ? 'VENDOR' : 'MARKET'}
          id={detail[2]!}
        />
      );
    if (path.startsWith('/platform/billing'))
      return <Catalog key={path} service={service} path={path} />;
    if (path === '/platform/integrations')
      return <PlatformIntegrations service={service} />;
    if (path === '/platform/settings')
      return (
        <>
          <PlatformIntegrations service={service} />
          <p>
            Provider secrets and production deployment settings are configured
            outside product administration. Platform pricing and access policies
            have purpose-specific catalog workflows.
          </p>
          <RouteLink to="/platform/billing/policies">
            Manage subscription access policies
          </RouteLink>
        </>
      );
    return <PlatformOverview service={service} />;
  }
  if (path.endsWith('/integrations/payments'))
    return <Payments service={service} />;
  if (path.endsWith('/integrations/pos'))
    return <Pos service={service} vendor={vendor} />;
  if (path.endsWith('/billing')) return <Billing service={service} />;
  return (
    <>
      <p>
        Manage the current tenant's integrations and billing using its current
        grants.
      </p>
      <nav className="overview-links" aria-label="Tenant settings">
        {service.context.permissions.includes('ReadOwnPaymentAccount') && (
          <RouteLink to="/vendor/integrations/payments">
            Marketplace Stripe Connect
          </RouteLink>
        )}
        {service.context.permissions.includes('ReadOwnPosIntegrations') && (
          <RouteLink to="/vendor/integrations/pos">POS integrations</RouteLink>
        )}
        {service.context.permissions.includes('ReadOwnBilling') && (
          <RouteLink to={`/${service.context.scope.toLowerCase()}/billing`}>
            Subscription and entitlements
          </RouteLink>
        )}
      </nav>
      <p>
        POS connection does not establish physical inventory authority. Stripe
        connection does not qualify shopper payment confirmation.
      </p>
    </>
  );
}
