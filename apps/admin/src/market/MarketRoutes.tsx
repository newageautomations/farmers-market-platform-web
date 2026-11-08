import { TeamWorkspace } from '../team/TeamWorkspace';
import { marketPath } from '@market/admin-core';
import { Finances } from '../finance/Finances';
import { MarketLoyalty } from './loyalty';
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
  if (canonical === '/market/team')
    return <TeamWorkspace api={service.team} context={service.context} />;
  if (/^\/market\/(finances|analytics|booth-billing)(\/|$)/.test(canonical)) {
    const permissions = service.context.permissions;
    const billing = permissions.includes('ReadOwnMarketBilling');
    return (
      <Finances
        key={service.readKey}
        api={service.finance}
        // Former Booth billing and Analytics routes open their finance tab.
        path={
          canonical.startsWith('/market/booth-billing')
            ? '/market/finances/invoices'
            : canonical
        }
        manager
        canReadFinance={billing}
        insights={
          permissions.includes('ReadOwnMarketAnalytics')
            ? (scope) => <MarketAnalytics service={service} scope={scope} />
            : undefined
        }
        invoices={
          billing && service.phase14 ? (
            <Phase14Routes
              api={service.phase14}
              notifications={service.notifications}
              path="/market/booth-billing"
              permissions={permissions}
            />
          ) : undefined
        }
      />
    );
  }
  if (canonical.startsWith('/market/loyalty'))
    return (
      <MarketLoyalty
        key={`${service.readKey}:${canonical}`}
        service={service}
        path={canonical}
      />
    );
  if (
    /^\/market\/(applications|application-submissions|rentals|layouts|assignments|day)(\/|$)/.test(
      canonical,
    )
  )
    return service.phase14 ? (
      <Phase14Routes
        key={`${service.readKey}:${/^\/market\/(applications|application-submissions)$/.test(canonical) ? 'applications' : canonical}`}
        api={service.phase14}
        rentalMedia={service.rentalMedia}
        notifications={service.notifications}
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
        key={
          ['', 'generate', 'new'].includes(id)
            ? '/market/occurrences'
            : canonical
        }
        service={service}
        id={['generate', 'new'].includes(id) ? undefined : id}
        view={id === 'generate' ? 'generate' : id === 'new' ? 'manual' : 'list'}
      />
    );
  // The former directory routes open the combined Vendors list.
  if (/^\/market\/directory(\/new)?$/.test(canonical))
    return (
      <MarketVendors
        key={canonical}
        service={service}
        adding={canonical.endsWith('/new')}
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
  return <MarketSettings key={service.readKey} service={service} />;
}
