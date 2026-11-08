import type { ManagementService } from './service';
import type { VendorService } from '../vendor/service';
import { PlatformOverview, TenantDirectory, TenantDetail } from './platform';
import { Catalog } from './catalog';
import { Billing } from './billing';
import { AccountOnboardingReview } from './AccountOnboardingReview';
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
    if (path === '/platform/tenants')
      return (
        <>
          <AccountOnboardingReview service={service} />
          <TenantDirectory service={service} />
        </>
      );
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
    return <PlatformOverview service={service} />;
  }
  // Tenant Settings tabs (taxes, payments, POS) live in the Settings workspace.
  return <Billing service={service} />;
}
