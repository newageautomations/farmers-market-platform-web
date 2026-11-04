import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, type PackingView } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import {
  collectPickup,
  readPickupOrders,
  withPacking,
  type PickupOrder,
} from '../apps/admin/src/vendor/pickup-data';
import { VendorPickup } from '../apps/admin/src/vendor/pickup';

beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());
const operationIdentity =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function setup() {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  const source = await service.order('1401');
  const portion = {
    ...source.portion,
    kind: 'MARKET_OCCURRENCE',
    marketId: '4',
    marketName: 'Boerne Market',
    occurrenceId: '12',
    nativeState: 'PaymentSettled',
    pickupStatus: 'PENDING',
    quantity: 3,
    remainingQuantity: 2,
    fulfilledQuantity: 1,
    lines: source.portion.lines.slice(0, 1).map((line) => ({
      ...line,
      quantity: 3,
      remainingQuantity: 2,
      fulfilledQuantity: 1,
      cancelledQuantity: 0,
    })),
  };
  const order: PickupOrder = {
    ...source,
    portion,
    customer: 'Ava Green',
    orderCode: 'MB-101',
    payment: null,
    packed: false,
  };
  service.context = {
    ...service.context,
    permissions: ['ReadOwnOrders', 'FulfillOwnOrders'],
  };
  service.packing = undefined;
  service.order = vi.fn(async () => order);
  service.orders = vi.fn(async () => ({ items: [order], totalItems: 1 }));
  service.fulfill = vi.fn(async () => ({
    id: 'receipt',
    operationKey: 'key',
    kind: 'FULFILL',
    status: 'COMMITTED',
    movementIds: [],
    orderId: portion.operationalOrderId,
    orderLineId: null,
    fulfillmentId: null,
  }));
  return { service, order };
}

describe('vendor pickup', () => {
  it('joins packing by operational line identity and preserves other dates', async () => {
    const { order } = await setup();
    const packing = {
      customers: [
        {
          name: 'Ava Green',
          completed: true,
          items: [
            {
              lineId: order.portion.lines[0]!.operationalLineId,
              orderCode: 'MB-101',
            },
          ],
        },
      ],
    } as PackingView;
    const packed = withPacking([order], packing);
    expect(packed[0]).toMatchObject({
      customer: 'Ava Green',
      orderCode: 'MB-101',
      packed: true,
    });
    expect(
      withPacking(packed, { customers: [] } as unknown as PackingView)[0]
        ?.packed,
    ).toBe(true);
  });
  it('renders a queue without checklist controls or order numbers and requires identity verification', async () => {
    const { service } = await setup();
    render(<VendorPickup service={service} />);
    const queue = await screen.findByRole('table', {
      name: 'Pickup queue',
    });
    expect(within(queue).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(queue).queryByText(/Order #/)).not.toBeInTheDocument();
    expect(screen.queryByText('Market Pickup')).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Mark as Picked Up' });
    expect(submit).toBeDisabled();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /confirmed the customer/ }),
    );
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(service.fulfill).toHaveBeenCalledTimes(1));
    expect(service.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 2 }),
    );
  });

  it('fulfills only remaining quantities and refuses stale handoffs', async () => {
    const { service, order } = await setup();
    await collectPickup(service, order, 'intent');
    expect(service.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 2,
        operationKey: expect.stringMatching(operationIdentity),
      }),
    );
    vi.mocked(service.fulfill).mockClear();
    service.order = vi.fn(async () => ({
      ...order,
      portion: {
        ...order.portion,
        lines: order.portion.lines.map((line) => ({
          ...line,
          remainingQuantity: 1,
        })),
      },
    }));
    await expect(collectPickup(service, order, 'stale')).rejects.toMatchObject({
      kind: 'conflict',
    });
    expect(service.fulfill).not.toHaveBeenCalled();
  });

  it('stops a partial command sequence on failure without retrying', async () => {
    const { service, order } = await setup();
    const first = order.portion.lines[0]!;
    const multiple = {
      ...order,
      portion: {
        ...order.portion,
        lines: [
          first,
          { ...first, operationalLineId: 'second' },
          { ...first, operationalLineId: 'third' },
        ],
      },
    };
    service.order = vi.fn(async () => multiple);
    vi.mocked(service.fulfill).mockRejectedValueOnce(new AppError('network'));
    await expect(
      collectPickup(service, multiple, 'intent'),
    ).rejects.toMatchObject({ kind: 'network' });
    expect(service.fulfill).toHaveBeenCalledTimes(1);
  });

  it('sends valid, distinct UUIDs per line that remain stable for the same intent', async () => {
    const { service, order } = await setup();
    const first = order.portion.lines[0]!;
    const multiple = {
      ...order,
      portion: {
        ...order.portion,
        lines: [first, { ...first, operationalLineId: 'second' }],
      },
    };
    service.order = vi.fn(async () => multiple);
    await collectPickup(service, multiple, 'intent');
    const keys = vi
      .mocked(service.fulfill)
      .mock.calls.map(([input]) => input.operationKey);
    expect(keys).toHaveLength(2);
    keys.forEach((key) => expect(key).toMatch(operationIdentity));
    expect(new Set(keys).size).toBe(2);
    vi.mocked(service.fulfill).mockClear();
    await collectPickup(service, multiple, 'intent');
    expect(
      vi
        .mocked(service.fulfill)
        .mock.calls.map(([input]) => input.operationKey),
    ).toEqual(keys);
    vi.mocked(service.fulfill).mockClear();
    await collectPickup(service, multiple, 'another-intent');
    expect(vi.mocked(service.fulfill).mock.calls[0]![0].operationKey).not.toBe(
      keys[0],
    );
  });

  it('does not read CRM without permission, includes later order pages, and blocks unauthorized writes', async () => {
    const { service, order } = await setup();
    service.customers = vi.fn();
    service.orders = vi.fn(async (skip) => ({
      items: [
        {
          ...order,
          portion: { ...order.portion, operationalOrderId: String(skip) },
        },
      ],
      totalItems: 2,
    }));
    expect(await readPickupOrders(service)).toHaveLength(2);
    expect(service.customers).not.toHaveBeenCalled();
    service.context = { ...service.context, permissions: ['ReadOwnOrders'] };
    await expect(collectPickup(service, order, 'denied')).rejects.toMatchObject(
      { kind: 'conflict' },
    );
    expect(service.fulfill).not.toHaveBeenCalled();
  });

  it('filters the queue by fulfillment status and search', async () => {
    const { service } = await setup();
    render(<VendorPickup service={service} />);
    await screen.findByRole('table', { name: 'Pickup queue' });
    fireEvent.change(screen.getByLabelText('Search', { exact: true }), {
      target: { value: 'not-a-customer' },
    });
    expect(screen.getByText('No matching pickups')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search', { exact: true }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Picked up' }));
    expect(screen.getByText('No matching pickups')).toBeInTheDocument();
  });
});
