import { describe, expect, it } from 'vitest';
import { AccountBridgeError } from '../apps/storefront/src/lib/account';

describe('account rate feedback', () => {
  const serverTime = '2026-10-12T05:00:00.000Z';
  it('explains an hourly wait using the server interval', () => {
    expect(
      new AccountBridgeError(
        'SMS_RATE_LIMITED',
        429,
        '2026-10-12T06:00:00.000Z',
        serverTime,
      ).message,
    ).toContain('60 minutes');
  });
  it('explains a short cooldown separately from the hourly allowance', () => {
    expect(
      new AccountBridgeError(
        'SMS_RATE_LIMITED',
        429,
        '2026-10-12T05:00:30.000Z',
        serverTime,
      ).message,
    ).toContain('30 seconds');
  });
  it('keeps safe feedback when a timestamp is unavailable or malformed', () => {
    for (const at of [undefined, 'invalid']) {
      const error = new AccountBridgeError(
        'SMS_RATE_LIMITED',
        429,
        at,
        serverTime,
      );
      expect(error.message).toContain('Please wait');
      expect(error.message).not.toContain('NaN');
    }
  });
});
