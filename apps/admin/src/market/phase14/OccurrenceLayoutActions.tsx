import { IconButton } from '@market/ui';
import { useState } from 'react';
import type {
  LayoutVersion,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { Button } from '@market/ui';
import { AnimatedDisclosure, MarketDialog } from '../presentation';
import { go, RouteLink } from '../../vendor/common';
import { LayoutEditor, LayoutPreview } from './Layouts';

type Run = (command: OperationsCommand) => Promise<unknown>;
export function OccurrenceLayoutActions({
  data,
  occurrenceId,
  run,
  canChange,
  canEdit,
}: {
  data: MarketOperationsData;
  occurrenceId: number;
  run: Run;
  canChange: boolean;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LayoutVersion | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId);
  const version = data.layoutVersions?.find(
    (v) => v.id === plan?.layoutVersionId,
  );
  const hasMapData =
    !!data.assignments?.some((a) => a.occurrenceId === occurrenceId) ||
    !!data.allocations?.some((a) => a.occurrenceId === occurrenceId) ||
    !!plan?.publicInstructions ||
    !!plan?.operationsComplete ||
    plan?.state === 'PUBLISHED';
  const layouts = (data.layouts ?? [])
    .filter((l) => !l.deletedAt)
    .flatMap((layout) => {
      const latest = data.layoutVersions
        ?.filter(
          (v) =>
            v.layoutId === layout.id &&
            v.status === 'PUBLISHED' &&
            !v.occurrenceId,
        )
        .sort((a, b) => b.versionNumber - a.versionNumber)[0];
      return latest ? [{ layout, version: latest }] : [];
    });
  async function change(next: LayoutVersion, confirmed = false) {
    if (pending || next.id === version?.id) return;
    if (hasMapData && !confirmed) {
      setSelected(next);
      return;
    }
    setPending(true);
    setError('');
    try {
      const result = await run({
        action: 'SET_PLAN',
        id: plan?.id,
        expectedRevision: plan?.revision,
        data: {
          occurrenceId,
          layoutVersionId: next.id,
          clearLayoutData: confirmed,
        },
      });
      if (result) setOpen(false);
      else
        setError(
          'The layout could not be changed. Refresh the occurrence and try again.',
        );
    } catch {
      setError(
        'The layout could not be changed. Refresh the occurrence and try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="occurrence-layout-actions">
        {canChange && (
          <Button
            onClick={() => {
              setError('');
              setSelected(null);
              setOpen(true);
            }}
          >
            Change layout
          </Button>
        )}
        {canEdit && version && (
          <IconButton
            icon="edit"
            label="Edit layout"
            className="secondary"
            onClick={() =>
              go(`/market/assignments/${occurrenceId}/edit-layout`)
            }
          />
        )}
      </div>
      {open && (
        <MarketDialog
          open
          title="Change layout"
          onClose={() => setOpen(false)}
          busy={pending}
          actions={
            selected && (
              <>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => change(selected, true)}
                >
                  {pending
                    ? 'Changing layout...'
                    : 'Erase map data and change layout'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setSelected(null)}
                >
                  Keep current layout
                </Button>
              </>
            )
          }
        >
          {error && (
            <p className="alert ui-alert ui-alert-error" role="alert">
              {error}
            </p>
          )}
          {selected ? (
            <div className="occurrence-layout-warning" role="alert">
              <p>
                Changing to{' '}
                {data.layouts?.find((l) => l.id === selected.layoutId)?.name ??
                  'this layout'}{' '}
                will erase all booth assignments, accepted rentals, and saved
                map details for this occurrence. This cannot be undone. Billing
                history will be kept.
              </p>
            </div>
          ) : (
            <div className="occurrence-layout-options">
              {!layouts.length && (
                <p>
                  No published layouts are available. Publish a layout to use it
                  for this occurrence.
                </p>
              )}
              {layouts.map(({ layout, version: preview }) => (
                <AnimatedDisclosure
                  key={layout.id}
                  title={layout.name}
                  action={
                    <Button
                      disabled={pending || preview.id === version?.id}
                      onClick={() => change(preview)}
                    >
                      {preview.id === version?.id
                        ? 'Current layout'
                        : 'Select layout'}
                    </Button>
                  }
                >
                  <div className="occurrence-layout-preview">
                    <LayoutPreview data={data} version={preview} />
                  </div>
                </AnimatedDisclosure>
              ))}
            </div>
          )}
        </MarketDialog>
      )}
    </>
  );
}
export function OccurrenceLayoutScreen({
  data,
  occurrenceId,
  run,
  canEdit,
}: {
  data: MarketOperationsData;
  occurrenceId: number;
  run: Run;
  canEdit: boolean;
}) {
  const [error, setError] = useState('');
  const plan = data.plans?.find((p) => p.occurrenceId === occurrenceId);
  const version = data.layoutVersions?.find(
    (v) => v.id === plan?.layoutVersionId,
  );
  return (
    <div className="layout-editor-screen">
      <div className="layout-screen-navigation">
        <RouteLink to={`/market/occurrences/${occurrenceId}`}>
          Back to occurrence
        </RouteLink>
        <p>
          Changes apply to this occurrence. Booth assignments and accepted
          rentals will be kept.
        </p>
      </div>
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      {version && plan ? (
        <LayoutEditor
          key={`${version.id}:${version.revision}`}
          version={version}
          data={data}
          run={run}
          canManage={canEdit}
          occurrenceId={occurrenceId}
          onSave={async (drawing) => {
            setError('');
            try {
              const result = await run({
                action: 'SAVE_LAYOUT',
                id: version.id,
                expectedRevision: version.revision,
                data: {
                  ...drawing,
                  occurrenceId,
                  expectedPlanRevision: plan.revision,
                },
              });
              if (!result)
                setError(
                  'The layout could not be saved. Your changes are still here.',
                );
            } catch {
              setError(
                'The layout could not be saved. Your changes are still here.',
              );
            }
          }}
        />
      ) : (
        <p>This occurrence does not have a layout.</p>
      )}
    </div>
  );
}
