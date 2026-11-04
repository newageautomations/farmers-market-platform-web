import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InPersonApi, PosSale } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { Orders } from '../apps/admin/src/vendor/orders';
import { OrdersDateRange } from '../apps/admin/src/vendor/OrdersDateRange';
import {
  filterOrders,
  orderPayment,
  orderSaleType,
  ordersCsv,
  readOrdersWorkspace,
  type OrderFilters,
} from '../apps/admin/src/vendor/orders-data';

const defaults: OrderFilters = {
  search: '',
  market: 'all',
  occurrence: 'all',
  range: 'all',
  custom: { from: '', to: '' },
  saleType: 'all',
  payment: 'all',
  pickup: 'all',
  sort: 'newest',
};
const setup = () => createFixtureVendorService(fixtureContexts.VENDOR);

describe('orders workspace', () => {
  it('uses receipt identity and financial facts only with finance permission', async () => {
    const receipt: PosSale = {
      id: 'sale',
      draftId: 'draft',
      orderId: '1401',
      orderCode: 'MB-1',
      orderState: 'Delivered',
      state: 'COMPLETED',
      method: 'CASH',
      evidenceType: 'CASHIER_ATTESTED_CASH',
      vendor: 'Bakery',
      amount: 3464,
      currency: 'USD',
      tendered: 4000,
      changeDue: 536,
      confirmedAt: '2026-11-03T12:00:00Z',
      completedAt: '2026-11-03T12:00:01Z',
      context: {
        kind: 'INDEPENDENT',
        label: 'Independent Sale',
        marketId: null,
        occurrenceId: null,
      },
      customer: 'Sarah Mitchell',
      invitationState: 'PENDING',
      items: [],
      subtotal: 3464,
      discount: 0,
      tax: 0,
      units: [],
      refunds: [],
      cashierId: 'REF-CLRK-1',
      financialStatus: 'PAID',
    };
    const orderPaymentRead = vi.fn(async () => receipt);
    const service = createFixtureVendorService({
      ...fixtureContexts.VENDOR,
      permissions: ['ReadOwnOrders', 'ReadOwnVendorFinance'],
    });
    const base = (await service.orders(0, 'all')).items[0]!;
    service.orders = async () => ({
      totalItems: 1,
      items: [
        {
          ...base,
          context: null,
          portion: { ...base.portion, kind: 'IN_PERSON' },
        },
      ],
    });
    service.pos = { orderPayment: orderPaymentRead } as unknown as InPersonApi;
    const allowed = await readOrdersWorkspace(service);
    expect(orderPaymentRead).toHaveBeenCalledWith('1401');
    expect(allowed[0]?.customer).toBe('Sarah Mitchell');
    expect(orderPayment(allowed[0]!).value).toBe('PAID');
    expect(orderSaleType(allowed[0]!)).toBe('Independent Sale');
    expect(
      filterOrders(allowed, { ...defaults, search: 'REF-CLRK-1' }),
    ).toHaveLength(1);
    orderPaymentRead.mockClear();
    const denied = await readOrdersWorkspace({
      ...service,
      context: { ...service.context, permissions: ['ReadOwnOrders'] },
    });
    expect(orderPaymentRead).not.toHaveBeenCalled();
    expect(orderSaleType(denied[0]!)).toBe('In-person Sale');
    expect(orderPayment(denied[0]!).value).toBe('unknown');
    expect(denied[0]?.customer).toBe('Customer details unavailable');
  });
  it('loads every page, retains order destinations, and searches beyond the first page without customer icons', async () => {
    const service = setup();
    const orders = vi.spyOn(service, 'orders');
    render(<Orders service={service} />);
    const table = await screen.findByRole('table', { name: 'Vendor orders' });
    expect(orders).toHaveBeenCalledWith(20, 'all');
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    expect(
      within(table).getAllByRole('link', { name: /Open order/ })[0],
    ).toHaveAttribute('href', '/vendor/orders/1401');
    expect(
      table.querySelector(
        'tbody td:nth-child(2) svg, tbody td:nth-child(2) .farmstand-icon',
      ),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: '1423' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(
      within(table).getByRole('link', { name: 'Open order 1423' }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText('Sale Type'), {
      target: { value: 'Independent Sale' },
    });
    expect(screen.getByText('No matching orders')).toBeVisible();
  });

  it('filters inclusive local calendar dates across DST, missing dates, and all requested presets', async () => {
    const rows = await readOrdersWorkspace(setup());
    const day = (id: string, placedAt: string | null) => ({
      ...rows[0]!,
      portion: { ...rows[0]!.portion, operationalOrderId: id, placedAt },
    });
    const dates = [
      day('old', new Date(2026, 9, 28, 23, 59).toISOString()),
      day('start', new Date(2026, 9, 29).toISOString()),
      day('end', new Date(2026, 10, 4, 23, 59).toISOString()),
      day('future', new Date(2026, 10, 5).toISOString()),
      day('unknown', null),
    ];
    expect(
      filterOrders(
        dates,
        { ...defaults, range: '7' },
        new Date(2026, 10, 4, 12),
      ).map((row) => row.portion.operationalOrderId),
    ).toEqual(['end', 'start']);
    expect(
      filterOrders(dates, {
        ...defaults,
        range: 'custom',
        custom: { from: '2026-10-29', to: '2026-11-04' },
      }).map((row) => row.portion.operationalOrderId),
    ).toEqual(['end', 'start']);
    render(<Orders service={setup()} />);
    await screen.findByRole('table', { name: 'Vendor orders' });
    for (const days of [7, 14, 30, 60])
      expect(
        screen.getByRole('option', { name: `Last ${days} days` }),
      ).toBeInTheDocument();
  });

  it('selects from then to across months, disallows reversed dates and applies only a complete range', () => {
    const apply = vi.fn();
    render(
      <OrdersDateRange
        value={{ from: '2026-10-01', to: '' }}
        onClose={() => {}}
        onApply={apply}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const date = (value: string) =>
      new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
        dateStyle: 'full',
      });
    fireEvent.click(
      within(dialog).getByRole('button', { name: date('2026-10-29') }),
    );
    expect(within(dialog).getByText('Now select the to date.')).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: date('2026-10-28') }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'Apply date range' }),
    ).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next month' }));
    fireEvent.click(
      within(dialog).getByRole('button', { name: date('2026-11-04') }),
    );
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Apply date range' }),
    );
    expect(apply).toHaveBeenCalledWith({
      from: '2026-10-29',
      to: '2026-11-04',
    });
  });

  it('cancels a custom range without changing the active preset', async () => {
    render(<Orders service={setup()} />);
    await screen.findByRole('table', { name: 'Vendor orders' });
    const range = screen.getByLabelText('Date Range');
    fireEvent.change(range, { target: { value: '14' } });
    fireEvent.change(range, { target: { value: 'custom' } });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(range).toHaveValue('14');
  });

  it('does not read CRM or receipts without permission or invent missing money or customer details', async () => {
    const service = createFixtureVendorService({
      ...fixtureContexts.VENDOR,
      permissions: ['ReadOwnOrders'],
    });
    const customers = vi.spyOn(service, 'customers');
    const history = vi.spyOn(service, 'history');
    const read = service.orders;
    service.orders = async (skip, kind) => {
      const page = await read(skip, kind);
      return {
        ...page,
        items: page.items.map((order) => ({ ...order, context: null })),
      };
    };
    render(<Orders service={service} />);
    const table = await screen.findByRole('table', { name: 'Vendor orders' });
    expect(customers).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    expect(
      within(table).getAllByText('Customer details unavailable').length,
    ).toBeGreaterThan(0);
    expect(within(table).getAllByText('Unavailable').length).toBeGreaterThan(0);
    const summary = document.querySelector('.orders-summary')!;
    expect(summary).toHaveTextContent('0 unpaid');
    expect(summary).toHaveTextContent('0 ready for pickup');
    expect(summary).toHaveTextContent('0 independent sales');
    expect(summary).toHaveTextContent('0 completed today');
    expect(summary).not.toHaveTextContent('Unavailable');
    expect(
      screen.queryByRole('link', { name: 'Create Sale' }),
    ).not.toBeInTheDocument();
  });

  it('exports quotes and neutralizes spreadsheet formulas in customer data', async () => {
    const rows = await readOrdersWorkspace(setup());
    const csv = ordersCsv([{ ...rows[0]!, customer: '=HYPERLINK("example")' }]);
    expect(csv).toContain('"\'=HYPERLINK(""example"")"');
    expect(csv).toContain('"Market Pickup"');
  });
});
