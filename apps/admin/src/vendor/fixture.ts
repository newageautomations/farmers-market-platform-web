// Development-only simulated server. Imported exclusively through FixtureAdmin.
// Its read ports do not claim to be existing GraphQL operations.
import {
  AppError,
  type AnalyticsMetadata,
  type AnalyticsPage,
  type AnalyticsTotals,
  type Customer,
  type CustomerPage,
  type MembershipState,
  type Portion,
  type Purchase,
  type Receipt,
  type VendorApi,
} from '@market/api';
import { hasPermission } from '@market/auth';
import { mayCommand, type AdminContext } from '@market/admin-core';
import type {
  Availability,
  CatalogProduct,
  OrderView,
  VendorService,
} from './service';

export type FixtureFault =
  'none' | 'unavailable' | 'conflict' | 'forbidden' | 'validation';
export function createFixtureVendorService(
  context: AdminContext,
  availability: Availability = 'allowed',
  fault: FixtureFault = 'none',
  projection = 'ACTIVE',
): VendorService {
  const vendorId =
    context.subject && 'vendorId' in context.subject
      ? context.subject.vendorId
      : '1';
  const seed = Number(vendorId) * 1000,
    tag = vendorId === '1' ? 'Synthetic A' : 'Synthetic B';
  let counter = seed + 900;
  const clone = <T>(value: T): T => structuredClone(value);
  const now = new Date().toISOString();
  const metadata: AnalyticsMetadata = {
    projectionCode: 'commerce-v1',
    schemaVersion: 1,
    status: projection,
    generationId: '1',
    activeGenerationId: '1',
    sourceAsOf: now,
    asOf: now,
    completeness: 'COMPLETE_SNAPSHOT',
    lastSuccessfulAt: now,
    lastReconciledAt: now,
    errorCode: null,
    technicalBucket: 'UTC_DAY',
    marketFinancialPolicy: 'NOT_CONFIGURED',
  };
  let products: CatalogProduct[] = Array.from({ length: 23 }, (_, i) => ({
    id: String(seed + i + 1),
    name: `${tag} Product ${i + 1}`,
    slug: `synthetic-${vendorId}-${i + 1}`,
    description: 'Development fixture product description',
    enabled: i !== 2,
    currency: 'USD',
    optionGroups: [],
    variants: [
      {
        id: String(seed + i + 101),
        name: `${tag} Variant ${i + 1}`,
        sku: `SYN-${vendorId}-${i + 1}`,
        enabled: true,
        price: 825 + i,
        currency: 'USD' as const,
        optionIds: [],
      },
      ...(i === 0
        ? [
            {
              id: String(seed + 150),
              name: `${tag} Family box`,
              sku: `SYN-${vendorId}-BOX`,
              enabled: false,
              price: 1800,
              currency: 'USD' as const,
              optionIds: [],
            },
          ]
        : []),
    ],
  }));
  const stocks = new Map<
    string,
    { onHand: number; allocated: number; held: number }
  >(
    products.flatMap((p, i) =>
      p.variants.map(
        (v) =>
          [
            v.id,
            {
              onHand: i === 2 ? 0 : 50,
              allocated: i === 0 ? 7 : 0,
              held: i === 0 ? 3 : 0,
            },
          ] as const,
      ),
    ),
  );
  const customers: Customer[] = Array.from({ length: 23 }, (_, i) => ({
    id: String(seed + 201 + i),
    customerId: String(seed + 301 + i),
    firstName: `${tag} Customer`,
    lastName: String(i + 1),
    emailAddress: `synthetic-${vendorId}-${i + 1}@example.invalid`,
    status: 'active',
    purpose: 'PURCHASE_RELATIONSHIP',
    firstActivityAt: now,
    lastActivityAt: now,
    purchaseCount: i === 0 ? 22 : 1,
    attribution: [
      { currency: 'USD', original: 4100, refunded: 800, remaining: 3300 },
    ],
  }));
  const pickup = {
    mode: 'MARKET_PICKUP',
    venue: `${tag} pavilion`,
    instructions: `${tag} pickup at north table`,
    startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
  };
  let orderViews: OrderView[] = Array.from({ length: 23 }, (_, i) => ({
    portion: {
      operationalOrderId: String(seed + 401 + i),
      vendorId,
      kind: i % 2 === 0 ? 'MARKET_OCCURRENCE' : 'DIRECT_VENDOR',
      marketId: i % 2 === 0 ? String(seed + 801) : null,
      marketName: i % 2 === 0 ? `${tag} Market 1` : null,
      occurrenceId: i % 2 === 0 ? String(seed + 811) : null,
      occurrenceStartsAt: i % 2 === 0 ? pickup.startsAt : null,
      placedAt: now,
      lineCount: 1,
      quantity: 5,
      fulfilledQuantity: i === 0 ? 2 : 0,
      cancelledQuantity: i === 0 ? 1 : 0,
      remainingQuantity: i === 0 ? 2 : 5,
      nativeState: i === 0 ? 'PartiallyShipped' : 'PaymentSettled',
      pickupStatus: 'AWAITING_PICKUP',
      lines: [
        {
          customerLineId: String(seed + 500 + i),
          operationalLineId: String(seed + 600 + i),
          variantId: String(seed + 101),
          variantName: `${tag} Variant 1`,
          sku: `SYN-${vendorId}-1`,
          remainingQuantity: i === 0 ? 2 : 5,
          quantity: 5,
          fulfilledQuantity: i === 0 ? 2 : 0,
          cancelledQuantity: i === 0 ? 1 : 0,
        },
      ],
      fulfillments:
        i === 0
          ? [
              {
                id: String(seed + 701),
                state: 'Shipped',
                lines: [{ operationalLineId: String(seed + 600), quantity: 2 }],
              },
            ]
          : [],
      pickupPromise:
        i % 2 === 0
          ? pickup
          : {
              mode: 'VENDOR_PICKUP',
              venue: `${tag} farm gate`,
              instructions: 'Collect at the farm gate',
              startsAt: null,
              endsAt: null,
            },
    },
    context: {
      kind: i % 2 === 0 ? 'MARKET_OCCURRENCE' : 'DIRECT_VENDOR',
      marketId: i % 2 === 0 ? String(seed + 801) : null,
      occurrenceId: i % 2 === 0 ? String(seed + 811) : null,
      financialStatus: 'PARTIALLY_REFUNDED',
      currency: 'USD',
      original: 4100,
      refunded: 800,
      remaining: 3300,
    },
  }));
  const states = new Map<string, MembershipState>(
    [0, 1, 2, 3].map((i) => {
      const id = String(seed + 821 + i),
        marketId = String(seed + 801 + i),
        occurrenceId = String(seed + 811 + i),
        participationId = String(seed + 831 + i),
        listingId = String(seed + 841 + i),
        rule = {
          opensDaysBefore: 7,
          opensTime: '09:00',
          closesDaysBefore: 1,
          closesTime: '18:00',
        };
      return [
        id,
        {
          membership: {
            id,
            marketId,
            market: {
              id: marketId,
              name: `${tag} Market ${i + 1}`,
              slug: `synthetic-market-${i + 1}`,
            },
            vendorId,
            status: ['approved', 'pending', 'suspended', 'withdrawn'][i]!,
            version: 1,
            preorderDefault: null,
          },
          occurrences: [
            {
              id: occurrenceId,
              marketId,
              scheduleDate: pickup.startsAt.slice(0, 10),
              startsAt: pickup.startsAt,
              endsAt: pickup.endsAt,
              timezone: 'America/Chicago',
              venue: `${tag} pavilion ${i + 1}`,
              pickupInstructions: 'Collect at north table',
              status: 'scheduled',
              version: 1,
            },
          ],
          participations: [
            {
              id: participationId,
              occurrenceId,
              membershipId: id,
              status: i === 0 ? 'confirmed' : 'planned',
              pickupInstructions: 'Collect at north table',
              version: 1,
              preorderOverride: null,
            },
          ],
          listings: [
            {
              id: listingId,
              membershipId: id,
              variantId: String(seed + 101),
              status: i === 0 ? 'approved' : 'pending',
              version: 1,
            },
          ],
          offerings:
            i === 0
              ? [
                  {
                    id: String(seed + 851),
                    participationId,
                    listingId,
                    variantId: String(seed + 101),
                    enabled: true,
                    preorderEnabled: true,
                    salesCap: 20,
                    effectivePreorderOpensAt: new Date(
                      Date.now() - 86400000,
                    ).toISOString(),
                    effectivePreorderClosesAt: new Date(
                      Date.now() + 6 * 86400000,
                    ).toISOString(),
                    windowProvenance: {
                      source: 'MARKET_DEFAULT',
                      timezone: 'America/Chicago',
                      marketVersion: 1,
                      occurrenceVersion: 1,
                      membershipVersion: 1,
                      participationVersion: 1,
                      policyVersion: 1,
                      rule,
                    },
                    version: 1,
                  },
                ]
              : [],
        },
      ];
    }),
  );
  const metrics = {
    vendorPurchaseCount: '23',
    directPurchaseCount: '11',
    marketPurchaseCount: '12',
    vendorAttributed: '90071992547409931',
    settledRefund: '800',
    cohortSettledRefund: '800',
    vendorRemainingAttributed: '90071992547409131',
    gross: '10000',
    discount: '500',
    itemTax: '800',
    shippingNet: '-100',
    shippingTax: '20',
    originalUnits: '115',
    refundedOriginalUnits: '1',
    distinctPurchasingCustomers: '23',
    fulfilledUnits: '2',
    cancelledUnits: '1',
    awaitingPortions: '23',
    completedPortions: '0',
    cancelledPortions: '0',
    externalPosUnitsObserved: '0',
    externalPosOperations: '0',
  };
  const totals: AnalyticsTotals = {
    metadata,
    items: [
      { currency: 'USD', ...metrics },
      {
        currency: 'EUR',
        ...metrics,
        vendorAttributed: '15000',
        vendorRemainingAttributed: '14200',
      },
    ],
  };
  const rows: AnalyticsPage['items'] = Array.from({ length: 23 }, (_, i) => ({
    day: new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10),
    currency: i % 2 === 0 ? 'USD' : 'EUR',
    variantId: String(seed + 101),
    marketId: String(seed + 801),
    occurrenceId: String(seed + 811),
    ...metrics,
  }));
  const ensure = <T>(value: T | undefined): T => {
    if (value === undefined) throw new AppError('forbidden');
    return value;
  };
  const currentState = (id: string) => ensure(states.get(id));
  const version = (actual: number, expected: number | null | undefined) => {
    if (actual !== expected) throw new AppError('conflict');
  };
  const receipts = new Map<string, { fingerprint: string; receipt: Receipt }>();
  function command(
    input: { operationKey: string },
    kind: string,
    mutate: () => void,
  ): Receipt {
    const fingerprint = JSON.stringify(input),
      old = receipts.get(input.operationKey);
    if (old) {
      if (old.fingerprint !== fingerprint) throw new AppError('conflict');
      return clone(old.receipt);
    }
    mutate();
    orderViews = orderViews.map((view) => {
      const lines = view.portion.lines.map((line) => ({
        ...line,
        remainingQuantity:
          line.quantity - line.fulfilledQuantity - line.cancelledQuantity,
      }));
      return {
        ...view,
        portion: {
          ...view.portion,
          lines,
          quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
          fulfilledQuantity: lines.reduce(
            (sum, line) => sum + line.fulfilledQuantity,
            0,
          ),
          cancelledQuantity: lines.reduce(
            (sum, line) => sum + line.cancelledQuantity,
            0,
          ),
          remainingQuantity: lines.reduce(
            (sum, line) => sum + line.remainingQuantity,
            0,
          ),
        },
      };
    });
    const receipt: Receipt = {
      id: String(++counter),
      operationKey: input.operationKey,
      kind,
      status: 'APPLIED',
      movementIds: [String(counter)],
      orderId: null,
      orderLineId: null,
      fulfillmentId: null,
    };
    receipts.set(input.operationKey, { fingerprint, receipt });
    return clone(receipt);
  }
  const publicationState = new Set<string>();
  const api: VendorApi = {
    catalogRead: async (options) => ({
      totalItems: products.length,
      items: clone(
        products.slice(
          options?.skip ?? 0,
          (options?.skip ?? 0) + (options?.take ?? 20),
        ),
      ),
    }),
    productRead: async (id) => clone(ensure(products.find((p) => p.id === id))),
    orderList: async (options) => ({
      totalItems: orderViews.length,
      items: clone(
        orderViews
          .filter((o) => !options?.kind || o.portion.kind === options.kind)
          .slice(
            options?.skip ?? 0,
            (options?.skip ?? 0) + (options?.take ?? 20),
          )
          .map((o) => o.portion),
      ),
    }),
    featureAvailability: async (boundary) => ({
      boundary,
      state:
        availability === 'allowed'
          ? 'ALLOWED'
          : availability === 'denied'
            ? 'DENIED'
            : availability === 'unknown'
              ? 'UNKNOWN'
              : 'UNCONFIGURED',
      reason: 'DEVELOPMENT_FIXTURE',
      featureCode: null,
    }),
    publication: async (listingId) => {
      const s = ensure(
          [...states.values()].find((s) =>
            s.listings.some((l) => l.id === listingId),
          ),
        ),
        l = ensure(s.listings.find((l) => l.id === listingId));
      return {
        listingId,
        variantId: l.variantId,
        productId: ensure(
          products.find((p) => p.variants.some((v) => v.id === l.variantId)),
        ).id,
        marketId: s.membership.marketId,
        state: publicationState.has(listingId) ? 'PUBLISHED' : 'UNPUBLISHED',
      };
    },
    createProduct: async (input) => {
      const id = String(++counter);
      products = [
        ...products,
        {
          ...input,
          name: input.name.trim(),
          slug: input.slug.trim().toLowerCase(),
          id,
          variants: [],
          currency: 'USD',
          optionGroups: [],
        },
      ];
      return { id };
    },
    updateProduct: async (id, input) => {
      ensure(products.find((p) => p.id === id));
      products = products.map((p) =>
        p.id === id
          ? {
              ...p,
              ...input,
              name: input.name.trim(),
              slug: input.slug.trim().toLowerCase(),
            }
          : p,
      );
      return { id };
    },
    createVariant: async (input) => {
      const p = ensure(products.find((p) => p.id === input.productId)),
        id = String(++counter);
      products = products.map((row) =>
        row.id === p.id
          ? {
              ...row,
              variants: [
                ...row.variants,
                {
                  id,
                  name: input.name.trim(),
                  sku: input.sku.trim(),
                  enabled: true,
                  price: input.price,
                  currency: 'USD',
                  optionIds: (input.optionIds ?? []).map(String),
                },
              ],
            }
          : row,
      );
      stocks.set(id, { onHand: 0, allocated: 0, held: 0 });
      return { id };
    },
    updateVariant: async (id, input) => {
      ensure(products.flatMap((p) => p.variants).find((v) => v.id === id));
      products = products.map((p) => ({
        ...p,
        variants: p.variants.map((v) =>
          v.id === id
            ? { ...v, ...input, name: input.name.trim(), sku: input.sku.trim() }
            : v,
        ),
      }));
      return { id };
    },
    price: async (id, price) => {
      ensure(products.flatMap((p) => p.variants).find((v) => v.id === id));
      if (!Number.isInteger(price) || price < 0 || price > 2147483647)
        throw new AppError('validation');
      products = products.map((p) => ({
        ...p,
        variants: p.variants.map((v) => (v.id === id ? { ...v, price } : v)),
      }));
      return { id };
    },
    inventory: async (id, after = null) => {
      if (id !== vendorId) throw new AppError('forbidden');
      const sorted = [...stocks]
          .sort(([a], [b]) => Number(a) - Number(b))
          .filter(([id]) => !after || Number(id) > Number(after)),
        page = sorted.slice(0, 20);
      return {
        totalItems: stocks.size,
        asOf: new Date().toISOString(),
        items: page.map(([variantId, s]) => {
          const product = ensure(
              products.find((p) => p.variants.some((v) => v.id === variantId)),
            ),
            variant = ensure(product.variants.find((v) => v.id === variantId));
          return {
            variantId,
            productId: product.id,
            productName: product.name,
            variantName: variant.name,
            sku: variant.sku,
            stockOnHand: s.onHand,
            stockAllocated: s.allocated,
            physicalFree: s.onHand - s.allocated - s.held,
          };
        }),
        nextCursor: sorted.length > 20 ? page.at(-1)![0] : null,
      };
    },
    restock: async (input) =>
      command(input, 'RESTOCK', () => {
        const s = ensure(stocks.get(String(input.variantId)));
        if (!Number.isInteger(input.quantity) || input.quantity <= 0)
          throw new AppError('validation');
        s.onHand += input.quantity;
      }),
    adjust: async (input) =>
      command(input, 'ADJUST', () => {
        const s = ensure(stocks.get(String(input.variantId)));
        if (!Number.isInteger(input.quantity) || input.quantity === 0)
          throw new AppError('validation');
        s.onHand += input.quantity;
      }),
    portion: async (id) =>
      clone(
        ensure(orderViews.find((o) => o.portion.operationalOrderId === id))
          .portion,
      ),
    fulfill: async (input) =>
      command(input, 'FULFILL', () => {
        const o = ensure(
            orderViews.find(
              (o) => o.portion.operationalOrderId === input.orderId,
            ),
          ),
          line = ensure(
            o.portion.lines.find(
              (l) => l.operationalLineId === input.orderLineId,
            ),
          ),
          quantity = input.quantity ?? 0;
        if (
          quantity <= 0 ||
          quantity >
            line.quantity - line.fulfilledQuantity - line.cancelledQuantity
        )
          throw new AppError('validation');
        const updated: Portion = {
          ...o.portion,
          nativeState: 'PartiallyShipped',
          lines: o.portion.lines.map((l) =>
            l === line
              ? { ...l, fulfilledQuantity: l.fulfilledQuantity + quantity }
              : l,
          ),
          fulfillments: [
            ...o.portion.fulfillments,
            {
              id: String(++counter),
              state: 'Shipped',
              lines: [{ operationalLineId: line.operationalLineId, quantity }],
            },
          ],
        };
        orderViews = orderViews.map((row) =>
          row === o ? { ...o, portion: updated } : row,
        );
        const stock = ensure(stocks.get(line.variantId));
        stock.onHand -= quantity;
        stock.allocated = Math.max(0, stock.allocated - quantity);
      }),
    cancelQuantity: async (input) =>
      command(input, 'CANCEL_UNFULFILLED', () => {
        const o = ensure(
            orderViews.find(
              (o) => o.portion.operationalOrderId === input.orderId,
            ),
          ),
          line = ensure(
            o.portion.lines.find(
              (l) => l.operationalLineId === input.orderLineId,
            ),
          ),
          quantity = input.quantity ?? 0;
        if (
          line.fulfilledQuantity ||
          quantity <= 0 ||
          quantity > line.quantity - line.cancelledQuantity
        )
          throw new AppError('validation');
        orderViews = orderViews.map((row) =>
          row === o
            ? {
                ...o,
                portion: {
                  ...o.portion,
                  lines: o.portion.lines.map((l) =>
                    l === line
                      ? {
                          ...l,
                          cancelledQuantity: l.cancelledQuantity + quantity,
                        }
                      : l,
                  ),
                },
              }
            : row,
        );
        const stock = ensure(stocks.get(line.variantId));
        stock.allocated = Math.max(0, stock.allocated - quantity);
      }),
    cancelFulfillment: async (input) =>
      command(input, 'CANCEL_FULFILLMENT', () => {
        const o = ensure(
            orderViews.find(
              (o) => o.portion.operationalOrderId === input.orderId,
            ),
          ),
          f = ensure(
            o.portion.fulfillments.find((f) => f.id === input.fulfillmentId),
          );
        if (f.state === 'Cancelled' || f.lines.length !== 1)
          throw new AppError('validation');
        const fl = f.lines[0]!,
          line = ensure(
            o.portion.lines.find(
              (l) => l.operationalLineId === fl.operationalLineId,
            ),
          );
        orderViews = orderViews.map((row) =>
          row === o
            ? {
                ...o,
                portion: {
                  ...o.portion,
                  lines: o.portion.lines.map((l) =>
                    l === line
                      ? {
                          ...l,
                          fulfilledQuantity: l.fulfilledQuantity - fl.quantity,
                          cancelledQuantity: l.cancelledQuantity + fl.quantity,
                        }
                      : l,
                  ),
                  fulfillments: o.portion.fulfillments.map((row) =>
                    row === f ? { ...f, state: 'Cancelled' } : row,
                  ),
                },
              }
            : row,
        );
        ensure(stocks.get(line.variantId)).onHand += fl.quantity;
      }),
    customers: async (options) => {
      const query = options?.search?.toLowerCase() ?? '',
        items = customers.filter((c) =>
          `${c.firstName} ${c.lastName} ${c.emailAddress}`
            .toLowerCase()
            .includes(query),
        );
      return clone({
        totalItems: items.length,
        items: items.slice(
          options?.skip ?? 0,
          (options?.skip ?? 0) + (options?.take ?? 20),
        ),
      } satisfies CustomerPage);
    },
    customer: async (id) => clone(ensure(customers.find((c) => c.id === id))),
    history: async (customerId, options) => {
      ensure(customers.find((c) => c.customerId === customerId));
      const purchases: Purchase[] = orderViews.slice(0, 22).map((o) => ({
        ...o.context!,
        operationalOrderId: o.portion.operationalOrderId,
        purchasedAt: now,
        nativeState: o.portion.nativeState,
        pickupStatus: o.portion.pickupStatus,
        lines: o.portion.lines,
        pickupPromise: o.portion.pickupPromise,
      }));
      return clone({
        totalItems: purchases.length,
        items: purchases.slice(
          options?.skip ?? 0,
          (options?.skip ?? 0) + (options?.take ?? 20),
        ),
      });
    },
    memberships: async () =>
      clone([...states.values()].map((s) => s.membership)),
    membership: async (id) => clone(currentState(id)),
    occurrences: async (id, from, through) =>
      clone(
        currentState(id).occurrences.filter(
          (o) => o.startsAt >= from && o.startsAt < through,
        ),
      ),
    marketDefault: async (id, expected, rule) => {
      const s = currentState(id);
      version(s.membership.version, expected);
      const membership = {
        ...s.membership,
        preorderDefault: rule ?? null,
        version: s.membership.version + 1,
      };
      states.set(id, { ...s, membership });
      return clone(membership);
    },
    attendance: async (input) => {
      const s = currentState(String(input.membershipId));
      ensure(s.occurrences.find((o) => o.id === input.occurrenceId));
      const old = s.participations.find(
        (p) => p.occurrenceId === input.occurrenceId,
      );
      if (old) version(old.version, input.expectedVersion);
      const p = {
        ...input,
        membershipId: String(input.membershipId),
        occurrenceId: String(input.occurrenceId),
        preorderOverride: input.preorderOverride ?? null,
        id: old?.id ?? String(++counter),
        version: (old?.version ?? 0) + 1,
      };
      states.set(String(input.membershipId), {
        ...s,
        participations: [
          ...s.participations.filter((row) => row.id !== p.id),
          p,
        ],
      });
      return clone(p);
    },
    requestListing: async (id, variantId) => {
      const s = currentState(id);
      ensure(
        products.flatMap((p) => p.variants).find((v) => v.id === variantId),
      );
      const old = s.listings.find((l) => l.variantId === variantId);
      if (old) return clone(old);
      const listing = {
        id: String(++counter),
        membershipId: id,
        variantId,
        status: 'pending',
        version: 1,
      };
      states.set(id, { ...s, listings: [...s.listings, listing] });
      return clone(listing);
    },
    offering: async (input) => {
      const s = ensure(
          [...states.values()].find((s) =>
            s.participations.some((p) => p.id === input.participationId),
          ),
        ),
        l = ensure(
          s.listings.find(
            (l) =>
              l.id === input.listingId &&
              l.variantId === input.variantId &&
              l.status === 'approved',
          ),
        ),
        old = s.offerings.find(
          (o) =>
            o.participationId === input.participationId && o.listingId === l.id,
        );
      if (old) version(old.version, input.expectedVersion);
      if (
        input.salesCap !== null &&
        input.salesCap !== undefined &&
        input.salesCap <= 0
      )
        throw new AppError('validation');
      const o = {
        ...ensure(s.offerings[0]),
        ...input,
        participationId: String(input.participationId),
        listingId: String(input.listingId),
        variantId: String(input.variantId),
        id: old?.id ?? String(++counter),
        version: (old?.version ?? 0) + 1,
        salesCap: input.salesCap ?? null,
      };
      states.set(s.membership.id, {
        ...s,
        offerings: [...s.offerings.filter((row) => row.id !== o.id), o],
      });
      return clone(o);
    },
    publish: async (listingId) => publication(listingId, true),
    unpublish: async (listingId) => publication(listingId, false),
    totals: async (id) => {
      if (id !== vendorId) throw new AppError('forbidden');
      return clone(totals);
    },
    trend: async (id, range) => analytics(id, range.after ?? null),
    productAnalytics: async (id, range) => analytics(id, range.after ?? null),
    marketAnalytics: async (id, range) => analytics(id, range.after ?? null),
    occurrenceAnalytics: async (id, range) =>
      analytics(id, range.after ?? null),
  };
  function publication(listingId: string, published: boolean) {
    const s = ensure(
        [...states.values()].find((s) =>
          s.listings.some((l) => l.id === listingId),
        ),
      ),
      l = ensure(s.listings.find((l) => l.id === listingId));
    if (l.status !== 'approved') throw new AppError('forbidden');
    if (published) publicationState.add(listingId);
    else publicationState.delete(listingId);
    return {
      listingId,
      productId: ensure(
        products.find((p) => p.variants.some((v) => v.id === l.variantId)),
      ).id,
      variantId: l.variantId,
      marketId: s.membership.marketId,
      published,
    };
  }
  function analytics(id: string, after: string | null): AnalyticsPage {
    if (id !== vendorId) throw new AppError('forbidden');
    if (after && !/^1:\d+$/.test(after)) throw new AppError('validation');
    const skip = after ? Number(after.split(':')[1]) : 0;
    return clone({
      metadata,
      items: rows.slice(skip, skip + 20),
      nextCursor: rows.length > skip + 20 ? `1:${skip + 20}` : null,
    });
  }
  const catalogCommands = [
      'createProduct',
      'updateProduct',
      'createVariant',
      'updateVariant',
      'price',
    ],
    stockCommands = [
      'restock',
      'adjust',
      'fulfill',
      'cancelQuantity',
      'cancelFulfillment',
    ],
    marketCommands = [
      'marketDefault',
      'attendance',
      'requestListing',
      'offering',
    ];
  const guarded = new Proxy(api, {
    get(target, property: keyof VendorApi) {
      return async (...args: unknown[]) => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (fault !== 'none') throw new AppError(fault);
        const permission =
          property === 'inventory'
            ? 'ManageOwnInventory'
            : catalogCommands.includes(property)
              ? 'ManageOwnCatalog'
              : stockCommands.includes(property)
                ? 'ManageOwnInventory'
                : marketCommands.includes(property)
                  ? 'ManageOwnMarketParticipation'
                  : ['publish', 'unpublish'].includes(property)
                    ? 'ManageCatalogPublication'
                    : ['customers', 'customer', 'history'].includes(property)
                      ? 'ReadOwnCRM'
                      : [
                            'totals',
                            'trend',
                            'productAnalytics',
                            'marketAnalytics',
                            'occurrenceAnalytics',
                          ].includes(property)
                        ? 'ReadOwnVendorAnalytics'
                        : 'ReadOwnVendorIdentity';
        if (
          !hasPermission(context.permissions, permission) ||
          ((catalogCommands.includes(property) ||
            stockCommands.includes(property) ||
            marketCommands.includes(property) ||
            ['publish', 'unpublish'].includes(property)) &&
            !mayCommand(context, permission))
        )
          throw new AppError('forbidden');
        return Reflect.apply(target[property], target, args);
      };
    },
  });
  return {
    ...guarded,
    context,
    vendorId,
    availability: async () =>
      hasPermission(context.permissions, 'ReadOwnVendorAnalytics')
        ? availability
        : 'denied',
    catalog: async (search, skip) => {
      if (!hasPermission(context.permissions, 'ManageOwnCatalog'))
        throw new AppError('forbidden');
      if (fault !== 'none') throw new AppError(fault);
      const items = products.filter((p) =>
        `${p.name} ${p.variants.map((v) => v.sku).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
      return clone({
        items: items.slice(skip, skip + 20),
        totalItems: items.length,
      });
    },
    product: async (id) => clone(ensure(products.find((p) => p.id === id))),
    orders: async (skip, kind) => {
      const items = orderViews.filter(
        (o) => kind === 'all' || o.context?.kind === kind,
      );
      return clone({
        items: items.slice(skip, skip + 20),
        totalItems: items.length,
      });
    },
    order: async (id) => ({
      portion: await guarded.portion(id),
      context: clone(
        ensure(orderViews.find((o) => o.portion.operationalOrderId === id))
          .context,
      ),
    }),
    variantName: (id) =>
      products.flatMap((p) => p.variants).find((v) => v.id === id)?.name ??
      'Owned variant',
    marketName: (id) => `${tag} Market ${Number(id) - seed - 800}`,
  };
}
