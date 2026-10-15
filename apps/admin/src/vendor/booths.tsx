import { EmptyState } from '@market/ui';
import { Badge } from '@market/ui';
import { Card, MarketMap, ErrorState, Spinner } from '@market/ui';
import type { VendorService } from './service';
import { useRead } from './common';
export function VendorBooths({ service }: { service: VendorService }) {
  const read = useRead(
    `booths:${service.vendorId}`,
    service.boothAssignments ?? unavailable,
  );
  if (read.loading) return <Spinner label="Loading booth assignments" />;
  if (read.error) return <ErrorState error={read.error} />;
  return (
    <div className="ops-workspace">
      <h1>Your booth assignments</h1>
      {!read.data?.length && (
        <EmptyState title="No upcoming booth assignments">
          <p>No upcoming booth assignments.</p>
        </EmptyState>
      )}
      {read.data?.map((a) => (
        <Card
          as="section"
          key={`${a.occurrenceId}:${a.elementId}`}
          className="ops-editor"
        >
          <h2 className="ui-section-title-dashboard">
            {new Date(a.startsAt).toLocaleString()} · {a.space.label}
          </h2>
          <p>
            {a.space.widthFeet} × {a.space.depthFeet} ft ·{' '}
            {a.space.amenities.join(', ').toLowerCase()}
          </p>
          <p>{a.publicInstructions}</p>
          <p>
            Accepted rentals:{' '}
            {a.rentals.map((r) => `${r.name} × ${r.quantity}`).join(', ') ||
              'None'}
          </p>
          {a.invoices.map((i) => (
            <p key={i.id}>
              Invoice {i.id}:{' '}
              <Badge
                tone={
                  i.status === 'PAID'
                    ? 'success'
                    : i.status === 'PAST_DUE'
                      ? 'danger'
                      : i.status === 'OPEN'
                        ? 'warning'
                        : 'neutral'
                }
              >
                {i.status.toLowerCase()}
              </Badge>
            </p>
          ))}
          {a.map ? (
            <MarketMap
              definition={a.map.definition}
              spaces={a.map.spaces}
              selectedId={a.elementId}
            />
          ) : (
            <p>The occurrence map is awaiting publication.</p>
          )}
        </Card>
      ))}
    </div>
  );
}
async function unavailable() {
  return [];
}
