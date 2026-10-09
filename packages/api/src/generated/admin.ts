/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AnalyticsRangeInput = {
  readonly after: string | null | undefined;
  readonly end: string;
  readonly start: string;
  readonly take: number | null | undefined;
};

export type BeginPosAuthorizationInput = {
  readonly accountHint: string | null | undefined;
  readonly mode: PosMode;
  readonly providerCode: string;
  readonly redirectUri: string;
};

export type BillingSubjectInput = {
  readonly marketId: string | number | null | undefined;
  readonly vendorId: string | number | null | undefined;
};

export type CompletePosAuthorizationInput = {
  readonly accountHint: string | null | undefined;
  readonly callbackParams: unknown;
  readonly code: string;
  readonly mode: PosMode;
  readonly providerCode: string;
  readonly state: string;
};

export type ConfigureMarketInput = {
  readonly defaultPreorderRule: MarketPreorderRuleInput;
  readonly expectedVersion: number;
  readonly marketId: string | number;
  readonly name: string;
  readonly overridePolicy: MarketOverridePolicyInput;
  readonly pickupInstructions: string;
  readonly status: MarketStatus;
  readonly timezone: string;
  readonly venue: string;
};

export type ConfirmPosMappingInput = {
  readonly connectionId: string | number;
  readonly externalId: string;
  readonly kind: PosMappingKind;
  readonly localId: string | number;
};

/**
 * @description
 * ISO 4217 currency code
 *
 * @docsCategory common
 */
export type CurrencyCode =
  /** United Arab Emirates dirham */
  | 'AED'
  /** Afghan afghani */
  | 'AFN'
  /** Albanian lek */
  | 'ALL'
  /** Armenian dram */
  | 'AMD'
  /** Netherlands Antillean guilder */
  | 'ANG'
  /** Angolan kwanza */
  | 'AOA'
  /** Argentine peso */
  | 'ARS'
  /** Australian dollar */
  | 'AUD'
  /** Aruban florin */
  | 'AWG'
  /** Azerbaijani manat */
  | 'AZN'
  /** Bosnia and Herzegovina convertible mark */
  | 'BAM'
  /** Barbados dollar */
  | 'BBD'
  /** Bangladeshi taka */
  | 'BDT'
  /** Bulgarian lev */
  | 'BGN'
  /** Bahraini dinar */
  | 'BHD'
  /** Burundian franc */
  | 'BIF'
  /** Bermudian dollar */
  | 'BMD'
  /** Brunei dollar */
  | 'BND'
  /** Boliviano */
  | 'BOB'
  /** Brazilian real */
  | 'BRL'
  /** Bahamian dollar */
  | 'BSD'
  /** Bhutanese ngultrum */
  | 'BTN'
  /** Botswana pula */
  | 'BWP'
  /** Belarusian ruble */
  | 'BYN'
  /** Belize dollar */
  | 'BZD'
  /** Canadian dollar */
  | 'CAD'
  /** Congolese franc */
  | 'CDF'
  /** Swiss franc */
  | 'CHF'
  /** Chilean peso */
  | 'CLP'
  /** Renminbi (Chinese) yuan */
  | 'CNY'
  /** Colombian peso */
  | 'COP'
  /** Costa Rican colon */
  | 'CRC'
  /** Cuban convertible peso */
  | 'CUC'
  /** Cuban peso */
  | 'CUP'
  /** Cape Verde escudo */
  | 'CVE'
  /** Czech koruna */
  | 'CZK'
  /** Djiboutian franc */
  | 'DJF'
  /** Danish krone */
  | 'DKK'
  /** Dominican peso */
  | 'DOP'
  /** Algerian dinar */
  | 'DZD'
  /** Egyptian pound */
  | 'EGP'
  /** Eritrean nakfa */
  | 'ERN'
  /** Ethiopian birr */
  | 'ETB'
  /** Euro */
  | 'EUR'
  /** Fiji dollar */
  | 'FJD'
  /** Falkland Islands pound */
  | 'FKP'
  /** Pound sterling */
  | 'GBP'
  /** Georgian lari */
  | 'GEL'
  /** Ghanaian cedi */
  | 'GHS'
  /** Gibraltar pound */
  | 'GIP'
  /** Gambian dalasi */
  | 'GMD'
  /** Guinean franc */
  | 'GNF'
  /** Guatemalan quetzal */
  | 'GTQ'
  /** Guyanese dollar */
  | 'GYD'
  /** Hong Kong dollar */
  | 'HKD'
  /** Honduran lempira */
  | 'HNL'
  /** Croatian kuna */
  | 'HRK'
  /** Haitian gourde */
  | 'HTG'
  /** Hungarian forint */
  | 'HUF'
  /** Indonesian rupiah */
  | 'IDR'
  /** Israeli new shekel */
  | 'ILS'
  /** Indian rupee */
  | 'INR'
  /** Iraqi dinar */
  | 'IQD'
  /** Iranian rial */
  | 'IRR'
  /** Icelandic króna */
  | 'ISK'
  /** Jamaican dollar */
  | 'JMD'
  /** Jordanian dinar */
  | 'JOD'
  /** Japanese yen */
  | 'JPY'
  /** Kenyan shilling */
  | 'KES'
  /** Kyrgyzstani som */
  | 'KGS'
  /** Cambodian riel */
  | 'KHR'
  /** Comoro franc */
  | 'KMF'
  /** North Korean won */
  | 'KPW'
  /** South Korean won */
  | 'KRW'
  /** Kuwaiti dinar */
  | 'KWD'
  /** Cayman Islands dollar */
  | 'KYD'
  /** Kazakhstani tenge */
  | 'KZT'
  /** Lao kip */
  | 'LAK'
  /** Lebanese pound */
  | 'LBP'
  /** Sri Lankan rupee */
  | 'LKR'
  /** Liberian dollar */
  | 'LRD'
  /** Lesotho loti */
  | 'LSL'
  /** Libyan dinar */
  | 'LYD'
  /** Moroccan dirham */
  | 'MAD'
  /** Moldovan leu */
  | 'MDL'
  /** Malagasy ariary */
  | 'MGA'
  /** Macedonian denar */
  | 'MKD'
  /** Myanmar kyat */
  | 'MMK'
  /** Mongolian tögrög */
  | 'MNT'
  /** Macanese pataca */
  | 'MOP'
  /** Mauritanian ouguiya */
  | 'MRU'
  /** Mauritian rupee */
  | 'MUR'
  /** Maldivian rufiyaa */
  | 'MVR'
  /** Malawian kwacha */
  | 'MWK'
  /** Mexican peso */
  | 'MXN'
  /** Malaysian ringgit */
  | 'MYR'
  /** Mozambican metical */
  | 'MZN'
  /** Namibian dollar */
  | 'NAD'
  /** Nigerian naira */
  | 'NGN'
  /** Nicaraguan córdoba */
  | 'NIO'
  /** Norwegian krone */
  | 'NOK'
  /** Nepalese rupee */
  | 'NPR'
  /** New Zealand dollar */
  | 'NZD'
  /** Omani rial */
  | 'OMR'
  /** Panamanian balboa */
  | 'PAB'
  /** Peruvian sol */
  | 'PEN'
  /** Papua New Guinean kina */
  | 'PGK'
  /** Philippine peso */
  | 'PHP'
  /** Pakistani rupee */
  | 'PKR'
  /** Polish złoty */
  | 'PLN'
  /** Paraguayan guaraní */
  | 'PYG'
  /** Qatari riyal */
  | 'QAR'
  /** Romanian leu */
  | 'RON'
  /** Serbian dinar */
  | 'RSD'
  /** Russian ruble */
  | 'RUB'
  /** Rwandan franc */
  | 'RWF'
  /** Saudi riyal */
  | 'SAR'
  /** Solomon Islands dollar */
  | 'SBD'
  /** Seychelles rupee */
  | 'SCR'
  /** Sudanese pound */
  | 'SDG'
  /** Swedish krona/kronor */
  | 'SEK'
  /** Singapore dollar */
  | 'SGD'
  /** Saint Helena pound */
  | 'SHP'
  /** Sierra Leonean leone */
  | 'SLL'
  /** Somali shilling */
  | 'SOS'
  /** Surinamese dollar */
  | 'SRD'
  /** South Sudanese pound */
  | 'SSP'
  /** São Tomé and Príncipe dobra */
  | 'STN'
  /** Salvadoran colón */
  | 'SVC'
  /** Syrian pound */
  | 'SYP'
  /** Swazi lilangeni */
  | 'SZL'
  /** Thai baht */
  | 'THB'
  /** Tajikistani somoni */
  | 'TJS'
  /** Turkmenistan manat */
  | 'TMT'
  /** Tunisian dinar */
  | 'TND'
  /** Tongan paʻanga */
  | 'TOP'
  /** Turkish lira */
  | 'TRY'
  /** Trinidad and Tobago dollar */
  | 'TTD'
  /** New Taiwan dollar */
  | 'TWD'
  /** Tanzanian shilling */
  | 'TZS'
  /** Ukrainian hryvnia */
  | 'UAH'
  /** Ugandan shilling */
  | 'UGX'
  /** United States dollar */
  | 'USD'
  /** Uruguayan peso */
  | 'UYU'
  /** Uzbekistan som */
  | 'UZS'
  /** Venezuelan bolívar soberano */
  | 'VES'
  /** Vietnamese đồng */
  | 'VND'
  /** Vanuatu vatu */
  | 'VUV'
  /** Samoan tala */
  | 'WST'
  /** CFA franc BEAC */
  | 'XAF'
  /** East Caribbean dollar */
  | 'XCD'
  /** CFA franc BCEAO */
  | 'XOF'
  /** CFP franc (franc Pacifique) */
  | 'XPF'
  /** Yemeni rial */
  | 'YER'
  /** South African rand */
  | 'ZAR'
  /** Zambian kwacha */
  | 'ZMW'
  /** Zimbabwean dollar */
  | 'ZWL';

export type ErrorCode =
  | 'ALREADY_REFUNDED_ERROR'
  | 'CANCEL_ACTIVE_ORDER_ERROR'
  | 'CANCEL_PAYMENT_ERROR'
  | 'CHANNEL_DEFAULT_LANGUAGE_ERROR'
  | 'COUPON_CODE_EXPIRED_ERROR'
  | 'COUPON_CODE_INVALID_ERROR'
  | 'COUPON_CODE_LIMIT_ERROR'
  | 'CREATE_FULFILLMENT_ERROR'
  | 'DUPLICATE_ENTITY_ERROR'
  | 'EMAIL_ADDRESS_CONFLICT_ERROR'
  | 'EMPTY_ORDER_LINE_SELECTION_ERROR'
  | 'FACET_IN_USE_ERROR'
  | 'FULFILLMENT_STATE_TRANSITION_ERROR'
  | 'GUEST_CHECKOUT_ERROR'
  | 'INELIGIBLE_SHIPPING_METHOD_ERROR'
  | 'INSUFFICIENT_STOCK_ERROR'
  | 'INSUFFICIENT_STOCK_ON_HAND_ERROR'
  | 'INVALID_CREDENTIALS_ERROR'
  | 'INVALID_FULFILLMENT_HANDLER_ERROR'
  | 'ITEMS_ALREADY_FULFILLED_ERROR'
  | 'LANGUAGE_NOT_AVAILABLE_ERROR'
  | 'MANUAL_PAYMENT_STATE_ERROR'
  | 'MIME_TYPE_ERROR'
  | 'MISSING_CONDITIONS_ERROR'
  | 'MULTIPLE_ORDER_ERROR'
  | 'NATIVE_AUTH_STRATEGY_ERROR'
  | 'NEGATIVE_QUANTITY_ERROR'
  | 'NOTHING_TO_REFUND_ERROR'
  | 'NO_ACTIVE_ORDER_ERROR'
  | 'NO_CHANGES_SPECIFIED_ERROR'
  | 'ORDER_INTERCEPTOR_ERROR'
  | 'ORDER_LIMIT_ERROR'
  | 'ORDER_MODIFICATION_ERROR'
  | 'ORDER_MODIFICATION_STATE_ERROR'
  | 'ORDER_STATE_TRANSITION_ERROR'
  | 'PAYMENT_METHOD_MISSING_ERROR'
  | 'PAYMENT_ORDER_MISMATCH_ERROR'
  | 'PAYMENT_STATE_TRANSITION_ERROR'
  | 'PRODUCT_OPTION_GROUP_IN_USE_ERROR'
  | 'PRODUCT_OPTION_IN_USE_ERROR'
  | 'QUANTITY_TOO_GREAT_ERROR'
  | 'REFUND_AMOUNT_ERROR'
  | 'REFUND_ORDER_STATE_ERROR'
  | 'REFUND_PAYMENT_ID_MISSING_ERROR'
  | 'REFUND_STATE_TRANSITION_ERROR'
  | 'SETTLE_PAYMENT_ERROR'
  | 'UNKNOWN_ERROR';

export type MarketAttendanceInput = {
  readonly expectedVersion: number | null | undefined;
  readonly membershipId: string | number;
  readonly occurrenceId: string | number;
  readonly pickupInstructions: string;
  readonly preorderOverride: MarketPreorderRuleInput | null | undefined;
  readonly status: MarketAttendanceStatus;
};

export type MarketAttendanceStatus =
  | 'cancelled'
  | 'confirmed'
  | 'planned';

export type MarketBusinessMembershipStatus =
  | 'approved'
  | 'pending'
  | 'suspended'
  | 'withdrawn';

export type MarketGenerationStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING'
  | 'RUNNING';

export type MarketListingApprovalStatus =
  | 'approved'
  | 'withdrawn';

export type MarketOfferingInput = {
  readonly enabled: boolean;
  readonly expectedVersion: number | null | undefined;
  readonly listingId: string | number;
  readonly participationId: string | number;
  readonly preorderEnabled: boolean;
  readonly salesCap: number | null | undefined;
  readonly variantId: string | number;
};

export type MarketOperationsAction =
  | 'ACCEPT_ASSIGN'
  | 'APPROVE_OCCURRENCE'
  | 'ASSIGN'
  | 'CLONE_APPLICATION'
  | 'CLONE_LAYOUT'
  | 'CLOSE_DAY'
  | 'COPY_ASSIGNMENTS'
  | 'CREATE_APPLICATION'
  | 'CREATE_LAYOUT'
  | 'DAY_UPDATE'
  | 'ISSUE_INVOICE'
  | 'PUBLISH_APPLICATION'
  | 'PUBLISH_LAYOUT'
  | 'PUBLISH_MAP'
  | 'RECORD_PAYMENT'
  | 'RETIRE_APPLICATION'
  | 'REVIEW_APPLICATION'
  | 'SAVE_APPLICATION'
  | 'SAVE_DIRECTORY'
  | 'SAVE_LAYOUT'
  | 'SAVE_RENTAL'
  | 'SET_PLAN'
  | 'VOID_REISSUE';

export type MarketOperationsCommand = {
  readonly action: MarketOperationsAction;
  readonly data: unknown;
  readonly expectedRevision: number | null | undefined;
  readonly id: number | null | undefined;
};

export type MarketOperationsSection =
  | 'APPLICATIONS'
  | 'ASSIGNMENTS'
  | 'BILLING'
  | 'DAY'
  | 'DIRECTORY'
  | 'LAYOUTS';

export type MarketOverridePolicyInput = {
  readonly closeMinutesBeforeStart: number;
  readonly membershipAllowed: boolean;
  readonly participationAllowed: boolean;
  readonly vendorWindowMode: MarketVendorWindowMode;
};

export type MarketPreorderRuleInput = {
  readonly closesDaysBefore: number;
  readonly closesTime: string;
  readonly opensDaysBefore: number;
  readonly opensTime: string;
};

export type MarketSessionInput = {
  readonly endsAt: string;
  readonly pickupInstructions: string;
  readonly preorderOverride: MarketPreorderRuleInput | null | undefined;
  readonly startsAt: string;
  readonly venue: string;
};

export type MarketStatus =
  | 'active'
  | 'suspended';

export type MarketVendorWindowMode =
  | 'narrower'
  | 'withinBoundary';

export type OwnCatalogOptions = {
  readonly search: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly sort: OwnCatalogSort | null | undefined;
  readonly take: number | null | undefined;
};

export type OwnCatalogProductInput = {
  readonly description: string;
  readonly enabled: boolean;
  readonly name: string;
  readonly slug: string;
};

export type OwnCatalogSort =
  | 'ID_ASC'
  | 'ID_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC';

export type OwnCatalogVariantInput = {
  readonly name: string;
  readonly optionIds: ReadonlyArray<string | number> | null | undefined;
  readonly price: number;
  readonly productId: string | number;
  readonly sku: string;
};

export type OwnCatalogVariantMetadataInput = {
  readonly enabled: boolean;
  readonly name: string;
  readonly sku: string;
};

export type OwnFeatureAvailabilityState =
  | 'ALLOWED'
  | 'DENIED'
  | 'UNCONFIGURED'
  | 'UNKNOWN';

export type OwnInventoryAdjustmentInput = {
  readonly operationKey: string;
  readonly quantity: number;
  readonly variantId: string | number;
};

export type OwnMarketOccurrenceOptions = {
  readonly from: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
  readonly through: string | null | undefined;
};

export type OwnMarketOverviewOptions = {
  readonly from: string | null | undefined;
  readonly through: string | null | undefined;
};

export type OwnMarketPageOptions = {
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
};

export type OwnMarketVendorDirectoryOptions = {
  readonly search: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
};

export type OwnMarketVendorOptions = {
  readonly search: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly status: MarketBusinessMembershipStatus | null | undefined;
  readonly take: number | null | undefined;
};

export type OwnOperationalInventoryInput = {
  readonly fulfillmentId: string | number | null | undefined;
  readonly operationKey: string;
  readonly orderId: string | number;
  readonly orderLineId: string | number | null | undefined;
  readonly quantity: number | null | undefined;
};

export type OwnOperationalOrderKind =
  | 'DIRECT_VENDOR'
  | 'MARKET_OCCURRENCE';

export type OwnOperationalOrderOptions = {
  readonly kind: OwnOperationalOrderKind | null | undefined;
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
};

export type OwnPublicationStatus =
  | 'PUBLISHED'
  | 'RECONCILIATION_REQUIRED'
  | 'UNPUBLISHED';

/**
 * @description
 * Permissions for administrators and customers. Used to control access to
 * GraphQL resolvers via the {@link Allow} decorator.
 *
 * ## Understanding Permission.Owner
 *
 * `Permission.Owner` is a special permission which is used in some Vendure resolvers to indicate that that resolver should only
 * be accessible to the "owner" of that resource.
 *
 * For example, the Shop API `activeCustomer` query resolver should only return the Customer object for the "owner" of that Customer, i.e.
 * based on the activeUserId of the current session. As a result, the resolver code looks like this:
 *
 * @example
 * ```TypeScript
 * \@Query()
 * \@Allow(Permission.Owner)
 * async activeCustomer(\@Ctx() ctx: RequestContext): Promise<Customer | undefined> {
 *   const userId = ctx.activeUserId;
 *   if (userId) {
 *     return this.customerService.findOneByUserId(ctx, userId);
 *   }
 * }
 * ```
 *
 * Here we can see that the "ownership" must be enforced by custom logic inside the resolver. Since "ownership" cannot be defined generally
 * nor statically encoded at build-time, any resolvers using `Permission.Owner` **must** include logic to enforce that only the owner
 * of the resource has access. If not, then it is the equivalent of using `Permission.Public`.
 *
 *
 * @docsCategory common
 */
export type Permission =
  /** Authenticated means simply that the user is logged in */
  | 'Authenticated'
  /** Grants permission to create Administrator */
  | 'CreateAdministrator'
  /** Grants permission to create ApiKey */
  | 'CreateApiKey'
  /** Grants permission to create Asset */
  | 'CreateAsset'
  /** Grants permission to create Products, Facets, Assets, Collections */
  | 'CreateCatalog'
  /** Grants permission to create Channel */
  | 'CreateChannel'
  /** Grants permission to create Collection */
  | 'CreateCollection'
  /** Grants permission to create Country */
  | 'CreateCountry'
  /** Grants permission to create Customer */
  | 'CreateCustomer'
  /** Grants permission to create CustomerGroup */
  | 'CreateCustomerGroup'
  /** Grants permission to create Facet */
  | 'CreateFacet'
  /** Grants permission to create Order */
  | 'CreateOrder'
  /** Grants permission to create PaymentMethod */
  | 'CreatePaymentMethod'
  /** Grants permission to create Product */
  | 'CreateProduct'
  /** Grants permission to create Promotion */
  | 'CreatePromotion'
  /** Grants permission to create Seller */
  | 'CreateSeller'
  /** Grants permission to create PaymentMethods, ShippingMethods, TaxCategories, TaxRates, Zones, Countries, System & GlobalSettings */
  | 'CreateSettings'
  /** Grants permission to create ShippingMethod */
  | 'CreateShippingMethod'
  /** Grants permission to create StockLocation */
  | 'CreateStockLocation'
  /** Grants permission to create System */
  | 'CreateSystem'
  /** Grants permission to create Tag */
  | 'CreateTag'
  /** Grants permission to create TaxCategory */
  | 'CreateTaxCategory'
  /** Grants permission to create TaxRate */
  | 'CreateTaxRate'
  /** Grants permission to create Zone */
  | 'CreateZone'
  /** Grants permission to delete Administrator */
  | 'DeleteAdministrator'
  /** Grants permission to delete ApiKey */
  | 'DeleteApiKey'
  /** Grants permission to delete Asset */
  | 'DeleteAsset'
  /** Grants permission to delete Products, Facets, Assets, Collections */
  | 'DeleteCatalog'
  /** Grants permission to delete Channel */
  | 'DeleteChannel'
  /** Grants permission to delete Collection */
  | 'DeleteCollection'
  /** Grants permission to delete Country */
  | 'DeleteCountry'
  /** Grants permission to delete Customer */
  | 'DeleteCustomer'
  /** Grants permission to delete CustomerGroup */
  | 'DeleteCustomerGroup'
  /** Grants permission to delete Facet */
  | 'DeleteFacet'
  /** Grants permission to delete Order */
  | 'DeleteOrder'
  /** Grants permission to delete PaymentMethod */
  | 'DeletePaymentMethod'
  /** Grants permission to delete Product */
  | 'DeleteProduct'
  /** Grants permission to delete Promotion */
  | 'DeletePromotion'
  /** Grants permission to delete Seller */
  | 'DeleteSeller'
  /** Grants permission to delete PaymentMethods, ShippingMethods, TaxCategories, TaxRates, Zones, Countries, System & GlobalSettings */
  | 'DeleteSettings'
  /** Grants permission to delete ShippingMethod */
  | 'DeleteShippingMethod'
  /** Grants permission to delete StockLocation */
  | 'DeleteStockLocation'
  /** Grants permission to delete System */
  | 'DeleteSystem'
  /** Grants permission to delete Tag */
  | 'DeleteTag'
  /** Grants permission to delete TaxCategory */
  | 'DeleteTaxCategory'
  /** Grants permission to delete TaxRate */
  | 'DeleteTaxRate'
  /** Grants permission to delete Zone */
  | 'DeleteZone'
  | 'ManageBillingCatalog'
  | 'ManageCatalogPublication'
  | 'ManageMarketIdentity'
  | 'ManageMarketStorefront'
  | 'ManageOwnBilling'
  | 'ManageOwnCatalog'
  | 'ManageOwnCoupon'
  | 'ManageOwnInventory'
  | 'ManageOwnMarketApplications'
  | 'ManageOwnMarketAssignments'
  | 'ManageOwnMarketBilling'
  | 'ManageOwnMarketLayouts'
  | 'ManageOwnMarketListings'
  | 'ManageOwnMarketMemberships'
  | 'ManageOwnMarketOccurrences'
  | 'ManageOwnMarketOfferings'
  | 'ManageOwnMarketParticipation'
  | 'ManageOwnMarketSchedule'
  | 'ManageOwnPaymentAccount'
  | 'ManageOwnPosIntegrations'
  | 'ManageOwnStorefront'
  | 'ManageOwnVendorMembership'
  | 'ManageVendorIdentity'
  | 'OperateOwnMarketDay'
  /** Owner means the user owns this entity, e.g. a Customer's own Order */
  | 'Owner'
  /** Public means any unauthenticated user may perform the operation */
  | 'Public'
  /** Grants permission to read Administrator */
  | 'ReadAdministrator'
  /** Grants permission to read ApiKey */
  | 'ReadApiKey'
  /** Grants permission to read Asset */
  | 'ReadAsset'
  /** Grants permission to read Products, Facets, Assets, Collections */
  | 'ReadCatalog'
  /** Grants permission to read Channel */
  | 'ReadChannel'
  /** Grants permission to read Collection */
  | 'ReadCollection'
  /** Grants permission to read Country */
  | 'ReadCountry'
  /** Grants permission to read Customer */
  | 'ReadCustomer'
  /** Grants permission to read CustomerGroup */
  | 'ReadCustomerGroup'
  /** Grants permission to read Facet */
  | 'ReadFacet'
  /** Grants permission to read Order */
  | 'ReadOrder'
  | 'ReadOwnBilling'
  | 'ReadOwnCRM'
  | 'ReadOwnMarket'
  | 'ReadOwnMarketAnalytics'
  | 'ReadOwnMarketApplications'
  | 'ReadOwnMarketAssignments'
  | 'ReadOwnMarketBilling'
  | 'ReadOwnMarketLayouts'
  | 'ReadOwnPaymentAccount'
  | 'ReadOwnPosIntegrations'
  | 'ReadOwnVendorAnalytics'
  | 'ReadOwnVendorFinance'
  | 'ReadOwnVendorIdentity'
  /** Grants permission to read PaymentMethod */
  | 'ReadPaymentMethod'
  | 'ReadPlatformAnalytics'
  /** Grants permission to read Product */
  | 'ReadProduct'
  /** Grants permission to read Promotion */
  | 'ReadPromotion'
  /** Grants permission to read Seller */
  | 'ReadSeller'
  /** Grants permission to read PaymentMethods, ShippingMethods, TaxCategories, TaxRates, Zones, Countries, System & GlobalSettings */
  | 'ReadSettings'
  /** Grants permission to read ShippingMethod */
  | 'ReadShippingMethod'
  /** Grants permission to read StockLocation */
  | 'ReadStockLocation'
  /** Grants permission to read System */
  | 'ReadSystem'
  /** Grants permission to read Tag */
  | 'ReadTag'
  /** Grants permission to read TaxCategory */
  | 'ReadTaxCategory'
  /** Grants permission to read TaxRate */
  | 'ReadTaxRate'
  /** Grants permission to read Zone */
  | 'ReadZone'
  | 'RequestOwnVendorRefund'
  /** SuperAdmin has unrestricted access to all operations */
  | 'SuperAdmin'
  /** Grants permission to update Administrator */
  | 'UpdateAdministrator'
  /** Grants permission to update ApiKey */
  | 'UpdateApiKey'
  /** Grants permission to update Asset */
  | 'UpdateAsset'
  /** Grants permission to update Products, Facets, Assets, Collections */
  | 'UpdateCatalog'
  /** Grants permission to update Channel */
  | 'UpdateChannel'
  /** Grants permission to update Collection */
  | 'UpdateCollection'
  /** Grants permission to update Country */
  | 'UpdateCountry'
  /** Grants permission to update Customer */
  | 'UpdateCustomer'
  /** Grants permission to update CustomerGroup */
  | 'UpdateCustomerGroup'
  /** Grants permission to update Facet */
  | 'UpdateFacet'
  /** Grants permission to update GlobalSettings */
  | 'UpdateGlobalSettings'
  /** Grants permission to update Order */
  | 'UpdateOrder'
  /** Grants permission to update PaymentMethod */
  | 'UpdatePaymentMethod'
  /** Grants permission to update Product */
  | 'UpdateProduct'
  /** Grants permission to update Promotion */
  | 'UpdatePromotion'
  /** Grants permission to update Seller */
  | 'UpdateSeller'
  /** Grants permission to update PaymentMethods, ShippingMethods, TaxCategories, TaxRates, Zones, Countries, System & GlobalSettings */
  | 'UpdateSettings'
  /** Grants permission to update ShippingMethod */
  | 'UpdateShippingMethod'
  /** Grants permission to update StockLocation */
  | 'UpdateStockLocation'
  /** Grants permission to update System */
  | 'UpdateSystem'
  /** Grants permission to update Tag */
  | 'UpdateTag'
  /** Grants permission to update TaxCategory */
  | 'UpdateTaxCategory'
  /** Grants permission to update TaxRate */
  | 'UpdateTaxRate'
  /** Grants permission to update Zone */
  | 'UpdateZone';

export type PlatformCatalogOptions = {
  readonly billingAccountId: string | number | null | undefined;
  readonly planId: string | number | null | undefined;
  readonly planVersionId: string | number | null | undefined;
  readonly search: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
};

export type PlatformCatalogSection =
  | 'ACCESS_POLICIES'
  | 'CHANGE_POLICIES'
  | 'FEATURES'
  | 'METRICS'
  | 'OFFERS'
  | 'OVERRIDES'
  | 'PLANS'
  | 'PROVIDER_MAPPINGS'
  | 'RULES'
  | 'VERSIONS';

export type PlatformPaymentMode =
  | 'LIVE'
  | 'TEST';

export type PlatformProvisionMarketInput = {
  readonly defaultPreorderRule: MarketPreorderRuleInput;
  readonly initialPrincipalId: string | number | null | undefined;
  readonly name: string;
  readonly overridePolicy: MarketOverridePolicyInput;
  readonly pickupInstructions: string;
  readonly provisioningKey: string;
  readonly slug: string;
  readonly timezone: string;
  readonly venue: string;
};

export type PlatformProvisionVendorInput = {
  readonly initialPrincipalId: string | number | null | undefined;
  readonly name: string;
  readonly provisioningKey: string;
  readonly slug: string;
};

export type PlatformTenantKind =
  | 'MARKET'
  | 'VENDOR';

export type PlatformTenantOptions = {
  readonly kind: PlatformTenantKind | null | undefined;
  readonly search: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly status: PlatformTenantStatus | null | undefined;
  readonly take: number | null | undefined;
};

export type PlatformTenantStatus =
  | 'active'
  | 'suspended';

export type PosMappingKind =
  | 'LOCATION'
  | 'VARIANT';

export type PosMode =
  | 'LIVE'
  | 'SANDBOX';

export type PosStream =
  | 'catalog'
  | 'inventory'
  | 'sales';

export type RelationshipPageOptions = {
  readonly search: string | null | undefined;
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
};

export type SaasChangePolicyInput = {
  readonly code: string;
  readonly proration: string;
  readonly timing: string;
  readonly version: string;
};

export type SaasMetricInput = {
  readonly aggregationKind: string;
  readonly metricCode: string;
  readonly policyVersion: string;
  readonly sourceType: string;
  readonly unit: string;
};

export type SaasOfferInput = {
  readonly amount: number;
  readonly billingModel: string;
  readonly cadenceCount: number;
  readonly cadenceInterval: string;
  readonly cadenceKind: string;
  readonly code: string;
  readonly currency: string;
  readonly planVersionId: string | number;
  readonly providerUsagePolicy: string | null | undefined;
  readonly trialPolicy: string | null | undefined;
};

export type SaasOverrideInput = {
  readonly allowanceAmount: number | null | undefined;
  readonly billingAccountId: string | number;
  readonly enabled: boolean | null | undefined;
  readonly endsAt: string | null | undefined;
  readonly featureId: string | number;
  readonly limitValue: number | null | undefined;
  readonly metricId: string | number | null | undefined;
  readonly policyVersion: string;
  readonly reasonCode: string;
  readonly source: string;
  readonly startsAt: string;
  readonly unlimited: boolean;
  readonly valueKind: string;
  readonly windowPolicy: string | null | undefined;
};

export type SaasRuleInput = {
  readonly allowanceAmount: number | null | undefined;
  readonly enabled: boolean | null | undefined;
  readonly featureId: string | number;
  readonly limitValue: number | null | undefined;
  readonly metricId: string | number | null | undefined;
  readonly planVersionId: string | number;
  readonly policyVersion: string;
  readonly unlimited: boolean;
  readonly valueKind: string;
  readonly windowPolicy: string | null | undefined;
};

export type StripeAccountMode =
  | 'LIVE'
  | 'TEST';

export type WeeklyRecurrenceInput = {
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null | undefined;
  readonly endDayOffset: number;
  readonly endTime: string;
  readonly frequency: string | null | undefined;
  readonly monthWeeks: ReadonlyArray<number> | null | undefined;
  readonly startTime: string;
  readonly weekInterval: number | null | undefined;
  readonly weekdays: ReadonlyArray<number>;
};

export type AdminSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminSessionQuery = { readonly me: { readonly id: string, readonly identifier: string, readonly channels: ReadonlyArray<{ readonly id: string, readonly code: string, readonly token: string, readonly permissions: ReadonlyArray<Permission> }> } | null };

export type AdminLoginMutationVariables = Exact<{
  username: string;
  password: string;
  rememberMe: boolean;
}>;


export type AdminLoginMutation = { readonly login:
    | { readonly __typename: 'CurrentUser', readonly id: string, readonly identifier: string, readonly channels: ReadonlyArray<{ readonly id: string, readonly code: string, readonly token: string, readonly permissions: ReadonlyArray<Permission> }> }
    | { readonly __typename: 'InvalidCredentialsError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'NativeAuthStrategyError', readonly errorCode: ErrorCode }
   };

export type AdminLogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type AdminLogoutMutation = { readonly logout: { readonly success: boolean } };

export type VendorIdentityQueryVariables = Exact<{ [key: string]: never; }>;


export type VendorIdentityQuery = { readonly ownVendorIdentity: { readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly channelId: string, readonly permissions: ReadonlyArray<string>, readonly memberships: ReadonlyArray<{ readonly id: string, readonly principalId: string, readonly role: string, readonly status: string }> } };

export type CommandReceiptFragment = { readonly id: string, readonly operationKey: string, readonly kind: string, readonly status: string, readonly movementIds: ReadonlyArray<string>, readonly orderId: string | null, readonly orderLineId: string | null, readonly fulfillmentId: string | null };

export type PickupFragment = { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null };

export type PortionFragment = { readonly operationalOrderId: string, readonly vendorId: string, readonly kind: string, readonly marketId: string | null, readonly marketName: string | null, readonly occurrenceId: string | null, readonly occurrenceStartsAt: string | null, readonly placedAt: string | null, readonly lineCount: number, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number, readonly nativeState: string, readonly pickupStatus: string, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly operationalLineId: string, readonly variantId: string, readonly variantName: string, readonly sku: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }>, readonly fulfillments: ReadonlyArray<{ readonly id: string, readonly state: string, readonly lines: ReadonlyArray<{ readonly operationalLineId: string, readonly quantity: number }> }>, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null } };

export type VendorPortionQueryVariables = Exact<{
  orderId: string | number;
}>;


export type VendorPortionQuery = { readonly ownCommercePortion: { readonly operationalOrderId: string, readonly vendorId: string, readonly kind: string, readonly marketId: string | null, readonly marketName: string | null, readonly occurrenceId: string | null, readonly occurrenceStartsAt: string | null, readonly placedAt: string | null, readonly lineCount: number, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number, readonly nativeState: string, readonly pickupStatus: string, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly operationalLineId: string, readonly variantId: string, readonly variantName: string, readonly sku: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }>, readonly fulfillments: ReadonlyArray<{ readonly id: string, readonly state: string, readonly lines: ReadonlyArray<{ readonly operationalLineId: string, readonly quantity: number }> }>, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null } } };

export type VendorCreateProductMutationVariables = Exact<{
  input: OwnCatalogProductInput;
}>;


export type VendorCreateProductMutation = { readonly createOwnCatalogProduct: { readonly id: string } };

export type VendorUpdateProductMutationVariables = Exact<{
  id: string | number;
  input: OwnCatalogProductInput;
}>;


export type VendorUpdateProductMutation = { readonly updateOwnCatalogProduct: { readonly id: string } };

export type VendorCreateVariantMutationVariables = Exact<{
  input: OwnCatalogVariantInput;
}>;


export type VendorCreateVariantMutation = { readonly createOwnCatalogVariant: { readonly id: string } };

export type VendorUpdateVariantMutationVariables = Exact<{
  id: string | number;
  input: OwnCatalogVariantMetadataInput;
}>;


export type VendorUpdateVariantMutation = { readonly updateOwnCatalogVariant: { readonly id: string } };

export type VendorPriceMutationVariables = Exact<{
  id: string | number;
  price: number;
}>;


export type VendorPriceMutation = { readonly updateOwnVariantPrice: { readonly id: string } };

export type VendorRestockMutationVariables = Exact<{
  input: OwnInventoryAdjustmentInput;
}>;


export type VendorRestockMutation = { readonly restockOwnPhysicalInventory: { readonly id: string, readonly operationKey: string, readonly kind: string, readonly status: string, readonly movementIds: ReadonlyArray<string>, readonly orderId: string | null, readonly orderLineId: string | null, readonly fulfillmentId: string | null } };

export type VendorAdjustStockMutationVariables = Exact<{
  input: OwnInventoryAdjustmentInput;
}>;


export type VendorAdjustStockMutation = { readonly adjustOwnPhysicalInventory: { readonly id: string, readonly operationKey: string, readonly kind: string, readonly status: string, readonly movementIds: ReadonlyArray<string>, readonly orderId: string | null, readonly orderLineId: string | null, readonly fulfillmentId: string | null } };

export type VendorFulfillMutationVariables = Exact<{
  input: OwnOperationalInventoryInput;
}>;


export type VendorFulfillMutation = { readonly fulfillOwnExistingOrder: { readonly id: string, readonly operationKey: string, readonly kind: string, readonly status: string, readonly movementIds: ReadonlyArray<string>, readonly orderId: string | null, readonly orderLineId: string | null, readonly fulfillmentId: string | null } };

export type VendorCancelQuantityMutationVariables = Exact<{
  input: OwnOperationalInventoryInput;
}>;


export type VendorCancelQuantityMutation = { readonly cancelOwnUnfulfilledQuantity: { readonly id: string, readonly operationKey: string, readonly kind: string, readonly status: string, readonly movementIds: ReadonlyArray<string>, readonly orderId: string | null, readonly orderLineId: string | null, readonly fulfillmentId: string | null } };

export type VendorCancelFulfillmentMutationVariables = Exact<{
  input: OwnOperationalInventoryInput;
}>;


export type VendorCancelFulfillmentMutation = { readonly cancelOwnExistingFulfillment: { readonly id: string, readonly operationKey: string, readonly kind: string, readonly status: string, readonly movementIds: ReadonlyArray<string>, readonly orderId: string | null, readonly orderLineId: string | null, readonly fulfillmentId: string | null } };

export type CustomerRelationshipFragment = { readonly id: string, readonly customerId: string, readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly status: string, readonly purpose: string, readonly firstActivityAt: string, readonly lastActivityAt: string, readonly purchaseCount: number, readonly attribution: ReadonlyArray<{ readonly currency: string, readonly original: number, readonly refunded: number, readonly remaining: number }> };

export type VendorCustomersQueryVariables = Exact<{
  options: RelationshipPageOptions | null | undefined;
}>;


export type VendorCustomersQuery = { readonly ownCustomers: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly customerId: string, readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly status: string, readonly purpose: string, readonly firstActivityAt: string, readonly lastActivityAt: string, readonly purchaseCount: number, readonly attribution: ReadonlyArray<{ readonly currency: string, readonly original: number, readonly refunded: number, readonly remaining: number }> }> } };

export type VendorCustomerQueryVariables = Exact<{
  id: string | number;
}>;


export type VendorCustomerQuery = { readonly ownCustomerRelationship: { readonly id: string, readonly customerId: string, readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly status: string, readonly purpose: string, readonly firstActivityAt: string, readonly lastActivityAt: string, readonly purchaseCount: number, readonly attribution: ReadonlyArray<{ readonly currency: string, readonly original: number, readonly refunded: number, readonly remaining: number }> } };

export type VendorCustomerHistoryQueryVariables = Exact<{
  customerId: string | number;
  options: RelationshipPageOptions | null | undefined;
}>;


export type VendorCustomerHistoryQuery = { readonly ownCustomerPurchaseHistory: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly operationalOrderId: string, readonly purchasedAt: string, readonly kind: string, readonly marketId: string | null, readonly occurrenceId: string | null, readonly currency: string, readonly original: number, readonly refunded: number, readonly remaining: number, readonly financialStatus: string, readonly nativeState: string, readonly pickupStatus: string, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly operationalLineId: string, readonly variantId: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number }>, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null } }> } };

export type PreorderRuleFragment = { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string };

export type BusinessMembershipFragment = { readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly market: { readonly id: string, readonly name: string, readonly slug: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null };

export type AttendanceFragment = { readonly id: string, readonly occurrenceId: string, readonly membershipId: string, readonly status: string, readonly pickupInstructions: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null };

export type ListingFragment = { readonly id: string, readonly membershipId: string, readonly variantId: string, readonly status: string, readonly version: number };

export type OfferingFragment = { readonly id: string, readonly participationId: string, readonly listingId: string, readonly variantId: string, readonly enabled: boolean, readonly preorderEnabled: boolean, readonly salesCap: number | null, readonly effectivePreorderOpensAt: string, readonly effectivePreorderClosesAt: string, readonly version: number, readonly windowProvenance: { readonly source: string, readonly timezone: string, readonly marketVersion: number, readonly occurrenceVersion: number, readonly membershipVersion: number, readonly participationVersion: number, readonly policyVersion: number, readonly rule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } } };

export type OccurrenceFragment = { readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number };

export type VendorMembershipsQueryVariables = Exact<{ [key: string]: never; }>;


export type VendorMembershipsQuery = { readonly ownMarketBusinessMemberships: ReadonlyArray<{ readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly market: { readonly id: string, readonly name: string, readonly slug: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> };

export type VendorMembershipQueryVariables = Exact<{
  membershipId: string | number;
}>;


export type VendorMembershipQuery = { readonly marketMembershipState: { readonly membership: { readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly market: { readonly id: string, readonly name: string, readonly slug: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }, readonly occurrences: ReadonlyArray<{ readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number }>, readonly participations: ReadonlyArray<{ readonly id: string, readonly occurrenceId: string, readonly membershipId: string, readonly status: string, readonly pickupInstructions: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }>, readonly listings: ReadonlyArray<{ readonly id: string, readonly membershipId: string, readonly variantId: string, readonly status: string, readonly version: number }>, readonly offerings: ReadonlyArray<{ readonly id: string, readonly participationId: string, readonly listingId: string, readonly variantId: string, readonly enabled: boolean, readonly preorderEnabled: boolean, readonly salesCap: number | null, readonly effectivePreorderOpensAt: string, readonly effectivePreorderClosesAt: string, readonly version: number, readonly windowProvenance: { readonly source: string, readonly timezone: string, readonly marketVersion: number, readonly occurrenceVersion: number, readonly membershipVersion: number, readonly participationVersion: number, readonly policyVersion: number, readonly rule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } } }> } };

export type VendorOccurrencesQueryVariables = Exact<{
  membershipId: string | number;
  from: string;
  through: string;
}>;


export type VendorOccurrencesQuery = { readonly ownMarketMembershipOccurrences: ReadonlyArray<{ readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number }> };

export type VendorMarketDefaultMutationVariables = Exact<{
  id: string | number;
  expectedVersion: number;
  rule: MarketPreorderRuleInput | null | undefined;
}>;


export type VendorMarketDefaultMutation = { readonly configureOwnMarketMembershipDefault: { readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly market: { readonly id: string, readonly name: string, readonly slug: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null } };

export type VendorAttendanceMutationVariables = Exact<{
  input: MarketAttendanceInput;
}>;


export type VendorAttendanceMutation = { readonly configureMarketParticipation: { readonly id: string, readonly occurrenceId: string, readonly membershipId: string, readonly status: string, readonly pickupInstructions: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null } };

export type VendorListingMutationVariables = Exact<{
  membershipId: string | number;
  variantId: string | number;
}>;


export type VendorListingMutation = { readonly requestOwnMarketListing: { readonly id: string, readonly membershipId: string, readonly variantId: string, readonly status: string, readonly version: number } };

export type VendorOfferingMutationVariables = Exact<{
  input: MarketOfferingInput;
}>;


export type VendorOfferingMutation = { readonly configureMarketOffering: { readonly id: string, readonly participationId: string, readonly listingId: string, readonly variantId: string, readonly enabled: boolean, readonly preorderEnabled: boolean, readonly salesCap: number | null, readonly effectivePreorderOpensAt: string, readonly effectivePreorderClosesAt: string, readonly version: number, readonly windowProvenance: { readonly source: string, readonly timezone: string, readonly marketVersion: number, readonly occurrenceVersion: number, readonly membershipVersion: number, readonly participationVersion: number, readonly policyVersion: number, readonly rule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } } } };

export type VendorPublishMutationVariables = Exact<{
  listingId: string | number;
}>;


export type VendorPublishMutation = { readonly publishMarketListing: { readonly listingId: string, readonly productId: string, readonly variantId: string, readonly marketId: string, readonly published: boolean } };

export type VendorUnpublishMutationVariables = Exact<{
  listingId: string | number;
}>;


export type VendorUnpublishMutation = { readonly unpublishMarketListing: { readonly listingId: string, readonly productId: string, readonly variantId: string, readonly marketId: string, readonly published: boolean } };

export type AnalyticsMetaFragment = { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string };

export type VendorMetricsFragment = { readonly day: string, readonly currency: string, readonly variantId: string | null, readonly marketId: string | null, readonly occurrenceId: string | null, readonly vendorPurchaseCount: string, readonly directPurchaseCount: string, readonly marketPurchaseCount: string, readonly vendorAttributed: string, readonly settledRefund: string, readonly cohortSettledRefund: string, readonly vendorRemainingAttributed: string, readonly gross: string, readonly discount: string, readonly itemTax: string, readonly shippingNet: string, readonly shippingTax: string, readonly originalUnits: string, readonly refundedOriginalUnits: string, readonly distinctPurchasingCustomers: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly externalPosUnitsObserved: string, readonly externalPosOperations: string };

export type VendorInventoryQueryVariables = Exact<{
  take: number | null | undefined;
  after: string | number | null | undefined;
}>;


export type VendorInventoryQuery = { readonly ownOperationalInventory: { readonly totalItems: number, readonly asOf: string, readonly nextCursor: string | null, readonly items: ReadonlyArray<{ readonly variantId: string, readonly productId: string, readonly productName: string, readonly variantName: string, readonly sku: string, readonly stockOnHand: number, readonly stockAllocated: number, readonly physicalFree: number }> } };

export type VendorTotalsQueryVariables = Exact<{
  vendorId: string | number;
  range: AnalyticsRangeInput;
}>;


export type VendorTotalsQuery = { readonly ownVendorAnalyticsTotals: { readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly currency: string, readonly vendorPurchaseCount: string, readonly directPurchaseCount: string, readonly marketPurchaseCount: string, readonly vendorAttributed: string, readonly settledRefund: string, readonly cohortSettledRefund: string, readonly vendorRemainingAttributed: string, readonly gross: string, readonly discount: string, readonly itemTax: string, readonly shippingNet: string, readonly shippingTax: string, readonly originalUnits: string, readonly refundedOriginalUnits: string, readonly distinctPurchasingCustomers: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly externalPosUnitsObserved: string, readonly externalPosOperations: string }> } };

export type VendorTrendQueryVariables = Exact<{
  vendorId: string | number;
  range: AnalyticsRangeInput;
}>;


export type VendorTrendQuery = { readonly ownVendorAnalyticsTrend: { readonly nextCursor: string | null, readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly day: string, readonly currency: string, readonly variantId: string | null, readonly marketId: string | null, readonly occurrenceId: string | null, readonly vendorPurchaseCount: string, readonly directPurchaseCount: string, readonly marketPurchaseCount: string, readonly vendorAttributed: string, readonly settledRefund: string, readonly cohortSettledRefund: string, readonly vendorRemainingAttributed: string, readonly gross: string, readonly discount: string, readonly itemTax: string, readonly shippingNet: string, readonly shippingTax: string, readonly originalUnits: string, readonly refundedOriginalUnits: string, readonly distinctPurchasingCustomers: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly externalPosUnitsObserved: string, readonly externalPosOperations: string }> } };

export type VendorProductAnalyticsQueryVariables = Exact<{
  vendorId: string | number;
  range: AnalyticsRangeInput;
  variantId: string | number | null | undefined;
}>;


export type VendorProductAnalyticsQuery = { readonly ownVendorProductAnalytics: { readonly nextCursor: string | null, readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly day: string, readonly currency: string, readonly variantId: string | null, readonly marketId: string | null, readonly occurrenceId: string | null, readonly vendorPurchaseCount: string, readonly directPurchaseCount: string, readonly marketPurchaseCount: string, readonly vendorAttributed: string, readonly settledRefund: string, readonly cohortSettledRefund: string, readonly vendorRemainingAttributed: string, readonly gross: string, readonly discount: string, readonly itemTax: string, readonly shippingNet: string, readonly shippingTax: string, readonly originalUnits: string, readonly refundedOriginalUnits: string, readonly distinctPurchasingCustomers: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly externalPosUnitsObserved: string, readonly externalPosOperations: string }> } };

export type VendorMarketAnalyticsQueryVariables = Exact<{
  vendorId: string | number;
  range: AnalyticsRangeInput;
}>;


export type VendorMarketAnalyticsQuery = { readonly ownVendorMarketAnalytics: { readonly nextCursor: string | null, readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly day: string, readonly currency: string, readonly variantId: string | null, readonly marketId: string | null, readonly occurrenceId: string | null, readonly vendorPurchaseCount: string, readonly directPurchaseCount: string, readonly marketPurchaseCount: string, readonly vendorAttributed: string, readonly settledRefund: string, readonly cohortSettledRefund: string, readonly vendorRemainingAttributed: string, readonly gross: string, readonly discount: string, readonly itemTax: string, readonly shippingNet: string, readonly shippingTax: string, readonly originalUnits: string, readonly refundedOriginalUnits: string, readonly distinctPurchasingCustomers: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly externalPosUnitsObserved: string, readonly externalPosOperations: string }> } };

export type VendorOccurrenceAnalyticsQueryVariables = Exact<{
  vendorId: string | number;
  range: AnalyticsRangeInput;
  occurrenceId: string | number | null | undefined;
}>;


export type VendorOccurrenceAnalyticsQuery = { readonly ownVendorOccurrenceAnalytics: { readonly nextCursor: string | null, readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly day: string, readonly currency: string, readonly variantId: string | null, readonly marketId: string | null, readonly occurrenceId: string | null, readonly vendorPurchaseCount: string, readonly directPurchaseCount: string, readonly marketPurchaseCount: string, readonly vendorAttributed: string, readonly settledRefund: string, readonly cohortSettledRefund: string, readonly vendorRemainingAttributed: string, readonly gross: string, readonly discount: string, readonly itemTax: string, readonly shippingNet: string, readonly shippingTax: string, readonly originalUnits: string, readonly refundedOriginalUnits: string, readonly distinctPurchasingCustomers: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly externalPosUnitsObserved: string, readonly externalPosOperations: string }> } };

export type MarketIdentityQueryVariables = Exact<{ [key: string]: never; }>;


export type MarketIdentityQuery = { readonly ownMarketIdentity: { readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly version: number, readonly channelId: string, readonly permissions: ReadonlyArray<string>, readonly membership: { readonly id: string, readonly marketId: string, readonly principalId: string, readonly role: string, readonly status: string } } };

export type OwnedCatalogProductFragment = { readonly id: string, readonly name: string, readonly slug: string, readonly description: string, readonly enabled: boolean, readonly currency: CurrencyCode, readonly variants: ReadonlyArray<{ readonly id: string, readonly name: string, readonly sku: string, readonly enabled: boolean, readonly price: number, readonly currency: CurrencyCode, readonly optionIds: ReadonlyArray<string> }>, readonly optionGroups: ReadonlyArray<{ readonly id: string, readonly name: string, readonly options: ReadonlyArray<{ readonly id: string, readonly name: string, readonly groupId: string }> }> };

export type VendorCatalogQueryVariables = Exact<{
  options: OwnCatalogOptions | null | undefined;
}>;


export type VendorCatalogQuery = { readonly ownVendorCatalog: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly name: string, readonly slug: string, readonly description: string, readonly enabled: boolean, readonly currency: CurrencyCode, readonly variants: ReadonlyArray<{ readonly id: string, readonly name: string, readonly sku: string, readonly enabled: boolean, readonly price: number, readonly currency: CurrencyCode, readonly optionIds: ReadonlyArray<string> }>, readonly optionGroups: ReadonlyArray<{ readonly id: string, readonly name: string, readonly options: ReadonlyArray<{ readonly id: string, readonly name: string, readonly groupId: string }> }> }> } };

export type VendorProductQueryVariables = Exact<{
  productId: string | number;
}>;


export type VendorProductQuery = { readonly ownVendorProduct: { readonly id: string, readonly name: string, readonly slug: string, readonly description: string, readonly enabled: boolean, readonly currency: CurrencyCode, readonly variants: ReadonlyArray<{ readonly id: string, readonly name: string, readonly sku: string, readonly enabled: boolean, readonly price: number, readonly currency: CurrencyCode, readonly optionIds: ReadonlyArray<string> }>, readonly optionGroups: ReadonlyArray<{ readonly id: string, readonly name: string, readonly options: ReadonlyArray<{ readonly id: string, readonly name: string, readonly groupId: string }> }> } };

export type VendorOrdersQueryVariables = Exact<{
  options: OwnOperationalOrderOptions | null | undefined;
}>;


export type VendorOrdersQuery = { readonly ownCommercePortions: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly operationalOrderId: string, readonly vendorId: string, readonly kind: string, readonly marketId: string | null, readonly marketName: string | null, readonly occurrenceId: string | null, readonly occurrenceStartsAt: string | null, readonly placedAt: string | null, readonly lineCount: number, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number, readonly nativeState: string, readonly pickupStatus: string, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly operationalLineId: string, readonly variantId: string, readonly variantName: string, readonly sku: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }>, readonly fulfillments: ReadonlyArray<{ readonly id: string, readonly state: string, readonly lines: ReadonlyArray<{ readonly operationalLineId: string, readonly quantity: number }> }>, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null } }> } };

export type VendorPublicationQueryVariables = Exact<{
  listingId: string | number;
}>;


export type VendorPublicationQuery = { readonly ownListingPublication: { readonly listingId: string, readonly variantId: string, readonly productId: string, readonly marketId: string, readonly state: OwnPublicationStatus } };

export type FeatureAvailabilityQueryVariables = Exact<{
  boundary: string;
}>;


export type FeatureAvailabilityQuery = { readonly ownFeatureAvailability: { readonly boundary: string, readonly state: OwnFeatureAvailabilityState, readonly reason: string, readonly featureCode: string | null } };

export type TenantEntitlementsQueryVariables = Exact<{
  subject: BillingSubjectInput;
}>;


export type TenantEntitlementsQuery = { readonly ownEntitlements: ReadonlyArray<{ readonly featureCode: string, readonly allowed: boolean, readonly reason: string, readonly valueKind: string | null, readonly enabled: boolean | null, readonly unlimited: boolean | null, readonly remaining: number | null, readonly overLimit: boolean | null }> };

export type PlatformScopeQueryVariables = Exact<{ [key: string]: never; }>;


export type PlatformScopeQuery = { readonly platformAdminScope: { readonly permissions: ReadonlyArray<string> } };

export type TenantSummaryFragment = { readonly kind: PlatformTenantKind, readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly createdAt: string, readonly storefrontStatus: string };

export type PlatformDirectoryQueryVariables = Exact<{
  options: PlatformTenantOptions | null | undefined;
}>;


export type PlatformDirectoryQuery = { readonly platformTenants: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly kind: PlatformTenantKind, readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly createdAt: string, readonly storefrontStatus: string }> } };

export type ModuleReadinessFragment = { readonly code: string, readonly state: string, readonly qualification: string, readonly detail: string, readonly asOf: string };

export type ManagementEntitlementFragment = { readonly featureCode: string, readonly allowed: boolean, readonly reason: string, readonly valueKind: string | null, readonly enabled: boolean | null, readonly limit: number | null, readonly unlimited: boolean | null, readonly planVersionId: string | null, readonly subscriptionStatus: string | null, readonly accessPolicyVersion: string | null, readonly overrideId: string | null, readonly currentCount: number | null, readonly committed: number | null, readonly reserved: number | null, readonly remaining: number | null, readonly overLimit: boolean | null, readonly metricCode: string | null, readonly windowPolicy: string | null, readonly windowStart: string | null, readonly windowEnd: string | null };

export type PlatformTenantDetailQueryVariables = Exact<{
  kind: PlatformTenantKind;
  id: string | number;
}>;


export type PlatformTenantDetailQuery = { readonly platformTenant: { readonly billingAccountId: string | null, readonly identity: { readonly kind: PlatformTenantKind, readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly createdAt: string, readonly storefrontStatus: string }, readonly subscription: { readonly id: string, readonly source: string, readonly status: string, readonly planVersionId: string, readonly offerId: string, readonly version: number, readonly accessAllowed: boolean, readonly accessConfigured: boolean, readonly accessPolicyVersion: string } | null, readonly entitlements: ReadonlyArray<{ readonly featureCode: string, readonly allowed: boolean, readonly reason: string, readonly valueKind: string | null, readonly enabled: boolean | null, readonly limit: number | null, readonly unlimited: boolean | null, readonly planVersionId: string | null, readonly subscriptionStatus: string | null, readonly accessPolicyVersion: string | null, readonly overrideId: string | null, readonly currentCount: number | null, readonly committed: number | null, readonly reserved: number | null, readonly remaining: number | null, readonly overLimit: boolean | null, readonly metricCode: string | null, readonly windowPolicy: string | null, readonly windowStart: string | null, readonly windowEnd: string | null }>, readonly integrations: ReadonlyArray<{ readonly code: string, readonly state: string, readonly qualification: string, readonly detail: string, readonly asOf: string }> } };

export type PlatformReadinessQueryVariables = Exact<{ [key: string]: never; }>;


export type PlatformReadinessQuery = { readonly platformIntegrationReadiness: ReadonlyArray<{ readonly code: string, readonly state: string, readonly qualification: string, readonly detail: string, readonly asOf: string }> };

export type PaymentManagementQueryVariables = Exact<{
  mode: PlatformPaymentMode;
}>;


export type PaymentManagementQuery = { readonly ownPaymentConfiguration: { readonly state: string, readonly providerIOAllowed: boolean, readonly qualification: string, readonly fundsFlowPolicy: string }, readonly ownPaymentAccount: { readonly id: string, readonly mode: string, readonly provider: string, readonly accountReference: string, readonly connectionStatus: string, readonly detailsSubmitted: boolean, readonly chargesEnabled: boolean, readonly payoutsEnabled: boolean, readonly cardPayments: string, readonly transfers: string, readonly legacyPayments: string, readonly currentlyDueCount: number, readonly pastDueCount: number, readonly disabledReason: string | null, readonly lastSyncAt: string | null, readonly readiness: ReadonlyArray<{ readonly purpose: string, readonly ready: boolean, readonly reasons: ReadonlyArray<string> }> } | null };

export type ManagementConnectStripeMutationVariables = Exact<{
  mode: StripeAccountMode;
}>;


export type ManagementConnectStripeMutation = { readonly beginOwnStripeConnect: { readonly authorizationUrl: string, readonly expiresAt: string } };

export type ManagementRefreshStripeMutationVariables = Exact<{
  mode: StripeAccountMode;
}>;


export type ManagementRefreshStripeMutation = { readonly refreshOwnPaymentAccount: { readonly id: string, readonly connectionStatus: string } };

export type ManagementDisconnectStripeMutationVariables = Exact<{
  mode: StripeAccountMode;
}>;


export type ManagementDisconnectStripeMutation = { readonly disconnectOwnPaymentAccount: { readonly id: string, readonly connectionStatus: string } };

export type PosManagementQueryVariables = Exact<{ [key: string]: never; }>;


export type PosManagementQuery = { readonly ownPosProviders: unknown, readonly ownPosConnections: unknown, readonly ownPosRuntime: { readonly allowedRedirectUris: ReadonlyArray<string>, readonly approvedPhysicalPolicyId: string | null, readonly approvedPhysicalPolicyVersion: string | null, readonly approvedPhysicalMaxAgeSeconds: number | null, readonly approvedPhysicalProviderCodes: ReadonlyArray<string>, readonly providers: ReadonlyArray<{ readonly providerCode: string, readonly state: string, readonly providerIOAllowed: boolean, readonly localDeterministic: boolean }> } };

export type ManagementMappingSourceQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagementMappingSourceQuery = { readonly ownResourceIdentity: { readonly id: string, readonly canonicalSourceId: string | null } };

export type PosConnectionDetailQueryVariables = Exact<{
  id: string | number;
}>;


export type PosConnectionDetailQuery = { readonly ownPosConnections: unknown, readonly ownPosHealth: unknown, readonly ownPosMappings: unknown };

export type ManagementBeginPosMutationVariables = Exact<{
  input: BeginPosAuthorizationInput;
}>;


export type ManagementBeginPosMutation = { readonly beginOwnPosAuthorization: unknown };

export type ManagementCompletePosMutationVariables = Exact<{
  input: CompletePosAuthorizationInput;
}>;


export type ManagementCompletePosMutation = { readonly completeOwnPosAuthorization: unknown };

export type ManagementConnectPosMutationVariables = Exact<{
  providerCode: string;
  mode: PosMode;
  accountId: string;
}>;


export type ManagementConnectPosMutation = { readonly connectOwnPosPartner: unknown };

export type ManagementRevokePosMutationVariables = Exact<{
  id: string | number;
}>;


export type ManagementRevokePosMutation = { readonly revokeOwnPosConnection: unknown };

export type ManagementMapPosMutationVariables = Exact<{
  input: ConfirmPosMappingInput;
}>;


export type ManagementMapPosMutation = { readonly confirmOwnPosMapping: unknown };

export type ManagementPosPoliciesMutationVariables = Exact<{
  id: string | number;
  expectedVersion: number;
  policies: unknown;
}>;


export type ManagementPosPoliciesMutation = { readonly configureOwnPosPolicies: unknown };

export type ManagementPosLocationsMutationVariables = Exact<{
  id: string | number;
}>;


export type ManagementPosLocationsMutation = { readonly discoverOwnPosLocations: unknown };

export type ManagementPosCatalogMutationVariables = Exact<{
  id: string | number;
  cursor: string | null | undefined;
}>;


export type ManagementPosCatalogMutation = { readonly discoverOwnPosCatalog: unknown };

export type ManagementPosSyncMutationVariables = Exact<{
  id: string | number;
  stream: PosStream;
  key: string;
}>;


export type ManagementPosSyncMutation = { readonly syncOwnPos: unknown };

export type TenantBillingQueryVariables = Exact<{
  subject: BillingSubjectInput;
}>;


export type TenantBillingQuery = { readonly ownBillingConfiguration: { readonly state: string, readonly externalActionsAllowed: boolean, readonly subscriptionSource: string | null }, readonly ownSubscription: { readonly id: string, readonly status: string, readonly planVersionId: string, readonly offerId: string, readonly periodStart: string | null, readonly periodEnd: string | null, readonly cancelAtPeriodEnd: boolean, readonly version: number, readonly pendingChange: { readonly id: string, readonly changeType: string, readonly timing: string, readonly state: string, readonly toPlanVersionId: string | null, readonly toOfferId: string | null, readonly effectiveAt: string | null } | null } | null, readonly ownEntitlements: ReadonlyArray<{ readonly featureCode: string, readonly allowed: boolean, readonly reason: string, readonly valueKind: string | null, readonly enabled: boolean | null, readonly limit: number | null, readonly unlimited: boolean | null, readonly planVersionId: string | null, readonly subscriptionStatus: string | null, readonly accessPolicyVersion: string | null, readonly overrideId: string | null, readonly currentCount: number | null, readonly committed: number | null, readonly reserved: number | null, readonly remaining: number | null, readonly overLimit: boolean | null, readonly metricCode: string | null, readonly windowPolicy: string | null, readonly windowStart: string | null, readonly windowEnd: string | null }>, readonly ownUsage: ReadonlyArray<{ readonly featureCode: string, readonly allowed: boolean, readonly reason: string, readonly valueKind: string | null, readonly enabled: boolean | null, readonly limit: number | null, readonly unlimited: boolean | null, readonly planVersionId: string | null, readonly subscriptionStatus: string | null, readonly accessPolicyVersion: string | null, readonly overrideId: string | null, readonly currentCount: number | null, readonly committed: number | null, readonly reserved: number | null, readonly remaining: number | null, readonly overLimit: boolean | null, readonly metricCode: string | null, readonly windowPolicy: string | null, readonly windowStart: string | null, readonly windowEnd: string | null }>, readonly availableBillingOffers: ReadonlyArray<{ readonly id: string, readonly code: string, readonly planVersionId: string, readonly currency: string, readonly amount: number, readonly cadenceInterval: string, readonly cadenceCount: number }> };

export type PlatformCatalogQueryVariables = Exact<{
  section: PlatformCatalogSection;
  options: PlatformCatalogOptions | null | undefined;
}>;


export type PlatformCatalogQuery = { readonly platformBillingCatalog: { readonly totalItems: number, readonly registeredFeatures: ReadonlyArray<{ readonly featureCode: string, readonly valueKind: string, readonly semantics: string, readonly subjects: ReadonlyArray<string> }>, readonly items: ReadonlyArray<{ readonly id: string, readonly code: string | null, readonly displayName: string | null, readonly status: string | null, readonly defaultPublishedVersionId: string | null, readonly planId: string | null, readonly versionNumber: number | null, readonly policyVersion: string | null, readonly publishedAt: string | null, readonly retiredAt: string | null, readonly planVersionId: string | null, readonly featureId: string | null, readonly featureCode: string | null, readonly valueKind: string | null, readonly semantics: string | null, readonly vendorSupported: boolean | null, readonly marketSupported: boolean | null, readonly enabled: boolean | null, readonly limitValue: number | null, readonly unlimited: boolean | null, readonly metricId: string | null, readonly allowanceAmount: number | null, readonly windowPolicy: string | null, readonly currency: string | null, readonly amount: number | null, readonly cadenceKind: string | null, readonly cadenceInterval: string | null, readonly cadenceCount: number | null, readonly billingModel: string | null, readonly metricCode: string | null, readonly aggregationKind: string | null, readonly unit: string | null, readonly sourceType: string | null, readonly version: string | null, readonly stateAccess: unknown, readonly timing: string | null, readonly proration: string | null, readonly offerId: string | null, readonly providerCode: string | null, readonly mode: string | null, readonly validatedAt: string | null, readonly billingAccountId: string | null, readonly startsAt: string | null, readonly endsAt: string | null, readonly reasonCode: string | null, readonly source: string | null, readonly revokedAt: string | null }> } };

export type ManagementProvisionVendorMutationVariables = Exact<{
  input: PlatformProvisionVendorInput;
}>;


export type ManagementProvisionVendorMutation = { readonly platformProvisionVendor: { readonly kind: PlatformTenantKind, readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly createdAt: string, readonly storefrontStatus: string } };

export type ManagementProvisionMarketMutationVariables = Exact<{
  input: PlatformProvisionMarketInput;
}>;


export type ManagementProvisionMarketMutation = { readonly platformProvisionMarket: { readonly kind: PlatformTenantKind, readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly createdAt: string, readonly storefrontStatus: string } };

export type ManagementCreatePlanMutationVariables = Exact<{
  code: string;
  displayName: string;
  description: string | null | undefined;
}>;


export type ManagementCreatePlanMutation = { readonly createSaasPlan: { readonly id: string } };

export type ManagementEditPlanMutationVariables = Exact<{
  id: string | number;
  displayName: string;
  status: string;
}>;


export type ManagementEditPlanMutation = { readonly editSaasPlan: { readonly id: string } };

export type ManagementCreateVersionMutationVariables = Exact<{
  planId: string | number;
  versionNumber: number;
  policyVersion: string;
}>;


export type ManagementCreateVersionMutation = { readonly createSaasPlanVersion: { readonly id: string } };

export type ManagementSetRuleMutationVariables = Exact<{
  input: SaasRuleInput;
}>;


export type ManagementSetRuleMutation = { readonly setDraftSaasRule: { readonly id: string } };

export type ManagementPublishVersionMutationVariables = Exact<{
  id: string | number;
}>;


export type ManagementPublishVersionMutation = { readonly publishSaasPlanVersion: { readonly id: string } };

export type ManagementRetireVersionMutationVariables = Exact<{
  id: string | number;
}>;


export type ManagementRetireVersionMutation = { readonly retireSaasPlanVersion: { readonly id: string } };

export type ManagementDefaultVersionMutationVariables = Exact<{
  planId: string | number;
  versionId: string | number;
}>;


export type ManagementDefaultVersionMutation = { readonly setDefaultSaasPlanVersion: { readonly id: string } };

export type ManagementCreateOfferMutationVariables = Exact<{
  input: SaasOfferInput;
}>;


export type ManagementCreateOfferMutation = { readonly createSaasBillingOffer: { readonly id: string } };

export type ManagementRegisterFeatureMutationVariables = Exact<{
  code: string;
}>;


export type ManagementRegisterFeatureMutation = { readonly registerSaasFeature: { readonly id: string } };

export type ManagementCreateMetricMutationVariables = Exact<{
  input: SaasMetricInput;
}>;


export type ManagementCreateMetricMutation = { readonly createSaasUsageMetric: { readonly id: string } };

export type ManagementAccessPolicyMutationVariables = Exact<{
  code: string;
  version: string;
  stateAccess: unknown;
}>;


export type ManagementAccessPolicyMutation = { readonly createSaasAccessPolicy: { readonly id: string } };

export type ManagementChangePolicyMutationVariables = Exact<{
  input: SaasChangePolicyInput;
}>;


export type ManagementChangePolicyMutation = { readonly createSaasChangePolicy: { readonly id: string } };

export type ManagementAssignInternalMutationVariables = Exact<{
  subject: BillingSubjectInput;
  offerId: string | number;
}>;


export type ManagementAssignInternalMutation = { readonly assignInternalSaasSubscription: { readonly id: string } };

export type ManagementMigrateInternalMutationVariables = Exact<{
  subscriptionId: string | number;
  offerId: string | number;
  key: string;
}>;


export type ManagementMigrateInternalMutation = { readonly migrateInternalSaasSubscription: { readonly id: string } };

export type ManagementGrantOverrideMutationVariables = Exact<{
  input: SaasOverrideInput;
}>;


export type ManagementGrantOverrideMutation = { readonly grantSaasEntitlementOverride: { readonly id: string } };

export type ManagementRevokeOverrideMutationVariables = Exact<{
  id: string | number;
}>;


export type ManagementRevokeOverrideMutation = { readonly revokeSaasEntitlementOverride: { readonly id: string } };

export type OwnMarketOperationsQueryVariables = Exact<{
  section: MarketOperationsSection;
  occurrenceId: number | null | undefined;
}>;


export type OwnMarketOperationsQuery = { readonly ownMarketOperations: unknown };

export type MarketOperationsCommandMutationVariables = Exact<{
  input: MarketOperationsCommand;
}>;


export type MarketOperationsCommandMutation = { readonly marketOperationsCommand: unknown };

export type OwnVendorBoothAssignmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type OwnVendorBoothAssignmentsQuery = { readonly ownVendorBoothAssignments: unknown };

export type MarketConfigurationFragment = { readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly version: number, readonly recurrenceVersion: number, readonly policyVersion: number, readonly recurrence: { readonly frequency: string | null, readonly weekInterval: number | null, readonly monthWeeks: ReadonlyArray<number> | null, readonly weekdays: ReadonlyArray<number>, readonly startTime: string, readonly endTime: string, readonly endDayOffset: number, readonly effectiveFrom: string, readonly effectiveUntil: string | null } | null, readonly defaultPreorderRule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string }, readonly overridePolicy: { readonly membershipAllowed: boolean, readonly participationAllowed: boolean, readonly vendorWindowMode: string, readonly closeMinutesBeforeStart: number } };

export type MarketOccurrenceFieldsFragment = { readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null };

export type MarketConfigurationQueryVariables = Exact<{
  id: string | number;
}>;


export type MarketConfigurationQuery = { readonly ownMarket: { readonly id: string, readonly name: string, readonly slug: string, readonly status: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly version: number, readonly recurrenceVersion: number, readonly policyVersion: number, readonly recurrence: { readonly frequency: string | null, readonly weekInterval: number | null, readonly monthWeeks: ReadonlyArray<number> | null, readonly weekdays: ReadonlyArray<number>, readonly startTime: string, readonly endTime: string, readonly endDayOffset: number, readonly effectiveFrom: string, readonly effectiveUntil: string | null } | null, readonly defaultPreorderRule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string }, readonly overridePolicy: { readonly membershipAllowed: boolean, readonly participationAllowed: boolean, readonly vendorWindowMode: string, readonly closeMinutesBeforeStart: number } } };

export type MarketOccurrencesQueryVariables = Exact<{
  marketId: string | number;
  from: string;
  through: string;
}>;


export type MarketOccurrencesQuery = { readonly marketOccurrences: ReadonlyArray<{ readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> };

export type MarketRelationshipsQueryVariables = Exact<{
  marketId: string | number;
}>;


export type MarketRelationshipsQuery = { readonly marketVendorMemberships: ReadonlyArray<{ readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly market: { readonly id: string, readonly name: string, readonly slug: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> };

export type MarketRelationshipStateQueryVariables = Exact<{
  membershipId: string | number;
}>;


export type MarketRelationshipStateQuery = { readonly marketMembershipState: { readonly membership: { readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly market: { readonly id: string, readonly name: string, readonly slug: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }, readonly occurrences: ReadonlyArray<{ readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }>, readonly participations: ReadonlyArray<{ readonly id: string, readonly occurrenceId: string, readonly membershipId: string, readonly status: string, readonly pickupInstructions: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }>, readonly listings: ReadonlyArray<{ readonly id: string, readonly membershipId: string, readonly variantId: string, readonly status: string, readonly version: number }>, readonly offerings: ReadonlyArray<{ readonly id: string, readonly participationId: string, readonly listingId: string, readonly variantId: string, readonly enabled: boolean, readonly preorderEnabled: boolean, readonly salesCap: number | null, readonly effectivePreorderOpensAt: string, readonly effectivePreorderClosesAt: string, readonly version: number, readonly windowProvenance: { readonly source: string, readonly timezone: string, readonly marketVersion: number, readonly occurrenceVersion: number, readonly membershipVersion: number, readonly participationVersion: number, readonly policyVersion: number, readonly rule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } } }> } };

export type MarketConfigureMutationVariables = Exact<{
  input: ConfigureMarketInput;
}>;


export type MarketConfigureMutation = { readonly configureOwnMarket: { readonly id: string, readonly version: number } };

export type MarketRecurrenceMutationVariables = Exact<{
  marketId: string | number;
  expectedVersion: number;
  recurrence: WeeklyRecurrenceInput | null | undefined;
}>;


export type MarketRecurrenceMutation = { readonly reviseMarketRecurrence: { readonly id: string, readonly version: number, readonly recurrenceVersion: number } };

export type MarketGenerateMutationVariables = Exact<{
  marketId: string | number;
  from: string;
  through: string;
}>;


export type MarketGenerateMutation = { readonly generateMarketOccurrences: ReadonlyArray<{ readonly id: string, readonly version: number }> };

export type MarketEnqueueMutationVariables = Exact<{
  marketId: string | number;
  from: string;
  through: string;
}>;


export type MarketEnqueueMutation = { readonly enqueueMarketOccurrenceGeneration: { readonly id: string } };

export type MarketManualMutationVariables = Exact<{
  marketId: string | number;
  scheduleDate: string;
  generationKey: string;
  input: MarketSessionInput;
}>;


export type MarketManualMutation = { readonly createManualMarketOccurrence: { readonly id: string, readonly version: number } };

export type MarketReviseOccurrenceMutationVariables = Exact<{
  id: string | number;
  expectedVersion: number;
  input: MarketSessionInput;
}>;


export type MarketReviseOccurrenceMutation = { readonly reviseMarketOccurrence: { readonly id: string, readonly version: number } };

export type MarketCancelOccurrenceMutationVariables = Exact<{
  id: string | number;
  expectedVersion: number;
}>;


export type MarketCancelOccurrenceMutation = { readonly cancelMarketOccurrence: { readonly id: string, readonly version: number } };

export type MarketMembershipStatusMutationVariables = Exact<{
  marketId: string | number;
  vendorId: string | number;
  status: MarketBusinessMembershipStatus;
  expectedVersion: number | null | undefined;
}>;


export type MarketMembershipStatusMutation = { readonly setMarketVendorMembership: { readonly id: string, readonly version: number } };

export type MarketApproveListingMutationVariables = Exact<{
  id: string | number;
  expectedVersion: number;
  status: MarketListingApprovalStatus;
}>;


export type MarketApproveListingMutation = { readonly approveMarketListing: { readonly id: string, readonly version: number } };

export type MarketParticipationMutationVariables = Exact<{
  input: MarketAttendanceInput;
}>;


export type MarketParticipationMutation = { readonly configureMarketParticipation: { readonly id: string, readonly version: number } };

export type MarketConfigureOfferingMutationVariables = Exact<{
  input: MarketOfferingInput;
}>;


export type MarketConfigureOfferingMutation = { readonly configureMarketOffering: { readonly id: string, readonly version: number } };

export type MarketRematerializeMutationVariables = Exact<{
  id: string | number;
  expectedVersion: number;
}>;


export type MarketRematerializeMutation = { readonly rematerializeMarketOfferingWindow: { readonly id: string, readonly version: number } };

export type MarketOperationsQueryVariables = Exact<{
  occurrenceId: string | number;
  options: OwnMarketPageOptions | null | undefined;
}>;


export type MarketOperationsQuery = { readonly ownOccurrenceCustomerOperations: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly customerOrderId: string, readonly occurrenceId: string, readonly portions: ReadonlyArray<{ readonly operationalOrderId: string, readonly vendorId: string, readonly nativeState: string, readonly pickupStatus: string, readonly lines: ReadonlyArray<{ readonly operationalLineId: string, readonly variantId: string, readonly variantName: string, readonly sku: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }>, readonly fulfillments: ReadonlyArray<{ readonly id: string, readonly state: string, readonly lines: ReadonlyArray<{ readonly operationalLineId: string, readonly quantity: number }> }>, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null } }> }> } };

export type MarketOperationalMetricsFragment = { readonly day: string, readonly occurrenceId: string | null, readonly purchaseCount: string, readonly marketPurchaseCount: string, readonly purchasingVendors: string, readonly participatingVendors: string, readonly originalUnits: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly plannedParticipations: string, readonly confirmedParticipations: string, readonly cancelledParticipations: string };

export type MarketAnalyticsQueryVariables = Exact<{
  marketId: string | number;
  range: AnalyticsRangeInput;
}>;


export type MarketAnalyticsQuery = { readonly ownMarketAnalytics: { readonly nextCursor: string | null, readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly day: string, readonly occurrenceId: string | null, readonly purchaseCount: string, readonly marketPurchaseCount: string, readonly purchasingVendors: string, readonly participatingVendors: string, readonly originalUnits: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly plannedParticipations: string, readonly confirmedParticipations: string, readonly cancelledParticipations: string }> } };

export type MarketOccurrenceAnalyticsQueryVariables = Exact<{
  marketId: string | number;
  range: AnalyticsRangeInput;
  occurrenceId: string | number | null | undefined;
}>;


export type MarketOccurrenceAnalyticsQuery = { readonly ownMarketOccurrenceAnalytics: { readonly nextCursor: string | null, readonly metadata: { readonly projectionCode: string, readonly schemaVersion: number, readonly status: string, readonly generationId: string | null, readonly activeGenerationId: string | null, readonly sourceAsOf: string | null, readonly asOf: string | null, readonly completeness: string, readonly lastSuccessfulAt: string | null, readonly lastReconciledAt: string | null, readonly errorCode: string | null, readonly technicalBucket: string, readonly marketFinancialPolicy: string }, readonly items: ReadonlyArray<{ readonly day: string, readonly occurrenceId: string | null, readonly purchaseCount: string, readonly marketPurchaseCount: string, readonly purchasingVendors: string, readonly participatingVendors: string, readonly originalUnits: string, readonly fulfilledUnits: string, readonly cancelledUnits: string, readonly awaitingPortions: string, readonly completedPortions: string, readonly cancelledPortions: string, readonly plannedParticipations: string, readonly confirmedParticipations: string, readonly cancelledParticipations: string }> } };

export type MarketVendorDisplayFieldsFragment = { readonly id: string, readonly name: string, readonly slug: string, readonly status: string };

export type MarketOrganizerMembershipFieldsFragment = { readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly vendor: { readonly id: string, readonly name: string, readonly slug: string, readonly status: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null };

export type MarketOrganizerListingFieldsFragment = { readonly id: string, readonly membershipId: string, readonly variantId: string, readonly status: string, readonly version: number, readonly variant: { readonly id: string, readonly name: string, readonly sku: string, readonly product: { readonly id: string, readonly name: string } }, readonly publication: { readonly listingId: string, readonly variantId: string, readonly productId: string, readonly marketId: string, readonly state: OwnPublicationStatus } };

export type MarketEligibleVendorsQueryVariables = Exact<{
  options: OwnMarketVendorDirectoryOptions | null | undefined;
}>;


export type MarketEligibleVendorsQuery = { readonly ownMarketEligibleVendors: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly name: string, readonly slug: string, readonly status: string }> } };

export type MarketVendorPageQueryVariables = Exact<{
  options: OwnMarketVendorOptions | null | undefined;
}>;


export type MarketVendorPageQuery = { readonly ownMarketVendorMemberships: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly vendor: { readonly id: string, readonly name: string, readonly slug: string, readonly status: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> } };

export type MarketOccurrencePageQueryVariables = Exact<{
  options: OwnMarketOccurrenceOptions | null | undefined;
}>;


export type MarketOccurrencePageQuery = { readonly ownMarketOccurrences: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> } };

export type MarketOccurrenceDetailQueryVariables = Exact<{
  id: string | number;
}>;


export type MarketOccurrenceDetailQuery = { readonly ownMarketOccurrence: { readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null } };

export type MarketRelationshipDetailQueryVariables = Exact<{
  id: string | number;
  occurrences: OwnMarketOccurrenceOptions | null | undefined;
  participations: OwnMarketPageOptions | null | undefined;
  listings: OwnMarketPageOptions | null | undefined;
  offerings: OwnMarketPageOptions | null | undefined;
}>;


export type MarketRelationshipDetailQuery = { readonly membership: { readonly id: string, readonly marketId: string, readonly vendorId: string, readonly status: string, readonly version: number, readonly vendor: { readonly id: string, readonly name: string, readonly slug: string, readonly status: string }, readonly preorderDefault: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }, readonly occurrences: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> }, readonly participations: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly occurrenceId: string, readonly membershipId: string, readonly status: string, readonly pickupInstructions: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null }> }, readonly listings: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly membershipId: string, readonly variantId: string, readonly status: string, readonly version: number, readonly variant: { readonly id: string, readonly name: string, readonly sku: string, readonly product: { readonly id: string, readonly name: string } }, readonly publication: { readonly listingId: string, readonly variantId: string, readonly productId: string, readonly marketId: string, readonly state: OwnPublicationStatus } }> }, readonly offerings: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly participationId: string, readonly listingId: string, readonly variantId: string, readonly enabled: boolean, readonly preorderEnabled: boolean, readonly salesCap: number | null, readonly effectivePreorderOpensAt: string, readonly effectivePreorderClosesAt: string, readonly version: number, readonly windowProvenance: { readonly source: string, readonly timezone: string, readonly marketVersion: number, readonly occurrenceVersion: number, readonly membershipVersion: number, readonly participationVersion: number, readonly policyVersion: number, readonly rule: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } } }> } };

export type MarketOverviewSummaryQueryVariables = Exact<{
  options: OwnMarketOverviewOptions | null | undefined;
}>;


export type MarketOverviewSummaryQuery = { readonly ownMarketOverviewSummary: { readonly asOf: string, readonly totalVendorRelationships: number, readonly approvedVendorRelationships: number, readonly pendingVendorRelationships: number, readonly suspendedVendorRelationships: number, readonly withdrawnVendorRelationships: number, readonly upcomingScheduledOccurrences: number, readonly nextOccurrence: { readonly source: string, readonly localStartsAt: string, readonly localEndsAt: string, readonly originalLocalStart: string, readonly originalLocalEnd: string, readonly recurrenceVersion: number, readonly configurationVersion: number, readonly policyVersion: number, readonly id: string, readonly marketId: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string, readonly pickupInstructions: string, readonly status: string, readonly version: number, readonly preorderOverride: { readonly opensDaysBefore: number, readonly opensTime: string, readonly closesDaysBefore: number, readonly closesTime: string } | null } | null } };

export type MarketListingPublicationQueryVariables = Exact<{
  listingId: string | number;
}>;


export type MarketListingPublicationQuery = { readonly ownMarketListingPublication: { readonly listingId: string, readonly variantId: string, readonly productId: string, readonly marketId: string, readonly state: OwnPublicationStatus } };

export type MarketGenerationStatusQueryVariables = Exact<{
  jobId: string | number;
}>;


export type MarketGenerationStatusQuery = { readonly ownMarketOccurrenceGenerationStatus: { readonly jobId: string, readonly status: MarketGenerationStatus, readonly submittedAt: string, readonly startedAt: string | null, readonly settledAt: string | null, readonly errorCode: string | null, readonly matchedOccurrences: number | null } };

export const CommandReceiptFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommandReceipt"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryCommandReceipt"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationKey"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"movementIds"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"orderLineId"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentId"}}]}}]} as unknown as DocumentNode<CommandReceiptFragment, unknown>;
export const PickupFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Pickup"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePickupPromise"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]} as unknown as DocumentNode<PickupFragment, unknown>;
export const PortionFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Portion"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePortion"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"marketName"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"placedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lineCount"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fulfillments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Pickup"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Pickup"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePickupPromise"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]} as unknown as DocumentNode<PortionFragment, unknown>;
export const CustomerRelationshipFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CustomerRelationship"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorCustomerProjection"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"customerId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"firstActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"original"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}}]}}]}}]} as unknown as DocumentNode<CustomerRelationshipFragment, unknown>;
export const PreorderRuleFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<PreorderRuleFragment, unknown>;
export const BusinessMembershipFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BusinessMembership"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"market"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<BusinessMembershipFragment, unknown>;
export const AttendanceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Attendance"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendance"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<AttendanceFragment, unknown>;
export const ListingFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Listing"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantListing"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]} as unknown as DocumentNode<ListingFragment, unknown>;
export const OfferingFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Offering"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantOffering"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"participationId"}},{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"preorderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"salesCap"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderOpensAt"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderClosesAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"windowProvenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"marketVersion"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"membershipVersion"}},{"kind":"Field","name":{"kind":"Name","value":"participationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"rule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<OfferingFragment, unknown>;
export const AnalyticsMetaFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}}]} as unknown as DocumentNode<AnalyticsMetaFragment, unknown>;
export const VendorMetricsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VendorMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"directPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"vendorAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"settledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"cohortSettledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"vendorRemainingAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"gross"}},{"kind":"Field","name":{"kind":"Name","value":"discount"}},{"kind":"Field","name":{"kind":"Name","value":"itemTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingNet"}},{"kind":"Field","name":{"kind":"Name","value":"shippingTax"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"refundedOriginalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"distinctPurchasingCustomers"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosUnitsObserved"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosOperations"}}]}}]} as unknown as DocumentNode<VendorMetricsFragment, unknown>;
export const OwnedCatalogProductFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OwnedCatalogProduct"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogProduct"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"optionIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"optionGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]} as unknown as DocumentNode<OwnedCatalogProductFragment, unknown>;
export const TenantSummaryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TenantSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"storefrontStatus"}}]}}]} as unknown as DocumentNode<TenantSummaryFragment, unknown>;
export const ModuleReadinessFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ModuleReadiness"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegrationModuleStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"qualification"}},{"kind":"Field","name":{"kind":"Name","value":"detail"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}}]}}]} as unknown as DocumentNode<ModuleReadinessFragment, unknown>;
export const ManagementEntitlementFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagementEntitlement"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OwnEntitlement"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"featureCode"}},{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"valueKind"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"unlimited"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"accessPolicyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"overrideId"}},{"kind":"Field","name":{"kind":"Name","value":"currentCount"}},{"kind":"Field","name":{"kind":"Name","value":"committed"}},{"kind":"Field","name":{"kind":"Name","value":"reserved"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"overLimit"}},{"kind":"Field","name":{"kind":"Name","value":"metricCode"}},{"kind":"Field","name":{"kind":"Name","value":"windowPolicy"}},{"kind":"Field","name":{"kind":"Name","value":"windowStart"}},{"kind":"Field","name":{"kind":"Name","value":"windowEnd"}}]}}]} as unknown as DocumentNode<ManagementEntitlementFragment, unknown>;
export const MarketConfigurationFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketConfiguration"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketDomain"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"weekInterval"}},{"kind":"Field","name":{"kind":"Name","value":"monthWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"weekdays"}},{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"endDayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}}]}},{"kind":"Field","name":{"kind":"Name","value":"defaultPreorderRule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}},{"kind":"Field","name":{"kind":"Name","value":"overridePolicy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"participationAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"vendorWindowMode"}},{"kind":"Field","name":{"kind":"Name","value":"closeMinutesBeforeStart"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<MarketConfigurationFragment, unknown>;
export const OccurrenceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]} as unknown as DocumentNode<OccurrenceFragment, unknown>;
export const MarketOccurrenceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<MarketOccurrenceFieldsFragment, unknown>;
export const MarketOperationalMetricsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOperationalMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"purchasingVendors"}},{"kind":"Field","name":{"kind":"Name","value":"participatingVendors"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"plannedParticipations"}},{"kind":"Field","name":{"kind":"Name","value":"confirmedParticipations"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledParticipations"}}]}}]} as unknown as DocumentNode<MarketOperationalMetricsFragment, unknown>;
export const MarketVendorDisplayFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketVendorDisplayFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVendorDisplay"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<MarketVendorDisplayFieldsFragment, unknown>;
export const MarketOrganizerMembershipFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOrganizerMembershipFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOrganizerMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketVendorDisplayFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketVendorDisplayFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVendorDisplay"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}}]} as unknown as DocumentNode<MarketOrganizerMembershipFieldsFragment, unknown>;
export const MarketOrganizerListingFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOrganizerListingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOrganizerListing"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publication"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<MarketOrganizerListingFieldsFragment, unknown>;
export const AdminSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"channels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]}}]} as unknown as DocumentNode<AdminSessionQuery, AdminSessionQueryVariables>;
export const AdminLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rememberMe"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"rememberMe"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rememberMe"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurrentUser"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"channels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ErrorResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errorCode"}}]}}]}}]}}]} as unknown as DocumentNode<AdminLoginMutation, AdminLoginMutationVariables>;
export const AdminLogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminLogout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<AdminLogoutMutation, AdminLogoutMutationVariables>;
export const VendorIdentityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorIdentity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorIdentity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"channelId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"memberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"principalId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}}]} as unknown as DocumentNode<VendorIdentityQuery, VendorIdentityQueryVariables>;
export const VendorPortionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorPortion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownCommercePortion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Portion"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Pickup"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePickupPromise"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Portion"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePortion"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"marketName"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"placedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lineCount"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fulfillments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Pickup"}}]}}]}}]} as unknown as DocumentNode<VendorPortionQuery, VendorPortionQueryVariables>;
export const VendorCreateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorCreateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOwnCatalogProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<VendorCreateProductMutation, VendorCreateProductMutationVariables>;
export const VendorUpdateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorUpdateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOwnCatalogProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<VendorUpdateProductMutation, VendorUpdateProductMutationVariables>;
export const VendorCreateVariantDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorCreateVariant"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogVariantInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOwnCatalogVariant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<VendorCreateVariantMutation, VendorCreateVariantMutationVariables>;
export const VendorUpdateVariantDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorUpdateVariant"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogVariantMetadataInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOwnCatalogVariant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<VendorUpdateVariantMutation, VendorUpdateVariantMutationVariables>;
export const VendorPriceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorPrice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"price"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateOwnVariantPrice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"price"},"value":{"kind":"Variable","name":{"kind":"Name","value":"price"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<VendorPriceMutation, VendorPriceMutationVariables>;
export const VendorRestockDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorRestock"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnInventoryAdjustmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"restockOwnPhysicalInventory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CommandReceipt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommandReceipt"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryCommandReceipt"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationKey"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"movementIds"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"orderLineId"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentId"}}]}}]} as unknown as DocumentNode<VendorRestockMutation, VendorRestockMutationVariables>;
export const VendorAdjustStockDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorAdjustStock"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnInventoryAdjustmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adjustOwnPhysicalInventory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CommandReceipt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommandReceipt"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryCommandReceipt"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationKey"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"movementIds"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"orderLineId"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentId"}}]}}]} as unknown as DocumentNode<VendorAdjustStockMutation, VendorAdjustStockMutationVariables>;
export const VendorFulfillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorFulfill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnOperationalInventoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fulfillOwnExistingOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CommandReceipt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommandReceipt"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryCommandReceipt"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationKey"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"movementIds"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"orderLineId"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentId"}}]}}]} as unknown as DocumentNode<VendorFulfillMutation, VendorFulfillMutationVariables>;
export const VendorCancelQuantityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorCancelQuantity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnOperationalInventoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOwnUnfulfilledQuantity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CommandReceipt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommandReceipt"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryCommandReceipt"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationKey"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"movementIds"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"orderLineId"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentId"}}]}}]} as unknown as DocumentNode<VendorCancelQuantityMutation, VendorCancelQuantityMutationVariables>;
export const VendorCancelFulfillmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorCancelFulfillment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnOperationalInventoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOwnExistingFulfillment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CommandReceipt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommandReceipt"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryCommandReceipt"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationKey"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"movementIds"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"orderLineId"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentId"}}]}}]} as unknown as DocumentNode<VendorCancelFulfillmentMutation, VendorCancelFulfillmentMutationVariables>;
export const VendorCustomersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorCustomers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RelationshipPageOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownCustomers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CustomerRelationship"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CustomerRelationship"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorCustomerProjection"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"customerId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"firstActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"original"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}}]}}]}}]} as unknown as DocumentNode<VendorCustomersQuery, VendorCustomersQueryVariables>;
export const VendorCustomerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorCustomer"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownCustomerRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CustomerRelationship"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CustomerRelationship"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorCustomerProjection"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"customerId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"firstActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastActivityAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"attribution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"original"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}}]}}]}}]} as unknown as DocumentNode<VendorCustomerQuery, VendorCustomerQueryVariables>;
export const VendorCustomerHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorCustomerHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"customerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RelationshipPageOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownCustomerPurchaseHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"customerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"customerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"purchasedAt"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"original"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"financialStatus"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Pickup"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Pickup"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePickupPromise"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]} as unknown as DocumentNode<VendorCustomerHistoryQuery, VendorCustomerHistoryQueryVariables>;
export const VendorMembershipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorMemberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketBusinessMemberships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BusinessMembership"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BusinessMembership"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"market"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<VendorMembershipsQuery, VendorMembershipsQueryVariables>;
export const VendorMembershipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorMembership"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketMembershipState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BusinessMembership"}}]}},{"kind":"Field","name":{"kind":"Name","value":"occurrences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}}]}},{"kind":"Field","name":{"kind":"Name","value":"participations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Attendance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"listings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Listing"}}]}},{"kind":"Field","name":{"kind":"Name","value":"offerings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Offering"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BusinessMembership"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"market"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Attendance"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendance"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Listing"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantListing"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Offering"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantOffering"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"participationId"}},{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"preorderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"salesCap"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderOpensAt"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderClosesAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"windowProvenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"marketVersion"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"membershipVersion"}},{"kind":"Field","name":{"kind":"Name","value":"participationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"rule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]}}]} as unknown as DocumentNode<VendorMembershipQuery, VendorMembershipQueryVariables>;
export const VendorOccurrencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorOccurrences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"through"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketMembershipOccurrences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"through"},"value":{"kind":"Variable","name":{"kind":"Name","value":"through"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]} as unknown as DocumentNode<VendorOccurrencesQuery, VendorOccurrencesQueryVariables>;
export const VendorMarketDefaultDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorMarketDefault"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rule"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRuleInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureOwnMarketMembershipDefault"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}},{"kind":"Argument","name":{"kind":"Name","value":"rule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rule"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BusinessMembership"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BusinessMembership"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"market"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<VendorMarketDefaultMutation, VendorMarketDefaultMutationVariables>;
export const VendorAttendanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorAttendance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendanceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureMarketParticipation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Attendance"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Attendance"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendance"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<VendorAttendanceMutation, VendorAttendanceMutationVariables>;
export const VendorListingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorListing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestOwnMarketListing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}}},{"kind":"Argument","name":{"kind":"Name","value":"variantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Listing"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Listing"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantListing"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]} as unknown as DocumentNode<VendorListingMutation, VendorListingMutationVariables>;
export const VendorOfferingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorOffering"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOfferingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureMarketOffering"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Offering"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Offering"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantOffering"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"participationId"}},{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"preorderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"salesCap"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderOpensAt"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderClosesAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"windowProvenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"marketVersion"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"membershipVersion"}},{"kind":"Field","name":{"kind":"Name","value":"participationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"rule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]}}]} as unknown as DocumentNode<VendorOfferingMutation, VendorOfferingMutationVariables>;
export const VendorPublishDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorPublish"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishMarketListing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"listingId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"published"}}]}}]}}]} as unknown as DocumentNode<VendorPublishMutation, VendorPublishMutationVariables>;
export const VendorUnpublishDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VendorUnpublish"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unpublishMarketListing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"listingId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"published"}}]}}]}}]} as unknown as DocumentNode<VendorUnpublishMutation, VendorUnpublishMutationVariables>;
export const VendorInventoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorInventory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"take"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownOperationalInventory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"take"},"value":{"kind":"Variable","name":{"kind":"Name","value":"take"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"stockOnHand"}},{"kind":"Field","name":{"kind":"Name","value":"stockAllocated"}},{"kind":"Field","name":{"kind":"Name","value":"physicalFree"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}}]} as unknown as DocumentNode<VendorInventoryQuery, VendorInventoryQueryVariables>;
export const VendorTotalsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorTotals"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorAnalyticsTotals"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"vendorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"vendorPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"directPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"vendorAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"settledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"cohortSettledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"vendorRemainingAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"gross"}},{"kind":"Field","name":{"kind":"Name","value":"discount"}},{"kind":"Field","name":{"kind":"Name","value":"itemTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingNet"}},{"kind":"Field","name":{"kind":"Name","value":"shippingTax"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"refundedOriginalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"distinctPurchasingCustomers"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosUnitsObserved"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosOperations"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}}]} as unknown as DocumentNode<VendorTotalsQuery, VendorTotalsQueryVariables>;
export const VendorTrendDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorTrend"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorAnalyticsTrend"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"vendorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VendorMetrics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VendorMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"directPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"vendorAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"settledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"cohortSettledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"vendorRemainingAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"gross"}},{"kind":"Field","name":{"kind":"Name","value":"discount"}},{"kind":"Field","name":{"kind":"Name","value":"itemTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingNet"}},{"kind":"Field","name":{"kind":"Name","value":"shippingTax"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"refundedOriginalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"distinctPurchasingCustomers"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosUnitsObserved"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosOperations"}}]}}]} as unknown as DocumentNode<VendorTrendQuery, VendorTrendQueryVariables>;
export const VendorProductAnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorProductAnalytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorProductAnalytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"vendorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}},{"kind":"Argument","name":{"kind":"Name","value":"variantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VendorMetrics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VendorMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"directPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"vendorAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"settledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"cohortSettledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"vendorRemainingAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"gross"}},{"kind":"Field","name":{"kind":"Name","value":"discount"}},{"kind":"Field","name":{"kind":"Name","value":"itemTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingNet"}},{"kind":"Field","name":{"kind":"Name","value":"shippingTax"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"refundedOriginalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"distinctPurchasingCustomers"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosUnitsObserved"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosOperations"}}]}}]} as unknown as DocumentNode<VendorProductAnalyticsQuery, VendorProductAnalyticsQueryVariables>;
export const VendorMarketAnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorMarketAnalytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorMarketAnalytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"vendorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VendorMetrics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VendorMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"directPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"vendorAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"settledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"cohortSettledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"vendorRemainingAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"gross"}},{"kind":"Field","name":{"kind":"Name","value":"discount"}},{"kind":"Field","name":{"kind":"Name","value":"itemTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingNet"}},{"kind":"Field","name":{"kind":"Name","value":"shippingTax"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"refundedOriginalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"distinctPurchasingCustomers"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosUnitsObserved"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosOperations"}}]}}]} as unknown as DocumentNode<VendorMarketAnalyticsQuery, VendorMarketAnalyticsQueryVariables>;
export const VendorOccurrenceAnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorOccurrenceAnalytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorOccurrenceAnalytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"vendorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}},{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VendorMetrics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VendorMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VendorAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"directPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"vendorAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"settledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"cohortSettledRefund"}},{"kind":"Field","name":{"kind":"Name","value":"vendorRemainingAttributed"}},{"kind":"Field","name":{"kind":"Name","value":"gross"}},{"kind":"Field","name":{"kind":"Name","value":"discount"}},{"kind":"Field","name":{"kind":"Name","value":"itemTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingNet"}},{"kind":"Field","name":{"kind":"Name","value":"shippingTax"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"refundedOriginalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"distinctPurchasingCustomers"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosUnitsObserved"}},{"kind":"Field","name":{"kind":"Name","value":"externalPosOperations"}}]}}]} as unknown as DocumentNode<VendorOccurrenceAnalyticsQuery, VendorOccurrenceAnalyticsQueryVariables>;
export const MarketIdentityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketIdentity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketIdentity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"channelId"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"membership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"principalId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}}]} as unknown as DocumentNode<MarketIdentityQuery, MarketIdentityQueryVariables>;
export const VendorCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorCatalog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorCatalog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OwnedCatalogProduct"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OwnedCatalogProduct"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogProduct"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"optionIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"optionGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]} as unknown as DocumentNode<VendorCatalogQuery, VendorCatalogQueryVariables>;
export const VendorProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"productId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"productId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"productId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OwnedCatalogProduct"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OwnedCatalogProduct"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OwnCatalogProduct"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"optionIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"optionGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]} as unknown as DocumentNode<VendorProductQuery, VendorProductQueryVariables>;
export const VendorOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorOrders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnOperationalOrderOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownCommercePortions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Portion"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Pickup"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePickupPromise"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Portion"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePortion"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"marketName"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"placedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lineCount"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fulfillments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Pickup"}}]}}]}}]} as unknown as DocumentNode<VendorOrdersQuery, VendorOrdersQueryVariables>;
export const VendorPublicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorPublication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownListingPublication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"listingId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<VendorPublicationQuery, VendorPublicationQueryVariables>;
export const FeatureAvailabilityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FeatureAvailability"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"boundary"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownFeatureAvailability"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"boundary"},"value":{"kind":"Variable","name":{"kind":"Name","value":"boundary"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"boundary"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"featureCode"}}]}}]}}]} as unknown as DocumentNode<FeatureAvailabilityQuery, FeatureAvailabilityQueryVariables>;
export const TenantEntitlementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TenantEntitlements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BillingSubjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownEntitlements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"featureCode"}},{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"valueKind"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"unlimited"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"overLimit"}}]}}]}}]} as unknown as DocumentNode<TenantEntitlementsQuery, TenantEntitlementsQueryVariables>;
export const PlatformScopeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlatformScope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformAdminScope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]} as unknown as DocumentNode<PlatformScopeQuery, PlatformScopeQueryVariables>;
export const PlatformDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlatformDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformTenants"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TenantSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"storefrontStatus"}}]}}]} as unknown as DocumentNode<PlatformDirectoryQuery, PlatformDirectoryQueryVariables>;
export const PlatformTenantDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlatformTenantDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"kind"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantKind"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformTenant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"kind"},"value":{"kind":"Variable","name":{"kind":"Name","value":"kind"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantSummary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"billingAccountId"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"offerId"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"accessAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"accessConfigured"}},{"kind":"Field","name":{"kind":"Name","value":"accessPolicyVersion"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entitlements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagementEntitlement"}}]}},{"kind":"Field","name":{"kind":"Name","value":"integrations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ModuleReadiness"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TenantSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"storefrontStatus"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagementEntitlement"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OwnEntitlement"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"featureCode"}},{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"valueKind"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"unlimited"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"accessPolicyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"overrideId"}},{"kind":"Field","name":{"kind":"Name","value":"currentCount"}},{"kind":"Field","name":{"kind":"Name","value":"committed"}},{"kind":"Field","name":{"kind":"Name","value":"reserved"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"overLimit"}},{"kind":"Field","name":{"kind":"Name","value":"metricCode"}},{"kind":"Field","name":{"kind":"Name","value":"windowPolicy"}},{"kind":"Field","name":{"kind":"Name","value":"windowStart"}},{"kind":"Field","name":{"kind":"Name","value":"windowEnd"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ModuleReadiness"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegrationModuleStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"qualification"}},{"kind":"Field","name":{"kind":"Name","value":"detail"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}}]}}]} as unknown as DocumentNode<PlatformTenantDetailQuery, PlatformTenantDetailQueryVariables>;
export const PlatformReadinessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlatformReadiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformIntegrationReadiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ModuleReadiness"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ModuleReadiness"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntegrationModuleStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"qualification"}},{"kind":"Field","name":{"kind":"Name","value":"detail"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}}]}}]} as unknown as DocumentNode<PlatformReadinessQuery, PlatformReadinessQueryVariables>;
export const PaymentManagementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PaymentManagement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformPaymentMode"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownPaymentConfiguration"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"providerIOAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"qualification"}},{"kind":"Field","name":{"kind":"Name","value":"fundsFlowPolicy"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"ownPaymentAccount"},"name":{"kind":"Name","value":"ownPaymentAdminAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"accountReference"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"detailsSubmitted"}},{"kind":"Field","name":{"kind":"Name","value":"chargesEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"payoutsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"cardPayments"}},{"kind":"Field","name":{"kind":"Name","value":"transfers"}},{"kind":"Field","name":{"kind":"Name","value":"legacyPayments"}},{"kind":"Field","name":{"kind":"Name","value":"currentlyDueCount"}},{"kind":"Field","name":{"kind":"Name","value":"pastDueCount"}},{"kind":"Field","name":{"kind":"Name","value":"disabledReason"}},{"kind":"Field","name":{"kind":"Name","value":"lastSyncAt"}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"ready"}},{"kind":"Field","name":{"kind":"Name","value":"reasons"}}]}}]}}]}}]} as unknown as DocumentNode<PaymentManagementQuery, PaymentManagementQueryVariables>;
export const ManagementConnectStripeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementConnectStripe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"StripeAccountMode"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beginOwnStripeConnect"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"authorizationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<ManagementConnectStripeMutation, ManagementConnectStripeMutationVariables>;
export const ManagementRefreshStripeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementRefreshStripe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"StripeAccountMode"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshOwnPaymentAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}}]}}]}}]} as unknown as DocumentNode<ManagementRefreshStripeMutation, ManagementRefreshStripeMutationVariables>;
export const ManagementDisconnectStripeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementDisconnectStripe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"StripeAccountMode"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectOwnPaymentAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"connectionStatus"}}]}}]}}]} as unknown as DocumentNode<ManagementDisconnectStripeMutation, ManagementDisconnectStripeMutationVariables>;
export const PosManagementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PosManagement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownPosProviders"}},{"kind":"Field","name":{"kind":"Name","value":"ownPosConnections"}},{"kind":"Field","name":{"kind":"Name","value":"ownPosRuntime"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowedRedirectUris"}},{"kind":"Field","name":{"kind":"Name","value":"providers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"providerCode"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"providerIOAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"localDeterministic"}}]}},{"kind":"Field","name":{"kind":"Name","value":"approvedPhysicalPolicyId"}},{"kind":"Field","name":{"kind":"Name","value":"approvedPhysicalPolicyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"approvedPhysicalMaxAgeSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"approvedPhysicalProviderCodes"}}]}}]}}]} as unknown as DocumentNode<PosManagementQuery, PosManagementQueryVariables>;
export const ManagementMappingSourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ManagementMappingSource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownResourceIdentity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"variant"}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalSourceId"}}]}}]}}]} as unknown as DocumentNode<ManagementMappingSourceQuery, ManagementMappingSourceQueryVariables>;
export const PosConnectionDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PosConnectionDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownPosConnections"}},{"kind":"Field","name":{"kind":"Name","value":"ownPosHealth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]},{"kind":"Field","name":{"kind":"Name","value":"ownPosMappings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<PosConnectionDetailQuery, PosConnectionDetailQueryVariables>;
export const ManagementBeginPosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementBeginPos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BeginPosAuthorizationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beginOwnPosAuthorization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ManagementBeginPosMutation, ManagementBeginPosMutationVariables>;
export const ManagementCompletePosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementCompletePos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompletePosAuthorizationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeOwnPosAuthorization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ManagementCompletePosMutation, ManagementCompletePosMutationVariables>;
export const ManagementConnectPosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementConnectPos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"providerCode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PosMode"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"connectOwnPosPartner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"providerCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"providerCode"}}},{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}},{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}]}]}}]} as unknown as DocumentNode<ManagementConnectPosMutation, ManagementConnectPosMutationVariables>;
export const ManagementRevokePosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementRevokePos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeOwnPosConnection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<ManagementRevokePosMutation, ManagementRevokePosMutationVariables>;
export const ManagementMapPosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementMapPos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConfirmPosMappingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"confirmOwnPosMapping"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ManagementMapPosMutation, ManagementMapPosMutationVariables>;
export const ManagementPosPoliciesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementPosPolicies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"policies"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureOwnPosPolicies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}},{"kind":"Argument","name":{"kind":"Name","value":"policies"},"value":{"kind":"Variable","name":{"kind":"Name","value":"policies"}}}]}]}}]} as unknown as DocumentNode<ManagementPosPoliciesMutation, ManagementPosPoliciesMutationVariables>;
export const ManagementPosLocationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementPosLocations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discoverOwnPosLocations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<ManagementPosLocationsMutation, ManagementPosLocationsMutationVariables>;
export const ManagementPosCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementPosCatalog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discoverOwnPosCatalog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}]}]}}]} as unknown as DocumentNode<ManagementPosCatalogMutation, ManagementPosCatalogMutationVariables>;
export const ManagementPosSyncDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementPosSync"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"stream"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PosStream"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncOwnPos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"connectionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"stream"},"value":{"kind":"Variable","name":{"kind":"Name","value":"stream"}}},{"kind":"Argument","name":{"kind":"Name","value":"operationKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}]}]}}]} as unknown as DocumentNode<ManagementPosSyncMutation, ManagementPosSyncMutationVariables>;
export const TenantBillingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TenantBilling"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BillingSubjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownBillingConfiguration"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"externalActionsAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionSource"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ownSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"offerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStart"}},{"kind":"Field","name":{"kind":"Name","value":"periodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"cancelAtPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"pendingChange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"changeType"}},{"kind":"Field","name":{"kind":"Name","value":"timing"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"toPlanVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"toOfferId"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"ownEntitlements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagementEntitlement"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ownUsage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagementEntitlement"}}]}},{"kind":"Field","name":{"kind":"Name","value":"availableBillingOffers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"cadenceInterval"}},{"kind":"Field","name":{"kind":"Name","value":"cadenceCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagementEntitlement"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OwnEntitlement"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"featureCode"}},{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"valueKind"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"unlimited"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"accessPolicyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"overrideId"}},{"kind":"Field","name":{"kind":"Name","value":"currentCount"}},{"kind":"Field","name":{"kind":"Name","value":"committed"}},{"kind":"Field","name":{"kind":"Name","value":"reserved"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"overLimit"}},{"kind":"Field","name":{"kind":"Name","value":"metricCode"}},{"kind":"Field","name":{"kind":"Name","value":"windowPolicy"}},{"kind":"Field","name":{"kind":"Name","value":"windowStart"}},{"kind":"Field","name":{"kind":"Name","value":"windowEnd"}}]}}]} as unknown as DocumentNode<TenantBillingQuery, TenantBillingQueryVariables>;
export const PlatformCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlatformCatalog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"section"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformCatalogSection"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformCatalogOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformBillingCatalog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"section"},"value":{"kind":"Variable","name":{"kind":"Name","value":"section"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"registeredFeatures"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"featureCode"}},{"kind":"Field","name":{"kind":"Name","value":"valueKind"}},{"kind":"Field","name":{"kind":"Name","value":"semantics"}},{"kind":"Field","name":{"kind":"Name","value":"subjects"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"defaultPublishedVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"versionNumber"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"retiredAt"}},{"kind":"Field","name":{"kind":"Name","value":"planVersionId"}},{"kind":"Field","name":{"kind":"Name","value":"featureId"}},{"kind":"Field","name":{"kind":"Name","value":"featureCode"}},{"kind":"Field","name":{"kind":"Name","value":"valueKind"}},{"kind":"Field","name":{"kind":"Name","value":"semantics"}},{"kind":"Field","name":{"kind":"Name","value":"vendorSupported"}},{"kind":"Field","name":{"kind":"Name","value":"marketSupported"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"limitValue"}},{"kind":"Field","name":{"kind":"Name","value":"unlimited"}},{"kind":"Field","name":{"kind":"Name","value":"metricId"}},{"kind":"Field","name":{"kind":"Name","value":"allowanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"windowPolicy"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"cadenceKind"}},{"kind":"Field","name":{"kind":"Name","value":"cadenceInterval"}},{"kind":"Field","name":{"kind":"Name","value":"cadenceCount"}},{"kind":"Field","name":{"kind":"Name","value":"billingModel"}},{"kind":"Field","name":{"kind":"Name","value":"metricCode"}},{"kind":"Field","name":{"kind":"Name","value":"aggregationKind"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"stateAccess"}},{"kind":"Field","name":{"kind":"Name","value":"timing"}},{"kind":"Field","name":{"kind":"Name","value":"proration"}},{"kind":"Field","name":{"kind":"Name","value":"offerId"}},{"kind":"Field","name":{"kind":"Name","value":"providerCode"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"validatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"billingAccountId"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"reasonCode"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"revokedAt"}}]}}]}}]}}]} as unknown as DocumentNode<PlatformCatalogQuery, PlatformCatalogQueryVariables>;
export const ManagementProvisionVendorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementProvisionVendor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformProvisionVendorInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformProvisionVendor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TenantSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"storefrontStatus"}}]}}]} as unknown as DocumentNode<ManagementProvisionVendorMutation, ManagementProvisionVendorMutationVariables>;
export const ManagementProvisionMarketDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementProvisionMarket"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformProvisionMarketInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"platformProvisionMarket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TenantSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlatformTenantSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"storefrontStatus"}}]}}]} as unknown as DocumentNode<ManagementProvisionMarketMutation, ManagementProvisionMarketMutationVariables>;
export const ManagementCreatePlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementCreatePlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSaasPlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}},{"kind":"Argument","name":{"kind":"Name","value":"displayName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementCreatePlanMutation, ManagementCreatePlanMutationVariables>;
export const ManagementEditPlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementEditPlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"editSaasPlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"displayName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementEditPlanMutation, ManagementEditPlanMutationVariables>;
export const ManagementCreateVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementCreateVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"versionNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"policyVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSaasPlanVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"planId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planId"}}},{"kind":"Argument","name":{"kind":"Name","value":"versionNumber"},"value":{"kind":"Variable","name":{"kind":"Name","value":"versionNumber"}}},{"kind":"Argument","name":{"kind":"Name","value":"policyVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"policyVersion"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementCreateVersionMutation, ManagementCreateVersionMutationVariables>;
export const ManagementSetRuleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementSetRule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaasRuleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setDraftSaasRule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementSetRuleMutation, ManagementSetRuleMutationVariables>;
export const ManagementPublishVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementPublishVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishSaasPlanVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementPublishVersionMutation, ManagementPublishVersionMutationVariables>;
export const ManagementRetireVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementRetireVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retireSaasPlanVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementRetireVersionMutation, ManagementRetireVersionMutationVariables>;
export const ManagementDefaultVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementDefaultVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"versionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setDefaultSaasPlanVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"planId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planId"}}},{"kind":"Argument","name":{"kind":"Name","value":"versionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"versionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementDefaultVersionMutation, ManagementDefaultVersionMutationVariables>;
export const ManagementCreateOfferDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementCreateOffer"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaasOfferInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSaasBillingOffer"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementCreateOfferMutation, ManagementCreateOfferMutationVariables>;
export const ManagementRegisterFeatureDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementRegisterFeature"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"registerSaasFeature"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementRegisterFeatureMutation, ManagementRegisterFeatureMutationVariables>;
export const ManagementCreateMetricDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementCreateMetric"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaasMetricInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSaasUsageMetric"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementCreateMetricMutation, ManagementCreateMetricMutationVariables>;
export const ManagementAccessPolicyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementAccessPolicy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"stateAccess"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSaasAccessPolicy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}},{"kind":"Argument","name":{"kind":"Name","value":"stateAccess"},"value":{"kind":"Variable","name":{"kind":"Name","value":"stateAccess"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementAccessPolicyMutation, ManagementAccessPolicyMutationVariables>;
export const ManagementChangePolicyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementChangePolicy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaasChangePolicyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSaasChangePolicy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementChangePolicyMutation, ManagementChangePolicyMutationVariables>;
export const ManagementAssignInternalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementAssignInternal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BillingSubjectInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assignInternalSaasSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}},{"kind":"Argument","name":{"kind":"Name","value":"offerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementAssignInternalMutation, ManagementAssignInternalMutationVariables>;
export const ManagementMigrateInternalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementMigrateInternal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subscriptionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"migrateInternalSaasSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subscriptionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subscriptionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"offerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementMigrateInternalMutation, ManagementMigrateInternalMutationVariables>;
export const ManagementGrantOverrideDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementGrantOverride"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaasOverrideInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantSaasEntitlementOverride"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementGrantOverrideMutation, ManagementGrantOverrideMutationVariables>;
export const ManagementRevokeOverrideDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ManagementRevokeOverride"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeSaasEntitlementOverride"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ManagementRevokeOverrideMutation, ManagementRevokeOverrideMutationVariables>;
export const OwnMarketOperationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnMarketOperations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"section"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOperationsSection"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketOperations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"section"},"value":{"kind":"Variable","name":{"kind":"Name","value":"section"}}},{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}}]}]}}]} as unknown as DocumentNode<OwnMarketOperationsQuery, OwnMarketOperationsQueryVariables>;
export const MarketOperationsCommandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketOperationsCommand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOperationsCommand"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketOperationsCommand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<MarketOperationsCommandMutation, MarketOperationsCommandMutationVariables>;
export const OwnVendorBoothAssignmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnVendorBoothAssignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownVendorBoothAssignments"}}]}}]} as unknown as DocumentNode<OwnVendorBoothAssignmentsQuery, OwnVendorBoothAssignmentsQueryVariables>;
export const MarketConfigurationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketConfiguration"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketConfiguration"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketConfiguration"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketDomain"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"weekInterval"}},{"kind":"Field","name":{"kind":"Name","value":"monthWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"weekdays"}},{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"endDayOffset"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveFrom"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveUntil"}}]}},{"kind":"Field","name":{"kind":"Name","value":"defaultPreorderRule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}},{"kind":"Field","name":{"kind":"Name","value":"overridePolicy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"participationAllowed"}},{"kind":"Field","name":{"kind":"Name","value":"vendorWindowMode"}},{"kind":"Field","name":{"kind":"Name","value":"closeMinutesBeforeStart"}}]}}]}}]} as unknown as DocumentNode<MarketConfigurationQuery, MarketConfigurationQueryVariables>;
export const MarketOccurrencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketOccurrences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"through"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketOccurrences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"through"},"value":{"kind":"Variable","name":{"kind":"Name","value":"through"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOccurrenceFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<MarketOccurrencesQuery, MarketOccurrencesQueryVariables>;
export const MarketRelationshipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketRelationships"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketVendorMemberships"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BusinessMembership"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BusinessMembership"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"market"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<MarketRelationshipsQuery, MarketRelationshipsQueryVariables>;
export const MarketRelationshipStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketRelationshipState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketMembershipState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"membershipId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membership"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BusinessMembership"}}]}},{"kind":"Field","name":{"kind":"Name","value":"occurrences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOccurrenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"participations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Attendance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"listings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Listing"}}]}},{"kind":"Field","name":{"kind":"Name","value":"offerings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Offering"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BusinessMembership"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"market"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Attendance"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendance"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Listing"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantListing"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Offering"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantOffering"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"participationId"}},{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"preorderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"salesCap"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderOpensAt"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderClosesAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"windowProvenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"marketVersion"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"membershipVersion"}},{"kind":"Field","name":{"kind":"Name","value":"participationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"rule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]}}]} as unknown as DocumentNode<MarketRelationshipStateQuery, MarketRelationshipStateQueryVariables>;
export const MarketConfigureDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketConfigure"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConfigureMarketInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureOwnMarket"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketConfigureMutation, MarketConfigureMutationVariables>;
export const MarketRecurrenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketRecurrence"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"recurrence"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WeeklyRecurrenceInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseMarketRecurrence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}},{"kind":"Argument","name":{"kind":"Name","value":"recurrence"},"value":{"kind":"Variable","name":{"kind":"Name","value":"recurrence"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}}]}}]}}]} as unknown as DocumentNode<MarketRecurrenceMutation, MarketRecurrenceMutationVariables>;
export const MarketGenerateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketGenerate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"through"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateMarketOccurrences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"through"},"value":{"kind":"Variable","name":{"kind":"Name","value":"through"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketGenerateMutation, MarketGenerateMutationVariables>;
export const MarketEnqueueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketEnqueue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"through"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enqueueMarketOccurrenceGeneration"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"Argument","name":{"kind":"Name","value":"through"},"value":{"kind":"Variable","name":{"kind":"Name","value":"through"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MarketEnqueueMutation, MarketEnqueueMutationVariables>;
export const MarketManualDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketManual"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scheduleDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"generationKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createManualMarketOccurrence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"scheduleDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scheduleDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"generationKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"generationKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketManualMutation, MarketManualMutationVariables>;
export const MarketReviseOccurrenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketReviseOccurrence"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseMarketOccurrence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketReviseOccurrenceMutation, MarketReviseOccurrenceMutationVariables>;
export const MarketCancelOccurrenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketCancelOccurrence"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelMarketOccurrence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketCancelOccurrenceMutation, MarketCancelOccurrenceMutationVariables>;
export const MarketMembershipStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketMembershipStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketBusinessMembershipStatus"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMarketVendorMembership"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"vendorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vendorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketMembershipStatusMutation, MarketMembershipStatusMutationVariables>;
export const MarketApproveListingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketApproveListing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketListingApprovalStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveMarketListing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketApproveListingMutation, MarketApproveListingMutationVariables>;
export const MarketParticipationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketParticipation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendanceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureMarketParticipation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketParticipationMutation, MarketParticipationMutationVariables>;
export const MarketConfigureOfferingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketConfigureOffering"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOfferingInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configureMarketOffering"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketConfigureOfferingMutation, MarketConfigureOfferingMutationVariables>;
export const MarketRematerializeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketRematerialize"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rematerializeMarketOfferingWindow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expectedVersion"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<MarketRematerializeMutation, MarketRematerializeMutationVariables>;
export const MarketOperationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketOperations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketPageOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownOccurrenceCustomerOperations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"portions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalOrderId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fulfillments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationalLineId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Pickup"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Pickup"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommercePickupPromise"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}}]} as unknown as DocumentNode<MarketOperationsQuery, MarketOperationsQueryVariables>;
export const MarketAnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketAnalytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketAnalytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOperationalMetrics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOperationalMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"purchasingVendors"}},{"kind":"Field","name":{"kind":"Name","value":"participatingVendors"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"plannedParticipations"}},{"kind":"Field","name":{"kind":"Name","value":"confirmedParticipations"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledParticipations"}}]}}]} as unknown as DocumentNode<MarketAnalyticsQuery, MarketAnalyticsQueryVariables>;
export const MarketOccurrenceAnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketOccurrenceAnalytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsRangeInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketOccurrenceAnalytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"marketId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"marketId"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}},{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnalyticsMeta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOperationalMetrics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnalyticsMeta"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AnalyticsMetadata"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectionCode"}},{"kind":"Field","name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"generationId"}},{"kind":"Field","name":{"kind":"Name","value":"activeGenerationId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAsOf"}},{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"completeness"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastReconciledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"technicalBucket"}},{"kind":"Field","name":{"kind":"Name","value":"marketFinancialPolicy"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOperationalMetrics"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAnalyticsBucket"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"day"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"marketPurchaseCount"}},{"kind":"Field","name":{"kind":"Name","value":"purchasingVendors"}},{"kind":"Field","name":{"kind":"Name","value":"participatingVendors"}},{"kind":"Field","name":{"kind":"Name","value":"originalUnits"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledUnits"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingPortions"}},{"kind":"Field","name":{"kind":"Name","value":"completedPortions"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledPortions"}},{"kind":"Field","name":{"kind":"Name","value":"plannedParticipations"}},{"kind":"Field","name":{"kind":"Name","value":"confirmedParticipations"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledParticipations"}}]}}]} as unknown as DocumentNode<MarketOccurrenceAnalyticsQuery, MarketOccurrenceAnalyticsQueryVariables>;
export const MarketEligibleVendorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketEligibleVendors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketVendorDirectoryOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketEligibleVendors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketVendorDisplayFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketVendorDisplayFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVendorDisplay"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<MarketEligibleVendorsQuery, MarketEligibleVendorsQueryVariables>;
export const MarketVendorPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketVendorPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketVendorOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketVendorMemberships"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOrganizerMembershipFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketVendorDisplayFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVendorDisplay"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOrganizerMembershipFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOrganizerMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketVendorDisplayFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<MarketVendorPageQuery, MarketVendorPageQueryVariables>;
export const MarketOccurrencePageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketOccurrencePage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketOccurrenceOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketOccurrences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOccurrenceFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<MarketOccurrencePageQuery, MarketOccurrencePageQueryVariables>;
export const MarketOccurrenceDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketOccurrenceDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketOccurrence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOccurrenceFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<MarketOccurrenceDetailQuery, MarketOccurrenceDetailQueryVariables>;
export const MarketRelationshipDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketRelationshipDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrences"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketOccurrenceOptions"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"participations"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketPageOptions"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"listings"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketPageOptions"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offerings"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketPageOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"membership"},"name":{"kind":"Name","value":"ownMarketMembership"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOrganizerMembershipFields"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"occurrences"},"name":{"kind":"Name","value":"ownMarketMembershipOccurrencePage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrences"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOccurrenceFields"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"participations"},"name":{"kind":"Name","value":"ownMarketMembershipParticipations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"participations"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Attendance"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"listings"},"name":{"kind":"Name","value":"ownMarketMembershipListings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"listings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOrganizerListingFields"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"offerings"},"name":{"kind":"Name","value":"ownMarketMembershipOfferings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"membershipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offerings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Offering"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketVendorDisplayFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVendorDisplay"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOrganizerMembershipFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOrganizerMembership"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketVendorDisplayFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderDefault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Attendance"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketAttendance"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOrganizerListingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketOrganizerListing"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"membershipId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"variant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"publication"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Offering"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketVariantOffering"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"participationId"}},{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"preorderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"salesCap"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderOpensAt"}},{"kind":"Field","name":{"kind":"Name","value":"effectivePreorderClosesAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"windowProvenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"marketVersion"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"membershipVersion"}},{"kind":"Field","name":{"kind":"Name","value":"participationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"rule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]}}]} as unknown as DocumentNode<MarketRelationshipDetailQuery, MarketRelationshipDetailQueryVariables>;
export const MarketOverviewSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketOverviewSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnMarketOverviewOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketOverviewSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"asOf"}},{"kind":"Field","name":{"kind":"Name","value":"totalVendorRelationships"}},{"kind":"Field","name":{"kind":"Name","value":"approvedVendorRelationships"}},{"kind":"Field","name":{"kind":"Name","value":"pendingVendorRelationships"}},{"kind":"Field","name":{"kind":"Name","value":"suspendedVendorRelationships"}},{"kind":"Field","name":{"kind":"Name","value":"withdrawnVendorRelationships"}},{"kind":"Field","name":{"kind":"Name","value":"upcomingScheduledOccurrences"}},{"kind":"Field","name":{"kind":"Name","value":"nextOccurrence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketOccurrenceFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Occurrence"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"pickupInstructions"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreorderRule"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPreorderRule"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opensDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"opensTime"}},{"kind":"Field","name":{"kind":"Name","value":"closesDaysBefore"}},{"kind":"Field","name":{"kind":"Name","value":"closesTime"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"Occurrence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"localStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"localEndsAt"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalStart"}},{"kind":"Field","name":{"kind":"Name","value":"originalLocalEnd"}},{"kind":"Field","name":{"kind":"Name","value":"recurrenceVersion"}},{"kind":"Field","name":{"kind":"Name","value":"configurationVersion"}},{"kind":"Field","name":{"kind":"Name","value":"policyVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preorderOverride"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreorderRule"}}]}}]}}]} as unknown as DocumentNode<MarketOverviewSummaryQuery, MarketOverviewSummaryQueryVariables>;
export const MarketListingPublicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketListingPublication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketListingPublication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"listingId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"listingId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listingId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<MarketListingPublicationQuery, MarketListingPublicationQueryVariables>;
export const MarketGenerationStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketGenerationStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownMarketOccurrenceGenerationStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jobId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"settledAt"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"matchedOccurrences"}}]}}]}}]} as unknown as DocumentNode<MarketGenerationStatusQuery, MarketGenerationStatusQueryVariables>;