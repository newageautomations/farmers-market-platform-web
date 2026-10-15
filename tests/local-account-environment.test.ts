import { describe, expect, it } from 'vitest';
import { localAccountEnvironment } from '../scripts/local-account-environment';

const configured = {
  PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4321',
  ADMIN_ORIGIN: 'http://localhost:4322',
  PLATFORM_ACCOUNT_BRIDGE_KEY: 'synthetic-account-configuration-for-tests',
  DB_NAME: 'must-not-be-forwarded',
  RESEND_API_KEY: 'must-not-be-forwarded',
};
describe('local demo account configuration', () => {
  it('forwards the same server-only bridge to each server without DB/provider settings', () => {
    expect(localAccountEnvironment(configured, {})).toEqual({
      PLATFORM_ACCOUNT_ORIGIN: configured.PLATFORM_ACCOUNT_ORIGIN,
      ADMIN_ORIGIN: configured.ADMIN_ORIGIN,
      PLATFORM_ACCOUNT_BRIDGE_KEY: configured.PLATFORM_ACCOUNT_BRIDGE_KEY,
      PLATFORM_STOREFRONT_LOCAL_PORT: '4321',
    });
  });
  it.each(['', 'short'])(
    'fails early for a missing or invalid inherited bridge',
    (key) => {
      expect(() =>
        localAccountEnvironment(configured, {
          PLATFORM_ACCOUNT_BRIDGE_KEY: key,
        }),
      ).toThrow('Local demo requires');
    },
  );
  it('respects a valid explicit shell key', () => {
    const key = 'different-synthetic-account-configuration';
    expect(
      localAccountEnvironment(configured, { PLATFORM_ACCOUNT_BRIDGE_KEY: key })
        .PLATFORM_ACCOUNT_BRIDGE_KEY,
    ).toBe(key);
  });
  it.each(['https://remote.example', 'http://auth.platform.localhost:4347'])(
    'rejects a mismatched account origin: %s',
    (origin) => {
      expect(() =>
        localAccountEnvironment(configured, {
          PLATFORM_ACCOUNT_ORIGIN: origin,
        }),
      ).toThrow('Local demo requires');
    },
  );
});
