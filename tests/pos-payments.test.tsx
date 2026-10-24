import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PosPaymentDialog,
  PosRefundDialog,
  PosSaleDetails,
  PosOrderPayment,
  PosRefundDetails,
  cashInput,
  parseCash,
} from '../apps/admin/src/vendor/pos-payments';
import {
  AppError,
  type InPersonApi,
  type PosDraft,
  type PosSale,
} from '@market/api';

const methods = {
  cash: true,
  simulated: true,
  scenarios: ['SUCCESS', 'DECLINE', 'TIMEOUT'],
};
const draft: PosDraft = {
  id: 'draft',
  version: 2,
  state: 'READY_FOR_PAYMENT',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  items: [],
  currency: 'USD',
  subtotal: 1700,
  discount: 0,
  tax: 175,
  total: 1875,
  customer: 'Anonymous customer',
  customerMode: 'ANONYMOUS',
  context: {
    kind: 'INDEPENDENT',
    label: 'Independent Sale',
    marketId: null,
    occurrenceId: null,
  },
  coupons: [],
  quote: {
    id: 'quote',
    version: 2,
    expiresAt: new Date(Date.now() + 120000).toISOString(),
    paymentAvailable: true,
  },
};
const sale: PosSale = {
  id: 'attempt',
  draftId: 'draft',
  orderId: '12',
  orderCode: 'SALE12',
  orderState: 'Delivered',
  state: 'COMPLETED',
  method: 'CASH',
  evidenceType: 'CASHIER_ATTESTED_CASH',
  vendor: 'Honey Farm',
  amount: 1875,
  currency: 'USD',
  tendered: 2000,
  changeDue: 125,
  confirmedAt: '2026-10-18T10:00:00Z',
  completedAt: '2026-10-18T10:00:01Z',
  context: draft.context,
  customer: 'Anonymous customer',
  invitationState: 'PENDING',
  items: [
    {
      id: 'line',
      variantId: '1',
      name: 'Honey',
      quantity: 2,
      unitPrice: 850,
      lineTotal: 1875,
      tax: [],
      discounts: [],
    },
  ],
  subtotal: 1700,
  discount: 0,
  tax: 175,
  units: [
    { id: '1', lineId: 'line', amount: 938, reserved: false },
    { id: '2', lineId: 'line', amount: 937, reserved: false },
  ],
  refunds: [],
};
function api() {
  return {
    pay: vi.fn(async () => sale),
    payment: vi.fn(async () => sale),
    reconcile: vi.fn(async () => sale),
    refund: vi.fn(async () => sale),
  } as unknown as InPersonApi;
}
function panel(client = api(), value: PosSale | null = null) {
  const onSale = vi.fn(),
    onNewSale = vi.fn(),
    onClose = vi.fn();
  render(
    <PosPaymentDialog
      api={client}
      draft={draft}
      methods={methods}
      sale={value}
      onSale={onSale}
      onNewSale={onNewSale}
      onClose={onClose}
    />,
  );
  return { client, onSale, onNewSale, onClose };
}
describe('cash currency parsing', () => {
  it('uses the existing exact currency parser for zero- and three-decimal currencies', () => {
    expect(parseCash('1875', 'JPY')).toBe(1875);
    expect(parseCash('1.234', 'KWD')).toBe(1234);
    expect(parseCash('1.1', 'JPY')).toBeNull();
    expect(cashInput(1, 'JPY')).toBe('1');
    expect(cashInput(1, 'KWD')).toBe('0.001');
  });
  it('uses integer minor units for exact amount and change', () => {
    expect(parseCash('18.75')).toBe(1875);
    expect(parseCash('20')).toBe(2000);
    expect(parseCash('0.01')).toBe(1);
    expect(cashInput(1875)).toBe('18.75');
    expect(cashInput(1)).toBe('0.01');
    expect(parseCash(cashInput(2147483647))).toBe(2147483647);
  });
  it.each(['-1', '1.001', '1e3', 'NaN', 'Infinity', ' 20', '', '21474836.48'])(
    'rejects invalid amount %s',
    (value) => expect(parseCash(value)).toBeNull(),
  );
});
describe('order refund details', () => {
  const event = (
    patch: Partial<PosSale['refunds'][number]> = {},
  ): PosSale['refunds'][number] => ({
    id: 'private-refund-event',
    amount: 866,
    state: 'SETTLED',
    reason: 'Returned jam',
    createdAt: '2026-10-21T17:00:00Z',
    details: {
      merchandise: 800,
      discount: 0,
      tax: 66,
      shipping: 0,
      total: 866,
      completedAt: '2026-10-21T17:01:00Z',
      products: [{ name: 'Jam', quantity: 1 }],
    },
    ...patch,
  });
  const order: PosSale = {
    ...sale,
    orderCode: 'ORDER65',
    subtotal: 2400,
    discount: 0,
    tax: 198,
    amount: 2598,
    canRecordRefund: true,
    units: [{ id: 'a', lineId: 'jam', amount: 866, reserved: false }],
    timezone: 'America/Chicago',
    refunds: [],
  };
  const display = (value: PosSale, canRefund = true) => {
    const client = api();
    client.orderPayment = vi.fn(async () => value);
    render(
      <PosOrderPayment
        api={client}
        orderId={value.orderId}
        canRefund={canRefund}
      />,
    );
    return client;
  };
  it('hides Refund Details without refund records and preserves permitted recording', async () => {
    display(order);
    expect(
      await screen.findByRole('button', { name: 'Record Refund' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Refund Details' }),
    ).not.toBeInTheDocument();
  });
  it('shows both actions for an eligible partial return and presents separate chronological events', async () => {
    const first = event(),
      second = event({
        id: 'private-second',
        createdAt: '2026-10-21T19:00:00Z',
        details: { ...event().details!, completedAt: '2026-10-21T19:01:00Z' },
      });
    const client = display({ ...order, refunds: [second, first] });
    const trigger = await screen.findByRole('button', {
      name: 'Refund Details',
    });
    expect(screen.getByRole('button', { name: 'Record Refund' })).toBeVisible();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Refund Details' });
    expect(
      within(dialog).getByRole('group', { name: 'Refund 1' }),
    ).toHaveTextContent('Jam × 1');
    expect(
      within(dialog).getByRole('group', { name: 'Refund 2' }),
    ).toHaveTextContent('Jam × 1');
    const times = dialog.querySelectorAll('time');
    expect(times[0]).toHaveAttribute(
      'datetime',
      new Date(first.details!.completedAt!).toISOString(),
    );
    expect(times[1]).toHaveAttribute(
      'datetime',
      new Date(second.details!.completedAt!).toISOString(),
    );
    const summary = within(dialog).getByLabelText('Refund summary');
    expect(summary).toHaveTextContent('$17.32');
    expect(summary).toHaveTextContent('$8.66');
    expect(summary).toHaveTextContent('Partially refunded');
    expect(dialog).not.toHaveTextContent('private-refund-event');
    expect(dialog).not.toHaveTextContent('SETTLED');
    expect(dialog.querySelector('pre')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Refund Details' }),
      ).not.toBeInTheDocument(),
    );
    expect(client.refund).not.toHaveBeenCalled();
  });
  it('hides Record Refund when completed amounts exhaust payment even with a stale badge and available-unit flag', async () => {
    const full = event({
      amount: 2165,
      details: {
        merchandise: 2000,
        discount: 0,
        tax: 165,
        shipping: 0,
        total: 2165,
        completedAt: '2026-10-21T17:01:00Z',
        products: [{ name: 'Gift Basket', quantity: 1 }],
      },
    });
    display({
      ...order,
      subtotal: 2000,
      tax: 165,
      amount: 2165,
      financialStatus: 'PAID',
      refunds: [full],
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Refund Details' }),
    );
    expect(
      screen.queryByRole('button', { name: 'Record Refund' }),
    ).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Refund Details' });
    expect(dialog).toHaveTextContent('Gift Basket × 1');
    expect(dialog).toHaveTextContent('$20.00');
    expect(dialog).toHaveTextContent('$1.65');
    expect(dialog).toHaveTextContent('$21.65');
    expect(dialog).toHaveTextContent('Fully refunded');
  });
  it.each([
    { canRefund: false, canRecordRefund: true, reserved: false },
    { canRefund: true, canRecordRefund: false, reserved: false },
    { canRefund: true, canRecordRefund: true, reserved: true },
  ])('preserves the current refund restriction %j', async (policy) => {
    display(
      {
        ...order,
        canRecordRefund: policy.canRecordRefund,
        units: [{ ...order.units[0]!, reserved: policy.reserved }],
        refunds: [event()],
      },
      policy.canRefund,
    );
    await screen.findByRole('button', { name: 'Refund Details' });
    expect(
      screen.queryByRole('button', { name: 'Record Refund' }),
    ).not.toBeInTheDocument();
  });
  it('keeps pending, failed and canceled requests distinct and excludes them from completed totals', () => {
    render(
      <PosRefundDetails
        sale={{
          ...order,
          refunds: [
            event(),
            event({ id: 'pending', state: 'PROVIDER_PENDING', details: null }),
            event({ id: 'failed', state: 'PROVIDER_FAILED', details: null }),
            event({ id: 'canceled', state: 'CANCELED', details: null }),
          ],
        }}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Refund Details' });
    expect(dialog).toHaveTextContent('Pending');
    expect(dialog).toHaveTextContent('Failed');
    expect(dialog).toHaveTextContent('Canceled');
    const summary = within(dialog).getByLabelText('Refund summary');
    expect(summary).toHaveTextContent('$8.66');
    expect(summary).toHaveTextContent('$17.32');
  });
  it('retains actual discounted payment and shows a neutral explanation when legacy item allocations are absent', () => {
    render(
      <PosRefundDetails
        sale={{
          ...order,
          subtotal: 3000,
          discount: 600,
          tax: 198,
          refunds: [event({ details: null })],
        }}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Refund Details' });
    expect(dialog).toHaveTextContent('Original discounts$6.00');
    expect(dialog).toHaveTextContent('Item and tax breakdown is unavailable');
    expect(within(dialog).getByLabelText('Refund summary')).toHaveTextContent(
      '$17.32',
    );
  });
});
describe('POS payment composition', () => {
  it('reconciles saved merchandise, discounts and tax without displaying tax in product amounts', () => {
    const discounted = {
      ...sale,
      subtotal: 2500,
      discount: 500,
      tax: 165,
      amount: 2165,
      items: [
        {
          ...sale.items[0]!,
          unitPrice: 1250,
          quantity: 2,
          lineTotal: 2165,
          lineTax: 165,
          lineDiscount: 500,
        },
      ],
    };
    const { container } = render(<PosSaleDetails sale={discounted} />);
    expect(container.querySelector('.pos-receipt-items')).toHaveTextContent(
      '$25.00',
    );
    expect(container.querySelector('.pos-receipt-items')).not.toHaveTextContent(
      '$21.65',
    );
    for (const [label, amount] of [
      ['Merchandise before discounts', '$25.00'],
      ['Discounts', '-$5.00'],
      ['Merchandise subtotal', '$20.00'],
      ['Sales tax collected', '$1.65'],
      ['Total paid', '$21.65'],
    ]) {
      expect(screen.getByText(label!).parentElement).toHaveTextContent(amount!);
    }
  });
  it('keeps the original refund status action available after a temporary error', async () => {
    const client = api();
    client.orderPayment = vi.fn(async () => ({
      ...sale,
      refunds: [
        {
          id: 'refund',
          amount: 938,
          state: 'PROVIDER_PENDING',
          reason: 'Original cash returned',
          createdAt: sale.confirmedAt,
        },
      ],
    }));
    client.retryRefund = vi
      .fn()
      .mockRejectedValueOnce(new AppError('network'))
      .mockResolvedValueOnce(sale);
    render(<PosOrderPayment api={client} orderId={sale.orderId} canRefund />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Check refund status' }),
    );
    await screen.findByText(
      'The connection was interrupted. Please try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Check refund status' }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check refund status' }),
    );
    await waitFor(() => expect(client.retryRefund).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByText('The connection was interrupted. Please try again.'),
      ).not.toBeInTheDocument(),
    );
  });
  it('requires enough tender and displays remaining due and exact change', () => {
    panel();
    const tender = screen.getByLabelText('Cash received (USD)'),
      confirm = screen.getByRole('button', { name: 'Confirm Cash Received' });
    expect(confirm).toBeDisabled();
    fireEvent.change(tender, { target: { value: '18.74' } });
    expect(screen.getByText('Remaining due: $0.01')).toBeVisible();
    expect(confirm).toBeDisabled();
    fireEvent.change(tender, { target: { value: '20' } });
    expect(screen.getByText('Change due: $1.25')).toBeVisible();
    expect(confirm).toBeEnabled();
  });
  it('provides Exact Amount and submits explicit cash receipt attestation', async () => {
    const { client, onSale } = panel();
    fireEvent.click(screen.getByRole('button', { name: 'Exact Amount' }));
    expect(screen.getByLabelText('Cash received (USD)')).toHaveValue('18.75');
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm Cash Received' }),
    );
    await waitFor(() => expect(onSale).toHaveBeenCalledWith(sale));
    expect(client.pay).toHaveBeenCalledWith(
      expect.objectContaining({
        tendered: 1875,
        confirmCashReceived: true,
        method: 'CASH',
        quoteId: 'quote',
        version: 2,
      }),
    );
  });
  it('locks duplicate confirmation while processing', async () => {
    const client = api();
    let resolve!: (sale: PosSale) => void;
    vi.mocked(client.pay).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    panel(client);
    fireEvent.click(screen.getByRole('button', { name: 'Exact Amount' }));
    const button = screen.getByRole('button', {
      name: 'Confirm Cash Received',
    });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(client.pay).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    resolve(sale);
    await waitFor(() => expect(button).toBeEnabled());
  });
  it('checks the original attempt after lost response without issuing another charge', async () => {
    const client = api();
    vi.mocked(client.pay).mockRejectedValueOnce(new AppError('network'));
    panel(client);
    fireEvent.click(screen.getByRole('button', { name: 'Exact Amount' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm Cash Received' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Check Payment Status' }),
    );
    await waitFor(() =>
      expect(client.reconcile).toHaveBeenCalledWith('attempt'),
    );
    expect(client.pay).toHaveBeenCalledTimes(1);
  });
  it('keeps uncertain payment recovery visible without success receipt or New Sale', async () => {
    const { client } = panel(api(), {
      ...sale,
      state: 'UNCERTAIN',
      completedAt: null,
      orderState: 'ArrangingPayment',
    });
    expect(screen.queryByText('Total paid')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'New Sale' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check Payment Status' }),
    );
    await waitFor(() => expect(client.reconcile).toHaveBeenCalledWith(sale.id));
  });
  it('offers simulator outcomes only when backend advertises them', () => {
    panel();
    fireEvent.change(screen.getByLabelText('Payment method'), {
      target: { value: 'SIMULATED' },
    });
    expect(screen.getByLabelText('Simulated terminal outcome')).toBeVisible();
    expect(screen.getByText(/No card is charged/)).toBeVisible();
  });
  it('keeps a completed receipt and order link visible until cashier starts another sale', () => {
    panel(api(), sale);
    expect(screen.getByText('Total paid')).toBeVisible();
    expect(screen.getByText('Cash received')).toBeVisible();
    expect(screen.getByText('Change due')).toBeVisible();
    expect(screen.getByRole('button', { name: 'New Sale' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'View Order' })).toHaveAttribute(
      'href',
      expect.stringContaining('/vendor/orders/12'),
    );
  });
  it('presents immutable original receipt products and recorded refunds', () => {
    render(
      <PosSaleDetails
        sale={{
          ...sale,
          refunds: [
            {
              id: '1',
              amount: 938,
              state: 'SETTLED',
              reason: 'One item returned',
              createdAt: sale.confirmedAt,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('2 × Honey')).toBeVisible();
    expect(screen.getByLabelText('Refund history')).toHaveTextContent(
      'One item returned',
    );
  });
  it('requires selected original units, reason and physical cash-return confirmation', async () => {
    const client = api(),
      onSale = vi.fn();
    render(
      <PosRefundDialog
        api={client}
        sale={sale}
        onClose={vi.fn()}
        onSale={onSale}
      />,
    );
    const submit = screen.getByRole('button', {
      name: 'Confirm Cash Returned',
    });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Honey, unit 1 · $9.38'));
    fireEvent.change(screen.getByLabelText('Refund reason'), {
      target: { value: 'Customer returned one jar' },
    });
    expect(submit).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText('I have returned this cash to the customer.'),
    );
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(client.refund).toHaveBeenCalledWith(
        'attempt',
        expect.objectContaining({
          unitIds: ['1'],
          reason: 'Customer returned one jar',
          cashReturned: true,
        }),
      ),
    );
  });
});
