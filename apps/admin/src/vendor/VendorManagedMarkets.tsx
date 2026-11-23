import '../market/market-occurrences.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OccurrenceCreationActions } from '../market/OccurrenceCreationActions';
import { useWizardDialogHeight, WizardProgress } from '../WizardProgress';
import {
  AppError,
  type MarketConfiguration,
  type Occurrence,
  type VendorManagedMarketsApi,
} from '@market/api';
import { Dialog, SelectField } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import {
  CommandForm,
  ReadState,
  SessionFields,
  TextField,
  sessionInput,
  text,
  useRead,
} from '../market/common';
import { localToInstant, TimezoneField } from '../market/timezones';
import { GenerateOccurrencesWizard } from '../market/GenerateOccurrencesWizard';
import { addDays, today } from '../market/occurrences-data';
import type { VendorService } from './service';

/** Vendor controller over the shared scheduling fields and recurrence wizard. */
export function VendorManagedMarkets({
  service,
  marketId,
  refresh = () => {},
}: {
  service: VendorService;
  marketId?: string;
  refresh?: () => void;
}) {
  const [mode, setMode] = useState<'single' | 'generate'>();
  return service.managedMarkets ? (
    <>
      <OccurrenceCreationActions
        onSingle={() => setMode('single')}
        onGenerate={() => setMode('generate')}
      />
      {mode &&
        createPortal(
          <ScheduleDialog
            api={service.managedMarkets}
            marketId={marketId}
            mode={mode}
            close={() => setMode(undefined)}
            onGenerated={refresh}
            done={() => {
              setMode(undefined);
              refresh();
            }}
          />,
          document.querySelector('.admin-dashboard') ?? document.body,
        )}
    </>
  ) : null;
}

const locationSteps = ['Market location'];
const generationSteps = [
  ...locationSteps,
  'Repeating schedules',
  'Date range',
  'Review & generate',
];
const singleSteps = [...locationSteps, 'Market date'];

function ScheduleDialog({
  api,
  marketId,
  mode,
  close,
  done,
  onGenerated,
}: {
  api: VendorManagedMarketsApi;
  marketId?: string;
  mode: 'single' | 'generate';
  close: () => void;
  done: () => void;
  onGenerated: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(marketId ?? '');
  const [market, setMarket] = useState<MarketConfiguration>();
  const [lastMarket, setLastMarket] = useState<MarketConfiguration>();
  const captureHeight = useWizardDialogHeight(root, market?.id ?? 'location');
  const previousMarket = useRef(market?.id);
  useEffect(() => {
    if (previousMarket.current !== market?.id)
      heading.current?.focus({ preventScroll: true });
    previousMarket.current = market?.id;
  }, [market?.id]);
  const read = useCallback(() => api.list(), [api]);
  const query = useRead('vendor-managed-markets', read);
  const [key] = useState(() => crypto.randomUUID());
  const locations =
    lastMarket && !query.data?.some((m) => m.id === lastMarket.id)
      ? [...(query.data ?? []), lastMarket]
      : (query.data ?? []);
  const chosen = locations.find((m) => m.id === selected);
  const adapter = useMemo(
    () => ({
      readKey: `vendor-managed:${market?.id}`,
      marketId: market?.id ?? '',
      saveSchedule: api.saveSchedule,
      deleteSchedule: api.deleteSchedule,
      generate: api.generate,
      occurrencePage: async (
        options: {
          from?: string | null;
          through?: string | null;
          take?: number | null;
          skip?: number | null;
        } = {},
      ) => {
        const items = await api.occurrences(
          market!.id,
          options.from!,
          options.through!,
        );
        const skip = options.skip ?? 0;
        return {
          items: items.slice(skip, skip + (options.take ?? 100)),
          totalItems: items.length,
        };
      },
    }),
    [api, market],
  );
  async function reload() {
    if (market) {
      const current = await api.configuration(market.id);
      setMarket(current);
      setLastMarket(current);
    }
  }
  function backToLocation() {
    captureHeight();
    setSelected(market!.id);
    setMarket(undefined);
  }
  const tomorrow = addDays(today(), 1);
  return (
    <Dialog
      open
      size="wide"
      className="farmstand-controls"
      title={
        mode === 'generate'
          ? 'Generate occurrences'
          : 'Create a single market date'
      }
      busy={busy}
      onClose={close}
    >
      <div ref={root}>
        {!market ? (
          <div className="reward-wizard generate-wizard">
            <WizardProgress
              steps={mode === 'generate' ? generationSteps : singleSteps}
              step={0}
              label={
                mode === 'generate'
                  ? 'Occurrence generation progress'
                  : 'Market date creation progress'
              }
            />
            <div className="reward-stage" key="location">
              <div className="reward-stage-heading">
                <h3 ref={heading} tabIndex={-1}>
                  Choose a market location
                </h3>
                <p>
                  Reuse a saved location or add one for your business. These
                  dates belong to your vendor only.
                </p>
              </div>
              <ReadState skeleton="spinner" {...query} retry={query.refresh} />
              {query.data && (
                <CommandForm
                  embedded
                  hideTitle
                  title="Market location"
                  submitLabel="Next"
                  onPendingChange={setBusy}
                  onDone={() => {}}
                  run={async (data) => {
                    const current = chosen
                      ? await api.configuration(chosen.id)
                      : await api.create({
                          key,
                          name: text(data, 'name'),
                          venue: text(data, 'venue'),
                          timezone: text(data, 'timezone'),
                          pickupInstructions: text(data, 'pickupInstructions'),
                        });
                    captureHeight();
                    setSelected(current.id);
                    setLastMarket(current);
                    setMarket(current);
                  }}
                >
                  <div className="generate-schedule-form">
                    <SelectField
                      label="Market"
                      required={false}
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="">New market</option>
                      {locations.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </SelectField>
                    {!chosen && (
                      <div className="form-grid">
                        <TextField
                          name="name"
                          label="Market name"
                          maxLength={200}
                        />
                        <TextField
                          name="venue"
                          label="Location/address"
                          maxLength={500}
                        />
                        <TimezoneField
                          name="timezone"
                          value="America/Chicago"
                        />
                        <TextField
                          name="pickupInstructions"
                          label="Pickup instructions"
                          required={false}
                          maxLength={2000}
                        />
                      </div>
                    )}
                    {chosen && (
                      <p className="reward-field-help">
                        {chosen.venue}
                        {' \u00b7 '}
                        {chosen.timezone}
                      </p>
                    )}
                  </div>
                </CommandForm>
              )}
            </div>
          </div>
        ) : mode === 'generate' ? (
          <GenerateOccurrencesWizard
            service={adapter}
            market={market}
            initialRange={{ from: today(), through: addDays(today(), 28) }}
            leadingSteps={locationSteps}
            onBack={backToLocation}
            onScheduleChanged={() => void reload()}
            onGenerated={onGenerated}
            onBusyChange={setBusy}
            onClose={close}
          />
        ) : (
          <div className="reward-wizard generate-wizard">
            <WizardProgress
              steps={singleSteps}
              step={1}
              label="Market date creation progress"
            />
            <div className="reward-stage" key="single-date">
              <div className="reward-stage-heading">
                <h3 ref={heading} tabIndex={-1}>
                  Choose the market date
                </h3>
                <p>
                  Create one future date for {market.name} with its own hours
                  and pickup directions.
                </p>
              </div>
              <CommandForm
                embedded
                hideTitle
                title={market.name}
                submitLabel="Create single date"
                onPendingChange={setBusy}
                onDone={done}
                secondaryAction={
                  <FarmstandButton
                    variant="secondary"
                    disabled={busy}
                    onClick={backToLocation}
                  >
                    Back
                  </FarmstandButton>
                }
                validate={(data) => {
                  if (!sessionInput(data).venue.trim())
                    throw new AppError('validation');
                }}
                run={(data) =>
                  api.manual(
                    market.id,
                    text(data, 'startDate'),
                    `vendor:${key}`,
                    sessionInput(data),
                  )
                }
              >
                <SessionFields
                  timezone={market.timezone}
                  value={{
                    startsAt: localToInstant(
                      tomorrow,
                      '09:00',
                      market.timezone,
                    ),
                    endsAt: localToInstant(tomorrow, '13:00', market.timezone),
                    venue: market.venue,
                    pickupInstructions: market.pickupInstructions,
                    preorderOverride: null,
                  }}
                />
              </CommandForm>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function EditVendorMarketDate({
  api,
  occurrence,
  refresh,
}: {
  api: VendorManagedMarketsApi;
  occurrence: Occurrence;
  refresh: () => void;
}) {
  const [open, setOpen] = useState<'edit' | 'cancel'>();
  const [busy, setBusy] = useState(false);
  const [observedAt] = useState(() => Date.now());
  const read = useCallback(async () => {
    const rows = await api.occurrences(
      occurrence.marketId,
      occurrence.startsAt,
      new Date(Date.parse(occurrence.startsAt) + 1).toISOString(),
    );
    const row = rows.find((row) => row.id === occurrence.id);
    if (!row) throw new AppError('validation');
    return row;
  }, [api, occurrence.id, occurrence.marketId, occurrence.startsAt]);
  const query = useRead(
    `private-date:${occurrence.id}:${occurrence.version}`,
    read,
    open === 'edit',
  );
  if (
    occurrence.status !== 'scheduled' ||
    Date.parse(occurrence.startsAt) <= observedAt
  )
    return null;
  return (
    <>
      <div className="ui-actions">
        <FarmstandButton onClick={() => setOpen('edit')}>
          Edit market date
        </FarmstandButton>
        <FarmstandButton
          variant="destructive"
          onClick={() => setOpen('cancel')}
        >
          Cancel market date
        </FarmstandButton>
      </div>
      {open && (
        <Dialog
          open
          title={open === 'edit' ? 'Edit market date' : 'Cancel market date'}
          busy={busy}
          onClose={() => setOpen(undefined)}
        >
          {open === 'edit' && (
            <ReadState skeleton="spinner" {...query} retry={query.refresh} />
          )}
          {(open === 'cancel' || query.data) && (
            <CommandForm
              title="Market date"
              hideTitle
              submitLabel={open === 'edit' ? 'Save date' : 'Cancel date'}
              danger={open === 'cancel'}
              onPendingChange={setBusy}
              onDone={() => {
                setOpen(undefined);
                refresh();
              }}
              validate={(data) => {
                if (open === 'edit' && !sessionInput(data).venue.trim())
                  throw new AppError('validation');
              }}
              run={(data) =>
                open === 'edit'
                  ? api.reviseOccurrence(
                      occurrence.id,
                      query.data!.version,
                      sessionInput(data),
                    )
                  : api.cancelOccurrence(occurrence.id, occurrence.version)
              }
            >
              {open === 'edit' ? (
                <SessionFields
                  timezone={occurrence.timezone}
                  value={query.data!}
                />
              ) : (
                <p>
                  This date will no longer accept preorders. Existing orders
                  retain their association and need your follow-up.
                </p>
              )}
            </CommandForm>
          )}
        </Dialog>
      )}
    </>
  );
}
