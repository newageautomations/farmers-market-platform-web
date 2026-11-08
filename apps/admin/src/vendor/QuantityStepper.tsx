import { useState, type ComponentProps, type PointerEvent } from 'react';
import { Button, Input, UtilityIcon } from '@market/ui';
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
  // Pointer-down is cancelled to keep focus in the field, which can suppress
  // :active in some browsers, so the press effect is also tracked here.
  const [pressed, setPressed] = useState(0);
  const press = (delta: number) => ({
    'data-pressed': pressed === delta || undefined,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setPressed(delta);
    },
    onPointerUp: () => setPressed(0),
    onPointerLeave: () => setPressed(0),
    onPointerCancel: () => setPressed(0),
  });
  return (
    <div className="packing-quantity-stepper">
      <Button
        iconOnly
        variant="destructive"
        className="packing-step-button packing-step-decrease"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || Number(value) <= 0}
        {...press(-1)}
        onClick={() => onStep(-1)}
      >
        <UtilityIcon name="minus" />
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
        {...press(1)}
        onClick={() => onStep(1)}
      >
        <UtilityIcon name="plus" />
      </Button>
    </div>
  );
}
