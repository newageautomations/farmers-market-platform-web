import { AppError } from '@market/api';
import { usTimezones } from '@market/ui';
export { TimezoneField, usTimezones } from '@market/ui';
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
