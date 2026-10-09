import {
  AppError,
  createManagementApi,
  safeError,
  type ManagementApi,
  type Permission,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
export type ManagementService = ManagementApi & { context: AdminContext };
export function createManagementService(
  context: AdminContext,
  endpoint: string,
  channelToken: string,
  onDenied: () => void,
): ManagementService {
  const api = createManagementApi({ endpoint, channelToken });
  const payment = [
    'payments',
    'connectStripe',
    'refreshStripe',
    'disconnectStripe',
  ];
  const pos = [
    'pos',
    'posDetail',
    'beginPos',
    'completePos',
    'connectPos',
    'revokePos',
    'mapPos',
    'posPolicies',
    'locations',
    'posCatalog',
    'syncPos',
  ];
  const reads = ['payments', 'pos', 'posDetail', 'billing'];
  return new Proxy(
    { ...api, context },
    {
      get(target, key: keyof ManagementService) {
        if (key === 'context') return context;
        const method = target[key];
        return async (...args: unknown[]) => {
          let permission: Permission = 'SuperAdmin';
          if (payment.includes(key))
            permission = reads.includes(key)
              ? 'ReadOwnPaymentAccount'
              : 'ManageOwnPaymentAccount';
          else if (pos.includes(key))
            permission = reads.includes(key)
              ? 'ReadOwnPosIntegrations'
              : 'ManageOwnPosIntegrations';
          else if (key === 'billing') permission = 'ReadOwnBilling';
          else if (key === 'mappingSource')
            permission = 'ReadOwnVendorIdentity';
          const tenantModule =
            payment.includes(key) ||
            pos.includes(key) ||
            key === 'billing' ||
            key === 'mappingSource';
          if (
            !context.permissions.includes(permission) ||
            (tenantModule && context.scope === 'PLATFORM') ||
            ((payment.includes(key) || pos.includes(key)) &&
              (context.scope !== 'VENDOR' ||
                context.membershipRole !== 'owner')) ||
            (!tenantModule && context.scope !== 'PLATFORM')
          )
            throw new AppError('forbidden');
          try {
            return await Reflect.apply(method, target, args);
          } catch (error) {
            const safe = safeError(error);
            if (['forbidden', 'authentication'].includes(safe.kind)) onDenied();
            throw safe;
          }
        };
      },
    },
  );
}
