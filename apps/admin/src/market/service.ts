import { createTeamService } from '../team/service';
import type { TeamApi } from '@market/api';
import {
  createFinanceApi,
  createStorefrontAppearanceApi,
  type VendorCategoryApi,
  type FinanceApi,
  AppError,
  createMarketOperationsApi,
  type MarketOperationsApi,
  createMarketApi,
  createNotificationsApi,
  createDocumentsApi,
  type DocumentsApi,
  type NotificationsApi,
  safeError,
  type MarketApi,
  type Permission,
  createMarketDayChecklistApi,
  createMarketLoyaltyApi,
  type MarketLoyaltyApi,
  type MarketDayChecklist,
} from '@market/api';
import { mayMarketCommand, type AdminContext } from '@market/admin-core';

export type MarketAvailability =
  'ALLOWED' | 'DENIED' | 'UNKNOWN' | 'UNCONFIGURED';
let serviceGeneration = 0;
export interface MarketService extends MarketApi {
  team?: TeamApi;
  finance?: FinanceApi;
  loyalty?: MarketLoyaltyApi;
  checklist?: (occurrenceId: string) => Promise<MarketDayChecklist>;
  notifications?: NotificationsApi;
  /** Read-only compliance requests, used to show what each Vendor is missing. */
  documents?: Pick<DocumentsApi, 'read'>;
  phase14?: MarketOperationsApi;
  rentalMedia?: Pick<VendorCategoryApi, 'images' | 'upload'>;
  readKey: string;
  context: AdminContext;
  marketId: string;
  availability: () => Promise<MarketAvailability>;
}
export const marketActionPermissions: Partial<
  Record<keyof MarketApi, Permission>
> = {
  operations: 'ReadOwnMarketOrders',
  configure: 'ManageOwnMarketSchedule',
  recurrence: 'ManageOwnMarketSchedule',
  saveSchedule: 'ManageOwnMarketSchedule',
  deleteSchedule: 'ManageOwnMarketSchedule',
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
                  ![
                    'owner',
                    'administrator',
                    'lead',
                    'staff',
                    'marketAdmin',
                  ].includes(identity.membership.role) ||
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
  service.team = createTeamService(
    context,
    endpoint,
    channelToken,
    onAuthorityFailure,
  );
  const operations = createMarketOperationsApi({ endpoint, channelToken });
  if (context.permissions.includes('ManageMarketStorefront')) {
    const media = createStorefrontAppearanceApi({ endpoint, channelToken }).media!;
    service.rentalMedia = { images: media.images, upload: media.upload };
  }
  service.finance = createFinanceApi({
    endpoint,
    channelToken,
    onAuthorityFailure,
  });
  const loyalty = createMarketLoyaltyApi({ endpoint, channelToken }, 'admin');
  service.loyalty = new Proxy(loyalty, {
    get(target, key: keyof MarketLoyaltyApi) {
      return async (...args: unknown[]) => {
        if (
          !context.permissions.includes(
            key === 'overview' ? 'ReadOwnMarket' : 'ManageOwnMarketSchedule',
          )
        )
          throw new AppError('forbidden');
        try {
          return await Reflect.apply(target[key], target, args);
        } catch (error) {
          if (['authentication', 'forbidden'].includes(safeError(error).kind))
            onAuthorityFailure();
          throw error;
        }
      };
    },
  });
  const checklist = createMarketDayChecklistApi({ endpoint, channelToken });
  service.checklist = async (id) => {
    try {
      return await checklist(id);
    } catch (error) {
      if (['authentication', 'forbidden'].includes(safeError(error).kind))
        onAuthorityFailure();
      throw error;
    }
  };
  service.notifications = createNotificationsApi({
    endpoint,
    channelToken,
    onAuthorityFailure,
  });
  if (context.permissions.includes('ReadOwnDocuments')) {
    const documents = createDocumentsApi({
      endpoint,
      channelToken,
      onAuthorityFailure,
    });
    service.documents = { read: documents.read };
  }
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
