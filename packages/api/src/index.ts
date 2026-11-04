import * as shop from './generated/shop';
import * as admin from './generated/admin';
import { transport, type TransportOptions } from './transport';
export * from './vendor';
export * from './packing';
export * from './market';
export * from './storefront';
export * from './market-storefront';
export * from './checkout';
export * from './customer-dashboard';
export * from './documents';
export * from './application-documents';
export * from './management';
export * from './preferences';
export { AppError, safeError, safeMessages } from './errors';
export type { ErrorKind } from './errors';
export type AdminUser = NonNullable<admin.AdminSessionQuery['me']>;
export type CustomerUser = NonNullable<shop.ShopCustomerSessionQuery['me']>;
export type AdminChannel = AdminUser['channels'][number];
export type Permission = admin.Permission;
export * from './in-person';
export * from './native-mobile';
export type Entitlement =
  admin.TenantEntitlementsQuery['ownEntitlements'][number];
export type BillingSubject = admin.BillingSubjectInput;
export type CartSnapshot = shop.CartSnapshotQuery['activeOrder'];

export function createShopApi(
  options: TransportOptions & { channelToken: string },
) {
  const execute = transport('shop', options);
  return {
    session: () =>
      execute({ api: 'shop', document: shop.ShopCustomerSessionDocument }, {}),
    marketCatalog: (variables: shop.MarketCatalogQueryVariables) =>
      execute({ api: 'shop', document: shop.MarketCatalogDocument }, variables),
    vendorProducts: (variables: shop.VendorProductsQueryVariables) =>
      execute(
        { api: 'shop', document: shop.VendorProductsDocument },
        variables,
      ),
    cart: () =>
      execute({ api: 'shop', document: shop.CartSnapshotDocument }, {}),
  };
}
export function createAdminApi(options: TransportOptions) {
  const execute = transport('admin', options);
  return {
    session: () =>
      execute({ api: 'admin', document: admin.AdminSessionDocument }, {}),
    vendorIdentity: () =>
      execute({ api: 'admin', document: admin.VendorIdentityDocument }, {}),
    marketIdentity: () =>
      execute({ api: 'admin', document: admin.MarketIdentityDocument }, {}),
    entitlements: (subject: admin.BillingSubjectInput) =>
      execute(
        { api: 'admin', document: admin.TenantEntitlementsDocument },
        { subject },
      ),
  };
}
export * from './market-operations';
export * from './notifications';
export type * from './compliance-phase3';

export * from './dashboard-preferences';
export * from './inbox';

export * from './loyalty';
export * from './market-loyalty';
export * from './finance';
export type * from './quickbooks';
export { createAccountTimezoneApi } from './account-timezone';
export * from './storefront-appearance';

export * from './vendor-categories';

export * from './product-information';

export * from './contact';

export * from './applicant-applications';
export * from './market-discovery';
export * from './application-rules';

export * from './attendance';
export {
  createTeamApi,
  type TeamApi,
  type TeamMember,
  type TeamInvitation,
  type TeamPolicy,
  type EmployeeRole,
} from './team';

export * from './product-taxonomy';

export * from './storefront-taxonomy';
