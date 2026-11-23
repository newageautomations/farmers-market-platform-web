import type { APIContext } from 'astro';
import { AppError } from '@market/api';
import { requestCheckout, requestMarketShop } from './shop';

export async function readCheckoutStatus(
  context: Pick<APIContext, 'locals' | 'request'>,
  headers: Headers,
  orderId?: string,
) {
  const checkout = requestCheckout(context, headers);
  try {
    return await checkout.status(orderId);
  } catch (error) {
    if (
      context.locals.storefront?.kind !== 'MARKET' ||
      !(error instanceof AppError) ||
      error.code !== 'PREORDER_FEE_REQUOTE_REQUIRED'
    )
      throw error;

    const { cart } = await requestMarketShop(context, headers).bootstrap();
    if (
      !cart?.totalQuantity ||
      cart.state !== 'AddingItems' ||
      cart.id !== orderId
    )
      throw error;

    // Vendure checks ownership, editability and payment state again under its order lock.
    await checkout.clearTestPreorderFee();
    return checkout.status(cart.id);
  }
}
