import { SelectField, Input } from '@market/ui';
import { useState } from 'react';
import {
  AppError,
  type MarketConfiguration,
  type MarketScheduleInput,
} from '@market/api';
import {
  calendarDate,
  Choice,
  integer,
  text,
  TextField,
  Weekdays,
} from './common';

type RecurrenceRule = NonNullable<MarketConfiguration['recurrence']>;

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
/** A schedule's rule plus its required address, for saveSchedule. */
export function scheduleInput(
  data: FormData,
  id?: string | null,
): MarketScheduleInput {
  const venue = text(data, 'venue').trim();
  if (!venue || venue.length > 500) throw new AppError('validation');
  return { ...recurrenceInput(data), id: id ?? null, venue };
}
/** Fields for one repeating schedule; `venue` adds its address field. */
export function RecurrenceFields({
  value,
  venue,
}: {
  value?: RecurrenceRule | null;
  venue?: string;
}) {
  const recurrence = value;
  const [frequency, setFrequency] = useState(
    recurrence?.frequency === 'monthly'
      ? 'monthly'
      : recurrence?.weekInterval === 2
        ? 'biweekly'
        : 'weekly',
  );
  return (
    <>
      {venue !== undefined && (
        <TextField
          name="venue"
          label="Market address"
          info="Every date this schedule creates is held at this address."
          value={venue}
          maxLength={500}
        />
      )}
      <SelectField
        name="frequency"
        label="Repeat"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
      >
        <option value="weekly">Every week</option>
        <option value="biweekly">Every other week</option>
        <option value="monthly">Selected weeks each month</option>
      </SelectField>
      <Weekdays values={recurrence?.weekdays ?? [6]} />
      {frequency === 'monthly' && (
        <fieldset className="weekday-options">
          <legend>Which occurrence of each weekday?</legend>
          {['First', 'Second', 'Third', 'Fourth', 'Fifth'].map(
            (label, index) => (
              <label key={label}>
                <Input
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
