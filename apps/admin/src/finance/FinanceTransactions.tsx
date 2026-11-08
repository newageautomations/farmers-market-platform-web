import { useId, useState, type KeyboardEvent } from 'react';
import { Badge, EmptyState, Field } from '@market/ui';
import {
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import type {
  FinanceActivity,
  FinanceOptions,
  FinanceOrderTransaction,
  FinanceReport,
} from '@market/api';
import { MarketsPagination } from '../vendor/MarketsPagination';
import { go } from '../vendor/common';
import { useResettingState } from './resetting-state';

const PAGE = 20;
type OrderRow = FinanceOrderTransaction & { cost: number };

/** Vendor reports group sales by order; manager reports list ledger activity. */
export function FinanceTransactions({
  report,
  options,
  timezone,
  money,
  orderHref,
}: {
  report: FinanceReport;
  options?: FinanceOptions;
  timezone: string;
  money: (value: number) => string;
  /** Destination for an order's own page, when the role has one. */
  orderHref?: (orderId: string) => string;
}) {
  const id = useId();
  const [search, setSearch] = useState(''),
    [type, setType] = useState('ALL'),
    [selected, setSelected] = useState<string>();
  // Paging restarts whenever the filters or the report change.
  const [page, setPage] = useResettingState(0, [search, type, report]);
  const grouped = !!report.orderTransactions;
  const query = search.trim().toLowerCase();
  const marketName = (marketId: string | null, independent: string) =>
    options?.markets.find((m) => m.id === marketId)?.name ??
    (marketId ? 'Unavailable market' : independent);
  const when = (date: string) =>
    new Date(date).toLocaleString(undefined, { timeZone: timezone });
  const orders: OrderRow[] = grouped
    ? [
        ...report.orderTransactions!.map((t) => ({ ...t, cost: 0 })),
        ...report.transactions
          .filter((t) => t.kind === 'COST')
          .map((t) => costRow(t)),
      ]
        .filter(
          (t) =>
            (type === 'ALL' ||
              (type === 'COST' ? t.cost > 0 : t.status === type)) &&
            `${t.orderCode} ${t.orderId} ${t.method} ${t.status} ${t.lines.map((l) => l.name).join(' ')}`
              .toLowerCase()
              .includes(query),
        )
        .sort(
          (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
        )
    : [];
  const activity = grouped
    ? []
    : report.transactions.filter(
        (t) =>
          (type === 'ALL' || t.kind === type) &&
          `${t.name} ${t.orderId} ${t.method}`.toLowerCase().includes(query),
      );
  const total = grouped ? orders.length : activity.length;
  const shownOrders = orders.slice(page * PAGE, (page + 1) * PAGE),
    shownActivity = activity.slice(page * PAGE, (page + 1) * PAGE);
  const currentOrder = orders.find((t) => t.id === selected) ?? shownOrders[0];
  const currentActivity =
    activity.find((t) => t.id === selected) ?? shownActivity[0];
  const select = (key: string) => ({
    tabIndex: 0,
    onClick: () => setSelected(key),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setSelected(key);
      }
    },
  });
  return (
    <div className="markets-columns market-applications-columns">
      <FarmstandPanel
        as="section"
        className="markets-list market-applications-list finance-list"
        aria-labelledby={id + '-title'}
      >
        <h2 id={id + '-title'}>Transactions</h2>
        <div className="markets-filters finance-list-filters">
          <Field
            id={id + '-search'}
            label={<span className="sr-only">Search transactions</span>}
          >
            <FarmstandSearch
              id={id + '-search'}
              placeholder="Search orders, products or methods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field
            id={id + '-type'}
            label={<span className="sr-only">Transaction type</span>}
          >
            <FarmstandSelect
              id={id + '-type'}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="ALL">All transactions</option>
              {grouped ? (
                <>
                  <option value="Paid">Paid</option>
                  <option value="Partially refunded">Partially refunded</option>
                  <option value="Refunded">Refunded</option>
                  <option value="COST">Booth payments</option>
                </>
              ) : (
                <>
                  <option value="SALE">Sales</option>
                  <option value="REFUND">Refunds</option>
                  <option value="COST">Costs</option>
                </>
              )}
            </FarmstandSelect>
          </Field>
        </div>
        {total ? (
          grouped ? (
            <FarmstandTable
              label="Transaction history"
              wide
              headings={['Order', 'Date', 'Market', 'Payment', 'Status']}
            >
              {shownOrders.map((t) => (
                <tr
                  key={t.id}
                  className={
                    t.id === currentOrder?.id
                      ? 'market-application-selected'
                      : undefined
                  }
                  {...select(t.id)}
                >
                  <th scope="row">
                    <div className="markets-identity">
                      <span className="markets-identity-icon">
                        <FarmstandIcon
                          name={t.cost ? 'store' : 'receipt-text'}
                        />
                      </span>
                      <span className="market-application-name">
                        {t.cost ? t.orderCode : `Order ${t.orderCode}`}
                      </span>
                    </div>
                  </th>
                  <td>{when(t.date)}</td>
                  <td>{marketName(t.marketId, 'Independent sale')}</td>
                  <td>{money(t.cost ? -t.cost : t.payment)}</td>
                  <td className="market-application-status-cell">
                    <div className="market-application-status-content">
                      <Badge
                        tone={
                          t.cost ? 'neutral' : t.refund ? 'warning' : 'success'
                        }
                      >
                        {t.status}
                      </Badge>
                      <FarmstandIcon name="chevron-right" />
                    </div>
                  </td>
                </tr>
              ))}
            </FarmstandTable>
          ) : (
            <FarmstandTable
              label="Transaction history"
              wide
              headings={['Transaction', 'Date', 'Market', 'Gross', 'Type']}
            >
              {shownActivity.map((t) => (
                <tr
                  key={t.id}
                  className={
                    t.id === currentActivity?.id
                      ? 'market-application-selected'
                      : undefined
                  }
                  {...select(t.id)}
                >
                  <th scope="row">
                    <div className="markets-identity">
                      <span className="markets-identity-icon">
                        <FarmstandIcon name="receipt-text" />
                      </span>
                      <span className="market-application-name">
                        {t.name} · {t.orderId}
                      </span>
                    </div>
                  </th>
                  <td>{t.date}</td>
                  <td>{marketName(t.marketId, 'Independent')}</td>
                  <td>{money(t.gross)}</td>
                  <td className="market-application-status-cell">
                    <div className="market-application-status-content">
                      <ActivityBadge kind={t.kind} />
                      <FarmstandIcon name="chevron-right" />
                    </div>
                  </td>
                </tr>
              ))}
            </FarmstandTable>
          )
        ) : (
          <EmptyState title="No matching records">
            <p>Try another search, type or reporting period.</p>
          </EmptyState>
        )}
        <MarketsPagination
          label="Transaction pages"
          summary={`${total} records`}
          hasPrevious={page > 0}
          hasNext={(page + 1) * PAGE < total}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
        <p className="markets-list-note">
          Transactions follow the selected period, scope and currency.
        </p>
      </FarmstandPanel>
      <FarmstandPanel
        as="section"
        className="markets-next market-application-details finance-details"
        aria-label="Transaction details"
      >
        <h2>
          <FarmstandIcon name="receipt-text" />
          Transaction details
        </h2>
        {grouped && currentOrder ? (
          <OrderDetails
            t={currentOrder}
            market={marketName(currentOrder.marketId, 'Independent sale')}
            when={when}
            money={money}
            href={
              orderHref && !currentOrder.cost && currentOrder.orderId
                ? orderHref(currentOrder.orderId)
                : undefined
            }
          />
        ) : !grouped && currentActivity ? (
          <ActivityDetails
            t={currentActivity}
            market={marketName(currentActivity.marketId, 'Independent')}
            money={money}
          />
        ) : (
          <EmptyState title="No transaction selected">
            <p>Choose a transaction to see its breakdown.</p>
          </EmptyState>
        )}
      </FarmstandPanel>
    </div>
  );
}

function costRow(t: FinanceActivity): OrderRow {
  return {
    id: t.id,
    orderId: t.orderId,
    orderCode: t.name,
    date: t.date,
    currency: t.currency,
    marketId: t.marketId,
    occurrenceId: t.occurrenceId,
    method: t.method,
    status: 'Cost' as FinanceOrderTransaction['status'],
    gross: 0,
    discount: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    payment: 0,
    refund: 0,
    refundedTax: 0,
    remaining: 0,
    lines: [],
    events: [],
    cost: t.marketFee ?? 0,
  };
}

function ActivityBadge({ kind }: { kind: FinanceActivity['kind'] }) {
  return (
    <Badge
      tone={
        kind === 'REFUND' ? 'warning' : kind === 'COST' ? 'neutral' : 'success'
      }
    >
      {kind === 'REFUND' ? 'Refund' : kind === 'COST' ? 'Cost' : 'Sale'}
    </Badge>
  );
}

function Facts({ rows }: { rows: Array<[string, string] | false> }) {
  return (
    <dl className="market-application-facts">
      {rows
        .filter((row): row is [string, string] => !!row)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function OrderDetails({
  t,
  market,
  when,
  money,
  href,
}: {
  t: OrderRow;
  market: string;
  when: (date: string) => string;
  money: (value: number) => string;
  href?: string;
}) {
  return (
    <div className="markets-next-content">
      <h3>{t.cost ? t.orderCode : `Order ${t.orderCode}`}</h3>
      <p className="markets-venue">
        <FarmstandIcon name="map-pin" />
        {market}
      </p>
      <Facts
        rows={[
          ['Date', when(t.date)],
          ['Method', t.method],
          ...(t.cost
            ? ([['Recorded booth payment', money(t.cost)]] as [
                string,
                string,
              ][])
            : ([
                ['Merchandise before discounts', money(t.gross)],
                t.discount > 0 && ['Discounts', money(-t.discount)],
                ['Merchandise subtotal', money(t.subtotal)],
                ['Sales tax collected', money(t.tax)],
                t.shipping !== 0 && ['Shipping', money(t.shipping)],
                ['Customer payment for your items', money(t.payment)],
                t.refund > 0 && ['Refunded to customer', money(t.refund)],
                t.refund > 0 && ['Sales tax refunded', money(t.refundedTax)],
                t.refund > 0 && ['Payment remaining', money(t.remaining)],
              ] as Array<[string, string] | false>)),
        ]}
      />
      {t.lines.length > 0 && (
        <section
          className="finance-detail-section"
          aria-label="Purchased products"
        >
          <h4>Purchased products</h4>
          <ul>
            {t.lines.map((l) => (
              <li key={l.id}>
                {l.quantity} × {l.name}: {money(l.gross)}
                {l.discount > 0 && (
                  <>
                    {' '}
                    · Discount {money(-l.discount)} · After discount{' '}
                    {money(l.subtotal)}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {t.events.length > 0 && (
        <section className="finance-detail-section" aria-label="Refund history">
          <h4>Order history</h4>
          <p className="markets-muted">
            Complete order history. Report totals use the selected dates.
          </p>
          <ul>
            {t.events.map((e) => (
              <li key={`${e.kind}:${e.id}`}>
                {e.kind} · {when(e.date)} · {money(e.amount)} · Sales tax{' '}
                {money(e.tax)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {href && (
        <FarmstandLink
          href={href}
          variant="primary"
          className="finance-order-link"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              go(href);
            }
          }}
        >
          View order
          <FarmstandIcon name="chevron-right" />
        </FarmstandLink>
      )}
    </div>
  );
}

function ActivityDetails({
  t,
  market,
  money,
}: {
  t: FinanceActivity;
  market: string;
  money: (value: number) => string;
}) {
  return (
    <div className="markets-next-content">
      <h3>
        {t.name} · {t.orderId}
      </h3>
      <p className="markets-venue">
        <FarmstandIcon name="map-pin" />
        {market}
      </p>
      <Facts
        rows={[
          ['Date', t.date],
          ['Method', t.method],
          ['Gross', money(t.gross)],
          ['Discount', money(t.discount)],
          ['Refund', money(t.refund)],
          [
            'Production cost',
            t.productionCost === null ? 'Unknown' : money(t.productionCost),
          ],
          [
            'Processing fee',
            t.processingFee === null ? 'Unknown' : money(t.processingFee),
          ],
          ['Recorded booth fee', money(t.marketFee ?? 0)],
        ]}
      />
    </div>
  );
}
