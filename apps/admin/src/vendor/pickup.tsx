import { useCallback, useState } from 'react';
import { Badge, Checkbox, EmptyState, Field, UtilityIcon } from '@market/ui';
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
import type { VendorService } from './service';
import { CommandForm, ReadState, RouteLink, useRead } from './common';
import {
  canPickup,
  collectPickup,
  pickupState,
  readPickupOrders,
  type PickupOrder,
} from './pickup-data';
import { vendorOrderStatus } from './order-presentation';
import '@market/ui/farmstand.css';
import './order-detail.css';
import './pickup.css';

function PickupStatusIcon({
  status,
}: {
  status: 'ready' | 'waiting' | 'collected' | 'orders';
}) {
  return (
    <span
      className={`pickup-status-icon pickup-status-icon-${status}`}
      aria-hidden="true"
    >
      <UtilityIcon
        name={
          status === 'waiting'
            ? 'clock'
            : status === 'orders'
              ? 'store'
              : 'check'
        }
      />
    </span>
  );
}

function time(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Date unavailable';
}
function Payment({ order }: { order: PickupOrder }) {
  const state =
    order.payment?.financialStatus ?? order.context?.financialStatus;
  return state ? (
    <Badge tone={vendorOrderStatus('payment', state).tone}>
      {vendorOrderStatus('payment', state).label}
    </Badge>
  ) : (
    <span className="pickup-muted">Unavailable</span>
  );
}
function Status({ order }: { order: PickupOrder }) {
  const state = pickupState(order);
  return (
    <Badge
      tone={
        state === 'Ready for Pickup'
          ? 'success'
          : state === 'Picked up'
            ? 'neutral'
            : state === 'Cancelled'
              ? 'danger'
              : 'warning'
      }
    >
      {state}
    </Badge>
  );
}
function amount(order: PickupOrder) {
  const payment = order.payment;
  if (payment) return formatMoney(payment.original, payment.currency as 'USD');
  return order.context
    ? formatMoney(order.context.original, order.context.currency as 'USD')
    : 'Unavailable';
}

export function VendorPickup({ service }: { service: VendorService }) {
  const load = useCallback(() => readPickupOrders(service), [service]);
  const query = useRead(`pickup:${service.vendorId}`, load);
  const [market, setMarket] = useState('all');
  const [occurrence, setOccurrence] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const orders = query.data ?? [];
  const markets = new Map(
    orders
      .filter((o) => o.portion.marketId)
      .map((o) => [o.portion.marketId!, o.portion.marketName ?? 'Market']),
  );
  const marketOrders = orders.filter(
    (o) => market === 'all' || o.portion.marketId === market,
  );
  const dates = new Map(
    marketOrders
      .filter((o) => o.portion.occurrenceId)
      .map((o) => [o.portion.occurrenceId!, o.portion.occurrenceStartsAt]),
  );
  const scoped = marketOrders.filter(
    (o) => occurrence === 'all' || o.portion.occurrenceId === occurrence,
  );
  const visible = scoped.filter((o) => {
    const state = pickupState(o);
    const stateMatch =
      status === 'all' ||
      (status === 'Awaiting Fulfillment'
        ? ['Awaiting Fulfillment', 'Partially fulfilled'].includes(state)
        : state === status);
    const financial =
      o.payment?.financialStatus ?? o.context?.financialStatus ?? 'unknown';
    return (
      stateMatch &&
      (payment === 'all' || financial === payment) &&
      `${o.customer} ${o.orderCode} ${o.portion.operationalOrderId}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  const order =
    visible.find((o) => o.portion.operationalOrderId === selected) ??
    visible[0];
  const refresh = () => {
    query.refresh();
  };
  return (
    <div className="order-detail pickup-page" aria-busy={busy}>
      <header className="order-page-heading">
        <div className="order-heading-title">
          <span className="order-heading-icon">
            <FarmstandIcon name="package" />
          </span>
          <h1>Pickup</h1>
        </div>
        <FarmstandButton
          variant="secondary"
          disabled={busy || query.loading}
          onClick={refresh}
        >
          Refresh orders
        </FarmstandButton>
      </header>
      <FarmstandPanel className="pickup-toolbar">
        <fieldset disabled={busy} className="pickup-filters">
          <Field id="pickup-search" label="Search">
            <FarmstandSearch
              id="pickup-search"
              placeholder="Customer name or order number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field id="pickup-market" label="Market">
            <FarmstandSelect
              id="pickup-market"
              value={market}
              onChange={(e) => {
                setMarket(e.target.value);
                setOccurrence('all');
                setSelected(null);
              }}
            >
              <option value="all">All markets</option>
              {[...markets].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field id="pickup-date" label="Pickup date">
            <FarmstandSelect
              id="pickup-date"
              value={occurrence}
              onChange={(e) => {
                setOccurrence(e.target.value);
                setSelected(null);
              }}
            >
              <option value="all">All dates</option>
              {[...dates]
                .sort((a, b) => (a[1] ?? '').localeCompare(b[1] ?? ''))
                .map(([id, startsAt]) => (
                  <option key={id} value={id}>
                    {time(startsAt)}
                  </option>
                ))}
            </FarmstandSelect>
          </Field>
          <Field id="pickup-status" label="Fulfillment status">
            <FarmstandSelect
              id="pickup-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                'all',
                'Ready for Pickup',
                'Awaiting Fulfillment',
                'Partially fulfilled',
                'Picked up',
                'Cancelled',
              ].map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field id="pickup-payment" label="Payment status">
            <FarmstandSelect
              id="pickup-payment"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            >
              {[
                'all',
                'PAID',
                'PARTIALLY_REFUNDED',
                'REFUNDED',
                'REFUND_REQUIRED',
                'REFUND_FAILED',
                'unknown',
              ].map((s) => (
                <option key={s} value={s}>
                  {s === 'all'
                    ? 'All statuses'
                    : s === 'unknown'
                      ? 'Unavailable'
                      : vendorOrderStatus('payment', s).label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
        </fieldset>
        <div className="pickup-toolbar-bottom">
          <div
            className="pickup-status-filters"
            aria-label="Pickup queue filters"
          >
            {[
              'all',
              'Ready for Pickup',
              'Awaiting Fulfillment',
              'Picked up',
            ].map((s) => (
              <FarmstandButton
                key={s}
                size="compact"
                variant="primary"
                data-status={
                  s === 'all'
                    ? 'all'
                    : s === 'Ready for Pickup'
                      ? 'ready'
                      : s === 'Picked up'
                        ? 'collected'
                        : 'waiting'
                }
                aria-pressed={status === s}
                disabled={busy}
                onClick={() => setStatus(s)}
              >
                {s !== 'all' && (
                  <PickupStatusIcon
                    status={
                      s === 'Ready for Pickup'
                        ? 'ready'
                        : s === 'Picked up'
                          ? 'collected'
                          : 'waiting'
                    }
                  />
                )}
                {s === 'all' ? 'All' : s}
              </FarmstandButton>
            ))}
          </div>
          <div className="pickup-counts">
            <Badge tone="info">
              <PickupStatusIcon status="orders" />
              {scoped.length} orders
            </Badge>
            <span>
              <PickupStatusIcon status="ready" />
              {
                scoped.filter((o) => pickupState(o) === 'Ready for Pickup')
                  .length
              }{' '}
              ready
            </span>
            <span>
              <PickupStatusIcon status="collected" />
              {scoped.filter((o) => pickupState(o) === 'Picked up').length}{' '}
              picked up
            </span>
          </div>
        </div>
      </FarmstandPanel>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <div className="pickup-columns">
          <FarmstandPanel as="section" className="pickup-queue">
            <div className="pickup-panel-heading">
              <FarmstandIcon name="layers" />
              <div>
                <h2>Pickup queue</h2>
                <p>
                  {market === 'all'
                    ? 'Preorders across your markets'
                    : markets.get(market)}
                  {occurrence !== 'all'
                    ? ` · ${time(dates.get(occurrence))}`
                    : ''}
                </p>
              </div>
            </div>
            <FarmstandTable
              wide
              label="Pickup queue"
              headings={[
                'Customer',
                'Payment',
                'Fulfillment',
                'Items',
                'Total',
              ]}
            >
              {visible.map((row) => (
                <tr
                  key={row.portion.operationalOrderId}
                  className={row === order ? 'pickup-selected' : undefined}
                  onClick={(event) => {
                    if (
                      busy ||
                      event.defaultPrevented ||
                      (event.target instanceof Element &&
                        event.target.closest('button'))
                    )
                      return;
                    event.currentTarget
                      .querySelector<HTMLButtonElement>('.pickup-customer')
                      ?.click();
                  }}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="farmstand-text-action pickup-customer"
                      aria-pressed={row === order}
                      disabled={busy}
                      onClick={() =>
                        setSelected(row.portion.operationalOrderId)
                      }
                    >
                      <span className="farmstand-text-link">
                        {row.customer}
                      </span>
                    </button>
                    <small>
                      <FarmstandIcon name="store" />
                      {row.portion.marketName}
                    </small>
                    <small>
                      <FarmstandIcon name="calendar-days" />
                      {time(
                        row.portion.pickupPromise?.startsAt ??
                          row.portion.occurrenceStartsAt,
                      )}
                    </small>
                  </th>
                  <td>
                    <Payment order={row} />
                  </td>
                  <td>
                    <Status order={row} />
                  </td>
                  <td>{row.portion.quantity}</td>
                  <td>
                    <div className="pickup-row-end">
                      <span>{amount(row)}</span>
                      <FarmstandIcon name="chevron-right" />
                    </div>
                  </td>
                </tr>
              ))}
            </FarmstandTable>
            {!visible.length && (
              <EmptyState title="No matching pickups">
                <p>Try another market, date or filter.</p>
              </EmptyState>
            )}
          </FarmstandPanel>
          <FarmstandPanel
            as="section"
            className="pickup-details"
            aria-label="Pickup details"
          >
            <div className="pickup-panel-heading">
              <FarmstandIcon name="package" />
              <div>
                <h2>Pickup details</h2>
                <p>Order information for a quick handoff at the market.</p>
              </div>
            </div>
            {order ? (
              <PickupDetails
                key={`${order.portion.operationalOrderId}:${JSON.stringify(order.portion.lines)}`}
                order={order}
                service={service}
                refresh={refresh}
                onPendingChange={setBusy}
              />
            ) : (
              <EmptyState title="Select an order" />
            )}
          </FarmstandPanel>
        </div>
      )}
    </div>
  );
}

function PickupDetails({
  order,
  service,
  refresh,
  onPendingChange,
}: {
  order: PickupOrder;
  service: VendorService;
  refresh: () => void;
  onPendingChange: (busy: boolean) => void;
}) {
  return (
    <div className="pickup-detail-body">
      <div className="pickup-identity">
        <h3>{order.customer}</h3>
        <p>Order #{order.orderCode}</p>
        <p className="pickup-vendor-name">
          <FarmstandIcon name="store" /> {service.context.name}
        </p>
      </div>
      <div className="pickup-detail-status">
        <Payment order={order} />
        <Status order={order} />
      </div>
      <div className="pickup-location">
        <FarmstandIcon name="map-pin" />
        <div>
          <strong>{order.portion.marketName}</strong>
          <p>{order.portion.pickupPromise?.venue}</p>
          <p>
            {time(
              order.portion.pickupPromise?.startsAt ??
                order.portion.occurrenceStartsAt,
            )}
          </p>
        </div>
      </div>
      <FarmstandTable
        label="Pickup order items"
        headings={['Item', 'Variant / SKU', 'Qty']}
      >
        {order.portion.lines.map((line) => (
          <tr key={line.operationalLineId}>
            <th scope="row">
              <span className="pickup-item">
                {order.itemDetails?.[line.variantId]?.image ? (
                  <img src={order.itemDetails[line.variantId]!.image!} alt="" />
                ) : (
                  <FarmstandIcon name="package" />
                )}
                {order.itemDetails?.[line.variantId]?.name ?? line.variantName}
              </span>
            </th>
            <td>
              {line.variantName}
              <small>{line.sku}</small>
            </td>
            <td>
              {line.quantity}
              {line.fulfilledQuantity > 0 && (
                <small>{line.fulfilledQuantity} picked up</small>
              )}
              {line.cancelledQuantity > 0 && (
                <small>{line.cancelledQuantity} cancelled</small>
              )}
            </td>
          </tr>
        ))}
      </FarmstandTable>
      <div className="pickup-total">
        <span>Order total</span>
        <strong>{amount(order)}</strong>
      </div>
      {canPickup(service, order) ? (
        <CommandForm
          embedded
          hideTitle
          title="Confirm pickup"
          submitLabel="Mark as Picked Up"
          submitClassName="farmstand-button"
          disableUntilValid
          onPendingChange={onPendingChange}
          run={(_data, operationKey) =>
            collectPickup(service, order, operationKey)
          }
          onDone={refresh}
        >
          <label className="pickup-confirm" htmlFor="pickup-verified">
            <Checkbox id="pickup-verified" name="verified" required />
            I’ve confirmed the customer’s name or order number
          </label>
          <p className="pickup-muted">
            Records pickup of all remaining items in this order.
          </p>
        </CommandForm>
      ) : (
        <p role="status">
          {pickupState(order) === 'Picked up'
            ? 'This order has been picked up.'
            : !service.context.permissions.includes('FulfillOwnOrders')
              ? 'Fulfillment permission is required to record pickup.'
              : 'There are no eligible items to hand off in this order.'}
        </p>
      )}
      <FarmstandLink
        href={`/vendor/orders/${encodeURIComponent(order.portion.operationalOrderId)}`}
        variant="secondary"
      >
        <FarmstandIcon name="arrow-up-right" />
        View Full Order
      </FarmstandLink>
      <RouteLink
        to={`/vendor/orders/packing?occurrence=${encodeURIComponent(order.portion.occurrenceId ?? '')}`}
      >
        View packing list
      </RouteLink>
    </div>
  );
}
