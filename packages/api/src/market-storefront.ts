import type { StorefrontTaxonomy } from './storefront-taxonomy';
import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { PublicProduct } from './storefront';

export type PublicMarketOccurrence = shop.MarketPublicOccurrenceFieldsFragment;
export type MarketCatalog = Omit<
  shop.MarketStorefrontCatalogQuery['marketOccurrenceCatalog'],
  'taxonomy'
> & { taxonomy: StorefrontTaxonomy };
export type MarketItem = shop.MarketPublicItemFragment;
export type MarketCart = NonNullable<
  shop.MarketActiveCartSnapshotQuery['marketActiveCart']
>;
export type MarketBootstrap = { signedIn: boolean; cart: MarketCart | null };
export type MarketCatalogOptions = shop.OccurrenceCatalogOptions;
/** Confirmed vendors for one public market date (public facts only). */
export interface MarketOccurrenceVendor {
  vendorId: string;
  name: string;
  image: string | null;
  storefrontUrl: string | null;
  offeringCount: number;
}
const MarketOccurrenceVendorsDocument = parse(
  'query MarketOccurrenceVendors($occurrenceId: ID!) { marketOccurrenceVendors(occurrenceId: $occurrenceId) { vendorId name image storefrontUrl offeringCount } }',
) as TypedDocumentNode<
  { marketOccurrenceVendors: MarketOccurrenceVendor[] },
  { occurrenceId: string }
>;

// Native, channel-scoped Shop read. Call only after occurrence eligibility is checked.
const MarketProductDocument = parse(`
  query MarketStorefrontProduct($id: ID!) {
    product(id: $id) {
      id name slug description productInformation
      featuredAsset { id preview width height }
      assets { id preview width height }
      facetValues { id name facet { id name code } }
      optionGroups { id name options { id name } }
      variants {
        id name sku priceWithTax currencyCode
        featuredAsset { id preview width height }
        assets { id preview width height }
        options { id name groupId }
        catalogDetails { slug description productInformation assets { id preview width height } }
      }
    }
  }
`) as TypedDocumentNode<{ product: PublicProduct | null }, { id: string }>;

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
  const occurrence = async (id: string) =>
    (
      await execute(
        { api: 'shop', document: shop.MarketStorefrontOccurrenceDocument },
        { id },
      )
    ).marketStorefrontOccurrence;
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
  async function cartForOccurrence(occurrenceId: string) {
    const cart = (await bootstrap()).cart;
    if (cart?.totalQuantity && cart.occurrence.id !== occurrenceId)
      throw new AppError('conflict', 'NONEMPTY_CONTEXT_SWITCH_DENIED');
    return cart;
  }
  async function select(occurrenceId: string) {
    await cartForOccurrence(occurrenceId);
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
    if (result.__typename !== 'Order')
      throw new AppError('validation', result.errorCode);
  }
  return {
    occurrences: (
      variables: shop.MarketStorefrontOccurrencesQueryVariables = {},
    ) =>
      execute(
        { api: 'shop', document: shop.MarketStorefrontOccurrencesDocument },
        variables,
      ),
    occurrence,
    catalog: async (
      occurrenceId: string,
      catalogOptions: MarketCatalogOptions,
    ) =>
      (
        await execute(
          { api: 'shop', document: shop.MarketStorefrontCatalogDocument },
          { occurrenceId, options: catalogOptions },
        )
      ).marketOccurrenceCatalog as MarketCatalog,
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
    /** Advisory stock facts for at most 20 variants; add-time checks stay authoritative. */
    availability: async (occurrenceId: string, variantIds: string[]) =>
      (
        await execute(
          { api: 'shop', document: shop.MarketOccurrenceAvailabilityDocument },
          { occurrenceId, variantIds },
        )
      ).marketOccurrenceAvailability,
    vendors: async (occurrenceId: string) =>
      (
        await execute(
          { api: 'shop', document: MarketOccurrenceVendorsDocument },
          { occurrenceId },
        )
      ).marketOccurrenceVendors,
    product: async (id: string) =>
      (await execute({ api: 'shop', document: MarketProductDocument }, { id }))
        .product,
    bootstrap,
    async chooseOccurrence(occurrenceId: string) {
      const cart = await cartForOccurrence(occurrenceId);
      if (!(await occurrence(occurrenceId))) throw new AppError('not-found');
      return cart?.totalQuantity ? cart : null;
    },
    select,
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
