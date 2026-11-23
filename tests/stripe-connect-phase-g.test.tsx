import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  BoothInvoiceApi,
  BoothInvoiceDetail,
  BoothInvoicePayment as Payment,
} from '@market/api';
import { createBoothInvoiceApi, type VendorBoothAssignment } from '@market/api';
import { boothFeeUrgencies } from '../apps/admin/src/vendor/dashboard-data';
import { BoothInvoicePayment } from '../apps/admin/src/vendor/BoothInvoicePayment';
import { Invoice } from '../apps/admin/src/market/phase14/Billing';
import { VendorBooths } from '../apps/admin/src/vendor/booths';
import type { VendorService } from '../apps/admin/src/vendor/service';
import type {
  StripePaymentClient,
  StripePaymentElement,
  StripePaymentElements,
} from '@market/ui/stripe-card';

const quote = {
  base: 6000,
  eligible: 6000,
  platform: 300,
  recovery: 220,
  fee: 520,
  feeTax: 0,
  gross: 6520,
  currency: 'USD',
  policy: 'booth-invoice-sandbox-5pct-v1',
};
const payment = (state: Payment['state'] = 'PREPARED'): Payment => ({
  id: 'g1',
  invoiceId: 17,
  state,
  active: !['COMPLETED', 'CANCELED'].includes(state),
  quote,
  reviewCode: null,
  account: 'acct_market',
  publishableKey: 'pk_test_fixture',
  consentPolicy: 'booth-invoice-card-once-v1',
});
const detail = (): BoothInvoiceDetail => ({
  marketName: 'Phase G Market',
  eligible: true,
  paymentQuote: quote,
  unavailable: '',
  invoice: {
    id: 17,
    marketId: 2,
    revision: 1,
    assignmentId: 4,
    occurrenceId: 5,
    directoryId: 6,
    status: 'OPEN',
    totalMinor: 10000,
    paidMinor: 4000,
    currency: 'USD',
    dueAt: '2027-02-12T23:59:00Z',
    lines: [
      {
        description: 'Booth G partial',
        quantity: 1,
        unitMinor: 10000,
        lineMinor: 10000,
        currency: 'USD',
      },
    ],
    recipientSnapshot: {
      businessName: 'Orchard',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      description: '',
      category: '',
    },
  },
  payments: [
    {
      id: 'offline',
      amountMinor: 4000,
      currency: 'USD',
      method: 'CASH',
      paidAt: '2026-11-10T15:00:00Z',
    },
  ],
  collections: [],
});
function setup(initialOpen = false, invoiceDetail = detail()) {
  let change: (v: { complete: boolean }) => void = () => {};
  const card: StripePaymentElement = {
    mount: vi.fn(),
    destroy: vi.fn(),
    on: (_e, cb) => {
      change = cb;
    },
  };
  const form = { create: vi.fn<StripePaymentElements['create']>(() => card) };
  const client: StripePaymentClient = {
    elements: vi.fn(() => form),
    confirmSetup: vi.fn(async () => ({})),
    handleNextAction: vi.fn(async () => ({})),
    confirmPayment: vi.fn(async () => ({})),
  };
  const factory = vi.fn(() => client),
    loader = vi.fn(async () => factory),
    onUpdated = vi.fn();
  const api: BoothInvoiceApi = {
    detail: vi.fn(async () => invoiceDetail),
    prepare: vi.fn(async () => payment()),
    act: vi.fn(async (_id, action) =>
      action === 'CONFIRM'
        ? { ...payment('CARD_REQUIRED'), clientSecret: 'pi_g_secret_fixture' }
        : payment('COMPLETED'),
    ),
  };
  render(
    <BoothInvoicePayment
      api={api}
      invoiceId={17}
      onUpdated={onUpdated}
      loadSdk={loader}
      initialOpen={initialOpen}
    />,
  );
  const user = userEvent.setup();
  const open = async () => {
    await user.click(screen.getByRole('button', { name: 'View invoice 17' }));
    await screen.findByRole('button', { name: 'Pay Invoice' });
  };
  const checkout = async () => {
    await open();
    await user.click(screen.getByRole('button', { name: 'Pay Invoice' }));
    await waitFor(() => expect(card.mount).toHaveBeenCalled());
    act(() => change({ complete: true }));
  };
  return {
    api,
    client,
    form,
    card,
    factory,
    loader,
    onUpdated,
    user,
    open,
    checkout,
  };
}
describe('Booth invoice online checkout', () => {
  it.each(['OPEN', 'PAST_DUE'] as const)(
    'opens the exact %s invoice from a dashboard booth-fee link without starting payment',
    async (status) => {
      const assignment = {
        occurrenceId: 5,
        startsAt: '2027-02-14T15:00:00Z',
        space: { label: 'G1', widthFeet: 10, depthFeet: 10, amenities: [] },
        elementId: 'g1',
        map: null,
        rentals: [],
        publicInstructions: '',
        invoices: [
          { ...detail().invoice, id: 16, status: 'PAID', paidMinor: 10000 },
          { ...detail().invoice, status },
        ],
      } as VendorBoothAssignment;
      const href = boothFeeUrgencies(new Map([['5', assignment]]), [])[0]!.href;
      const api: BoothInvoiceApi = {
        detail: vi.fn(async () => detail()),
        prepare: vi.fn(async () => payment()),
        act: vi.fn(async () => payment()),
      };
      window.history.replaceState(null, '', href);
      try {
        render(
          <VendorBooths
            service={
              {
                vendorId: 'linked-vendor',
                boothAssignments: async () => [assignment],
                boothInvoices: api,
              } as unknown as VendorService
            }
          />,
        );
        expect(
          await screen.findByRole('button', { name: 'Pay Invoice' }),
        ).toBeEnabled();
        expect(screen.getByText('Booth G partial')).toBeInTheDocument();
        expect(api.detail).toHaveBeenCalledWith(17);
        expect(api.detail).not.toHaveBeenCalledWith(16);
        expect(api.prepare).not.toHaveBeenCalled();
        expect(api.act).not.toHaveBeenCalled();
      } finally {
        window.history.replaceState(null, '', '/');
      }
    },
  );
  it('marks a cancelled booth and invoice clearly and keeps its invoice read only', async () => {
    const api: BoothInvoiceApi = {
      detail: vi.fn(async () => detail()),
      prepare: vi.fn(async () => payment()),
      act: vi.fn(async () => payment()),
    };
    render(
      <VendorBooths
        service={
          {
            vendorId: 'cancelled-vendor',
            boothInvoices: api,
            boothAssignments: async () => [
              {
                occurrenceId: 5,
                occurrenceStatus: 'cancelled',
                startsAt: '2027-02-14T15:00:00Z',
                space: {
                  label: 'G1',
                  widthFeet: 10,
                  depthFeet: 10,
                  amenities: [],
                },
                elementId: 'g1',
                map: null,
                rentals: [],
                publicInstructions: '',
                invoices: [
                  {
                    id: 17,
                    status: 'OPEN',
                    currency: 'USD',
                    totalMinor: 10000,
                    paidMinor: 4000,
                  },
                ],
              },
            ],
          } as unknown as VendorService
        }
      />,
    );
    // The list opens on booths awaiting payment; a cancelled date has none
    // due, so there is no payment notice either.
    expect(
      await screen.findByRole('heading', {
        name: 'No booths awaiting payment',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/in booth fees/)).not.toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText('Payment status'),
      'cancelled',
    );
    expect(await screen.findByText('No payment due')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /G1/ });
    expect(within(row).getByText('Cancelled')).toBeInTheDocument();
    const details = screen.getByRole('region', { name: 'Booth details' });
    expect(within(details).getByText('Cancelled')).toBeInTheDocument();
    expect(
      within(details).getByText(/The market cancelled this date/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'View invoice 17' }),
    );
    await screen.findByText('Booth G partial');
    expect(
      screen.queryByRole('button', {
        name: /Pay invoice/i,
      }),
    ).not.toBeInTheDocument();
    expect(api.prepare).not.toHaveBeenCalled();
  });
  it('shows cancellation history without resuming a prepared payment or showing any pay button', async () => {
    const f = setup();
    vi.mocked(f.api.detail).mockResolvedValue({
      ...detail(),
      occurrenceStatus: 'cancelled',
      collections: [payment()],
    });
    await f.user.click(screen.getByRole('button', { name: 'View invoice 17' }));
    expect(
      await screen.findByText(/The market cancelled this date/),
    ).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Pay invoice/i,
      }),
    ).not.toBeInTheDocument();
    expect(f.api.prepare).not.toHaveBeenCalled();
    expect(f.loader).not.toHaveBeenCalled();
    expect(screen.getByText('Booth G partial')).toBeInTheDocument();
  });

  it('hides payment for cancelled and pending cancellation invoices even if eligibility is stale', async () => {
    const f = setup();
    vi.mocked(f.api.detail).mockResolvedValue({
      ...detail(),
      invoice: { ...detail().invoice, status: 'CANCEL_PENDING' },
      collections: [payment()],
    });
    await f.user.click(screen.getByRole('button', { name: 'View invoice 17' }));
    await screen.findByText('Booth G partial');
    expect(
      screen.queryByRole('button', {
        name: /Pay invoice/i,
      }),
    ).not.toBeInTheDocument();
    expect(f.api.prepare).not.toHaveBeenCalled();
  });
  it('keeps verified completion open while the parent reloads the paid invoice balance', async () => {
    let changed: (v: { complete: boolean }) => void = () => {},
      completed = false;
    const card: StripePaymentElement = {
      mount: vi.fn(),
      destroy: vi.fn(),
      on: (_e, cb) => {
        changed = cb;
      },
    };
    const client: StripePaymentClient = {
      elements: () => ({ create: () => card }),
      confirmSetup: async () => ({}),
      handleNextAction: async () => ({}),
      confirmPayment: async () => ({}),
    };
    Object.assign(window, { Stripe: () => client });
    const api: BoothInvoiceApi = {
      detail: async () => ({
        ...detail(),
        invoice: {
          ...detail().invoice,
          status: completed ? 'PAID' : 'OPEN',
          paidMinor: completed ? 10000 : 4000,
        },
      }),
      prepare: async () => payment(),
      act: async (_id, action) => {
        if (action === 'CONFIRM')
          return {
            ...payment('CARD_REQUIRED'),
            clientSecret: 'pi_g_secret_fixture',
          };
        completed = true;
        return payment('COMPLETED');
      },
    };
    const assignments = vi.fn(async () => [
      {
        occurrenceId: 5,
        startsAt: '2027-02-13T15:00:00Z',
        elementId: 'g-partial',
        space: {
          label: 'G partial',
          widthFeet: 10,
          depthFeet: 10,
          amenities: [],
        },
        publicInstructions: '',
        rentals: [],
        map: null,
        invoices: [
          {
            id: 17,
            status: completed ? 'PAID' : 'OPEN',
            paidMinor: completed ? 10000 : 4000,
            totalMinor: 10000,
            currency: 'USD',
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    render(
      <VendorBooths
        service={
          {
            vendorId: 'orchard',
            boothAssignments: assignments,
            boothInvoices: api,
          } as unknown as VendorService
        }
      />,
    );
    // The booth is awaiting payment, so the payment notice leads the page and
    // its Pay invoice button opens that booth's invoice.
    const notice = await screen.findByRole('status', {
      name: '$60.00 in booth fees awaiting payment',
    });
    expect(notice).toHaveTextContent('For booth G partial');
    expect(
      screen.getByRole('button', { name: 'Pay invoice 17' }),
    ).toBeInTheDocument();
    await user.click(
      within(notice).getByRole('button', { name: 'Pay invoice' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Pay Invoice' }),
    );
    await waitFor(() => expect(card.mount).toHaveBeenCalled());
    act(() => changed({ complete: true }));
    await user.click(
      screen.getByRole('button', { name: 'Pay invoice $65.20' }),
    );
    expect(
      await screen.findByText(
        'Payment verified and recorded. Your invoice is paid.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(assignments).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Invoice balance')).toHaveTextContent(
      'Total due$0.00',
    );
    expect(
      screen.getByText('Payment verified and recorded. Your invoice is paid.'),
    ).toBeInTheDocument();
    // Paid now, the notice goes and the booth leaves the Awaiting payment
    // list, but it stays selected.
    expect(
      screen.queryByText(/in booth fees awaiting payment/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No booths awaiting payment' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Booth G partial' }),
    ).toBeInTheDocument();
    delete (window as Window & { Stripe?: unknown }).Stripe;
  });
  it('shows authoritative invoice details and offline history before explicit payment', async () => {
    const f = setup();
    await f.open();
    expect(screen.getByText(/Phase G Market/)).toBeInTheDocument();
    expect(screen.getByLabelText('Invoice balance')).toHaveTextContent(
      'Total due$65.20',
    );
    // The offline payment is an invoice line that the total due accounts for.
    const lines = screen.getByRole('table');
    expect(lines).toHaveTextContent(/Booth G partial.*\$100.00/);
    expect(lines).toHaveTextContent(/Payment · Cash.*−\$40.00/);
    expect(lines).toHaveTextContent(/Total due\$65.20/);
    expect(
      screen.getByRole('list', { name: 'Invoice history, newest first' }),
    ).toHaveTextContent(/Payment received · Cash.*\$40.00/);
    expect(f.api.prepare).not.toHaveBeenCalled();
    expect(f.client.confirmPayment).not.toHaveBeenCalled();
    expect(lines).toHaveTextContent('Online processing fee$5.20');
    expect(lines).not.toHaveTextContent(/platform|recovery/i);
    const charges = screen.getByRole('region', { name: 'Charges' });
    expect(
      within(charges).getByRole('button', { name: 'Pay Invoice' }),
    ).toBeEnabled();
    expect(charges.parentElement?.lastElementChild).toHaveClass(
      'booth-invoice-history',
    );
  });
  it('freezes fees and initializes an account-scoped Payment Element with wallets enabled', async () => {
    const f = setup();
    await f.checkout();
    expect(f.api.prepare).toHaveBeenCalledWith(17);
    expect(f.factory).toHaveBeenCalledWith('pk_test_fixture', {
      stripeAccount: 'acct_market',
    });
    expect(f.client.elements).toHaveBeenCalledWith({
      clientSecret: 'pi_g_secret_fixture',
    });
    expect(f.form.create).toHaveBeenCalledWith('payment', expect.any(Object));
    expect(f.form.create.mock.calls[0]?.[1]).not.toHaveProperty('wallets');
    expect(
      screen.queryByRole('button', { name: 'Cancel online payment' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pay invoice $65.20' }),
    ).toBeEnabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /load stripe|prepare payment quote|load service fee|refresh payment amount|initialize stripe|test provider/i,
      }),
    ).not.toBeInTheDocument();
  });
  it('confirms explicitly and announces success only after verified native settlement', async () => {
    const f = setup();
    await f.checkout();
    await f.user.click(
      screen.getByRole('button', { name: 'Pay invoice $65.20' }),
    );
    expect(f.api.act).toHaveBeenCalledWith(
      17,
      'CONFIRM',
      'booth-invoice-card-once-v1',
    );
    expect(f.client.confirmPayment).toHaveBeenCalledWith({
      elements: f.form,
      redirect: 'if_required',
      confirmParams: {
        return_url: new URL(
          '/vendor/booths?occurrence=5&invoice=17&invoice-payment-return=g1',
          window.location.origin,
        ).href,
        payment_method_data: { billing_details: {} },
      },
    });
    expect(
      await screen.findByText(
        'Payment verified and recorded. Your invoice is paid.',
      ),
    ).toBeInTheDocument();
    expect(f.onUpdated).toHaveBeenCalledOnce();
  });
  it('asks for another review if the amount changes before payment is prepared', async () => {
    const f = setup();
    const changed = {
      ...payment(),
      quote: {
        ...quote,
        base: 5000,
        platform: 250,
        recovery: 188,
        fee: 438,
        gross: 5438,
      },
    };
    vi.mocked(f.api.prepare).mockResolvedValue(changed);
    await f.open();
    await f.user.click(screen.getByRole('button', { name: 'Pay Invoice' }));
    expect(
      await within(screen.getByRole('table')).findByText('$54.38'),
    ).toBeInTheDocument();
    expect(screen.getByText(/The payment total changed/)).toBeInTheDocument();
    expect(f.api.act).not.toHaveBeenCalled();
    expect(f.loader).not.toHaveBeenCalled();
    await f.user.click(screen.getByRole('button', { name: 'Pay Invoice' }));
    expect(f.api.act).toHaveBeenCalledWith(
      17,
      'CONFIRM',
      changed.consentPolicy,
    );
  });
  it('checks the original payment on a redirect return without preparing another charge', async () => {
    const returned = { ...payment('COMPLETED'), id: 42 };
    window.history.replaceState(
      null,
      '',
      '/vendor/booths?occurrence=5&invoice=17&invoice-payment-return=42',
    );
    try {
      const invoiceDetail = detail();
      invoiceDetail.invoice = {
        ...invoiceDetail.invoice,
        paidMinor: 10000,
        status: 'PAID',
      };
      invoiceDetail.eligible = false;
      invoiceDetail.paymentQuote = null;
      invoiceDetail.collections = [returned];
      const f = setup(true, invoiceDetail);
      vi.mocked(f.api.act).mockResolvedValue(returned);
      expect(
        await screen.findByRole('heading', { name: 'Payment received' }),
      ).toBeInTheDocument();
      expect(f.api.act).toHaveBeenCalledExactlyOnceWith(17, 'STATUS');
      expect(f.api.prepare).not.toHaveBeenCalled();
      expect(f.client.confirmPayment).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
  it('does not announce success from a Stripe callback while backend is pending', async () => {
    const f = setup();
    vi.mocked(f.api.act).mockImplementation(async (_id, action) =>
      action === 'CONFIRM'
        ? { ...payment('CARD_REQUIRED'), clientSecret: 'pi_g_secret_fixture' }
        : payment('PROCESSING'),
    );
    await f.checkout();
    await f.user.click(
      screen.getByRole('button', { name: 'Pay invoice $65.20' }),
    );
    expect(
      await screen.findByText(/Your payment is processing/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Payment verified and recorded/),
    ).not.toBeInTheDocument();
    expect(f.onUpdated).not.toHaveBeenCalled();
  });
  it('retains an accurate failure state for decline or interrupted authentication', async () => {
    const f = setup();
    vi.mocked(f.client.confirmPayment!).mockResolvedValue({
      error: { type: 'card_error' },
    });
    vi.mocked(f.api.act).mockImplementation(async (_id, action) =>
      action === 'CONFIRM'
        ? { ...payment('CARD_REQUIRED'), clientSecret: 'pi_g_secret_fixture' }
        : payment('CARD_REQUIRED'),
    );
    await f.checkout();
    await f.user.click(
      screen.getByRole('button', { name: 'Pay invoice $65.20' }),
    );
    expect(
      await screen.findByText(/Your payment was not completed/),
    ).toBeInTheDocument();
    expect(f.onUpdated).not.toHaveBeenCalled();
  });
  it('blocks duplicate submission while provider authorization is unresolved', async () => {
    const f = setup();
    let resolve!: () => void;
    vi.mocked(f.client.confirmPayment!).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = () => r({});
        }),
    );
    await f.checkout();
    await f.user.dblClick(
      screen.getByRole('button', { name: 'Pay invoice $65.20' }),
    );
    expect(f.client.confirmPayment).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: 'Processing payment' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pay invoice $65.20' }),
    ).not.toBeInTheDocument();
    await act(async () => resolve());
  });
  it('denies unauthorized invoice access without preparing or mounting payment', async () => {
    const f = setup();
    vi.mocked(f.api.detail).mockRejectedValue(new Error('Forbidden'));
    await f.user.click(screen.getByRole('button', { name: 'View invoice 17' }));
    expect(
      await screen.findByText(/This invoice could not be opened/),
    ).toBeInTheDocument();
    expect(f.api.prepare).not.toHaveBeenCalled();
    expect(f.loader).not.toHaveBeenCalled();
  });
  it('automatically resumes an existing durable payment on invoice reopen', async () => {
    const f = setup();
    vi.mocked(f.api.detail).mockResolvedValue({
      ...detail(),
      collections: [payment('PROCESSING')],
    });
    vi.mocked(f.api.act).mockResolvedValue(payment('PROCESSING'));
    await f.user.click(screen.getByRole('button', { name: 'View invoice 17' }));
    expect(
      await screen.findByText(/Your payment is processing/),
    ).toBeInTheDocument();
    expect(f.api.prepare).not.toHaveBeenCalled();
    expect(f.api.act).toHaveBeenCalledWith(17, 'STATUS');
    expect(f.client.confirmPayment).not.toHaveBeenCalled();
  });
  it('preserves manager manual controls and disables them during an online reservation', () => {
    const run = vi.fn();
    const { rerender } = render(
      <Invoice
        invoice={detail().invoice}
        run={run}
        canManage
        payments={detail().payments.map((payment, index) => ({
          ...payment,
          id: index + 1,
          invoiceId: 17,
        }))}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }));
    expect(
      screen.getByRole('button', { name: 'Record payment' }),
    ).toBeInTheDocument();
    rerender(
      <Invoice
        invoice={detail().invoice}
        run={run}
        canManage
        collections={[payment('PROCESSING')]}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Record payment' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Changes and new payments are unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', {
        name: 'Invoice history, newest first',
        hidden: true,
      }),
    ).toHaveTextContent(/Online charge \$65.20 .*Online processing fee \$5.20/);
  });
  it('uses the same fee name for a completed historical invoice payment', async () => {
    const f = setup();
    const completed = detail();
    completed.eligible = false;
    completed.invoice.paidMinor = 10000;
    completed.collections = [payment('COMPLETED')];
    vi.mocked(f.api.detail).mockResolvedValue(completed);
    await f.user.click(screen.getByRole('button', { name: 'View invoice 17' }));
    expect(
      await screen.findByRole('list', {
        name: 'Invoice history, newest first',
      }),
    ).toHaveTextContent('Online processing fee $5.20');
    expect(screen.queryByText(/Service fee/)).toBeNull();
    expect(f.api.prepare).not.toHaveBeenCalled();
  });
  it('sends only invoice identity and consent through named owned API operations', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { boothInvoicePayment: payment() } }),
        ),
      );
    const api = createBoothInvoiceApi({
      endpoint: 'http://localhost/admin-api',
      channelToken: 'vendor',
      fetch,
    });
    await api.act(17, 'CONFIRM', 'booth-invoice-card-once-v1');
    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(body.variables).toEqual({
      invoiceId: 17,
      action: 'CONFIRM',
      consent: 'booth-invoice-card-once-v1',
    });
    expect(body.query).toContain('BoothInvoicePayment');
  });
});
