import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { AppError, type PublicCart } from '@market/api';
import { VendorCart } from '../apps/storefront/src/components/VendorCart';
import { VendorPreorderBanner } from '../apps/storefront/src/components/VendorPreorderBanner';
import { cartRelatedProducts } from '@market/storefront-core';
import { cartCheckoutIssue } from '../apps/storefront/src/lib/vendor-cart';
import type { VendorPreorderState } from '../apps/storefront/src/lib/vendor-preorder';
import { shopCall } from '../apps/storefront/src/components/shop-client';
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));
vi.mock('../apps/storefront/src/components/CheckoutLoyalty', () => ({
  default: () => null,
}));
const call = vi.mocked(shopCall);
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
function mount(current = cart, state = preorder) {
  const result = render(
    <VendorCart
      storefrontId="5"
      initialCart={current}
      initialPreorder={state}
    />,
  );
  const picker = screen.queryByText('Change Market');
  if (picker) fireEvent.click(picker);
  return result;
}
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
describe('vendor cart commerce presentation', () => {
  it('renders native unit, line and order amounts independently and keeps exact product/variant/context links', () => {
    const { container } = mount();
    expect(
      screen.getByRole('link', {
        name: cart.lines[0]!.productVariant.product.name,
      }),
    ).toHaveAttribute('href', '/products/greens?variant=109&occurrence=7');
    expect(screen.getByText('$6.50 each, including tax')).toBeVisible();
    expect(screen.getByLabelText('Subtotal for Large bag')).toHaveTextContent(
      '$12.85',
    );
    expect(container.querySelector('[data-cart-total]')).toHaveTextContent(
      '$11.99',
    );
    expect(screen.getByText('Sales tax (included)')).toBeVisible();
    expect(container.querySelector('.vendor-cart-pickup')).toHaveTextContent(
      'Oct 30, 2026, 9:00 AM to 2:00 PM',
    );
    expect(container.querySelector('.shop-market-banner')).toHaveTextContent(
      'Oct 30, 2026, 9:00 AM to 2:00 PM',
    );
    expect(screen.queryByText(/^Market hours:/)).toBeNull();
    expect(screen.queryByText('Shipping')).toBeNull();
    expect(screen.getByRole('link', { name: 'Continue Shopping' })).toHaveClass(
      'ui-button',
    );
    expect(
      screen.getByRole('link', { name: 'Continue Shopping' }),
    ).not.toHaveClass('secondary');
    expect(
      screen
        .getByRole('link', { name: 'Continue Shopping' })
        .querySelector('[aria-hidden="true"]'),
    ).toHaveTextContent('←');
    expect(
      screen.getByRole('button', { name: 'Remove Large bag' }),
    ).toHaveClass('button-destructive-outline');
    expect(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    ).toBeEnabled();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/greens.jpg',
    );
  });
  it.each([
    ['Increase', 3],
    ['Decrease', 1],
  ] as const)(
    'handles %s with one mutation, disables conflicts, and replaces amounts from the refreshed order',
    async (direction, quantity) => {
      let complete!: (value: unknown) => void;
      call.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
      const changed = {
        ...cart,
        totalWithTax: 7777,
        lines: [
          { ...cart.lines[0]!, quantity, discountedLinePriceWithTax: 7001 },
        ],
      };
      call.mockResolvedValueOnce({ cart: changed, preorder });
      const { container } = mount();
      const button = screen.getByRole('button', {
        name: `${direction} quantity for Large bag`,
      });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(call).toHaveBeenCalledTimes(1);
      expect(call).toHaveBeenCalledWith('5', 'adjust', {
        lineId: '10',
        quantity,
      });
      expect(
        screen.getByRole('button', { name: 'Remove Large bag' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /^Next Market/ }),
      ).toBeDisabled();
      complete({ cart: changed });
      await waitFor(() =>
        expect(container.querySelector('[data-cart-total]')).toHaveTextContent(
          '$77.77',
        ),
      );
      expect(screen.getByLabelText('Quantity for Large bag')).toHaveValue(
        quantity,
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        'Quantity and order totals updated.',
      );
    },
  );
  it.each(['-1', '0', '1.5', '2147483648'])(
    'rejects invalid quantity %s before sending a mutation',
    async (value) => {
      mount();
      fireEvent.change(screen.getByLabelText('Quantity for Large bag'), {
        target: { value },
      });
      fireEvent.blur(screen.getByLabelText('Quantity for Large bag'));
      expect(call).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Enter a positive whole quantity.',
      );
    },
  );
  it.each(['blur', 'Enter'])(
    'automatically saves a typed quantity on %s without an Update button or duplicate requests',
    async (trigger) => {
      const changed = { ...cart, lines: [{ ...cart.lines[0]!, quantity: 4 }] };
      call
        .mockResolvedValueOnce({ cart: changed })
        .mockResolvedValueOnce({ cart: changed, preorder });
      mount();
      expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
      const input = screen.getByLabelText('Quantity for Large bag');
      fireEvent.change(input, { target: { value: '4' } });
      expect(call).not.toHaveBeenCalled();
      if (trigger === 'Enter') fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.blur(input);
      expect(call).toHaveBeenCalledTimes(1);
      expect(call).toHaveBeenCalledWith('5', 'adjust', {
        lineId: '10',
        quantity: 4,
      });
      await waitFor(() =>
        expect(screen.getByLabelText('Quantity for Large bag')).toHaveValue(4),
      );
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'Quantity and order totals updated.',
        ),
      );
    },
  );
  it('does not send unchanged quantities when the input loses focus', () => {
    mount();
    fireEvent.blur(screen.getByLabelText('Quantity for Large bag'));
    expect(call).not.toHaveBeenCalled();
  });
  it('uses the typed quantity when stepping without racing a blur save', async () => {
    const changed = { ...cart, lines: [{ ...cart.lines[0]!, quantity: 5 }] };
    call
      .mockResolvedValueOnce({ cart: changed })
      .mockResolvedValueOnce({ cart: changed, preorder });
    mount();
    const input = screen.getByLabelText('Quantity for Large bag');
    const increase = screen.getByRole('button', {
      name: 'Increase quantity for Large bag',
    });
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.blur(input, { relatedTarget: increase });
    expect(call).not.toHaveBeenCalled();
    fireEvent.click(increase);
    expect(call).toHaveBeenCalledWith('5', 'adjust', {
      lineId: '10',
      quantity: 5,
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Quantity for Large bag')).toHaveValue(5),
    );
  });
  it('removes the final line in place and retains the selected market in the empty cart Shop link', async () => {
    call
      .mockResolvedValueOnce({ cart: null })
      .mockResolvedValueOnce({ cart: null, preorder });
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Large bag' }));
    await waitFor(() =>
      expect(screen.getByText('Your basket is waiting')).toBeVisible(),
    );
    expect(call).toHaveBeenNthCalledWith(1, '5', 'remove', {
      lineId: '10',
      quantity: undefined,
    });
    expect(
      screen.getByRole('link', { name: 'Continue Shopping' }),
    ).toHaveAttribute('href', '/products?occurrence=7');
    expect(screen.queryByRole('heading', { name: 'Order Summary' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Continue to Checkout' }),
    ).toBeNull();
  });
  it('reports native stock rejection at the affected item and uses a native partial result on reread', async () => {
    call
      .mockRejectedValueOnce(
        new AppError('validation', 'INSUFFICIENT_STOCK_ERROR'),
      )
      .mockResolvedValueOnce({
        cart: { ...cart, lines: [{ ...cart.lines[0]!, quantity: 1 }] },
        preorder,
      });
    mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Increase quantity for Large bag' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Quantity for Large bag')).toHaveValue(1),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Review the updated cart',
    );
    expect(screen.getAllByText(/Review the updated cart/)).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Decrease quantity for Large bag' }),
    ).toBeDisabled();
  });
  it('preserves visible cart items if a failed mutation cannot be reread and blocks uncertain checkout', async () => {
    call.mockRejectedValue(new AppError('network'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Large bag' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Refresh cart' }),
      ).toBeVisible(),
    );
    expect(
      screen.getByText(cart.lines[0]!.productVariant.product.name),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    ).toBeDisabled();
    expect(screen.queryByText('Your basket is waiting')).toBeNull();
  });
  it.each([
    { ...preorder, selected: undefined },
    { ...preorder, unavailable: true },
    { ...preorder, availability: [] },
    {
      ...preorder,
      availability: [
        {
          variantId: '109',
          available: false,
          quantity: 0,
          reason: 'Preorder window closed',
        },
      ],
    },
    {
      ...preorder,
      availability: [
        { variantId: '109', available: true, quantity: 1, reason: 'Available' },
      ],
    },
  ])(
    'blocks checkout for unconfirmed market, missing facts, closed windows or exhausted capacity',
    (state) => {
      mount(cart, state);
      expect(
        screen.getByRole('button', { name: 'Continue to Checkout' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Remove Large bag' }),
      ).toBeEnabled();
      expect(screen.getByLabelText('Quantity for Large bag')).toHaveAttribute(
        'aria-describedby',
        'availability-10',
      );
    },
  );
  it('blocks noneditable order navigation and mutations', () => {
    mount({ ...cart, state: 'PaymentAuthorized' });
    expect(
      screen.getByRole('button', { name: 'Remove Large bag' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    ).toBeDisabled();
  });
  it('refreshes eligibility before checkout and stops navigation for newly unavailable items', async () => {
    call.mockResolvedValue({
      cart,
      preorder: { ...preorder, availability: [] },
    });
    mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Continue to Checkout' }),
      ).toBeDisabled(),
    );
    expect(call).toHaveBeenCalledWith('5', 'cart', { includePreorder: true });
    await waitFor(() =>
      expect(
        screen.getByText(
          'Availability could not be confirmed. Refresh before checking out.',
        ),
      ).toBeVisible(),
    );
  });
  it('navigates once to the existing checkout after an authoritative reread and retains cookie session transport', async () => {
    const original = window;
    const assign = vi.fn();
    vi.stubGlobal(
      'window',
      new Proxy(original, {
        get(target, key) {
          if (key === 'location') return { assign };
          if (key === 'addEventListener' || key === 'removeEventListener')
            return target[key].bind(target);
          return Reflect.get(target, key, target);
        },
      }),
    );
    call.mockResolvedValue({ cart, preorder });
    mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledExactlyOnceWith('/checkout'),
    );
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('refreshes actual market and cart on return from another tab', async () => {
    call.mockResolvedValue({
      cart,
      preorder: {
        ...preorder,
        selected: { ...occurrence, id: '8', marketName: 'Next Market' },
      },
    });
    mount();
    fireEvent(window, new Event('focus'));
    await waitFor(() =>
      expect(screen.getByText('Preordering for Next Market')).toBeVisible(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change Market' }));
    expect(
      screen.getByRole('button', { name: /^Next Market \(current\)/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
describe('shared market banner', () => {
  it('distinguishes market hours from pickup instructions and blocks preview selection', () => {
    render(
      <VendorPreorderBanner storefrontId="5" preorder={preorder} preview />,
    );
    fireEvent.click(screen.getByText('Change Market'));
    expect(screen.getByText(/^Market hours:/)).toBeVisible();
    expect(screen.getByText('Collect at the booth.')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /^Garden Market \(current\)/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /^Friday, October 30/ }),
    ).toBeDisabled();
  });
  it('surfaces protected switching and links to the actual cart while retaining the banner context', async () => {
    call.mockRejectedValueOnce(
      new AppError('conflict', 'NONEMPTY_CONTEXT_SWITCH_DENIED'),
    );
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^Next Market/ }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Remove the current items',
      ),
    );
    expect(
      screen.getByRole('link', { name: 'Review your cart' }),
    ).toHaveAttribute('href', '/cart');
    expect(screen.getByText('Preordering for Garden Market')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Remove Large bag' }),
    ).toBeEnabled();
  });
  it('retains a genuine empty state with no eligible dates', () => {
    expect(cartCheckoutIssue(null, preorder)).toMatch(/empty/);
    mount(
      { ...cart, lines: [] },
      {
        ...preorder,
        selected: undefined,
        orderOccurrence: undefined,
        occurrences: [],
      },
    );
    expect(screen.getByText('No upcoming pickup markets')).toBeVisible();
    expect(screen.queryByText('Change Market')).toBeNull();
  });
  it('uses a single banner composition and scoped responsive styles without changing the shared shell or preview navigation', () => {
    for (const file of [
      'apps/storefront/src/pages/products/index.astro',
      'apps/storefront/src/pages/products/[slug].astro',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source.match(/<VendorPreorderBanner/g)).toHaveLength(1);
      expect(source).toContain('SiteLayout');
      expect(source).not.toContain('<ShopMarketSelection');
      expect(source.indexOf('<VendorPreorderBanner')).toBeLessThan(
        source.indexOf(file.includes('[slug]') ? '<Gallery' : '<aside'),
      );
    }
    const css = readFileSync(
      'apps/storefront/src/styles/vendor-cart.css',
      'utf8',
    );
    expect(css).toContain('minmax(0, 2fr) minmax(0, 1fr)');
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('var(--storefront-card-radius)');
    expect(css).toContain('var(--brand-primary)');
    expect(
      readFileSync('apps/storefront/src/pages/cart.astro', 'utf8'),
    ).toContain('Cart is intentionally outside editor preview');
  });
});

it('ranks cart suggestions using existing categories and excludes every product already in the cart', () => {
  const product = (id: string, category: string) => ({
    id,
    name: id,
    slug: id,
    description: '',
    featuredAsset: null,
    variants: [],
    facetValues: [
      {
        id: category,
        name: category,
        facet: { code: 'farmstand-category', id: 'category', name: 'Category' },
      },
    ],
  });
  const catalog = [
    product('1', 'produce'),
    product('2', 'bakery'),
    product('3', 'produce'),
    product('4', 'bakery'),
    product('5', 'produce'),
    product('6', 'bakery'),
    product('7', 'bakery'),
  ];
  expect(cartRelatedProducts(['1', '3'], catalog).map((p) => p.id)).toEqual([
    '5',
    '2',
    '4',
    '6',
  ]);
  expect(cartRelatedProducts([], catalog).map((p) => p.id)).toEqual([
    '1',
    '2',
    '3',
    '4',
  ]);
  expect(
    cartRelatedProducts(['1', '2', '3', '4', '5', '6', '7'], catalog),
  ).toEqual([]);
});
it('refreshes totals after a suggested-product add and ignores another storefront’s events', async () => {
  call.mockResolvedValue({ cart: { ...cart, totalWithTax: 9900 }, preorder });
  const { container } = mount();
  fireEvent(
    window,
    new CustomEvent('vendor-cart-updated', {
      detail: { storefrontId: 'other' },
    }),
  );
  expect(call).not.toHaveBeenCalled();
  fireEvent(
    window,
    new CustomEvent('vendor-cart-updated', { detail: { storefrontId: '5' } }),
  );
  await waitFor(() =>
    expect(container.querySelector('[data-cart-total]')).toHaveTextContent(
      '$99.00',
    ),
  );
});
it('keeps suggestions below the cart, reuses product cards and omits the account prompt', () => {
  const source = readFileSync('apps/storefront/src/pages/cart.astro', 'utf8');
  expect(source).not.toContain('ShopSignIn');
  expect(source).toContain(
    'const Cards = premium ? PremiumCards : ProductCards',
  );
  expect(source).toContain('<Cards');
  expect(source.indexOf('class="product-related"')).toBeGreaterThan(
    source.indexOf('<VendorCart'),
  );
  expect(source).toContain('relatedEnabled !== false');
  expect(source).toContain('availability={preorder.availability}');
});
it('queues a suggested-product refresh behind an in-flight quantity update', async () => {
  let complete!: (value: unknown) => void;
  const changed = { ...cart, lines: [{ ...cart.lines[0]!, quantity: 3 }] };
  call
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    )
    .mockResolvedValueOnce({ cart: changed, preorder })
    .mockResolvedValueOnce({
      cart: { ...changed, totalWithTax: 8800 },
      preorder,
    });
  const { container } = mount();
  fireEvent.click(
    screen.getByRole('button', { name: 'Increase quantity for Large bag' }),
  );
  fireEvent(
    window,
    new CustomEvent('vendor-cart-updated', { detail: { storefrontId: '5' } }),
  );
  expect(call).toHaveBeenCalledTimes(1);
  complete({ cart: changed });
  await waitFor(() =>
    expect(container.querySelector('[data-cart-total]')).toHaveTextContent(
      '$88.00',
    ),
  );
  expect(call).toHaveBeenCalledTimes(3);
});
