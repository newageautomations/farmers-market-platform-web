import { scrollToPaginatedTable } from '@market/ui';
import { useCallback, useState, type MouseEvent, type ReactNode } from 'react';
import { Badge, EmptyState, Field, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { OrderDetail } from './order-detail';
import { OrdersDateRange } from './OrdersDateRange';
import { ReadState, go, useRead } from './common';
import {
  filterOrders,
  localOrderDate,
  orderPayment,
  orderPickup,
  orderSaleType,
  orderTotal,
  ordersCsv,
  readOrdersWorkspace,
  type OrderFilters,
  type OrdersRow,
} from './orders-data';
import type { CustomerOrderScope } from './pickup-data';
import type { VendorService } from './service';
import '@market/ui/farmstand.css';
import './order-detail.css';
import './orders.css';

function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(event.currentTarget.getAttribute('href')!);
}
function marketDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Date unavailable';
}
function created(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Unavailable';
}

export function Orders({
  service,
  id,
}: {
  service: VendorService;
  id?: string;
}) {
  if (id) return <OrderDetail service={service} id={id} />;
  return (
    <OrdersWorkspace
      key={`${service.vendorId}:${service.context.permissions.join(',')}`}
      service={service}
    />
  );
}

export function OrdersWorkspace({
  service,
  customerScope,
  header,
}: {
  service: VendorService;
  customerScope?: CustomerOrderScope;
  header?: (orders: OrdersRow[] | undefined) => ReactNode;
}) {
  const read = useCallback(
    () => readOrdersWorkspace(service, customerScope),
    [service, customerScope],
  );
  const query = useRead(`orders-workspace:${service.vendorId}`, read);
  const [page, setPage] = useState(0);
  const [calendar, setCalendar] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    market: 'all',
    occurrence: 'all',
    range: 'all',
    custom: { from: '', to: '' },
    saleType: 'all',
    payment: 'all',
    pickup: 'all',
    sort: 'newest',
  });
  function change(values: Partial<OrderFilters>) {
    setFilters((current) => ({ ...current, ...values }));
    setPage(0);
  }
  const orders = query.data ?? [];
  const visible = filterOrders(orders, filters);
  const shown = visible.slice(page * 20, (page + 1) * 20);
  const markets = new Map(
    orders
      .filter((order) => order.portion.marketId)
      .map((order) => [
        order.portion.marketId!,
        order.portion.marketName ?? 'Market',
      ]),
  );
  const occurrences = new Map(
    orders
      .filter(
        (order) =>
          order.portion.occurrenceId &&
          (filters.market === 'all' ||
            order.portion.marketId === filters.market),
      )
      .map((order) => [
        order.portion.occurrenceId!,
        order.portion.occurrenceStartsAt,
      ]),
  );
  const payments = [
    ...new Map(
      orders.map((order) => {
        const state = orderPayment(order);
        return [state.value, state.label];
      }),
    ).entries(),
  ];
  const today = localOrderDate(new Date());
  const completed = visible.filter(
    (order) =>
      order.sale?.state === 'COMPLETED' &&
      order.sale.completedAt &&
      localOrderDate(order.sale.completedAt) === today,
  ).length;
  const summary = [
    {
      icon: 'shopping-cart' as const,
      count: visible.length,
      label: 'orders',
      tone: 'primary',
    },
    {
      icon: null,
      count: visible.filter((order) =>
        ['UNPAID', 'CASH_DUE', 'PARTIAL', 'PARTIALLY_PAID'].includes(
          orderPayment(order).value,
        ),
      ).length,
      label: 'unpaid',
      tone: 'warning',
    },
    {
      icon: 'package' as const,
      count: visible.filter(
        (order) => orderPickup(order) === 'Ready for Pickup',
      ).length,
      label: 'ready for pickup',
      tone: 'success',
    },
    {
      icon: 'layers' as const,
      count: visible.filter(
        (order) => orderSaleType(order) === 'Independent Sale',
      ).length,
      label: 'independent sales',
      tone: 'neutral',
    },
    {
      icon: 'circle-check' as const,
      count: completed,
      label: 'completed today',
      tone: 'success',
    },
  ];
  function exportOrders() {
    const url = URL.createObjectURL(
      new Blob([ordersCsv(visible)], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `orders-${today}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="order-detail orders-page">
      {header ? (
        header(query.data)
      ) : (
        <header className="order-page-heading">
          <div className="order-heading-title">
            <span className="order-heading-icon">
              <FarmstandIcon name="shopping-cart" />
            </span>
            <div>
              <h1>Orders</h1>
              <p>
                View and manage all orders across markets and sales channels.
              </p>
            </div>
          </div>
          <div className="orders-heading-actions">
            <FarmstandButton
              variant="secondary"
              disabled={!query.data || !visible.length || query.loading}
              onClick={exportOrders}
            >
              <UtilityIcon name="arrow-down" />
              Export Orders
            </FarmstandButton>
            {service.pos &&
              service.context.permissions.includes('OperateOwnPos') && (
                <FarmstandLink
                  href="/vendor/pos"
                  onClick={navigate}
                  variant="primary"
                >
                  <FarmstandIcon name="plus" />
                  Create Sale
                </FarmstandLink>
              )}
          </div>
        </header>
      )}
      <FarmstandPanel className="orders-toolbar">
        <div className="orders-filters-top">
          <div className="orders-search field">
            <label htmlFor="orders-search">Search</label>
            <FarmstandSearch
              id="orders-search"
              placeholder="Customer, order number, or cashier reference"
              value={filters.search}
              onChange={(event) => change({ search: event.target.value })}
            />
          </div>
          <Field id="orders-market" label="Market">
            <FarmstandSelect
              id="orders-market"
              icon="store"
              value={filters.market}
              onChange={(event) =>
                change({ market: event.target.value, occurrence: 'all' })
              }
            >
              <option value="all">All Markets</option>
              {[...markets].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field id="orders-market-date" label="Market Date">
            <FarmstandSelect
              id="orders-market-date"
              icon="calendar-days"
              value={filters.occurrence}
              onChange={(event) => change({ occurrence: event.target.value })}
            >
              <option value="all">All Market Dates</option>
              {[...occurrences]
                .sort((a, b) => (a[1] ?? '').localeCompare(b[1] ?? ''))
                .map(([id, date]) => (
                  <option key={id} value={id}>
                    {marketDate(date)}
                  </option>
                ))}
            </FarmstandSelect>
          </Field>
          <Field id="orders-date-range" label="Date Range">
            <FarmstandSelect
              id="orders-date-range"
              icon="calendar-days"
              value={filters.range}
              onChange={(event) =>
                event.target.value === 'custom'
                  ? setCalendar(true)
                  : change({ range: event.target.value })
              }
            >
              <option value="all">All Dates</option>
              {[7, 14, 30, 60].map((days) => (
                <option key={days} value={days}>
                  Last {days} days
                </option>
              ))}
              <option value="custom">
                Custom
                {filters.range === 'custom'
                  ? `: ${filters.custom.from} to ${filters.custom.to}`
                  : ''}
              </option>
            </FarmstandSelect>
          </Field>
        </div>
        <div className="orders-filters-bottom">
          <Field id="orders-sale-type" label="Sale Type">
            <FarmstandSelect
              id="orders-sale-type"
              icon="layers"
              value={filters.saleType}
              onChange={(event) => change({ saleType: event.target.value })}
            >
              <option value="all">All Sale Types</option>
              {[
                'Market Pickup',
                'Independent Sale',
                'Online Order',
                'Market Sale',
                'In-person Sale',
              ].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field id="orders-payment" label="Payment Status">
            <FarmstandSelect
              id="orders-payment"
              icon="credit-card"
              value={filters.payment}
              onChange={(event) => change({ payment: event.target.value })}
            >
              <option value="all">All Payment Statuses</option>
              {payments.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field id="orders-pickup" label="Pickup Status">
            <FarmstandSelect
              id="orders-pickup"
              icon="package"
              value={filters.pickup}
              onChange={(event) => change({ pickup: event.target.value })}
            >
              <option value="all">All Pickup Statuses</option>
              {[
                'Ready for Pickup',
                'Awaiting Fulfillment',
                'Partially fulfilled',
                'Picked up',
                'Not Applicable',
                'Cancelled',
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </FarmstandSelect>
          </Field>
          <div className="orders-sort">
            <Field id="orders-sort" label="Sort By">
              <FarmstandSelect
                id="orders-sort"
                icon="arrow-right"
                value={filters.sort}
                onChange={(event) => change({ sort: event.target.value })}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </FarmstandSelect>
            </Field>
          </div>
        </div>
        {filters.range === 'custom' && (
          <FarmstandButton
            variant="tertiary"
            size="compact"
            onClick={() => setCalendar(true)}
          >
            Edit custom date range
          </FarmstandButton>
        )}
      </FarmstandPanel>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          {!customerScope && (
            <FarmstandPanel className="orders-summary">
              <div aria-label="Order summary" className="orders-summary-items">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className={`orders-summary-item orders-summary-${item.tone}`}
                    title={
                      item.label === 'completed today'
                        ? 'Confirmed sale completion dates. Pickup completion dates are unavailable in the current order projection.'
                        : undefined
                    }
                  >
                    {item.icon ? (
                      <FarmstandIcon name={item.icon} />
                    ) : (
                      <UtilityIcon name="clock" />
                    )}
                    <span>
                      <strong>{item.count}</strong> {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </FarmstandPanel>
          )}
          <div className="orders-table-panel">
            <FarmstandTable
              label="Vendor orders"
              headings={[
                'Order',
                'Customer',
                'Market / Date',
                'Payment Status',
                'Pickup Status',
                'Total',
                'Created',
                'Action',
              ]}
              sort={{
                heading: 'Created',
                direction:
                  filters.sort === 'newest' ? 'descending' : 'ascending',
              }}
            >
              {shown.map((order) => {
                const payment = orderPayment(order),
                  pickup = orderPickup(order);
                const pickupTone =
                  pickup === 'Ready for Pickup'
                    ? 'success'
                    : ['Awaiting Fulfillment', 'Partially fulfilled'].includes(
                          pickup,
                        )
                      ? 'warning'
                      : pickup === 'Cancelled'
                        ? 'danger'
                        : 'neutral';
                const market =
                  order.portion.marketName ??
                  (order.sale?.context.marketId
                    ? order.sale.context.label
                    : null);
                return (
                  // Native links provide keyboard and modified-click navigation.
                  <tr
                    key={order.portion.operationalOrderId}
                    onClick={(event) => {
                      if (
                        (event.target as HTMLElement).closest(
                          'a, button, input, select',
                        ) ||
                        window.getSelection()?.toString()
                      )
                        return;
                      if (
                        event.ctrlKey ||
                        event.metaKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      go(
                        `/vendor/orders/${encodeURIComponent(order.portion.operationalOrderId)}`,
                      );
                    }}
                  >
                    <th scope="row">
                      <FarmstandLink
                        appearance="text"
                        href={`/vendor/orders/${encodeURIComponent(order.portion.operationalOrderId)}`}
                        onClick={navigate}
                      >
                        #{order.orderCode}
                      </FarmstandLink>
                      {order.sale?.cashierId && (
                        <small>{order.sale.cashierId}</small>
                      )}
                    </th>
                    <td>
                      <span className="orders-customer">{order.customer}</span>
                      <small>
                        {order.sale?.vendor || service.context.name}
                      </small>
                    </td>
                    <td>
                      {market ? (
                        <>
                          <span className="orders-market-fact">
                            <FarmstandIcon name="map-pin" />
                            {market}
                          </span>
                          <small className="orders-market-fact">
                            <FarmstandIcon name="calendar-days" />
                            {marketDate(order.portion.occurrenceStartsAt)}
                          </small>
                        </>
                      ) : (
                        <span className="orders-no-market">
                          <FarmstandIcon name="layers" /> Independent sale
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge tone={payment.tone} className="orders-status">
                        {payment.value === 'PAID' ? (
                          <UtilityIcon name="check" />
                        ) : payment.tone === 'warning' ? (
                          <UtilityIcon name="clock" />
                        ) : payment.value.includes('REFUND') ? (
                          <UtilityIcon name="refresh" />
                        ) : (
                          <span aria-hidden="true">−</span>
                        )}
                        {payment.label}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={pickupTone} className="orders-status">
                        {pickup === 'Ready for Pickup' ? (
                          <span
                            className="orders-status-dot"
                            aria-hidden="true"
                          />
                        ) : pickup === 'Picked up' ? (
                          <UtilityIcon name="check" />
                        ) : pickupTone === 'warning' ? (
                          <UtilityIcon name="clock" />
                        ) : (
                          <span aria-hidden="true">−</span>
                        )}
                        {pickup}
                      </Badge>
                    </td>
                    <td>
                      <strong className="orders-total">
                        {orderTotal(order)}
                      </strong>
                    </td>
                    <td>
                      <time dateTime={order.portion.placedAt ?? undefined}>
                        {created(order.portion.placedAt)}
                      </time>
                    </td>
                    <td>
                      <FarmstandLink
                        variant="secondary"
                        size="compact"
                        href={`/vendor/orders/${encodeURIComponent(order.portion.operationalOrderId)}`}
                        onClick={navigate}
                        aria-label={`Open order ${order.orderCode}`}
                      >
                        Open
                      </FarmstandLink>
                    </td>
                  </tr>
                );
              })}
            </FarmstandTable>
            {!visible.length && (
              <EmptyState title="No matching orders">
                <p>Try a different search or change your filters.</p>
              </EmptyState>
            )}
            {!!visible.length && (
              <div className="orders-footer">
                <span>
                  {visible.length <= 20
                    ? `Showing all ${visible.length} orders`
                    : `Showing ${page * 20 + 1} to ${Math.min((page + 1) * 20, visible.length)} of ${visible.length} orders`}
                </span>
                {visible.length > 20 ? (
                  <nav
                    className="orders-pagination"
                    onClickCapture={(event) =>
                      scrollToPaginatedTable(event.currentTarget)
                    }
                    aria-label="Orders pagination"
                  >
                    <FarmstandButton
                      variant="secondary"
                      size="compact"
                      disabled={!page}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </FarmstandButton>
                    <FarmstandButton
                      variant="secondary"
                      size="compact"
                      disabled={(page + 1) * 20 >= visible.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </FarmstandButton>
                  </nav>
                ) : (
                  <span>
                    Select an order to view details{' '}
                    <FarmstandIcon name="arrow-up-right" />
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {calendar && (
        <OrdersDateRange
          value={filters.custom}
          onClose={() => setCalendar(false)}
          onApply={(custom) => {
            change({ custom, range: 'custom' });
            setCalendar(false);
          }}
        />
      )}
    </div>
  );
}
