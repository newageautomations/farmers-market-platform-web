import type { APIContext } from 'astro';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { safeAccountReturn } from './account';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
const cookieName = 'application-progress-binding';
interface Binding {
  nonce: string;
  origin: string;
  path: string;
  principalId: string | null;
  expiresAt: number;
}
function key() {
  const secret = process.env.PLATFORM_ACCOUNT_BRIDGE_KEY;
  if (!secret || secret.length < 32) throw new Error('Progress unavailable');
  return createHash('sha256')
    .update('application-progress-v1:' + secret)
    .digest();
}
export function sealProgress(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(deflateRawSync(Buffer.from(JSON.stringify(value), 'utf8'))),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    'base64url',
  );
}
export function openProgress<T>(value: string): T {
  if (value.length > 90000 || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('Progress invalid');
  const b = Buffer.from(value, 'base64url'),
    decipher = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return JSON.parse(
    inflateRawSync(
      Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]),
      { maxOutputLength: 100000 },
    ).toString('utf8'),
  ) as T;
}
export function retainSealedProgress(context: APIContext, value: unknown) {
  const sealed = sealProgress(value);
  if (sealed.length > 9900)
    throw new Error('Draft exceeds secure cookie limit');
  for (let i = 0; i < 3; i++) {
    const name = `application-progress-data-${i}`,
      chunk = sealed.slice(i * 3300, (i + 1) * 3300);
    if (chunk)
      context.cookies.set(name, chunk, {
        httpOnly: true,
        secure: context.url.protocol === 'https:',
        sameSite: 'lax',
        path: '/api/application-progress',
        maxAge: 600,
      });
    else context.cookies.delete(name, { path: '/api/application-progress' });
  }
}
export function readSealedProgress(context: APIContext) {
  return (
    Array.from(
      { length: 3 },
      (_, i) =>
        context.cookies.get(`application-progress-data-${i}`)?.value ?? '',
    ).join('') || null
  );
}
export function clearRetainedProgress(context: APIContext) {
  for (let i = 0; i < 3; i++)
    context.cookies.delete(`application-progress-data-${i}`, {
      path: '/api/application-progress',
    });
}
function setBinding(context: APIContext, b: Binding) {
  context.cookies.set(cookieName, sealProgress(b), {
    httpOnly: true,
    secure: context.url.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
}
export function saveProgressBinding(
  context: APIContext,
  path: string,
  principalId: string | null,
) {
  if (safeAccountReturn(path) !== path || !path.startsWith('/apply'))
    throw new Error('Progress destination invalid');
  const b: Binding = {
    nonce: randomBytes(32).toString('base64url'),
    origin: context.url.origin,
    path,
    principalId,
    expiresAt: Date.now() + 600000,
  };
  setBinding(context, b);
  return b;
}
export function bindProgressAfterLogin(
  context: APIContext,
  path: string,
  principalId: string | null | undefined,
) {
  const raw = context.cookies.get(cookieName)?.value;
  if (!raw) return;
  try {
    const b = openProgress<Binding>(raw);
    if (
      !principalId ||
      b.path !== path ||
      b.origin !== context.url.origin ||
      b.expiresAt < Date.now() ||
      (b.principalId && b.principalId !== principalId)
    )
      throw new Error('Different account');
    setBinding(context, { ...b, principalId });
  } catch {
    context.cookies.delete(cookieName, { path: '/' });
  }
}
export function restoreProgress<T>(
  context: APIContext,
  ciphertext: string,
  principalId: string,
) {
  const raw = context.cookies.get(cookieName)?.value;
  if (!raw) throw new Error('Progress unavailable');
  const b = openProgress<Binding>(raw),
    saved = openProgress<{ binding: Binding; progress: T }>(ciphertext);
  if (
    b.expiresAt < Date.now() ||
    saved.binding.expiresAt < Date.now() ||
    b.principalId !== principalId ||
    (saved.binding.principalId && saved.binding.principalId !== principalId) ||
    b.nonce !== saved.binding.nonce ||
    b.path !== saved.binding.path ||
    b.origin !== context.url.origin
  )
    throw new Error('Progress identity mismatch');
  context.cookies.delete(cookieName, { path: '/' });
  return { path: b.path, progress: saved.progress };
}
