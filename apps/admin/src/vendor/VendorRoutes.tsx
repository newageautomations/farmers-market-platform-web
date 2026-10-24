import { ContactSubmissions } from './contact-submissions';
import { Categories } from './categories';
import { VendorTaxSettings } from './tax';
import { VendorPos } from './pos';
import { Finances } from '../finance/Finances';
import { CloverOAuthReturn } from './clover';
import { VendorPaymentIntegrations, SquareMobileReturn } from './square';
import { VendorLoyalty } from './loyalty';
import { vendorPath } from '@market/admin-core';
import type { VendorService } from './service';
import { Products } from './catalog';
import { Inventory } from './inventory';
import { Orders } from './orders';
import { Customers } from './customers';
import { Markets } from './markets';
import { Analytics } from './analytics';
import { Overview } from './overview';
import { VendorBooths } from './booths';
export function VendorRoutes({
  service,
  path,
}: {
  service: VendorService;
  path: string;
}) {
  const [, , module, id] = vendorPath(path).split('/');
  if (module === 'finances')
    return (
      <Finances
        key={`${service.vendorId}:${id ?? 'dashboard'}`}
        api={service.finance}
        path={path}
      />
    );
  if (module === 'settings' && id === 'clover-return')
    return <CloverOAuthReturn service={service} />;
  if (module === 'pos' && id === 'square-return')
    return <SquareMobileReturn service={service} />;
  if (module === 'settings' && id === 'taxes')
    return <VendorTaxSettings service={service} />;
  if (module === 'settings' && id === 'payments')
    return <VendorPaymentIntegrations service={service} />;
  if (module === 'contact-submissions')
    return <ContactSubmissions key={service.vendorId} api={service.contact} />;
  if (module === 'pos') return <VendorPos service={service} />;
  if (module === 'loyalty')
    return <VendorLoyalty service={service} path={path} />;
  if (module === 'booths') return <VendorBooths service={service} />;
  // IDs remain opaque backend resource references. They never establish tenant context.
  if (module === 'categories')
    return <Categories key={service.vendorId} service={service} />;
  if (module === 'products') return <Products service={service} id={id} />;
  if (module === 'inventory') return <Inventory service={service} />;
  if (module === 'orders') return <Orders service={service} id={id} />;
  if (module === 'customers') return <Customers service={service} id={id} />;
  if (module === 'markets') return <Markets service={service} id={id} />;
  if (module === 'analytics') return <Analytics service={service} />;
  return <Overview service={service} />;
}
