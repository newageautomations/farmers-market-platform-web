import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

// Encrypted, expiring form drafts only. This carries no account or order authority.
function key() {
  const secret = process.env.PLATFORM_ACCOUNT_BRIDGE_KEY;
  if (!secret || secret.length < 32)
    throw new Error('Account bridge unavailable');
  return createHash('sha256').update(`checkout-form:${secret}`).digest();
}
export function sealCheckoutData(value: unknown, purpose: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ value, expires: Date.now() + 1800000 })),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    'base64url',
  );
}
export function openCheckoutData<T>(
  token: string | undefined,
  purpose: string,
): T | undefined {
  try {
    if (!token || token.length > 3800) return;
    const bytes = Buffer.from(token, 'base64url');
    const cipher = createDecipheriv(
      'aes-256-gcm',
      key(),
      bytes.subarray(0, 12),
    );
    cipher.setAAD(Buffer.from(purpose));
    cipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(
      Buffer.concat([
        cipher.update(bytes.subarray(28)),
        cipher.final(),
      ]).toString(),
    );
    if (data.expires > Date.now()) return data.value as T;
  } catch {
    /* Expired or invalid drafts are never used. */
  }
}
