import { Input } from '@market/ui';
import { useId, type ReactNode } from 'react';
import { PhoneInput, InfoTip } from '@market/ui';
export function Control({
  label,
  children,
  info,
  className = '',
}: {
  label: string;
  children: (id: string) => ReactNode;
  info?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={['ops-field', className].filter(Boolean).join(' ')}>
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
  maxLength,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  info?: string;
}) {
  if (type === 'tel')
    return (
      <PhoneInput
        label={label}
        value={String(value)}
        required={required}
        onChange={onChange}
      />
    );
  return (
    <Control label={label} info={info}>
      {(id) => (
        <Input
          id={id}
          value={value}
          type={type}
          required={required}
          min={min}
          max={max}
          step={step}
          maxLength={
            maxLength ??
            (type === 'email'
              ? 254
              : type === 'text'
                ? /description|notes|instructions|payment note/i.test(label)
                  ? 5000
                  : /reason/i.test(label)
                    ? 2000
                    : /url|website/i.test(label)
                      ? 2048
                      : 200
                : undefined)
          }
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
        <Input
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
