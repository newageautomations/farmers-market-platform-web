import { useCallback, useState } from 'react';
import type { MarketOperationsPage } from '@market/api';
import { Badge, Button, EmptyState, Pagination } from '@market/ui';
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
        <div className="record-details" key={purchase.customerOrderId}>
          <p>
            Operational purchase reference {purchase.customerOrderId} ·
            occurrence reference {purchase.occurrenceId}
          </p>
          {purchase.portions.map((portion) => (
            <div className="market-portion" key={portion.operationalOrderId}>
              <p>
                Vendor reference {portion.vendorId} · operational order
                reference {portion.operationalOrderId}
              </p>
              <p>
                Native state: <Badge>{portion.nativeState}</Badge> · Pickup
                status: <Badge>{portion.pickupStatus}</Badge>
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
                      {line.variantName ||
                        `Variant reference ${line.variantId}`}
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
                Pickup instants:{' '}
                {portion.pickupPromise.startsAt ?? 'Not provided'} to{' '}
                {portion.pickupPromise.endsAt ?? 'Not provided'}.
              </p>
              {portion.fulfillments.length ? (
                portion.fulfillments.map((row) => (
                  <p key={row.id}>
                    Fulfillment reference {row.id}: {row.state};{' '}
                    {row.lines
                      .map(
                        (line) =>
                          `${line.quantity} units on operational line ${line.operationalLineId}`,
                      )
                      .join('; ')}
                    .
                  </p>
                ))
              ) : (
                <p>No fulfillments returned.</p>
              )}
            </div>
          ))}
        </div>
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
      <div className="dashboard-card">
        <p>
          Coordinate Vendor operational portions by occurrence. This view is
          read only. Native order state, pickup status and line quantities
          describe separate operational facts.
        </p>
      </div>
      {id ? (
        <>
          <section
            className="dashboard-card"
            aria-label="Occurrence operations controls"
          >
            <RouteLink to="/market/operations">
              Choose another occurrence
            </RouteLink>
            <p>
              Occurrence reference {id}. Server order: purchase placement
              descending, then reference descending.
            </p>
            <ReadState {...operations} retry={operations.refresh} />
            <Button className="secondary" onClick={operations.refresh}>
              Refresh operations
            </Button>
          </section>
          {operations.data && (
            <>
              <p>
                {operations.data.totalItems} operational purchases in this
                occurrence. Showing{' '}
                {skip + (operations.data.items.length ? 1 : 0)} to{' '}
                {skip + operations.data.items.length}.
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
          <div className="dashboard-card">
            <RangeForm
              range={range}
              onChange={(value) => {
                setRange(value);
                setOccurrenceSkip(0);
              }}
            />
          </div>
          <p>
            Occurrence choices use server pages ordered by start, then
            reference.
          </p>
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
                    <td>
                      {date(row.startsAt, row.timezone)}
                      <small>
                        {row.localStartsAt} · {row.timezone}
                      </small>
                    </td>
                    <td>{row.status}</td>
                    <td>
                      <RouteLink to={`/market/operations/${row.id}`}>
                        View operations for {row.scheduleDate}
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
