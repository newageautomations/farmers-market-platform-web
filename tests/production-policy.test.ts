import { describe, it, expect } from 'vitest';
import {
  boundedBody,
  normalizeOrigin,
  validateEnvironment,
  cspDirectives,
  responseSecurityHeaders,
} from '@market/config';
import { vi } from 'vitest';
const production = {
  APP_ENV: 'production',
  NODE_ENV: 'production',
  SHOP_API_URL: 'https://api.platform.localhost/shop-api',
  PUBLIC_ADMIN_API_URL: 'https://api.platform.localhost/admin-api',
  ADMIN_ORIGIN: 'https://admin.platform.localhost',
  PLATFORM_ACCOUNT_ORIGIN: 'https://auth.platform.localhost',
  PLATFORM_ACCOUNT_BRIDGE_KEY: 'Z7cXq4uR8eA6fM9sT2wB5nK3vH1dP0yL',
  FRONTEND_FIXTURE_MODE: 'false',
};
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
});
