import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  safeError,
  type AppError,
  type MarketConfiguration,
  type MarketSchedule,
} from '@market/api';
import {
  Alert,
  Badge,
  Card,
  Checkbox,
  ErrorState,
  Field,
  Input,
  UtilityIcon,
} from '@market/ui';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import { useWizardDialogHeight, WizardProgress } from '../WizardProgress';
import { RecurrenceFields, scheduleInput } from './schedule';
import type { MarketService } from './service';
import { calendarDate, CommandForm, ReadState, useRead } from './common';
import {
  addDays,
  expectedDates,
  readableDate,
  readOccurrencesInRange,
  recurrenceSummary,
  today,
  type OccurrenceRange,
} from './occurrences-data';

const steps = ['Repeating schedules', 'Date range', 'Review & generate'];
const presets = [
  { weeks: 4, label: 'Next 4 weeks' },
  { weeks: 8, label: 'Next 8 weeks' },
  { weeks: 12, label: 'Next 12 weeks' },
];
type Outcome = { kind: 'creating' } | { kind: 'created'; count: number };
/** Long enough for the Creating state to read before the checkmark. */
const MIN_CREATING_MS = 900;
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
/** Expected dates listed per schedule before "and N more". */
const PREVIEW = 8;

/**
 * Generate occurrences as a staged dialog, following the loyalty reward
 * wizard presentation. A Market may keep several repeating schedules, each
 * with its own address; they are created, edited and deleted here through the
 * existing versioned CommandForm, and generation uses the chosen ones. No
 * shared wizard supplies this workflow.
 */
export function GenerateOccurrencesWizard({
  service,
  market,
  initialRange,
  onScheduleChanged,
  onGenerated,
  onBusyChange,
  onClose,
}: {
  service: MarketService;
  market: MarketConfiguration;
  /** Inclusive dates offered as the default generation range. */
  initialRange: OccurrenceRange;
  onScheduleChanged: () => void;
  onGenerated: () => void;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const running = useRef(false);
  const schedules = market.schedules;
  const [step, setStep] = useState(0);
  /** The schedule id being edited, `new` for a new schedule, or none. */
  const [editor, setEditor] = useState<string | undefined>(
    schedules.length ? undefined : 'new',
  );
  const [deleting, setDeleting] = useState<string>();
  const [saved, setSaved] = useState('');
  const [selected, setSelected] = useState(() => schedules.map((s) => s.id));
  const [range, setRange] = useState(initialRange);
  const [rangeError, setRangeError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const captureHeight = useWizardDialogHeight(
    root,
    `${step}:${editor}:${deleting}:${schedules.length}:${!!outcome}`,
  );
  const previous = useRef(`${step}:${!!outcome}`);
  useEffect(() => {
    const current = `${step}:${!!outcome}`;
    if (previous.current !== current)
      heading.current?.focus({ preventScroll: true });
    previous.current = current;
  }, [step, outcome]);
  // A saved or deleted schedule arrives as a new configuration: close the
  // editor, select a newly created schedule and drop deleted ones.
  const [known, setKnown] = useState({
    version: market.version,
    ids: schedules.map((s) => s.id),
  });
  if (known.version !== market.version) {
    const ids = schedules.map((s) => s.id);
    setKnown({ version: market.version, ids });
    setSelected((current) => [
      ...current.filter((s) => ids.includes(s)),
      ...ids.filter((s) => !known.ids.includes(s)),
    ]);
    setEditor(ids.length ? undefined : 'new');
    setDeleting(undefined);
  }
  const chosen = schedules.filter((s) => selected.includes(s.id));
  const editing =
    editor && editor !== 'new'
      ? schedules.find((s) => s.id === editor)
      : undefined;
  const active = market.status === 'active';

  const existingRead = useCallback(
    () =>
      readOccurrencesInRange(service, {
        from: range.from,
        through: addDays(range.through, 1),
      }),
    [service, range.from, range.through],
  );
  const existing = useRead(
    `${service.readKey}:generate-existing:${range.from}:${range.through}`,
    existingRead,
    step === 2 && !outcome,
  );
  /** A date already exists when a scheduled date at that address exists. */
  const scheduled = new Set(
    existing.data?.items
      .filter((o) => o.status === 'scheduled')
      .map((o) => `${o.scheduleDate}|${o.venue.trim()}`),
  );
  const previews =
    step === 2
      ? chosen.map((schedule) => ({
          schedule,
          dates: expectedDates(
            schedule,
            range.from < today() ? today() : range.from,
            range.through,
          ),
        }))
      : [];
  const expected = previews.reduce((n, p) => n + p.dates.length, 0);
  const fresh = previews.reduce(
    (n, p) =>
      n +
      p.dates.filter((d) => !scheduled.has(`${d}|${p.schedule.venue.trim()}`))
        .length,
    0,
  );

  function move(next: number) {
    captureHeight();
    setStep(next);
  }
  function openEditor(value: string | undefined) {
    captureHeight();
    setSaved('');
    setDeleting(undefined);
    setEditor(value);
  }
  function checkRange() {
    try {
      calendarDate(range.from);
      calendarDate(range.through);
    } catch {
      return 'Choose a start and end date.';
    }
    if (range.through < range.from)
      return 'The end date must be on or after the start date.';
    if (range.from < addDays(today(), -1))
      return 'Generation cannot start in the past. Choose today or a later date.';
    if (
      Date.parse(`${range.through}T00:00:00Z`) -
        Date.parse(`${range.from}T00:00:00Z`) >
      365 * 86400000
    )
      return 'Choose a range of one year or less.';
    return '';
  }
  function next() {
    if (step === 1) {
      const problem = checkRange();
      setRangeError(problem);
      if (problem) return;
    }
    move(step + 1);
  }
  async function generate() {
    if (running.current || uncertain) return;
    running.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    captureHeight();
    setOutcome({ kind: 'creating' });
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches;
    try {
      const [rows] = await Promise.all([
        service.generate(
          service.marketId,
          range.from,
          range.through,
          chosen.map((s) => s.id),
        ),
        reduced ? undefined : wait(MIN_CREATING_MS),
      ]);
      setOutcome({ kind: 'created', count: rows.length });
      onGenerated();
    } catch (cause) {
      const safe = safeError(cause);
      captureHeight();
      setOutcome(undefined);
      setError(safe);
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(safe.kind))
        setUncertain(true);
    } finally {
      running.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  if (outcome)
    return (
      <div className="reward-wizard reward-published" ref={root}>
        <div role="status" aria-live="polite">
          {outcome.kind === 'creating' ? (
            <span className="generate-creating-ring" aria-hidden="true" />
          ) : (
            <span className="reward-published-check" aria-hidden="true">
              <UtilityIcon name="check" />
            </span>
          )}
          <h3 ref={heading} tabIndex={-1}>
            {outcome.kind === 'creating'
              ? 'Creating market dates'
              : 'Market dates created'}
          </h3>
          <p>
            {outcome.kind === 'creating'
              ? `Creating dates from ${readableDate(range.from)} to ${readableDate(range.through)}…`
              : `${outcome.count} market ${outcome.count === 1 ? 'date matches' : 'dates match'} ${readableDate(range.from)} to ${readableDate(range.through)}, including any that already existed.`}
          </p>
        </div>
        {outcome.kind === 'created' && (
          <FarmstandButton onClick={onClose}>Done</FarmstandButton>
        )}
      </div>
    );

  return (
    <div className="reward-wizard generate-wizard" ref={root}>
      <WizardProgress
        steps={steps}
        step={step}
        label="Occurrence generation progress"
      />
      <div className="reward-stage" key={step}>
        <div className="reward-stage-heading">
          <h3 ref={heading} tabIndex={-1}>
            {
              [
                'Choose repeating schedules',
                'Choose the dates to generate',
                'Review and generate',
              ][step]
            }
          </h3>
          <p>
            {
              [
                `Each schedule has its own days, hours and address. Select the ones to create dates from. Times use the market time zone (${market.timezone}).`,
                'Choose the first and last calendar dates to fill. Both dates are included.',
                'Check the expected dates before creating them. Existing dates are kept and never duplicated.',
              ][step]
            }
          </p>
        </div>
        {!active && (
          <Alert severity="warning">
            This market is suspended. Generation requires an active market;
            reactivate it in Settings first.
          </Alert>
        )}
        {step === 0 &&
          (editor ? (
            <div className="generate-schedule-form">
              <h4>{editing ? 'Edit schedule' : 'New schedule'}</h4>
              {!schedules.length && (
                <p className="reward-field-help">
                  This market has no repeating schedule yet. Save one to create
                  dates automatically.
                </p>
              )}
              <CommandForm
                key={`schedule:${editor}:${market.version}`}
                embedded
                hideTitle
                title="Repeating market schedule"
                submitLabel="Save schedule"
                onPendingChange={onBusyChange}
                onDone={() => {
                  setSaved(
                    editing
                      ? 'Schedule updated.'
                      : 'Schedule added and selected.',
                  );
                  onScheduleChanged();
                }}
                validate={(data) => {
                  scheduleInput(data, editing?.id);
                }}
                run={(data) =>
                  service.saveSchedule(
                    market.id,
                    market.version,
                    scheduleInput(data, editing?.id),
                  )
                }
                secondaryAction={
                  schedules.length ? (
                    <FarmstandButton
                      type="button"
                      variant="secondary"
                      onClick={() => openEditor(undefined)}
                    >
                      Discard changes
                    </FarmstandButton>
                  ) : undefined
                }
              >
                <RecurrenceFields
                  value={editing}
                  venue={editing?.venue ?? market.venue}
                />
              </CommandForm>
            </div>
          ) : (
            <div className="generate-schedule">
              {saved && (
                <Alert severity="success" role="status">
                  {saved}
                </Alert>
              )}
              <ul
                className="generate-schedule-list"
                aria-label="Repeating schedules"
              >
                {schedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    selected={selected.includes(schedule.id)}
                    onSelect={(on) =>
                      setSelected((current) =>
                        on
                          ? [...current, schedule.id]
                          : current.filter((s) => s !== schedule.id),
                      )
                    }
                    onEdit={() => openEditor(schedule.id)}
                    onDelete={() => {
                      captureHeight();
                      setSaved('');
                      setDeleting(schedule.id);
                    }}
                    confirmDelete={
                      deleting === schedule.id && (
                        <CommandForm
                          danger
                          embedded
                          hideTitle
                          title="Delete schedule"
                          submitLabel="Delete schedule"
                          onPendingChange={onBusyChange}
                          onDone={() => {
                            setSaved('Schedule deleted.');
                            onScheduleChanged();
                          }}
                          run={() =>
                            service.deleteSchedule(
                              market.id,
                              market.version,
                              schedule.id,
                            )
                          }
                          secondaryAction={
                            <FarmstandButton
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                captureHeight();
                                setDeleting(undefined);
                              }}
                            >
                              Keep schedule
                            </FarmstandButton>
                          }
                        >
                          <p>
                            Delete this schedule? Market dates it already
                            created stay in place.
                          </p>
                        </CommandForm>
                      )
                    }
                  />
                ))}
              </ul>
              <div>
                <FarmstandButton
                  variant="secondary"
                  onClick={() => openEditor('new')}
                >
                  <FarmstandIcon name="plus" />
                  New schedule
                </FarmstandButton>
              </div>
            </div>
          ))}
        {step === 1 && (
          <div className="generate-range">
            <div className="reward-details-grid">
              <Field
                id={`${id}-from`}
                label="Create dates starting on"
                error={rangeError || undefined}
              >
                <Input
                  id={`${id}-from`}
                  type="date"
                  required
                  min={today()}
                  value={range.from}
                  aria-invalid={!!rangeError}
                  onChange={(e) => {
                    setRangeError('');
                    setRange((r) => ({ ...r, from: e.target.value }));
                  }}
                />
              </Field>
              <Field id={`${id}-through`} label="Create dates through">
                <Input
                  id={`${id}-through`}
                  type="date"
                  required
                  min={range.from || today()}
                  value={range.through}
                  onChange={(e) => {
                    setRangeError('');
                    setRange((r) => ({ ...r, through: e.target.value }));
                  }}
                />
              </Field>
            </div>
            <div
              className="generate-presets"
              role="group"
              aria-label="Quick ranges"
            >
              {presets.map((preset) => (
                <FarmstandButton
                  key={preset.weeks}
                  variant="secondary"
                  size="compact"
                  aria-pressed={
                    range.from === today() &&
                    range.through === addDays(today(), preset.weeks * 7 - 1)
                  }
                  onClick={() => {
                    setRangeError('');
                    setRange({
                      from: today(),
                      through: addDays(today(), preset.weeks * 7 - 1),
                    });
                  }}
                >
                  {preset.label}
                </FarmstandButton>
              ))}
            </div>
            <p className="reward-field-help">
              Dates use the market time zone ({market.timezone}). Generation is
              limited to the platform's scheduling horizon, so very distant
              dates may be rejected.
            </p>
          </div>
        )}
        {step === 2 && (
          <div className="generate-review">
            <Card spacing="contained" className="reward-review-card">
              <dl className="reward-review-facts">
                <div>
                  <dt>Starting on</dt>
                  <dd>{readableDate(range.from, true)}</dd>
                </div>
                <div>
                  <dt>Through</dt>
                  <dd>{readableDate(range.through, true)}</dd>
                </div>
              </dl>
              <dl className="reward-review-facts">
                <div>
                  <dt>Schedules</dt>
                  <dd>{chosen.length}</dd>
                </div>
                <div>
                  <dt>Expected dates</dt>
                  <dd>
                    {existing.data ? `${expected} (${fresh} new)` : expected}
                  </dd>
                </div>
              </dl>
            </Card>
            <ReadState {...existing} retry={existing.refresh} />
            {previews.map(({ schedule, dates }) => (
              <section
                key={schedule.id}
                className="generate-dates"
                aria-labelledby={`${id}-${schedule.id}`}
              >
                <h4 id={`${id}-${schedule.id}`}>
                  {recurrenceSummary(schedule).pattern}
                  <small>
                    <FarmstandIcon name="map-pin" />
                    {schedule.venue}
                  </small>
                </h4>
                {dates.length ? (
                  <ul>
                    {dates.slice(0, PREVIEW).map((day) => (
                      <li key={day}>
                        <span>{readableDate(day, true)}</span>
                        {existing.data &&
                          (scheduled.has(`${day}|${schedule.venue.trim()}`) ? (
                            <Badge tone="neutral">Already scheduled</Badge>
                          ) : (
                            <Badge tone="success">New</Badge>
                          ))}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="reward-field-help">
                    This schedule has no market days in this range.
                  </p>
                )}
                {dates.length > PREVIEW && (
                  <p className="reward-field-help">
                    And {dates.length - PREVIEW} more.
                  </p>
                )}
              </section>
            ))}
            <p className="reward-field-help">
              Calculated from the saved schedules. Dates whose start time has
              already passed are skipped, and the final list is confirmed when
              generation finishes.
            </p>
            {error && <ErrorState error={error} />}
            {uncertain && (
              <Alert severity="warning">
                We could not confirm whether generation started. Close this
                window and check the occurrence list before trying again.
              </Alert>
            )}
          </div>
        )}
      </div>
      <div className="reward-wizard-actions">
        <FarmstandButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setError(null);
            if (step > 0) move(step - 1);
            else onClose();
          }}
        >
          <FarmstandIcon name="arrow-right" />
          {step > 0 ? 'Back' : 'Cancel'}
        </FarmstandButton>
        <div>
          {step < 2 ? (
            <FarmstandButton
              type="button"
              disabled={
                step === 0 &&
                (!chosen.length || !!editor || !!deleting || !active)
              }
              onClick={next}
            >
              Next
              <FarmstandIcon name="arrow-right" />
            </FarmstandButton>
          ) : (
            <FarmstandButton
              type="button"
              loading={busy}
              disabled={uncertain || !active || !chosen.length || !expected}
              onClick={() => void generate()}
            >
              <UtilityIcon name="check" />
              Generate occurrences
            </FarmstandButton>
          )}
        </div>
      </div>
    </div>
  );
}

/** One saved schedule: include toggle, summary, address and actions. */
function ScheduleCard({
  schedule,
  selected,
  onSelect,
  onEdit,
  onDelete,
  confirmDelete,
}: {
  schedule: MarketSchedule;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** The delete confirmation, shown in place of the actions while open. */
  confirmDelete: ReactNode;
}) {
  const id = useId();
  const summary = recurrenceSummary(schedule);
  return (
    <li>
      <Card
        spacing="contained"
        className="generate-schedule-card"
        data-selected={selected}
      >
        <Checkbox
          id={`${id}-include`}
          checked={selected}
          aria-label={`Create dates from ${summary.pattern} at ${schedule.venue}`}
          onChange={(e) => onSelect(e.target.checked)}
        />
        <label className="generate-schedule-summary" htmlFor={`${id}-include`}>
          <strong>{summary.pattern}</strong>
          <span>{summary.time}</span>
          <span>{summary.effective}</span>
          <span className="generate-schedule-venue">
            <FarmstandIcon name="map-pin" />
            {schedule.venue}
          </span>
        </label>
        {confirmDelete ? (
          <div className="generate-remove">{confirmDelete}</div>
        ) : (
          <div className="generate-schedule-actions">
            <FarmstandButton
              variant="secondary"
              size="compact"
              onClick={onEdit}
            >
              <UtilityIcon name="edit" />
              Edit
            </FarmstandButton>
            <FarmstandButton
              variant="destructive-outline"
              size="compact"
              onClick={onDelete}
            >
              <UtilityIcon name="trash" />
              Delete
            </FarmstandButton>
          </div>
        )}
      </Card>
    </li>
  );
}
