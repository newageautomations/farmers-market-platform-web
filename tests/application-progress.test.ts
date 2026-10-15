import { afterEach, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import {
  bindProgressAfterLogin,
  openProgress,
  restoreProgress,
  saveProgressBinding,
  sealProgress,
  retainSealedProgress,
  readSealedProgress,
  clearRetainedProgress,
} from '../apps/storefront/src/lib/application-progress';
import { safeAccountReturn } from '../apps/storefront/src/lib/account';
afterEach(() => vi.unstubAllEnvs());
function context(origin = 'http://market.localhost') {
  vi.stubEnv(
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'local-progress-test-key-with-no-real-secret',
  );
  const values = new Map<string, string>();
  return {
    url: new URL(origin + '/api/application-progress'),
    cookies: {
      get: (name: string) =>
        values.has(name) ? { value: values.get(name)! } : undefined,
      set: (name: string, value: string) => values.set(name, value),
      delete: (name: string) => values.delete(name),
    },
  } as unknown as APIContext;
}
it('encrypts retained answers and rejects tampering without exposing plaintext in storage', () => {
  context();
  const value = sealProgress({ contact: 'Private applicant answer' });
  expect(value).not.toContain('Private');
  expect(openProgress(value)).toEqual({ contact: 'Private applicant answer' });
  const buffer = Buffer.from(value, 'base64url');
  buffer[buffer.length - 1] = (buffer[buffer.length - 1] ?? 0) ^ 1;
  expect(() => openProgress(buffer.toString('base64url'))).toThrow();
});
it('retains only encrypted bounded HttpOnly draft cookies and clears every chunk', () => {
  const c = context('https://market.example'),
    set = vi.spyOn(c.cookies, 'set');
  const binding = saveProgressBinding(c, '/apply/season', null);
  retainSealedProgress(c, { binding, progress: { answer: 'Private draft' } });
  expect(openProgress(readSealedProgress(c)!)).toEqual({
    binding,
    progress: { answer: 'Private draft' },
  });
  expect(set).toHaveBeenCalledWith(
    'application-progress-data-0',
    expect.any(String),
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/api/application-progress',
    }),
  );
  expect(
    set.mock.calls
      .filter(([name]) => name.startsWith('application-progress-data'))
      .every(([, value]) => String(value).length <= 3300),
  ).toBe(true);
  clearRetainedProgress(c);
  expect(readSealedProgress(c)).toBeNull();
});
it('binds an anonymous draft to the actual returning principal and consumes it once', () => {
  const c = context(),
    binding = saveProgressBinding(c, '/apply/season', null),
    value = sealProgress({ binding, progress: { answer: 'Retained' } });
  expect(() => restoreProgress(c, value, '7')).toThrow();
  bindProgressAfterLogin(c, '/apply/season', '7');
  expect(() => restoreProgress(c, value, '8')).toThrow();
  expect(restoreProgress(c, value, '7')).toEqual({
    path: '/apply/season',
    progress: { answer: 'Retained' },
  });
  expect(() => restoreProgress(c, value, '7')).toThrow();
});
it('refuses a different account, origin, destination and expired draft', () => {
  const c = context(),
    binding = saveProgressBinding(c, '/apply/season', '7'),
    value = sealProgress({ binding, progress: {} });
  bindProgressAfterLogin(c, '/apply/season', '8');
  expect(() => restoreProgress(c, value, '8')).toThrow();
  const other = context();
  const b = saveProgressBinding(other, '/apply/season', '7'),
    v = sealProgress({ binding: b, progress: {} });
  other.url = new URL('http://foreign.localhost/api/application-progress');
  expect(() => restoreProgress(other, v, '7')).toThrow();
  other.url = new URL('http://market.localhost/api/application-progress');
  vi.spyOn(Date, 'now').mockReturnValue(b.expiresAt + 1);
  expect(() => restoreProgress(other, v, '7')).toThrow();
  vi.restoreAllMocks();
  expect(() => saveProgressBinding(c, '//foreign.invalid', '7')).toThrow();
  expect(safeAccountReturn('/apply/season?redirect=foreign')).toBe('/account');
});
