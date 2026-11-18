import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import type { PublicOccurrenceMap } from './market-operations';

export interface MarketDayOccurrence {
  id: number;
  startsAt: string;
  endsAt: string;
  cutoffAt: string;
  timezone: string;
  venue: string | null;
}
export interface MarketDayPublicState {
  serverNow: string;
  occurrences: MarketDayOccurrence[];
}
export interface MarketDaySetting {
  previewMap: PublicOccurrenceMap | null;
  enabled: boolean;
  revision: number;
  canWrite: boolean;
  occurrence: MarketDayOccurrence;
  serverNow: string;
}
export interface MarketDayPersonal {
  customerId: string;
  followedVendorIds: string[];
  pickups: Array<{
    orderId: string;
    reference: string;
    vendorId: string;
    vendorName: string;
    status: string;
    venue: string | null;
    instructions: string | null;
  }>;
}
export function createMarketDayStorefrontApi(
  options: TransportOptions,
  api: 'admin' | 'shop' = 'shop',
) {
  const execute = transport(api, options);
  const request = async <T>(
    field: string,
    input: Record<string, unknown>,
    mutation = false,
  ): Promise<T> => {
    const document = parse(
      `${mutation ? 'mutation' : 'query'} MarketDayStorefront($input: JSON!) { ${field}(input: $input) }`,
    ) as TypedDocumentNode<
      Record<string, T>,
      { input: Record<string, unknown> }
    >;
    return (await execute({ api, document }, { input }))[field]!;
  };
  return {
    state: () => request<MarketDayPublicState>('publicMarketDayState', {}),
    personal: (occurrenceId: number) =>
      request<MarketDayPersonal>('customerMarketDay', { occurrenceId }),
    setting: (occurrenceId: number) =>
      request<MarketDaySetting>('ownMarketDayStorefront', { occurrenceId }),
    save: (occurrenceId: number, enabled: boolean, expectedRevision: number) =>
      request<MarketDaySetting>(
        'setMarketDayStorefront',
        { occurrenceId, enabled, expectedRevision },
        true,
      ),
  };
}

/** Never choose one overlapping occurrence on the customer's behalf. */
export function selectMarketDay(
  state: MarketDayPublicState,
  selected: string | null,
) {
  return selected
    ? state.occurrences.find((item) => String(item.id) === selected)
    : state.occurrences.length === 1
      ? state.occurrences[0]
      : undefined;
}

/** Server-relative elapsed time survives sleep and tab suspension. */
export function marketDayRemaining(
  endsAt: string,
  serverNow: string,
  receivedAt: number,
  now = Date.now(),
) {
  return Math.max(
    0,
    Date.parse(endsAt) - (Date.parse(serverNow) + now - receivedAt),
  );
}
