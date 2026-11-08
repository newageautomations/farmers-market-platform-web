import type { CategoryImage, VendorCategoryApi } from '@market/api';
import type { ReactNode } from 'react';
import { CategoryImageField } from '../../vendor/categories';

/** The Market image library (uploads plus saved images), as used by Rentals. */
export type LayoutMedia = Pick<VendorCategoryApi, 'images' | 'upload'>;

export interface LayoutPhoto {
  url: string;
  name: string;
}

/** Layout images must be absolute http(s) URLs to pass layout validation. */
export function layoutPhoto(image: CategoryImage | null): LayoutPhoto | null {
  if (!image?.preview) return null;
  let url: string;
  try {
    url = new URL(image.preview, window.location.origin).href;
  } catch {
    return null;
  }
  if (!/^https?:\/\//.test(url)) return null;
  return { url, name: image.name?.trim().slice(0, 200) || 'Image' };
}

/** Natural-aspect insertion size, longest side 240 layout pixels. */
export async function photoSize(url: string) {
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (longest > 0)
      return {
        width: Math.max(8, Math.round((image.naturalWidth * 240) / longest)),
        height: Math.max(8, Math.round((image.naturalHeight * 240) / longest)),
      };
  } catch {
    // Unreadable or still-processing images fall back to a 4:3 frame.
  }
  return { width: 240, height: 180 };
}

// Reuses the shared image library dialog (upload, My Images, enlarge) rather
// than a second picker. The editor only supplies its own trigger.
export function LayoutImagePicker({
  media,
  label,
  onPick,
  children,
}: {
  media: LayoutMedia;
  label: string;
  onPick: (photo: LayoutPhoto) => void;
  children: (open: () => void, disabled: boolean) => ReactNode;
}) {
  return (
    <div className="designer-picker">
      <CategoryImageField
        api={media}
        presentation="library"
        label={label}
        value={null}
        renderTrigger={children}
        onImageChange={(image) => {
          const photo = layoutPhoto(image);
          if (photo) onPick(photo);
        }}
      />
    </div>
  );
}
