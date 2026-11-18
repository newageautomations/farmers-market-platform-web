import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
export type CheckoutView = shop.CheckoutViewFragment;
export type StripeCheckoutStatus = shop.StripeCheckoutFragment;
export type CheckoutPaymentCoverage = NonNullable<CheckoutView['paymentGroup']>;
export type VendorPaymentObligation =
  CheckoutPaymentCoverage['obligations'][number];
export type PickupOption =
  shop.CheckoutPickupQuery['availableOwnedPickup'][number];
export type CustomerPurchase = shop.CustomerPurchaseFragment;
export type CheckoutContact = shop.CheckoutContactMutationVariables['input'];
export function createCheckoutApi(
  options: TransportOptions & { channelToken: string },
) {
  const execute = transport('shop', options);
  return {
    images: async (code: string) =>
      (
        await execute(
          { api: 'shop', document: shop.CheckoutProductImagesDocument },
          { code },
        )
      ).orderByCode?.lines ?? [],
    stripeEnabled: async () =>
      (
        await execute(
          { api: 'shop', document: shop.StripeCheckoutEnabledDocument },
          {},
        )
      ).stripeCheckoutEnabled,
    stripePrepare: async () =>
      (
        await execute(
          { api: 'shop', document: shop.PrepareStripeCheckoutDocument },
          {},
        )
      ).prepareStripeCheckout,
    stripeStart: async (consent: string) =>
      (
        await execute(
          { api: 'shop', document: shop.StartStripeCheckoutDocument },
          { consent },
        )
      ).startStripeCheckout,
    stripeAdvance: async (groupId: string) =>
      (
        await execute(
          { api: 'shop', document: shop.AdvanceStripeCheckoutDocument },
          { groupId },
        )
      ).advanceStripeCheckout,
    stripeCancel: async (groupId: string) =>
      (
        await execute(
          { api: 'shop', document: shop.CancelStripeCheckoutDocument },
          { groupId },
        )
      ).cancelStripeCheckout,
    stripeStatus: async (orderId: string) =>
      (
        await execute(
          { api: 'shop', document: shop.StripeCheckoutStatusDocument },
          { orderId },
        )
      ).stripeCheckoutStatus,
    accountContexts: async () =>
      (
        await execute(
          { api: 'shop', document: shop.PlatformShopAccountContextsDocument },
          {},
        )
      )
        .platformAccountContexts as import('./market-operations').PlatformAccountContexts,
    clearTestPreorderFee: async () =>
      (
        await execute(
          { api: 'shop', document: shop.ClearTestPreorderFeeQuoteDocument },
          {},
        )
      ).clearTestPreorderFeeQuote,
    freezeTestPreorderFee: async () =>
      (
        await execute(
          { api: 'shop', document: shop.FreezeTestPreorderFeeQuoteDocument },
          {},
        )
      ).freezeTestPreorderFeeQuote,
    status: async (orderId?: string) =>
      (
        await execute(
          { api: 'shop', document: shop.CheckoutStatusDocument },
          { orderId },
        )
      ).currentCheckoutStatus,
    contact: async (input: CheckoutContact) =>
      (
        await execute(
          { api: 'shop', document: shop.CheckoutContactDocument },
          { input },
        )
      ).setCheckoutContact,
    pickup: async () =>
      (
        await execute(
          { api: 'shop', document: shop.CheckoutPickupDocument },
          {},
        )
      ).availableOwnedPickup,
    selectPickup: (methodIds: string[]) =>
      execute(
        { api: 'shop', document: shop.CheckoutSelectPickupDocument },
        { methodIds },
      ),
    begin: async (mode: string) =>
      mode === 'LOCAL'
        ? (
            await execute(
              { api: 'shop', document: shop.CheckoutBeginLocalDocument },
              {},
            )
          ).beginLocalCheckout
        : (
            await execute(
              { api: 'shop', document: shop.CheckoutBeginProviderDocument },
              {},
            )
          ).beginProviderCheckout,
    finalize: async (mode: string, attemptId: string) =>
      mode === 'LOCAL'
        ? (
            await execute(
              { api: 'shop', document: shop.CheckoutFinalizeLocalDocument },
              { attemptId },
            )
          ).finalizeLocalCheckout
        : (
            await execute(
              { api: 'shop', document: shop.CheckoutFinalizeProviderDocument },
              { attemptId },
            )
          ).finalizeProviderCheckout,
    release: async (mode: string, attemptId: string) =>
      mode === 'LOCAL'
        ? (
            await execute(
              { api: 'shop', document: shop.CheckoutReleaseLocalDocument },
              { attemptId },
            )
          ).releaseLocalCheckout
        : (
            await execute(
              { api: 'shop', document: shop.CheckoutReleaseProviderDocument },
              { attemptId },
            )
          ).releaseProviderCheckout,
    purchaseLink: async (orderId: string, origin: string) =>
      (
        await execute(
          { api: 'shop', document: shop.PurchaseAccountLinkDocument },
          { orderId, origin },
        )
      ).requestPurchaseAccountLink,
    handoff: (code: string, origin: string, correlation: string) =>
      execute(
        { api: 'shop', document: shop.CustomerHandoffDocument },
        { code, origin, correlation },
      ),
    profile: async () =>
      (
        await execute(
          { api: 'shop', document: shop.AccountProfileDocument },
          {},
        )
      ).customerAccountProfile,
    purchases: async (skip = 0, take = 10) =>
      (
        await execute(
          { api: 'shop', document: shop.AccountPurchasesDocument },
          { options: { skip, take } },
        )
      ).myPurchases,
    purchase: async (orderId: string) =>
      (
        await execute(
          { api: 'shop', document: shop.AccountPurchaseDocument },
          { orderId },
        )
      ).myPurchase,
    logout: (everywhere = true) =>
      execute(
        { api: 'shop', document: shop.CustomerSignOutDocument },
        { everywhere },
      ),
  };
}
