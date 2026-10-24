import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { NativeSessionProof } from '../../../packages/api/src/native-mobile';
import type { PendingStore } from '../../core/controller';

const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const readSecure = (key: string) =>
  SecureStore.getItemAsync(key, options);
export const writeSecure = (key: string, value: string) =>
  SecureStore.setItemAsync(key, value, options);
export interface StoredSession {
  endpoint: string;
  token: string;
  channel: string;
  proof: NativeSessionProof;
}
export async function installation() {
  const stored = await readSecure('pos.installation');
  if (stored) return JSON.parse(stored) as { id: string; secret: string };
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const value = {
    id: Crypto.randomUUID(),
    secret: Array.from(
      await Crypto.getRandomBytesAsync(43),
      (b) => alphabet[b & 63],
    ).join(''),
  };
  await writeSecure('pos.installation', JSON.stringify(value));
  return value;
}
export const pendingStore: PendingStore = {
  read: () => readSecure('pos.pending'),
  write: (id) => writeSecure('pos.pending', id),
  clear: () => SecureStore.deleteItemAsync('pos.pending', options),
};
export const clearSession = () =>
  SecureStore.deleteItemAsync('pos.session', options);
