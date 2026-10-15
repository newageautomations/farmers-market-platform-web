import { EmptyState } from '@market/ui';
import { Badge } from '@market/ui';
import {
  cardClassName,
  disclosureClassName,
  statusBadgeClassName,
} from '@market/ui/presentation';
import { vendorOrderStatus } from './order-presentation';
import { useCallback, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import { formatMoney } from '@market/config';
import { Button, Card, Field, Pagination, Select } from '@market/ui';
import { AppError } from '@market/api';
import type { VendorService } from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  RouteLink,
  TextField,
  Unavailable,
  date,
  go,
  integer,
  text,
  useRead,
} from './common';

export function Orders({
  service,
  id,
}: {
  service: VendorService;
  id?: string;
}) {
  const [skip, setSkip] = useState(0),
    [kind, setKind] = useState('all');
  const read = useCallback(
    () => service.orders(skip, kind),
    [service, skip, kind],
  );
  const query = useRead(`orders:${skip}:${kind}`, read, !id);
  if (id) return <OrderDetail service={service} id={id} />;
  return (
    <>
      {
        <>
          <Field id="order-kind" label="Order context">
            <Select
              id="order-kind"
              value={kind}
              onChange={(e) => {
                setSkip(0);
                setKind(e.target.value);
              }}
            >
              <option value="all">All contexts</option>
              <option value="DIRECT_VENDOR">Direct</option>
              <option value="MARKET_OCCURRENCE">Market</option>
            </Select>
          </Field>
          <ReadState {...query} retry={query.refresh} />
          {query.data && (
            <>
              <DataTable
                label="Vendor operational orders"
                headings={['Order', 'Context', 'Operational state', 'Pickup']}
              >
                {query.data.items.map((o) => (
                  <tr key={o.portion.operationalOrderId}>
                    <th scope="row">
                      <RouteLink
                        to={`/vendor/orders/${encodeURIComponent(o.portion.operationalOrderId)}`}
                      >
                        Order {o.portion.operationalOrderId}
                      </RouteLink>
                    </th>
                    <td>
                      {o.portion.kind === 'MARKET_OCCURRENCE'
                        ? o.portion.marketName
                        : 'Direct Vendor'}
                      {o.portion.occurrenceStartsAt && (
                        <small>
                          {date(o.portion.occurrenceStartsAt)} (UTC)
                        </small>
                      )}
                      <small>Placed {date(o.portion.placedAt)} (UTC)</small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          vendorOrderStatus('order', o.portion.nativeState).tone
                        }
                      >
                        {o.portion.nativeState}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          vendorOrderStatus('pickup', o.portion.pickupStatus)
                            .tone
                        }
                      >
                        {o.portion.pickupStatus}
                      </Badge>
                      <small>{o.portion.pickupPromise?.venue}</small>
                    </td>
                  </tr>
                ))}
              </DataTable>
              {!query.data.items.length && (
                <EmptyState title="No matching orders">
                  <p>No orders match this context.</p>
                </EmptyState>
              )}
              <Pagination
                summary={
                  <>
                    {query.data.totalItems} records. Showing{' '}
                    {query.data.items.length ? skip + 1 : 0} to{' '}
                    {query.data.items.length
                      ? skip + query.data.items.length
                      : 0}
                    .
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
      }
      <form
        className={cardClassName({
          className: 'filter-bar ui-control-row ui-control-row-lookup',
        })}
        onSubmit={(e) => {
          e.preventDefault();
          const id = text(new FormData(e.currentTarget), 'order-id');
          if (id) go(`/vendor/orders/${encodeURIComponent(id)}`);
        }}
      >
        <TextField
          name="order-id"
          label="Owned operational order reference"
          maxLength={100}
        />
        <div className="ui-field-action">
          <Button type="submit">Look up order</Button>
        </div>
      </form>
    </>
  );
}
function OrderDetail({ service, id }: { service: VendorService; id: string }) {
  const read = useCallback(() => service.order(id), [service, id]);
  const query = useRead(`order:${id}`, read);
  const can = mayCommand(service.context, 'ManageOwnInventory');
  return (
    <>
      <RouteLink to="/vendor/orders">Orders</RouteLink>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <div key={JSON.stringify(query.data)}>
          <p>Order {query.data.portion.operationalOrderId}</p>
          <Card as="section" aria-label="Order status and context">
            <dl className="facts">
              <div>
                <dt>Operational state</dt>
                <dd>
                  <OrderStatus
                    domain="order"
                    value={query.data.portion.nativeState}
                  />
                </dd>
              </div>
              <div>
                <dt>Pickup status</dt>
                <dd>
                  <OrderStatus
                    domain="pickup"
                    value={query.data.portion.pickupStatus}
                  />
                </dd>
              </div>
              {query.data.context && (
                <div>
                  <dt>Payment status</dt>
                  <dd>
                    <OrderStatus
                      domain="payment"
                      value={query.data.context.financialStatus}
                    />
                  </dd>
                </div>
              )}
              <div>
                <dt>Context</dt>
                <dd>
                  {query.data.portion.kind === 'MARKET_OCCURRENCE'
                    ? `Market occurrence · ${query.data.portion.marketName}`
                    : 'Direct Vendor'}
                </dd>
              </div>
            </dl>
            <p>Placed {date(query.data.portion.placedAt)} (UTC).</p>
            {query.data.portion.occurrenceStartsAt && (
              <p>
                Occurrence {query.data.portion.occurrenceId} ·{' '}
                {date(query.data.portion.occurrenceStartsAt)} (UTC).
              </p>
            )}
            {query.data.context && (
              <p>
                Vendor attributed{' '}
                {formatMoney(
                  query.data.context.original,
                  query.data.context.currency,
                )}{' '}
                · Settled refund{' '}
                {formatMoney(
                  query.data.context.refunded,
                  query.data.context.currency,
                )}{' '}
                · Vendor remaining attributed{' '}
                {formatMoney(
                  query.data.context.remaining,
                  query.data.context.currency,
                )}
              </p>
            )}
            {query.data.context?.occurrenceId && (
              <p>Occurrence reference {query.data.context.occurrenceId}</p>
            )}
          </Card>
          {query.data.portion.pickupPromise ? (
            <Card as="section" aria-label="Pickup promise">
              <h2 className="ui-section-title-dashboard">Pickup promise</h2>
              <p>
                {query.data.portion.pickupPromise.mode} ·{' '}
                {query.data.portion.pickupPromise.venue}
              </p>
              <p>{query.data.portion.pickupPromise.instructions}</p>
              <p>
                {date(query.data.portion.pickupPromise.startsAt)} to{' '}
                {date(query.data.portion.pickupPromise.endsAt)} (UTC)
              </p>
            </Card>
          ) : (
            <p>No pickup promise provided.</p>
          )}
          <DataTable
            label="Operational order lines"
            headings={[
              'Variant',
              'Original',
              'Fulfilled',
              'Cancelled',
              'Remaining operational',
            ]}
          >
            {query.data.portion.lines.map((l) => (
              <tr key={l.operationalLineId}>
                <th scope="row">
                  {l.variantName}
                  <small>{l.sku}</small>
                </th>
                <td>{l.quantity}</td>
                <td>{l.fulfilledQuantity}</td>
                <td>{l.cancelledQuantity}</td>
                <td>{l.remainingQuantity}</td>
              </tr>
            ))}
          </DataTable>
          <p>
            Operational cancellation does not move money. Refunds and payment
            administration are unavailable here.
          </p>
          {can &&
            [
              'PaymentSettled',
              'PartiallyShipped',
              'Shipped',
              'PartiallyDelivered',
              'Delivered',
            ].includes(query.data.portion.nativeState) &&
            query.data.portion.lines.map((line) => {
              const remaining = line.remainingQuantity;
              return remaining > 0 ? (
                <details
                  key={line.operationalLineId}
                  className={disclosureClassName()}
                >
                  <summary>Manage {line.variantName}</summary>
                  <div className="ui-disclosure-content">
                    <CommandForm
                      embedded
                      title="Fulfill quantity"
                      validate={(d) => {
                        if (integer(d.get('quantity')) > remaining)
                          throw new AppError('validation');
                      }}
                      run={(d, operationKey) =>
                        service.fulfill({
                          operationKey,
                          orderId: id,
                          orderLineId: line.operationalLineId,
                          quantity: integer(d.get('quantity')),
                          fulfillmentId: null,
                        })
                      }
                      onDone={query.refresh}
                      submitLabel="Fulfill"
                    >
                      <TextField name="quantity" label="Quantity to fulfill" />
                      <p>Remaining operational quantity: {remaining}.</p>
                    </CommandForm>
                    {line.fulfilledQuantity === 0 ? (
                      <CommandForm
                        embedded
                        title="Cancel unfulfilled quantity"
                        confirm="Cancel this unfulfilled operational quantity? The backend restores eligible allocations. Financial attribution and payments do not change."
                        validate={(d) => {
                          if (integer(d.get('quantity')) > remaining)
                            throw new AppError('validation');
                        }}
                        run={(d, operationKey) =>
                          service.cancelQuantity({
                            operationKey,
                            orderId: id,
                            orderLineId: line.operationalLineId,
                            quantity: integer(d.get('quantity')),
                            fulfillmentId: null,
                          })
                        }
                        onDone={query.refresh}
                        submitLabel="Review cancellation"
                      >
                        <TextField name="quantity" label="Quantity to cancel" />
                      </CommandForm>
                    ) : (
                      <Unavailable>
                        Unfulfilled cancellation on a mixed fulfilled line is
                        not supported by the backend. Fulfillment cancellation
                        is a separate command.
                      </Unavailable>
                    )}
                  </div>
                </details>
              ) : null;
            })}
          <DataTable
            label="Existing fulfillments"
            headings={['Fulfillment', 'State', 'Lines', 'Actions']}
          >
            {query.data.portion.fulfillments.map((f) => (
              <tr key={f.id}>
                <th scope="row">Fulfillment {f.id}</th>
                <td>
                  <OrderStatus domain="fulfillment" value={f.state} />
                </td>
                <td>{f.lines.map((l) => `${l.quantity} units`).join(', ')}</td>
                <td>
                  {can && f.state !== 'Cancelled' && f.lines.length === 1 && (
                    <CommandForm
                      embedded
                      title="Cancel fulfillment"
                      confirm="Cancel this existing fulfillment? Eligible sold stock restoration is backend controlled. This is not a financial refund."
                      run={(_d, operationKey) =>
                        service.cancelFulfillment({
                          operationKey,
                          orderId: id,
                          orderLineId: null,
                          quantity: null,
                          fulfillmentId: f.id,
                        })
                      }
                      onDone={query.refresh}
                      submitLabel="Review fulfillment cancellation"
                    >
                      <p>Cancel the entire selected fulfillment.</p>
                    </CommandForm>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </>
  );
}
function OrderStatus({
  domain,
  value,
}: {
  domain: Parameters<typeof vendorOrderStatus>[0];
  value: string;
}) {
  const status = vendorOrderStatus(domain, value);
  return (
    <span className={statusBadgeClassName(status.tone)}>{status.label}</span>
  );
}
