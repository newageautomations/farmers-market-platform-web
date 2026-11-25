import { describe, it, expect } from 'vitest';
import {
  boundedBody,
  normalizeOrigin,
  validateEnvironment,
  cspDirectives,
  responseSecurityHeaders,
  deploymentEnvironment,
  assertFrontendBuild,
  frontendBuildSettings,
  blocksIndexing,
  noIndexHeader,
  restrictiveRobots,
  storefrontRobotsMeta,
} from '@market/config';
import { vi } from 'vitest';
import { GET as robots } from '../apps/storefront/src/pages/robots.txt';
const production = {
  APP_ENV: 'production',
  NODE_ENV: 'production',
  DEPLOYMENT_ENV: 'production',
  SHOP_API_URL: 'https://api.example.com/shop-api',
  PUBLIC_ADMIN_API_URL: 'https://api.example.com/admin-api',
  ADMIN_ORIGIN: 'https://admin.example.com',
  PLATFORM_ACCOUNT_ORIGIN: 'https://auth.example.com',
  ASSET_URL_PREFIX: 'https://api.example.com/assets/',
  PLATFORM_ACCOUNT_BRIDGE_KEY: 'Z7cXq4uR8eA6fM9sT2wB5nK3vH1dP0yL',
  FRONTEND_FIXTURE_MODE: 'false',
};
const staging = { ...production, DEPLOYMENT_ENV: 'staging' };

describe('deployment configuration', () => {
  it('keeps local defaults and requires an explicit, compatible hardened identity', () => {
    for (const [input, expected] of [
      [{ APP_ENV: 'dev' }, 'development'],
      [{ APP_ENV: 'test', NODE_ENV: 'test' }, 'test'],
      [production, 'production'],
      [staging, 'staging'],
    ] as const)
      expect(deploymentEnvironment(input).deployment).toBe(expected);

    for (const patch of [
      { DEPLOYMENT_ENV: undefined },
      { DEPLOYMENT_ENV: 'unrecognized' },
      { DEPLOYMENT_ENV: 'development' },
      { APP_ENV: undefined },
      { APP_ENV: 'staging' },
      { APP_ENV: 'dev' },
      { APP_ENV: 'test', NODE_ENV: 'test' },
      { NODE_ENV: undefined },
      { NODE_ENV: 'development' },
    ])
      expect(() =>
        validateEnvironment({ ...staging, ...patch }, 'production'),
      ).toThrow();
  });

  it('validates staged public hosts, secret boundaries, and deferred access', () => {
    expect(validateEnvironment(staging, 'production').production).toBe(true);
    const marker = 'private-value-marker';
    for (const patch of [
      { ADMIN_ORIGIN: 'https://admin.localhost' },
      { PLATFORM_ACCOUNT_ORIGIN: 'https://127.1' },
      { PLATFORM_ACCOUNT_ORIGIN: 'https://[::1]' },
      { SHOP_API_URL: 'https://127.0.0.2/shop-api' },
      { PUBLIC_ADMIN_API_URL: 'http://api.example.com/admin-api' },
      { ASSET_URL_PREFIX: 'https://localhost/assets/' },
      { CUSTOMER_STOREFRONT_ORIGIN: 'https://tenant.example.com/' },
      { ADMIN_ORIGIN: `https://${marker}@` },
      { PUBLIC_ADMIN_API_URL: `https://${marker}@api.example.com/admin-api` },
      { PLATFORM_ACCOUNT_BRIDGE_KEY: marker },
      { VITE_PROVIDER_TOKEN: marker },
      { PUBLIC_PHONE_OTP_KEY: marker },
      { FRONTEND_FIXTURE_MODE: 'true' },
      { REMOTE_DEMO_ADMIN: 'true' },
      { DEMO_LOCAL_HOST_ALIASES: 'true' },
      { TRUSTED_PROXY_CIDRS: '127.0.0.1/32' },
      { STAGING_TESTER_ACCESS: 'enabled' },
      { STAGING_ANONYMOUS_STOREFRONTS: 'enabled' },
      { STAGING_TESTER_ACCESS: 'provisioned' },
      { STAGING_ANONYMOUS_STOREFRONTS: 'published' },
      { DEPLOYMENT_ENV: 'local-qualification' },
    ]) {
      const run = () =>
        validateEnvironment({ ...staging, ...patch }, 'production');
      expect(run).toThrow();
      expect(run).not.toThrow(marker);
    }
  });

  it('opts in to provisioned testing and published storefronts only on hosted staging', () => {
    const settings = {
      STAGING_TESTER_ACCESS: 'provisioned',
      STAGING_ANONYMOUS_STOREFRONTS: 'published',
    };
    expect(
      validateEnvironment(staging, 'production').stagingPublicAdmission,
    ).toBe(false);
    expect(
      validateEnvironment(
        { ...staging, ...settings, HOSTED_TRANSPORT: 'railway-private' },
        'production',
      ).stagingPublicAdmission,
    ).toBe(true);
    expect(() =>
      validateEnvironment({ ...staging, ...settings }, 'production'),
    ).toThrow(/hosted frontend transport/);
    expect(() =>
      validateEnvironment({ ...production, ...settings }, 'production'),
    ).toThrow(/STAGING_ADMISSION_NOT_QUALIFIED/);
  });

  it('binds the public build settings to the hardened runtime, with secrets supplied only to SSR', () => {
    const build = validateEnvironment(
      { ...staging, PLATFORM_ACCOUNT_BRIDGE_KEY: undefined },
      'production',
      'build',
    );
    const runtime = validateEnvironment(staging, 'production');
    const adminRuntime = validateEnvironment(
      { ...staging, PLATFORM_ACCOUNT_BRIDGE_KEY: undefined },
      'production',
      'admin-runtime',
    );
    for (const [service, config] of [
      ['storefront', runtime],
      ['admin', adminRuntime],
    ] as const) {
      const settings = frontendBuildSettings(build, service);
      expect(JSON.stringify(settings)).not.toContain(
        staging.PLATFORM_ACCOUNT_BRIDGE_KEY,
      );
      expect(() =>
        assertFrontendBuild(settings, config, service),
      ).not.toThrow();
      for (const patch of [
        { deployment: 'production' },
        { deployment: 'development' },
        { deployment: undefined },
        { adminApiUrl: 'https://api.other.example.com/admin-api' },
        {
          [service === 'storefront' ? 'assetUrl' : 'customerOrigin']:
            'https://other.example.com/',
        },
      ])
        expect(() =>
          assertFrontendBuild({ ...settings, ...patch }, config, service),
        ).toThrow(/matching build/);
    }
    expect(() => validateEnvironment(staging, 'development', 'build')).toThrow(
      /production build/,
    );
  });

  it('overrides indexable tenants in staging and preserves private and production directives', async () => {
    const indexable = 'index,follow';
    expect(blocksIndexing('staging')).toBe(true);
    expect(noIndexHeader).toBe('noindex, nofollow');
    expect(storefrontRobotsMeta('staging', false, indexable)).toBe(
      'noindex,nofollow',
    );
    expect(storefrontRobotsMeta('production', false, indexable)).toBe(
      indexable,
    );
    expect(storefrontRobotsMeta('production', true, indexable)).toBe(
      'noindex,nofollow',
    );
    for (const deployment of ['staging', 'production'] as const) {
      const response = await robots({
        locals: { deployment, storefront: { source: 'backend' } },
      } as Parameters<typeof robots>[0]);
      const body = await response.text();
      if (deployment === 'staging') expect(body).toBe(restrictiveRobots);
      else expect(body).toContain('Allow: /\n');
    }
  });
});
describe('production policy', () => {
  it('omits token URLs, stacks and arbitrary framework labels from Astro logs', async () => {
    const { default: createLogger } = (await import(
      '../apps/storefront/src/production-logger.mjs' as string
    )) as {
      default(): {
        write(event: { level: string; label: string; message: string }): void;
      };
    };
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      createLogger().write({
        level: 'error',
        label: 'bridge-marker',
        message:
          'cookie-marker magic-marker handoff-marker provider-marker /private/path stack SQL',
      });
      expect(output).toHaveBeenCalledOnce();
      const record = JSON.parse(String(output.mock.calls[0]![0]));
      expect(record.event).toBe('astro_framework_error');
      expect(Object.keys(record).sort()).toEqual([
        'event',
        'level',
        'timestamp',
      ]);
      expect(JSON.stringify(record)).not.toMatch(/marker|SQL|stack|private/);
    } finally {
      output.mockRestore();
    }
  });
  it('fails closed for unsafe configuration without printing values', () => {
    expect(validateEnvironment(production, 'production').fixtureMode).toBe(
      false,
    );
    for (const change of [
      { PLATFORM_ACCOUNT_BRIDGE_KEY: undefined },
      { PLATFORM_ACCOUNT_BRIDGE_KEY: 'example-secret-example-secret' },
      { PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost' },
      { SHOP_API_URL: 'http://api.platform.localhost/shop-api' },
      { FRONTEND_FIXTURE_MODE: 'true' },
      { TRUSTED_PROXY_CIDRS: 'true' },
      { PUBLIC_API_SECRET: 'marker-private-value' },
    ])
      expect(() =>
        validateEnvironment({ ...production, ...change }, 'production'),
      ).toThrow();
  });
  it('normalizes origins without accepting confused or non-web authorities', () => {
    expect(normalizeOrigin('https://ADMIN.example:443')).toBe(
      'https://admin.example',
    );
    for (const origin of [
      'null',
      'file:///etc',
      'https://admin.example@evil.example',
      'https://%61dmin.example',
      'https://admin.example/path',
      'https://admin.example\\@evil.example',
    ])
      expect(() => normalizeOrigin(origin)).toThrow();
  });
  it('bounds streamed input in bytes before parsing', async () => {
    await expect(
      boundedBody(
        new Request('https://a.localhost', {
          method: 'POST',
          body: 'é'.repeat(3000),
        }),
      ),
    ).rejects.toThrow();
    await expect(
      boundedBody(
        new Request('https://a.localhost', { method: 'POST', body: '{}' }),
      ),
    ).resolves.toBe('{}');
  });
  it('restricts CSP extensions and avoids speculative provider permissions', () => {
    expect(cspDirectives().join('; ')).not.toMatch(
      /stripe|unsafe-eval|unsafe-inline/,
    );
    expect(() =>
      cspDirectives({ adminApiOrigin: 'https://a.localhost; script-src *' }),
    ).toThrow();
    expect(
      responseSecurityHeaders(true)['Strict-Transport-Security'],
    ).not.toMatch(/includeSubDomains|preload/);
    expect(responseSecurityHeaders(true)['Referrer-Policy']).toBe(
      'strict-origin',
    );
  });
  it('uses the configured media origin and falls back to the public API for Admin', () => {
    const configured = {
      ...staging,
      ASSET_URL_PREFIX: 'https://media.example.com/files/',
    };
    for (const use of [
      'build',
      'storefront-runtime',
      'admin-runtime',
    ] as const) {
      expect(
        validateEnvironment(configured, 'production', use).assetOrigin,
      ).toBe('https://media.example.com');
    }
    const admin = validateEnvironment(
      { ...staging, ASSET_URL_PREFIX: undefined },
      'production',
      'admin-runtime',
    );
    expect(admin.assetOrigin).toBe('https://api.example.com');
    const options = { adminApiOrigin: new URL(admin.adminApiUrl).origin };
    expect(
      cspDirectives({ ...options, assetOrigin: admin.assetOrigin }),
    ).toEqual(
      cspDirectives(options).map((directive) =>
        directive.startsWith('img-src ')
          ? `${directive} https://api.example.com`
          : directive,
      ),
    );
    expect(() =>
      cspDirectives({ assetOrigin: 'http://localhost:3000' }),
    ).toThrow(/HTTPS/);
  });
  it('leaves local development on its existing media configuration', () => {
    const config = validateEnvironment(
      {
        SHOP_API_URL: 'http://localhost:3000/shop-api',
        PUBLIC_ADMIN_API_URL: 'http://localhost:3000/admin-api',
        ASSET_URL_PREFIX: 'http://localhost:3000/assets/',
      },
      'development',
    );
    expect(config.production).toBe(false);
    expect(config.assetUrl).toBe('http://localhost:3000/assets/');
    expect(config.assetOrigin).toBeUndefined();
  });
});
