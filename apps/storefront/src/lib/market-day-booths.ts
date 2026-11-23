import type { MarketOccurrenceVendor, PublicOccurrenceMap } from '@market/api';

type Space = PublicOccurrenceMap['spaces'][number];

/** Category names read as written; a code such as "FRESH_PRODUCE" reads "Fresh produce". */
export function boothCategoryLabel(value?: string | null) {
  const text = (value ?? '').trim();
  if (!/^[A-Z0-9_]+$/.test(text)) return text;
  const words = text.replaceAll('_', ' ').toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : '';
}

const normal = (name: string) =>
  name.normalize('NFKC').replace(/[’']/g, "'").trim().toLowerCase();

/**
 * The map booth for one of today's vendors. The public map may omit vendor
 * ids, so the business name identifies the vendor when the id is missing.
 */
export function vendorBooth(
  vendor: Pick<MarketOccurrenceVendor, 'vendorId' | 'name'>,
  spaces: readonly Space[],
): Space | undefined {
  return (
    spaces.find(
      (s) =>
        !!s.vendor?.vendorId && String(s.vendor.vendorId) === vendor.vendorId,
    ) ??
    spaces.find(
      (s) =>
        !!s.vendor?.businessName &&
        normal(s.vendor.businessName) === normal(vendor.name),
    )
  );
}

/** Today's vendor for a map booth (the reverse of `vendorBooth`). */
export function boothVendor(
  space: Space,
  vendors: readonly MarketOccurrenceVendor[],
): MarketOccurrenceVendor | undefined {
  return vendors.find((v) => vendorBooth(v, [space]) === space);
}

/** Card details for each of today's vendors that has a booth on the map. */
export function vendorBoothDetails(
  vendors: readonly MarketOccurrenceVendor[],
  spaces: readonly Space[],
): Record<string, { elementId: string; label: string; category: string }> {
  return Object.fromEntries(
    vendors.flatMap((vendor) => {
      const space = vendorBooth(vendor, spaces);
      return space
        ? [
            [
              vendor.vendorId,
              {
                elementId: space.elementId,
                label: space.label,
                category: boothCategoryLabel(space.vendor?.category),
              },
            ],
          ]
        : [];
    }),
  );
}
