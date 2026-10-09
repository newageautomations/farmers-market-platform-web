import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

export type ProductInput = g.VendorCreateProductMutationVariables['input'];
export type VariantInput = g.VendorCreateVariantMutationVariables['input'];
export type VariantMetadata = g.VendorUpdateVariantMutationVariables['input'];
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
export type OwnedCatalogProduct = g.OwnedCatalogProductFragment;
export type OwnedCatalogPage = g.VendorCatalogQuery['ownVendorCatalog'];
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
    catalogRead: (options: g.VendorCatalogQueryVariables['options']) =>
      run(
        { api: 'admin', document: g.VendorCatalogDocument },
        { options },
      ).then((r) => r.ownVendorCatalog),
    productRead: (productId: string) =>
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
        { input },
      ).then((r) => r.createOwnCatalogProduct),
    updateProduct: (id: string, input: ProductInput) =>
      run(
        { api: 'admin', document: g.VendorUpdateProductDocument },
        { id, input },
      ).then((r) => r.updateOwnCatalogProduct),
    createVariant: (input: VariantInput) =>
      run(
        { api: 'admin', document: g.VendorCreateVariantDocument },
        { input },
      ).then((r) => r.createOwnCatalogVariant),
    updateVariant: (id: string, input: VariantMetadata) =>
      run(
        { api: 'admin', document: g.VendorUpdateVariantDocument },
        { id, input },
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
