import { selectClassName } from './presentation';
import { useId } from 'react';

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
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        className={selectClassName()}
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
      </select>
    </div>
  );
}
