import { useCallback, useState } from 'react';
import { Badge, UtilityIcon } from '@market/ui';
import { FarmstandButton as Button } from '@market/ui/farmstand';
import type { VendorCategoryApi } from '@market/api';
import { CategoryImageField } from './categories';
import { useRead } from './common';

/** Reuses the authorized image library and upload controller for the add action. */
export function ProductImages({
  api,
  ids = [],
}: {
  api: VendorCategoryApi;
  ids?: readonly string[] | null;
}) {
  const [slots, setSlots] = useState(() =>
    (ids ?? []).map((id, index) => ({ key: index, id, preview: '' })),
  );
  const [nextKey, setNextKey] = useState(slots.length);
  const [changed, setChanged] = useState(false);
  const readImages = useCallback(() => api.images(), [api]);
  const images = useRead('product-photo-previews', readImages, !!ids?.length);
  function move(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    setSlots((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setChanged(true);
  }
  return (
    <div className="product-photos">
      {changed && (
        <input type="hidden" name="productAssetsLoaded" value="true" />
      )}
      <CategoryImageField
        api={api}
        presentation="library"
        label="Add photograph"
        renderTrigger={(open, disabled) => (
          <Button
            variant="secondary"
            className="product-photo-add"
            disabled={disabled || slots.length >= 20}
            aria-haspopup="dialog"
            onClick={open}
          >
            <UtilityIcon name="arrow-up" />
            <strong>Add photograph</strong>
            <span>Choose from your library or upload a PNG or JPEG.</span>
          </Button>
        )}
        onImageChange={(image) => {
          if (!image || slots.length >= 20) return;
          setSlots((previous) => [
            ...previous,
            { key: nextKey, id: image.id, preview: image.preview ?? '' },
          ]);
          setNextKey((previous) => previous + 1);
          setChanged(true);
        }}
      />
      <div className="product-photo-grid">
        {slots.map((slot, index) => (
          <div className="product-photo-slot" key={slot.key}>
            <div className="product-photo-preview">
              {slot.preview ||
              images.data?.find((image) => image.id === slot.id)?.preview ? (
                <img
                  src={
                    slot.preview ||
                    images.data?.find((image) => image.id === slot.id)?.preview
                  }
                  alt={`Product photograph ${index + 1}`}
                  width="160"
                  height="160"
                />
              ) : (
                <UtilityIcon name="arrow-up" />
              )}
              {index === 0 && (
                <Badge className="product-photo-featured">Main</Badge>
              )}
              <Button
                variant="destructive-outline"
                iconOnly
                size="compact"
                className="product-photo-remove"
                aria-label={`Remove photograph ${index + 1}`}
                onClick={() => {
                  setSlots((previous) =>
                    previous.filter((item) => item.key !== slot.key),
                  );
                  setChanged(true);
                }}
              >
                <UtilityIcon name="trash" />
              </Button>
              <div className="product-photo-order">
                <Button
                  variant="secondary"
                  iconOnly
                  size="compact"
                  aria-label={`Move photograph ${index + 1} left`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <UtilityIcon name="chevron-left" />
                </Button>
                <Button
                  variant="secondary"
                  iconOnly
                  size="compact"
                  aria-label={`Move photograph ${index + 1} right`}
                  disabled={index === slots.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <UtilityIcon name="chevron-right" />
                </Button>
              </div>
            </div>
            <input type="hidden" name="assetIds" value={slot.id} />
          </div>
        ))}
      </div>
      <p>
        The first photograph is featured. Up to 20 photographs. Removed photos
        stay in your library.
      </p>
    </div>
  );
}
