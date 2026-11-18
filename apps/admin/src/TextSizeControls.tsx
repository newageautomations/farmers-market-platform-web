import { useId } from 'react';
import { Field, Input } from '@market/ui';
import type { StorefrontTextSizes } from '@market/theme/storefront';
/** Shared native range composition for website sizing, using the existing field/input contract. */
export function EditorRangeField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  valueText,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueText?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText ?? `${value}${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>
        {value}
        {unit}
      </output>
    </Field>
  );
}
/** Native range inputs composed with existing fields; no separate slider primitive exists. */
export function TextSizeControls({
  value,
  onChange,
  heading = true,
  paragraph = true,
}: {
  value?: StorefrontTextSizes[string];
  onChange: (value: StorefrontTextSizes[string]) => void;
  heading?: boolean;
  paragraph?: boolean;
}) {
  const id = useId();
  const sizes = value ?? { heading: 100, paragraph: 100 };
  return (
    <div className="storefront-text-size-controls">
      {(['heading', 'paragraph'] as const)
        .filter((key) => (key === 'heading' ? heading : paragraph))
        .map((key) => (
          <EditorRangeField
            key={key}
            id={`${id}-${key}`}
            label={`${key === 'heading' ? 'Heading' : 'Paragraph'} size`}
            min={75}
            max={key === 'heading' ? 200 : 150}
            step={5}
            value={sizes[key]}
            valueText={`${sizes[key]}% of theme size`}
            onChange={(size) => onChange({ ...sizes, [key]: size })}
          />
        ))}
    </div>
  );
}
