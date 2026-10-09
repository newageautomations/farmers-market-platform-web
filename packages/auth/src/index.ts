import {
  AppError,
  type AdminChannel,
  type AdminUser,
  type Permission,
  createAdminApi,
  createShopApi,
  safeError,
  type CustomerUser,
} from '@market/api';
export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AdminUser; channel: AdminChannel }
  | { status: 'error'; error: AppError };
export function hasPermission(
  permissions: readonly Permission[],
  permission: Permission,
) {
  return permissions.includes('SuperAdmin') || permissions.includes(permission);
}
export function authenticatedSession(
  user: AdminUser | null,
  channelId?: string,
): SessionState {
  if (!user) return { status: 'anonymous' };
  const channel = channelId
    ? user.channels.find((item) => item.id === channelId)
    : user.channels[0];
  if (!channel) return { status: 'error', error: new AppError('forbidden') };
  return { status: 'authenticated', user, channel };
}
export function createAdminSession(endpoint: string) {
  return {
    async restore(channelId?: string) {
      try {
        const result = await createAdminApi({ endpoint }).session();
        return authenticatedSession(result.me, channelId);
      } catch (error) {
        // Vendure's native Admin me query denies anonymous requests rather than returning null.
        const safe = safeError(error);
        if (['authentication', 'forbidden'].includes(safe.kind))
          return { status: 'anonymous' } as const;
        throw safe;
      }
    },
    async login(username: string, password: string) {
      const result = await createAdminApi({ endpoint }).login({
        username,
        password,
        rememberMe: false,
      });
      if (result.login.__typename !== 'CurrentUser')
        throw new AppError('authentication');
      return authenticatedSession(result.login);
    },
    async logout() {
      const result = await createAdminApi({ endpoint }).logout();
      if (!result.logout.success) throw new AppError('unknown');
    },
  };
}
export type CustomerSessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CustomerUser }
  | { status: 'error'; error: AppError };
export function createCustomerSession(endpoint: string, channelToken: string) {
  const api = createShopApi({ endpoint, channelToken });
  const state = (user: CustomerUser | null): CustomerSessionState =>
    user ? { status: 'authenticated', user } : { status: 'anonymous' };
  return {
    async restore() {
      return state((await api.session()).me);
    },
    async login(username: string, password: string) {
      const result = await api.login({ username, password, rememberMe: false });
      if (result.login.__typename !== 'CurrentUser')
        throw new AppError('authentication');
      return state(result.login);
    },
    async logout() {
      if (!(await api.logout()).logout.success) throw new AppError('unknown');
    },
  };
}
