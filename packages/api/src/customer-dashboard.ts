import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
export type CustomerDashboard =
  shop.CustomerDashboardQuery['customerDashboard'];
export type CustomerFollow = shop.CustomerFollowFragment;
export type CustomerEvent = shop.CustomerEventFragment;
export type CustomerSubjectPage =
  shop.CustomerFollowSubjectsQuery['customerFollowSubjects'];
export function createCustomerDashboardApi(
  options: TransportOptions & { channelToken: string },
) {
  const execute = transport('shop', options);
  return {
    read: async (section = 'overview', skip = 0, eventSkip = 0) =>
      (
        await execute(
          { api: 'shop', document: shop.CustomerDashboardDocument },
          { section, skip, eventSkip },
        )
      ).customerDashboard,
    subjects: async (kind: string, search = '', skip = 0) =>
      (
        await execute(
          { api: 'shop', document: shop.CustomerFollowSubjectsDocument },
          { kind, search, skip },
        )
      ).customerFollowSubjects,
    follow: async (kind: string, id: string, following: boolean) =>
      (
        await execute(
          { api: 'shop', document: shop.SetCustomerFollowDocument },
          { kind, id, following },
        )
      ).setCustomerFollow,
  };
}
