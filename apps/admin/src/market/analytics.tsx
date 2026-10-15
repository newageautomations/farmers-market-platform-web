import { cardClassName } from '@market/ui/presentation';
import { useCallback, useState } from 'react';
import { type AnalyticsMetadata, type MarketMetrics } from '@market/api';
import { Card, Alert, Button, EmptyState, Pagination } from '@market/ui';
import type { MarketService, MarketAvailability } from './service';
import {
  Choice,
  DataTable,
  date,
  dateBounds,
  initialRange,
  RangeForm,
  ReadState,
  text,
  TextField,
  useRead,
} from './common';

export const marketMetrics: readonly {
  field: Exclude<keyof MarketMetrics, '__typename' | 'day' | 'occurrenceId'>;
  label: string;
}[] = [
  { field: 'purchaseCount', label: 'Purchase count' },
  { field: 'marketPurchaseCount', label: 'Market purchase count' },
  { field: 'purchasingVendors', label: 'Purchasing Vendors' },
  { field: 'participatingVendors', label: 'Participating Vendors' },
  { field: 'originalUnits', label: 'Original units' },
  { field: 'fulfilledUnits', label: 'Fulfilled units' },
  { field: 'cancelledUnits', label: 'Cancelled units' },
  { field: 'awaitingPortions', label: 'Awaiting portions' },
  { field: 'completedPortions', label: 'Completed portions' },
  { field: 'cancelledPortions', label: 'Cancelled portions' },
  { field: 'plannedParticipations', label: 'Planned participations' },
  { field: 'confirmedParticipations', label: 'Confirmed participations' },
  { field: 'cancelledParticipations', label: 'Cancelled participations' },
];
export function Projection({ metadata }: { metadata: AnalyticsMetadata }) {
  return metadata.status === 'ACTIVE' ? null : (
    <Alert severity="warning">
      Analytics are being updated. Some figures may be out of date.
    </Alert>
  );
}
export function AvailabilityState({ value }: { value: MarketAvailability }) {
  return value === 'ALLOWED' ? null : (
    <Alert severity="neutral">
      Analytics are not available for this market.
    </Alert>
  );
}
export function MarketAnalytics({ service }: { service: MarketService }) {
  const availabilityRead = useCallback(() => service.availability(), [service]);
  const availability = useRead(
    `${service.marketId}:analytics-availability`,
    availabilityRead,
  );
  const [range, setRange] = useState(initialRange);
  const [view, setView] = useState('daily');
  const [occurrenceId, setOccurrenceId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const after = cursors[cursors.length - 1]!;
  const bounds = dateBounds(range.from, range.through);
  const read = useCallback(() => {
    const input = { start: bounds.from, end: bounds.through, take: 20, after };
    return view === 'occurrence'
      ? service.occurrenceAnalytics(service.marketId, input, occurrenceId)
      : service.analytics(service.marketId, input);
  }, [service, bounds.from, bounds.through, after, view, occurrenceId]);
  const state = useRead(
    `${service.marketId}:analytics:${view}:${occurrenceId}:${bounds.from}:${bounds.through}:${after}`,
    read,
    availability.data === 'ALLOWED',
  );
  function refresh() {
    setCursors([null]);
    availability.refresh();
    state.refresh();
  }
  return (
    <>
      <Card as="div" className="dashboard-card">
        <ReadState {...availability} retry={refresh} />
        {availability.data && <AvailabilityState value={availability.data} />}
      </Card>
      {availability.data === 'ALLOWED' && (
        <>
          <RangeForm
            range={range}
            onChange={(next) => {
              setRange(next);
              setCursors([null]);
            }}
          />
          <form
            className={cardClassName({
              className: 'filter-bar ui-control-row',
            })}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const selected = text(data, 'view');
              setView(selected);
              setOccurrenceId(text(data, 'occurrenceId') || null);
              setCursors([null]);
            }}
          >
            <Choice
              name="view"
              label="View"
              choices={['daily', 'occurrence']}
              value={view}
            />
            <TextField
              name="occurrenceId"
              label="Occurrence Number (optional)"
              required={false}
            />
            <div className="ui-field-action">
              <Button type="submit">Apply view</Button>
            </div>
          </form>
          <ReadState {...state} retry={refresh} />
          {state.data && (
            <>
              <Projection metadata={state.data.metadata} />
              {state.data.items.length ? (
                state.data.items.map((bucket, index) => (
                  <Card
                    as="div"
                    className="record-details"
                    key={`${bucket.day}:${bucket.occurrenceId}:${index}`}
                  >
                    <p>
                      {date(bucket.day)}
                      {bucket.occurrenceId
                        ? ` · Market Date ${bucket.occurrenceId}`
                        : ''}
                    </p>
                    <DataTable
                      label={`Operational metrics ${bucket.day} bucket ${index + 1}`}
                      headings={['Measure', 'Count']}
                    >
                      {marketMetrics.map((metric) => (
                        <tr key={metric.field}>
                          <th scope="row">{metric.label}</th>
                          <td>{bucket[metric.field]}</td>
                        </tr>
                      ))}
                    </DataTable>
                  </Card>
                ))
              ) : (
                <EmptyState title="No analytics available for these dates" />
              )}
              <Pagination
                hasPrevious={cursors.length > 1}
                hasNext={!!state.data.nextCursor}
                onPrevious={() => setCursors((values) => values.slice(0, -1))}
                onNext={() =>
                  setCursors((values) => [...values, state.data!.nextCursor])
                }
              />
            </>
          )}
        </>
      )}
    </>
  );
}
