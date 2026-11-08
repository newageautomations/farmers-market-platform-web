import { settingsView, type AdminScope } from '@market/admin-core';

/** Settings tabs render in the consolidated Settings workspace. */
export function isSettingsRoute(scope: string, path: string) {
  return (
    ['VENDOR', 'MARKET', 'PLATFORM'].includes(scope) &&
    !!settingsView(scope as AdminScope, path)
  );
}
export function isManagementRoute(scope: string, path: string) {
  if (isSettingsRoute(scope, path)) return false;
  return (
    scope === 'PLATFORM' ||
    (scope === 'VENDOR' && path === '/vendor/billing') ||
    (scope === 'MARKET' && path === '/market/billing')
  );
}
