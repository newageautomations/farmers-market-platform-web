import type { APIContext } from 'astro';
import {
  createMarketLoyaltyApi,
  type MarketChallenge,
  type MarketRewardClaim,
} from '@market/api';
import { accountBridge, isCentral } from './account';
import { loyaltyTransport } from './shop';
export function marketChallengeApi(context: APIContext, headers?: Headers) {
  if (!isCentral(context.url))
    return createMarketLoyaltyApi(loyaltyTransport(context, headers), 'shop');
  const central = context.cookies.get('platform-unified-account')?.value ?? '';
  return {
    my: () =>
      accountBridge<MarketChallenge[]>({
        action: 'customerMarketChallenges',
        central,
      }),
    claim: (id: number) =>
      accountBridge<MarketRewardClaim>({
        action: 'claimCustomerMarketChallenge',
        central,
        id,
      }),
  };
}
