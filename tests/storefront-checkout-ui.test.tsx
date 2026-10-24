import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { CheckoutView, PublicCart } from '@market/api';
import type { VendorPreorderState } from '../apps/storefront/src/lib/vendor-preorder';
import { VendorCheckout } from '../apps/storefront/src/components/VendorCheckout';
import { PurchaseSuccess } from '../apps/storefront/src/components/PurchaseSuccess';
import { CheckoutPickup } from '../apps/storefront/src/components/CheckoutPickup';
import { shopCall } from '../apps/storefront/src/components/shop-client';
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));
vi.mock('../apps/storefront/src/components/CheckoutLoyalty', () => ({
  default: () => null,
}));
afterEach(() => {
  cleanup();
  vi.mocked(shopCall).mockReset();
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
      lines: [{ id: '10', name: 'Greens', quantity: 2, total: 1285 }],
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
  fireEvent.change(screen.getByLabelText('First name'), {
    target: { value: '  Zoë Anne  ' },
  });
  fireEvent.change(screen.getByLabelText('Last name'), {
    target: { value: 'O’Connor-Smith' },
  });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'zoe+pickup@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Phone number (required)'), {
    target: { value: '2025550123' },
  });
}
describe('vendor checkout UI', () => {
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
    expect(screen.getByText('Sales tax (included)')).toBeInTheDocument();
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
    expect(screen.getByLabelText('Phone number (required)')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check my details' }));
    expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your last name.')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveFocus();
    expect(screen.getByText('Enter a phone number.')).toBeInTheDocument();
  });
  it('normalizes names, supports Unicode, rejects invalid email and retains other fields', () => {
    mount();
    fill();
    fireEvent.blur(screen.getByLabelText('First name'));
    expect(screen.getByLabelText('First name')).toHaveValue('Zoë Anne');
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'invalid' },
    });
    fireEvent.blur(screen.getByLabelText('Email address'));
    expect(
      screen.getByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Last name')).toHaveValue('O’Connor-Smith');
    expect(screen.getByLabelText('First name')).toHaveAttribute(
      'maxlength',
      '100',
    );
    expect(screen.getByLabelText('Email address')).toHaveAttribute(
      'maxlength',
      '254',
    );
  });
  it('checks programmatic length violations including notes and email', () => {
    mount();
    fill();
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'A'.repeat(101) },
    });
    fireEvent.blur(screen.getByLabelText('First name'));
    expect(
      screen.getByText('This field is too long. Please shorten it.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'a'.repeat(255) + '@example.test' },
    });
    fireEvent.blur(screen.getByLabelText('Email address'));
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
    expect(screen.getByLabelText('First name')).toHaveValue('Zoë');
    expect(
      screen.getByText(
        /Your cart’s pickup market cannot be confirmed. Refresh/,
      ),
    ).toBeInTheDocument();
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
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh order summary' }),
    );
    await screen.findByText(/The latest order could not be confirmed/);
    expect(screen.getByLabelText('Last name')).toHaveValue('O’Connor-Smith');
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
      'Pickup Details',
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
      'Pickup Details',
      'Garden Market',
      'Date: October 30, 2026',
      'Time: 9:00 AM to 2:00 PM',
      'Garden',
      'Collect at the booth.',
      'Garden',
    ]);
    expect(
      screen.queryByText(/Market schedule:|Market hours:|pickup window/),
    ).toBeNull();
    expect(screen.getByRole('link', { name: 'Garden' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: 'Garden' })).toHaveAttribute(
      'href',
      expect.stringContaining('query=Garden'),
    );
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
  it('keeps SSR routes private and skips all order reads for editor previews', () => {
    for (const file of ['index', 'success']) {
      const source = readFileSync(
        `apps/storefront/src/pages/checkout/${file}.astro`,
        'utf8',
      );
      expect(source).toContain('private, no-store');
      expect(source).toContain('!Astro.locals.editorPreview');
      expect(source).toContain(
        'requestCheckout(Astro, Astro.response.headers).status(',
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
      unitPriceWithTax: 650,
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
