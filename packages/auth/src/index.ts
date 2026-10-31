import {
  AppError,
  type AdminChannel,
  type AdminUser,
  type Permission,
  createAdminApi,
  createPlatformAccountApi,
  safeError,
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
    async logout(everywhere = true) {
      if (!(await createPlatformAccountApi({ endpoint }).signOut(everywhere)))
        throw new AppError('unknown');
    },
  };
}
