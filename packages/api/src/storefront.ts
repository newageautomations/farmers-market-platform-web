import { createStorefrontTaxonomyApi } from './storefront-taxonomy';
import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

type ShopProduct = NonNullable<shop.StorefrontProductQuery['product']>;
type ShopVariant = ShopProduct['variants'][number];
export type PublicProduct = Omit<ShopProduct, 'variants'> & {
  variants: ReadonlyArray<
    Omit<ShopVariant, 'catalogDetails'> &
      Partial<Pick<ShopVariant, 'catalogDetails'>>
  >;
};
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
  | 'product-availability'
  | 'apply-coupon'
  | 'remove-coupon';
export type CartBootstrap = { cart: PublicCart | null; signedIn: boolean };
export type VendorPreorderOccurrence = Omit<
  shop.VendorPreorderOccurrencesQuery['vendorPreorderOccurrences'][number],
  'pickupInstructions'
> & { pickupInstructions?: string | null };
export type VendorPreorderAvailability =
  shop.VendorPreorderAvailabilityQuery['vendorPreorderAvailability'];

export type VendorMarketAppearance =
  shop.VendorMarketAppearancesQuery['vendorMarketAppearances'][number];
// Documents remain Shop-tagged, with no raw execution surface for public feature code.
export function createStorefrontApi(
  options: TransportOptions & { channelToken: string; vendorId: string },
) {
  const execute = transport('shop', options);
  const snapshot = () =>
    execute({ api: 'shop', document: shop.CartSnapshotDocument }, {});
  const session = () =>
    execute({ api: 'shop', document: shop.ShopCustomerSessionDocument }, {});
  const occurrences = async () =>
    (
      await execute(
        { api: 'shop', document: shop.VendorPreorderOccurrencesDocument },
        {},
      )
    ).vendorPreorderOccurrences;
  const availability = async (occurrenceId: string, variantIds: string[]) =>
    (
      await execute(
        { api: 'shop', document: shop.VendorPreorderAvailabilityDocument },
        { occurrenceId, variantIds },
      )
    ).vendorPreorderAvailability;
  async function select(occurrenceId: string) {
    const occurrence = (await occurrences()).find((o) => o.id === occurrenceId);
    if (!occurrence)
      throw new AppError('validation', 'PREORDER_OCCURRENCE_REQUIRED');
    const current = (await snapshot()).activeOrder;
    if (current?.lines.length) {
      const cart = (
        await execute(
          { api: 'shop', document: shop.MarketActiveCartSnapshotDocument },
          {},
        )
      ).marketActiveCart;
      if (!cart || cart.occurrence.id !== occurrenceId)
        throw new AppError('conflict', 'NONEMPTY_CONTEXT_SWITCH_DENIED');
    }
    const { selectCommerceContext: context } = await execute(
      { api: 'shop', document: shop.MarketSelectContextDocument },
      { occurrenceId },
    );
    if (
      context.kind !== 'MARKET_OCCURRENCE' ||
      context.marketId !== occurrence.marketId ||
      context.occurrenceId !== occurrenceId
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
    taxonomy: createStorefrontTaxonomyApi(options),
    appearances: async () =>
      (
        await execute(
          { api: 'shop', document: shop.VendorMarketAppearancesDocument },
          {},
        )
      ).vendorMarketAppearances,
    occurrences,
    availability,
    select,
    marketCart: async () =>
      (
        await execute(
          { api: 'shop', document: shop.MarketActiveCartSnapshotDocument },
          {},
        )
      ).marketActiveCart,
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
    async add(variantId: string, quantity: number, occurrenceId?: string) {
      if (!occurrenceId)
        throw new AppError('validation', 'PREORDER_OCCURRENCE_REQUIRED');
      const status = (await availability(occurrenceId, [variantId])).find(
        (v) => v.variantId === variantId,
      );
      if (!status?.available)
        throw new AppError('validation', 'PREORDER_UNAVAILABLE');
      const result = await execute(
        { api: 'shop', document: shop.VendorPreorderAddDocument },
        { occurrenceId, variantId, quantity },
      );
      accepted(result.addVendorPreorderItem);
      return (await snapshot()).activeOrder;
    },
    async adjust(lineId: string, quantity: number) {
      const result = await execute(
        { api: 'shop', document: shop.StorefrontAdjustDocument },
        { lineId, quantity },
      );
      accepted(result.adjustOrderLine);
      return (await snapshot()).activeOrder;
    },
    async remove(lineId: string) {
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
  if (error.code === 'PREORDER_OCCURRENCE_REQUIRED')
    return 'Choose an upcoming market on the Shop page before adding products.';
  if (
    error.code === 'PREORDER_UNAVAILABLE' ||
    error.code === 'ORDER_INTERCEPTOR_ERROR'
  )
    return 'This product is no longer available for that quantity at this market. Refresh the Shop page to check availability.';
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
    return 'This cart is unavailable in the current storefront. Refresh and try again.';
  if (error.kind === 'network' || error.kind === 'unavailable')
    return 'The Shop session is unavailable. Please try again.';
  return 'The Shop could not apply that change. Refresh the cart and try again.';
}
