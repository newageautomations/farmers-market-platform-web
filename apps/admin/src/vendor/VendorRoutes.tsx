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
  if (module === 'booths') return <VendorBooths service={service} />;
  // IDs remain opaque backend resource references. They never establish tenant context.
  if (module === 'products') return <Products service={service} id={id} />;
  if (module === 'inventory') return <Inventory service={service} />;
  if (module === 'orders') return <Orders service={service} id={id} />;
  if (module === 'customers') return <Customers service={service} id={id} />;
  if (module === 'markets') return <Markets service={service} id={id} />;
  if (module === 'analytics') return <Analytics service={service} />;
  return <Overview service={service} />;
}
