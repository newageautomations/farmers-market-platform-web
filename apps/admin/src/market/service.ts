import {
  AppError,
  createMarketOperationsApi,
  type MarketOperationsApi,
  createMarketApi,
  safeError,
  type MarketApi,
  type Permission,
} from '@market/api';
import { mayMarketCommand, type AdminContext } from '@market/admin-core';

export type MarketAvailability =
  'ALLOWED' | 'DENIED' | 'UNKNOWN' | 'UNCONFIGURED';
let serviceGeneration = 0;
export interface MarketService extends MarketApi {
  phase14?: MarketOperationsApi;
  readKey: string;
  context: AdminContext;
  marketId: string;
  availability: () => Promise<MarketAvailability>;
}
export const marketActionPermissions: Partial<
  Record<keyof MarketApi, Permission>
> = {
  configure: 'ManageOwnMarketSchedule',
  recurrence: 'ManageOwnMarketSchedule',
  generate: 'ManageOwnMarketSchedule',
  enqueue: 'ManageOwnMarketSchedule',
  manual: 'ManageOwnMarketOccurrences',
  reviseOccurrence: 'ManageOwnMarketOccurrences',
  cancelOccurrence: 'ManageOwnMarketOccurrences',
  participation: 'ManageOwnMarketOccurrences',
  membershipStatus: 'ManageOwnMarketMemberships',
  approveListing: 'ManageOwnMarketListings',
  offering: 'ManageOwnMarketOfferings',
  rematerialize: 'ManageOwnMarketOfferings',
};
/** Shared by live adapter and explicit test fixtures. No production fallback. */
export function guardMarketService(
  context: AdminContext,
  api: MarketApi,
  onAuthorityFailure: () => void,
): MarketService {
  if (
    context.scope !== 'MARKET' ||
    !context.subject ||
    !('marketId' in context.subject) ||
    !context.permissions.includes('ReadOwnMarket')
  )
    throw new AppError('forbidden');
  const marketId = context.subject.marketId;
  const readKey = `market:${marketId}:service:${++serviceGeneration}`;
  let revoked = false;
  function revoke() {
    if (!revoked) {
      revoked = true;
      onAuthorityFailure();
    }
  }
  const guarded = new Proxy(api, {
    get(target, property: keyof MarketApi) {
      return async (...args: unknown[]) => {
        if (revoked) throw new AppError('forbidden');
        const optional = [
          'analytics',
          'occurrenceAnalytics',
          'featureAvailability',
        ].includes(property);
        const commandPermission = marketActionPermissions[property];
        const permission =
          commandPermission ??
          (property === 'featureAvailability'
            ? 'ReadOwnBilling'
            : optional
              ? 'ReadOwnMarketAnalytics'
              : 'ReadOwnMarket');
        if (
          !context.permissions.includes(permission) ||
          (commandPermission && !mayMarketCommand(context, commandPermission))
        )
          throw new AppError('forbidden');
        try {
          const result = await Reflect.apply(target[property], target, args);
          if (revoked) throw new AppError('forbidden');
          return result;
        } catch (error) {
          const safe = safeError(error);
          if (['authentication', 'forbidden'].includes(safe.kind)) {
            if (!optional) revoke();
            else {
              // Optional analytics policy can deny an otherwise manageable Market.
              // A fresh core identity check distinguishes that from revoked membership/read authority.
              try {
                const identity = await target.identity();
                if (
                  identity.id !== marketId ||
                  identity.membership.status !== 'active' ||
                  identity.membership.marketId !== marketId ||
                  identity.membership.role !== 'marketAdmin' ||
                  !identity.permissions.includes('ReadOwnMarket')
                )
                  revoke();
              } catch {
                revoke();
              }
              if (!revoked) throw new AppError('entitlement');
            }
          }
          throw safe;
        }
      };
    },
  });
  return {
    ...guarded,
    context,
    marketId,
    readKey,
    availability: async () => {
      if (
        context.marketStatus === 'suspended' ||
        !context.permissions.includes('ReadOwnMarketAnalytics')
      )
        return 'DENIED';
      if (!context.permissions.includes('ReadOwnBilling')) return 'UNKNOWN';
      const result = await guarded.featureAvailability();
      if (
        result.boundary !== 'analytics.market.read' ||
        !['ALLOWED', 'DENIED', 'UNKNOWN', 'UNCONFIGURED'].includes(result.state)
      )
        return 'UNKNOWN';
      return result.state;
    },
  };
}
export function createLiveMarketService(
  context: AdminContext,
  endpoint: string,
  channelToken: string,
  onAuthorityFailure: () => void,
) {
  const service = guardMarketService(
    context,
    createMarketApi({ endpoint, channelToken }),
    onAuthorityFailure,
  );
  const operations = createMarketOperationsApi({ endpoint, channelToken });
  service.phase14 = {
    ...operations,
    read: async (...args) => {
      try {
        return await operations.read(...args);
      } catch (error) {
        if (['authentication', 'forbidden'].includes(safeError(error).kind))
          onAuthorityFailure();
        throw error;
      }
    },
    command: async (input) => {
      try {
        return await operations.command(input);
      } catch (error) {
        if (['authentication', 'forbidden'].includes(safeError(error).kind))
          onAuthorityFailure();
        throw error;
      }
    },
  };
  return service;
}
