import * as shop from './generated/shop';
import * as admin from './generated/admin';
import { transport, type TransportOptions } from './transport';
export * from './vendor';
export * from './market';
export * from './storefront';
export * from './market-storefront';
export * from './checkout';
export * from './management';
export * from './preferences';
export { AppError, safeError, safeMessages } from './errors';
export type { ErrorKind } from './errors';
export type AdminUser = NonNullable<admin.AdminSessionQuery['me']>;
export type CustomerUser = NonNullable<shop.ShopCustomerSessionQuery['me']>;
export type AdminChannel = AdminUser['channels'][number];
export type Permission = admin.Permission;
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
    login: (variables: shop.ShopLoginMutationVariables) =>
      execute({ api: 'shop', document: shop.ShopLoginDocument }, variables),
    logout: () =>
      execute({ api: 'shop', document: shop.ShopLogoutDocument }, {}),
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
    login: (variables: admin.AdminLoginMutationVariables) =>
      execute({ api: 'admin', document: admin.AdminLoginDocument }, variables),
    logout: () =>
      execute({ api: 'admin', document: admin.AdminLogoutDocument }, {}),
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
