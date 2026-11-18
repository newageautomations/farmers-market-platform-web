import { useCallback } from 'react';
import type {
  BusinessProfileImageApi,
  BusinessProfileImages,
} from '@market/api';
import { useRead } from './vendor/common';

const none: BusinessProfileImages = { markets: {}, vendors: {} };
const unique = (ids: readonly (string | number | undefined | null)[]) =>
  [...new Set(ids.filter((id) => id != null && id !== '').map(String))]
    .sort()
    .slice(0, 100);

/**
 * Profile pictures for the Markets and Vendors a table shows, read in one
 * batch. Pictures are decoration only: while loading, on failure, or without
 * the API, every row keeps its icon.
 */
export function useProfileImages(
  api: Pick<BusinessProfileImageApi, 'lookup'> | undefined,
  ids: {
    markets?: readonly (string | number | undefined | null)[];
    vendors?: readonly (string | number | undefined | null)[];
  },
) {
  const marketIds = unique(ids.markets ?? []).join(',');
  const vendorIds = unique(ids.vendors ?? []).join(',');
  const read = useCallback(
    () =>
      api!.lookup({
        marketIds: marketIds ? marketIds.split(',') : [],
        vendorIds: vendorIds ? vendorIds.split(',') : [],
      }),
    [api, marketIds, vendorIds],
  );
  const images = useRead(
    `profile-images:${marketIds}|${vendorIds}`,
    read,
    !!api && !!(marketIds || vendorIds),
    { retainPreviousData: true },
  );
  const data = images.data ?? none;
  return {
    market: (id: string | number | undefined | null) =>
      id == null ? null : (data.markets[String(id)] ?? null),
    vendor: (id: string | number | undefined | null) =>
      id == null ? null : (data.vendors[String(id)] ?? null),
  };
}
