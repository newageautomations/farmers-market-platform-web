/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Operators for filtering on a Boolean field */
export type BooleanOperators = {
  readonly eq?: boolean | null | undefined;
  readonly isNull?: boolean | null | undefined;
};

export type CheckoutContactInput = {
  readonly emailAddress: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber?: string | null | undefined;
};

export type CommunicationMedium =
  | 'EMAIL'
  | 'SMS';

export type CommunicationPurpose =
  | 'MARKET_ANNOUNCEMENT'
  | 'PREORDER_WINDOW_OPEN'
  | 'RESTOCK'
  | 'VENDOR_ANNOUNCEMENT';

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

/** Operators for filtering on a DateTime field */
export type DateOperators = {
  readonly after?: string | null | undefined;
  readonly before?: string | null | undefined;
  readonly between?: DateRange | null | undefined;
  readonly eq?: string | null | undefined;
  readonly isNull?: boolean | null | undefined;
};

export type DateRange = {
  readonly end: string;
  readonly start: string;
};

export type ErrorCode =
  | 'ALREADY_LOGGED_IN_ERROR'
  | 'COUPON_CODE_EXPIRED_ERROR'
  | 'COUPON_CODE_INVALID_ERROR'
  | 'COUPON_CODE_LIMIT_ERROR'
  | 'COUPON_REMOVED_DURING_CHECKOUT_ERROR'
  | 'EMAIL_ADDRESS_CONFLICT_ERROR'
  | 'GUEST_CHECKOUT_ERROR'
  | 'IDENTIFIER_CHANGE_TOKEN_EXPIRED_ERROR'
  | 'IDENTIFIER_CHANGE_TOKEN_INVALID_ERROR'
  | 'INELIGIBLE_PAYMENT_METHOD_ERROR'
  | 'INELIGIBLE_SHIPPING_METHOD_ERROR'
  | 'INSUFFICIENT_STOCK_ERROR'
  | 'INVALID_CREDENTIALS_ERROR'
  | 'MISSING_PASSWORD_ERROR'
  | 'NATIVE_AUTH_STRATEGY_ERROR'
  | 'NEGATIVE_QUANTITY_ERROR'
  | 'NOT_VERIFIED_ERROR'
  | 'NO_ACTIVE_ORDER_ERROR'
  | 'ORDER_INTERCEPTOR_ERROR'
  | 'ORDER_LIMIT_ERROR'
  | 'ORDER_MODIFICATION_ERROR'
  | 'ORDER_PAYMENT_STATE_ERROR'
  | 'ORDER_STATE_TRANSITION_ERROR'
  | 'PASSWORD_ALREADY_SET_ERROR'
  | 'PASSWORD_RESET_TOKEN_EXPIRED_ERROR'
  | 'PASSWORD_RESET_TOKEN_INVALID_ERROR'
  | 'PASSWORD_VALIDATION_ERROR'
  | 'PAYMENT_DECLINED_ERROR'
  | 'PAYMENT_FAILED_ERROR'
  | 'UNKNOWN_ERROR'
  | 'VERIFICATION_TOKEN_EXPIRED_ERROR'
  | 'VERIFICATION_TOKEN_INVALID_ERROR';

/** Operators for filtering on an ID field */
export type IdOperators = {
  readonly eq?: string | null | undefined;
  readonly in?: ReadonlyArray<string> | null | undefined;
  readonly isNull?: boolean | null | undefined;
  readonly notEq?: string | null | undefined;
  readonly notIn?: ReadonlyArray<string> | null | undefined;
};

export type LogicalOperator =
  | 'AND'
  | 'OR';

export type MarketApplicationRentalRequest = {
  readonly optionId: number;
  readonly quantity: number;
};

export type MarketApplicationSubmissionInput = {
  readonly answers: unknown;
  readonly idempotencyKey: string;
  readonly occurrenceIds: ReadonlyArray<number>;
  readonly rentals: ReadonlyArray<MarketApplicationRentalRequest>;
  readonly slug: string;
  readonly versionId: number;
};

export type MarketPublicOccurrenceOptions = {
  readonly from?: string | null | undefined;
  readonly skip?: number | null | undefined;
  readonly take?: number | null | undefined;
  readonly through?: string | null | undefined;
};

export type OccurrenceCatalogOptions = {
  readonly facetValueIds?: ReadonlyArray<string | number> | null | undefined;
  readonly skip?: number | null | undefined;
  readonly sort?: OccurrenceCatalogSort | null | undefined;
  readonly take?: number | null | undefined;
  readonly variantIds?: ReadonlyArray<string | number> | null | undefined;
  readonly vendorIds?: ReadonlyArray<string | number> | null | undefined;
};

export type OccurrenceCatalogSort =
  | 'ID_ASC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'PRICE_ASC'
  | 'PRICE_DESC';

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

export type ProductFilterParameter = {
  readonly _and?: ReadonlyArray<ProductFilterParameter> | null | undefined;
  readonly _or?: ReadonlyArray<ProductFilterParameter> | null | undefined;
  readonly createdAt?: DateOperators | null | undefined;
  readonly description?: StringOperators | null | undefined;
  readonly enabled?: BooleanOperators | null | undefined;
  readonly id?: IdOperators | null | undefined;
  readonly languageCode?: StringOperators | null | undefined;
  readonly name?: StringOperators | null | undefined;
  readonly slug?: StringOperators | null | undefined;
  readonly updatedAt?: DateOperators | null | undefined;
};

export type ProductListOptions = {
  /** Allows the results to be filtered */
  readonly filter?: ProductFilterParameter | null | undefined;
  /** Specifies whether multiple top-level "filter" fields should be combined with a logical AND or OR operation. Defaults to AND. */
  readonly filterOperator?: LogicalOperator | null | undefined;
  /** Skips the first n results, for use in pagination */
  readonly skip?: number | null | undefined;
  /** Specifies which properties to sort the results by */
  readonly sort?: ProductSortParameter | null | undefined;
  /** Takes n results, for use in pagination */
  readonly take?: number | null | undefined;
};

export type ProductSortParameter = {
  readonly createdAt?: SortOrder | null | undefined;
  readonly description?: SortOrder | null | undefined;
  readonly id?: SortOrder | null | undefined;
  readonly name?: SortOrder | null | undefined;
  readonly slug?: SortOrder | null | undefined;
  readonly updatedAt?: SortOrder | null | undefined;
};

export type PurchasePageOptions = {
  readonly skip?: number | null | undefined;
  readonly take?: number | null | undefined;
};

export type SortOrder =
  | 'ASC'
  | 'DESC';

/** Operators for filtering on a String field */
export type StringOperators = {
  readonly contains?: string | null | undefined;
  readonly eq?: string | null | undefined;
  readonly in?: ReadonlyArray<string> | null | undefined;
  readonly isNull?: boolean | null | undefined;
  readonly notContains?: string | null | undefined;
  readonly notEq?: string | null | undefined;
  readonly notIn?: ReadonlyArray<string> | null | undefined;
  readonly regex?: string | null | undefined;
};

export type CheckoutViewFragment = { readonly orderId: string, readonly code: string, readonly kind: string, readonly occurrenceId: string | null, readonly currency: CurrencyCode, readonly total: number, readonly subtotal: number, readonly shipping: number, readonly frozen: boolean, readonly committed: boolean, readonly paymentStatus: string, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null }, readonly contact: { readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly phoneNumber: string | null } | null, readonly profile: { readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly phoneNumber: string | null } | null, readonly availability: { readonly state: string, readonly mode: string }, readonly attempt: { readonly attemptId: string, readonly state: string, readonly expiresAt: string | null } | null, readonly taxes: ReadonlyArray<{ readonly name: string, readonly total: number }>, readonly discounts: ReadonlyArray<{ readonly name: string, readonly total: number }>, readonly groups: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly lines: ReadonlyArray<{ readonly id: string, readonly name: string, readonly quantity: number, readonly total: number }>, readonly pickup: ReadonlyArray<{ readonly name: string, readonly fee: number }> }> };

export type CheckoutStatusQueryVariables = Exact<{
  orderId?: string | number | null | undefined;
}>;


export type CheckoutStatusQuery = { readonly currentCheckoutStatus: { readonly orderId: string, readonly code: string, readonly kind: string, readonly occurrenceId: string | null, readonly currency: CurrencyCode, readonly total: number, readonly subtotal: number, readonly shipping: number, readonly frozen: boolean, readonly committed: boolean, readonly paymentStatus: string, readonly pickupPromise: { readonly mode: string, readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null }, readonly contact: { readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly phoneNumber: string | null } | null, readonly profile: { readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly phoneNumber: string | null } | null, readonly availability: { readonly state: string, readonly mode: string }, readonly attempt: { readonly attemptId: string, readonly state: string, readonly expiresAt: string | null } | null, readonly taxes: ReadonlyArray<{ readonly name: string, readonly total: number }>, readonly discounts: ReadonlyArray<{ readonly name: string, readonly total: number }>, readonly groups: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly lines: ReadonlyArray<{ readonly id: string, readonly name: string, readonly quantity: number, readonly total: number }>, readonly pickup: ReadonlyArray<{ readonly name: string, readonly fee: number }> }> } | null };

export type CheckoutContactMutationVariables = Exact<{
  input: CheckoutContactInput;
}>;


export type CheckoutContactMutation = { readonly setCheckoutContact: { readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly phoneNumber: string | null } };

export type CheckoutPickupQueryVariables = Exact<{ [key: string]: never; }>;


export type CheckoutPickupQuery = { readonly availableOwnedPickup: ReadonlyArray<{ readonly methodId: string, readonly vendorId: string, readonly name: string, readonly price: number, readonly currencyCode: CurrencyCode }> };

export type CheckoutSelectPickupMutationVariables = Exact<{
  methodIds: ReadonlyArray<string | number> | string | number;
}>;


export type CheckoutSelectPickupMutation = { readonly selectOwnedPickup: { readonly orderId: string } };

export type CheckoutBeginLocalMutationVariables = Exact<{ [key: string]: never; }>;


export type CheckoutBeginLocalMutation = { readonly beginLocalCheckout: { readonly attemptId: string, readonly orderId: string, readonly state: string } };

export type CheckoutFinalizeLocalMutationVariables = Exact<{
  attemptId: string | number;
}>;


export type CheckoutFinalizeLocalMutation = { readonly finalizeLocalCheckout: { readonly attemptId: string, readonly orderId: string, readonly state: string } };

export type CheckoutReleaseLocalMutationVariables = Exact<{
  attemptId: string | number;
}>;


export type CheckoutReleaseLocalMutation = { readonly releaseLocalCheckout: { readonly attemptId: string, readonly orderId: string, readonly state: string } };

export type CheckoutBeginProviderMutationVariables = Exact<{ [key: string]: never; }>;


export type CheckoutBeginProviderMutation = { readonly beginProviderCheckout: { readonly attemptId: string, readonly orderId: string, readonly state: string } };

export type CheckoutFinalizeProviderMutationVariables = Exact<{
  attemptId: string | number;
}>;


export type CheckoutFinalizeProviderMutation = { readonly finalizeProviderCheckout: { readonly attemptId: string, readonly orderId: string, readonly state: string } };

export type CheckoutReleaseProviderMutationVariables = Exact<{
  attemptId: string | number;
}>;


export type CheckoutReleaseProviderMutation = { readonly releaseProviderCheckout: { readonly attemptId: string, readonly orderId: string, readonly state: string } };

export type PurchaseAccountLinkMutationVariables = Exact<{
  orderId: string | number;
  origin: string;
}>;


export type PurchaseAccountLinkMutation = { readonly requestPurchaseAccountLink: { readonly state: string } };

export type CustomerHandoffMutationVariables = Exact<{
  code: string;
  origin: string;
  correlation: string;
}>;


export type CustomerHandoffMutation = { readonly exchangeCustomerHandoff: { readonly success: boolean } };

export type AccountProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type AccountProfileQuery = { readonly customerAccountProfile: { readonly firstName: string, readonly lastName: string, readonly emailAddress: string, readonly phoneNumber: string | null } | null };

export type CustomerSignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type CustomerSignOutMutation = { readonly customerSignOut: { readonly success: boolean } };

export type CustomerPurchaseFragment = { readonly id: string, readonly orderId: string, readonly kind: string, readonly purchasedAt: string, readonly occurrenceId: string | null, readonly nativeState: string, readonly storefront: { readonly id: string, readonly displayName: string }, readonly financial: { readonly currency: string, readonly originalPaid: number, readonly refunded: number, readonly remaining: number, readonly financialStatus: string }, readonly portions: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly pickupStatus: string, readonly nativeState: string, readonly marketName: string | null, readonly occurrenceStartsAt: string | null, readonly pickupPromise: { readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null }, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly variantName: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }> }> };

export type AccountPurchasesQueryVariables = Exact<{
  options?: PurchasePageOptions | null | undefined;
}>;


export type AccountPurchasesQuery = { readonly myPurchases: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly orderId: string, readonly kind: string, readonly purchasedAt: string, readonly occurrenceId: string | null, readonly nativeState: string, readonly storefront: { readonly id: string, readonly displayName: string }, readonly financial: { readonly currency: string, readonly originalPaid: number, readonly refunded: number, readonly remaining: number, readonly financialStatus: string }, readonly portions: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly pickupStatus: string, readonly nativeState: string, readonly marketName: string | null, readonly occurrenceStartsAt: string | null, readonly pickupPromise: { readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null }, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly variantName: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }> }> }> } };

export type AccountPurchaseQueryVariables = Exact<{
  orderId: string | number;
}>;


export type AccountPurchaseQuery = { readonly myPurchase: { readonly id: string, readonly orderId: string, readonly kind: string, readonly purchasedAt: string, readonly occurrenceId: string | null, readonly nativeState: string, readonly storefront: { readonly id: string, readonly displayName: string }, readonly financial: { readonly currency: string, readonly originalPaid: number, readonly refunded: number, readonly remaining: number, readonly financialStatus: string }, readonly portions: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly pickupStatus: string, readonly nativeState: string, readonly marketName: string | null, readonly occurrenceStartsAt: string | null, readonly pickupPromise: { readonly venue: string | null, readonly instructions: string | null, readonly startsAt: string | null, readonly endsAt: string | null }, readonly lines: ReadonlyArray<{ readonly customerLineId: string, readonly variantName: string, readonly quantity: number, readonly fulfilledQuantity: number, readonly cancelledQuantity: number, readonly remainingQuantity: number }> }> } };

export type ScopedPreferencesFragment = { readonly subjectKind: string, readonly displayName: string, readonly noticeVersion: string | null, readonly preferences: ReadonlyArray<{ readonly medium: CommunicationMedium, readonly purpose: CommunicationPurpose, readonly status: string, readonly version: number, readonly renewalRequired: boolean, readonly grantAvailable: boolean, readonly unavailableReason: string | null }> };

export type CommunicationSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type CommunicationSettingsQuery = { readonly myStorefrontCommunicationPreferences: { readonly subjectKind: string, readonly displayName: string, readonly noticeVersion: string | null, readonly preferences: ReadonlyArray<{ readonly medium: CommunicationMedium, readonly purpose: CommunicationPurpose, readonly status: string, readonly version: number, readonly renewalRequired: boolean, readonly grantAvailable: boolean, readonly unavailableReason: string | null }> } };

export type ChangeCommunicationSettingMutationVariables = Exact<{
  medium: CommunicationMedium;
  purpose: CommunicationPurpose;
  subscribed: boolean;
  noticeVersion: string;
}>;


export type ChangeCommunicationSettingMutation = { readonly setMyStorefrontCommunicationPreference: { readonly subjectKind: string, readonly displayName: string, readonly noticeVersion: string | null, readonly preferences: ReadonlyArray<{ readonly medium: CommunicationMedium, readonly purpose: CommunicationPurpose, readonly status: string, readonly version: number, readonly renewalRequired: boolean, readonly grantAvailable: boolean, readonly unavailableReason: string | null }> } };

export type PublicMarketApplicationQueryVariables = Exact<{
  slug?: string | null | undefined;
}>;


export type PublicMarketApplicationQuery = { readonly publicMarketApplication: unknown };

export type PublicMarketOccurrenceMapQueryVariables = Exact<{
  occurrenceId: number;
}>;


export type PublicMarketOccurrenceMapQuery = { readonly publicMarketOccurrenceMap: unknown };

export type SubmitMarketApplicationMutationVariables = Exact<{
  input: MarketApplicationSubmissionInput;
}>;


export type SubmitMarketApplicationMutation = { readonly submitMarketApplication: unknown };

export type ShopCustomerSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type ShopCustomerSessionQuery = { readonly me: { readonly id: string, readonly identifier: string, readonly channels: ReadonlyArray<{ readonly id: string, readonly code: string, readonly token: string, readonly permissions: ReadonlyArray<Permission> }> } | null };

export type ShopLoginMutationVariables = Exact<{
  username: string;
  password: string;
  rememberMe: boolean;
}>;


export type ShopLoginMutation = { readonly login:
    | { readonly __typename: 'CurrentUser', readonly id: string, readonly identifier: string, readonly channels: ReadonlyArray<{ readonly id: string, readonly code: string, readonly token: string, readonly permissions: ReadonlyArray<Permission> }> }
    | { readonly __typename: 'InvalidCredentialsError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'NativeAuthStrategyError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'NotVerifiedError', readonly errorCode: ErrorCode }
   };

export type ShopLogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type ShopLogoutMutation = { readonly logout: { readonly success: boolean } };

export type MarketCatalogQueryVariables = Exact<{
  occurrenceId: string | number;
  options?: OccurrenceCatalogOptions | null | undefined;
}>;


export type MarketCatalogQuery = { readonly marketOccurrenceCatalog: { readonly occurrenceId: string, readonly eligibility: string, readonly totalItems: number, readonly items: ReadonlyArray<{ readonly variantId: string, readonly productId: string, readonly offeringId: string, readonly vendorId: string, readonly vendorName: string, readonly name: string, readonly productName: string, readonly slug: string, readonly price: number, readonly currencyCode: CurrencyCode, readonly featuredAssetId: string | null }> } };

export type MarketPublicOccurrenceFieldsFragment = { readonly id: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string };

export type MarketStorefrontOccurrencesQueryVariables = Exact<{
  options?: MarketPublicOccurrenceOptions | null | undefined;
}>;


export type MarketStorefrontOccurrencesQuery = { readonly marketStorefrontOccurrences: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string }> } };

export type MarketStorefrontOccurrenceQueryVariables = Exact<{
  id: string | number;
}>;


export type MarketStorefrontOccurrenceQuery = { readonly marketStorefrontOccurrence: { readonly id: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string } | null };

export type MarketPublicItemFragment = { readonly variantId: string, readonly productId: string, readonly vendorId: string, readonly vendorName: string, readonly name: string, readonly productName: string, readonly description: string, readonly price: number, readonly currencyCode: CurrencyCode, readonly facetValueIds: ReadonlyArray<string>, readonly featuredAsset: { readonly id: string, readonly preview: string, readonly width: number, readonly height: number } | null };

export type MarketStorefrontCatalogQueryVariables = Exact<{
  occurrenceId: string | number;
  options?: OccurrenceCatalogOptions | null | undefined;
}>;


export type MarketStorefrontCatalogQuery = { readonly marketOccurrenceCatalog: { readonly occurrenceId: string, readonly eligibility: string, readonly totalItems: number, readonly items: ReadonlyArray<{ readonly variantId: string, readonly productId: string, readonly vendorId: string, readonly vendorName: string, readonly name: string, readonly productName: string, readonly description: string, readonly price: number, readonly currencyCode: CurrencyCode, readonly facetValueIds: ReadonlyArray<string>, readonly featuredAsset: { readonly id: string, readonly preview: string, readonly width: number, readonly height: number } | null }>, readonly facets: ReadonlyArray<{ readonly facetValueId: string, readonly name: string, readonly count: number }>, readonly vendors: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly count: number }> } };

export type MarketActiveCartSnapshotQueryVariables = Exact<{ [key: string]: never; }>;


export type MarketActiveCartSnapshotQuery = { readonly marketActiveCart: { readonly id: string, readonly kind: string, readonly state: string, readonly currencyCode: CurrencyCode, readonly totalQuantity: number, readonly subTotalWithTax: number, readonly totalWithTax: number, readonly shippingWithTax: number, readonly couponCodes: ReadonlyArray<string>, readonly occurrence: { readonly id: string, readonly scheduleDate: string, readonly startsAt: string, readonly endsAt: string, readonly timezone: string, readonly venue: string }, readonly discounts: ReadonlyArray<{ readonly description: string, readonly amountWithTax: number }>, readonly taxSummary: ReadonlyArray<{ readonly description: string, readonly taxTotal: number }>, readonly groups: ReadonlyArray<{ readonly vendorId: string, readonly vendorName: string, readonly lines: ReadonlyArray<{ readonly id: string, readonly variantId: string, readonly productName: string, readonly name: string, readonly quantity: number, readonly unitPriceWithTax: number, readonly discountedLinePriceWithTax: number, readonly featuredAsset: { readonly id: string, readonly preview: string, readonly width: number, readonly height: number } | null }> }> } | null };

export type MarketSelectContextMutationVariables = Exact<{
  occurrenceId: string | number;
}>;


export type MarketSelectContextMutation = { readonly selectCommerceContext: { readonly kind: string, readonly marketId: string | null, readonly occurrenceId: string | null } };

export type MarketApplyCouponMutationVariables = Exact<{
  code: string;
}>;


export type MarketApplyCouponMutation = { readonly applyCouponCode:
    | { readonly __typename: 'CouponCodeExpiredError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'CouponCodeInvalidError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'CouponCodeLimitError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'Order', readonly id: string }
   };

export type MarketRemoveCouponMutationVariables = Exact<{
  code: string;
}>;


export type MarketRemoveCouponMutation = { readonly removeCouponCode: { readonly id: string } | null };

export type VendorProductsQueryVariables = Exact<{
  options?: ProductListOptions | null | undefined;
}>;


export type VendorProductsQuery = { readonly products: { readonly totalItems: number, readonly items: ReadonlyArray<{ readonly id: string, readonly name: string, readonly slug: string, readonly description: string, readonly featuredAsset: { readonly id: string, readonly preview: string } | null, readonly facetValues: ReadonlyArray<{ readonly id: string, readonly name: string, readonly facet: { readonly id: string, readonly name: string } }>, readonly variants: ReadonlyArray<{ readonly id: string, readonly name: string, readonly priceWithTax: number, readonly currencyCode: CurrencyCode }> }> } };

export type StorefrontCartFragment = { readonly id: string, readonly code: string, readonly state: string, readonly currencyCode: CurrencyCode, readonly subTotalWithTax: number, readonly shippingWithTax: number, readonly totalWithTax: number, readonly discounts: ReadonlyArray<{ readonly description: string, readonly amountWithTax: number }>, readonly surcharges: ReadonlyArray<{ readonly description: string, readonly priceWithTax: number }>, readonly taxSummary: ReadonlyArray<{ readonly description: string, readonly taxTotal: number }>, readonly lines: ReadonlyArray<{ readonly id: string, readonly quantity: number, readonly discountedLinePriceWithTax: number, readonly featuredAsset: { readonly preview: string } | null, readonly productVariant: { readonly id: string, readonly name: string, readonly product: { readonly name: string, readonly slug: string } } }> };

export type CartSnapshotQueryVariables = Exact<{ [key: string]: never; }>;


export type CartSnapshotQuery = { readonly activeOrder: { readonly id: string, readonly code: string, readonly state: string, readonly currencyCode: CurrencyCode, readonly subTotalWithTax: number, readonly shippingWithTax: number, readonly totalWithTax: number, readonly discounts: ReadonlyArray<{ readonly description: string, readonly amountWithTax: number }>, readonly surcharges: ReadonlyArray<{ readonly description: string, readonly priceWithTax: number }>, readonly taxSummary: ReadonlyArray<{ readonly description: string, readonly taxTotal: number }>, readonly lines: ReadonlyArray<{ readonly id: string, readonly quantity: number, readonly discountedLinePriceWithTax: number, readonly featuredAsset: { readonly preview: string } | null, readonly productVariant: { readonly id: string, readonly name: string, readonly product: { readonly name: string, readonly slug: string } } }> } | null };

export type StorefrontProductQueryVariables = Exact<{
  slug: string;
}>;


export type StorefrontProductQuery = { readonly product: { readonly id: string, readonly name: string, readonly slug: string, readonly description: string, readonly featuredAsset: { readonly id: string, readonly preview: string, readonly width: number, readonly height: number } | null, readonly assets: ReadonlyArray<{ readonly id: string, readonly preview: string, readonly width: number, readonly height: number }>, readonly facetValues: ReadonlyArray<{ readonly id: string, readonly name: string, readonly facet: { readonly id: string, readonly name: string } }>, readonly optionGroups: ReadonlyArray<{ readonly id: string, readonly name: string, readonly options: ReadonlyArray<{ readonly id: string, readonly name: string }> }>, readonly variants: ReadonlyArray<{ readonly id: string, readonly name: string, readonly sku: string, readonly priceWithTax: number, readonly currencyCode: CurrencyCode, readonly options: ReadonlyArray<{ readonly id: string, readonly name: string, readonly groupId: string }> }> } | null };

export type StorefrontSelectContextMutationVariables = Exact<{ [key: string]: never; }>;


export type StorefrontSelectContextMutation = { readonly selectCommerceContext: { readonly orderId: string, readonly kind: string, readonly vendorId: string | null, readonly marketId: string | null, readonly occurrenceId: string | null } };

export type StorefrontAddMutationVariables = Exact<{
  variantId: string | number;
  quantity: number;
}>;


export type StorefrontAddMutation = { readonly addItemToOrder:
    | { readonly __typename: 'InsufficientStockError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'NegativeQuantityError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'Order', readonly id: string, readonly code: string, readonly state: string, readonly currencyCode: CurrencyCode, readonly subTotalWithTax: number, readonly shippingWithTax: number, readonly totalWithTax: number, readonly discounts: ReadonlyArray<{ readonly description: string, readonly amountWithTax: number }>, readonly surcharges: ReadonlyArray<{ readonly description: string, readonly priceWithTax: number }>, readonly taxSummary: ReadonlyArray<{ readonly description: string, readonly taxTotal: number }>, readonly lines: ReadonlyArray<{ readonly id: string, readonly quantity: number, readonly discountedLinePriceWithTax: number, readonly featuredAsset: { readonly preview: string } | null, readonly productVariant: { readonly id: string, readonly name: string, readonly product: { readonly name: string, readonly slug: string } } }> }
    | { readonly __typename: 'OrderInterceptorError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'OrderLimitError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'OrderModificationError', readonly errorCode: ErrorCode }
   };

export type StorefrontAdjustMutationVariables = Exact<{
  lineId: string | number;
  quantity: number;
}>;


export type StorefrontAdjustMutation = { readonly adjustOrderLine:
    | { readonly __typename: 'InsufficientStockError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'NegativeQuantityError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'Order', readonly id: string, readonly code: string, readonly state: string, readonly currencyCode: CurrencyCode, readonly subTotalWithTax: number, readonly shippingWithTax: number, readonly totalWithTax: number, readonly discounts: ReadonlyArray<{ readonly description: string, readonly amountWithTax: number }>, readonly surcharges: ReadonlyArray<{ readonly description: string, readonly priceWithTax: number }>, readonly taxSummary: ReadonlyArray<{ readonly description: string, readonly taxTotal: number }>, readonly lines: ReadonlyArray<{ readonly id: string, readonly quantity: number, readonly discountedLinePriceWithTax: number, readonly featuredAsset: { readonly preview: string } | null, readonly productVariant: { readonly id: string, readonly name: string, readonly product: { readonly name: string, readonly slug: string } } }> }
    | { readonly __typename: 'OrderInterceptorError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'OrderLimitError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'OrderModificationError', readonly errorCode: ErrorCode }
   };

export type StorefrontRemoveMutationVariables = Exact<{
  lineId: string | number;
}>;


export type StorefrontRemoveMutation = { readonly removeOrderLine:
    | { readonly __typename: 'Order', readonly id: string, readonly code: string, readonly state: string, readonly currencyCode: CurrencyCode, readonly subTotalWithTax: number, readonly shippingWithTax: number, readonly totalWithTax: number, readonly discounts: ReadonlyArray<{ readonly description: string, readonly amountWithTax: number }>, readonly surcharges: ReadonlyArray<{ readonly description: string, readonly priceWithTax: number }>, readonly taxSummary: ReadonlyArray<{ readonly description: string, readonly taxTotal: number }>, readonly lines: ReadonlyArray<{ readonly id: string, readonly quantity: number, readonly discountedLinePriceWithTax: number, readonly featuredAsset: { readonly preview: string } | null, readonly productVariant: { readonly id: string, readonly name: string, readonly product: { readonly name: string, readonly slug: string } } }> }
    | { readonly __typename: 'OrderInterceptorError', readonly errorCode: ErrorCode }
    | { readonly __typename: 'OrderModificationError', readonly errorCode: ErrorCode }
   };

export const CheckoutViewFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CheckoutView"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CustomerCheckoutView"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"shipping"}},{"kind":"Field","name":{"kind":"Name","value":"frozen"}},{"kind":"Field","name":{"kind":"Name","value":"committed"}},{"kind":"Field","name":{"kind":"Name","value":"paymentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"availability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attempt"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"groups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fee"}}]}}]}}]}}]} as unknown as DocumentNode<CheckoutViewFragment, unknown>;
export const CustomerPurchaseFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CustomerPurchase"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CustomerPurchaseProjection"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"purchasedAt"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"storefront"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"financial"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"originalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"financialStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"portions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"marketName"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}}]}}]}}]} as unknown as DocumentNode<CustomerPurchaseFragment, unknown>;
export const ScopedPreferencesFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ScopedPreferences"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"StorefrontCommunicationPreferences"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectKind"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"noticeVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"medium"}},{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"renewalRequired"}},{"kind":"Field","name":{"kind":"Name","value":"grantAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"unavailableReason"}}]}}]}}]} as unknown as DocumentNode<ScopedPreferencesFragment, unknown>;
export const MarketPublicOccurrenceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPublicOccurrence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}}]}}]} as unknown as DocumentNode<MarketPublicOccurrenceFieldsFragment, unknown>;
export const MarketPublicItemFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketPublicItem"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OccurrenceCatalogItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"facetValueIds"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preview"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]} as unknown as DocumentNode<MarketPublicItemFragment, unknown>;
export const StorefrontCartFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"StorefrontCart"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"subTotalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"totalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amountWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"surcharges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"taxTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"discountedLinePriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preview"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productVariant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StorefrontCartFragment, unknown>;
export const CheckoutStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckoutStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentCheckoutStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CheckoutView"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CheckoutView"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CustomerCheckoutView"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"shipping"}},{"kind":"Field","name":{"kind":"Name","value":"frozen"}},{"kind":"Field","name":{"kind":"Name","value":"committed"}},{"kind":"Field","name":{"kind":"Name","value":"paymentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}},{"kind":"Field","name":{"kind":"Name","value":"availability"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}}]}},{"kind":"Field","name":{"kind":"Name","value":"attempt"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"groups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pickup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fee"}}]}}]}}]}}]} as unknown as DocumentNode<CheckoutStatusQuery, CheckoutStatusQueryVariables>;
export const CheckoutContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CheckoutContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setCheckoutContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}}]}}]} as unknown as DocumentNode<CheckoutContactMutation, CheckoutContactMutationVariables>;
export const CheckoutPickupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckoutPickup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableOwnedPickup"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"methodId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}}]}}]} as unknown as DocumentNode<CheckoutPickupQuery, CheckoutPickupQueryVariables>;
export const CheckoutSelectPickupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutSelectPickup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"methodIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectOwnedPickup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"methodIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"methodIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderId"}}]}}]}}]} as unknown as DocumentNode<CheckoutSelectPickupMutation, CheckoutSelectPickupMutationVariables>;
export const CheckoutBeginLocalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutBeginLocal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beginLocalCheckout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<CheckoutBeginLocalMutation, CheckoutBeginLocalMutationVariables>;
export const CheckoutFinalizeLocalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutFinalizeLocal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"finalizeLocalCheckout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"attemptId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<CheckoutFinalizeLocalMutation, CheckoutFinalizeLocalMutationVariables>;
export const CheckoutReleaseLocalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutReleaseLocal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"releaseLocalCheckout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"attemptId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<CheckoutReleaseLocalMutation, CheckoutReleaseLocalMutationVariables>;
export const CheckoutBeginProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutBeginProvider"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beginProviderCheckout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<CheckoutBeginProviderMutation, CheckoutBeginProviderMutationVariables>;
export const CheckoutFinalizeProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutFinalizeProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"finalizeProviderCheckout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"attemptId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<CheckoutFinalizeProviderMutation, CheckoutFinalizeProviderMutationVariables>;
export const CheckoutReleaseProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckoutReleaseProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"releaseProviderCheckout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"attemptId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"attemptId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attemptId"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<CheckoutReleaseProviderMutation, CheckoutReleaseProviderMutationVariables>;
export const PurchaseAccountLinkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PurchaseAccountLink"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"origin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestPurchaseAccountLink"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}},{"kind":"Argument","name":{"kind":"Name","value":"origin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"origin"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<PurchaseAccountLinkMutation, PurchaseAccountLinkMutationVariables>;
export const CustomerHandoffDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CustomerHandoff"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"origin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"correlation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exchangeCustomerHandoff"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}},{"kind":"Argument","name":{"kind":"Name","value":"origin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"origin"}}},{"kind":"Argument","name":{"kind":"Name","value":"correlation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"correlation"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<CustomerHandoffMutation, CustomerHandoffMutationVariables>;
export const AccountProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerAccountProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"emailAddress"}},{"kind":"Field","name":{"kind":"Name","value":"phoneNumber"}}]}}]}}]} as unknown as DocumentNode<AccountProfileQuery, AccountProfileQueryVariables>;
export const CustomerSignOutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CustomerSignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerSignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<CustomerSignOutMutation, CustomerSignOutMutationVariables>;
export const AccountPurchasesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountPurchases"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PurchasePageOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myPurchases"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CustomerPurchase"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CustomerPurchase"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CustomerPurchaseProjection"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"purchasedAt"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"storefront"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"financial"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"originalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"financialStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"portions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"marketName"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}}]}}]}}]} as unknown as DocumentNode<AccountPurchasesQuery, AccountPurchasesQueryVariables>;
export const AccountPurchaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountPurchase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myPurchase"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CustomerPurchase"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CustomerPurchase"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CustomerPurchaseProjection"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"purchasedAt"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"storefront"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"financial"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"originalPaid"}},{"kind":"Field","name":{"kind":"Name","value":"refunded"}},{"kind":"Field","name":{"kind":"Name","value":"remaining"}},{"kind":"Field","name":{"kind":"Name","value":"financialStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"portions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"pickupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"nativeState"}},{"kind":"Field","name":{"kind":"Name","value":"marketName"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceStartsAt"}},{"kind":"Field","name":{"kind":"Name","value":"pickupPromise"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"venue"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerLineId"}},{"kind":"Field","name":{"kind":"Name","value":"variantName"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"fulfilledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"remainingQuantity"}}]}}]}}]}}]} as unknown as DocumentNode<AccountPurchaseQuery, AccountPurchaseQueryVariables>;
export const CommunicationSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommunicationSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myStorefrontCommunicationPreferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ScopedPreferences"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ScopedPreferences"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"StorefrontCommunicationPreferences"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectKind"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"noticeVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"medium"}},{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"renewalRequired"}},{"kind":"Field","name":{"kind":"Name","value":"grantAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"unavailableReason"}}]}}]}}]} as unknown as DocumentNode<CommunicationSettingsQuery, CommunicationSettingsQueryVariables>;
export const ChangeCommunicationSettingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeCommunicationSetting"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"medium"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunicationMedium"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"purpose"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunicationPurpose"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subscribed"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"noticeVersion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMyStorefrontCommunicationPreference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"medium"},"value":{"kind":"Variable","name":{"kind":"Name","value":"medium"}}},{"kind":"Argument","name":{"kind":"Name","value":"purpose"},"value":{"kind":"Variable","name":{"kind":"Name","value":"purpose"}}},{"kind":"Argument","name":{"kind":"Name","value":"subscribed"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subscribed"}}},{"kind":"Argument","name":{"kind":"Name","value":"noticeVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"noticeVersion"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ScopedPreferences"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ScopedPreferences"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"StorefrontCommunicationPreferences"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjectKind"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"noticeVersion"}},{"kind":"Field","name":{"kind":"Name","value":"preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"medium"}},{"kind":"Field","name":{"kind":"Name","value":"purpose"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"renewalRequired"}},{"kind":"Field","name":{"kind":"Name","value":"grantAvailable"}},{"kind":"Field","name":{"kind":"Name","value":"unavailableReason"}}]}}]}}]} as unknown as DocumentNode<ChangeCommunicationSettingMutation, ChangeCommunicationSettingMutationVariables>;
export const PublicMarketApplicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicMarketApplication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicMarketApplication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}]}]}}]} as unknown as DocumentNode<PublicMarketApplicationQuery, PublicMarketApplicationQueryVariables>;
export const PublicMarketOccurrenceMapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicMarketOccurrenceMap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicMarketOccurrenceMap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}}]}]}}]} as unknown as DocumentNode<PublicMarketOccurrenceMapQuery, PublicMarketOccurrenceMapQueryVariables>;
export const SubmitMarketApplicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitMarketApplication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketApplicationSubmissionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitMarketApplication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SubmitMarketApplicationMutation, SubmitMarketApplicationMutationVariables>;
export const ShopCustomerSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ShopCustomerSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"channels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]}}]} as unknown as DocumentNode<ShopCustomerSessionQuery, ShopCustomerSessionQueryVariables>;
export const ShopLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShopLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"rememberMe"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"rememberMe"},"value":{"kind":"Variable","name":{"kind":"Name","value":"rememberMe"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CurrentUser"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"channels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ErrorResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errorCode"}}]}}]}}]}}]} as unknown as DocumentNode<ShopLoginMutation, ShopLoginMutationVariables>;
export const ShopLogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShopLogout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<ShopLogoutMutation, ShopLogoutMutationVariables>;
export const MarketCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketCatalog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OccurrenceCatalogOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketOccurrenceCatalog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"eligibility"}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"offeringId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAssetId"}}]}}]}}]}}]} as unknown as DocumentNode<MarketCatalogQuery, MarketCatalogQueryVariables>;
export const MarketStorefrontOccurrencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketStorefrontOccurrences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPublicOccurrenceOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketStorefrontOccurrences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPublicOccurrence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}}]}}]} as unknown as DocumentNode<MarketStorefrontOccurrencesQuery, MarketStorefrontOccurrencesQueryVariables>;
export const MarketStorefrontOccurrenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketStorefrontOccurrence"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketStorefrontOccurrence"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPublicOccurrence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}}]}}]} as unknown as DocumentNode<MarketStorefrontOccurrenceQuery, MarketStorefrontOccurrenceQueryVariables>;
export const MarketStorefrontCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketStorefrontCatalog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OccurrenceCatalogOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketOccurrenceCatalog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}},{"kind":"Field","name":{"kind":"Name","value":"eligibility"}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketPublicItem"}}]}},{"kind":"Field","name":{"kind":"Name","value":"facets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"facetValueId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"vendors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketPublicItem"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OccurrenceCatalogItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"facetValueIds"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preview"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]} as unknown as DocumentNode<MarketStorefrontCatalogQuery, MarketStorefrontCatalogQueryVariables>;
export const MarketActiveCartSnapshotDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MarketActiveCartSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"marketActiveCart"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"occurrence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"totalQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"subTotalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"totalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"couponCodes"}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amountWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"taxTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"groups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"vendorName"}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"discountedLinePriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preview"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MarketPublicOccurrenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MarketPublicOccurrence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleDate"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"venue"}}]}}]} as unknown as DocumentNode<MarketActiveCartSnapshotQuery, MarketActiveCartSnapshotQueryVariables>;
export const MarketSelectContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketSelectContext"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectCommerceContext"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"occurrenceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"occurrenceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}}]}}]}}]} as unknown as DocumentNode<MarketSelectContextMutation, MarketSelectContextMutationVariables>;
export const MarketApplyCouponDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketApplyCoupon"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applyCouponCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"couponCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ErrorResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errorCode"}}]}}]}}]}}]} as unknown as DocumentNode<MarketApplyCouponMutation, MarketApplyCouponMutationVariables>;
export const MarketRemoveCouponDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarketRemoveCoupon"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeCouponCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"couponCode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MarketRemoveCouponMutation, MarketRemoveCouponMutationVariables>;
export const VendorProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VendorProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ProductListOptions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preview"}}]}},{"kind":"Field","name":{"kind":"Name","value":"facetValues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"facet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}}]}}]}}]}}]}}]} as unknown as DocumentNode<VendorProductsQuery, VendorProductsQueryVariables>;
export const CartSnapshotDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CartSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeOrder"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StorefrontCart"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"StorefrontCart"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"subTotalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"totalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amountWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"surcharges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"taxTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"discountedLinePriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preview"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productVariant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CartSnapshotQuery, CartSnapshotQueryVariables>;
export const StorefrontProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorefrontProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preview"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"assets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"preview"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"facetValues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"facet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"optionGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"groupId"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StorefrontProductQuery, StorefrontProductQueryVariables>;
export const StorefrontSelectContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StorefrontSelectContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectCommerceContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"vendorId"}},{"kind":"Field","name":{"kind":"Name","value":"marketId"}},{"kind":"Field","name":{"kind":"Name","value":"occurrenceId"}}]}}]}}]} as unknown as DocumentNode<StorefrontSelectContextMutation, StorefrontSelectContextMutationVariables>;
export const StorefrontAddDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StorefrontAdd"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addItemToOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"productVariantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StorefrontCart"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ErrorResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errorCode"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"StorefrontCart"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"subTotalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"totalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amountWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"surcharges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"taxTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"discountedLinePriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preview"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productVariant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StorefrontAddMutation, StorefrontAddMutationVariables>;
export const StorefrontAdjustDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StorefrontAdjust"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lineId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adjustOrderLine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderLineId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lineId"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StorefrontCart"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ErrorResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errorCode"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"StorefrontCart"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"subTotalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"totalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amountWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"surcharges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"taxTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"discountedLinePriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preview"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productVariant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StorefrontAdjustMutation, StorefrontAdjustMutationVariables>;
export const StorefrontRemoveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StorefrontRemove"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lineId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeOrderLine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderLineId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lineId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StorefrontCart"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ErrorResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"errorCode"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"StorefrontCart"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Order"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"currencyCode"}},{"kind":"Field","name":{"kind":"Name","value":"subTotalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"shippingWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"totalWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"discounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amountWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"surcharges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"priceWithTax"}}]}},{"kind":"Field","name":{"kind":"Name","value":"taxSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"taxTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"discountedLinePriceWithTax"}},{"kind":"Field","name":{"kind":"Name","value":"featuredAsset"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preview"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productVariant"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StorefrontRemoveMutation, StorefrontRemoveMutationVariables>;