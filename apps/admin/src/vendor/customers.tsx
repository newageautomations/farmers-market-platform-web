import type { VendorService } from './service';
import { CustomersWorkspace } from './customers-workspace';
import { CustomerDetail } from './customer-detail';

export function Customers({
  service,
  id,
}: {
  service: VendorService;
  id?: string;
}) {
  const scope = `${service.vendorId}:${service.context.permissions.join(',')}`;
  if (id)
    return <CustomerDetail key={`${scope}:${id}`} service={service} id={id} />;
  return <CustomersWorkspace key={scope} service={service} />;
}
