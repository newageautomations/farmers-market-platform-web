import { MarketsWorkspace } from './MarketsWorkspace';
import { MarketDetailPage } from './MarketDetail';
import { MarketOccurrencePage } from './MarketOccurrence';
import { useCallback, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import { Button } from '@market/ui';
import type { VendorService } from './service';
import { ReadState, useRead } from './common';
export { PublicationControls } from './PublicationControls';

function VendorLinkRequests({ service }: { service: VendorService }) {
  const read = useCallback(() => service.linkRequests!(), [service]);
  const query = useRead('vendor-link-requests', read);
  const [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <section aria-label="Market identity link requests">
      <ReadState {...query} retry={query.refresh} />
      {query.data?.map((r) => (
        <div key={r.id}>
          <p>
            {r.marketName} requests verification that {r.businessName} is your
            business.
          </p>
          <p>{r.reason}</p>
          <p>
            Confirm only if this is your business. Confirmation grants access to
            future operations that explicitly use your verified identity.
          </p>
          {([true, false] as const).map((confirm) => (
            <Button
              variant="secondary"
              type="button"
              key={String(confirm)}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setFailed(false);
                try {
                  await service.respondToLink!(r.id, r.revision, confirm);
                  query.refresh();
                } catch {
                  setFailed(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirm ? 'Confirm this business link' : 'Decline link request'}
            </Button>
          ))}
        </div>
      ))}
      {failed && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          The link response could not be saved. Refresh to check your current
          authority and request state.
        </p>
      )}
    </section>
  );
}
export function Markets({
  service,
  id,
  occurrenceId,
  initialView,
}: {
  service: VendorService;
  id?: string;
  occurrenceId?: string;
  initialView?: 'applications';
}) {
  if (id && occurrenceId)
    return (
      <MarketOccurrencePage
        service={service}
        membershipId={id}
        occurrenceId={occurrenceId}
      />
    );
  if (id) return <MarketDetailPage service={service} id={id} />;
  return (
    <MarketsWorkspace
      key={service.vendorId}
      service={service}
      initialView={initialView}
      relationshipTools={
        <>
          {service.linkRequests &&
            service.respondToLink &&
            mayCommand(service.context, 'ManageOwnMarketParticipation') && (
              <VendorLinkRequests service={service} />
            )}
        </>
      }
    />
  );
}
