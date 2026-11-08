import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

// Nullable GraphQL input fields may be omitted. Preserve omission when adapting the stricter generated input type.
export type ProductInput = Omit<
  g.VendorCreateProductMutationVariables['input'],
  | 'collectTaxes'
  | 'taxOverride'
  | 'categoryIds'
  | 'primaryCategoryId'
  | 'tagIds'
  | 'productInformation'
  | 'assetIds'
> & {
  collectTaxes?: boolean | null;
  taxOverride?: number | null;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  tagIds?: string[];
  productInformation?: string | null;
  assetIds?: string[];
};
type OptionalVariantFields =
  | 'slug'
  | 'description'
  | 'productInformation'
  | 'assetIds'
  | 'collectTaxes'
  | 'taxOverride';
type OptionalInput<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type VariantInput = OptionalInput<
  g.VendorCreateVariantMutationVariables['input'],
  OptionalVariantFields | 'enabled' | 'optionIds'
>;
export type VariantMetadata = OptionalInput<
  g.VendorUpdateVariantMutationVariables['input'],
  OptionalVariantFields
>;
export type InventoryInput = g.VendorRestockMutationVariables['input'];
export type OperationalInput = g.VendorFulfillMutationVariables['input'];
export type AttendanceInput = g.VendorAttendanceMutationVariables['input'];
export type OfferingInput = g.VendorOfferingMutationVariables['input'];
export type PreorderInput = g.VendorMarketDefaultMutationVariables['rule'];
export type AnalyticsRange = g.VendorTotalsQueryVariables['range'];
export type CustomerOptions = g.VendorCustomersQueryVariables['options'];
export type Portion = g.PortionFragment;
export type Receipt = g.CommandReceiptFragment;
export type Customer = g.CustomerRelationshipFragment;
export type CustomerPage = g.VendorCustomersQuery['ownCustomers'];
export type PurchasePage =
  g.VendorCustomerHistoryQuery['ownCustomerPurchaseHistory'];
export type Purchase = PurchasePage['items'][number];
export type Membership = g.BusinessMembershipFragment;
export type MembershipState = g.VendorMembershipQuery['marketMembershipState'];
export type Occurrence = g.OccurrenceFragment;
export type Offering = g.OfferingFragment;
export type Listing = g.ListingFragment;
export type InventoryPage = g.VendorInventoryQuery['ownOperationalInventory'];
type CatalogVariant = g.OwnedCatalogProductFragment['variants'][number];
export type OwnedCatalogProduct = Omit<
  g.OwnedCatalogProductFragment,
  'variants'
> & {
  variants: ReadonlyArray<
    OptionalInput<CatalogVariant, OptionalVariantFields | 'taxConfigured'>
  >;
};
export type OwnedCatalogPage = Omit<
  g.VendorCatalogQuery['ownVendorCatalog'],
  'items'
> & { items: readonly OwnedCatalogProduct[] };
export type Publication = g.VendorPublicationQuery['ownListingPublication'];
export type AnalyticsPage = g.VendorTrendQuery['ownVendorAnalyticsTrend'];
export type AnalyticsTotals = g.VendorTotalsQuery['ownVendorAnalyticsTotals'];
export type AnalyticsMetadata = g.AnalyticsMetaFragment;

/** Named, generated, Admin-only operations. No caller receives arbitrary execute(). */
export function createVendorApi(
  options: TransportOptions & { channelToken: string },
) {
  if (!options.channelToken.trim()) throw new AppError('forbidden');
  const run = transport('admin', options);
  return {
    taxSettings: () =>
      run({ api: 'admin', document: g.VendorTaxSettingsDocument }, {}).then(
        (r) => r.ownVendorTaxSettings,
      ),
    saveTaxSettings: (
      input: g.SaveVendorTaxSettingsMutationVariables['input'],
    ) =>
      run(
        { api: 'admin', document: g.SaveVendorTaxSettingsDocument },
        { input },
      ).then((r) => r.saveOwnVendorTaxSettings),
    catalogRead: (
      options: g.VendorCatalogQueryVariables['options'],
    ): Promise<OwnedCatalogPage> =>
      run(
        { api: 'admin', document: g.VendorCatalogDocument },
        { options },
      ).then((r) => r.ownVendorCatalog),
    productRead: (productId: string): Promise<OwnedCatalogProduct> =>
      run(
        { api: 'admin', document: g.VendorProductDocument },
        { productId },
      ).then((r) => r.ownVendorProduct),
    orderList: (options: g.VendorOrdersQueryVariables['options']) =>
      run({ api: 'admin', document: g.VendorOrdersDocument }, { options }).then(
        (r) => r.ownCommercePortions,
      ),
    publication: (listingId: string) =>
      run(
        { api: 'admin', document: g.VendorPublicationDocument },
        { listingId },
      ).then((r) => r.ownListingPublication),
    featureAvailability: (boundary: string) =>
      run(
        { api: 'admin', document: g.FeatureAvailabilityDocument },
        { boundary },
      ).then((r) => r.ownFeatureAvailability),
    createProduct: (input: ProductInput) =>
      run(
        { api: 'admin', document: g.VendorCreateProductDocument },
        {
          input: input as g.VendorCreateProductMutationVariables['input'],
        },
      ).then((r) => r.createOwnCatalogProduct),
    updateProduct: (id: string, input: ProductInput) =>
      run(
        { api: 'admin', document: g.VendorUpdateProductDocument },
        {
          id,
          input: input as g.VendorUpdateProductMutationVariables['input'],
        },
      ).then((r) => r.updateOwnCatalogProduct),
    createVariant: (input: VariantInput) =>
      run(
        { api: 'admin', document: g.VendorCreateVariantDocument },
        { input: input as g.VendorCreateVariantMutationVariables['input'] },
      ).then((r) => r.createOwnCatalogVariant),
    updateVariant: (id: string, input: VariantMetadata) =>
      run(
        { api: 'admin', document: g.VendorUpdateVariantDocument },
        { id, input: input as g.VendorUpdateVariantMutationVariables['input'] },
      ).then((r) => r.updateOwnCatalogVariant),
    price: (id: string, price: number) =>
      run(
        { api: 'admin', document: g.VendorPriceDocument },
        { id, price },
      ).then((r) => r.updateOwnVariantPrice),
    inventory: (_vendorId: string, after: string | null = null) =>
      run(
        { api: 'admin', document: g.VendorInventoryDocument },
        { take: 20, after },
      ).then((r) => r.ownOperationalInventory),
    restock: (input: InventoryInput) =>
      run({ api: 'admin', document: g.VendorRestockDocument }, { input }).then(
        (r) => r.restockOwnPhysicalInventory,
      ),
    adjust: (input: InventoryInput) =>
      run(
        { api: 'admin', document: g.VendorAdjustStockDocument },
        { input },
      ).then((r) => r.adjustOwnPhysicalInventory),
    portion: (orderId: string) =>
      run(
        { api: 'admin', document: g.VendorPortionDocument },
        { orderId },
      ).then((r) => r.ownCommercePortion),
    fulfill: (input: OperationalInput) =>
      run({ api: 'admin', document: g.VendorFulfillDocument }, { input }).then(
        (r) => r.fulfillOwnExistingOrder,
      ),
    cancelQuantity: (input: OperationalInput) =>
      run(
        { api: 'admin', document: g.VendorCancelQuantityDocument },
        { input },
      ).then((r) => r.cancelOwnUnfulfilledQuantity),
    cancelFulfillment: (input: OperationalInput) =>
      run(
        { api: 'admin', document: g.VendorCancelFulfillmentDocument },
        { input },
      ).then((r) => r.cancelOwnExistingFulfillment),
    customers: (options: CustomerOptions) =>
      run(
        { api: 'admin', document: g.VendorCustomersDocument },
        { options },
      ).then((r) => r.ownCustomers),
    customer: (id: string) =>
      run({ api: 'admin', document: g.VendorCustomerDocument }, { id }).then(
        (r) => r.ownCustomerRelationship,
      ),
    history: (customerId: string, options: CustomerOptions) =>
      run(
        { api: 'admin', document: g.VendorCustomerHistoryDocument },
        { customerId, options },
      ).then((r) => r.ownCustomerPurchaseHistory),
    memberships: () =>
      run({ api: 'admin', document: g.VendorMembershipsDocument }, {}).then(
        (r) => r.ownMarketBusinessMemberships,
      ),
    membership: (membershipId: string) =>
      run(
        { api: 'admin', document: g.VendorMembershipDocument },
        { membershipId },
      ).then((r) => r.marketMembershipState),
    occurrences: (membershipId: string, from: string, through: string) =>
      run(
        { api: 'admin', document: g.VendorOccurrencesDocument },
        { membershipId, from, through },
      ).then((r) => r.ownMarketMembershipOccurrences),
    marketDefault: (id: string, expectedVersion: number, rule: PreorderInput) =>
      run(
        { api: 'admin', document: g.VendorMarketDefaultDocument },
        { id, expectedVersion, rule },
      ).then((r) => r.configureOwnMarketMembershipDefault),
    autoEnroll: (id: string, expectedVersion: number, enabled: boolean) =>
      run(
        { api: 'admin', document: g.VendorMarketAutoEnrollDocument },
        { id, expectedVersion, enabled },
      ).then((r) => r.configureOwnMarketMembershipAutoEnroll),
    attendance: (input: AttendanceInput) =>
      run(
        { api: 'admin', document: g.VendorAttendanceDocument },
        { input },
      ).then((r) => r.configureMarketParticipation),
    requestListing: (membershipId: string, variantId: string) =>
      run(
        { api: 'admin', document: g.VendorListingDocument },
        { membershipId, variantId },
      ).then((r) => r.requestOwnMarketListing),
    offering: (input: OfferingInput) =>
      run({ api: 'admin', document: g.VendorOfferingDocument }, { input }).then(
        (r) => r.configureMarketOffering,
      ),
    publish: (listingId: string) =>
      run(
        { api: 'admin', document: g.VendorPublishDocument },
        { listingId },
      ).then((r) => r.publishMarketListing),
    unpublish: (listingId: string) =>
      run(
        { api: 'admin', document: g.VendorUnpublishDocument },
        { listingId },
      ).then((r) => r.unpublishMarketListing),
    totals: (vendorId: string, range: AnalyticsRange) =>
      run(
        { api: 'admin', document: g.VendorTotalsDocument },
        { vendorId, range },
      ).then((r) => r.ownVendorAnalyticsTotals),
    trend: (vendorId: string, range: AnalyticsRange) =>
      run(
        { api: 'admin', document: g.VendorTrendDocument },
        { vendorId, range },
      ).then((r) => r.ownVendorAnalyticsTrend),
    productAnalytics: (
      vendorId: string,
      range: AnalyticsRange,
      variantId: string | null = null,
    ) =>
      run(
        { api: 'admin', document: g.VendorProductAnalyticsDocument },
        { vendorId, range, variantId },
      ).then((r) => r.ownVendorProductAnalytics),
    marketAnalytics: (vendorId: string, range: AnalyticsRange) =>
      run(
        { api: 'admin', document: g.VendorMarketAnalyticsDocument },
        { vendorId, range },
      ).then((r) => r.ownVendorMarketAnalytics),
    occurrenceAnalytics: (
      vendorId: string,
      range: AnalyticsRange,
      occurrenceId: string | null = null,
    ) =>
      run(
        { api: 'admin', document: g.VendorOccurrenceAnalyticsDocument },
        { vendorId, range, occurrenceId },
      ).then((r) => r.ownVendorOccurrenceAnalytics),
  };
}
export type VendorApi = ReturnType<typeof createVendorApi>;
