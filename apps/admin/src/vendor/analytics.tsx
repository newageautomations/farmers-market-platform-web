import { useCallback, useState } from 'react';
import {
  AppError,
  type AnalyticsMetadata,
  type AnalyticsRange,
  type AnalyticsTotals,
} from '@market/api';
import { formatMoney } from '@market/config';
import { Button, Field, Pagination, Select } from '@market/ui';
import type { Availability, VendorService } from './service';
import {
  DataTable,
  ReadState,
  TextField,
  Unavailable,
  date,
  text,
  useRead,
} from './common';

export function defaultRange(): AnalyticsRange {
  return {
    start:
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) +
      'T00:00:00.000Z',
    end: new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
    take: 20,
    after: null,
  };
}
export function analyticsRange(from: string, through: string): AnalyticsRange {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(through))
    throw new AppError('validation');
  const start = `${from}T00:00:00.000Z`,
    end = `${through}T00:00:00.000Z`,
    span = new Date(end).getTime() - new Date(start).getTime();
  if (
    !Number.isFinite(span) ||
    span <= 0 ||
    span > 366 * 86400000 ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end).toISOString().slice(0, 10) !== through
  )
    throw new AppError('validation');
  return { start, end, take: 20, after: null };
}
export function AvailabilityNotice({
  availability,
}: {
  availability: Availability;
}) {
  return availability === 'allowed' ? null : (
    <Unavailable>
      {availability === 'denied'
        ? 'Analytics is not available with your current permission or optional entitlement.'
        : availability === 'unconfigured'
          ? 'Analytics availability is unconfigured.'
          : 'Analytics availability is unknown. An authoritative boundary mapping is required.'}{' '}
      Core operational tools remain governed by their own permissions.
    </Unavailable>
  );
}
export function Metadata({ metadata: m }: { metadata: AnalyticsMetadata }) {
  return (
    <div className="projection-status">
      <p>
        Projection: {m.status} · {m.completeness} · {m.technicalBucket}
      </p>
      <p>
        Source as of {date(m.sourceAsOf)} (UTC) · Last successful{' '}
        {date(m.lastSuccessfulAt)} (UTC) · Last reconciled{' '}
        {date(m.lastReconciledAt)} (UTC)
      </p>
      {m.status !== 'ACTIVE' && (
        <p role="status">
          {['BUILDING', 'UNBUILT'].includes(m.status)
            ? 'A current projection is not ready. A prior snapshot may remain visible.'
            : 'This projection needs attention. Treat these aggregates as a snapshot, not current operational truth.'}
        </p>
      )}
    </div>
  );
}
export function TotalsTable({ data }: { data: AnalyticsTotals }) {
  return (
    <>
      <Metadata metadata={data.metadata} />
      <DataTable
        label="Vendor analytics totals by currency"
        headings={[
          'Currency',
          'Vendor purchases',
          'Direct purchases',
          'Market purchases',
          'Vendor attributed',
          'Settled refund',
          'Cohort settled refund',
          'Vendor remaining attributed',
          'Original units',
          'Distinct purchasing customers',
        ]}
      >
        {data.items.map((t) => (
          <tr key={t.currency}>
            <th scope="row">{t.currency}</th>
            <td>{t.vendorPurchaseCount}</td>
            <td>{t.directPurchaseCount}</td>
            <td>{t.marketPurchaseCount}</td>
            <td>{formatMoney(t.vendorAttributed, t.currency)}</td>
            <td>{formatMoney(t.settledRefund, t.currency)}</td>
            <td>{formatMoney(t.cohortSettledRefund, t.currency)}</td>
            <td>{formatMoney(t.vendorRemainingAttributed, t.currency)}</td>
            <td>{t.originalUnits}</td>
            <td>{t.distinctPurchasingCustomers}</td>
          </tr>
        ))}
      </DataTable>
      {!data.items.length && (
        <p>
          No projected activity in this range. This does not establish that no
          operational activity exists.
        </p>
      )}
    </>
  );
}
type View = 'summary' | 'trend' | 'products' | 'markets' | 'occurrences';
export function Analytics({ service }: { service: VendorService }) {
  const [range, setRange] = useState(defaultRange),
    [view, setView] = useState<View>('summary'),
    [previous, setPrevious] = useState<(string | null)[]>([]),
    [invalid, setInvalid] = useState(false);
  const availabilityRead = useCallback(() => service.availability(), [service]);
  const availability = useRead('analytics-availability', availabilityRead);
  const totalsRead = useCallback(
    () => service.totals(service.vendorId, range),
    [service, range],
  );
  const totals = useRead(
    `totals:${range.start}:${range.end}`,
    totalsRead,
    availability.data === 'allowed' && view === 'summary',
  );
  const pageRead = useCallback(
    () =>
      view === 'products'
        ? service.productAnalytics(service.vendorId, range)
        : view === 'markets'
          ? service.marketAnalytics(service.vendorId, range)
          : view === 'occurrences'
            ? service.occurrenceAnalytics(service.vendorId, range)
            : service.trend(service.vendorId, range),
    [service, range, view],
  );
  const page = useRead(
    `page:${view}:${JSON.stringify(range)}`,
    pageRead,
    availability.data === 'allowed' && view !== 'summary',
  );
  return (
    <>
      <ReadState {...availability} retry={availability.refresh} />
      {availability.data && (
        <AvailabilityNotice availability={availability.data} />
      )}
      <p>
        Vendor purchases and attributed amounts are backend projections.
        Currencies remain separate. UTC day ranges include the start and exclude
        the end.
      </p>
      {availability.data === 'allowed' && (
        <>
          <form
            className="filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              try {
                setRange(analyticsRange(text(d, 'start'), text(d, 'end')));
                setPrevious([]);
                setInvalid(false);
              } catch {
                setInvalid(true);
              }
            }}
          >
            <TextField
              name="start"
              label="Start date (UTC)"
              type="date"
              value={range.start.slice(0, 10)}
            />
            <TextField
              name="end"
              label="End date, exclusive (UTC)"
              type="date"
              value={range.end.slice(0, 10)}
            />
            <Button type="submit">Apply range</Button>
          </form>
          {invalid && (
            <p role="alert">
              Choose valid UTC dates in an increasing range of at most 366 days.
            </p>
          )}
          <Field id="analytics-view" label="Analytics view">
            <Select
              id="analytics-view"
              value={view}
              onChange={(e) => {
                setView(e.target.value as View);
                setRange({ ...range, after: null });
                setPrevious([]);
              }}
            >
              <option value="summary">Summary</option>
              <option value="trend">Trend</option>
              <option value="products">Products</option>
              <option value="markets">Markets</option>
              <option value="occurrences">Occurrences</option>
            </Select>
          </Field>
          <ReadState {...totals} retry={totals.refresh} />
          {totals.data && <TotalsTable data={totals.data} />}
          <ReadState
            {...page}
            retry={() => {
              setRange({ ...range, after: null });
              setPrevious([]);
              page.refresh();
            }}
          />
          {page.data && (
            <>
              <Metadata metadata={page.data.metadata} />
              <DataTable
                label={`Vendor ${view} analytics`}
                headings={[
                  'UTC day',
                  'Currency',
                  'Dimension',
                  'Vendor purchases',
                  'Vendor attributed',
                  'Settled refund',
                  'Vendor remaining attributed',
                  'Fulfilled units',
                  'Cancelled units',
                ]}
              >
                {page.data.items.map((r, i) => (
                  <tr
                    key={`${r.day}:${r.currency}:${r.variantId}:${r.marketId}:${r.occurrenceId}:${i}`}
                  >
                    <th scope="row">{r.day}</th>
                    <td>{r.currency}</td>
                    <td>
                      {view === 'products'
                        ? service.variantName(r.variantId ?? '')
                        : view === 'markets'
                          ? service.marketName(r.marketId ?? '')
                          : view === 'occurrences'
                            ? `Occurrence ${r.occurrenceId}`
                            : 'Vendor'}
                    </td>
                    <td>{r.vendorPurchaseCount}</td>
                    <td>{formatMoney(r.vendorAttributed, r.currency)}</td>
                    <td>{formatMoney(r.settledRefund, r.currency)}</td>
                    <td>
                      {formatMoney(r.vendorRemainingAttributed, r.currency)}
                    </td>
                    <td>{r.fulfilledUnits}</td>
                    <td>{r.cancelledUnits}</td>
                  </tr>
                ))}
              </DataTable>
              {!page.data.items.length && (
                <p>No projected rows in this range.</p>
              )}
              <Pagination
                hasPrevious={previous.length > 0}
                hasNext={!!page.data.nextCursor}
                onPrevious={() => {
                  setRange({ ...range, after: previous.at(-1) ?? null });
                  setPrevious(previous.slice(0, -1));
                }}
                onNext={() => {
                  setPrevious([...previous, range.after ?? null]);
                  setRange({ ...range, after: page.data!.nextCursor });
                }}
              />
            </>
          )}
        </>
      )}
      <p>
        Captured customer funds, platform charges, payouts and lifetime value
        are not presented as Vendor attributed revenue.
      </p>
    </>
  );
}
