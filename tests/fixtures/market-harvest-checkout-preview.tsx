import { MarketCart } from '../../apps/storefront/src/components/MarketCart';
import type { MarketCart as Cart } from '@market/api';
import '../../apps/storefront/src/styles/vendor-cart.css';
import '../../apps/storefront/src/styles/preorder-banner.css';
import { createRoot } from 'react-dom/client';
import type { CheckoutView } from '@market/api';
import { Checkout } from '../../apps/storefront/src/components/Checkout';
import { PurchaseSuccess } from '../../apps/storefront/src/components/PurchaseSuccess';
import { StripeCheckout } from '../../apps/storefront/src/components/StripeCheckout';
import type { StripeFactory } from '@market/ui/stripe-card';
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
      pickup: [{ name: 'Market pickup', fee: 0 }],
    },
  ],
};
const sdk: StripeFactory = () => ({
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
  confirmCardSetup: async () => ({}),
  handleNextAction: async () => ({}),
});
const occurrence = {
  id: '7',
  marketId: '3',
  marketName: 'Boerne Market',
  scheduleDate: '2026-11-14',
  startsAt: '2026-11-14T15:00:00Z',
  endsAt: '2026-11-14T19:00:00Z',
  timezone: 'America/Chicago',
  venue: '100 Main Street, Boerne, TX',
  pickupInstructions: 'Collect your preorder from each vendor booth.',
};
const preorder = {
  occurrences: [occurrence],
  selected: occurrence,
  orderOccurrence: occurrence,
  unavailable: false,
  availability: [],
};
const cart: Cart = {
  id: '9',
  kind: 'MARKET_OCCURRENCE',
  state: 'AddingItems',
  totalQuantity: 3,
  currencyCode: 'USD',
  subTotalWithTax: 3200,
  totalWithTax: 3200,
  shippingWithTax: 0,
  discounts: [],
  taxSummary: [],
  couponCodes: [],
  occurrence,
  groups: [
    {
      vendorId: '1',
      vendorName: 'Manna Roots',
      lines: [
        {
          id: '10',
          variantId: '100',
          name: 'Fresh sourdough loaf',
          productName: 'Fresh sourdough',
          quantity: 2,
          unitPriceWithTax: 1200,
          discountedLinePriceWithTax: 2400,
          featuredAsset: {
            id: '1',
            preview: `${location.origin}/fixture-product.svg`,
            width: 120,
            height: 120,
          },
        },
      ],
    },
    {
      vendorId: '2',
      vendorName: 'Garden Orchard',
      lines: [
        {
          id: '11',
          variantId: '101',
          name: 'Seasonal fruit box',
          productName: 'Seasonal fruit',
          quantity: 1,
          unitPriceWithTax: 800,
          discountedLinePriceWithTax: 800,
          featuredAsset: null,
        },
      ],
    },
  ],
};
view.groups.push({
  vendorId: '2',
  vendorName: 'Garden Orchard',
  lines: [{ id: '11', name: 'Seasonal fruit box', quantity: 1, total: 800 }],
  pickup: [{ name: 'Orchard booth pickup', fee: 0 }],
});
view.total = view.subtotal = 3200;
const mode = new URLSearchParams(window.location.search).get('mode');
createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: '1100px', margin: 'auto', padding: '24px' }}>
    {mode === 'cart' ? (
      <MarketCart
        storefrontId="fixture"
        marketName="Boerne Market"
        initialCart={cart}
        initialPreorder={preorder}
      />
    ) : mode === 'confirmation' ? (
      <PurchaseSuccess
        storefrontId="fixture"
        shopHref="/shop"
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
      <Checkout
        storefrontId="fixture"
        initial={view}
        marketLayout
        preorder={preorder}
        images={{ '10': `${location.origin}/fixture-product.svg` }}
      />
    )}
  </main>,
);
