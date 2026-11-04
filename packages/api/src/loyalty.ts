import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';

export interface LoyaltyTerms {
  name: string;
  description?: string;
  imageAssetId?: string | null;
  /** Canonical preview resolved by the backend from the vendor-owned asset. */
  image?: string | null;
  kind: 'FIXED' | 'PERCENTAGE' | 'FREE_PRODUCT';
  points: number;
  value: number;
  maximum: number;
  minimum: number;
  variantIds: string[];
  quantity: number;
  startsAt: string | null;
  endsAt: string | null;
  limit: number | null;
}
export interface LoyaltyReward {
  id: number;
  versionId: number;
  status: string;
  terms: LoyaltyTerms;
  available?: boolean;
  redemptions?: number;
}
export interface LoyaltyRedemption {
  id: number;
  wallet_id?: number;
  version_id?: number;
  order_id: number;
  vendor_order_id?: number | null;
  terms: LoyaltyTerms;
  status: string;
  discount: number;
  created_at: string;
  customer?: string;
}
export interface LoyaltyWallet {
  id: number;
  vendor_id: number;
  name: string;
  enabled: boolean;
  inCart?: boolean;
  storefrontUrl: string | null;
  balance: { available: number; pending: number; reserved: number };
  rewards: LoyaltyReward[];
  history: Array<{
    id: string;
    event: string;
    available: string;
    pending: string;
    reserved: string;
    reason: string;
    order_id: number | null;
    created_at: string;
  }>;
  redemptions: LoyaltyRedemption[];
  activity?: LoyaltyActivity[];
}
export interface LoyaltyActivity {
  id: string;
  kind: 'PURCHASE' | 'REDEMPTION' | 'REFUND' | 'REWARD_RETURNED' | 'ADJUSTMENT';
  orderId: number | null;
  orderCode: string | null;
  createdAt: string;
  points: number;
  pending: number;
  status: string;
  items?: Array<{ name: string; quantity: number; eligible: number }>;
  terms?: LoyaltyTerms;
  discount?: number;
}
export interface LoyaltyRank {
  rank?: number;
  /** Customer identity, distinct from the loyalty wallet ID in `id`. */
  customerId?: string;
  id: number;
  customer: string;
  earned: string;
  available: string;
  orders: number;
  last_purchase: string | null;
}
export interface LoyaltyOverview {
  enabled: boolean;
  rewards: LoyaltyReward[];
  metrics: {
    outstanding: string;
    pending: string;
    issued: string;
    lifetime: string;
    customers: number;
    repeat: number;
    rewardOrders: number;
  };
  top: LoyaltyRank[];
  leaderboard: LoyaltyRank[];
  redemptions: LoyaltyRedemption[];
  trend: Array<{
    day: string;
    earned: string;
    redeemed: string;
    redemptions: number;
    customers: number;
  }>;
  skip: number;
  take: number;
}
export interface LoyaltyCheckout {
  /** Same-storefront BFF preference only; never authorizes application or spending. */
  preferredVersionId?: number;
  orderId: string | null;
  wallets: LoyaltyWallet[];
  redemptions: LoyaltyRedemption[];
}
export function createLoyaltyApi(
  options: TransportOptions,
  api: 'shop' | 'admin',
) {
  const run = transport(api, options);
  async function execute<T>(
    source: string,
    field: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const document = parse(source) as TypedDocumentNode<
      Record<string, T>,
      Record<string, unknown>
    >;
    return (await run({ api, document }, variables))[field]!;
  }
  return {
    my: () =>
      execute<LoyaltyWallet[]>('query MyLoyalty { myLoyalty }', 'myLoyalty'),
    checkout: () =>
      execute<LoyaltyCheckout>(
        'query LoyaltyCheckout { loyaltyCheckout }',
        'loyaltyCheckout',
      ),
    apply: (versionId: number, orderId?: string) =>
      execute<LoyaltyRedemption>(
        'mutation ApplyLoyalty($versionId:Int!,$orderId:ID){applyLoyaltyReward(versionId:$versionId,orderId:$orderId)}',
        'applyLoyaltyReward',
        { versionId, orderId },
      ),
    remove: (redemptionId: number, orderId?: string) =>
      execute<LoyaltyRedemption>(
        'mutation RemoveLoyalty($redemptionId:Int!,$orderId:ID){removeLoyaltyReward(redemptionId:$redemptionId,orderId:$orderId)}',
        'removeLoyaltyReward',
        { redemptionId, orderId },
      ),
    overview: (filter: Record<string, unknown> = {}) =>
      execute<LoyaltyOverview>(
        'query OwnLoyalty($filter:JSON){ownLoyalty(filter:$filter)}',
        'ownLoyalty',
        { filter },
      ),
    program: (enabled: boolean) =>
      execute<{ enabled: boolean }>(
        'mutation LoyaltyProgram($enabled:Boolean!){setOwnLoyaltyProgram(enabled:$enabled)}',
        'setOwnLoyaltyProgram',
        { enabled },
      ),
    save: (terms: LoyaltyTerms, status: string, id?: number) =>
      execute<LoyaltyReward>(
        'mutation SaveLoyaltyReward($terms:JSON!,$status:String,$id:Int){saveOwnLoyaltyReward(terms:$terms,status:$status,id:$id)}',
        'saveOwnLoyaltyReward',
        {
          terms: {
            name: terms.name,
            kind: terms.kind,
            points: terms.points,
            value: terms.value,
            maximum: terms.maximum,
            minimum: terms.minimum,
            variantIds: terms.variantIds,
            quantity: terms.quantity,
            startsAt: terms.startsAt,
            endsAt: terms.endsAt,
            limit: terms.limit,
            ...(terms.description ? { description: terms.description } : {}),
            ...(terms.imageAssetId !== undefined
              ? { imageAssetId: terms.imageAssetId }
              : {}),
          },
          status,
          id,
        },
      ),
  };
}
export type LoyaltyApi = ReturnType<typeof createLoyaltyApi>;
