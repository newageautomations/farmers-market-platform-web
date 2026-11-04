import { Badge } from '@market/ui';
import { vendorOrderStatus } from './order-presentation';
export function OrderStatus({
  domain,
  value,
}: {
  domain: Parameters<typeof vendorOrderStatus>[0];
  value: string;
}) {
  const status = vendorOrderStatus(domain, value);
  return (
    <Badge tone={status.tone} className="order-status-badge">
      <span className="order-status-dot" aria-hidden="true" />
      {status.label}
    </Badge>
  );
}
