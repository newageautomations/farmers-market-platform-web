import type { APIContext } from 'astro';
import { createLoyaltyApi, type LoyaltyWallet } from '@market/api';
import { accountBridge, isCentral } from './account';
import { loyaltyTransport } from './shop';
export function loyaltyApi(
  context: Pick<APIContext, 'locals' | 'request'>,
  headers?: Headers,
) {
  return createLoyaltyApi(loyaltyTransport(context, headers), 'shop');
}
export function customerLoyalty(
  context: APIContext & { response?: { headers: Headers } },
) {
  return isCentral(context.url)
    ? accountBridge<LoyaltyWallet[]>({
        action: 'customerLoyalty',
        central: context.cookies.get('platform-unified-account')?.value ?? '',
      })
    : loyaltyApi(context, context.response?.headers).my();
}
