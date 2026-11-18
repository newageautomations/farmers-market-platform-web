import {
  createContext,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type {
  CustomerDashboardLayout,
  CustomerEvent,
  CustomerFollow,
  CustomerPurchase,
  LoyaltyWallet,
} from '@market/api';
import { formatMoney } from '@market/config';
import { Alert, Badge, EmptyState } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  type FarmstandIconName,
} from '@market/ui/farmstand';
import { MarketsSummary } from '@market/ui/workspace';
import { compact, type GridItem } from '@market/ui/dashboard-grid';
import {
  DashboardLayoutEditor,
  dashboardSections,
} from '@market/ui/dashboard-layout';
import {
  defaultOverviewLayout,
  normalizeOverviewLayout,
  overviewBands,
  overviewWidgets,
  type OverviewWidgetId,
} from '../lib/customer-overview';
import {
  awaitingPickup,
  eventTile,
  eventTimeRange,
  financialStatus,
  nextPickup,
  plural,
  purchaseDate,
  purchasePickup,
  longEventDate,
  relativeDays,
  shortDate,
  shortEventDate,
} from '../lib/customer-presentation';

export interface CustomerOverviewData {
  firstName: string;
  counts: { orders: number; markets: number; vendors: number };
  events: readonly CustomerEvent[];
  purchases: readonly CustomerPurchase[];
  markets: readonly CustomerFollow[];
  vendors: readonly CustomerFollow[];
  /** Null when loyalty could not be read; the section explains instead. */
  wallets: LoyaltyWallet[] | null;
  layout: Partial<CustomerDashboardLayout> | null;
  /** Server time, so server and client render the same relative days. */
  now: number;
  /** The customer's time zone, for pickup dates without a market zone. */
  timeZone: string;
}

/** The cell a section occupies, in grid units, for size-aware content. */
const WidgetSize = createContext<GridItem>({ id: '', x: 0, y: 0, w: 4, h: 2 });

/**
 * Customer Overview: a customizable dashboard of what is coming up and what
 * the customer has ordered, composed like the vendor Dashboard (workspace
 * heading, MarketsSummary, Farmstand panels, the shared dashboard grid and
 * layout editor). It shows no charts. All data is read on the server under
 * the customer's own session; only the arrangement is saved from here.
 */
export default function CustomerOverview(data: CustomerOverviewData) {
  const [layout, setLayout] = useState(() =>
    normalizeOverviewLayout(data.layout),
  );
  /** Grid width when Customize was chosen, so the editor keeps its proportions. */
  const [customizing, setCustomizing] = useState<number | false>(false);
  const [notice, setNotice] = useState('');
  const grid = useRef<HTMLDivElement>(null);

  async function save(next: CustomerDashboardLayout) {
    const value = normalizeOverviewLayout(next);
    const response = await fetch('/api/customer-dashboard-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: value }),
    });
    if (!response.ok) throw new Error('Layout not saved');
    setLayout(value);
    setNotice('Your Overview layout was saved.');
  }

  const widgets: Record<OverviewWidgetId, ReactNode> = {
    glance: <Glance data={data} />,
    'next-market': <NextMarket events={data.events} now={data.now} />,
    pickups: (
      <Pickups
        purchases={data.purchases}
        now={data.now}
        timeZone={data.timeZone}
      />
    ),
    'recent-orders': <RecentOrders purchases={data.purchases} />,
    rewards: <Rewards wallets={data.wallets} />,
    markets: (
      <Follows
        kind="markets"
        items={data.markets}
        total={data.counts.markets}
        events={data.events}
        now={data.now}
      />
    ),
    vendors: (
      <Follows
        kind="vendors"
        items={data.vendors}
        total={data.counts.vendors}
        events={data.events}
        now={data.now}
      />
    ),
  };
  const cells = compact(
    (layout.grid ?? []).filter(
      (cell) => !layout.hidden.includes(cell.id) && cell.id in widgets,
    ),
  );

  return (
    <div className="customer-overview">
      <header className="markets-heading customer-heading">
        <FarmstandIcon name="layers" />
        <div>
          <h1>Overview</h1>
          <p>
            Welcome back{data.firstName ? `, ${data.firstName}` : ''}. Your
            upcoming markets, pickups and orders in one place.
          </p>
        </div>
        <div className="customer-heading-actions">
          <FarmstandButton
            variant="secondary"
            onClick={() => {
              setNotice('');
              setCustomizing(
                grid.current?.getBoundingClientRect().width ?? 1100,
              );
            }}
          >
            <FarmstandIcon name="sliders-horizontal" />
            Customize
          </FarmstandButton>
        </div>
      </header>
      {notice && (
        <Alert severity="success" role="status">
          {notice}
        </Alert>
      )}
      <div className="vendor-dashboard-stack" ref={grid}>
        {dashboardSections(cells, overviewBands).map((section) =>
          section.band ? (
            <div
              key={section.band.id}
              className="vendor-dashboard-band"
              data-widget={section.band.id}
            >
              <WidgetSize.Provider value={section.band}>
                {widgets[section.band.id as OverviewWidgetId]}
              </WidgetSize.Provider>
            </div>
          ) : (
            <div key={section.cells[0]!.id} className="vendor-dashboard-grid">
              {section.cells.map((cell) => (
                <div
                  key={cell.id}
                  className="vendor-dashboard-widget"
                  data-widget={cell.id}
                  data-w={cell.w}
                  data-h={cell.h}
                  style={
                    {
                      '--x': cell.x + 1,
                      '--y': cell.y - section.top + 1,
                      '--w': cell.w,
                      '--h': cell.h,
                      // Two-column (tablet) layout: wide sections take both columns.
                      '--wn': cell.w >= 4 ? 2 : 1,
                    } as CSSProperties
                  }
                >
                  <WidgetSize.Provider value={cell}>
                    {widgets[cell.id as OverviewWidgetId]}
                  </WidgetSize.Provider>
                </div>
              ))}
            </div>
          ),
        )}
      </div>
      {cells.length === 0 && (
        <FarmstandPanel as="section" className="customer-overview-panel">
          <EmptyState title="Every Overview section is hidden">
            <p>Use Customize to choose the sections you want to see.</p>
          </EmptyState>
        </FarmstandPanel>
      )}
      {customizing !== false && (
        <DashboardLayoutEditor<CustomerDashboardLayout>
          layout={layout}
          widgets={overviewWidgets}
          defaultLayout={defaultOverviewLayout}
          normalize={normalizeOverviewLayout}
          title="Customize Overview"
          description="Drag sections to move them and drag a corner to resize. Neighbouring sections move or narrow to make room. Your layout is saved to your account."
          pageWidth={customizing}
          available={() => true}
          onClose={() => setCustomizing(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function PanelHeader({
  id,
  icon,
  title,
  link,
  children,
}: {
  id: string;
  icon: FarmstandIconName;
  title: string;
  link?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="vendor-dashboard-panel-header customer-overview-header">
      <h2 id={id}>
        <FarmstandIcon name={icon} />
        {title}
        {children}
      </h2>
      {link && (
        <FarmstandLink href={link.href} appearance="text">
          {link.label}
          <FarmstandIcon name="arrow-right" />
        </FarmstandLink>
      )}
    </div>
  );
}

function Glance({ data }: { data: CustomerOverviewData }) {
  const pending = data.purchases.filter(awaitingPickup).length;
  return (
    <section aria-label="At a glance">
      <MarketsSummary
        className="customer-summary-four customer-overview-glance"
        items={[
          {
            label: 'Orders placed',
            value: data.counts.orders,
            hint: 'Across every market and vendor',
            icon: 'receipt-text',
          },
          {
            label: 'Awaiting pickup',
            value: pending,
            hint: pending
              ? `${plural(pending, 'recent order')} to collect`
              : 'Nothing waiting to be collected',
            icon: 'package',
            tone: pending ? 'warning' : undefined,
          },
          {
            label: 'Followed markets',
            value: data.counts.markets,
            hint: data.events.length
              ? `${plural(data.events.length, 'upcoming date')} ahead`
              : 'No upcoming dates yet',
            icon: 'store',
          },
          {
            label: 'Favorite vendors',
            value: data.counts.vendors,
            hint: 'Vendors you follow',
            icon: 'heart',
          },
        ]}
      />
    </section>
  );
}

function NextMarket({
  events,
  now,
}: {
  events: readonly CustomerEvent[];
  now: number;
}) {
  const cell = useContext(WidgetSize);
  const next = events[0];
  const later = events.slice(1, cell.h < 3 ? 4 : cell.w >= 5 ? 6 : 5);
  const tile = next && eventTile(next);
  return (
    <FarmstandPanel
      as="section"
      className="markets-next vendor-dashboard-next"
      aria-label="Next market"
    >
      <h2>
        <FarmstandIcon name="calendar-days" />
        Next market
      </h2>
      {next && tile ? (
        <div
          className="vendor-dashboard-next-body"
          data-event-id={String(next.id)}
        >
          <div
            className="markets-next-art vendor-dashboard-date-tile"
            aria-hidden="true"
          >
            <span>{tile.month}</span>
            <strong>{tile.day}</strong>
            <span>{tile.weekday}</span>
          </div>
          <div className="markets-next-content">
            <h3>{next.marketName}</h3>
            <dl className="vendor-dashboard-next-facts">
              <div>
                <dt>
                  <FarmstandIcon name="calendar-days" />
                  <span className="sr-only">Date</span>
                </dt>
                <dd>
                  {longEventDate(next)}
                  <small>
                    {relativeDays(next.startsAt, now, next.timezone)}
                  </small>
                </dd>
              </div>
              <div>
                <dt>
                  <FarmstandIcon name="clock" />
                  <span className="sr-only">Time</span>
                </dt>
                <dd>{eventTimeRange(next)}</dd>
              </div>
              <div>
                <dt>
                  <FarmstandIcon name="map-pin" />
                  <span className="sr-only">Location</span>
                </dt>
                <dd>{next.venue || 'Location to be announced'}</dd>
              </div>
              <div>
                <dt>
                  <FarmstandIcon name="heart" />
                  <span className="sr-only">Favorite vendors</span>
                </dt>
                <dd>
                  {next.vendors.length
                    ? next.vendors.map((v) => v.name).join(', ')
                    : 'No favorite vendors confirmed yet'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="vendor-dashboard-next-actions">
            {next.url && (
              <FarmstandLink variant="primary" href={next.url}>
                <FarmstandIcon name="shopping-cart" />
                Shop this date
              </FarmstandLink>
            )}
            <FarmstandLink
              variant="secondary"
              href={`/account/markets?date=${encodeURIComponent(String(next.id))}`}
            >
              Date details
              <FarmstandIcon name="chevron-right" />
            </FarmstandLink>
          </div>
          {later.length > 0 && (
            <div className="vendor-dashboard-later">
              <h3>Also coming up</h3>
              <ul>
                {later.map((event) => (
                  <li key={String(event.id)} data-event-id={String(event.id)}>
                    <a
                      href={`/account/markets?date=${encodeURIComponent(String(event.id))}`}
                    >
                      <span>
                        <strong>{event.marketName}</strong>
                        <small>{shortEventDate(event)}</small>
                      </span>
                      <Badge
                        tone={event.vendors.length ? 'success' : 'neutral'}
                      >
                        {event.vendors.length
                          ? plural(event.vendors.length, 'favorite')
                          : relativeDays(event.startsAt, now, event.timezone)}
                      </Badge>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title="No upcoming markets">
          <p>
            Follow markets and vendors to see their next scheduled dates here.
          </p>
          <FarmstandLink variant="secondary" href="/account/markets#discover">
            Find markets
          </FarmstandLink>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}

function Pickups({
  purchases,
  now,
  timeZone,
}: {
  purchases: readonly CustomerPurchase[];
  now: number;
  timeZone: string;
}) {
  const pending = purchases
    .filter(awaitingPickup)
    .map((purchase) => ({ purchase, next: nextPickup(purchase, now) }))
    .sort(
      (a, b) =>
        (a.next ? Date.parse(a.next.startsAt) : Infinity) -
        (b.next ? Date.parse(b.next.startsAt) : Infinity),
    );
  return (
    <FarmstandPanel
      as="section"
      className="customer-overview-panel"
      aria-labelledby="overview-pickups"
    >
      <PanelHeader
        id="overview-pickups"
        icon="package"
        title="Ready for pickup"
        link={{ href: '/account/orders', label: 'All orders' }}
      >
        {pending.length > 0 && <Badge tone="warning">{pending.length}</Badge>}
      </PanelHeader>
      {pending.length ? (
        <ul className="customer-overview-list">
          {pending.map(({ purchase, next }) => {
            const status = purchasePickup(purchase);
            return (
              <li key={String(purchase.orderId)}>
                <a
                  href={`/account/orders?order=${encodeURIComponent(String(purchase.orderId))}`}
                >
                  <span className="markets-identity-icon">
                    <FarmstandIcon name="package" />
                  </span>
                  <span>
                    <strong>
                      {purchase.portions.map((p) => p.vendorName).join(', ')}
                    </strong>
                    <small>
                      Order {purchase.orderId}
                      {next ? ` · ${shortDate(next.startsAt, timeZone)}` : ''}
                      {next?.portion.pickupPromise.venue
                        ? ` · ${next.portion.pickupPromise.venue}`
                        : ''}
                    </small>
                  </span>
                  <Badge tone={status.tone}>
                    {next
                      ? relativeDays(next.startsAt, now, timeZone)
                      : status.label}
                  </Badge>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Nothing to pick up">
          <p>Orders waiting to be collected will appear here.</p>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}

function RecentOrders({
  purchases,
}: {
  purchases: readonly CustomerPurchase[];
}) {
  const cell = useContext(WidgetSize);
  const shown = purchases.slice(0, cell.h >= 3 ? 8 : 5);
  return (
    <FarmstandPanel
      as="section"
      className="customer-overview-panel"
      aria-labelledby="overview-orders"
    >
      <PanelHeader
        id="overview-orders"
        icon="receipt-text"
        title="Recent orders"
        link={{ href: '/account/orders', label: 'Order history' }}
      />
      {shown.length ? (
        <div className="customer-overview-scroll">
          <table className="ui-table vendor-dashboard-orders-table customer-overview-orders">
            <caption className="sr-only">Recent orders</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Placed</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const payment = financialStatus(p),
                  pickup = purchasePickup(p);
                const refunded = p.financial.financialStatus !== 'PAID';
                return (
                  <tr key={String(p.orderId)}>
                    <th scope="row">
                      <a
                        href={`/account/orders?order=${encodeURIComponent(String(p.orderId))}`}
                      >
                        Order {p.orderId}
                      </a>
                      <small>{p.storefront.displayName}</small>
                    </th>
                    <td>{purchaseDate(p.purchasedAt)}</td>
                    <td>
                      <strong>
                        {formatMoney(
                          p.financial.originalPaid,
                          p.financial.currency,
                        )}
                      </strong>
                    </td>
                    <td>
                      <Badge tone={refunded ? payment.tone : pickup.tone}>
                        {refunded ? payment.label : pickup.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No orders yet">
          <p>
            You haven&apos;t placed any orders yet. Explore markets and vendors
            to get started.
          </p>
          <FarmstandLink variant="secondary" href="/account/markets">
            Explore markets
          </FarmstandLink>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}

function Rewards({ wallets }: { wallets: LoyaltyWallet[] | null }) {
  const rows = (wallets ?? [])
    .map((wallet) => {
      const points = wallet.rewards
        .map((r) => r.terms.points)
        .sort((a, b) => a - b);
      const target = points.find((p) => p > wallet.balance.available);
      const ready = wallet.rewards.filter((r) => r.available).length;
      return { wallet, target, ready };
    })
    .sort(
      (a, b) =>
        b.ready - a.ready ||
        b.wallet.balance.available - a.wallet.balance.available,
    );
  return (
    <FarmstandPanel
      as="section"
      className="customer-overview-panel"
      aria-labelledby="overview-rewards"
    >
      <PanelHeader
        id="overview-rewards"
        icon="gift"
        title="Loyalty rewards"
        link={{ href: '/account/loyalty', label: 'Loyalty' }}
      />
      {wallets === null ? (
        <Alert severity="info">
          Loyalty is temporarily unavailable. Your points are safe.
        </Alert>
      ) : rows.length ? (
        <ul className="customer-overview-list customer-overview-rewards">
          {rows.map(({ wallet, target, ready }) => {
            const share = target
              ? Math.max(
                  0,
                  Math.min(100, (wallet.balance.available / target) * 100),
                )
              : 100;
            return (
              <li key={wallet.vendor_id}>
                <a href="/account/loyalty">
                  <span className="markets-identity-icon">
                    <FarmstandIcon name="store" />
                  </span>
                  <span>
                    <strong>{wallet.name}</strong>
                    <small>
                      {wallet.balance.available.toLocaleString('en-US')} points
                      {target
                        ? ` · ${(target - wallet.balance.available).toLocaleString('en-US')} to next reward`
                        : ''}
                    </small>
                    <span
                      className="customer-overview-meter"
                      style={{ '--meter': `${share}%` } as CSSProperties}
                      aria-hidden="true"
                    />
                  </span>
                  {ready > 0 && (
                    <Badge tone="success">{plural(ready, 'reward')}</Badge>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Start earning rewards">
          <p>
            Earn one point per eligible cent with participating vendors. Points
            become available after pickup.
          </p>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}

function Follows({
  kind,
  items,
  total,
  events,
  now,
}: {
  kind: 'markets' | 'vendors';
  items: readonly CustomerFollow[];
  total: number;
  events: readonly CustomerEvent[];
  now: number;
}) {
  const markets = kind === 'markets';
  const id = `overview-${kind}`;
  const nextFor = (item: CustomerFollow) =>
    events.find((event) =>
      markets
        ? String(event.marketId) === String(item.id)
        : event.vendors.some((v) => String(v.id) === String(item.id)),
    );
  return (
    <FarmstandPanel
      as="section"
      className="customer-overview-panel"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        icon={markets ? 'store' : 'heart'}
        title={markets ? 'Followed markets' : 'Favorite vendors'}
        link={{ href: `/account/${kind}`, label: 'Manage' }}
      >
        {total > 0 && <Badge tone="neutral">{total}</Badge>}
      </PanelHeader>
      {items.length ? (
        <ul className="customer-overview-list">
          {items.map((item) => {
            const next = nextFor(item);
            return (
              <li key={String(item.id)}>
                <a href={item.url ?? `/account/${kind}`}>
                  <span className="markets-identity-icon">
                    <FarmstandIcon name={markets ? 'store' : 'user-round'} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {next
                        ? `${markets ? 'Next date' : `At ${next.marketName}`} · ${shortEventDate(next)}`
                        : markets
                          ? 'No upcoming dates'
                          : 'No confirmed appearances'}
                    </small>
                  </span>
                  {next ? (
                    <Badge tone="success">
                      {relativeDays(next.startsAt, now, next.timezone)}
                    </Badge>
                  ) : (
                    !item.url && <Badge tone="neutral">Unavailable</Badge>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={markets ? 'No followed markets' : 'No favorite vendors'}
        >
          <p>
            {markets
              ? 'Follow your favorite markets to see their upcoming dates here.'
              : "Follow vendors to keep up with where they'll be selling next."}
          </p>
          <FarmstandLink variant="secondary" href={`/account/${kind}#discover`}>
            {markets ? 'Find markets' : 'Find vendors'}
          </FarmstandLink>
        </EmptyState>
      )}
    </FarmstandPanel>
  );
}
