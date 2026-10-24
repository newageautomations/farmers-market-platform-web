import { useState } from 'react';
import { Button } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type { VendorCategoryApi } from '@market/api';
import { CategoryImageField } from './categories';

/** Reuses the existing authorized asset library, upload checks and image picker. */
export function ProductImages({
  api,
  ids = [],
}: {
  api: VendorCategoryApi;
  ids?: readonly string[] | null;
}) {
  const [slots, setSlots] = useState(() =>
    (ids ?? []).map((id, index) => ({ key: index, id })),
  );
  const [nextKey, setNextKey] = useState(slots.length);
  const [changed, setChanged] = useState(false);
  return (
    <details className={disclosureClassName()}>
      <summary>Product photographs</summary>
      <div className="stack ui-disclosure-content">
        {changed && (
          <input type="hidden" name="productAssetsLoaded" value="true" />
        )}
        <p>
          The first photograph is the featured image. Choose or upload up to 20
          photographs. Removing a photograph keeps the asset in your library.
        </p>
        {slots.map((slot, index) => (
          <div className="stack" key={slot.key}>
            <CategoryImageField
              api={api}
              value={slot.id}
              name="assetIds"
              label={`Photograph ${index + 1}`}
              onChange={() => setChanged(true)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSlots((v) => v.filter((s) => s.key !== slot.key));
                setChanged(true);
              }}
            >
              Remove photograph {index + 1}
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={slots.length >= 20}
          onClick={() => {
            setChanged(true);
            setSlots((v) => [...v, { key: nextKey, id: '' }]);
            setNextKey((v) => v + 1);
          }}
        >
          Add photograph
        </Button>
      </div>
    </details>
  );
}
