import { EmptyState } from '@market/ui';
import { Badge } from '@market/ui';
import { vendorOrderStatus } from './order-presentation';
import { vendorStatusTone } from './status-presentation';
import { cardClassName } from '@market/ui/presentation';
import { useCallback, useState } from 'react';
import { formatMoney } from '@market/config';
import { Button, Pagination } from '@market/ui';
import type { VendorService } from './service';
import {
  DataTable,
  ReadState,
  RouteLink,
  TextField,
  date,
  text,
  useRead,
} from './common';

export function Customers({
  service,
  id,
}: {
  service: VendorService;
  id?: string;
}) {
  const [skip, setSkip] = useState(0),
    [search, setSearch] = useState('');
  const read = useCallback(
    () => service.customers({ skip, take: 20, search }),
    [service, skip, search],
  );
  const query = useRead(`customers:${skip}:${search}`, read, !id);
  if (id) return <CustomerDetail service={service} id={id} />;
  return (
    <>
      <p>
        Customer relationships with this Vendor, ordered by last activity. A
        purchase relationship is not marketing consent.
      </p>
      <form
        className={cardClassName({
          className: 'filter-bar ui-control-row ui-control-row-lookup',
        })}
        onSubmit={(e) => {
          e.preventDefault();
          setSkip(0);
          setSearch(text(new FormData(e.currentTarget), 'search'));
        }}
      >
        <TextField
          name="search"
          label="Search customer name or email"
          required={false}
          maxLength={200}
        />
        <div className="ui-field-action">
          <Button type="submit">Search</Button>
        </div>
      </form>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <DataTable
            label="Owned customer relationships"
            recordDetails={{ status: 2 }}
            sort={{ heading: 'Last activity', direction: 'descending' }}
            headings={[
              'Customer',
              'Email',
              'Status',
              'Purchases',
              'Last activity',
            ]}
          >
            {query.data.items.map((c) => (
              <tr key={c.id}>
                <th scope="row">
                  <RouteLink
                    to={`/vendor/customers/${encodeURIComponent(c.id)}`}
                  >
                    {c.firstName} {c.lastName}
                  </RouteLink>
                </th>
                <td>{c.emailAddress}</td>
                <td>
                  <Badge tone={vendorStatusTone('customer', c.status)}>
                    {c.status}
                  </Badge>
                </td>
                <td>{c.purchaseCount}</td>
                <td>{date(c.lastActivityAt)} (UTC)</td>
              </tr>
            ))}
          </DataTable>
          {!query.data.items.length && (
            <EmptyState title="No matching customers">
              <p>No customer relationships match your search.</p>
            </EmptyState>
          )}
          <Pagination
            summary={
              <>
                {query.data.totalItems} records. Showing{' '}
                {query.data.items.length ? skip + 1 : 0} to{' '}
                {query.data.items.length ? skip + query.data.items.length : 0}.
              </>
            }
            hasPrevious={skip > 0}
            hasNext={skip + 20 < query.data.totalItems}
            onPrevious={() => setSkip(skip - 20)}
            onNext={() => setSkip(skip + 20)}
          />
        </>
      )}
    </>
  );
}
function CustomerDetail({
  service,
  id,
}: {
  service: VendorService;
  id: string;
}) {
  const [skip, setSkip] = useState(0);
  const read = useCallback(() => service.customer(id), [service, id]);
  const query = useRead(`customer:${id}`, read);
  const historyRead = useCallback(
    () =>
      service.history(query.data!.customerId, { skip, take: 20, search: null }),
    [service, query.data, skip],
  );
  const history = useRead(`history:${id}:${skip}`, historyRead, !!query.data);
  return (
    <>
      <RouteLink to="/vendor/customers">Customers</RouteLink>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <h2 className="ui-section-title-dashboard">
            {query.data.firstName} {query.data.lastName}
          </h2>
          <p>{query.data.emailAddress}</p>
          <dl className="facts">
            <div>
              <dt>Relationship status</dt>
              <dd>
                <Badge tone={vendorStatusTone('customer', query.data.status)}>
                  {query.data.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Purpose</dt>
              <dd>{query.data.purpose}</dd>
            </div>
            <div>
              <dt>First activity</dt>
              <dd>{date(query.data.firstActivityAt)} (UTC)</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{date(query.data.lastActivityAt)} (UTC)</dd>
            </div>
            <div>
              <dt>Vendor purchases</dt>
              <dd>{query.data.purchaseCount}</dd>
            </div>
          </dl>
          <DataTable
            label="Vendor customer attribution by currency"
            headings={[
              'Currency',
              'Original Vendor attributed',
              'Settled refunded',
              'Vendor remaining attributed',
            ]}
          >
            {query.data.attribution.map((a) => (
              <tr key={a.currency}>
                <th scope="row">{a.currency}</th>
                <td>{formatMoney(a.original, a.currency)}</td>
                <td>{formatMoney(a.refunded, a.currency)}</td>
                <td>{formatMoney(a.remaining, a.currency)}</td>
              </tr>
            ))}
          </DataTable>
          <h2 className="ui-section-title-dashboard">
            Vendor purchase history
          </h2>
          <ReadState {...history} retry={history.refresh} />
          {history.data && (
            <>
              <DataTable
                label="Vendor specific purchase history"
                headings={[
                  'Order',
                  'Purchased',
                  'Context',
                  'Operational',
                  'Financial',
                  'Attributed',
                  'Settled refunded',
                  'Remaining attributed',
                ]}
              >
                {history.data.items.map((p) => (
                  <tr key={p.operationalOrderId}>
                    <th scope="row">
                      <RouteLink
                        to={`/vendor/orders/${encodeURIComponent(p.operationalOrderId)}`}
                      >
                        {p.operationalOrderId}
                      </RouteLink>
                    </th>
                    <td>{date(p.purchasedAt)} (UTC)</td>
                    <td>
                      {p.kind === 'MARKET_OCCURRENCE'
                        ? `Market · ${service.marketName(p.marketId ?? '')} · Occurrence ${p.occurrenceId}`
                        : 'Direct Vendor'}
                      <small>
                        <Badge
                          tone={
                            vendorOrderStatus('pickup', p.pickupStatus).tone
                          }
                        >
                          {p.pickupStatus}
                        </Badge>
                      </small>
                      {p.pickupPromise && (
                        <small>
                          {p.pickupPromise.venue} ·{' '}
                          {p.pickupPromise.instructions}
                        </small>
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={vendorOrderStatus('order', p.nativeState).tone}
                      >
                        {p.nativeState}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          vendorOrderStatus('payment', p.financialStatus).tone
                        }
                      >
                        {p.financialStatus}
                      </Badge>
                    </td>
                    <td>{formatMoney(p.original, p.currency)}</td>
                    <td>{formatMoney(p.refunded, p.currency)}</td>
                    <td>{formatMoney(p.remaining, p.currency)}</td>
                  </tr>
                ))}
              </DataTable>
              {!history.data.items.length && (
                <EmptyState title="No purchase history">
                  <p>No purchase history is available for this relationship.</p>
                </EmptyState>
              )}
              <Pagination
                summary={
                  <>
                    {history.data.totalItems} records. Showing{' '}
                    {history.data.items.length ? skip + 1 : 0} to{' '}
                    {history.data.items.length
                      ? skip + history.data.items.length
                      : 0}
                    .
                  </>
                }
                hasPrevious={skip > 0}
                hasNext={skip + 20 < history.data.totalItems}
                onPrevious={() => setSkip(skip - 20)}
                onNext={() => setSkip(skip + 20)}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
