import { EmptyState } from '@market/ui';
import {
  AppError,
  type AnalyticsMetadata,
  type AnalyticsRange,
  type AnalyticsTotals,
} from '@market/api';
import { formatMoney } from '@market/config';
import type { Availability } from './service';
import { DataTable, Unavailable, date } from './common';

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
    <div
      className={`projection-status alert ui-alert ${m.status === 'ACTIVE' ? 'ui-alert-info' : 'ui-alert-warning'}`}
    >
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
        wide
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
        <EmptyState title="No projected activity">
          <p>
            No projected activity in this range. This does not establish that no
            operational activity exists.
          </p>
        </EmptyState>
      )}
    </>
  );
}
