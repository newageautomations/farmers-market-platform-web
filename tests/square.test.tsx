import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  PosInputError,
  type InPersonApi,
  type SquareIntegration,
  type PosSale,
  type PosDraft,
} from '@market/api';
import {
  SquarePaymentIntegration,
  squareMobileReturn,
} from '../apps/admin/src/vendor/square';
import {
  PosPaymentDialog,
  PosRefundDialog,
  PosSaleDetails,
} from '../apps/admin/src/vendor/pos-payments';
import { routeAllowed, type AdminContext } from '@market/admin-core';

function fixture() {
  const data: SquareIntegration = {
    configured: true,
    environment: 'Sandbox',
    qualification: 'FIXTURE',
    oauthAvailable: true,
    sandboxImportAvailable: true,
    connection: {
      id: 'connection',
      merchantId: 'merchant',
      merchant: 'Fixture only merchant',
      status: 'CONNECTED',
      locationId: 'location',
      location: 'Honey counter',
      currency: 'USD',
    },
    locations: [
      {
        id: 'location',
        name: 'Honey counter',
        currency: 'USD',
        status: 'ACTIVE',
        eligible: true,
      },
      {
        id: 'other',
        name: 'Other location',
        currency: 'USD',
        status: 'ACTIVE',
        eligible: true,
      },
    ],
    devices: [
      {
        id: 'terminal',
        label: 'Virtual counter',
        locationId: 'location',
        providerId: 'testdevice',
        kind: 'VIRTUAL',
        status: 'VIRTUAL',
        code: null,
        pairBy: null,
        isDefault: true,
        availability: 'Not independently verified',
      },
    ],
    virtualDevices: [{ id: 'virtual', label: 'Sandbox card success' }],
  };
  const square = {
    settings: vi.fn(async () => data),
    begin: vi.fn(),
    complete: vi.fn(async () => data),
    importSandbox: vi.fn(async () => data),
    disconnect: vi.fn(async () => ({ ...data, connection: null })),
    location: vi.fn(async () => data),
    addTerminal: vi.fn(async () => data),
    terminal: vi.fn(async () => data),
  };
  const api = {
    square,
    pay: vi.fn(),
    reconcile: vi.fn(),
    refund: vi.fn(),
    payment: vi.fn(),
    cancelSquare: vi.fn(),
    squareMobileCallback: vi.fn(),
  } as unknown as InPersonApi;
  return { data, square, api };
}
const sale: PosSale = {
  id: 'sale',
  draftId: 'draft',
  orderId: '1',
  orderCode: 'ABC',
  orderState: 'Delivered',
  state: 'COMPLETED',
  method: 'SQUARE_TERMINAL',
  evidenceType: 'SQUARE_SDK_FIXTURE',
  vendor: 'Honey',
  amount: 541,
  currency: 'USD',
  tendered: null,
  changeDue: null,
  confirmedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  context: {
    kind: 'INDEPENDENT',
    label: 'Independent',
    marketId: null,
    occurrenceId: null,
  },
  customer: 'Anonymous',
  invitationState: 'PENDING',
  items: [
    {
      id: 'line',
      variantId: 'variant',
      name: 'Candle',
      quantity: 1,
      unitPrice: 500,
      lineTotal: 541,
      tax: [],
      discounts: [],
    },
  ],
  subtotal: 500,
  tax: 41,
  discount: 0,
  units: [{ id: 'unit', lineId: 'line', amount: 541, reserved: false }],
  refunds: [],
  square: {
    environment: 'Sandbox',
    merchantId: 'merchant',
    locationId: 'location',
    checkoutId: 'checkout',
    paymentId: 'payment',
    status: 'COMPLETED',
    deviceLabel: 'Counter',
  },
};
const draft: PosDraft = {
  id: 'draft',
  version: 1,
  state: 'READY_FOR_PAYMENT',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  items: sale.items,
  currency: 'USD',
  subtotal: 500,
  discount: 0,
  tax: 41,
  total: 541,
  customer: 'Anonymous',
  customerMode: 'ANONYMOUS',
  context: sale.context,
  coupons: [],
  quote: {
    id: 'quote',
    version: 1,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    paymentAvailable: true,
  },
};

describe('Square integration composition', () => {
  it('uses shared settings controls, truthful fixture labels and no extra section headings', async () => {
    const { api } = fixture();
    const { container } = render(<SquarePaymentIntegration api={api} />);
    expect(
      await screen.findByText(/Controlled SDK fixture only/),
    ).toBeVisible();
    expect(screen.getByLabelText('Default payment location')).toHaveValue(
      'location',
    );
    expect(screen.getByText('Virtual counter (default)')).toBeVisible();
    expect(container.querySelectorAll('.ui-card').length).toBe(3);
    expect(container.querySelector('h1,h2,h3')).toBeNull();
    expect(screen.queryByText(/access.token|refresh.token/i)).toBeNull();
  });
  it('saves only the selected location ID and preserves server authority', async () => {
    const { api, square } = fixture();
    render(<SquarePaymentIntegration api={api} />);
    const input = await screen.findByLabelText('Default payment location');
    fireEvent.change(input, { target: { value: 'other' } });
    await userEvent.click(
      screen.getByRole('button', { name: 'Save payment location' }),
    );
    await waitFor(() => expect(square.location).toHaveBeenCalledWith('other'));
  });
  it('adds virtual devices with stable request key, label and provider allowlist value', async () => {
    const { api, square } = fixture();
    render(<SquarePaymentIntegration api={api} />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Add Sandbox virtual terminal',
      }),
    );
    await userEvent.type(
      screen.getByLabelText('Terminal label'),
      'Virtual fixture',
    );
    expect(screen.getByRole('dialog')).toHaveClass('pos-payment-dialog');
    await userEvent.click(screen.getByRole('button', { name: 'Add terminal' }));
    await waitFor(() =>
      expect(square.addTerminal).toHaveBeenCalledWith({
        key: expect.any(String),
        label: 'Virtual fixture',
        virtualId: 'virtual',
      }),
    );
  });
  it('requires a concrete disconnect confirmation and displays the backend restriction', async () => {
    const { api, square } = fixture();
    square.disconnect.mockRejectedValueOnce(
      new PosInputError('Resolve original Square payments first'),
    );
    render(<SquarePaymentIntegration api={api} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Disconnect Square' }),
    );
    expect(square.disconnect).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      dialog.querySelector('button.ui-button-destructive') ??
        screen.getAllByRole('button', { name: 'Disconnect Square' })[1]!,
    );
    expect(
      await screen.findAllByText('Resolve original Square payments first'),
    ).not.toHaveLength(0);
  });
  it('consumes and removes transient OAuth callback data before completing on the server', async () => {
    const { api, square } = fixture();
    window.history.replaceState(
      null,
      '',
      '/vendor/settings/payments?state=opaque&code=one-use',
    );
    render(<SquarePaymentIntegration api={api} />);
    await waitFor(() =>
      expect(square.complete).toHaveBeenCalledWith('opaque', 'one-use'),
    );
    expect(window.location.search).toBe('');
    expect(square.settings).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '/');
  });
  it('shows a clear unconfigured state while retaining existing checkout navigation', async () => {
    const { api, square, data } = fixture();
    square.settings.mockResolvedValueOnce({
      ...data,
      configured: false,
      connection: null,
    });
    render(<SquarePaymentIntegration api={api} />);
    expect(
      await screen.findByText(/Square needs backend configuration/),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Open In-Person Checkout' }),
    ).toHaveAttribute('href', '/vendor/pos');
  });
});
describe('Square payment and refund UI', () => {
  it('submits terminal identity without arbitrary amount or success evidence', async () => {
    const { api, data } = fixture();
    vi.mocked(api.pay).mockResolvedValue({ ...sale, state: 'UNCERTAIN' });
    render(
      <PosPaymentDialog
        api={api}
        draft={draft}
        methods={{
          cash: true,
          simulated: false,
          scenarios: [],
          square: {
            environment: 'Sandbox',
            qualification: 'FIXTURE',
            merchant: 'Fixture',
            location: 'Counter',
            devices: data.devices,
            mobile: false,
          },
        }}
        sale={null}
        onSale={vi.fn()}
        onClose={vi.fn()}
        onNewSale={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Payment method'), {
      target: { value: 'SQUARE_TERMINAL' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Send to Square Terminal' }),
    );
    expect(api.pay).toHaveBeenCalledWith({
      draftId: 'draft',
      version: 1,
      quoteId: 'quote',
      key: expect.any(String),
      method: 'SQUARE_TERMINAL',
      deviceId: 'terminal',
    });
  });
  it('routes pending cancellation through the existing payment operation', async () => {
    const { api } = fixture();
    vi.mocked(api.cancelSquare).mockResolvedValue({
      ...sale,
      state: 'CANCELLED',
    });
    render(
      <PosPaymentDialog
        api={api}
        draft={null}
        methods={{ cash: true, simulated: false, scenarios: [] }}
        sale={{ ...sale, state: 'UNCERTAIN' }}
        onSale={vi.fn()}
        onClose={vi.fn()}
        onNewSale={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Request terminal cancellation' }),
    );
    expect(api.cancelSquare).toHaveBeenCalledWith('sale');
    expect(api.pay).not.toHaveBeenCalled();
  });
  it('requests original-unit refunds without cash or simulated confirmation', async () => {
    const { api } = fixture();
    vi.mocked(api.refund).mockResolvedValue(sale);
    render(
      <PosRefundDialog
        api={api}
        sale={sale}
        onClose={vi.fn()}
        onSale={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(
      screen.getByLabelText('Refund reason'),
      'Customer return',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Request Square refund' }),
    );
    expect(api.refund).toHaveBeenCalledWith('sale', {
      key: expect.any(String),
      unitIds: ['unit'],
      reason: 'Customer return',
    });
    expect(screen.queryByLabelText('Simulated refund outcome')).toBeNull();
  });
  it('retains actual provider references on the completed receipt', () => {
    render(<PosSaleDetails sale={sale} />);
    expect(
      screen.getByText(/Square location location.*Payment payment/),
    ).toBeVisible();
    expect(screen.queryByText('Simulated Terminal - Test Only')).toBeNull();
  });
});
describe('mobile callback and route boundaries', () => {
  it('extracts correlation IDs from documented Android/iOS returns without accepting status proof', () => {
    expect(
      squareMobileReturn(
        '?com.squareup.pos.REQUEST_METADATA=state&com.squareup.pos.SERVER_TRANSACTION_ID=txn',
      ),
    ).toEqual({ state: 'state', transactionId: 'txn' });
    expect(
      squareMobileReturn(
        '?data=' +
          encodeURIComponent(
            JSON.stringify({
              state: 'state',
              transaction_id: 'txn',
              status: 'ok',
            }),
          ),
      ),
    ).toEqual({ state: 'state', transactionId: 'txn' });
    expect(
      squareMobileReturn(
        '?data=' +
          encodeURIComponent(
            JSON.stringify({ state: 'state', error_code: 'payment_canceled' }),
          ),
      ),
    ).toEqual({ state: 'state', transactionId: undefined });
    expect(() =>
      squareMobileReturn('?status=success&paymentId=forged'),
    ).toThrow();
    expect(() => squareMobileReturn('?data=invalid')).toThrow();
  });
  it('requires owner integration permission while cashier mobile return retains checkout authority', () => {
    const context = {
      scope: 'VENDOR',
      membershipRole: 'owner',
      permissions: [
        'ReadOwnVendorIdentity',
        'ManageOwnPosIntegrations',
        'OperateOwnPos',
      ],
    } as unknown as AdminContext;
    expect(routeAllowed(context, '/vendor/settings/payments')).toBe(true);
    expect(
      routeAllowed(
        { ...context, membershipRole: 'staff' },
        '/vendor/settings/payments',
      ),
    ).toBe(false);
    expect(
      routeAllowed(
        { ...context, membershipRole: 'staff' },
        '/vendor/pos/square-return',
      ),
    ).toBe(true);
    expect(
      routeAllowed(
        { ...context, permissions: [] },
        '/vendor/pos/square-return',
      ),
    ).toBe(false);
  });
});
