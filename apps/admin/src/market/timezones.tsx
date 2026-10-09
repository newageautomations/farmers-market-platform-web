import { useId } from 'react';
import { AppError } from '@market/api';
import { Field, Select } from '@market/ui';
export const usTimezones = [
  ['America/Los_Angeles', 'Pacific'],
  ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'],
  ['America/Chicago', 'Central'],
  ['America/New_York', 'Eastern'],
  ['America/Anchorage', 'Alaska'],
  ['Pacific/Honolulu', 'Hawaii'],
] as const;
export function TimezoneField({
  value = 'America/Chicago',
  name = 'timezone',
  label = 'Time zone',
}: {
  value?: string;
  name?: string;
  label?: string;
}) {
  const id = useId();
  return (
    <Field id={id} label={label}>
      <Select
        id={id}
        name={name}
        defaultValue={usTimezones.some(([zone]) => zone === value) ? value : ''}
        required
      >
        <option value="" disabled>
          Choose a US time zone
        </option>
        {usTimezones.map(([zone, title]) => (
          <option key={zone} value={zone}>
            {title}
          </option>
        ))}
      </Select>
    </Field>
  );
}
export function localParts(instant: string, timezone: string) {
  if (!instant) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
/** Enumerate possible offsets and reject missing or repeated DST wall times. */
export function localToInstant(date: string, time: string, timezone: string) {
  if (
    !usTimezones.some(([zone]) => zone === timezone) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new AppError('validation');
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 10) !== date
  )
    throw new AppError('validation');
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const sample = wall + delta,
      parts = localParts(new Date(sample).toISOString(), timezone);
    offsets.add(Date.parse(`${parts.date}T${parts.time}:00Z`) - sample);
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wall - offset).toISOString())
    .filter((instant) => {
      const parts = localParts(instant, timezone);
      return parts.date === date && parts.time === time;
    });
  if (candidates.length !== 1) throw new AppError('validation');
  return candidates[0]!;
}
