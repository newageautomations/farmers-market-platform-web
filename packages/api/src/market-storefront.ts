import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

export type PublicMarketOccurrence = shop.MarketPublicOccurrenceFieldsFragment;
export type MarketCatalog =
  shop.MarketStorefrontCatalogQuery['marketOccurrenceCatalog'];
export type MarketItem = shop.MarketPublicItemFragment;
export type MarketCart = NonNullable<
  shop.MarketActiveCartSnapshotQuery['marketActiveCart']
>;
export type MarketBootstrap = { signedIn: boolean; cart: MarketCart | null };
export type MarketCatalogOptions = shop.OccurrenceCatalogOptions;

export function createMarketStorefrontApi(
  options: TransportOptions & { channelToken: string; marketId: string },
) {
  const execute = transport('shop', options);
  const snapshot = async () =>
    (
      await execute(
        { api: 'shop', document: shop.MarketActiveCartSnapshotDocument },
        {},
      )
    ).marketActiveCart;
  async function bootstrap(): Promise<MarketBootstrap> {
    try {
      const session = await execute(
        { api: 'shop', document: shop.ShopCustomerSessionDocument },
        {},
      );
      if (!session.me) return { signedIn: false, cart: await snapshot() };
    } catch (error) {
      if (
        error instanceof AppError &&
        ['forbidden', 'authentication'].includes(error.kind)
      )
        return { signedIn: false, cart: await snapshot() };
      throw error;
    }
    return { signedIn: true, cart: await snapshot() };
  }
  async function select(occurrenceId: string) {
    const cart = (await bootstrap()).cart;
    if (cart?.totalQuantity && cart.occurrence.id !== occurrenceId)
      throw new AppError('conflict', 'NONEMPTY_CONTEXT_SWITCH_DENIED');
    const { selectCommerceContext: context } = await execute(
      { api: 'shop', document: shop.MarketSelectContextDocument },
      { occurrenceId },
    );
    if (
      context.kind !== 'MARKET_OCCURRENCE' ||
      context.marketId !== options.marketId ||
      context.occurrenceId !== occurrenceId
    )
      throw new AppError('forbidden');
    return snapshot();
  }
  function accepted(result: { __typename?: string; errorCode?: string }) {
    if (result.__typename !== 'Order') throw new AppError('validation');
  }
  return {
    occurrences: (
      variables: shop.MarketStorefrontOccurrencesQueryVariables = {},
    ) =>
      execute(
        { api: 'shop', document: shop.MarketStorefrontOccurrencesDocument },
        variables,
      ),
    occurrence: async (id: string) =>
      (
        await execute(
          { api: 'shop', document: shop.MarketStorefrontOccurrenceDocument },
          { id },
        )
      ).marketStorefrontOccurrence,
    catalog: async (
      occurrenceId: string,
      catalogOptions: MarketCatalogOptions,
    ) =>
      (
        await execute(
          { api: 'shop', document: shop.MarketStorefrontCatalogDocument },
          { occurrenceId, options: catalogOptions },
        )
      ).marketOccurrenceCatalog,
    item: async (occurrenceId: string, variantId: string) => {
      const catalog = (
        await execute(
          { api: 'shop', document: shop.MarketStorefrontCatalogDocument },
          {
            occurrenceId,
            options: { variantIds: [variantId], skip: 0, take: 1 },
          },
        )
      ).marketOccurrenceCatalog;
      return catalog.items.find((item) => item.variantId === variantId) ?? null;
    },
    bootstrap,
    select,
    async login(username: string, password: string) {
      const result = await execute(
        { api: 'shop', document: shop.ShopLoginDocument },
        { username, password, rememberMe: false },
      );
      if (result.login.__typename !== 'CurrentUser')
        throw new AppError('authentication');
      return { signedIn: true };
    },
    async add(occurrenceId: string, variantId: string, quantity: number) {
      await select(occurrenceId);
      accepted(
        (
          await execute(
            { api: 'shop', document: shop.StorefrontAddDocument },
            { variantId, quantity },
          )
        ).addItemToOrder,
      );
      return snapshot();
    },
    async adjust(lineId: string, quantity: number) {
      accepted(
        (
          await execute(
            { api: 'shop', document: shop.StorefrontAdjustDocument },
            { lineId, quantity },
          )
        ).adjustOrderLine,
      );
      return snapshot();
    },
    async remove(lineId: string) {
      accepted(
        (
          await execute(
            { api: 'shop', document: shop.StorefrontRemoveDocument },
            { lineId },
          )
        ).removeOrderLine,
      );
      return snapshot();
    },
    async applyCoupon(code: string) {
      accepted(
        (
          await execute(
            { api: 'shop', document: shop.MarketApplyCouponDocument },
            { code },
          )
        ).applyCouponCode,
      );
      return snapshot();
    },
    async removeCoupon(code: string) {
      await execute(
        { api: 'shop', document: shop.MarketRemoveCouponDocument },
        { code },
      );
      return snapshot();
    },
  };
}
