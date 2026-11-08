import { useCallback, useState } from 'react';
import { safeError, type OperationsCommand } from '@market/api';
import { ErrorState, MarketMap } from '@market/ui';
import { FarmstandIcon, FarmstandLink } from '@market/ui/farmstand';
import { Panel } from '../vendor/application-detail';
import type { MarketService } from './service';
import { go, ReadState, useRead } from './common';
import { OccurrenceLayoutActions } from './phase14/OccurrenceLayoutActions';
import { BoothAssignmentDialog, boothStatus } from './phase14/Assignments';

export function OccurrenceMap({
  service,
  occurrenceId,
}: {
  service: MarketService;
  occurrenceId: string;
}) {
  const [error, setError] = useState<ReturnType<typeof safeError> | null>(null);
  // The booth chosen on the map or from the booth list opens its assignment.
  const [selected, setSelected] = useState('');
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
    { retainPreviousData: true },
  );
  const canAssign = service.context.permissions.includes(
    'ManageOwnMarketAssignments',
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
    <Panel
      icon={{ farmstand: 'map-pin' }}
      title="Market layout"
      className="occurrence-map-panel"
      aside={
        allowed && (
          <div className="occurrence-map-actions">
            {data && (
              <OccurrenceLayoutActions
                key={`${service.readKey}:${occurrenceId}`}
                data={data}
                occurrenceId={Number(occurrenceId)}
                run={run}
                canChange={service.context.permissions.includes(
                  'ManageOwnMarketAssignments',
                )}
                compact
                canEdit={
                  service.context.permissions.includes(
                    'ManageOwnMarketLayouts',
                  ) &&
                  service.context.permissions.includes(
                    'ManageOwnMarketAssignments',
                  )
                }
              />
            )}
            <FarmstandLink
              href={`/market/assignments/${occurrenceId}`}
              variant="secondary"
              size="compact"
              onClick={(event) => {
                if (
                  event.button ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                go(`/market/assignments/${occurrenceId}`);
              }}
            >
              <FarmstandIcon name="store" />
              Manage booths
            </FarmstandLink>
          </div>
        )
      }
    >
      <div className="occurrence-map-body">
        <ReadState {...state} retry={state.refresh} />
        {error && <ErrorState error={error} />}
        {layout && canAssign && (
          <p className="markets-muted">
            Select a booth on the map, or open one in the booth list, to assign
            a business.
          </p>
        )}
        {layout ? (
          <MarketMap
            key={layout.id}
            selectedId={selected || undefined}
            onSelect={setSelected}
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
            <p className="markets-muted">
              {allowed
                ? 'No layout has been selected for this occurrence.'
                : 'The layout is unavailable for this account.'}
            </p>
          )
        )}
      </div>
      {data && selected && (
        <BoothAssignmentDialog
          key={selected}
          data={data}
          occurrenceId={Number(occurrenceId)}
          elementId={selected}
          run={run}
          canAssign={canAssign}
          canDay={false}
          canBill={service.context.permissions.includes(
            'ManageOwnMarketBilling',
          )}
          commandError={error}
          onClose={() => setSelected('')}
        />
      )}
    </Panel>
  );
}
