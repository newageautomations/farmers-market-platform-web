import { MarketsPagination as Pagination } from './MarketsPagination';
import { useCallback, useMemo, useState, type MouseEvent } from 'react';
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
import { formatMoney } from '@market/config';
import { go, ReadState, useRead } from './common';
import type { VendorService } from './service';
import {
  averageCustomerSpend,
  customerName,
  customersCsv,
  customerSpend,
  filterCustomers,
  newThisMonth,
  readCustomerTrends,
  readCustomerPreviews,
  readCustomersWorkspace,
  type CustomerFilters,
} from './customers-data';
import '@market/ui/farmstand.css';
import './order-detail.css';
import './orders.css';
import './customers.css';

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

function orderDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CustomersWorkspace({ service }: { service: VendorService }) {
  const load = useCallback(() => readCustomersWorkspace(service), [service]);
  const query = useRead(`customers-workspace:${service.vendorId}`, load);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    segment: 'all',
    activity: 'all',
    orders: 'all',
    sort: 'name',
  });
  const customers = query.data ?? [];
  const repeatBuyers = customers.filter((row) => row.purchaseCount > 1).length;
  const visible = useMemo(
    () => filterCustomers(query.data ?? [], filters),
    [query.data, filters],
  );
  const shown = useMemo(
    () => visible.slice(page * 20, (page + 1) * 20),
    [visible, page],
  );
  const ids = shown.map((customer) => customer.id).join(',');
  const loadPreviews = useCallback(
    () => readCustomerPreviews(service, shown),
    [service, shown],
  );
  const previews = useRead(
    `customer-previews:${service.vendorId}:${ids}`,
    loadPreviews,
    !!query.data && shown.length > 0,
  );
  const customer = shown.find((row) => row.id === selected) ?? shown[0];
  const preview = customer ? previews.data?.get(customer.id) : undefined;
  const latest = preview?.items?.[0];
  const destination = customer
    ? `/vendor/customers/${encodeURIComponent(customer.id)}`
    : '';
  const showDetails = customer;
  const loadTrends = useCallback(
    () => readCustomerTrends(service, query.data ?? []),
    [service, query.data],
  );
  const trends = useRead(
    `customer-trends:${service.vendorId}`,
    loadTrends,
    !!query.data,
  );
  function trend(index: number) {
    const value = trends.data?.[index];
    return (
      <small
        className={`customers-trend customers-trend-${value?.direction ?? 'neutral'}`}
      >
        {value && value.direction !== 'neutral' && (
          <UtilityIcon
            name={value.direction === 'up' ? 'arrow-up' : 'arrow-down'}
          />
        )}
        {value?.label ??
          (trends.loading
            ? 'Comparing with last month�'
            : 'Comparison unavailable')}
      </small>
    );
  }
  function change(values: Partial<CustomerFilters>) {
    setFilters((current) => ({ ...current, ...values }));
    setPage(0);
  }
  function exportCustomers() {
    const url = URL.createObjectURL(
      new Blob([customersCsv(visible)], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'customers.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="order-detail customers-page">
      <header className="order-page-heading">
        <div className="order-heading-title">
          <span className="order-heading-icon">
            <FarmstandIcon name="user-round" />
          </span>
          <div>
            <h1>Customers</h1>
            <p>
              View and manage your customer relationships and order history.
            </p>
          </div>
        </div>
        <FarmstandButton
          variant="secondary"
          onClick={exportCustomers}
          disabled={!query.data || !visible.length}
        >
          <UtilityIcon name="arrow-down" />
          Export Customers
        </FarmstandButton>
      </header>
      <ReadState {...query} retry={query.refresh} />
      <div className="customers-workspace">
        <FarmstandPanel className="orders-toolbar customers-toolbar">
          <div className="customers-search-row">
            <Field id="customers-search" label="Search customer name or email">
              <FarmstandSearch
                id="customers-search"
                placeholder="Search customer name or email"
                maxLength={200}
                value={filters.search}
                onChange={(event) => change({ search: event.target.value })}
              />
            </Field>
            <Field id="customers-sort" label="Sort by">
              <FarmstandSelect
                id="customers-sort"
                icon="arrow-right"
                value={filters.sort}
                onChange={(event) => change({ sort: event.target.value })}
              >
                <option value="name">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
                <option value="recent">Most recent activity</option>
                <option value="orders">Most orders</option>
              </FarmstandSelect>
            </Field>

            <Field id="customers-segment" label="Customers">
              <FarmstandSelect
                id="customers-segment"
                icon="user-round"
                value={filters.segment}
                onChange={(event) => change({ segment: event.target.value })}
              >
                <option value="all">All customers</option>
                <option value="new">New this month</option>
                <option value="repeat">Repeat buyers</option>
              </FarmstandSelect>
            </Field>
            <Field id="customers-activity" label="Activity">
              <FarmstandSelect
                id="customers-activity"
                icon="calendar-days"
                value={filters.activity}
                onChange={(event) => change({ activity: event.target.value })}
              >
                <option value="all">All time</option>
                <option value="month">This month</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </FarmstandSelect>
            </Field>
            <Field id="customers-orders" label="Orders">
              <FarmstandSelect
                id="customers-orders"
                icon="shopping-cart"
                value={filters.orders}
                onChange={(event) => change({ orders: event.target.value })}
              >
                <option value="all">All orders</option>
                <option value="has">Has orders</option>
                <option value="none">No orders</option>
              </FarmstandSelect>
            </Field>
          </div>
        </FarmstandPanel>
        {query.data && (
          <>
            <FarmstandPanel
              className="orders-summary customers-summary"
              aria-label="Customer summary"
            >
              <div className="orders-summary-items">
                <div className="orders-summary-item">
                  <FarmstandIcon name="user-round" />
                  <span>
                    <strong>{customers.length}</strong>{' '}
                    {customers.length === 1 ? 'customer' : 'customers'}
                    {trend(0)}
                  </span>
                </div>
                <div className="orders-summary-item orders-summary-success">
                  <UtilityIcon name="plus" />
                  <span>
                    <strong>
                      {customers.filter((row) => newThisMonth(row)).length}
                    </strong>{' '}
                    new this month
                    {trend(1)}
                  </span>
                </div>
                <div className="orders-summary-item">
                  <FarmstandIcon name="layers" />
                  <span>
                    <strong>{repeatBuyers}</strong> repeat{' '}
                    {repeatBuyers === 1 ? 'buyer' : 'buyers'}
                    {trend(2)}
                  </span>
                </div>
                <div className="orders-summary-item orders-summary-success">
                  <UtilityIcon name="arrow-up" />
                  <span>
                    Avg. spend{' '}
                    <strong>{averageCustomerSpend(customers)}</strong>
                    {trend(3)}
                  </span>
                </div>
              </div>
            </FarmstandPanel>
            <div className="customers-columns">
              <FarmstandPanel className="customers-table-panel">
                <FarmstandTable
                  label="Owned customer relationships"
                  headings={['Customer', 'Orders', 'Total spent', 'Last order']}
                >
                  {shown.map((row) => {
                    const history = previews.data?.get(row.id);
                    const lastOrder = history?.items?.[0];
                    const active = !!showDetails && row.id === customer.id;
                    return (
                      <tr
                        key={row.id}
                        className={active ? 'customers-selected' : undefined}
                        onClick={(event) => {
                          if (
                            event.defaultPrevented ||
                            (event.target instanceof Element &&
                              event.target.closest('button, a'))
                          )
                            return;
                          event.currentTarget
                            .querySelector<HTMLAnchorElement>('.customers-name')
                            ?.click();
                        }}
                      >
                        <th scope="row">
                          <FarmstandLink
                            appearance="text"
                            href={`/vendor/customers/${encodeURIComponent(row.id)}`}
                            className="customers-name"
                            aria-current={active ? 'true' : undefined}
                            aria-controls={
                              showDetails ? 'customer-preview' : undefined
                            }
                            onClick={(event) => {
                              if (
                                event.button !== 0 ||
                                event.ctrlKey ||
                                event.metaKey ||
                                event.shiftKey ||
                                event.altKey
                              )
                                return;
                              event.preventDefault();
                              setSelected(row.id);
                            }}
                          >
                            <span className="farmstand-text-link">
                              {customerName(row)}
                            </span>
                          </FarmstandLink>
                        </th>
                        <td>{row.purchaseCount}</td>
                        <td className="customers-money">
                          {customerSpend(row)}
                        </td>
                        <td>
                          {lastOrder ? (
                            <time dateTime={lastOrder.purchasedAt}>
                              {orderDate(lastOrder.purchasedAt)}
                            </time>
                          ) : !row.purchaseCount ? (
                            'No orders'
                          ) : previews.loading ? (
                            'Loading…'
                          ) : history?.error ? (
                            'Unavailable'
                          ) : (
                            'No orders'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </FarmstandTable>
                {!shown.length && (
                  <EmptyState title="No matching customers">
                    <p>Try another search or adjust your filters.</p>
                  </EmptyState>
                )}
                <Pagination
                  summary={`${visible.length} customers. Showing ${shown.length ? page * 20 + 1 : 0} to ${page * 20 + shown.length}.`}
                  hasPrevious={page > 0}
                  hasNext={(page + 1) * 20 < visible.length}
                  onPrevious={() => setPage(page - 1)}
                  onNext={() => setPage(page + 1)}
                />
              </FarmstandPanel>
              {showDetails ? (
                <FarmstandPanel
                  as="section"
                  id="customer-preview"
                  className="customers-preview"
                  aria-label={`${customerName(customer)} details`}
                >
                  <div className="customers-identity">
                    <span className="customers-avatar">
                      <FarmstandIcon name="user-round" />
                    </span>
                    <div>
                      <h2>{customerName(customer)}</h2>
                      <p>
                        <UtilityIcon name="email" />
                        {customer.emailAddress || 'Email unavailable'}
                      </p>
                    </div>
                  </div>
                  <FarmstandPanel className="customers-facts-panel">
                    <h3>Customer details</h3>
                    <dl className="customers-facts">
                      <div>
                        <dt>
                          <FarmstandIcon name="user-round" />
                          Name
                        </dt>
                        <dd>{customerName(customer)}</dd>
                      </div>
                      <div>
                        <dt>
                          <UtilityIcon name="email" />
                          Email
                        </dt>
                        <dd>{customer.emailAddress || 'Unavailable'}</dd>
                      </div>
                      <div>
                        <dt>
                          <FarmstandIcon name="shopping-cart" />
                          Purchases
                        </dt>
                        <dd>
                          {customer.purchaseCount}{' '}
                          {customer.purchaseCount === 1 ? 'order' : 'orders'}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <FarmstandIcon name="layers" />
                          Total spent
                        </dt>
                        <dd>
                          <strong>{customerSpend(customer)}</strong>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <UtilityIcon name="trophy" />
                          Loyalty points
                        </dt>
                        <dd>
                          <span title="The current loyalty API does not link wallet balances to CRM customer records.">
                            Unavailable
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <FarmstandIcon name="calendar-days" />
                          Last order
                        </dt>
                        <dd>
                          {latest
                            ? orderDate(latest.purchasedAt)
                            : previews.loading
                              ? 'Loading…'
                              : preview?.error
                                ? 'Unavailable'
                                : 'No orders'}
                        </dd>
                      </div>
                    </dl>
                  </FarmstandPanel>
                  <FarmstandLink
                    variant="primary"
                    href={destination}
                    onClick={navigate}
                    className="customers-history-link"
                  >
                    <FarmstandIcon name="receipt-text" />
                    View Purchase History
                  </FarmstandLink>
                  <FarmstandPanel className="customers-recent-panel">
                    <div className="customers-recent-heading">
                      <h3>Recent orders</h3>
                      <FarmstandLink
                        appearance="text"
                        href={destination}
                        onClick={navigate}
                      >
                        <span className="farmstand-text-link">View All</span>
                      </FarmstandLink>
                    </div>
                    <ReadState
                      loading={previews.loading}
                      error={preview?.error}
                      retry={previews.refresh}
                    />
                    {preview?.items?.length ? (
                      <ul className="customers-recent-orders">
                        {preview.items.map((order) => (
                          <li key={order.operationalOrderId}>
                            <span className="customers-order-icon">
                              <FarmstandIcon name="package" />
                            </span>
                            <div>
                              <strong>#{order.operationalOrderId}</strong>
                              <small>
                                {orderDate(order.purchasedAt)} ·{' '}
                                {order.lines.reduce(
                                  (total, line) => total + line.quantity,
                                  0,
                                )}{' '}
                                items
                              </small>
                            </div>
                            <Badge tone="success">
                              {formatMoney(order.original, order.currency)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      !previews.loading &&
                      !preview?.error && (
                        <p className="customers-no-orders">No recent orders.</p>
                      )
                    )}
                  </FarmstandPanel>
                </FarmstandPanel>
              ) : (
                <FarmstandPanel className="customers-preview">
                  <EmptyState title="No customer selected">
                    <p>Select a customer to see their details.</p>
                  </EmptyState>
                </FarmstandPanel>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
