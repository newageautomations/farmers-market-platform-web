import {
  AppError,
  createVendorApi,
  createMarketOperationsApi,
  type VendorBoothAssignment,
  safeError,
  type VendorApi,
  type OwnedCatalogProduct,
  type OwnedCatalogPage,
  type Purchase,
  type Portion,
} from '@market/api';
import { hasPermission } from '@market/auth';
import { mayCommand, type AdminContext } from '@market/admin-core';

export type CatalogProduct = OwnedCatalogProduct;
export type CatalogVariant = CatalogProduct['variants'][number];
export type CatalogPage = OwnedCatalogPage;
export interface OrderView {
  portion: Portion;
  context: Pick<
    Purchase,
    | 'kind'
    | 'marketId'
    | 'occurrenceId'
    | 'financialStatus'
    | 'currency'
    | 'original'
    | 'refunded'
    | 'remaining'
  > | null;
}
export interface OrderPage {
  items: readonly OrderView[];
  totalItems: number;
}
export type Availability = 'allowed' | 'denied' | 'unknown' | 'unconfigured';
export interface VendorService extends VendorApi {
  boothAssignments?: () => Promise<VendorBoothAssignment[]>;
  context: AdminContext;
  vendorId: string;
  availability: () => Promise<Availability>;
  catalog: (search: string, skip: number) => Promise<CatalogPage>;
  product: (id: string) => Promise<CatalogProduct>;
  orders: (skip: number, kind: string) => Promise<OrderPage>;
  order: (id: string) => Promise<OrderView>;
  variantName: (id: string) => string;
  marketName: (id: string) => string;
}
export function createLiveVendorService(
  context: AdminContext,
  endpoint: string,
  channelToken: string,
  onAuthorityFailure: () => void,
): VendorService {
  if (
    context.scope !== 'VENDOR' ||
    !context.subject ||
    !('vendorId' in context.subject)
  )
    throw new AppError('forbidden');
  const vendorId = context.subject.vendorId;
  const api = createVendorApi({ endpoint, channelToken });
  const catalogCommands = [
    'createProduct',
    'updateProduct',
    'createVariant',
    'updateVariant',
    'price',
  ];
  const stockCommands = [
    'restock',
    'adjust',
    'fulfill',
    'cancelQuantity',
    'cancelFulfillment',
  ];
  const marketCommands = [
    'marketDefault',
    'attendance',
    'requestListing',
    'offering',
  ];
  const crmReads = ['customers', 'customer', 'history'];
  const analyticsReads = [
    'totals',
    'trend',
    'productAnalytics',
    'marketAnalytics',
    'occurrenceAnalytics',
  ];
  // Guards supplement backend authority. They never grant authority from URL or identifiers.
  const guarded = new Proxy(api, {
    get(target, property: keyof VendorApi) {
      const method = target[property];
      return async (...args: unknown[]) => {
        const permission =
          property === 'featureAvailability'
            ? 'ReadOwnBilling'
            : property === 'inventory'
              ? 'ManageOwnInventory'
              : catalogCommands.includes(property)
                ? 'ManageOwnCatalog'
                : stockCommands.includes(property)
                  ? 'ManageOwnInventory'
                  : marketCommands.includes(property)
                    ? 'ManageOwnMarketParticipation'
                    : ['publish', 'unpublish'].includes(property)
                      ? 'ManageCatalogPublication'
                      : crmReads.includes(property)
                        ? 'ReadOwnCRM'
                        : analyticsReads.includes(property)
                          ? 'ReadOwnVendorAnalytics'
                          : 'ReadOwnVendorIdentity';
        const command =
          catalogCommands.includes(property) ||
          stockCommands.includes(property) ||
          marketCommands.includes(property) ||
          ['publish', 'unpublish'].includes(property);
        if (
          !hasPermission(context.permissions, permission) ||
          (command && !mayCommand(context, permission))
        )
          throw new AppError('forbidden');
        try {
          return await Reflect.apply(method, target, args);
        } catch (error) {
          const safe = safeError(error);
          if (['forbidden', 'authentication'].includes(safe.kind))
            onAuthorityFailure();
          throw safe;
        }
      };
    },
  });
  return {
    ...guarded,
    boothAssignments: async () => {
      try {
        return await createMarketOperationsApi({
          endpoint,
          channelToken,
        }).vendorAssignments();
      } catch (error) {
        if (['authentication', 'forbidden'].includes(safeError(error).kind))
          onAuthorityFailure();
        throw error;
      }
    },
    context,
    vendorId,
    availability: async () => {
      if (!hasPermission(context.permissions, 'ReadOwnVendorAnalytics'))
        return 'denied';
      if (!hasPermission(context.permissions, 'ReadOwnBilling'))
        return 'unknown';
      const result = await guarded.featureAvailability('analytics.vendor.read');
      const states = {
        ALLOWED: 'allowed',
        DENIED: 'denied',
        UNKNOWN: 'unknown',
        UNCONFIGURED: 'unconfigured',
      } as const;
      return states[result.state];
    },
    catalog: (search, skip) =>
      guarded.catalogRead({ search, skip, take: 20, sort: 'NAME_ASC' }),
    product: (id) => guarded.productRead(id),
    orders: async (skip, kind) => {
      if (!['all', 'DIRECT_VENDOR', 'MARKET_OCCURRENCE'].includes(kind))
        throw new AppError('validation');
      const page = await guarded.orderList({
        skip,
        take: 20,
        kind:
          kind === 'DIRECT_VENDOR'
            ? 'DIRECT_VENDOR'
            : kind === 'MARKET_OCCURRENCE'
              ? 'MARKET_OCCURRENCE'
              : null,
      });
      return {
        totalItems: page.totalItems,
        items: page.items.map((portion) => ({ portion, context: null })),
      };
    },
    order: async (id) => ({
      portion: await guarded.portion(id),
      context: null,
    }),
    variantName: (id) => `Variant reference ${id}`,
    marketName: (id) => `Market reference ${id}`,
  };
}
