import { transport, type TransportOptions } from './transport';
import { VendorMarketDiscoveryDocument } from './generated/admin';

/** Calling vendor's advisory relationship with a discoverable market. Never an authorization check. */
export type MarketApplyState =
  | 'MEMBER'
  | 'MEMBERSHIP_PENDING'
  | 'APPLIED'
  | 'DRAFT'
  | 'NOT_YET_OPEN'
  | 'OPEN';
/** Allowlisted discovery projection returned by `vendorMarketDiscovery` (admin API). */
export interface DiscoverableMarket {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  website: string | null;
  applyUrl: string | null;
  nextMarket: { startsAt: string; timezone: string } | null;
  deadline: { closesAt: string; timezone: string } | null;
  /** Additive fields. Older servers omit them. */
  timezone?: string;
  applyState?: MarketApplyState;
  existingApplicationHref?: string | null;
  opensAt?: string | null;
}
export interface MarketCityOption {
  value: string;
  label: string;
}
export interface MarketDiscoveryApi {
  cities: () => Promise<MarketCityOption[]>;
  search: (input: {
    search: string;
    city: string;
    skip: number;
    take: number;
  }) => Promise<{ items: DiscoverableMarket[]; totalItems: number }>;
}
/** Vendor dashboard discovery over the existing admin transport and channel context. */
export function createMarketDiscoveryApi(
  options: TransportOptions,
): MarketDiscoveryApi {
  const admin = transport('admin', options);
  const read = async <T>(input: Record<string, unknown>) =>
    (
      await admin(
        { api: 'admin', document: VendorMarketDiscoveryDocument },
        { input },
      )
    ).vendorMarketDiscovery as T;
  return {
    cities: async () =>
      (await read<{ items: MarketCityOption[] }>({ mode: 'CITIES' })).items,
    search: ({ search, city, skip, take }) =>
      read({ mode: 'SEARCH', search: search.trim(), city, skip, take }),
  };
}
