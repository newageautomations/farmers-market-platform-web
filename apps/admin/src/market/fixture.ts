/** Explicit development/test command simulator. Removed from fixture-disabled bundles. */
import {
  AppError,
  type MarketApi,
  type MarketConfiguration,
  type MarketOccurrence,
  type MarketRelationshipState,
  type MarketOperationsPage,
  type MarketAnalyticsPage,
  type Membership,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
import { guardMarketService, type MarketAvailability } from './service';

export type MarketFault =
  'none' | 'unavailable' | 'conflict' | 'forbidden' | 'validation';
export const marketGrantPresets = {
  full: [
    'ReadOwnMarket',
    'ManageOwnMarketSchedule',
    'ManageOwnMarketMemberships',
    'ManageOwnMarketOccurrences',
    'ManageOwnMarketListings',
    'ManageOwnMarketOfferings',
    'ReadOwnMarketAnalytics',
    'ReadOwnBilling',
  ],
  schedule: [
    'ReadOwnMarket',
    'ManageOwnMarketSchedule',
    'ManageOwnMarketOccurrences',
  ],
  relationships: [
    'ReadOwnMarket',
    'ManageOwnMarketMemberships',
    'ManageOwnMarketListings',
    'ManageOwnMarketOfferings',
  ],
  operations: ['ReadOwnMarket'],
  analytics: ['ReadOwnMarket', 'ReadOwnMarketAnalytics', 'ReadOwnBilling'],
} as const;
export function marketFixtureContext(
  marketId = '1',
  preset: keyof typeof marketGrantPresets = 'full',
): AdminContext {
  return {
    scope: 'MARKET',
    name: marketId === '1' ? 'Synthetic Market A' : 'Synthetic Market B',
    source: 'fixture',
    subject: { marketId },
    permissions: marketGrantPresets[preset],
    marketStatus: 'active',
    branding: { logo: null, accent: '#315947' },
  };
}
export function createMarketFixtureData(marketId: string, now = Date.now()) {
  const prefix = marketId;
  const name = marketId === '1' ? 'Synthetic Market A' : 'Synthetic Market B';
  const day = new Date(now).toISOString().slice(0, 10);
  const date = (offset: number) =>
    new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86400000)
      .toISOString()
      .slice(0, 10);
  const rule = {
    opensDaysBefore: 7,
    opensTime: '09:00',
    closesDaysBefore: 1,
    closesTime: '18:00',
  };
  const configuration: MarketConfiguration = {
    id: marketId,
    name,
    slug: `synthetic-market-${prefix}`,
    status: 'active',
    timezone: 'America/Chicago',
    venue: `${name} fixture venue`,
    pickupInstructions: `${name} fixture pickup instructions`,
    version: 1,
    recurrenceVersion: 1,
    policyVersion: 1,
    recurrence: {
      frequency: 'weekly',
      weekInterval: 1,
      monthWeeks: [],
      weekdays: [6],
      startTime: '10:00',
      endTime: '14:00',
      endDayOffset: 0,
      effectiveFrom: day,
      effectiveUntil: null,
    },
    defaultPreorderRule: rule,
    overridePolicy: {
      membershipAllowed: true,
      participationAllowed: true,
      vendorWindowMode: 'narrower',
      closeMinutesBeforeStart: 60,
    },
  };
  const occurrence = (
    id: string,
    offset: number,
    source: string,
  ): MarketOccurrence => ({
    id,
    marketId,
    scheduleDate: date(offset),
    source,
    startsAt: `${date(offset)}T15:00:00.000Z`,
    endsAt: `${date(offset)}T19:00:00.000Z`,
    localStartsAt: `${date(offset)}T10:00`,
    localEndsAt: `${date(offset)}T14:00`,
    originalLocalStart: `${date(offset)}T10:00`,
    originalLocalEnd: `${date(offset)}T14:00`,
    timezone: configuration.timezone,
    venue: configuration.venue,
    pickupInstructions: configuration.pickupInstructions,
    status: 'scheduled',
    version: 1,
    recurrenceVersion: 1,
    configurationVersion: 1,
    policyVersion: 1,
    preorderOverride: null,
  });
  const occurrences = [
    occurrence(`${prefix}01`, 5, 'generated'),
    occurrence(`${prefix}02`, 12, 'manual'),
  ];
  const memberships: Membership[] = [
    'pending',
    'approved',
    'suspended',
    'approved',
    'approved',
  ].map((status, index) => ({
    id: `${prefix}${index + 1}`,
    marketId,
    vendorId: `${prefix}00${index + 1}`,
    status,
    version: 1,
    preorderDefault: null,
    market: { id: marketId, name, slug: configuration.slug },
  }));
  const states: Record<string, MarketRelationshipState> = {};
  for (const [index, member] of memberships.entries()) {
    const attendance = {
      id: `${member.id}01`,
      membershipId: member.id,
      occurrenceId: occurrences[0]!.id,
      status: ['planned', 'confirmed', 'cancelled', 'confirmed', 'planned'][
        index
      ]!,
      preorderOverride: null,
      pickupInstructions: '',
      version: 1,
    };
    const listing = {
      id: `${member.id}1`,
      membershipId: member.id,
      variantId: `${prefix}000${index + 1}`,
      status: index === 0 ? 'pending' : 'approved',
      version: 1,
    };
    states[member.id] = {
      membership: member,
      occurrences: [occurrences[0]!],
      participations: [attendance],
      listings: [listing],
      offerings:
        index === 1
          ? [
              {
                id: `${member.id}001`,
                participationId: attendance.id,
                listingId: listing.id,
                variantId: listing.variantId,
                enabled: true,
                preorderEnabled: true,
                salesCap: 20,
                version: 1,
                effectivePreorderOpensAt: `${date(0)}T14:00:00.000Z`,
                effectivePreorderClosesAt: `${date(4)}T23:00:00.000Z`,
                windowProvenance: {
                  source: 'market',
                  timezone: configuration.timezone,
                  marketVersion: 1,
                  occurrenceVersion: 1,
                  membershipVersion: 1,
                  participationVersion: 1,
                  policyVersion: 1,
                  rule,
                },
              },
            ]
          : [],
    };
  }
  const operations: MarketOperationsPage = {
    totalItems: 23,
    items: Array.from({ length: 23 }, (_, index) => ({
      customerOrderId: `${prefix}9${String(index + 1).padStart(2, '0')}`,
      occurrenceId: occurrences[0]!.id,
      portions: [0, 1].map((vendor) => ({
        operationalOrderId: `${prefix}8${index + 1}${vendor}`,
        vendorId: memberships[vendor]!.vendorId,
        nativeState: vendor === 0 ? 'PartiallyDelivered' : 'PaymentSettled',
        pickupStatus: vendor === 0 ? 'PARTIALLY_COMPLETED' : 'AWAITING',
        lines: [
          {
            operationalLineId: `${prefix}7${index + 1}${vendor}`,
            variantId: states[memberships[vendor]!.id]!.listings[0]!.variantId,
            variantName: `${name} synthetic operational item ${vendor + 1}`,
            sku: `FIXTURE-${prefix}-${vendor + 1}`,
            quantity: 5,
            fulfilledQuantity: vendor === 0 ? 2 : 0,
            cancelledQuantity: vendor === 0 ? 1 : 0,
            remainingQuantity: vendor === 0 ? 2 : 5,
          },
        ],
        fulfillments:
          vendor === 0
            ? [
                {
                  id: `${prefix}6${index + 1}`,
                  state: 'Delivered',
                  lines: [
                    {
                      operationalLineId: `${prefix}7${index + 1}${vendor}`,
                      quantity: 2,
                    },
                  ],
                },
              ]
            : [],
        pickupPromise: {
          mode: 'MARKET_OCCURRENCE',
          venue: configuration.venue,
          instructions: configuration.pickupInstructions,
          startsAt: occurrences[0]!.startsAt,
          endsAt: occurrences[0]!.endsAt,
        },
      })),
    })),
  };
  const analytics: MarketAnalyticsPage = {
    metadata: {
      projectionCode: 'commerce',
      schemaVersion: 1,
      status: 'ACTIVE',
      generationId: `${prefix}501`,
      activeGenerationId: `${prefix}501`,
      sourceAsOf: `${day}T00:00:00.000Z`,
      asOf: `${day}T00:00:00.000Z`,
      completeness: 'COMPLETE_SNAPSHOT',
      lastSuccessfulAt: `${day}T00:00:00.000Z`,
      lastReconciledAt: null,
      errorCode: null,
      technicalBucket: 'UTC_DAY',
      marketFinancialPolicy: 'NOT_CONFIGURED',
    },
    items: [
      {
        day,
        occurrenceId: null,
        purchaseCount: '23',
        marketPurchaseCount: '23',
        purchasingVendors: '2',
        participatingVendors: '2',
        originalUnits: '230',
        fulfilledUnits: '46',
        cancelledUnits: '23',
        awaitingPortions: '23',
        completedPortions: '0',
        cancelledPortions: '0',
        plannedParticipations: '2',
        confirmedParticipations: '2',
        cancelledParticipations: '1',
      },
    ],
    nextCursor: null,
  };
  return {
    configuration,
    occurrences,
    memberships,
    states,
    operations,
    analytics,
    occurrence,
  };
}
export function createFixtureMarketService(
  context: AdminContext,
  availability: MarketAvailability = 'ALLOWED',
  fault: MarketFault = 'none',
  projection = 'ACTIVE',
  onAuthorityFailure: () => void = () => {},
) {
  if (!context.subject || !('marketId' in context.subject))
    throw new AppError('forbidden');
  const marketId = context.subject.marketId;
  const data = createMarketFixtureData(marketId);
  Object.assign(data.analytics, {
    metadata: {
      ...data.analytics.metadata,
      status: projection,
      ...(projection === 'UNBUILT'
        ? {
            generationId: null,
            activeGenerationId: null,
            completeness: 'UNBUILT',
          }
        : {}),
    },
  });
  function check(command = false) {
    if (
      fault === 'forbidden' ||
      fault === 'unavailable' ||
      (command && fault !== 'none')
    )
      throw new AppError(fault);
  }
  function version(actual: number, expected: number | null | undefined) {
    check(true);
    if (actual !== expected) throw new AppError('conflict');
  }
  function own(id: string | number) {
    if (String(id) !== marketId) throw new AppError('forbidden');
  }
  function stateForMember(id: string | number) {
    const state = data.states[String(id)];
    if (!state) throw new AppError('forbidden');
    return state;
  }
  function occurrence(id: string | number) {
    const row = data.occurrences.find((row) => row.id === String(id));
    if (!row) throw new AppError('forbidden');
    return row;
  }

  let jobReads = 0;
  const directory = Array.from({ length: 23 }, (_, i) => ({
    id: `${marketId}90${i}`,
    name: `${data.configuration.name} Eligible Vendor ${i + 1}`,
    slug: `eligible-${marketId}-${i}`,
    status: 'active',
  }));
  function page<T>(
    rows: readonly T[],
    options: {
      take?: number | null;
      skip?: number | null;
      search?: string | null;
    } = {},
  ) {
    const take = options.take ?? 20,
      skip = options.skip ?? 0;
    if (
      take < 1 ||
      take > 100 ||
      skip < 0 ||
      skip > 1000000 ||
      (options.search?.length ?? 0) > 200
    )
      throw new AppError('validation');
    return {
      totalItems: rows.length,
      items: structuredClone(rows.slice(skip, skip + take)),
    };
  }
  function memberDisplay(member: MarketRelationshipState['membership']) {
    return {
      ...member,
      vendor: {
        id: member.vendorId,
        name:
          directory.find((v) => v.id === member.vendorId)?.name ??
          `${data.configuration.name} Vendor ${data.memberships.findIndex((m) => m.id === member.id) + 1}`,
        slug: `vendor-${member.vendorId}`,
        status: 'active',
      },
    };
  }
  function listingDisplay(
    listing: MarketRelationshipState['listings'][number],
  ) {
    return {
      ...listing,
      variant: {
        id: listing.variantId,
        name: `${data.configuration.name} Harvest Variant`,
        sku: `MARKET-${listing.variantId}`,
        product: {
          id: `${listing.variantId}1`,
          name: `${data.configuration.name} Harvest Product`,
        },
      },
      publication: {
        listingId: listing.id,
        variantId: listing.variantId,
        productId: `${listing.variantId}1`,
        marketId,
        state: 'UNPUBLISHED' as const,
      },
    };
  }

  const api: MarketApi = {
    identity: async () => {
      check();
      return {
        id: marketId,
        name: data.configuration.name,
        slug: data.configuration.slug,
        status: data.configuration.status,
        version: data.configuration.version,
        channelId: marketId,
        permissions: [...context.permissions],
        membership: {
          id: `${marketId}99`,
          marketId,
          principalId: 'fixture-user',
          role: 'marketAdmin',
          status: 'active',
        },
      };
    },
    configuration: async (id) => {
      check();
      own(id);
      return structuredClone(data.configuration);
    },
    occurrences: async (id, from, through) => {
      check();
      own(id);
      return structuredClone(
        data.occurrences.filter(
          (row) => row.startsAt >= from && row.startsAt < through,
        ),
      );
    },
    relationships: async (id) => {
      check();
      own(id);
      return structuredClone(data.memberships);
    },
    relationshipState: async (id) => {
      check();
      return structuredClone(stateForMember(id));
    },

    eligibleVendors: async (options = {}) => {
      check();
      return page(
        directory
          .filter((v) => !data.memberships.some((m) => m.vendorId === v.id))
          .filter(
            (v) =>
              !options.search ||
              v.name.toLowerCase().includes(options.search.toLowerCase()) ||
              v.slug.includes(options.search),
          ),
        options,
      );
    },
    relationshipPage: async (options = {}) => {
      check();
      return page(
        data.memberships
          .map(memberDisplay)
          .filter(
            (m) =>
              (!options.status || m.status === options.status) &&
              (!options.search ||
                m.vendor.name
                  .toLowerCase()
                  .includes(options.search.toLowerCase())),
          )
          .sort(
            (a, b) =>
              a.vendor.name.localeCompare(b.vendor.name) ||
              Number(a.id) - Number(b.id),
          ),
        options,
      );
    },
    occurrencePage: async (options = {}) => {
      check();
      return page(
        data.occurrences
          .filter(
            (r) =>
              (!options.from || r.startsAt >= options.from) &&
              (!options.through || r.startsAt < options.through),
          )
          .sort(
            (a, b) =>
              a.startsAt.localeCompare(b.startsAt) ||
              Number(a.id) - Number(b.id),
          ),
        options,
      );
    },
    occurrence: async (id) => {
      check();
      return structuredClone(occurrence(id));
    },
    relationshipDetail: async (id, pages = {}) => {
      check();
      const state = stateForMember(id);
      return {
        membership: memberDisplay(state.membership),
        occurrences: page(state.occurrences, { skip: pages.occurrences }),
        participations: page(state.participations, {
          skip: pages.participations,
        }),
        listings: page(state.listings.map(listingDisplay), {
          skip: pages.listings,
        }),
        offerings: page(state.offerings, { skip: pages.offerings }),
      };
    },
    overview: async (options = {}) => {
      check();
      const upcoming = data.occurrences
        .filter(
          (r) =>
            r.status === 'scheduled' &&
            Date.parse(r.startsAt) >= Date.now() &&
            (!options.from || r.startsAt >= options.from) &&
            (!options.through || r.startsAt < options.through),
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      return {
        asOf: new Date().toISOString(),
        totalVendorRelationships: data.memberships.length,
        approvedVendorRelationships: data.memberships.filter(
          (r) => r.status === 'approved',
        ).length,
        pendingVendorRelationships: data.memberships.filter(
          (r) => r.status === 'pending',
        ).length,
        suspendedVendorRelationships: data.memberships.filter(
          (r) => r.status === 'suspended',
        ).length,
        withdrawnVendorRelationships: data.memberships.filter(
          (r) => r.status === 'withdrawn',
        ).length,
        upcomingScheduledOccurrences: upcoming.length,
        nextOccurrence: upcoming[0] ?? null,
      };
    },
    listingPublication: async (id) => {
      check();
      const listing = Object.values(data.states)
        .flatMap((s) => s.listings)
        .find((l) => l.id === id);
      if (!listing) throw new AppError('forbidden');
      return listingDisplay(listing).publication;
    },
    generationStatus: async (id) => {
      check();
      if (id !== `fixture-job-${marketId}`) throw new AppError('forbidden');
      jobReads++;
      return {
        jobId: id,
        status:
          jobReads === 1 ? 'PENDING' : jobReads === 2 ? 'RUNNING' : 'COMPLETED',
        submittedAt: new Date().toISOString(),
        startedAt: jobReads > 1 ? new Date().toISOString() : null,
        settledAt: jobReads > 2 ? new Date().toISOString() : null,
        errorCode: null,
        matchedOccurrences: jobReads > 2 ? 0 : null,
      };
    },

    configure: async (input) => {
      own(input.marketId);
      version(data.configuration.version, input.expectedVersion);
      data.configuration = {
        ...data.configuration,
        ...input,
        version: data.configuration.version + 1,
        policyVersion: data.configuration.policyVersion + 1,
      };
      return data.configuration;
    },
    recurrence: async (id, expected, recurrence) => {
      own(id);
      version(data.configuration.version, expected);
      data.configuration = {
        ...data.configuration,
        recurrence: recurrence
          ? {
              ...recurrence,
              frequency: recurrence.frequency ?? 'weekly',
              weekInterval: recurrence.weekInterval ?? 1,
              monthWeeks: recurrence.monthWeeks ?? [],
              weekdays: Array.isArray(recurrence.weekdays)
                ? recurrence.weekdays
                : [recurrence.weekdays],
              effectiveUntil: recurrence.effectiveUntil ?? null,
            }
          : null,
        version: data.configuration.version + 1,
        recurrenceVersion: data.configuration.recurrenceVersion + 1,
      };
      return data.configuration;
    },
    generate: async (id) => {
      check(true);
      own(id);
      if (data.configuration.status !== 'active')
        throw new AppError('validation');
      if (!data.configuration.recurrence) return [];
      const row = data.occurrence(`${marketId}03`, 19, 'generated');
      if (!data.occurrences.some((item) => item.id === row.id))
        data.occurrences.push(row);
      return structuredClone(data.occurrences);
    },
    enqueue: async (id) => {
      check(true);
      own(id);
      jobReads = 0;
      return { id: `fixture-job-${marketId}` };
    },
    manual: async (id, scheduleDate, _generationKey, input) => {
      check(true);
      own(id);
      const row = {
        ...data.occurrence(`${marketId}04`, 20, 'manual'),
        ...input,
        preorderOverride: input.preorderOverride ?? null,
        scheduleDate,
      };
      data.occurrences.push(row);
      return row;
    },
    reviseOccurrence: async (id, expected, input) => {
      const row = occurrence(id);
      version(row.version, expected);
      if (row.status === 'cancelled') throw new AppError('validation');
      Object.assign(row, input, {
        preorderOverride: input.preorderOverride ?? null,
        version: row.version + 1,
      });
      return structuredClone(row);
    },
    cancelOccurrence: async (id, expected) => {
      const row = occurrence(id);
      version(row.version, expected);
      Object.assign(row, { status: 'cancelled', version: row.version + 1 });
      return structuredClone(row);
    },
    membershipStatus: async (id, vendorId, status, expected) => {
      own(id);
      const row = data.memberships.find(
        (member) => member.vendorId === vendorId,
      );
      if (!row) {
        check(true);
        const candidate = directory.find((v) => v.id === vendorId);
        if (!candidate || expected != null) throw new AppError('forbidden');
        const member = {
          id: `${marketId}70${data.memberships.length}`,
          marketId,
          vendorId,
          status,
          version: 1,
          preorderDefault: null,
          market: {
            id: marketId,
            name: data.configuration.name,
            slug: data.configuration.slug,
          },
        };
        data.memberships.push(member);
        data.states[member.id] = {
          membership: member,
          occurrences: [],
          participations: [],
          listings: [],
          offerings: [],
        };
        return structuredClone(member);
      }
      version(row.version, expected);
      Object.assign(row, { status, version: row.version + 1 });
      return structuredClone(row);
    },
    approveListing: async (id, expected, status) => {
      const state = Object.values(data.states).find((state) =>
        state.listings.some((row) => row.id === id),
      );
      const row = state?.listings.find((row) => row.id === id);
      if (!row || !state) throw new AppError('forbidden');
      version(row.version, expected);
      if (status === 'approved' && state.membership.status !== 'approved')
        throw new AppError('validation');
      Object.assign(row, { status, version: row.version + 1 });
      return structuredClone(row);
    },
    participation: async (input) => {
      const state = stateForMember(input.membershipId);
      const target = occurrence(input.occurrenceId);
      check(true);
      if (
        input.status !== 'cancelled' &&
        (state.membership.status !== 'approved' ||
          target.status !== 'scheduled')
      )
        throw new AppError('validation');
      const prior = state.participations.find(
        (row) => row.occurrenceId === input.occurrenceId,
      );
      if (prior) {
        version(prior.version, input.expectedVersion);
        Object.assign(prior, input, { version: prior.version + 1 });
        return prior;
      }
      const row = {
        ...input,
        id: `${input.membershipId}02`,
        preorderOverride: input.preorderOverride ?? null,
        version: 1,
      };
      Object.assign(state, { participations: [...state.participations, row] });
      return row;
    },
    offering: async (input) => {
      check(true);
      const state = Object.values(data.states).find((state) =>
        state.participations.some((row) => row.id === input.participationId),
      );
      const participation = state?.participations.find(
          (row) => row.id === input.participationId,
        ),
        listing = state?.listings.find((row) => row.id === input.listingId);
      if (
        !state ||
        !participation ||
        !listing ||
        listing.variantId !== input.variantId
      )
        throw new AppError('validation');
      if (
        input.enabled &&
        (state.membership.status !== 'approved' ||
          participation.status !== 'confirmed' ||
          listing.status !== 'approved' ||
          data.configuration.status !== 'active')
      )
        throw new AppError('validation');
      const prior = state.offerings.find(
        (row) =>
          row.participationId === input.participationId &&
          row.variantId === input.variantId,
      );
      if (prior) version(prior.version, input.expectedVersion);
      const template = data.states[`${marketId}2`]!.offerings[0]!;
      const row = {
        ...template,
        ...input,
        salesCap: input.salesCap ?? null,
        id: prior?.id ?? `${participation.id}1`,
        version: (prior?.version ?? 0) + 1,
      };
      Object.assign(state, {
        offerings: [
          ...state.offerings.filter((item) => item.id !== row.id),
          row,
        ],
      });
      return row;
    },
    rematerialize: async (id, expected) => {
      const state = Object.values(data.states).find((state) =>
        state.offerings.some((row) => row.id === id),
      );
      const row = state?.offerings.find((row) => row.id === id);
      if (!row) throw new AppError('forbidden');
      version(row.version, expected);
      const updated = {
        ...row,
        version: row.version + 1,
        windowProvenance: {
          ...row.windowProvenance,
          marketVersion: data.configuration.version,
        },
      };
      Object.assign(state!, {
        offerings: state!.offerings.map((item) =>
          item.id === id ? updated : item,
        ),
      });
      return updated;
    },
    operations: async (id, skip) => {
      check();
      occurrence(id);
      return {
        totalItems:
          id === data.occurrences[0]!.id ? data.operations.totalItems : 0,
        items:
          id === data.occurrences[0]!.id
            ? structuredClone(data.operations.items.slice(skip, skip + 20))
            : [],
      };
    },
    featureAvailability: async () => {
      check();
      return {
        boundary: 'analytics.market.read',
        state: availability,
        reason: 'EXPLICIT_FIXTURE',
        featureCode: null,
      };
    },
    analytics: async (id, range) => {
      check();
      own(id);
      if (availability !== 'ALLOWED') throw new AppError('entitlement');
      return structuredClone({
        ...data.analytics,
        items:
          projection === 'UNBUILT'
            ? []
            : data.analytics.items.filter(
                (row) =>
                  row.day >= range.start.slice(0, 10) &&
                  row.day < range.end.slice(0, 10),
              ),
      });
    },
    occurrenceAnalytics: async (id, range, occurrenceId) => {
      if (occurrenceId) occurrence(occurrenceId);
      const page = await api.analytics(id, range);
      return {
        ...page,
        items: page.items.map((row) => ({
          ...row,
          occurrenceId: occurrenceId ?? data.occurrences[0]!.id,
        })),
      };
    },
  };
  return guardMarketService(context, api, onAuthorityFailure);
}
