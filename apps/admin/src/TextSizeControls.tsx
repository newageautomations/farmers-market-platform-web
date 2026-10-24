import { useId } from 'react';
import { Field, Input } from '@market/ui';
import type { StorefrontTextSizes } from '@market/theme/storefront';
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
          <Field
            key={key}
            id={`${id}-${key}`}
            label={`${key === 'heading' ? 'Heading' : 'Paragraph'} size`}
          >
            <Input
              id={`${id}-${key}`}
              type="range"
              min={75}
              max={key === 'heading' ? 200 : 150}
              step={5}
              value={sizes[key]}
              aria-valuetext={`${sizes[key]}% of theme size`}
              onChange={(e) =>
                onChange({ ...sizes, [key]: Number(e.target.value) })
              }
            />
            <output htmlFor={`${id}-${key}`}>{sizes[key]}%</output>
          </Field>
        ))}
    </div>
  );
}
