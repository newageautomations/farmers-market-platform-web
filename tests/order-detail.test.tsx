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

const sale: PosSale = {
  id: 'sale',
  draftId: 'draft',
  orderId: '1401',
  orderCode: 'MB-20481A9',
  orderState: 'Delivered',
  state: 'COMPLETED',
  method: 'CASH',
  evidenceType: 'CASHIER_ATTESTED_CASH',
  vendor: 'Test Bakery',
  amount: 866,
  currency: 'USD',
  tendered: 1000,
  changeDue: 134,
  confirmedAt: '2026-11-02T17:00:00Z',
  completedAt: '2026-11-02T17:00:01Z',
  context: {
    kind: 'INDEPENDENT',
    label: 'Independent Sale',
    marketId: null,
    occurrenceId: null,
  },
  customer: 'Walk-in customer',
  invitationState: 'PENDING',
  items: [
    {
      id: 'line',
      variantId: '1101',
      name: 'Sourdough loaf',
      quantity: 1,
      unitPrice: 800,
      lineTotal: 866,
      lineTax: 66,
      lineDiscount: 0,
      tax: [],
      discounts: [],
    },
  ],
  subtotal: 800,
  discount: 0,
  tax: 66,
  cashierId: 'CASHIER-REF',
  financialStatus: 'PARTIALLY_REFUNDED',
  timezone: 'America/Chicago',
  canRecordRefund: true,
  units: [{ id: 'unit', lineId: 'line', amount: 866, reserved: false }],
  refunds: [
    {
      id: 'refund',
      amount: 100,
      state: 'SETTLED',
      reason: 'Partial return',
      createdAt: '2026-11-02T18:00:00Z',
    },
  ],
};

function setup(permissions = fixtureContexts.VENDOR.permissions) {
  return createFixtureVendorService({ ...fixtureContexts.VENDOR, permissions });
}
async function posSetup() {
  const service = setup([
    ...fixtureContexts.VENDOR.permissions,
    'ReadOwnVendorFinance',
    'RequestOwnVendorRefund',
  ]);
  const view = await service.order('1401');
  service.order = vi.fn(async () => ({
    ...view,
    context: null,
    portion: { ...view.portion, kind: 'IN_PERSON' },
  }));
  service.pos = {
    orderPayment: vi.fn(async () => sale),
  } as unknown as InPersonApi;
  return service;
}

describe('individual order workspace', () => {
  it('retains real statuses, quantities and attribution without inventing receipt data', async () => {
    render(<Orders service={setup()} id="1401" />);
    const table = await screen.findByRole('table', {
      name: 'Operational order lines',
    });
    expect(
      within(within(table).getAllByRole('row')[1]!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['5', '2', '1', '2']);
    expect(
      screen.getByRole('progressbar', { name: 'Fulfillment progress' }),
    ).toHaveValue(40);
    expect(screen.getByText('2 remaining · 1 cancelled')).toBeVisible();
    expect(screen.getAllByText('Awaiting pickup')[0]).toHaveClass(
      'ui-status-warning',
    );
    expect(screen.getByRole('region', { name: 'Payment' })).toHaveTextContent(
      'Settled refund$8.00',
    );
    expect(screen.queryByText('Total paid')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Print receipt|Update order/i }),
    ).not.toBeInTheDocument();
  });

  it('preserves mixed-line restrictions, fulfillment confirmation and refreshed quantities', async () => {
    const service = setup();
    const cancel = vi.spyOn(service, 'cancelFulfillment');
    render(<Orders service={service} id="1401" />);
    fireEvent.click(await screen.findByText('Manage Synthetic A Variant 1'));
    expect(screen.getByText(/mixed fulfilled line/)).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'Review cancellation',
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel fulfillment' }));
    expect(cancel).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm change',
      }),
    );
    await waitFor(() => expect(cancel).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveValue(0));
    expect(screen.getByText('2 remaining · 3 cancelled')).toBeVisible();
    fireEvent.click(screen.getByText('Manage Synthetic A Variant 1'));
    fireEvent.change(screen.getByLabelText('Quantity to fulfill'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fulfill' }));
    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toHaveValue(20),
    );
    expect(screen.getByRole('region', { name: 'Payment' })).toHaveTextContent(
      'Settled refund$8.00',
    );
  });

  it('keeps read-only orders free of operational commands', async () => {
    render(
      <Orders
        service={setup(['ReadOwnVendorIdentity', 'ReadOwnOrders'])}
        id="1401"
      />,
    );
    await screen.findByRole('table', { name: 'Operational order lines' });
    expect(
      screen.queryByText('Manage Synthetic A Variant 1'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /fulfill|cancellation/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the existing POS refund controller in the new payment panel', async () => {
    render(<Orders service={await posSetup()} id="1401" />);
    await screen.findByRole('heading', { name: 'Order #MB-20481A9' });
    const items = screen.getByRole('region', { name: 'Order items' });
    expect(items).toHaveTextContent('Sourdough loaf');
    expect(items).toHaveTextContent('Merchandise before discounts$8.00');
    expect(items).toHaveTextContent('Total paid$8.66');
    expect(items).toHaveTextContent('Change due$1.34');
    const payment = screen.getByRole('region', { name: 'Payment' });
    expect(
      within(payment).getByRole('button', { name: 'Record Refund' }),
    ).toHaveClass('farmstand-button');
    fireEvent.click(
      within(payment).getByRole('button', { name: 'Refund Details' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Refund Details' }),
    ).toHaveTextContent('Total refunded');
    expect(
      screen.queryByText('Manage Synthetic A Variant 1'),
    ).not.toBeInTheDocument();
  });

  it('preserves operational detail when the payment read fails and allows retry', async () => {
    const service = await posSetup();
    service.pos!.orderPayment = vi
      .fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(sale);
    render(<Orders service={service} id="1401" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reload payment details' }),
    );
    expect(
      screen.getByRole('table', { name: 'Operational order lines' }),
    ).toBeVisible();
    await screen.findByRole('heading', { name: 'Order #MB-20481A9' });
    expect(service.pos!.orderPayment).toHaveBeenCalledTimes(2);
  });

  it('does not fetch POS finance without the finance permission', async () => {
    const service = await posSetup();
    service.context = { ...service.context, permissions: ['ReadOwnOrders'] };
    render(<Orders service={service} id="1401" />);
    await screen.findByRole('table', { name: 'Operational order lines' });
    expect(service.pos!.orderPayment).not.toHaveBeenCalled();
    expect(screen.queryByText('Total paid')).not.toBeInTheDocument();
  });
});
