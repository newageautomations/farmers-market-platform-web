import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

export type MarketConfiguration = g.MarketConfigurationFragment;
export type MarketOccurrence = g.MarketOccurrenceFieldsFragment;
export type MarketRelationshipState =
  g.MarketRelationshipStateQuery['marketMembershipState'];
export type MarketOperationsPage =
  g.MarketOperationsQuery['ownOccurrenceCustomerOperations'];
export type MarketAnalyticsPage = g.MarketAnalyticsQuery['ownMarketAnalytics'];
export type MarketMetrics = g.MarketOperationalMetricsFragment;
export type MarketConfigureInput = g.MarketConfigureMutationVariables['input'];
export type MarketRecurrenceInput =
  g.MarketRecurrenceMutationVariables['recurrence'];
export type MarketSessionInput = g.MarketManualMutationVariables['input'];
export type MarketMembershipStatus =
  g.MarketMembershipStatusMutationVariables['status'];
export type MarketListingStatus =
  g.MarketApproveListingMutationVariables['status'];
export type MarketParticipationInput =
  g.MarketParticipationMutationVariables['input'];
export type MarketOfferingInput =
  g.MarketConfigureOfferingMutationVariables['input'];

export type MarketDetailPages = Partial<
  Record<'occurrences' | 'participations' | 'listings' | 'offerings', number>
>;
export type MarketRelationshipDetail = g.MarketRelationshipDetailQuery;
export type MarketOrganizerRelationshipState = {
  membership: MarketRelationshipDetail['membership'];
  occurrences: MarketRelationshipDetail['occurrences']['items'];
  participations: MarketRelationshipDetail['participations']['items'];
  listings: MarketRelationshipDetail['listings']['items'];
  offerings: MarketRelationshipDetail['offerings']['items'];
};
export type MarketGenerationJobStatus =
  g.MarketGenerationStatusQuery['ownMarketOccurrenceGenerationStatus'];

/** Market factory contains only generated, named Admin contracts. Never Vendor or Shop APIs. */
export function createMarketApi(
  options: TransportOptions & { channelToken: string },
) {
  if (!options.channelToken.trim()) throw new AppError('forbidden');
  const run = transport('admin', options);
  return {
    identity: () =>
      run({ api: 'admin', document: g.MarketIdentityDocument }, {}).then(
        (r) => r.ownMarketIdentity,
      ),
    configuration: (id: string) =>
      run(
        { api: 'admin', document: g.MarketConfigurationDocument },
        { id },
      ).then((r) => r.ownMarket),
    occurrences: (marketId: string, from: string, through: string) =>
      run(
        { api: 'admin', document: g.MarketOccurrencesDocument },
        { marketId, from, through },
      ).then((r) => r.marketOccurrences),
    relationships: (marketId: string) =>
      run(
        { api: 'admin', document: g.MarketRelationshipsDocument },
        { marketId },
      ).then((r) => r.marketVendorMemberships),
    relationshipState: (membershipId: string) =>
      run(
        { api: 'admin', document: g.MarketRelationshipStateDocument },
        { membershipId },
      ).then((r) => r.marketMembershipState),

    eligibleVendors: (
      options: Partial<
        NonNullable<g.MarketEligibleVendorsQueryVariables['options']>
      > = {},
    ) =>
      run(
        { api: 'admin', document: g.MarketEligibleVendorsDocument },
        { options: { take: 20, skip: 0, search: null, ...options } },
      ).then((r) => r.ownMarketEligibleVendors),
    relationshipPage: (
      options: Partial<
        NonNullable<g.MarketVendorPageQueryVariables['options']>
      > = {},
    ) =>
      run(
        { api: 'admin', document: g.MarketVendorPageDocument },
        {
          options: {
            take: 20,
            skip: 0,
            search: null,
            status: null,
            ...options,
          },
        },
      ).then((r) => r.ownMarketVendorMemberships),
    occurrencePage: (
      options: Partial<
        NonNullable<g.MarketOccurrencePageQueryVariables['options']>
      > = {},
    ) =>
      run(
        { api: 'admin', document: g.MarketOccurrencePageDocument },
        {
          options: { take: 20, skip: 0, from: null, through: null, ...options },
        },
      ).then((r) => r.ownMarketOccurrences),
    occurrence: (id: string) =>
      run(
        { api: 'admin', document: g.MarketOccurrenceDetailDocument },
        { id },
      ).then((r) => r.ownMarketOccurrence),
    relationshipDetail: (id: string, pages: MarketDetailPages = {}) =>
      run(
        { api: 'admin', document: g.MarketRelationshipDetailDocument },
        {
          id,
          occurrences: {
            take: 20,
            skip: pages.occurrences ?? 0,
            from: null,
            through: null,
          },
          participations: { take: 20, skip: pages.participations ?? 0 },
          listings: { take: 20, skip: pages.listings ?? 0 },
          offerings: { take: 20, skip: pages.offerings ?? 0 },
        },
      ),
    overview: (
      options: Partial<
        NonNullable<g.MarketOverviewSummaryQueryVariables['options']>
      > = {},
    ) =>
      run(
        { api: 'admin', document: g.MarketOverviewSummaryDocument },
        { options: { from: null, through: null, ...options } },
      ).then((r) => r.ownMarketOverviewSummary),
    listingPublication: (listingId: string) =>
      run(
        { api: 'admin', document: g.MarketListingPublicationDocument },
        { listingId },
      ).then((r) => r.ownMarketListingPublication),
    generationStatus: (jobId: string) =>
      run(
        { api: 'admin', document: g.MarketGenerationStatusDocument },
        { jobId },
      ).then((r) => r.ownMarketOccurrenceGenerationStatus),

    configure: (input: MarketConfigureInput) =>
      run(
        { api: 'admin', document: g.MarketConfigureDocument },
        { input },
      ).then((r) => r.configureOwnMarket),
    recurrence: (
      marketId: string,
      expectedVersion: number,
      recurrence: MarketRecurrenceInput,
    ) =>
      run(
        { api: 'admin', document: g.MarketRecurrenceDocument },
        { marketId, expectedVersion, recurrence },
      ).then((r) => r.reviseMarketRecurrence),
    generate: (marketId: string, from: string, through: string) =>
      run(
        { api: 'admin', document: g.MarketGenerateDocument },
        { marketId, from, through },
      ).then((r) => r.generateMarketOccurrences),
    enqueue: (marketId: string, from: string, through: string) =>
      run(
        { api: 'admin', document: g.MarketEnqueueDocument },
        { marketId, from, through },
      ).then((r) => r.enqueueMarketOccurrenceGeneration),
    manual: (
      marketId: string,
      scheduleDate: string,
      generationKey: string,
      input: MarketSessionInput,
    ) =>
      run(
        { api: 'admin', document: g.MarketManualDocument },
        { marketId, scheduleDate, generationKey, input },
      ).then((r) => r.createManualMarketOccurrence),
    reviseOccurrence: (
      id: string,
      expectedVersion: number,
      input: MarketSessionInput,
    ) =>
      run(
        { api: 'admin', document: g.MarketReviseOccurrenceDocument },
        { id, expectedVersion, input },
      ).then((r) => r.reviseMarketOccurrence),
    cancelOccurrence: (id: string, expectedVersion: number) =>
      run(
        { api: 'admin', document: g.MarketCancelOccurrenceDocument },
        { id, expectedVersion },
      ).then((r) => r.cancelMarketOccurrence),
    membershipStatus: (
      marketId: string,
      vendorId: string,
      status: MarketMembershipStatus,
      expectedVersion?: number,
    ) =>
      run(
        { api: 'admin', document: g.MarketMembershipStatusDocument },
        { marketId, vendorId, status, expectedVersion },
      ).then((r) => r.setMarketVendorMembership),
    approveListing: (
      id: string,
      expectedVersion: number,
      status: MarketListingStatus,
    ) =>
      run(
        { api: 'admin', document: g.MarketApproveListingDocument },
        { id, expectedVersion, status },
      ).then((r) => r.approveMarketListing),
    participation: (input: MarketParticipationInput) =>
      run(
        { api: 'admin', document: g.MarketParticipationDocument },
        { input },
      ).then((r) => r.configureMarketParticipation),
    offering: (input: MarketOfferingInput) =>
      run(
        { api: 'admin', document: g.MarketConfigureOfferingDocument },
        { input },
      ).then((r) => r.configureMarketOffering),
    rematerialize: (id: string, expectedVersion: number) =>
      run(
        { api: 'admin', document: g.MarketRematerializeDocument },
        { id, expectedVersion },
      ).then((r) => r.rematerializeMarketOfferingWindow),
    operations: (occurrenceId: string, skip: number) =>
      run(
        { api: 'admin', document: g.MarketOperationsDocument },
        { occurrenceId, options: { skip, take: 20, search: null } },
      ).then((r) => r.ownOccurrenceCustomerOperations),
    featureAvailability: () =>
      run(
        { api: 'admin', document: g.FeatureAvailabilityDocument },
        { boundary: 'analytics.market.read' },
      ).then((r) => r.ownFeatureAvailability),
    analytics: (
      marketId: string,
      range: g.MarketAnalyticsQueryVariables['range'],
    ) =>
      run(
        { api: 'admin', document: g.MarketAnalyticsDocument },
        { marketId, range },
      ).then((r) => r.ownMarketAnalytics),
    occurrenceAnalytics: (
      marketId: string,
      range: g.MarketAnalyticsQueryVariables['range'],
      occurrenceId: string | null,
    ) =>
      run(
        { api: 'admin', document: g.MarketOccurrenceAnalyticsDocument },
        { marketId, range, occurrenceId },
      ).then((r) => r.ownMarketOccurrenceAnalytics),
  };
}
export type MarketApi = ReturnType<typeof createMarketApi>;
