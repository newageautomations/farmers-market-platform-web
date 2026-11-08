import { TeamWorkspace } from '../team/TeamWorkspace';
import { AttendanceHistory } from '../market/phase14/Attendance';
import { VendorPacking, PackingCardStatus } from './packing';
import {
  VendorApplicationContinuation,
  VendorDraftPreview,
} from './application-continuation';
import { RouteLink } from './common';
import { VendorApplicationDetail } from './application-detail';
import { ApplicantApplications } from '@market/ui';
import { ContactSubmissions } from './contact-submissions';
import { VendorPos } from './pos';
import { Finances } from '../finance/Finances';
import { CloverOAuthReturn } from './clover';
import { SquareMobileReturn } from './square';
import { VendorLoyalty } from './loyalty';
import { vendorPath } from '@market/admin-core';
import type { VendorService } from './service';
import { Products } from './catalog';
import { CatalogWorkspace } from './CatalogWorkspace';
import { Orders } from './orders';
import { VendorPickup } from './pickup';
import { Customers } from './customers';
import { Markets } from './markets';
import { VendorDashboard } from './VendorDashboard';
import { VendorBooths } from './booths';
export function VendorRoutes({
  service,
  path,
}: {
  service: VendorService;
  path: string;
}) {
  const [, , module, id, child, variantId, setupVariantId] =
    vendorPath(path).split('/');
  if (module === 'team')
    return <TeamWorkspace api={service.team} context={service.context} />;
  if (module === 'finances' || module === 'analytics')
    return (
      <Finances
        key={service.vendorId}
        api={service.finance}
        path={path}
        canReadFinance={service.context.permissions.includes(
          'ReadOwnVendorFinance',
        )}
      />
    );
  if (module === 'settings' && id === 'clover-return')
    return <CloverOAuthReturn service={service} />;
  if (module === 'pos' && id === 'square-return')
    return <SquareMobileReturn service={service} />;
  if (module === 'contact-submissions')
    return <ContactSubmissions key={service.vendorId} api={service.contact} />;
  if (module === 'pos') return <VendorPos service={service} />;
  if (module === 'loyalty')
    return <VendorLoyalty service={service} path={path} />;
  if (module === 'applications' && id === 'continue')
    return <VendorApplicationContinuation service={service} />;
  if (module === 'applications' && id === 'drafts')
    return (
      <VendorDraftPreview service={service} id={Number(path.split('/')[4])} />
    );
  if (module === 'applications' && !id)
    return <Markets service={service} initialView="applications" />;
  if (module === 'applications' && /^[1-9]\d*$/.test(id ?? '') && !child)
    return service.applications ? (
      <VendorApplicationDetail
        key={`${service.vendorId}:${id}`}
        api={service.applications}
        id={Number(id)}
        vendorId={Number(service.vendorId)}
      />
    ) : (
      <p>Applications are unavailable in this environment.</p>
    );
  if (module === 'applications')
    return service.applications ? (
      <ApplicantApplications
        key={id ?? 'list'}
        api={service.applications}
        id={id ? Number(id) : undefined}
        basePath="/vendor/applications"
        vendorId={Number(service.vendorId)}
        renderLink={(href, label) => <RouteLink to={href}>{label}</RouteLink>}
        vendorOrigin={window.location.origin}
      />
    ) : (
      <p>Applications are unavailable in this environment.</p>
    );
  if (module === 'day')
    return service.marketAttendance ? (
      <>
        <p>
          Scheduled appearances reserve your market date. Market staff record
          physical attendance. Use the date filters to view upcoming dates or
          past attendance.
        </p>
        <AttendanceHistory
          key={service.vendorId}
          api={service.marketAttendance}
          vendor
          renderVendorExtra={
            service.packing
              ? (row) => (
                  <PackingCardStatus
                    api={service.packing!}
                    occurrenceId={row.occurrenceId}
                  />
                )
              : undefined
          }
        />
      </>
    ) : (
      <p>Market Day is unavailable in this environment.</p>
    );
  if (module === 'booths') return <VendorBooths service={service} />;
  // IDs remain opaque backend resource references. They never establish tenant context.
  if (module === 'categories')
    return (
      <RouteLink to="/vendor/products">
        Assign standard categories in Products &amp; Inventory
      </RouteLink>
    );
  if (module === 'products')
    return (
      <Products
        key={`${service.vendorId}:${id ?? 'list'}:${variantId ?? ''}`}
        service={service}
        id={id}
        setup={child === 'setup'}
        preview={child === 'setup' && variantId === 'preview'}
        variantId={
          child === 'variants'
            ? variantId
            : child === 'setup' && variantId === 'variants'
              ? setupVariantId
              : undefined
        }
      />
    );
  if (module === 'inventory') return <CatalogWorkspace service={service} />;
  if (module === 'orders' && id === 'pickup')
    return <VendorPickup key={service.vendorId} service={service} />;
  if (module === 'orders' && id === 'packing')
    return <VendorPacking key={service.vendorId} service={service} />;
  if (module === 'orders') return <Orders service={service} id={id} />;
  if (module === 'customers') return <Customers service={service} id={id} />;
  if (module === 'markets')
    return (
      <Markets
        key={`${service.vendorId}:${id ?? ''}:${child ?? ''}:${variantId ?? ''}`}
        service={service}
        id={id}
        occurrenceId={child === 'dates' ? variantId : undefined}
      />
    );
  return <VendorDashboard key={service.vendorId} service={service} />;
}
