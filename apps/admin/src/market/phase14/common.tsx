import { useId, type ReactNode } from 'react';
import { InfoTip } from '@market/ui';
export function Control({
  label,
  children,
  info,
}: {
  label: string;
  children: (id: string) => ReactNode;
  info?: string;
}) {
  const id = useId();
  return (
    <div className="ops-field">
      <div className="field-title">
        <label htmlFor={id}>{label}</label>
        {info && <InfoTip label={label} text={info} />}
      </div>
      {children(id)}
    </div>
  );
}
export function Entry({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min,
  max,
  step,
  info,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  info?: string;
}) {
  return (
    <Control label={label} info={info}>
      {(id) => (
        <input
          id={id}
          value={value}
          type={type}
          required={required}
          min={min}
          max={max}
          step={step}
          maxLength={type === 'text' ? 2000 : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Control>
  );
}
export function Check({
  label,
  checked,
  onChange,
  info,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  info?: string;
}) {
  const id = useId();
  return (
    <div className="ops-check">
      <label className="ops-check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {info && <InfoTip label={label} text={info} />}
    </div>
  );
}
export function moneyLabel(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(minor / 100);
}
