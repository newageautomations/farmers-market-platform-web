import { AppError, createTeamApi, safeError, type TeamApi } from '@market/api';
import type { AdminContext } from '@market/admin-core';
export function canReadTeam(context: AdminContext) {
  return (
    context.scope !== 'PLATFORM' &&
    (context.membershipRole === 'owner' ||
      (context.membershipRole === 'administrator' &&
        context.permissions.includes(
          context.scope === 'VENDOR'
            ? 'ManageOwnVendorMembership'
            : 'ManageOwnMarketTeam',
        )))
  );
}
export function createTeamService(
  context: AdminContext,
  endpoint: string,
  channelToken: string,
  onDenied: () => void,
): TeamApi {
  const api = createTeamApi({ endpoint, channelToken });
  return new Proxy(api, {
    get(target, key: keyof TeamApi) {
      return async (...args: unknown[]) => {
        if (!canReadTeam(context)) throw new AppError('forbidden');
        try {
          return await Reflect.apply(target[key], target, args);
        } catch (error) {
          const safe = safeError(error);
          if (safe.kind === 'forbidden' || safe.kind === 'authentication')
            onDenied();
          throw safe;
        }
      };
    },
  });
}
