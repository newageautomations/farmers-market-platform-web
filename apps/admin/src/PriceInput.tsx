import { useState, type ComponentProps } from 'react';
import { Input } from '@market/ui';
import './price-input.css';

/** Whole currency amount with two decimals, e.g. 1250 -> "12.50". */
export function minorToAmount(minor: number) {
  return (minor / 100).toFixed(2);
}
/** "12.5" -> 1250. Blank and partial entries ("", ".") are 0. */
export function amountToMinor(amount: string) {
  const [whole = '', fraction = ''] = amount.split('.');
  return Number(whole || 0) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}
function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat('en-US', { style: 'currency', currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency
    );
  } catch {
    return currency;
  }
}

/**
 * Price entry shared by product variants, booth fees and rental prices: a
 * currency symbol before the field, digits with up to two decimals while
 * typing, and the cents filled in on blur (5 -> 5.00). Composes the shared
 * `Input`; callers own the label and the stored value.
 */
export function PriceInput({
  value,
  onValueChange,
  currency = 'USD',
  maxLength = 11,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onValueChange: (value: string) => void;
  currency?: string;
}) {
  const symbol = currencySymbol(currency);
  return (
    <div
      className="product-price-input"
      style={{ ['--price-symbol-width' as string]: `${symbol.length}ch` }}
    >
      <span aria-hidden="true">{symbol}</span>
      <Input
        {...props}
        value={value}
        inputMode="decimal"
        pattern="[0-9]+([.][0-9]{0,2})?"
        maxLength={maxLength}
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (next.length <= maxLength && /^\d*(\.\d{0,2})?$/.test(next))
            onValueChange(next.startsWith('.') ? `0${next}` : next);
        }}
        onBlur={(event) => {
          if (value) {
            const [whole, fraction = ''] = value.split('.');
            onValueChange(`${whole || '0'}.${fraction.padEnd(2, '0')}`);
          }
          props.onBlur?.(event);
        }}
      />
    </div>
  );
}

/**
 * `PriceInput` for values stored in minor units (cents). Keeps the typed
 * text while editing so "12." is not reformatted mid-keystroke.
 */
export function MinorPriceInput({
  valueMinor,
  onMinorChange,
  ...props
}: Omit<ComponentProps<typeof PriceInput>, 'value' | 'onValueChange'> & {
  valueMinor: number;
  onMinorChange: (minor: number) => void;
}) {
  const [text, setText] = useState(() => minorToAmount(valueMinor));
  const shown =
    amountToMinor(text) === valueMinor ? text : minorToAmount(valueMinor);
  return (
    <PriceInput
      {...props}
      value={shown}
      onValueChange={(next) => {
        setText(next);
        onMinorChange(amountToMinor(next));
      }}
    />
  );
}
