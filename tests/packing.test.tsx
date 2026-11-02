import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  AppError,
  createPackingApi,
  type PackingApi,
  type PackingView,
} from '@market/api';
import {
  VendorPacking,
  PackingCardStatus,
  PackingProgress,
} from '../apps/admin/src/vendor/packing';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import type { VendorService } from '../apps/admin/src/vendor/service';

function expandFirstItem() {
  fireEvent.click(
    screen.getByLabelText('Packing details for Honey jar, order ORDER-123'),
  );
}
function fixture() {
  const occurrence = {
    id: 21,
    marketName: 'Packing Market',
    startsAt: '2026-11-08T15:00:00Z',
    endsAt: '2026-11-08T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'North gate',
    status: 'scheduled',
  };
  const data: PackingView = {
    occurrence,
    revision: 1,
    sourceVersion: 'source',
    products: [
      {
        variantId: '71',
        name: 'Honey jar',
        planned: 20,
        preorders: 8,
        required: 28,
        packed: 21,
        status: 'Partially Packed',
        image: 'http://localhost:3000/assets/honey.jpg',
        availablePacked: 1,
      },
    ],
    customers: [
      {
        key: 'customer:10',
        name: 'Taylor Buyer',
        orderCodes: ['ORDER-123'],
        required: 8,
        packed: 0,
        completed: false,
        status: 'Not Started',
        items: [
          {
            lineId: '501',
            variantId: '71',
            name: 'Honey jar',
            quantity: 8,
            checked: false,
            packed: 0,
            availablePacked: 1,
            orderCode: 'ORDER-123',
            pickup: { venue: 'North gate', instructions: 'Booth A' },
          },
        ],
      },
      {
        key: 'customer:11',
        name: 'Taylor Buyer',
        orderCodes: ['ORDER-456'],
        required: 1,
        packed: 0,
        completed: false,
        status: 'Not Started',
        items: [
          {
            lineId: '502',
            variantId: '72',
            name: 'Eggs',
            quantity: 1,
            checked: false,
            orderCode: 'ORDER-456',
            pickup: {},
          },
        ],
      },
    ],
    summary: {
      distinct: 1,
      fullyPacked: 0,
      partiallyPacked: 1,
      required: 28,
      packed: 21,
      progress: 75,
      status: 'Partially Packed',
      customersRemaining: 2,
    },
  };
  const api: PackingApi = {
    occurrences: vi.fn(async () => [occurrence]),
    read: vi.fn(async () => structuredClone(data)),
    command: vi.fn(async (_current, command) => {
      data.revision++;
      if (command.action === 'PACK') {
        data.products[0]!.packed = command.quantity!;
        data.summary.packed = command.quantity!;
        data.products[0]!.status =
          command.quantity! > data.products[0]!.required
            ? 'Overpacked'
            : 'Packed';
      }
      if (command.action === 'PLAN')
        data.products[0]!.planned = command.quantity!;
      const customer = data.customers[0]!;
      if (command.action === 'CHECK') {
        customer.items[0]!.checked = command.checked!;
        customer.packed = command.checked ? 8 : 0;
      }
      if (command.action === 'PACK_LINE' || command.action === 'USE_PACKED') {
        const before = customer.items[0]!.packed ?? 0;
        if (command.action === 'PACK_LINE') {
          const delta = command.quantity! - before;
          data.products[0]!.packed += delta;
          data.summary.packed += delta;
        }
        customer.items[0]!.packed = command.quantity!;
        customer.items[0]!.checked =
          command.quantity! >= customer.items[0]!.quantity;
        customer.items[0]!.availablePacked = Math.max(
          0,
          data.products[0]!.packed - 20 - command.quantity!,
        );
        customer.packed = command.quantity!;
      }
      if (command.action === 'COMPLETE') {
        customer.completed = true;
        customer.status = 'Packed';
      }
      if (command.action === 'REOPEN') {
        customer.completed = false;
        customer.status = 'Partially Packed';
      }
      return structuredClone(data);
    }),
  };
  const service: VendorService = {
    ...createFixtureVendorService({
      scope: 'VENDOR',
      name: 'Packing Vendor',
      source: 'fixture',
      membershipRole: 'owner',
      subject: { vendorId: '1' },
      permissions: [
        'ReadOwnVendorIdentity',
        'ManageOwnInventory',
        'ReadOwnOrders',
        'FulfillOwnOrders',
        'ManageOwnCatalog',
      ],
    }),
    packing: api,
    catalog: vi.fn(async () => ({ items: [], totalItems: 0 })),
  };
  window.history.replaceState(null, '', '/vendor/orders/packing?occurrence=21');
  return { api, service, data };
}
it('edits partial master packing through the Market Day inspector and shows save feedback', async () => {
  const { service, api } = fixture();
  render(<VendorPacking service={service} />);
  const row = await screen.findByRole('button', {
    name: 'Open Honey jar',
  });
  fireEvent.click(row);
  const input = screen.getByRole('spinbutton', { name: 'Quantity packed' });
  expect(input).toHaveAttribute('min', '0');
  expect(input).toHaveAttribute('max', '1000000');
  fireEvent.change(input, { target: { value: '19' } });
  fireEvent.blur(input);
  await screen.findByText('Packing saved');
  expect(api.command).toHaveBeenCalledWith(
    expect.objectContaining({ revision: 1 }),
    { action: 'PACK', variantId: '71', quantity: 19 },
  );
  expect(
    screen.getByRole('button', { name: 'Open Honey jar' }),
  ).toBeInTheDocument();
  expect(
    document.querySelector('.attendance-detail-shell'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps occurrence across tabs, searches order codes and requires explicit completion then permits reopening', async () => {
  const { service, api } = fixture();
  render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  fireEvent.change(
    screen.getByRole('searchbox', {
      name: 'Search customers or order numbers',
    }),
    { target: { value: 'ORDER-123' } },
  );
  const list = screen.getByRole('tabpanel', { name: 'Individual Lists' });
  expect(within(list).queryByText('ORDER-456')).not.toBeInTheDocument();
  fireEvent.click(within(list).getByRole('button', { name: /Taylor Buyer/ }));
  expandFirstItem();
  const complete = screen.getByRole('button', { name: 'Mark Customer Packed' });
  expect(complete).toBeDisabled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.change(
    screen.getByRole('spinbutton', { name: /Packed quantity for Honey jar/ }),
    { target: { value: '8' } },
  );
  fireEvent.blur(
    screen.getByRole('spinbutton', { name: /Packed quantity for Honey jar/ }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Mark Customer Packed' }),
    ).toBeEnabled(),
  );
  expect(api.command).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Mark Customer Packed' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Reopen packing' }),
  );
  await screen.findByRole('button', { name: 'Mark Customer Packed' });
  fireEvent.click(screen.getByRole('tab', { name: 'Master List' }));
  expect(screen.getByLabelText('Market occurrence')).toHaveValue('21');
  expect(api.command).toHaveBeenCalledTimes(3);
  expect(
    screen.getByRole('button', { name: 'Open Honey jar' }),
  ).toBeInTheDocument();
});
it('does not merge same-name customers and restores persisted packing on remount', async () => {
  const { service } = fixture();
  const rendered = render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  expect(screen.getAllByRole('button', { name: /Taylor Buyer/ })).toHaveLength(
    2,
  );
  rendered.unmount();
  render(<VendorPacking service={service} />);
  expect(
    await screen.findByRole('button', { name: 'Open Honey jar' }),
  ).toBeInTheDocument();
});
it('shows remaining customer lists on a fully gathered market-day card and preserves exact deep link', async () => {
  const { api, data } = fixture();
  data.summary.status = 'Packed';
  data.summary.packed = 28;
  render(<PackingCardStatus api={api} occurrenceId={21} />);
  await screen.findByText('Packed');
  expect(screen.getByText('2 customer lists incomplete')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Packing & Fulfillment' }),
  ).toHaveAttribute('href', '/vendor/orders/packing?occurrence=21');
});
it('renders safe load failures and does not claim empty lists are packed', async () => {
  const { api } = fixture();
  vi.mocked(api.read).mockRejectedValue(new AppError('unavailable'));
  render(<PackingCardStatus api={api} occurrenceId={21} />);
  await screen.findByText('Packing status unavailable');
  expect(screen.queryByText('Packed')).not.toBeInTheDocument();
});
it('uses generated admin transport operations with channel scope and optimistic versions', async () => {
  const { data } = fixture();
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect((init?.headers as Record<string, string>)['vendure-token']).toBe(
      'vendor-channel',
    );
    expect(body.variables.input).toMatchObject({
      occurrenceId: 21,
      expectedRevision: 1,
      sourceVersion: 'source',
      action: 'PACK',
      quantity: 21,
    });
    return new Response(
      JSON.stringify({ data: { updateOwnMarketPacking: data } }),
      { status: 200 },
    );
  });
  const api = createPackingApi({
    endpoint: 'http://localhost:3000/admin-api',
    channelToken: 'vendor-channel',
    fetch: fetch as typeof globalThis.fetch,
  });
  expect(
    (await api.command(data, { action: 'PACK', variantId: '71', quantity: 21 }))
      .revision,
  ).toBe(1);
});
it('keeps the panel mounted through its Market Day close animation and restores keyboard focus', async () => {
  const { service } = fixture();
  render(<VendorPacking service={service} />);
  const trigger = await screen.findByRole('button', {
    name: 'Open Honey jar',
  });
  trigger.focus();
  fireEvent.click(trigger);
  const heading = screen.getByRole('heading', { name: 'Honey jar' });
  expect(heading).toHaveFocus();
  fireEvent.keyDown(heading, { key: 'Escape' });
  expect(
    document.querySelector('.attendance-detail-shell.is-closing'),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Honey jar' }),
    ).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
});
it('refreshes authoritative data after a stale save and presents safe conflict feedback', async () => {
  const { service, api } = fixture();
  vi.mocked(api.command).mockRejectedValue(new AppError('conflict'));
  render(<VendorPacking service={service} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open Honey jar' }),
  );
  const quantity = screen.getByRole('spinbutton', { name: 'Quantity packed' });
  fireEvent.change(quantity, { target: { value: '22' } });
  fireEvent.blur(quantity);
  await screen.findByText(
    'This information has changed. Refresh and try again.',
  );
  await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Packing saved')).not.toBeInTheDocument();
});
it('presents empty plans and preorders without claiming completion', async () => {
  const { service, data } = fixture();
  data.products = [];
  data.customers = [];
  data.summary = {
    distinct: 0,
    fullyPacked: 0,
    partiallyPacked: 0,
    required: 0,
    packed: 0,
    progress: 0,
    status: 'Not planned',
    customersRemaining: 0,
  };
  render(<VendorPacking service={service} />);
  await screen.findByText('Nothing planned yet');
  fireEvent.click(screen.getByRole('tab', { name: 'Individual Lists' }));
  expect(screen.getByText('No eligible preorders for this date')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Mark Customer Packed' }),
  ).not.toBeInTheDocument();
});
it('opens walk-up inventory in the shared modal and renders list content outside its keyboard button', async () => {
  const { service } = fixture();
  render(<VendorPacking service={service} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add walk-up inventory' }),
  );
  const modal = screen.getByRole('dialog', { name: 'Add walk-up inventory' });
  await waitFor(() =>
    expect(within(modal).getByLabelText('Product variant')).toBeEnabled(),
  );
  expect(
    within(modal).getByRole('searchbox', { name: 'Find a catalog product' }),
  ).toBeVisible();
  const card = screen.getByRole('article', { name: 'Honey jar' });
  expect(
    within(card).getByRole('button', { name: 'Open Honey jar' }),
  ).toBeEmptyDOMElement();
  expect(within(card).getByText('21 / 28 packed')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Refresh packing' }),
  ).not.toBeInTheDocument();
});
it('uses red, orange, yellow and green as packing progresses and exposes unit values', () => {
  const { rerender } = render(
    <PackingProgress required={100} packed={0} label="Packing" />,
  );
  for (const [packed, tone] of [
    [0, 'red'],
    [30, 'orange'],
    [75, 'yellow'],
    [100, 'green'],
  ] as const) {
    rerender(
      <PackingProgress required={100} packed={packed} label="Packing" />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', tone);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(packed),
    );
  }
});
it('shows the product image and card progress, and edits the plan only in the inventory modal', async () => {
  const { service, api } = fixture();
  render(<VendorPacking service={service} />);
  const card = await screen.findByRole('article', { name: 'Honey jar' });
  expect(card.querySelector('img')).toHaveAttribute(
    'src',
    'http://localhost:3000/assets/honey.jpg',
  );
  expect(
    within(card).getByRole('progressbar', {
      name: 'Honey jar packing progress',
    }),
  ).toHaveAttribute('aria-valuenow', '21');
  fireEvent.click(card);
  expect(
    screen.queryByLabelText('Planned walk-up quantity'),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Walk-up units')).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Edit walk-up inventory' }),
  );
  const modal = screen.getByRole('dialog', { name: 'Edit walk-up inventory' });
  expect(
    within(modal).getByRole('spinbutton', { name: 'Walk-up units' }),
  ).toHaveValue(20);
  fireEvent.change(within(modal).getByRole('spinbutton'), {
    target: { value: '12' },
  });
  fireEvent.click(
    within(modal).getByRole('button', { name: 'Save walk-up plan' }),
  );
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith(expect.anything(), {
      action: 'PLAN',
      variantId: '71',
      quantity: 12,
    }),
  );
});
it('reuses gathered overflow with partial order quantities without changing master counts', async () => {
  const { service, api } = fixture();
  render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  fireEvent.click(
    screen.getByRole('button', { name: /Open Taylor Buyer ORDER-123/ }),
  );
  expandFirstItem();
  expect(
    screen.getByRole('progressbar', { name: 'Customer packing progress' }),
  ).toHaveAttribute('aria-valuenow', '0');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByText('Booth A')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Use 1 already packed' }));
  await waitFor(() =>
    expect(
      screen.getByRole('progressbar', { name: 'Customer packing progress' }),
    ).toHaveAttribute('aria-valuenow', '1'),
  );
  expect(api.command).toHaveBeenCalledWith(expect.anything(), {
    action: 'USE_PACKED',
    lineId: '501',
    quantity: 1,
  });
  expect(
    screen.queryByRole('button', { name: 'Use 1 already packed' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Master List' }));
  expect(
    within(screen.getByRole('article', { name: 'Honey jar' })).getByRole(
      'progressbar',
    ),
  ).toHaveAttribute('aria-valuenow', '21');
});
it('autosaves circular steppers, adds newly packed units to master totals and displays surplus', async () => {
  const { service, api, data } = fixture();
  Object.assign(data.products[0]!, {
    planned: 0,
    required: 3,
    preorders: 3,
    packed: 3,
  });
  Object.assign(data.summary, { required: 3, packed: 3 });
  Object.assign(data.customers[0]!, { required: 3 });
  Object.assign(data.customers[0]!.items[0]!, {
    quantity: 3,
    availablePacked: 3,
  });
  render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  fireEvent.click(
    screen.getByRole('button', { name: /Open Taylor Buyer ORDER-123/ }),
  );
  expandFirstItem();
  expect(screen.getByText(`3 \u00d7 Honey jar`)).toBeInTheDocument();
  expect(document.body.textContent).not.toContain('\ufffd');
  expect(
    screen.queryByRole('button', { name: 'Save quantity' }),
  ).not.toBeInTheDocument();
  const input = screen.getByRole('spinbutton', {
    name: /Packed quantity for Honey jar/,
  });
  fireEvent.change(input, { target: { value: '2' } });
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith(expect.anything(), {
      action: 'PACK_LINE',
      lineId: '501',
      quantity: 2,
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', {
        name: /Decrease packed quantity for Honey jar/i,
      }),
    ).toBeEnabled(),
  );
  expect(data.products[0]!.packed).toBe(5);
  const minus = screen.getByRole('button', {
    name: /Decrease packed quantity for Honey jar/i,
  });
  const plus = screen.getByRole('button', {
    name: /Increase packed quantity for Honey jar/i,
  });
  expect(minus).toHaveClass('packing-step-decrease');
  expect(plus).toHaveClass('packing-step-increase');
  fireEvent.click(minus);
  await waitFor(() => expect(data.products[0]!.packed).toBe(4));
  fireEvent.click(screen.getByRole('tab', { name: 'Master List' }));
  const card = screen.getByRole('article', { name: 'Honey jar' });
  expect(within(card).getByText(/4 \/ 3 packed/)).toBeInTheDocument();
  expect(within(card).getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '4',
  );
  expect(
    screen.queryByRole('button', { name: 'Save packed quantity' }),
  ).not.toBeInTheDocument();
});
it('flushes a pending typed quantity when leaving the customer panel', async () => {
  const { service, api } = fixture();
  render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  fireEvent.click(
    screen.getByRole('button', { name: /Open Taylor Buyer ORDER-123/ }),
  );
  expandFirstItem();
  fireEvent.change(
    screen.getByRole('spinbutton', { name: /Packed quantity for Honey jar/ }),
    { target: { value: '2' } },
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Master List' }));
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith(expect.anything(), {
      action: 'PACK_LINE',
      lineId: '501',
      quantity: 2,
    }),
  );
});
it('opens only one product disclosure and retains the sidebar and controls across quantity saves', async () => {
  const { service, api, data } = fixture();
  data.customers[0]!.items.push({
    ...data.customers[0]!.items[0]!,
    lineId: '503',
    name: 'Eggs',
    quantity: 2,
  });
  render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  fireEvent.click(
    screen.getByRole('button', { name: /Open Taylor Buyer ORDER-123/ }),
  );
  expect(
    screen.queryByRole('spinbutton', { name: /Packed quantity for Honey jar/ }),
  ).not.toBeVisible();
  const honey = screen.getByLabelText(
    'Packing details for Honey jar, order ORDER-123',
  );
  const eggs = screen.getByLabelText(
    'Packing details for Eggs, order ORDER-123',
  );
  fireEvent.click(honey);
  expect(honey.closest('details')).toHaveAttribute('open');
  fireEvent.click(eggs);
  expect(eggs.closest('details')).toHaveAttribute('open');
  expect(honey.closest('details')).not.toHaveAttribute('open');
  fireEvent.click(honey);
  const panel = document.querySelector('.packing-inspector');
  expect(panel).toHaveClass('packing-inspector-customer');
  const feedback = document.querySelector('.packing-save-status');
  const input = screen.getByRole('spinbutton', {
    name: /Packed quantity for Honey jar/,
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: /Increase packed quantity for Honey jar/i,
    }),
  );
  expect(document.querySelector('.packing-save-status')).toBe(feedback);
  await waitFor(() => expect(input).toHaveValue(1));
  await screen.findByText('Packing saved');
  expect(document.querySelector('.packing-inspector')).toBe(panel);
  expect(document.querySelector('.packing-save-status')).toBe(feedback);
  expect(
    screen.getByRole('spinbutton', { name: /Packed quantity for Honey jar/ }),
  ).toBe(input);
  expect(honey.closest('details')).toHaveAttribute('open');
  expect(eggs.closest('details')).not.toHaveAttribute('open');
  expect(api.read).toHaveBeenCalledTimes(1);
});
it('allows packing above a customer product requirement and retains the actual count', async () => {
  const { service, data } = fixture();
  Object.assign(data.products[0]!, {
    packed: 3,
    planned: 0,
    preorders: 3,
    required: 3,
  });
  Object.assign(data.customers[0]!, { packed: 3, required: 3 });
  Object.assign(data.customers[0]!.items[0]!, {
    packed: 3,
    quantity: 3,
    checked: true,
  });
  render(<VendorPacking service={service} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Individual Lists' }));
  fireEvent.click(
    screen.getByRole('button', { name: /Open Taylor Buyer ORDER-123/ }),
  );
  expandFirstItem();
  const plus = screen.getByRole('button', {
    name: /Increase packed quantity for Honey jar/i,
  });
  expect(plus).toBeEnabled();
  fireEvent.click(plus);
  await waitFor(() =>
    expect(
      screen.getByRole('spinbutton', { name: /Packed quantity for Honey jar/ }),
    ).toHaveValue(4),
  );
  const product = screen
    .getByLabelText('Packing details for Honey jar, order ORDER-123')
    .closest('details')!;
  expect(within(product).getByText(/4 \/ 3 packed/)).toBeInTheDocument();
  expect(within(product).getByText('Overpacked')).toBeInTheDocument();
  expect(data.products[0]!.packed).toBe(4);
  expect(
    screen.getByRole('button', { name: 'Mark Customer Packed' }),
  ).toBeEnabled();
  expect(data.customers[0]!.completed).toBe(false);
});
it('uses required-unit credit for the overall gathered meter while retaining actual surplus counts', async () => {
  const { service, data } = fixture();
  data.products[0] = { ...data.products[0]!, required: 3, packed: 6 };
  data.products.push({
    variantId: '72',
    name: 'Eggs',
    planned: 3,
    preorders: 0,
    required: 3,
    packed: 0,
    status: 'Not Started',
  });
  Object.assign(data.summary, {
    required: 6,
    packed: 6,
    gathered: 3,
    progress: 50,
  });
  render(<VendorPacking service={service} />);
  await screen.findByText('50% gathered');
  expect(
    screen.getByRole('progressbar', { name: 'Overall packing progress' }),
  ).toHaveAttribute('aria-valuenow', '3');
  const card = screen.getByRole('article', { name: 'Honey jar' });
  expect(within(card).getByText(/6 \/ 3 packed/)).toBeInTheDocument();
  expect(within(card).getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '6',
  );
});
