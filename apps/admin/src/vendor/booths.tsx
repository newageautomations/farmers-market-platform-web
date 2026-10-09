import { MarketMap, ErrorState, Spinner } from '@market/ui';
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
      {!read.data?.length && <p>No upcoming booth assignments.</p>}
      {read.data?.map((a) => (
        <section
          key={`${a.occurrenceId}:${a.elementId}`}
          className="ops-editor"
        >
          <h2>
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
              Invoice {i.id}: {i.status.toLowerCase()}
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
        </section>
      ))}
    </div>
  );
}
async function unavailable() {
  return [];
}
