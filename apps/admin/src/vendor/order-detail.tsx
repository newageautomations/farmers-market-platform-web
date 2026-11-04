import { useCallback, type ReactNode } from 'react';
import { mayCommand } from '@market/admin-core';
import { nativePaymentLabel, type PosSale } from '@market/api';
import { formatMoney } from '@market/config';
import { Badge } from '@market/ui';
import {
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandTable,
  type FarmstandIconName,
} from '@market/ui/farmstand';
import { OrderStatus } from './OrderStatus';
import { OrderOperations } from './order-operations';
import { PosOrderPayment, posPaymentDescription } from './pos-payments';
import { ReadState, date, go, useRead } from './common';
import type { OrderView, VendorService } from './service';
import '@market/ui/farmstand.css';
import './order-detail.css';

function OrderPanel({
  icon,
  title,
  children,
  className = '',
}: {
  icon: FarmstandIconName;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FarmstandPanel
      as="section"
      aria-label={title}
      className={`order-panel ${className}`}
    >
      <h2>
        <FarmstandIcon name={icon} />
        {title}
      </h2>
      {children}
    </FarmstandPanel>
  );
}
function Fact({
  icon,
  label,
  children,
}: {
  icon?: FarmstandIconName;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="order-fact">
      <dt>
        {icon && <FarmstandIcon name={icon} />}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
function paymentMethod(sale: PosSale) {
  if (sale.native) return nativePaymentLabel(sale.native.method);
  return sale.method === 'CASH' ? 'Cash' : sale.method.replaceAll('_', ' ');
}

export function OrderDetail({
  service,
  id,
}: {
  service: VendorService;
  id: string;
}) {
  const read = useCallback(() => service.order(id), [service, id]);
  const query = useRead(`order:${id}`, read);
  function workspace(sale: PosSale | null = null, paymentControls?: ReactNode) {
    return (
      query.data && (
        <OrderWorkspace
          service={service}
          id={id}
          view={query.data}
          refresh={query.refresh}
          sale={sale}
          paymentControls={paymentControls}
        />
      )
    );
  }
  return (
    <div className="order-detail">
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <div key={JSON.stringify(query.data)}>
          {query.data.portion.kind === 'IN_PERSON' &&
          service.pos &&
          service.context.permissions.includes('ReadOwnVendorFinance') ? (
            <PosOrderPayment
              api={service.pos}
              orderId={id}
              canRefund={mayCommand(service.context, 'RequestOwnVendorRefund')}
              actionClassName="farmstand-button"
              renderRecord={workspace}
            />
          ) : (
            workspace()
          )}
        </div>
      )}
    </div>
  );
}

function OrderWorkspace({
  service,
  id,
  view,
  refresh,
  sale,
  paymentControls,
}: {
  service: VendorService;
  id: string;
  view: OrderView;
  refresh: () => void;
  sale: PosSale | null;
  paymentControls?: ReactNode;
}) {
  const { portion, context } = view;
  const inPerson = portion.kind === 'IN_PERSON';
  const kind = inPerson
    ? 'In-person sale'
    : portion.kind === 'MARKET_OCCURRENCE'
      ? 'Market pickup'
      : 'Direct vendor';
  const ordered = portion.lines.reduce((sum, line) => sum + line.quantity, 0);
  const fulfilled = portion.lines.reduce(
    (sum, line) => sum + line.fulfilledQuantity,
    0,
  );
  const cancelled = portion.lines.reduce(
    (sum, line) => sum + line.cancelledQuantity,
    0,
  );
  const remaining = portion.lines.reduce(
    (sum, line) => sum + line.remainingQuantity,
    0,
  );
  // Cancelled units stay in the original denominator and are reported separately.
  const progress =
    ordered > 0
      ? Math.min(100, Math.max(0, Math.round((fulfilled / ordered) * 100)))
      : 0;
  const money = (value: number) =>
    formatMoney(value, (sale?.currency ?? context?.currency ?? 'USD') as 'USD');
  const promise = portion.pickupPromise;
  return (
    <>
      <header className="order-page-heading">
        <div className="order-heading-title">
          <span className="order-heading-icon">
            <FarmstandIcon name="shopping-cart" />
          </span>
          <h1>Order #{sale?.orderCode || portion.operationalOrderId}</h1>
          {sale ? (
            <Badge
              tone={
                sale.state === 'COMPLETED'
                  ? 'success'
                  : ['DECLINED', 'CANCELLED', 'FAILED'].includes(sale.state)
                    ? 'danger'
                    : 'warning'
              }
              className="order-status-badge"
            >
              <span className="order-status-dot" aria-hidden="true" />
              {sale.state === 'COMPLETED'
                ? 'Completed'
                : sale.state.replaceAll('_', ' ').toLowerCase()}
            </Badge>
          ) : (
            <OrderStatus domain="order" value={portion.nativeState} />
          )}
        </div>
        <FarmstandLink
          href="/vendor/orders"
          variant="secondary"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              go('/vendor/orders');
            }
          }}
        >
          <FarmstandIcon name="arrow-left" />
          Back to orders
        </FarmstandLink>
      </header>
      <div className="order-columns">
        <div className="order-main">
          <OrderPanel icon="layers" title="Order overview">
            <dl className="order-overview-facts">
              <Fact icon="hash" label="Order number">
                #{sale?.orderCode || portion.operationalOrderId}
              </Fact>
              <Fact icon="store" label="Vendor">
                {sale?.vendor ?? `Vendor reference ${portion.vendorId}`}
              </Fact>
              <Fact icon="calendar-days" label="Date and time">
                {sale
                  ? new Date(
                      sale.completedAt ?? sale.confirmedAt,
                    ).toLocaleString(undefined, {
                      timeZone: sale.timezone ?? 'UTC',
                    })
                  : date(portion.placedAt)}
                {sale?.timezone ? ` (${sale.timezone})` : ' (UTC)'}
              </Fact>
              {sale && (
                <Fact icon="user-round" label="Customer">
                  {sale.customer}
                </Fact>
              )}
              <Fact icon="store" label="Sale type">
                {kind}
              </Fact>
              {sale && (
                <Fact icon="credit-card" label="Payment method">
                  {paymentMethod(sale)}
                </Fact>
              )}
              {sale?.cashierId && (
                <Fact icon="receipt-text" label="Cashier reference">
                  {sale.cashierId}
                </Fact>
              )}
              {sale && sale.orderId !== sale.orderCode && (
                <Fact icon="hash" label="Operational reference">
                  {portion.operationalOrderId}
                </Fact>
              )}
              {portion.occurrenceId && (
                <Fact icon="calendar-days" label="Market occurrence">
                  {portion.marketName ?? 'Market occurrence'} ·{' '}
                  {portion.occurrenceId}
                  {portion.occurrenceStartsAt && (
                    <small>{date(portion.occurrenceStartsAt)} (UTC)</small>
                  )}
                </Fact>
              )}
              {context?.occurrenceId &&
                context.occurrenceId !== portion.occurrenceId && (
                  <Fact icon="hash" label="Occurrence reference">
                    {context.occurrenceId}
                  </Fact>
                )}
            </dl>
          </OrderPanel>
          <OrderPanel
            icon="tag"
            title="Order items"
            className="order-items-panel"
          >
            <FarmstandTable
              label="Order items"
              headings={
                sale
                  ? ['Item', 'Quantity', 'Merchandise']
                  : ['Item', 'Quantity']
              }
            >
              {sale
                ? sale.items.map((line) => (
                    <tr key={line.id}>
                      <th scope="row">
                        <span className="order-item-identity">
                          <span>{line.name}</span>
                        </span>
                      </th>
                      <td>{line.quantity}</td>
                      <td>
                        {money(
                          line.merchandiseAmount ??
                            (line.lineTax == null
                              ? line.unitPrice * line.quantity
                              : line.lineTotal -
                                line.lineTax +
                                (line.lineDiscount ?? 0)),
                        )}
                      </td>
                    </tr>
                  ))
                : portion.lines.map((line) => (
                    <tr key={line.operationalLineId}>
                      <th scope="row">
                        {line.variantName}
                        <small>{line.sku}</small>
                      </th>
                      <td>{line.quantity}</td>
                    </tr>
                  ))}
            </FarmstandTable>
            {sale && (
              <dl className="order-totals">
                <Fact label="Merchandise before discounts">
                  {money(sale.subtotal)}
                </Fact>
                {sale.discount > 0 && (
                  <Fact label="Discounts">{money(-sale.discount)}</Fact>
                )}
                <Fact label="Merchandise subtotal">
                  {money(sale.subtotal - sale.discount)}
                </Fact>
                <Fact label="Sales tax collected">{money(sale.tax)}</Fact>
                <div className="order-total">
                  <dt>Total paid</dt>
                  <dd>{money(sale.amount)}</dd>
                </div>
                {sale.tendered != null && (
                  <Fact label="Cash received">{money(sale.tendered)}</Fact>
                )}
                {sale.changeDue != null && (
                  <Fact label="Change due">{money(sale.changeDue)}</Fact>
                )}
              </dl>
            )}
          </OrderPanel>
          <OrderPanel
            icon="package"
            title="Product fulfillment"
            className="order-fulfillment-panel"
          >
            <FarmstandTable
              label="Operational order lines"
              headings={[
                'Variant',
                'Ordered',
                'Fulfilled',
                'Cancelled',
                'Remaining',
              ]}
            >
              {portion.lines.map((line) => (
                <tr key={line.operationalLineId}>
                  <th scope="row">
                    {line.variantName}
                    <small>{line.sku}</small>
                  </th>
                  <td>{line.quantity}</td>
                  <td>
                    <Badge
                      tone={line.fulfilledQuantity > 0 ? 'success' : 'neutral'}
                    >
                      {line.fulfilledQuantity}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={line.cancelledQuantity > 0 ? 'danger' : 'neutral'}
                    >
                      {line.cancelledQuantity}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={line.remainingQuantity > 0 ? 'warning' : 'neutral'}
                    >
                      {line.remainingQuantity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </FarmstandTable>
            <OrderOperations
              service={service}
              id={id}
              view={view}
              refresh={refresh}
            />
          </OrderPanel>
        </div>
        <aside className="order-sidebar" aria-label="Order details">
          <OrderPanel
            icon="store"
            title={inPerson ? 'Sale details' : 'Pickup details'}
          >
            <dl className="order-detail-facts">
              <div className="order-status-row">
                <dt>
                  <FarmstandIcon name="truck" />
                  Pickup status
                </dt>
                <dd>
                  <OrderStatus domain="pickup" value={portion.pickupStatus} />
                </dd>
              </div>
              <Fact icon="map-pin" label="Location">
                {inPerson
                  ? (sale?.context.label ??
                    portion.marketName ??
                    'Independent sale')
                  : (promise?.venue ?? portion.marketName ?? 'Not provided')}
              </Fact>
              {!inPerson && promise && (
                <>
                  <Fact icon="store" label="Pickup mode">
                    {promise.mode.replaceAll('_', ' ').toLowerCase()}
                  </Fact>
                  <Fact icon="calendar-days" label="Pickup window">
                    {date(promise.startsAt)} to {date(promise.endsAt)} (UTC)
                  </Fact>
                </>
              )}
            </dl>
            <p className="order-note">
              <FarmstandIcon name="info" />
              {inPerson
                ? 'Merchandise handed directly to the customer.'
                : promise?.instructions ||
                  (promise
                    ? 'No pickup instructions provided.'
                    : 'No pickup promise provided.')}
            </p>
          </OrderPanel>
          <OrderPanel icon="credit-card" title="Payment">
            <dl className="order-detail-facts order-payment-facts">
              {sale && (
                <>
                  <Fact label="Payment method">{paymentMethod(sale)}</Fact>
                  <Fact label="Processor / system">
                    {posPaymentDescription(sale)}
                  </Fact>
                  <Fact label="Total paid">{money(sale.amount)}</Fact>
                  {sale.changeDue != null && (
                    <Fact label="Change due">{money(sale.changeDue)}</Fact>
                  )}
                  {sale.square && (
                    <>
                      <Fact label="Square location">
                        {sale.square.locationId}
                      </Fact>
                      <Fact label="Payment reference">
                        {sale.square.paymentId ?? 'Awaiting verification'}
                      </Fact>
                    </>
                  )}
                  {sale.native && (
                    <>
                      <Fact label="Merchant">{sale.native.merchantId}</Fact>
                      <Fact label="Payment reference">
                        {sale.native.paymentId ??
                          'Awaiting independent verification'}
                      </Fact>
                      <Fact label="Reference number">
                        {sale.native.reference}
                      </Fact>
                    </>
                  )}
                  {sale.clover && (
                    <>
                      <Fact label="Clover merchant">
                        {sale.clover.merchantId}
                      </Fact>
                      <Fact label="Device">
                        {sale.clover.deviceLabel ?? 'Not provided'}
                      </Fact>
                      <Fact label="Payment reference">
                        {sale.clover.paymentId ?? 'Awaiting verification'}
                      </Fact>
                      <Fact label="Reference number">
                        {sale.clover.externalPaymentId}
                      </Fact>
                    </>
                  )}
                  {sale.financialStatus && (
                    <div className="order-status-row">
                      <dt>Payment status</dt>
                      <dd>
                        <OrderStatus
                          domain="payment"
                          value={sale.financialStatus}
                        />
                      </dd>
                    </div>
                  )}
                </>
              )}
              {context && (
                <>
                  <div className="order-status-row">
                    <dt>Payment status</dt>
                    <dd>
                      <OrderStatus
                        domain="payment"
                        value={context.financialStatus}
                      />
                    </dd>
                  </div>
                  <Fact label="Vendor attributed">
                    {money(context.original)}
                  </Fact>
                  <Fact label="Settled refund">{money(context.refunded)}</Fact>
                  <Fact label="Vendor remaining attributed">
                    {money(context.remaining)}
                  </Fact>
                </>
              )}
            </dl>
            {!sale && !context && !paymentControls && (
              <p className="order-note">
                <FarmstandIcon name="info" />
                Payment details are unavailable in this order view.
              </p>
            )}
            {sale && sale.refunds.length > 0 && (
              <ul className="order-refund-history" aria-label="Refund history">
                {sale.refunds.map((refund) => (
                  <li key={refund.id}>
                    <Badge
                      tone={
                        refund.state === 'SETTLED'
                          ? 'success'
                          : ['PROVIDER_FAILED', 'FAILED'].includes(refund.state)
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {refund.state.replaceAll('_', ' ').toLowerCase()}
                    </Badge>
                    <strong>{money(refund.amount)}</strong>
                    <span>{refund.reason}</span>
                    <time dateTime={refund.createdAt}>
                      {new Date(refund.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            {paymentControls && (
              <div className="order-payment-controls">{paymentControls}</div>
            )}
          </OrderPanel>
          <OrderPanel icon="circle-check" title="Order status">
            <dl className="order-status-list">
              <div className="order-status-row">
                <dt>
                  <FarmstandIcon name="circle-check" />
                  Operational state
                </dt>
                <dd>
                  <OrderStatus domain="order" value={portion.nativeState} />
                </dd>
              </div>
              <div className="order-status-row">
                <dt>
                  <FarmstandIcon name="store" />
                  Pickup status
                </dt>
                <dd>
                  <OrderStatus domain="pickup" value={portion.pickupStatus} />
                </dd>
              </div>
            </dl>
            <div className="order-progress">
              <div>
                <span>
                  <FarmstandIcon name="package" />
                  Fulfillment progress
                </span>
                <strong>
                  {fulfilled} of {ordered} units fulfilled
                </strong>
              </div>
              <div className="order-progress-track">
                <progress
                  max="100"
                  value={progress}
                  aria-label="Fulfillment progress"
                />
                <span>{progress}%</span>
              </div>
              <p>
                {remaining} remaining · {cancelled} cancelled
              </p>
            </div>
          </OrderPanel>
        </aside>
      </div>
    </>
  );
}
