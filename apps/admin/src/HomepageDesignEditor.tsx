import { SelectField } from '@market/ui';
import type { HomepageDesign } from '@market/theme/storefront';

/** Shared semantic controls; each homepage owns their visual interpretation. */
export function HomepageDesignEditor({
  value,
  onChange,
  id,
}: {
  value?: HomepageDesign;
  onChange: (value: HomepageDesign) => void;
  id: string;
}) {
  return (
    <>
      <SelectField
        id={`${id}-spacing`}
        label="Homepage section spacing"
        value={value?.spacing ?? 'balanced'}
        onChange={(e) =>
          onChange({
            ...value,
            spacing: e.target.value as HomepageDesign['spacing'],
          })
        }
      >
        <option value="compact">Compact</option>
        <option value="balanced">Balanced</option>
        <option value="spacious">Spacious</option>
      </SelectField>
      <SelectField
        id={`${id}-scale`}
        label="Homepage typography scale"
        value={value?.typographyScale ?? 'standard'}
        onChange={(e) =>
          onChange({
            ...value,
            typographyScale: e.target
              .value as HomepageDesign['typographyScale'],
          })
        }
      >
        <option value="standard">Standard</option>
        <option value="expressive">Expressive</option>
      </SelectField>
    </>
  );
}
