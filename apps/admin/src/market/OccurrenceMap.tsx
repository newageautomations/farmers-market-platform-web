import { useCallback, useState } from 'react';
import { safeError, type OperationsCommand } from '@market/api';
import { Card, ErrorState, MarketMap } from '@market/ui';
import type { MarketService } from './service';
import { ReadState, RouteLink, useRead } from './common';
import { OccurrenceLayoutActions } from './phase14/OccurrenceLayoutActions';
import { boothStatus } from './phase14/Assignments';

export function OccurrenceMap({
  service,
  occurrenceId,
}: {
  service: MarketService;
  occurrenceId: string;
}) {
  const [error, setError] = useState<ReturnType<typeof safeError> | null>(null);
  const allowed =
    !!service.phase14 &&
    service.context.permissions.includes('ReadOwnMarketAssignments');
  const load = useCallback(
    () => service.phase14!.read('ASSIGNMENTS', Number(occurrenceId)),
    [service, occurrenceId],
  );
  const state = useRead(
    `${service.readKey}:occurrence-map:${occurrenceId}`,
    load,
    allowed,
  );
  const data = state.data;
  const plan = data?.plans?.find(
    (p) => p.occurrenceId === Number(occurrenceId),
  );
  const layout = data?.layoutVersions?.find(
    (v) => v.id === plan?.layoutVersionId,
  );
  const spaces =
    data?.spaces?.filter((s) => s.layoutVersionId === layout?.id) ?? [];
  const assignments =
    data?.assignments?.filter((a) => a.occurrenceId === Number(occurrenceId)) ??
    [];
  async function run(command: OperationsCommand) {
    setError(null);
    try {
      const result = await service.phase14!.command(command);
      state.refresh();
      return result;
    } catch (cause) {
      setError(safeError(cause));
      return undefined;
    }
  }
  return (
    <Card
      as="section"
      className="dashboard-card"
      aria-label="Occurrence layout"
    >
      <h2 className="ui-section-title-dashboard">Market Layout</h2>
      {data && (
        <OccurrenceLayoutActions
          key={`${service.readKey}:${occurrenceId}`}
          data={data}
          occurrenceId={Number(occurrenceId)}
          run={run}
          canChange={service.context.permissions.includes(
            'ManageOwnMarketAssignments',
          )}
          canEdit={
            service.context.permissions.includes('ManageOwnMarketLayouts') &&
            service.context.permissions.includes('ManageOwnMarketAssignments')
          }
        />
      )}
      <ReadState {...state} retry={state.refresh} />
      {error && <ErrorState error={error} />}
      {layout ? (
        <MarketMap
          key={layout.id}
          definition={layout.definition}
          spaces={spaces.map((s) => ({
            elementId: s.elementId,
            label: s.details.label,
            widthFeet: s.details.widthFeet,
            depthFeet: s.details.depthFeet,
            amenities: s.details.amenities,
            vendor:
              assignments.find((a) => a.spaceId === s.id)?.businessSnapshot ??
              null,
          }))}
          statuses={Object.fromEntries(
            spaces.map((s) => [
              s.elementId,
              boothStatus(
                assignments.find((a) => a.spaceId === s.id),
                data?.invoices,
              ),
            ]),
          )}
        />
      ) : (
        !state.loading &&
        !state.error && (
          <p>
            {allowed
              ? 'No layout has been selected for this occurrence.'
              : 'The layout is unavailable for this account.'}
          </p>
        )
      )}
      {allowed && (
        <RouteLink to={`/market/assignments/${occurrenceId}`}>
          Manage Booths
        </RouteLink>
      )}
    </Card>
  );
}
