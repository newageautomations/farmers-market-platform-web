import { Alert } from '@market/ui';
import '@market/ui/loyalty.css';
import type { VendorService } from './service';
import { LoyaltyDashboard } from './LoyaltyDashboard';

export function VendorLoyalty({
  service,
  path,
}: {
  service: VendorService;
  path: string;
}) {
  if (!service.loyalty)
    return (
      <Alert severity="info">Loyalty is unavailable in this environment.</Alert>
    );
  return (
    <LoyaltyDashboard
      key={service.vendorId}
      service={service}
      initialView={
        path.includes('/rewards')
          ? 'rewards'
          : path.endsWith('/leaderboard')
            ? 'leaderboard'
            : path.endsWith('/redemptions')
              ? 'redemptions'
              : undefined
      }
      initialCreate={path.endsWith('/new')}
      initialRewardId={
        /\/rewards\/\d+\/edit$/.test(path)
          ? Number(path.split('/').at(-2))
          : undefined
      }
    />
  );
}

export { LoyaltyRewardWizard } from './LoyaltyRewardWizard';
