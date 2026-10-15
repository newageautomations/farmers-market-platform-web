import { useCallback } from 'react';
import { Card, EmptyState } from '@market/ui';
import type { MarketService } from './service';
import {
  DataTable,
  date,
  ReadState,
  RouteLink,
  StatusBadge,
  useRead,
} from './common';

export function MarketOverview({ service }: { service: MarketService }) {
  const read = useCallback(() => service.overview(), [service]);
  const relationshipsRead = useCallback(
    () => service.relationshipPage({ take: 5 }),
    [service],
  );
  const occurrences = useRead(`${service.readKey}:overview-occurrences`, read);
  const relationships = useRead(
    `${service.readKey}:overview-relationships`,
    relationshipsRead,
  );
  const next = occurrences.data?.nextOccurrence;
  return (
    <>
      <Card
        as="section"
        className="dashboard-card"
        aria-label="Market schedule overview"
      >
        <h2 className="ui-section-title-dashboard">
          Next Scheduled Occurrence
        </h2>
        <ReadState {...occurrences} retry={occurrences.refresh} />
        {occurrences.data &&
          (next ? (
            <>
              <p className="market-next-date">
                {date(next.startsAt, next.timezone)}
              </p>
              {next.venue && <p>{next.venue}</p>}
              <RouteLink to={`/market/occurrences/${next.id}`}>
                View Occurrence
              </RouteLink>
            </>
          ) : (
            <EmptyState title="No occurrences have been scheduled." />
          ))}
        <RouteLink to="/market/occurrences">Manage Occurrences</RouteLink>
      </Card>
      <Card
        as="section"
        className="dashboard-card"
        aria-label="Vendor relationships"
      >
        <h2 className="ui-section-title-dashboard">Vendor Relationships</h2>
        <ReadState {...relationships} retry={relationships.refresh} />
        {relationships.data &&
          (relationships.data.items.length ? (
            <DataTable
              label="Vendor relationships"
              headings={['Vendor', 'Status', 'Edit']}
            >
              {relationships.data.items.map((row) => (
                <tr key={row.id}>
                  <td>{row.vendor.name}</td>
                  <td>
                    <StatusBadge>{row.status}</StatusBadge>
                  </td>
                  <td>
                    <RouteLink to={`/market/vendors/${row.id}`}>Edit</RouteLink>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No vendor relationships yet" />
          ))}
        <RouteLink to="/market/vendors">View All Vendors</RouteLink>
      </Card>
    </>
  );
}
