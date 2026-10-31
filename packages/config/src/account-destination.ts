/** Relative Admin destinations only. Authorization is always checked separately. */
export function safeAdminDestination(value: string): string | null {
  if (value === '/') return value;
  if (value.length > 1024 || /[\\\x00-\x20\x7f#]/.test(value)) return null;
  if (
    !/^\/(vendor|market|platform)(?:\/[A-Za-z0-9_-]+)*\/?(?:\?[^#]*)?$/.test(
      value,
    )
  )
    return null;
  const url = new URL(value, 'https://admin.invalid');
  if (
    url.origin !== 'https://admin.invalid' ||
    /%2f|%5c|%2e/i.test(url.pathname)
  )
    return null;
  if (url.searchParams.getAll('channel').length > 1) return null;
  const channel = url.searchParams.get('channel');
  if (channel !== null && !/^[1-9]\d*$/.test(channel)) return null;
  url.searchParams.delete('account');
  return url.pathname + url.search;
}
