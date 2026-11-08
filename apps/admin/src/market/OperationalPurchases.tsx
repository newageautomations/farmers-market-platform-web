import type { MarketOperationsPage } from '@market/api';
import { Badge as OrderBadge, Card, EmptyState } from '@market/ui';
import { vendorOrderStatus } from '../vendor/order-presentation';
import { DataTable, date } from './common';

/**
 * Preorder (operational purchase) portions for one occurrence. Hidden from
 * the Market Operations pages for now; the backend `operations` read and
 * this presentation are kept so the view can return without new work.
 */
export function OperationalPurchases({ page }: { page: MarketOperationsPage }) {
  return page.items.length ? (
    <>
      {page.items.map((purchase) => (
        <Card
          as="div"
          className="record-details"
          key={purchase.customerOrderId}
        >
          <p>
            Order {purchase.customerOrderId} · market date{' '}
            {purchase.occurrenceId}
          </p>
          {purchase.portions.map((portion) => (
            <div className="market-portion" key={portion.operationalOrderId}>
              <p>
                Vendor {portion.vendorId} · order {portion.operationalOrderId}
              </p>
              <p>
                Order Status:{' '}
                <OrderBadge
                  tone={vendorOrderStatus('order', portion.nativeState).tone}
                >
                  {portion.nativeState}
                </OrderBadge>{' '}
                · Pickup status:{' '}
                <OrderBadge
                  tone={vendorOrderStatus('pickup', portion.pickupStatus).tone}
                >
                  {portion.pickupStatus}
                </OrderBadge>
              </p>
              <DataTable
                label={`Operational order ${portion.operationalOrderId} quantities`}
                headings={[
                  'Variant',
                  'Original units',
                  'Fulfilled units',
                  'Cancelled units',
                  'Remaining units',
                ]}
              >
                {portion.lines.map((line) => (
                  <tr key={line.operationalLineId}>
                    <td>
                      {line.variantName || `Product ${line.variantId}`}
                      <small>{line.sku}</small>
                    </td>
                    <td>{line.quantity}</td>
                    <td>{line.fulfilledQuantity}</td>
                    <td>{line.cancelledQuantity}</td>
                    <td>{line.remainingQuantity}</td>
                  </tr>
                ))}
              </DataTable>
              <p>
                Pickup promise: {portion.pickupPromise.mode};{' '}
                {portion.pickupPromise.venue || 'Venue not provided'};{' '}
                {portion.pickupPromise.instructions ||
                  'Instructions not provided'}
                .
              </p>
              <p>
                Pickup Time: {date(portion.pickupPromise.startsAt)} to{' '}
                {date(portion.pickupPromise.endsAt)}.
              </p>
              {portion.fulfillments.length ? (
                portion.fulfillments.map((row) => (
                  <p key={row.id}>
                    Fulfillment {row.id}: {row.state};{' '}
                    {row.lines
                      .map(
                        (line) =>
                          `${line.quantity} units on order line ${line.operationalLineId}`,
                      )
                      .join('; ')}
                    .
                  </p>
                ))
              ) : (
                <EmptyState title="No fulfillments">
                  <p>No fulfillments returned.</p>
                </EmptyState>
              )}
            </div>
          ))}
        </Card>
      ))}
    </>
  ) : (
    <EmptyState title="No operational purchases for this occurrence" />
  );
}
