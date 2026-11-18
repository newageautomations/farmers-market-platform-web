import {
  AppError,
  type CheckoutView,
  type MarketBootstrap,
  type PickupOption,
} from '@market/api';
import { shopCall } from '../components/shop-client';

/** Prepare the selected session cart through existing owned Shop operations only. */
export async function prepareMarketCheckout(
  storefrontId: string,
  orderId: string,
  methodIds?: string[],
): Promise<{ view: CheckoutView } | { pickupOptions: PickupOption[] }> {
  const { cart } = await shopCall<MarketBootstrap>(storefrontId, 'cart');
  if (!cart?.totalQuantity || cart.id !== orderId)
    throw new AppError('conflict');
  const stripe = await shopCall<boolean>(
    storefrontId,
    'stripe-checkout-enabled',
  );
  async function quote() {
    try {
      await shopCall(storefrontId, 'checkout-test-preorder-fee', {});
    } catch (error) {
      if (
        !(error instanceof AppError) ||
        error.code !== 'PREORDER_FEE_REQUOTE_REQUIRED'
      )
        throw error;
      // A changed session principal can invalidate an otherwise unchanged quote.
      // Clear only this explicitly stale, editable quote before rebuilding it.
      await shopCall(storefrontId, 'checkout-clear-test-preorder-fee', {});
      await shopCall(storefrontId, 'checkout-test-preorder-fee', {});
    }
  }
  if (stripe && cart.state === 'AddingItems') {
    if (methodIds)
      await shopCall(storefrontId, 'checkout-select-pickup', { methodIds });
    try {
      await quote();
    } catch (error) {
      if (
        !(error instanceof AppError) ||
        error.code !== 'VENDOR_PICKUP_COVERAGE_REQUIRED'
      )
        throw error;
      const options = await shopCall<PickupOption[]>(
        storefrontId,
        'checkout-pickup',
      );
      const groups = cart.groups.map((group) =>
        options.filter((option) => option.vendorId === group.vendorId),
      );
      const missing = cart.groups.filter(
        (_group, index) => !groups[index]!.length,
      );
      if (missing.length) {
        const unavailable = new AppError(
          'validation',
          'MARKET_VENDOR_PICKUP_UNAVAILABLE',
        );
        unavailable.message = `Pickup is not configured for ${missing.map((group) => group.vendorName).join(', ')}. The market must configure pickup before this order can continue.`;
        throw unavailable;
      }
      // Keep existing selections when quoting succeeds. Only choose automatically
      // when every vendor has exactly one authoritative pickup option.
      if (groups.some((options) => options.length !== 1))
        return { pickupOptions: groups.flat() };
      await shopCall(storefrontId, 'checkout-select-pickup', {
        methodIds: groups.map((options) => options[0]!.methodId),
      });
      await quote();
    }
  }
  const view = await shopCall<CheckoutView>(storefrontId, 'checkout-status', {
    orderId,
  });
  if (
    !view ||
    view.orderId !== orderId ||
    (stripe && cart.state === 'AddingItems' && !view.preorderFee)
  )
    throw new AppError('conflict');
  return { view };
}
