import type { APIContext } from 'astro';
import { requestCheckout, requestShop, requestMarketShop } from './shop';
import { restartCheckout } from './restart-checkout';
import { openCheckoutData } from './private-checkout-data';

/** Returning to the cart abandons card entry, never an authorized payment. */
export async function recoverEditableCart(
  context: APIContext,
  headers: Headers,
) {
  const recovery = openCheckoutData<{ orderId: string }>(
    context.cookies.get('checkout-recovery')?.value,
    'cart-recovery',
  );
  if (recovery) {
    await restartCheckout(context, headers, recovery.orderId);
    return;
  }
  const api =
    context.locals.storefront?.kind === 'MARKET'
      ? requestMarketShop(context, headers)
      : requestShop(context, headers);
  const cart = (await api.bootstrap()).cart;
  if (!cart || cart.state === 'AddingItems') return;
  const checkout = requestCheckout(context, headers);
  let payment = await checkout.stripeStatus(cart.id);
  if (payment?.state === 'SETUP_REQUIRED')
    payment = await checkout.stripeCancel(payment.groupId);
  if (
    payment &&
    [
      'CANCELED',
      'DECLINED',
      'AUTHORIZATION_FAILED',
      'CAPTURE_FAILED',
      'COMPENSATION_COMPLETED',
    ].includes(payment.state)
  )
    await restartCheckout(context, headers, cart.id);
}
