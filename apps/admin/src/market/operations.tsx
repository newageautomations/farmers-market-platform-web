import { vendorOrderStatus } from '../vendor/order-presentation';
import { Badge as OrderBadge } from '@market/ui';
import { StatusBadge as Badge } from './presentation';
import { useCallback, useState } from 'react';
import type { MarketOperationsPage } from '@market/api';
import { Card, EmptyState, Pagination } from '@market/ui';
import type { MarketService } from './service';
import {
  DataTable,
  date,
  dateBounds,
  initialRange,
  RangeForm,
  ReadState,
  RouteLink,
  useRead,
} from './common';

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
export function MarketOperations({
  service,
  id,
}: {
  service: MarketService;
  id?: string;
}) {
  const [range, setRange] = useState(initialRange);
  const [skip, setSkip] = useState(0);
  const [occurrenceSkip, setOccurrenceSkip] = useState(0);
  const bounds = dateBounds(range.from, range.through);
  const occurrencesRead = useCallback(
    () =>
      service.occurrencePage({
        take: 20,
        skip: occurrenceSkip,
        from: bounds.from,
        through: bounds.through,
      }),
    [service, bounds.from, bounds.through, occurrenceSkip],
  );
  const occurrences = useRead(
    `${service.readKey}:operations-occurrences:${bounds.from}:${bounds.through}:${occurrenceSkip}`,
    occurrencesRead,
    !id,
  );
  const operationsRead = useCallback(
    () => service.operations(id!, skip),
    [service, id, skip],
  );
  const operations = useRead(
    `${service.readKey}:operations:${id}:${skip}`,
    operationsRead,
    !!id,
  );
  return (
    <>
      {id ? (
        <>
          <Card
            as="section"
            className="dashboard-card"
            aria-label="Occurrence operations controls"
          >
            <RouteLink to="/market/operations">
              Choose another occurrence
            </RouteLink>
            <ReadState {...operations} retry={operations.refresh} />
          </Card>
          {operations.data && (
            <>
              <p>
                {operations.data.totalItems} operational purchases in this
                occurrence. Showing{' '}
                {operations.data.items.length ? skip + 1 : 0} to{' '}
                {operations.data.items.length
                  ? skip + operations.data.items.length
                  : 0}
                .
              </p>
              <OperationalPurchases page={operations.data} />
              <Pagination
                hasPrevious={skip > 0}
                hasNext={skip + 20 < operations.data.totalItems}
                onPrevious={() => setSkip((value) => Math.max(0, value - 20))}
                onNext={() => setSkip((value) => value + 20)}
              />
            </>
          )}
        </>
      ) : (
        <>
          <Card as="div" className="dashboard-card">
            <RangeForm
              range={range}
              onChange={(value) => {
                setRange(value);
                setOccurrenceSkip(0);
              }}
            />
          </Card>
          <ReadState {...occurrences} retry={occurrences.refresh} />
          {occurrences.data && (
            <>
              <p>
                {occurrences.data.totalItems} occurrences in this date range.
              </p>
              <Pagination
                hasPrevious={occurrenceSkip > 0}
                hasNext={occurrenceSkip + 20 < occurrences.data.totalItems}
                onPrevious={() => setOccurrenceSkip((v) => Math.max(0, v - 20))}
                onNext={() => setOccurrenceSkip((v) => v + 20)}
              />
            </>
          )}
          {occurrences.data &&
            (occurrences.data.items.length ? (
              <DataTable
                label="Choose occurrence operations"
                headings={['Start', 'Status', 'Operations']}
                sort={{ heading: 'Start', direction: 'ascending' }}
              >
                {occurrences.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{date(row.startsAt, row.timezone)}</td>
                    <td>
                      <Badge>{row.status}</Badge>
                    </td>
                    <td>
                      <RouteLink to={`/market/operations/${row.id}`}>
                        View operations for {date(row.scheduleDate)}
                      </RouteLink>
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState title="No occurrence choices in this date view" />
            ))}
        </>
      )}
    </>
  );
}
