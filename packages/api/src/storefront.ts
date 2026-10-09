import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

export type PublicProduct = NonNullable<shop.StorefrontProductQuery['product']>;
export type PublicCatalog = shop.VendorProductsQuery['products'];
export type PublicCart = NonNullable<shop.CartSnapshotQuery['activeOrder']>;
export type StorefrontAction =
  | 'communication-settings'
  | 'communication-change'
  | 'checkout-status'
  | 'checkout-contact'
  | 'checkout-pickup'
  | 'checkout-select-pickup'
  | 'checkout-begin'
  | 'checkout-finalize'
  | 'checkout-release'
  | 'purchase-account-link'
  | 'logout'
  | 'cart'
  | 'session'
  | 'login'
  | 'add'
  | 'adjust'
  | 'remove'
  | 'select-occurrence'
  | 'apply-coupon'
  | 'remove-coupon';
export type CartBootstrap = { cart: PublicCart | null; signedIn: boolean };

// Documents remain Shop-tagged, with no raw execution surface for public feature code.
export function createStorefrontApi(
  options: TransportOptions & { channelToken: string; vendorId: string },
) {
  const execute = transport('shop', options);
  const snapshot = () =>
    execute({ api: 'shop', document: shop.CartSnapshotDocument }, {});
  const session = () =>
    execute({ api: 'shop', document: shop.ShopCustomerSessionDocument }, {});
  async function directContext() {
    const result = await execute(
      { api: 'shop', document: shop.StorefrontSelectContextDocument },
      {},
    );
    const context = result.selectCommerceContext;
    if (
      context.kind !== 'DIRECT_VENDOR' ||
      context.vendorId !== options.vendorId ||
      context.marketId ||
      context.occurrenceId
    )
      throw new AppError('forbidden');
  }
  function accepted(result: { __typename?: string; errorCode?: string }) {
    if (result.__typename !== 'Order') {
      const code = result.errorCode;
      throw new AppError(
        'validation',
        [
          'INSUFFICIENT_STOCK_ERROR',
          'NEGATIVE_QUANTITY_ERROR',
          'ORDER_LIMIT_ERROR',
          'ORDER_MODIFICATION_ERROR',
          'ORDER_INTERCEPTOR_ERROR',
        ].includes(code ?? '')
          ? code
          : undefined,
      );
    }
  }
  return {
    catalog: (variables: shop.VendorProductsQueryVariables) =>
      execute(
        { api: 'shop', document: shop.VendorProductsDocument },
        variables,
      ),
    product: (slug: string) =>
      execute(
        { api: 'shop', document: shop.StorefrontProductDocument },
        { slug },
      ),
    async bootstrap(): Promise<CartBootstrap> {
      let user;
      try {
        user = await session();
      } catch (error) {
        // Native Shop me deliberately returns FORBIDDEN for anonymous requests.
        if (
          error instanceof AppError &&
          (error.kind === 'forbidden' || error.kind === 'authentication')
        )
          return { signedIn: false, cart: (await snapshot()).activeOrder };
        throw error;
      }
      if (!user.me)
        return { signedIn: false, cart: (await snapshot()).activeOrder };
      const order = await snapshot();
      return { signedIn: !!user.me, cart: order.activeOrder };
    },
    async login(username: string, password: string) {
      const result = await execute(
        { api: 'shop', document: shop.ShopLoginDocument },
        { username, password, rememberMe: false },
      );
      if (result.login.__typename !== 'CurrentUser')
        throw new AppError('authentication');
      return { signedIn: true };
    },
    async add(variantId: string, quantity: number) {
      await directContext();
      const result = await execute(
        { api: 'shop', document: shop.StorefrontAddDocument },
        { variantId, quantity },
      );
      accepted(result.addItemToOrder);
      return (await snapshot()).activeOrder;
    },
    async adjust(lineId: string, quantity: number) {
      await directContext();
      const result = await execute(
        { api: 'shop', document: shop.StorefrontAdjustDocument },
        { lineId, quantity },
      );
      accepted(result.adjustOrderLine);
      return (await snapshot()).activeOrder;
    },
    async remove(lineId: string) {
      await directContext();
      const result = await execute(
        { api: 'shop', document: shop.StorefrontRemoveDocument },
        { lineId },
      );
      accepted(result.removeOrderLine);
      return (await snapshot()).activeOrder;
    },
  };
}

export function cartMessage(error: { code?: string; kind?: string }) {
  if (error.code === 'NONEMPTY_CONTEXT_SWITCH_DENIED')
    return 'Your cart is for another occurrence. Remove the current items before switching occurrences.';
  if (error.code === 'INSUFFICIENT_STOCK_ERROR')
    return 'That quantity could not be added. Review the updated cart and try a smaller quantity.';
  if (error.code === 'ORDER_MODIFICATION_ERROR')
    return 'This cart cannot be edited in its current state.';
  if (
    error.code === 'ORDER_LIMIT_ERROR' ||
    error.code === 'NEGATIVE_QUANTITY_ERROR'
  )
    return 'That quantity was rejected. Enter a positive whole number.';
  if (error.kind === 'authentication' || error.kind === 'forbidden')
    return 'A verified customer sign-in is required to edit this cart.';
  if (error.kind === 'network' || error.kind === 'unavailable')
    return 'The Shop session is unavailable. Please try again.';
  return 'The Shop could not apply that change. Refresh the cart and try again.';
}
