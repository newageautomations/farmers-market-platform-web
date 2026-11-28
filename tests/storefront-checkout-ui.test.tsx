import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { CheckoutView, PublicCart } from '@market/api';
import type {
  StripePaymentElements,
  StripePaymentFactory,
} from '@market/ui/stripe-card';
import type { VendorPreorderState } from '../apps/storefront/src/lib/vendor-preorder';
import { VendorCheckout } from '../apps/storefront/src/components/VendorCheckout';
import { PurchaseSuccess } from '../apps/storefront/src/components/PurchaseSuccess';
import { CheckoutPickup } from '../apps/storefront/src/components/CheckoutPickup';
import { Checkout } from '../apps/storefront/src/components/Checkout';
import { Checkout as FarmhouseCheckout } from '../apps/storefront/src/components/modern-farmhouse/Checkout';
import { shopCall } from '../apps/storefront/src/components/shop-client';
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));
vi.mock('../apps/storefront/src/components/CheckoutLoyalty', () => ({
  default: () => null,
}));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  vi.mocked(shopCall).mockReset();
  vi.unstubAllGlobals();
});

const view: CheckoutView = {
  orderId: '1',
  code: 'TEST',
  kind: 'DIRECT_VENDOR',
  occurrenceId: '7',
  currency: 'USD',
  total: 1199,
  subtotal: 1285,
  shipping: 0,
  frozen: false,
  committed: false,
  paymentStatus: 'NONE',
  termsDisclosure: null,
  paymentGroup: null,
  preorderFee: null,
  preorderFeeTestAvailable: false,
  pickupPromise: {
    mode: 'VENDOR_BOOTH_PICKUP',
    venue: 'Garden',
    instructions: 'Collect at the booth.',
    startsAt: '2026-10-30T14:00:00Z',
    endsAt: '2026-10-30T19:00:00Z',
  },
  contact: null,
  profile: null,
  groups: [
    {
      vendorId: '2',
      vendorName: 'Garden Vendor',
      lines: [
        {
          id: '10',
          name: 'Greens',
          quantity: 2,
          total: 1285,
          totalBeforeTax: 1285,
        },
      ],
      pickup: [],
    },
  ],
  taxes: [{ name: 'Sales tax', total: 85 }],
  discounts: [{ name: 'Existing adjustment', total: -86 }],
  availability: { state: 'UNCONFIGURED', mode: 'PROVIDER' },
  attempt: null,
};
function mount(
  current = view,
  currentCart: PublicCart | null = cart,
  state = preorder,
) {
  return render(
    <VendorCheckout
      storefrontId="5"
      initial={current}
      initialCart={currentCart}
      initialPreorder={state}
    />,
  );
}
function fill() {
  fireEvent.change(screen.getByLabelText(/^First name/), {
    target: { value: '  Zoë Anne  ' },
  });
  fireEvent.change(screen.getByLabelText(/^Last name/), {
    target: { value: 'O’Connor-Smith' },
  });
  fireEvent.change(screen.getByLabelText(/^Email address/), {
    target: { value: 'zoe+pickup@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Phone number (optional)'), {
    target: { value: '2025550123' },
  });
}
describe('market checkout review', () => {
  it('shows each saved pickup choice, including free pickup', async () => {
    window.history.replaceState(null, '', '/checkout?step=Pickup');
    const initial: CheckoutView = {
      ...view,
      kind: 'MARKET_OCCURRENCE',
      availability: { state: 'AVAILABLE', mode: 'STRIPE_TEST' },
      contact: {
        firstName: 'Zoë',
        lastName: 'Smith',
        emailAddress: 'zoe@example.test',
        phoneNumber: '+12025550123',
      },
      groups: [
        view.groups[0],
        { ...view.groups[0], vendorId: '3', vendorName: 'Bakery' },
      ],
    };
    const choices = [
      { methodId: '20', vendorId: '2', name: 'Morning pickup', price: 0 },
      {
        methodId: '21',
        vendorId: '2',
        name: 'Afternoon pickup',
        instructions: 'Wait beside the north market gate',
        price: 0,
      },
      { methodId: '30', vendorId: '3', name: 'Bakery counter', price: 100 },
    ];
    vi.mocked(shopCall)
      .mockResolvedValueOnce(
        choices.map((choice) => ({ ...choice, currencyCode: 'USD' })),
      )
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...initial,
        preorderFee: {
          quoteId: '10',
          total: initial.total,
          preorderFee: 0,
          vendors: [],
        },
        groups: [
          {
            ...initial.groups[0],
            pickup: [
              {
                methodId: '21',
                name: 'Afternoon pickup',
                instructions: 'Wait beside the north market gate',
                fee: 0,
              },
            ],
          },
          {
            ...initial.groups[1],
            pickup: [
              {
                methodId: null,
                name: 'Bakery counter',
                instructions: null,
                fee: 100,
              },
            ],
          },
        ],
      });

    render(<Checkout storefrontId="5" initial={initial} marketLayout />);
    fireEvent.click(
      await screen.findByRole('radio', { name: /Afternoon pickup/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));

    await screen.findByRole('heading', { name: 'Review & Pay' });
    expect(shopCall).toHaveBeenCalledWith('5', 'checkout-select-pickup', {
      methodIds: ['21', '30'],
    });
    expect(
      vi
        .mocked(shopCall)
        .mock.calls.slice(0, 3)
        .map(([, action]) => action),
    ).toEqual(['checkout-pickup', 'checkout-select-pickup', 'checkout-status']);
    const summary = screen.getByRole('list', {
      name: 'Selected pickup options',
    });
    expect(summary).toHaveTextContent('Garden Vendor · Afternoon pickup');
    expect(summary).toHaveTextContent('Wait beside the north market gate');
    expect(summary).toHaveTextContent('Bakery · Bakery counter · $1.00');
    expect(summary).not.toHaveTextContent('Morning pickup');
  });
});

it('shows the summary, contact and payment controls together in Market Review & Pay', async () => {
  window.history.replaceState(null, '', '/checkout?step=Pickup');
  const charges = [
    { vendorId: '2', amount: 1199, currency: 'USD' },
    { vendorId: '3', amount: 600, currency: 'USD' },
  ];
  const initial: CheckoutView = {
    ...view,
    kind: 'MARKET_OCCURRENCE',
    termsDisclosure: {
      token: 'a'.repeat(64),
      sellers: charges.map(({ vendorId }, index) => ({
        vendorId,
        vendorName: index === 0 ? 'Garden Vendor' : 'Bakery',
        version: (index === 0 ? 'b' : 'c').repeat(64),
        pickupRefundNotice: null,
        policies: [],
      })),
    },
    contact: {
      firstName: 'Zoë',
      lastName: 'Smith',
      emailAddress: 'zoe@example.test',
      phoneNumber: '+12025550123',
    },
    groups: [
      {
        ...view.groups[0],
        pickup: [
          { methodId: null, name: 'Garden booth', instructions: null, fee: 0 },
        ],
      },
      {
        ...view.groups[0],
        vendorId: '3',
        vendorName: 'Bakery',
        pickup: [
          { methodId: null, name: 'Bakery booth', instructions: null, fee: 0 },
        ],
      },
    ],
    total: 1799,
    availability: { state: 'AVAILABLE', mode: 'STRIPE_TEST' },
    preorderFee: {
      quoteId: '9',
      total: 1799,
      preorderFee: 0,
      vendors: charges.map(({ vendorId, amount }) => ({
        vendorId,
        total: amount,
        platform: 0,
        recovery: 0,
        feeTax: 0,
        preorderFee: 0,
      })),
    },
  };
  const mountCard = vi.fn();
  const createPaymentElement = vi.fn<StripePaymentElements['create']>(() => ({
    mount: mountCard,
    on: (_event, onChange) => onChange({ complete: true }),
    destroy: vi.fn(),
  }));
  const stripe: StripePaymentFactory = () => ({
    elements: () => ({ create: createPaymentElement }),
    confirmSetup: vi.fn(),
    handleNextAction: vi.fn(),
  });
  vi.stubGlobal('Stripe', stripe);
  vi.mocked(shopCall).mockImplementation(async (_store, action) => {
    if (action === 'checkout-pickup')
      return [
        {
          vendorId: '2',
          methodId: '20',
          name: 'Garden booth',
          price: 0,
          currencyCode: 'USD',
        },
        {
          vendorId: '3',
          methodId: '30',
          name: 'Bakery booth',
          price: 0,
          currencyCode: 'USD',
        },
      ];
    if (action === 'checkout-status') return initial;
    if (action === 'stripe-checkout-prepare')
      return {
        orderId: initial.orderId,
        state: 'SETUP_REQUIRED',
        charges,
        setupSecret: 'seti_fixture_secret',
        publishableKey: 'pk_test_fixture',
      };
    return null;
  });

  render(
    <Checkout
      storefrontId="5"
      initial={initial}
      marketLayout
      preorder={preorder}
    />,
  );
  await screen.findByRole('radio', { name: 'Garden booth' });
  fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
  await screen.findByRole('heading', { name: 'Review & Pay' });
  const summary = screen.getByRole('complementary', { name: 'Order summary' });
  expect(summary).toHaveTextContent('$17.99');
  const contact = screen.getByRole('region', { name: 'Contact details' });
  expect(contact).toHaveTextContent(/Name:\s*Zoë Smith/);
  expect(contact).toHaveTextContent(/Email:\s*zoe@example.test/);
  expect(contact).toHaveTextContent(/Phone:\s*\+12025550123/);

  const vendors = await screen.findByRole('list', {
    name: 'Vendor card charges',
  });
  expect(vendors).toHaveTextContent('Garden Vendor: $11.99');
  expect(vendors).toHaveTextContent('Bakery: $6.00');
  expect(
    await screen.findByRole('group', { name: 'Card details' }),
  ).toBeVisible();
  await waitFor(() => expect(mountCard).toHaveBeenCalledOnce());
  expect(createPaymentElement).toHaveBeenCalledExactlyOnceWith(
    'payment',
    expect.objectContaining({
      layout: { type: 'accordion', radios: 'always', defaultCollapsed: false },
      wallets: { applePay: 'never', googlePay: 'never', link: 'never' },
    }),
  );
  const purchase = screen.getByRole('button', { name: 'Complete purchase' });
  expect(purchase).toBeDisabled();
  const terms = screen.getByRole('checkbox', {
    name: /my purchases from Garden Vendor, Bakery/,
  });
  terms.focus();
  fireEvent.click(terms);
  expect(purchase).toBeEnabled();
  const checkoutReads = () =>
    vi
      .mocked(shopCall)
      .mock.calls.filter(([, action]) => action === 'checkout-status').length;
  const reads = checkoutReads();
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(checkoutReads()).toBe(reads + 1));
  expect(terms).toBeChecked();
  expect(terms).toHaveFocus();
  expect(
    contact.compareDocumentPosition(purchase) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Pickup details' })).toBeVisible();
  expect(summary.parentElement).toHaveClass('vendor-checkout-layout');
  expect(summary.querySelector('details')).toBeNull();
  expect(within(summary).queryByRole('link', { name: 'Edit cart' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Change Market' })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Continue to payment' }),
  ).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  await screen.findByRole('radio', { name: 'Garden booth' });
  expect(shopCall).toHaveBeenCalledWith('5', 'stripe-checkout-status', {
    orderId: initial.orderId,
  });
});

describe('vendor checkout UI', () => {
  it.each(['shared', 'vendor', 'farmhouse'] as const)(
    'shows the Pasture review layout in %s checkout',
    async (layout) => {
      const initial: CheckoutView = {
        ...view,
        contact: {
          firstName: 'Example',
          lastName: 'Customer',
          emailAddress: 'example@example.com',
          phoneNumber: null,
        },
        groups: [
          {
            ...view.groups[0],
            pickup: [
              {
                methodId: null,
                name: 'Garden booth',
                instructions: null,
                fee: 0,
              },
            ],
          },
        ],
        availability: { state: 'AVAILABLE', mode: 'LOCAL' },
      };
      window.history.replaceState(null, '', '/checkout?step=Pickup');
      const options = [
        {
          vendorId: '2',
          methodId: '20',
          name: 'Garden booth',
          price: 0,
          currencyCode: 'USD',
        },
      ];
      vi.mocked(shopCall).mockImplementation(async (_store, action) =>
        action === 'checkout-pickup' ? options : initial,
      );
      if (layout === 'vendor') mount(initial);
      else if (layout === 'farmhouse')
        render(
          <FarmhouseCheckout
            storefrontId="5"
            initial={initial}
            initialCart={cart}
            initialPreorder={preorder}
          />,
        );
      else render(<Checkout storefrontId="5" initial={initial} />);

      await screen.findByRole('radio', { name: 'Garden booth' });
      fireEvent.click(screen.getByRole('button', { name: /Review order/ }));
      await screen.findByRole('heading', { name: 'Review & Pay' });
      const contact = screen.getByRole('region', { name: 'Contact details' });
      const pickup = screen.getByRole('region', { name: 'Pickup details' });
      const payment = screen.getByLabelText('Payment method');
      const summary = screen.getByRole('complementary', {
        name: 'Order summary',
      });
      expect(contact).toHaveTextContent(/Name:\s*Example Customer/);
      expect(contact).toHaveTextContent(/Email:\s*example@example.com/);
      expect(contact).not.toHaveTextContent('Phone:');
      expect(pickup).toHaveTextContent('Garden booth');
      expect(contact.nextElementSibling).toBe(pickup);
      expect(
        pickup.compareDocumentPosition(payment) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(pickup.parentElement?.nextElementSibling).toBe(summary);
      expect(summary.parentElement).toHaveClass('vendor-checkout-layout');
      expect(summary).toHaveTextContent('$11.99');
      expect(summary.querySelector('details, a[href="/cart"]')).toBeNull();
      expect(
        screen.queryByRole('button', { name: /Continue to payment/ }),
      ).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      await screen.findByRole('radio', { name: 'Garden booth' });
      if (layout === 'vendor')
        expect(screen.getByRole('link', { name: 'Edit cart' })).toBeVisible();
      if (layout === 'farmhouse')
        expect(
          screen.getByRole('link', { name: /Edit your bag/ }),
        ).toBeVisible();
    },
  );

  it('reuses the market banner, authoritative totals, variant and product image', () => {
    const { container } = mount();
    expect(
      screen.getByText('Preordering for Garden Market'),
    ).toBeInTheDocument();
    expect(screen.getByText('Large bag')).toBeInTheDocument();
    expect(screen.queryByText(/Fresh from your vendor/)).toBeNull();
    expect(
      container.querySelector('.checkout-order-summary .ui-disclosure'),
    ).toHaveAttribute('open');
    expect(
      container.querySelector('.checkout-order-summary .ui-disclosure-content'),
    ).toBeInTheDocument();

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/greens.jpg',
    );
    expect(container.querySelector('[data-cart-total]')).toHaveTextContent(
      '$11.99',
    );
    // One Tax row; the breakdown stays with the backend.
    expect(
      container.querySelector('.checkout-order-summary .order-totals'),
    ).toHaveTextContent('Tax$0.85');
    expect(screen.queryByText('Sales tax (included)')).toBeNull();
    expect(
      container.querySelector('.vendor-checkout-layout'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit cart' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });
  it('keeps untouched validation hidden and focuses the first invalid field on submit', () => {
    mount();
    expect(screen.queryByText('Enter your first name.')).toBeNull();
    expect(screen.getByLabelText('Phone number (optional)')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check my details' }));
    expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your last name.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^First name/)).toHaveFocus();
    // Phone is optional: leaving it blank is not an error.
    expect(screen.queryByText('Enter a phone number.')).toBeNull();
    // Every required contact field is marked with an asterisk.
    for (const label of [/^First name/, /^Last name/, /^Email address/])
      expect(
        screen
          .getByLabelText(label)
          .labels?.[0]?.querySelector('.required-mark'),
      ).not.toBeNull();
    expect(screen.getByLabelText('Phone number (optional)')).not.toBeRequired();
  });
  it('normalizes names, supports Unicode, rejects invalid email and retains other fields', () => {
    mount();
    fill();
    fireEvent.blur(screen.getByLabelText(/^First name/));
    expect(screen.getByLabelText(/^First name/)).toHaveValue('Zoë Anne');
    fireEvent.change(screen.getByLabelText(/^Email address/), {
      target: { value: 'invalid' },
    });
    fireEvent.blur(screen.getByLabelText(/^Email address/));
    expect(
      screen.getByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Last name/)).toHaveValue('O’Connor-Smith');
    expect(screen.getByLabelText(/^First name/)).toHaveAttribute(
      'maxlength',
      '100',
    );
    expect(screen.getByLabelText(/^Email address/)).toHaveAttribute(
      'maxlength',
      '254',
    );
  });
  it('checks programmatic length violations including notes and email', () => {
    mount();
    fill();
    fireEvent.change(screen.getByLabelText(/^First name/), {
      target: { value: 'A'.repeat(101) },
    });
    fireEvent.blur(screen.getByLabelText(/^First name/));
    expect(
      screen.getByText('This field is too long. Please shorten it.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Email address/), {
      target: { value: 'a'.repeat(255) + '@example.test' },
    });
    fireEvent.blur(screen.getByLabelText(/^Email address/));
    fireEvent.change(screen.getByLabelText(/Order notes/), {
      target: { value: 'a'.repeat(5001) },
    });
    fireEvent.blur(screen.getByLabelText(/Order notes/));
    expect(
      screen.getAllByText('This field is too long. Please shorten it.'),
    ).toHaveLength(3);
  });
  it('validates independently with no contact persistence or payment requests', async () => {
    vi.mocked(shopCall)
      .mockResolvedValueOnce(view)
      .mockResolvedValueOnce({ cart, preorder });
    mount();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Check my details' }));
    expect(screen.getByText(/Your details are valid/)).toBeInTheDocument();
    await waitFor(() => expect(shopCall).toHaveBeenCalledTimes(2));
    expect(vi.mocked(shopCall).mock.calls.map((args) => args[1])).toEqual([
      'checkout-status',
      'cart',
    ]);
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
    expect(screen.queryByLabelText(/card number/i)).toBeNull();
    expect(screen.queryByText('Your order is confirmed.')).toBeNull();
  });
  it('prefills profile information without saving it and blocks invalid carts', () => {
    mount(
      {
        ...view,
        profile: {
          firstName: 'Zoë',
          lastName: 'Smith',
          emailAddress: 'zoe@example.test',
          phoneNumber: '+442079460018',
        },
      },
      cart,
      { ...preorder, selected: undefined },
    );
    expect(screen.getByLabelText(/^First name/)).toHaveValue('Zoë');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your cart’s pickup market is temporarily unavailable.',
    );
    expect(shopCall).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
  });
  it('shows an empty cart state', () => {
    mount(view, null);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
  });
  it('retains customer input and warns when a summary refresh fails', async () => {
    vi.mocked(shopCall).mockRejectedValueOnce(new Error('Unavailable'));
    mount();
    fill();
    expect(
      screen.queryByRole('button', { name: 'Refresh order summary' }),
    ).toBeNull();
    fireEvent(window, new Event('focus'));
    await screen.findByText(/The latest order could not be confirmed/);
    expect(screen.getByLabelText(/^Last name/)).toHaveValue('O’Connor-Smith');
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();
  });
  it('omits unavailable pickup lines instead of adding explanatory copy', () => {
    const { container } = render(
      <CheckoutPickup
        view={{
          ...view,
          pickupPromise: {
            mode: 'VENDOR_BOOTH_PICKUP',
            venue: '',
            startsAt: null,
            endsAt: null,
            instructions: '',
          },
        }}
      />,
    );
    expect(container.querySelector('section')?.textContent).toBe(
      'Pickup details',
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('presents pickup lines in the requested order with separate date and times', () => {
    const { container } = render(
      <CheckoutPickup view={view} preorder={preorder} />,
    );
    expect(
      Array.from(container.querySelector('section')!.children).map(
        (element) => element.textContent,
      ),
    ).toEqual([
      'Pickup details',
      'Garden Market',
      'Date: October 30, 2026',
      'Time: 9:00 AM to 2:00 PM',
      'Garden',
      'Collect at the booth.',
      'Get directions',
    ]);
    expect(
      screen.queryByText(/Market schedule:|Market hours:|pickup window/),
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Get directions' }),
    ).toHaveAttribute('target', '_blank');
    expect(
      screen.getByRole('link', { name: 'Get directions' }),
    ).toHaveAttribute('href', expect.stringContaining('query=Garden'));
  });
  it('preserves the existing explicitly configured test payment flow', () => {
    mount({
      ...view,
      availability: { state: 'AVAILABLE', mode: 'LOCAL' },
      attempt: { attemptId: '8', state: 'HELD', expiresAt: null },
    });
    expect(
      screen.getByRole('option', { name: /Test Payment/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeDisabled();
    expect(screen.queryByText('Payment setup is not connected')).toBeNull();
  });
});
describe('order confirmation security and presentation', () => {
  it.each(['NONE', 'PENDING', 'FAILED', 'RECONCILIATION_REQUIRED'])(
    'does not announce success for uncommitted %s orders',
    (paymentStatus) => {
      render(
        <PurchaseSuccess storefrontId="5" view={{ ...view, paymentStatus }} />,
      );
      expect(screen.queryByText('Your order is confirmed.')).toBeNull();
      expect(screen.queryByText('TEST')).toBeNull();
      expect(
        screen.getByText(/Your purchase has not been confirmed/),
      ).toBeInTheDocument();
    },
  );
  it('shows verified order, actual status, items, pickup and shopping action', () => {
    render(
      <PurchaseSuccess
        storefrontId="5"
        view={{
          ...view,
          committed: true,
          paymentStatus: 'SUCCEEDED',
          paymentGroup: null,
          preorderFee: null,
          preorderFeeTestAvailable: false,
          profile: {
            firstName: 'Zoë',
            lastName: 'Smith',
            emailAddress: 'zoe@example.test',
            phoneNumber: '',
          },
        }}
      />,
    );
    expect(screen.getByText('TEST')).toBeInTheDocument();
    expect(screen.getByText('Payment status: Succeeded')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continue shopping' }),
    ).toHaveAttribute('href', '/products');
    expect(
      screen.getByRole('link', { name: 'View your orders' }),
    ).toHaveAttribute('href', '/account/orders');
  });
  it('offers password signup with checkout prefill and renders product images for guests', () => {
    const { container } = render(
      <PurchaseSuccess
        storefrontId="5"
        view={{
          ...view,
          committed: true,
          paymentStatus: 'SUCCEEDED',
          profile: null,
        }}
        images={{
          [view.groups[0]!.lines[0]!.id]:
            'https://images.example.test/product.jpg',
        }}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Create a free account' }),
    ).toHaveAttribute('href', '/account/signup?order=1');
    expect(screen.queryByRole('button', { name: /email|request/i })).toBeNull();
    expect(
      container.querySelector('.checkout-summary-product img'),
    ).toHaveAttribute('src', 'https://images.example.test/product.jpg');
    expect(shopCall).not.toHaveBeenCalled();
  });
  it('keeps SSR routes private and skips all order reads for editor previews', () => {
    for (const file of ['index', 'success']) {
      const source = readFileSync(
        `apps/storefront/src/pages/checkout/${file}.astro`,
        'utf8',
      );
      expect(source).toContain('private, no-store');
      expect(source).toContain('!Astro.locals.editorPreview');
      expect(source).toContain(
        file === 'index'
          ? 'readCheckoutStatus('
          : 'requestCheckout(Astro, Astro.response.headers).status(',
      );
      expect(source).toContain('SiteLayout');
    }
  });
});
const occurrence = {
  id: '7',
  marketId: '3',
  marketName: 'Garden Market',
  scheduleDate: '2026-10-30',
  startsAt: '2026-10-30T14:00:00Z',
  endsAt: '2026-10-30T19:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Garden',
  pickupInstructions: 'Collect at the booth.',
};
const preorder: VendorPreorderState = {
  selected: occurrence,
  orderOccurrence: occurrence,
  occurrences: [
    occurrence,
    { ...occurrence, id: '8', marketName: 'Next Market' },
  ],
  unavailable: false,
  availability: [
    { variantId: '109', available: true, quantity: 20, reason: 'Available' },
  ],
};
const cart: PublicCart = {
  id: '1',
  code: 'TEST',
  state: 'AddingItems',
  currencyCode: 'USD',
  subTotalWithTax: 1285,
  totalWithTax: 1199,
  shippingWithTax: 0,
  discounts: [{ description: 'Existing adjustment', amountWithTax: -86 }],
  surcharges: [],
  taxSummary: [{ description: 'Sales tax', taxTotal: 85 }],
  lines: [
    {
      id: '10',
      quantity: 2,
      unitPrice: 650,
      unitPriceWithTax: 650,
      discountedLinePrice: 1285,
      discountedLinePriceWithTax: 1285,
      featuredAsset: { preview: '/assets/greens.jpg' },
      productVariant: {
        id: '109',
        name: 'Large bag',
        product: {
          name: 'Fresh greens with a long product name',
          slug: 'greens',
        },
      },
    },
  ],
};
