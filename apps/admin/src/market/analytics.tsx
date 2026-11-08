import { useCallback, useId, useMemo, useState } from 'react';
import { type AnalyticsMetadata, type MarketMetrics } from '@market/api';
import { Alert, Dialog, EmptyState, Field } from '@market/ui';
import {
  FarmstandButton,
  FarmstandPanel,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import type { MarketService, MarketAvailability } from './service';
import {
  DataTable,
  date,
  dateBounds,
  initialRange,
  ReadState,
  useRead,
} from './common';
import { MarketsPagination } from '../vendor/MarketsPagination';
import type { FinanceInsightScope } from '../finance/Finances';
import { dayAfter } from '../finance/finance-dates';
import { useResettingState } from '../finance/resetting-state';

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
type ActivityView = 'daily' | 'occurrence';
const columns = [
  'purchaseCount',
  'purchasingVendors',
  'participatingVendors',
  'originalUnits',
  'fulfilledUnits',
  'confirmedParticipations',
] as const;

/**
 * Market activity from the optional operational analytics projection. On the
 * finance overview it follows the selected period; availability remains
 * independent of billing authority.
 */
export function MarketAnalytics({
  service,
  scope,
}: {
  service: MarketService;
  scope?: FinanceInsightScope;
}) {
  const id = useId();
  const availabilityRead = useCallback(() => service.availability(), [service]);
  const availability = useRead(
    `${service.marketId}:analytics-availability`,
    availabilityRead,
  );
  const from = scope?.from,
    through = scope?.through;
  const bounds = useMemo(() => {
    try {
      return from && through
        ? dateBounds(from, dayAfter(through))
        : (() => {
            const range = initialRange();
            return dateBounds(range.from, range.through);
          })();
    } catch {
      return null;
    }
  }, [from, through]);
  const [view, setView] = useState<ActivityView>('daily');
  // Cursor paging restarts when the period or view changes.
  const [cursors, setCursors] = useResettingState<(string | null)[]>(
    [null],
    [bounds?.from, bounds?.through, view],
  );
  const [detail, setDetail] = useState<MarketMetrics>();
  const after = cursors[cursors.length - 1]!;
  const allowed = availability.data === 'ALLOWED' && !!bounds;
  const read = useCallback(() => {
    const input = {
      start: bounds!.from,
      end: bounds!.through,
      take: 20,
      after,
    };
    return view === 'occurrence'
      ? service.occurrenceAnalytics(service.marketId, input, null)
      : service.analytics(service.marketId, input);
  }, [service, bounds, after, view]);
  const state = useRead(
    `${service.marketId}:analytics:${view}:${bounds?.from}:${bounds?.through}:${after}`,
    read,
    allowed,
  );
  const label = (field: (typeof columns)[number]) =>
    marketMetrics.find((m) => m.field === field)!.label;
  const occurrence = (bucket: MarketMetrics) =>
    bucket.occurrenceId
      ? (scope?.names?.event(String(bucket.occurrenceId)) ??
        `Market Date ${bucket.occurrenceId}`)
      : '';
  return (
    <section className="finance-insights" aria-labelledby={id + '-title'}>
      <FarmstandPanel as="div" className="finance-panel">
        <div className="finance-insights-title">
          <div>
            <h2 id={id + '-title'}>Market activity</h2>
            <p>Operational counts in UTC days for the selected period.</p>
          </div>
          {allowed && (
            <Field
              id={id + '-view'}
              label={<span className="sr-only">Activity view</span>}
            >
              <FarmstandSelect
                id={id + '-view'}
                value={view}
                onChange={(e) => setView(e.target.value as ActivityView)}
              >
                <option value="daily">Daily</option>
                <option value="occurrence">By market date</option>
              </FarmstandSelect>
            </Field>
          )}
        </div>
        <ReadState {...availability} retry={availability.refresh} />
        {availability.data && <AvailabilityState value={availability.data} />}
        {availability.data === 'ALLOWED' && !bounds && (
          <Alert severity="info">
            Market activity covers up to 366 days. Choose a shorter period.
          </Alert>
        )}
        {allowed && (
          <>
            <ReadState {...state} retry={state.refresh} />
            {state.data && (
              <>
                <Projection metadata={state.data.metadata} />
                {state.data.items.length ? (
                  <FarmstandTable
                    label="Market activity"
                    wide
                    headings={[
                      'UTC day',
                      ...(view === 'occurrence' ? ['Market date'] : []),
                      ...columns.map(label),
                      'Details',
                    ]}
                  >
                    {state.data.items.map((bucket, index) => (
                      <tr key={`${bucket.day}:${bucket.occurrenceId}:${index}`}>
                        <th scope="row">{date(bucket.day)}</th>
                        {view === 'occurrence' && <td>{occurrence(bucket)}</td>}
                        {columns.map((field) => (
                          <td key={field}>{bucket[field]}</td>
                        ))}
                        <td>
                          <FarmstandButton
                            variant="secondary"
                            size="compact"
                            onClick={() => setDetail(bucket)}
                          >
                            All measures
                            <span className="sr-only">
                              {' '}
                              for {date(bucket.day)} {occurrence(bucket)}
                            </span>
                          </FarmstandButton>
                        </td>
                      </tr>
                    ))}
                  </FarmstandTable>
                ) : (
                  <EmptyState title="No analytics available for these dates" />
                )}
                <MarketsPagination
                  label="Market activity pages"
                  summary={`${state.data.items.length} records on this page`}
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
      </FarmstandPanel>
      {detail && (
        <Dialog
          open
          title={`${date(detail.day)}${detail.occurrenceId ? ' · ' + occurrence(detail) : ''}`}
          onClose={() => setDetail(undefined)}
        >
          <DataTable
            label="Operational measures"
            headings={['Measure', 'Count']}
          >
            {marketMetrics.map((metric) => (
              <tr key={metric.field}>
                <th scope="row">{metric.label}</th>
                <td>{detail[metric.field]}</td>
              </tr>
            ))}
          </DataTable>
        </Dialog>
      )}
    </section>
  );
}
