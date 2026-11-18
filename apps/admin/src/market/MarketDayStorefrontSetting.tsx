import { useCallback, useState } from 'react';
import { Alert, Checkbox, Field, MarketMap, ErrorState } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import { SettingsPanel } from '../settings/SettingsPanel';
import type { MarketService } from './service';
import { useRead } from './common';
import { safeError } from '@market/api';

export function MarketDayStorefrontSetting({
  service,
  occurrenceId,
}: {
  service: MarketService;
  occurrenceId: number;
}) {
  const [preview, setPreview] = useState(false),
    [enabled, setEnabled] = useState<boolean>(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState<ReturnType<typeof safeError>>();
  const load = useCallback(
    () => service.marketDayStorefront!.setting(occurrenceId),
    [service, occurrenceId],
  );
  const state = useRead(
    `${service.readKey}:storefront-day:${occurrenceId}`,
    load,
    !!service.marketDayStorefront,
  );
  const data = state.data;
  if (!data) return state.error ? <ErrorState error={state.error} /> : null;
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: data.occurrence.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  return (
    <SettingsPanel
      icon="store"
      title="Market Day storefront"
      description="An optional homepage for this market date. Other shopping and account pages stay available."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(undefined);
          setSaved(false);
          try {
            await service.marketDayStorefront!.save(
              occurrenceId,
              enabled ?? data.enabled,
              data.revision,
            );
            setEnabled(undefined);
            setSaved(true);
            state.refresh();
          } catch (cause) {
            setError(safeError(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          id="market-day-storefront-enabled"
          label="Enable for this occurrence"
        >
          <Checkbox
            id="market-day-storefront-enabled"
            checked={enabled ?? data.enabled}
            disabled={!data.canWrite || busy}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </Field>
        <p>
          Starts at the scheduled start. Finish market, cancellation or
          disabling this setting ends visibility early. Reopening requires an
          explicit re-enable.
        </p>
        <p>
          Scheduled visibility: {format(data.occurrence.startsAt)} to{' '}
          {format(data.occurrence.cutoffAt)} ({data.occurrence.timezone}).
          Scheduled hours end at {format(data.occurrence.endsAt)}.
        </p>
        <div className="ui-actions">
          {data.canWrite && (
            <FarmstandButton type="submit" disabled={busy}>
              Save changes
            </FarmstandButton>
          )}
          <FarmstandButton
            type="button"
            variant="secondary"
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Close preview' : 'Preview Market Day'}
          </FarmstandButton>
        </div>
        {error && <ErrorState error={error} />}
        {saved && (
          <Alert severity="success" role="status">
            Market Day storefront setting saved.
          </Alert>
        )}
      </form>
      {preview && (
        <div>
          <Alert severity="info">
            Manager preview only. This does not enable the public homepage.
            Customers see their own pickups and followed vendors after signing
            in.
          </Alert>
          <h3>Market Day</h3>
          <p>{data.occurrence.venue}</p>
          <p>Scheduled hours end at {format(data.occurrence.endsAt)}.</p>
          {data.previewMap ? (
            <MarketMap
              definition={data.previewMap.definition}
              spaces={data.previewMap.spaces}
            />
          ) : (
            <p>
              No map is published. The vendor directory and customer pickups
              remain available.
            </p>
          )}
        </div>
      )}
    </SettingsPanel>
  );
}
