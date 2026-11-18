import { createRoot } from 'react-dom/client';
import type {
  BoothInvoiceApi,
  BoothInvoiceDetail,
  BoothInvoicePayment as Payment,
  BoothInvoice,
} from '@market/api';
import type { StripeCard, StripeFactory } from '@market/ui/stripe-card';
import { BoothInvoicePayment } from '../../apps/admin/src/vendor/BoothInvoicePayment';
import '@market/ui/styles.css';

/**
 * The vendor booth invoice modal with an in-memory invoice API and a stand-in
 * card field (no Stripe). Type any card text to enable Pay; text containing
 * "decline" makes the card charge fail, "slow" keeps it processing for a few
 * status checks before it completes.
 */
const quote = {
  base: 6000,
  eligible: 6000,
  platform: 610,
  recovery: 414,
  fee: 1024,
  feeTax: 0,
  gross: 7024,
  currency: 'USD',
  policy: 'booth-invoice-preview',
};
let paid = false,
  confirmed = false,
  cardText = '',
  polls = 0;
const payment = (state: Payment['state']): Payment => ({
  id: 'preview',
  invoiceId: 17,
  state,
  active: !['COMPLETED', 'CANCELED'].includes(state),
  quote,
  reviewCode: null,
  account: 'acct_preview',
  publishableKey: 'pk_test_preview',
  consentPolicy: 'booth-invoice-card-once-v1',
});
const detail = (): BoothInvoiceDetail => ({
  marketName: 'Boerne Market',
  eligible: !paid,
  unavailable: '',
  invoice: {
    id: 17,
    marketId: 2,
    revision: 1,
    assignmentId: 4,
    occurrenceId: 5,
    directoryId: 6,
    status: paid ? 'PAID' : 'OPEN',
    totalMinor: 6000,
    paidMinor: paid ? 6000 : 0,
    currency: 'USD',
    dueAt: '2027-02-12T23:59:00Z',
    lines: [
      {
        description: 'Booth A4 · 10 × 10 ft',
        quantity: 1,
        unitMinor: 6000,
        lineMinor: 6000,
        currency: 'USD',
      },
    ],
    recipientSnapshot: {
      businessName: 'Manna Roots',
    } as BoothInvoice['recipientSnapshot'],
  },
  payments: paid
    ? [
        {
          id: 'card',
          amountMinor: 6000,
          currency: 'USD',
          method: 'CARD',
          paidAt: new Date().toISOString(),
        },
      ]
    : [],
  collections: [],
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const api: BoothInvoiceApi = {
  detail: async () => detail(),
  prepare: async () => payment('PREPARED'),
  act: async (_id, action) => {
    await wait(400);
    if (action === 'CONFIRM') {
      confirmed = true;
      return { ...payment('CARD_REQUIRED'), clientSecret: 'pi_preview' };
    }
    // Background status checks before Pay leave the payment prepared.
    if (!confirmed) return payment(paid ? 'COMPLETED' : 'PREPARED');
    if (/decline/i.test(cardText)) {
      confirmed = false;
      return payment('CARD_REQUIRED');
    }
    if (/slow/i.test(cardText) && polls++ < 2) return payment('PROCESSING');
    paid = true;
    return payment('COMPLETED');
  },
};
const loadSdk = async (): Promise<StripeFactory> => () => ({
  elements: () => ({
    create: () => {
      let input: HTMLInputElement | null = null;
      let listener: (v: { complete: boolean }) => void = () => {};
      const card: StripeCard = {
        mount: (host) => {
          input = document.createElement('input');
          input.placeholder = 'Card (type "decline" or "slow" to vary)';
          input.style.cssText = 'width:100%;border:0;font:inherit;outline:0';
          input.addEventListener('input', () => {
            cardText = input!.value;
            polls = 0;
            listener({ complete: cardText.length > 0 });
          });
          (host as HTMLElement).append(input);
        },
        destroy: () => input?.remove(),
        on: (_e, cb) => {
          listener = cb;
        },
      };
      return card;
    },
  }),
  confirmCardSetup: async () => ({}),
  handleNextAction: async () => ({}),
  confirmCardPayment: async () => {
    await wait(1200);
    return /decline/i.test(cardText) ? { error: { type: 'card_error' } } : {};
  },
});

createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 32 }}>
    <BoothInvoicePayment
      api={api}
      invoiceId={17}
      onUpdated={() => {}}
      loadSdk={loadSdk}
      actionLabel="Pay invoice"
    />
  </main>,
);
