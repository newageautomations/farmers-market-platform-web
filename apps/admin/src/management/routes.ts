export function isManagementRoute(scope: string, path: string) {
  return (
    scope === 'PLATFORM' ||
    (scope === 'VENDOR' &&
      /^\/vendor\/(integrations(?:\/(payments|pos))?|billing|settings)$/.test(
        path,
      )) ||
    (scope === 'MARKET' && path === '/market/billing')
  );
}
