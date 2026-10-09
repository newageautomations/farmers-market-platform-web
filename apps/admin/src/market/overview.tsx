import { useCallback, useState } from 'react';
import { Badge, Button, EmptyState } from '@market/ui';
import type { MarketService } from './service';
import { AvailabilityState, Projection } from './analytics';
import {
  dateBounds,
  initialRange,
  RangeForm,
  ReadState,
  RouteLink,
  useRead,
} from './common';

export function MarketOverview({ service }: { service: MarketService }) {
  const [range, setRange] = useState(initialRange);
  const bounds = dateBounds(range.from, range.through);
  const configurationRead = useCallback(
    () => service.configuration(service.marketId),
    [service],
  );
  const occurrencesRead = useCallback(
    () => service.overview({ from: bounds.from, through: bounds.through }),
    [service, bounds.from, bounds.through],
  );
  const relationshipsRead = useCallback(
    () => service.relationshipPage({ take: 5 }),
    [service],
  );
  const availabilityRead = useCallback(() => service.availability(), [service]);
  const config = useRead(
    `${service.readKey}:overview-config`,
    configurationRead,
  );
  const occurrences = useRead(
    `${service.readKey}:overview-occurrences:${bounds.from}:${bounds.through}`,
    occurrencesRead,
  );
  const relationships = useRead(
    `${service.readKey}:overview-relationships`,
    relationshipsRead,
  );
  const availability = useRead(
    `${service.readKey}:overview-availability`,
    availabilityRead,
  );
  const analyticsRead = useCallback(
    () =>
      service.analytics(service.marketId, {
        start: bounds.from,
        end: bounds.through,
        take: 1,
        after: null,
      }),
    [service, bounds.from, bounds.through],
  );
  const analytics = useRead(
    `${service.readKey}:overview-analytics:${bounds.from}:${bounds.through}`,
    analyticsRead,
    availability.data === 'ALLOWED',
  );
  const next = occurrences.data?.nextOccurrence;
  const operationsRead = useCallback(
    () => service.operations(next!.id, 0),
    [service, next],
  );
  const operations = useRead(
    `${service.readKey}:overview-operations:${next?.id}`,
    operationsRead,
    !!next,
  );
  function refresh() {
    config.refresh();
    occurrences.refresh();
    relationships.refresh();
    availability.refresh();
    analytics.refresh();
    operations.refresh();
  }
  return (
    <>
      <section className="dashboard-card" aria-label="Market schedule overview">
        <ReadState {...config} retry={config.refresh} />
        {config.data && (
          <p>
            {config.data.name} · <Badge>{config.data.status}</Badge> ·{' '}
            {config.data.timezone}
          </p>
        )}
        <Button className="secondary" onClick={refresh}>
          Refresh overview
        </Button>
        <RangeForm range={range} onChange={setRange} />
        <p>
          Operational totals are current database counts. Upcoming scheduled
          occurrences use this UTC date range.
        </p>
        <ReadState {...occurrences} retry={occurrences.refresh} />
        {occurrences.data && (
          <>
            <p>
              {occurrences.data.upcomingScheduledOccurrences} upcoming scheduled
              occurrences in this date range.
            </p>
            {next ? (
              <p>
                Next scheduled occurrence:{' '}
                <RouteLink to={`/market/occurrences/${next.id}`}>
                  {next.localStartsAt}
                </RouteLink>{' '}
                ({next.timezone}), {next.venue || 'venue not provided'}.
              </p>
            ) : (
              <EmptyState title="No upcoming occurrence returned" />
            )}
            <RouteLink to="/market/occurrences">Manage occurrences</RouteLink>
          </>
        )}
      </section>
      <section
        className="dashboard-card"
        aria-label="Business relationships overview"
      >
        <ReadState {...relationships} retry={relationships.refresh} />
        {relationships.data && (
          <>
            <p>
              {occurrences.data?.approvedVendorRelationships} approved Vendor
              relationships out of {occurrences.data?.totalVendorRelationships}{' '}
              total relationships.
            </p>
            {relationships.data.items.length ? (
              <div className="overview-links">
                {relationships.data.items.slice(0, 5).map((row) => (
                  <RouteLink key={row.id} to={`/market/vendors/${row.id}`}>
                    {row.vendor.name}: {row.status}
                  </RouteLink>
                ))}
              </div>
            ) : (
              <EmptyState title="No Vendor relationships returned" />
            )}
            <RouteLink to="/market/vendors">
              Manage Vendor relationships
            </RouteLink>
          </>
        )}
      </section>
      {next && (
        <section
          className="dashboard-card"
          aria-label="Upcoming market operations"
        >
          <ReadState {...operations} retry={operations.refresh} />
          {operations.data && (
            <>
              <p>
                {operations.data.totalItems} operational purchases for the next
                scheduled occurrence, from the authoritative paged operations
                projection.
              </p>
              <p>
                First page operational portions:{' '}
                {operations.data.items
                  .slice(0, 3)
                  .flatMap((row) =>
                    row.portions.map(
                      (portion) =>
                        `${portion.nativeState}, pickup ${portion.pickupStatus}`,
                    ),
                  )
                  .join('; ') || 'None returned'}
                .
              </p>
              <RouteLink to={`/market/operations/${next.id}`}>
                Coordinate occurrence operations
              </RouteLink>
            </>
          )}
        </section>
      )}
      <section
        className="dashboard-card"
        aria-label="Market analytics overview"
      >
        <ReadState {...availability} retry={availability.refresh} />
        {availability.data && <AvailabilityState value={availability.data} />}
        <ReadState {...analytics} retry={analytics.refresh} />
        {analytics.data && (
          <>
            <Projection metadata={analytics.data.metadata} />
            {analytics.data.items[0] ? (
              <p>
                First returned UTC day {analytics.data.items[0].day}: purchase
                count {analytics.data.items[0].purchaseCount}; confirmed
                participations {analytics.data.items[0].confirmedParticipations}
                ; participating Vendors{' '}
                {analytics.data.items[0].participatingVendors}. This is a
                bucket, not a range total.
              </p>
            ) : (
              <EmptyState title="No analytics summary bucket returned" />
            )}
          </>
        )}
      </section>
    </>
  );
}
