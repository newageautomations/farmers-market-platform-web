import type { ComponentProps } from 'react';
import { Button, Input } from '@market/ui';
import './quantity-stepper.css';

/** Packing's existing presentation, with draft/commit policy owned by each caller. */
export function QuantityStepper({
  label,
  value,
  max,
  disabled,
  onStep,
  ...inputProps
}: Omit<ComponentProps<typeof Input>, 'value' | 'max'> & {
  label: string;
  value: string;
  max: number;
  onStep: (delta: number) => void;
}) {
  return (
    <div className="packing-quantity-stepper">
      <Button
        iconOnly
        variant="destructive"
        className="packing-step-button packing-step-decrease"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || Number(value) <= 0}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => onStep(-1)}
      >
        -
      </Button>
      <Input
        {...inputProps}
        aria-label={label}
        type="number"
        min={0}
        max={max}
        step={1}
        required
        value={value}
        disabled={disabled}
      />
      <Button
        iconOnly
        className="packing-step-button packing-step-increase"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || Number(value) >= max}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => onStep(1)}
      >
        +
      </Button>
    </div>
  );
}
