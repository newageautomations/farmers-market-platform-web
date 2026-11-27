import { createRoot } from 'react-dom/client';
import type { CheckoutView } from '@market/api';
import { Checkout } from '../../apps/storefront/src/components/Checkout';
import { PurchaseSuccess } from '../../apps/storefront/src/components/PurchaseSuccess';
import { StripeCheckout } from '../../apps/storefront/src/components/StripeCheckout';
import type { StripePaymentFactory } from '@market/ui/stripe-card';
import '@market/ui/styles.css';
import '../../packages/theme/src/storefront.css';
import '../../apps/storefront/src/styles/checkout.css';
import '../../apps/storefront/src/styles/vendor-checkout.css';

export const view: CheckoutView = {
  orderId: '9',
  code: 'LOCAL-ORDER',
  kind: 'MARKET_OCCURRENCE',
  occurrenceId: '7',
  currency: 'USD',
  total: 2400,
  subtotal: 2400,
  shipping: 0,
  frozen: false,
  committed: false,
  paymentStatus: 'NOT_STARTED',
  termsDisclosure: null,
  preorderFee: null,
  preorderFeeTestAvailable: false,
  paymentGroup: null,
  profile: null,
  attempt: null,
  contact: {
    firstName: 'Ada',
    lastName: 'Smith',
    emailAddress: 'ada@example.test',
    phoneNumber: '+12105550123',
  },
  pickupPromise: {
    mode: 'MARKET',
    venue: '100 Main Street, Boerne, TX',
    startsAt: '2026-11-14T15:00:00Z',
    endsAt: '2026-11-14T19:00:00Z',
    instructions: 'Collect at the Manna Roots booth.',
  },
  availability: { mode: 'LOCAL', state: 'AVAILABLE' },
  taxes: [{ name: 'Tax', total: 0 }],
  discounts: [],
  groups: [
    {
      vendorId: '1',
      vendorName: 'Manna Roots',
      lines: [{ id: '10', name: 'Fresh sourdough', quantity: 2, total: 2400 }],
      pickup: [
        { methodId: null, name: 'Market pickup', instructions: null, fee: 0 },
      ],
    },
  ],
};
const sdk: StripePaymentFactory = () => ({
  elements: () => ({
    create: () => ({
      mount: (host: HTMLElement) => {
        host.textContent = 'Card number    MM / YY    CVC    ZIP';
      },
      on: (_event, listener) => {
        setTimeout(() => listener({ complete: true }), 0);
      },
      destroy: () => {},
    }),
  }),
  confirmSetup: async () => ({ setupIntent: { status: 'succeeded' } }),
  handleNextAction: async () => ({}),
});
const mode = new URLSearchParams(window.location.search).get('mode');
createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: '1100px', margin: 'auto', padding: '24px' }}>
    {mode === 'confirmation' ? (
      <PurchaseSuccess
        storefrontId="fixture"
        view={{ ...view, committed: true, paymentStatus: 'SUCCEEDED' }}
        images={{ '10': `${location.origin}/fixture-product.svg` }}
      />
    ) : mode === 'payment' ? (
      <StripeCheckout
        storefrontId="fixture"
        view={view}
        loadSdk={async () => sdk}
      />
    ) : (
      <Checkout storefrontId="fixture" initial={view} />
    )}
  </main>,
);
