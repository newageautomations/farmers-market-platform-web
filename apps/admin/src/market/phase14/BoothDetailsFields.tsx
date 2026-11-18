import { SearchableMultiSelect, Select } from '@market/ui';
import type { MarketOperationsData, SpaceDetails } from '@market/api';
import { MinorPriceInput } from '../../PriceInput';
import { Control, Entry } from './common';

export const amenityOptions = [
  'ELECTRICITY',
  'WATER',
  'SHADE',
  'COVERED',
  'INDOOR',
  'VEHICLE',
  'FOOD_TRUCK',
];

/**
 * The booth details a manager edits: description, fee, currency, amenities,
 * preferred business and private notes. Shared by the layout editor
 * inspector and the booth dialog's Edit view; callers own saving. Amenities
 * use the approved SearchableMultiSelect (a dropdown of checkbox options)
 * instead of a permanently visible checkbox list.
 */
export function BoothDetailsFields({
  details: s,
  data,
  onChange,
}: {
  details: SpaceDetails;
  data: MarketOperationsData;
  onChange: (patch: Partial<SpaceDetails>) => void;
}) {
  return (
    <>
      <Entry
        label="Description"
        maxLength={2000}
        value={s.description}
        onChange={(v) => onChange({ description: v })}
      />
      <Control label="Booth fee">
        {(id) => (
          <MinorPriceInput
            id={id}
            currency={s.currency}
            valueMinor={s.feeMinor}
            onMinorChange={(feeMinor) =>
              onChange({ feeMinor: Math.min(feeMinor, 100000000) })
            }
          />
        )}
      </Control>
      <Entry
        label="Currency"
        maxLength={3}
        value={s.currency}
        onChange={(v) => onChange({ currency: v.toUpperCase() })}
      />
      <SearchableMultiSelect
        label="Physical amenities"
        placeholder="No amenities"
        value={s.amenities}
        onChange={(amenities) => onChange({ amenities })}
        options={amenityOptions.map((a) => ({
          value: a,
          label: a.toLowerCase().replaceAll('_', ' '),
        }))}
      />
      <Control label="Preferred business suggestion">
        {(id) => (
          <Select
            id={id}
            value={s.preferredDirectoryId ?? ''}
            onChange={(event) =>
              onChange({
                preferredDirectoryId: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          >
            <option value="">No preference</option>
            {data.directory?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.contact.businessName}
              </option>
            ))}
          </Select>
        )}
      </Control>
      <Entry
        label="Private manager notes"
        value={s.managerNotes}
        onChange={(v) => onChange({ managerNotes: v })}
      />
    </>
  );
}
