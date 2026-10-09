import { useState } from 'react';
import { AppError, type MarketConfiguration } from '@market/api';
import type { MarketService } from './service';
import {
  calendarDate,
  Choice,
  CommandForm,
  integer,
  text,
  TextField,
  Weekdays,
} from './common';

export function recurrenceInput(data: FormData) {
  const weekdays = data
    .getAll('weekdays')
    .map((value) => integer(value, { zero: true }));
  const frequency = text(data, 'frequency') || 'weekly';
  const weekInterval = frequency === 'biweekly' ? 2 : 1;
  const monthWeeks =
    frequency === 'monthly'
      ? data.getAll('monthWeeks').map((value) => integer(value))
      : [];
  const effectiveFrom = calendarDate(text(data, 'effectiveFrom'));
  const effectiveUntil = text(data, 'effectiveUntil')
    ? calendarDate(text(data, 'effectiveUntil'))
    : null;
  const startTime = text(data, 'startTime'),
    endTime = text(data, 'endTime'),
    endDayOffset = integer(data.get('endDayOffset'), { zero: true });
  if (
    !['weekly', 'biweekly', 'monthly'].includes(frequency) ||
    !weekdays.length ||
    weekdays.some((value) => value > 6) ||
    endDayOffset > 1 ||
    (frequency === 'monthly' &&
      (!monthWeeks.length || monthWeeks.some((n) => n > 5))) ||
    (effectiveUntil && effectiveUntil < effectiveFrom) ||
    ![startTime, endTime].every((time) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    ) ||
    (!endDayOffset && startTime >= endTime)
  )
    throw new AppError('validation');
  return {
    frequency: frequency === 'monthly' ? 'monthly' : 'weekly',
    weekInterval,
    monthWeeks,
    weekdays,
    effectiveFrom,
    effectiveUntil,
    startTime,
    endTime,
    endDayOffset,
  };
}
export function RecurrenceFields({ market }: { market: MarketConfiguration }) {
  const recurrence = market.recurrence;
  const [frequency, setFrequency] = useState(
    recurrence?.frequency === 'monthly'
      ? 'monthly'
      : recurrence?.weekInterval === 2
        ? 'biweekly'
        : 'weekly',
  );
  return (
    <>
      <label className="field">
        Repeat
        <select
          name="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="weekly">Every week</option>
          <option value="biweekly">Every other week</option>
          <option value="monthly">Selected weeks each month</option>
        </select>
      </label>
      <Weekdays values={recurrence?.weekdays ?? [6]} />
      {frequency === 'monthly' && (
        <fieldset className="weekday-options">
          <legend>Which occurrence of each weekday?</legend>
          {['First', 'Second', 'Third', 'Fourth', 'Fifth'].map(
            (label, index) => (
              <label key={label}>
                <input
                  type="checkbox"
                  name="monthWeeks"
                  value={index + 1}
                  defaultChecked={(recurrence?.monthWeeks ?? [2, 4]).includes(
                    index + 1,
                  )}
                />
                {label}
              </label>
            ),
          )}
        </fieldset>
      )}
      <p className="field-help">
        {frequency === 'biweekly'
          ? 'Every other week starts with the week containing the first effective date, with weeks beginning on Monday.'
          : frequency === 'monthly'
            ? 'For example, choose Saturday and Second and Fourth to hold markets on the second and fourth Saturdays of each month.'
            : 'Markets are held on each selected weekday.'}
      </p>
      <div className="form-grid">
        <TextField
          name="startTime"
          label="Market starts at"
          type="time"
          value={recurrence?.startTime ?? '09:00'}
        />
        <TextField
          name="endTime"
          label="Market ends at"
          type="time"
          value={recurrence?.endTime ?? '14:00'}
        />
        <Choice
          name="endDayOffset"
          label="Market ends on"
          value={String(recurrence?.endDayOffset ?? 0)}
          choices={['0', '1']}
          labels={{ 0: 'The same day', 1: 'The following day' }}
        />
        <TextField
          name="effectiveFrom"
          label="First effective date"
          type="date"
          value={
            recurrence?.effectiveFrom ?? new Date().toISOString().slice(0, 10)
          }
        />
        <TextField
          name="effectiveUntil"
          label="Last effective date (optional)"
          type="date"
          value={recurrence?.effectiveUntil ?? ''}
          required={false}
        />
      </div>
      <p>
        Times use the market's saved time zone. Saving a rule leaves existing
        market dates unchanged.
      </p>
    </>
  );
}
export function ScheduleForm({
  service,
  market,
  refresh,
}: {
  service: MarketService;
  market: MarketConfiguration;
  refresh: () => void;
}) {
  return (
    <>
      <CommandForm
        key={`schedule:${market.version}`}
        title="Repeating market schedule"
        onDone={refresh}
        submitLabel="Save schedule"
        validate={(data) => {
          recurrenceInput(data);
        }}
        run={(data) =>
          service.recurrence(market.id, market.version, recurrenceInput(data))
        }
      >
        <RecurrenceFields market={market} />
      </CommandForm>
      {market.recurrence && (
        <CommandForm
          title="Stop repeating schedule"
          onDone={refresh}
          submitLabel="Remove schedule"
          run={() => service.recurrence(market.id, market.version, null)}
          confirm="Remove this repeating schedule? Existing market dates will stay in place."
        >
          <p>
            Remove the rule when you want to create market dates individually.
          </p>
        </CommandForm>
      )}
    </>
  );
}
