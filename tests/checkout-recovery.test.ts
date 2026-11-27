import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { AppError } from '@market/api';
import { readCheckoutStatus } from '../apps/storefront/src/lib/checkout-status';
import { restartCheckout } from '../apps/storefront/src/lib/restart-checkout';
import {
  openCheckoutData,
  sealCheckoutData,
} from '../apps/storefront/src/lib/private-checkout-data';

const mocks = vi.hoisted(() => ({
  checkout: {
    status: vi.fn(),
    clearTestPreorderFee: vi.fn(),
    stripeStatus: vi.fn(),
    contact: vi.fn(),
    pickup: vi.fn(),
    selectPickup: vi.fn(),
  },
  vendor: {
    bootstrap: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
    add: vi.fn(),
    adjust: vi.fn(),
  },
  market: {
    bootstrap: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
    add: vi.fn(),
    adjust: vi.fn(),
    applyCoupon: vi.fn(),
  },
}));
vi.mock('../apps/storefront/src/lib/shop', () => ({
  requestCheckout: () => mocks.checkout,
  requestShop: () => mocks.vendor,
  requestMarketShop: () => mocks.market,
}));
const contact = {
  firstName: 'Ada',
  lastName: 'Smith',
  emailAddress: 'ada@example.test',
  phoneNumber: '+12105550123',
};
let cookies: Map<string, string>;
function context(kind = 'VENDOR') {
  return {
    locals: { storefront: { kind } },
    url: new URL('http://store.localhost/checkout'),
    cookies: {
      get: (name: string) =>
        cookies.has(name) ? { value: cookies.get(name) } : undefined,
      set: (name: string, value: string) => cookies.set(name, value),
      delete: (name: string) => cookies.delete(name),
    },
  } as unknown as APIContext;
}
beforeEach(() => {
  vi.stubEnv(
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'local-checkout-test-secret-at-least-32-characters',
  );
  cookies = new Map();
  mocks.checkout = {
    status: vi.fn(async () => ({
      orderId: '9',
      occurrenceId: '7',
      committed: false,
      contact,
      groups: [{ vendorId: '1', pickup: [{ name: 'Booth pickup' }] }],
    })),
    clearTestPreorderFee: vi.fn(async () => true),
    stripeStatus: vi.fn(async () => ({ state: 'CANCELED' })),
    contact: vi.fn(async () => {}),
    pickup: vi.fn(async () => [
      { vendorId: '1', name: 'Booth pickup', methodId: '5' },
    ]),
    selectPickup: vi.fn(async () => {}),
  };
  const original = {
    id: '9',
    lines: [{ id: '10', productVariant: { id: '11' }, quantity: 2 }],
    couponCodes: [],
  };
  mocks.vendor = {
    bootstrap: vi
      .fn()
      .mockResolvedValueOnce({ cart: original })
      .mockResolvedValueOnce({ cart: original })
      .mockResolvedValue({ cart: { id: '12', lines: [] } }),
    select: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    add: vi.fn(async () => {}),
    adjust: vi.fn(async () => {}),
  };
  mocks.market = { ...mocks.vendor, applyCoupon: vi.fn() };
});
afterEach(() => vi.unstubAllEnvs());
describe('market checkout fee recovery', () => {
  const stale = new AppError('conflict', 'PREORDER_FEE_REQUOTE_REQUIRED');
  const editableCart = { id: '9', state: 'AddingItems', totalQuantity: 2 };

  it('retries checkout for the same editable order after clearing its stale quote', async () => {
    mocks.checkout.status.mockRejectedValueOnce(stale);
    mocks.market.bootstrap.mockReset().mockResolvedValue({ cart: editableCart });

    await expect(readCheckoutStatus(context('MARKET'), new Headers(), '9'))
      .resolves.toMatchObject({
        orderId: '9',
        contact,
        groups: [{ vendorId: '1', pickup: [{ name: 'Booth pickup' }] }],
      });
    expect(mocks.checkout.status.mock.calls).toEqual([['9'], ['9']]);
    expect(mocks.checkout.clearTestPreorderFee).toHaveBeenCalledOnce();
    expect(mocks.market.remove).not.toHaveBeenCalled();
    expect(mocks.checkout.selectPickup).not.toHaveBeenCalled();
  });

  it('leaves an existing valid quote alone', async () => {
    await readCheckoutStatus(context('MARKET'), new Headers(), '9');
    expect(mocks.market.bootstrap).not.toHaveBeenCalled();
    expect(mocks.checkout.clearTestPreorderFee).not.toHaveBeenCalled();
  });

  it.each([
    { ...editableCart, state: 'ArrangingPayment' },
    { ...editableCart, id: '12' },
  ])('does not clear a quote when the active cart is $state on order $id', async (cart) => {
    mocks.checkout.status.mockRejectedValueOnce(stale);
    mocks.market.bootstrap.mockReset().mockResolvedValue({ cart });
    await expect(readCheckoutStatus(context('MARKET'), new Headers(), '9')).rejects.toBe(stale);
    expect(mocks.checkout.clearTestPreorderFee).not.toHaveBeenCalled();
  });

  it('preserves the original error for vendor checkout', async () => {
    mocks.checkout.status.mockRejectedValueOnce(stale);
    await expect(readCheckoutStatus(context(), new Headers(), '9')).rejects.toBe(stale);
    expect(mocks.checkout.clearTestPreorderFee).not.toHaveBeenCalled();
  });
});
describe('checkout form privacy', () => {
  it('encrypts contact prefill and rejects tampering, the wrong purpose and expired drafts', () => {
    const token = sealCheckoutData(contact, 'signup');
    expect(token).not.toContain('ada');
    expect(openCheckoutData(token, 'signup')).toEqual(contact);
    expect(openCheckoutData(token, 'cart-recovery')).toBeUndefined();
    expect(openCheckoutData(`invalid${token}`, 'signup')).toBeUndefined();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1800001);
    expect(openCheckoutData(token, 'signup')).toBeUndefined();
    vi.restoreAllMocks();
  });
});
describe('canceled checkout recovery', () => {
  it.each([
    'VERIFYING',
    'COMPENSATION_PENDING',
    'COMPLETED',
    'MANUAL_INTERVENTION_REQUIRED',
  ])('never rebuilds a payment that is %s', async (state) => {
    mocks.checkout.stripeStatus.mockResolvedValue({ state });
    await expect(
      restartCheckout(context(), new Headers(), '9'),
    ).rejects.toThrow();
    expect(mocks.vendor.remove).not.toHaveBeenCalled();
    expect(mocks.vendor.add).not.toHaveBeenCalled();
  });
  it('restores every item, quantity, contact and pickup after confirmed cancellation', async () => {
    await restartCheckout(context(), new Headers(), '9');
    expect(mocks.vendor.remove).toHaveBeenCalledWith('10');
    expect(mocks.vendor.select).toHaveBeenCalledWith('7');
    expect(mocks.vendor.add).toHaveBeenCalledWith('11', 2, '7');
    expect(mocks.checkout.contact).toHaveBeenCalledWith(contact);
    expect(mocks.checkout.selectPickup).toHaveBeenCalledWith(['5']);
    expect(cookies.has('checkout-recovery')).toBe(false);
  });
  it('restores the cart when one vendor replaced a previously selected pickup option', async () => {
    const original = await mocks.checkout.status();
    mocks.checkout.status.mockResolvedValue({
      ...original,
      groups: [
        { vendorId: '1', pickup: [{ methodId: '5', name: 'Booth pickup' }] },
        { vendorId: '2', pickup: [{ methodId: '6', name: 'Curbside pickup' }] },
      ],
    });
    mocks.checkout.pickup.mockResolvedValue([
      { vendorId: '1', methodId: '5', name: 'Booth pickup' },
      { vendorId: '2', methodId: '7', name: 'Curbside pickup' },
    ]);

    await restartCheckout(context(), new Headers(), '9');
    expect(mocks.vendor.add).toHaveBeenCalledWith('11', 2, '7');
    expect(mocks.checkout.selectPickup).not.toHaveBeenCalled();
    expect(cookies.has('checkout-recovery')).toBe(false);
  });
  it('retains the recovery draft after an interrupted restore, and retries without doubling items', async () => {
    mocks.vendor.add.mockRejectedValueOnce(
      new Error('temporarily unavailable'),
    );
    await expect(
      restartCheckout(context(), new Headers(), '9'),
    ).rejects.toThrow();
    expect(cookies.has('checkout-recovery')).toBe(true);
    mocks.vendor.bootstrap.mockResolvedValue({
      cart: {
        id: '12',
        lines: [{ id: '21', productVariant: { id: '11' }, quantity: 1 }],
      },
    });
    await restartCheckout(context(), new Headers(), '9');
    expect(mocks.vendor.add).toHaveBeenCalledTimes(1);
    expect(mocks.vendor.adjust).toHaveBeenCalledWith('21', 2);
    expect(cookies.has('checkout-recovery')).toBe(false);
  });
  it('restores a market cart through market APIs and preserves its coupons', async () => {
    const original = {
      id: '9',
      groups: [{ lines: [{ id: '10', variantId: '11', quantity: 2 }] }],
      couponCodes: ['SAVE'],
    };
    mocks.market = {
      ...mocks.vendor,
      bootstrap: vi
        .fn()
        .mockResolvedValueOnce({ cart: original })
        .mockResolvedValueOnce({ cart: original })
        .mockResolvedValue({ cart: { id: '12', groups: [] } }),
      applyCoupon: vi.fn(async () => {}),
    };
    await restartCheckout(context('MARKET'), new Headers(), '9');
    expect(mocks.market.add).toHaveBeenCalledWith('7', '11', 2);
    expect(mocks.market.applyCoupon).toHaveBeenCalledWith('SAVE');
  });
});
