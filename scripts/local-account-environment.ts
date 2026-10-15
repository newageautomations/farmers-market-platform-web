/** The persistent demo uses the same server-only account bridge as Astro SSR. */
export function localAccountEnvironment(
  configured: Record<string, string | undefined>,
  inherited: Record<string, string | undefined>,
) {
  const env = { ...configured, ...inherited };
  const origin = env.PLATFORM_ACCOUNT_ORIGIN;
  const admin = env.ADMIN_ORIGIN;
  const key = env.PLATFORM_ACCOUNT_BRIDGE_KEY;
  if (
    origin !== 'http://auth.platform.localhost:4321' ||
    admin !== 'http://localhost:4322' ||
    !key ||
    key.length < 32
  )
    throw new Error(
      'Local demo requires PLATFORM_ACCOUNT_ORIGIN=http://auth.platform.localhost:4321, ADMIN_ORIGIN=http://localhost:4322 and a server-only PLATFORM_ACCOUNT_BRIDGE_KEY of at least 32 characters in the ignored root .env or shell.',
    );
  return {
    PLATFORM_ACCOUNT_ORIGIN: origin,
    ADMIN_ORIGIN: admin,
    PLATFORM_ACCOUNT_BRIDGE_KEY: key,
    PLATFORM_STOREFRONT_LOCAL_PORT: '4321',
  };
}
