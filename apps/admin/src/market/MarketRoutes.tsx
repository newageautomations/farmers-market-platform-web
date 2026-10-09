import { marketPath } from '@market/admin-core';
import type { MarketService } from './service';
import { MarketAnalytics } from './analytics';
import { MarketOccurrences } from './occurrences';
import { MarketOperations } from './operations';
import { MarketOverview } from './overview';
import { MarketSettings } from './settings';
import { MarketVendors } from './vendors';
import { Phase14Routes } from './phase14/OperationsRoutes';
export function MarketRoutes({
  service,
  path,
}: {
  service: MarketService;
  path: string;
}) {
  const canonical = marketPath(path);
  if (
    /^\/market\/(applications|application-submissions|directory|rentals|layouts|assignments|booth-billing|day)(\/|$)/.test(
      canonical,
    )
  )
    return service.phase14 ? (
      <Phase14Routes
        key={`${service.readKey}:${canonical}`}
        api={service.phase14}
        path={canonical}
        permissions={service.context.permissions}
      />
    ) : (
      <p>Market operations connection is unavailable.</p>
    );
  const id = canonical.split('/')[3] ?? '';
  if (canonical === '/market')
    return <MarketOverview key={service.readKey} service={service} />;
  if (canonical.startsWith('/market/occurrences'))
    return (
      <MarketOccurrences
        key={canonical}
        service={service}
        id={['generate', 'new'].includes(id) ? undefined : id}
        view={id === 'generate' ? 'generate' : id === 'new' ? 'manual' : 'list'}
      />
    );
  if (canonical.startsWith('/market/vendors'))
    return (
      <MarketVendors
        key={canonical}
        service={service}
        id={
          ['memberships', 'participation', 'listings', 'offerings'].includes(id)
            ? canonical.split('/')[4]
            : id
        }
        tab={
          ['memberships', 'participation', 'listings', 'offerings'].includes(id)
            ? (id as 'memberships' | 'participation' | 'listings' | 'offerings')
            : 'memberships'
        }
      />
    );
  if (canonical.startsWith('/market/operations'))
    return <MarketOperations key={service.readKey} service={service} id={id} />;
  if (canonical === '/market/analytics')
    return <MarketAnalytics key={service.readKey} service={service} />;
  return <MarketSettings key={service.readKey} service={service} />;
}
