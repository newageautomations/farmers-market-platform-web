import { useCallback } from 'react';
import type { NotificationsApi } from '@market/api';
import { Alert, Card, DataTable } from '@market/ui';
import { DocumentStatus } from '@market/ui/documents';
import { ReadState, RouteLink, useRead } from '../vendor/common';
import { UpcomingReadiness } from './ComplianceReports';

export function ComplianceOverview({
  api,
  manager = false,
}: {
  api: NotificationsApi;
  manager?: boolean;
}) {
  const read = useCallback(() => api.summary(), [api]);
  const state = useRead('compliance-overview', read);
  const data = state.data;
  const base = manager ? '/market/documents' : '/vendor/documents';
  return (
    <>
      <Card as="section" aria-label="Document compliance overview">
        <p>
          {manager
            ? 'Documentation readiness for this Market.'
            : 'Your outstanding document work across Markets.'}
        </p>
        <ReadState {...state} retry={state.refresh} />
        {data && (
          <>
            <dl className="ui-kpi-grid">
              {(manager
                ? [
                    ['Vendors ready', data.marketTotals.ready, 'Ready'],
                    [
                      'Vendors incomplete',
                      data.marketTotals.incomplete,
                      'Incomplete',
                    ],
                    [
                      'Submissions pending review',
                      data.totals.pending,
                      'Pending review',
                    ],
                    [
                      'Expired shared documents',
                      data.totals.expired,
                      'Expired',
                    ],
                    [
                      'Shared documents expiring soon',
                      data.totals.expiringSoon,
                      'Expiring Soon',
                    ],
                  ]
                : [
                    [
                      'Outstanding required requests',
                      data.totals.outstandingRequired,
                      'Incomplete',
                    ],
                    [
                      'Awaiting manager approval',
                      data.totals.pending,
                      'Pending review',
                    ],
                    [
                      'Rejected requests requiring action',
                      data.totals.rejected,
                      'Rejected',
                    ],
                    [
                      'Saved documents expiring soon',
                      data.library?.expiringSoon ?? 0,
                      'Expiring Soon',
                    ],
                    [
                      'Expired saved documents',
                      data.library?.expired ?? 0,
                      'Expired',
                    ],
                  ]
              ).map(([label, count, status]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd>{count}</dd>
                  {Number(count) > 0 && (
                    <dd>
                      <DocumentStatus value={String(status)} />
                    </dd>
                  )}
                </div>
              ))}
            </dl>
            {!manager && data.markets.length > 0 && (
              <DataTable
                label="Document requests by Market"
                recordDetails={{
                  status: 1,
                  statuses: data.markets
                    .slice(0, 5)
                    .map((m) => <DocumentStatus value={m.status} />),
                }}
                headings={['Market', 'Document work']}
              >
                {data.markets.slice(0, 5).map((m) => (
                  <tr key={m.market_id}>
                    <td>
                      <RouteLink
                        to={`${base}?view=requests&market=${m.market_id}`}
                      >
                        {m.market_name}
                      </RouteLink>
                    </td>
                    <td>
                      <DocumentStatus value={m.status} />
                      <p>
                        {m.outstandingRequired} required outstanding ·{' '}
                        {m.pending} awaiting review · {m.rejected} rejected
                      </p>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
            {!manager && (data.truncated || data.markets.length > 5) && (
              <Alert severity="info">
                Showing a limited Market list. Counts cover all eligible
                requests. Open Documents for the full workspace.
              </Alert>
            )}
            <div className="overview-links">
              <RouteLink to={`${base}?view=requests`}>
                {manager ? 'Review Vendor compliance' : 'View Market requests'}
              </RouteLink>
              {!manager && (
                <RouteLink to={base}>Open document library</RouteLink>
              )}
            </div>
          </>
        )}
      </Card>
      {manager ? (
        <RouteLink to="/market/documents?view=reports">
          View Market-date readiness and compliance reports
        </RouteLink>
      ) : (
        api.upcoming && <UpcomingReadiness load={api.upcoming} />
      )}
    </>
  );
}
