import { useCallback, useState } from 'react';
import { type AnalyticsMetadata, type MarketMetrics } from '@market/api';
import { Alert, Button, EmptyState, Pagination } from '@market/ui';
import type { MarketService, MarketAvailability } from './service';
import {
  Choice,
  DataTable,
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
  return (
    <div className="projection-status" role="status">
      <p>
        Projection: {metadata.status}. Completeness: {metadata.completeness}.
      </p>
      <p>
        Source as of: {metadata.sourceAsOf ?? metadata.asOf ?? 'Not provided'}.
        Active generation: {metadata.activeGenerationId ?? 'Not built'}.
      </p>
      <p>
        Last success: {metadata.lastSuccessfulAt ?? 'Not provided'}. Last
        reconciliation: {metadata.lastReconciledAt ?? 'Not provided'}. Technical
        bucket: {metadata.technicalBucket}.
      </p>
      {metadata.status !== 'ACTIVE' && (
        <p>
          This projection is not current. Its returned snapshot may be stale,
          rebuilding, failed or unbuilt.
        </p>
      )}
    </div>
  );
}
export function AvailabilityState({ value }: { value: MarketAvailability }) {
  return (
    <Alert>
      Market analytics: {value}.{' '}
      {value === 'ALLOWED'
        ? 'Operational analytics are available.'
        : value === 'DENIED'
          ? 'Analytics access is denied for this context.'
          : value === 'UNCONFIGURED'
            ? 'This analytics boundary is unconfigured.'
            : 'Analytics availability has not been established.'}{' '}
      Core Market administration remains available.
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
      <div className="dashboard-card">
        <ReadState {...availability} retry={refresh} />
        <Button className="secondary" onClick={refresh}>
          Refresh analytics
        </Button>
        {availability.data && <AvailabilityState value={availability.data} />}
      </div>
      {availability.data === 'ALLOWED' && (
        <>
          <p>
            UTC midnight [from, through), maximum 366 days. Counts remain exact
            backend strings. Daily and occurrence buckets are separate; this UI
            does not add distinct Vendor counts across buckets.
          </p>
          <RangeForm
            range={range}
            onChange={(next) => {
              setRange(next);
              setCursors([null]);
            }}
          />
          <form
            className="filter-bar"
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
              label="Bucket view"
              choices={['daily', 'occurrence']}
              value={view}
            />
            <TextField
              name="occurrenceId"
              label="Filter occurrence reference (optional)"
              required={false}
            />
            <Button type="submit">Apply view</Button>
          </form>
          <ReadState {...state} retry={refresh} />
          {state.data && (
            <>
              <Projection metadata={state.data.metadata} />
              {state.data.items.length ? (
                state.data.items.map((bucket, index) => (
                  <div
                    className="record-details"
                    key={`${bucket.day}:${bucket.occurrenceId}:${index}`}
                  >
                    <p>
                      UTC day {bucket.day}
                      {bucket.occurrenceId
                        ? ` · occurrence reference ${bucket.occurrenceId}`
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
                  </div>
                ))
              ) : (
                <EmptyState title="No operational analytics buckets returned" />
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
