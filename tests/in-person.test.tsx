import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AppError,
  PosInputError,
  type InPersonApi,
  type PosDraft,
} from '@market/api';
import {
  visibleNavigation,
  routeAllowed,
  type AdminContext,
} from '@market/admin-core';
import { PosCartQueue } from '../apps/admin/src/vendor/pos-queue';
import { PosProductTile, PosRegister } from '../apps/admin/src/vendor/pos';
const draft: PosDraft = {
  id: 'draft-a',
  version: 1,
  state: 'OPEN',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  items: [],
  currency: 'USD',
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  customer: 'Anonymous customer',
  customerMode: 'ANONYMOUS',
  context: {
    kind: 'INDEPENDENT',
    label: 'Independent Sale',
    marketId: null,
    occurrenceId: null,
  },
  coupons: [],
  quote: null,
};
function fixture() {
  let current = structuredClone(draft);
  const api: InPersonApi = {
    nativeHandoff: vi.fn(),
    clover: {
      finish: vi.fn(),
      settings: vi.fn(),
      begin: vi.fn(),
      complete: vi.fn(),
      disconnect: vi.fn(),
      addDevice: vi.fn(),
      device: vi.fn(),
      control: vi.fn(),
      cancel: vi.fn(),
    },
    square: {
      settings: vi.fn(),
      begin: vi.fn(),
      complete: vi.fn(),
      importSandbox: vi.fn(),
      disconnect: vi.fn(),
      location: vi.fn(),
      addTerminal: vi.fn(),
      terminal: vi.fn(),
    },
    cancelSquare: vi.fn(),
    squareMobileCallback: vi.fn(),
    paymentMethods: vi.fn(async () => ({
      cash: true,
      simulated: false,
      scenarios: [],
    })),
    payment: vi.fn(async () => null),
    recoverablePayments: vi.fn(async () => []),
    latestSale: vi.fn(async () => null),
    orderPayment: vi.fn(async () => null),
    pay: vi.fn(),
    reconcile: vi.fn(),
    refund: vi.fn(),
    retryRefund: vi.fn(),
    catalog: vi.fn(async () => ({
      items: [
        {
          id: '1',
          name: 'Honey',
          image: null,
          favorite: false,
          variants: [
            {
              id: '11',
              name: 'Honey',
              sku: 'H-1',
              price: 500,
              available: 10,
              reason: null,
            },
          ],
        },
        {
          id: '2',
          name: 'Bread',
          image: null,
          favorite: false,
          variants: [
            {
              id: '21',
              name: 'Small loaf',
              sku: 'B-1',
              price: 400,
              available: 10,
              reason: null,
            },
            {
              id: '22',
              name: 'Large loaf',
              sku: 'B-2',
              price: 800,
              available: 10,
              reason: null,
            },
          ],
        },
      ],
      totalItems: 2,
      currency: 'USD',
      categories: [{ id: 'cat', name: 'Bakery', parentId: null }],
    })),
    contexts: vi.fn(async () => []),
    drafts: vi.fn(async () => []),
    draft: vi.fn(async () => current),
    start: vi.fn(async (_key, _occurrenceId, variantId) => {
      if (variantId)
        current = {
          ...current,
          version: 2,
          items: [
            {
              id: variantId,
              variantId,
              name: variantId === '11' ? 'Honey' : 'Small loaf',
              quantity: 1,
              unitPrice: 500,
              lineTotal: 500,
              tax: [],
              discounts: [],
            },
          ],
        };
      return current;
    }),
    favorite: vi.fn(async () => true),
    command: vi.fn(async (_id, _version, _key, input) => {
      if (input.action === 'add') {
        const line = current.items.find((l) => l.variantId === input.variantId);
        current = {
          ...current,
          version: current.version + 1,
          items: line
            ? current.items.map((l) =>
                l === line
                  ? { ...l, quantity: l.quantity + input.quantity }
                  : l,
              )
            : [
                ...current.items,
                {
                  id: input.variantId,
                  variantId: input.variantId,
                  name: input.variantId === '11' ? 'Honey' : 'Small loaf',
                  quantity: input.quantity,
                  unitPrice: 500,
                  lineTotal: 500,
                  tax: [],
                  discounts: [],
                },
              ],
        };
      } else if (input.action === 'review')
        current = {
          ...current,
          version: current.version + 1,
          state: 'READY_FOR_PAYMENT',
          quote: {
            id: 'quote',
            version: current.version + 1,
            expiresAt: new Date(Date.now() + 120000).toISOString(),
            paymentAvailable: false,
          },
        };
      return current;
    }),
  };
  return api;
}
describe('POS cart serialization', () => {
  it.each(['PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED'] as const)(
    'does not reopen a restored %s draft',
    async (state) => {
      const api = fixture();
      const saved: PosDraft = {
        ...draft,
        state,
        items: [
          {
            id: '11',
            variantId: '11',
            name: 'Honey',
            quantity: 2,
            unitPrice: 1000,
            lineTotal: 2000,
            tax: [],
            discounts: [],
          },
        ],
      };
      vi.mocked(api.drafts).mockResolvedValue([saved]);
      vi.mocked(api.draft).mockResolvedValue(saved);
      render(<PosRegister api={api} vendorName="Honey Farm" />);
      fireEvent.click(await screen.findByRole('button', { name: /Resume/ }));
      await screen.findByLabelText('Quantity for Honey');
      expect(api.command).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: /Review checkout/ }),
      ).toBeDisabled();
    },
  );
  it('reopens a reviewed saved draft through the backend before enabling review again', async () => {
    const api = fixture();
    const saved: PosDraft = {
      ...draft,
      state: 'READY_FOR_PAYMENT',
      version: 4,
      customer: 'Existing customer associated',
      customerMode: 'EXISTING',
      items: [
        {
          id: '11',
          variantId: '11',
          name: 'Honey',
          quantity: 2,
          unitPrice: 1000,
          lineTotal: 2000,
          tax: [],
          discounts: [],
        },
      ],
      quote: {
        id: 'old',
        version: 4,
        expiresAt: new Date(Date.now() + 120000).toISOString(),
        paymentAvailable: true,
      },
    };
    vi.mocked(api.drafts).mockResolvedValue([saved]);
    vi.mocked(api.draft).mockResolvedValue(saved);
    vi.mocked(api.command).mockResolvedValue({
      ...saved,
      version: 5,
      state: 'OPEN',
      quote: null,
    });
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: /Resume/ }));
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith(
        saved.id,
        4,
        expect.any(String),
        { action: 'reopen' },
      ),
    );
    expect(await screen.findByLabelText('Quantity for Honey')).toHaveValue(2);
    expect(
      screen.queryByRole('button', { name: 'Continue to Payment' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Review checkout/ }),
    ).toBeEnabled();
    expect(
      screen.getByText('Existing customer associated'),
    ).toBeInTheDocument();
  });
  it('preserves rapid additions and versions with one request in flight', async () => {
    const api = fixture(),
      changed = vi.fn(),
      queue = new PosCartQueue(structuredClone(draft), api, changed);
    for (let i = 0; i < 15; i++)
      queue.enqueue({ action: 'add', variantId: '11', quantity: 1 });
    expect(queue.quantities().get('11')).toBe(15);
    await waitFor(() => expect(queue.jobs).toHaveLength(0));
    expect(queue.draft.items[0]!.quantity).toBe(15);
    expect(vi.mocked(api.command).mock.calls.map((c) => c[1])).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
  });
  it('retries an uncertain request with its original idempotency key and version', async () => {
    const api = fixture(),
      changed = vi.fn();
    vi.mocked(api.command).mockRejectedValueOnce(new AppError('network'));
    const queue = new PosCartQueue(structuredClone(draft), api, changed);
    queue.enqueue({ action: 'add', variantId: '11', quantity: 1 });
    await waitFor(() => expect(queue.blocked).toBe(true));
    const first = vi.mocked(api.command).mock.calls[0]!;
    queue.retry();
    await waitFor(() => expect(queue.jobs).toHaveLength(0));
    expect(vi.mocked(api.command).mock.calls[1]).toEqual(first);
  });
  it('reports invalid mutations and prevents disposed-context writes', async () => {
    const api = fixture(),
      changed = vi.fn();
    vi.mocked(api.command).mockRejectedValueOnce(
      new PosInputError('Insufficient available stock'),
    );
    const queue = new PosCartQueue(structuredClone(draft), api, changed);
    queue.enqueue({ action: 'add', variantId: '11', quantity: 1 });
    await waitFor(() => expect(queue.jobs).toHaveLength(0));
    expect(changed.mock.calls.at(-1)![2].message).toContain('stock');
    queue.dispose();
    queue.enqueue({ action: 'add', variantId: '11', quantity: 1 });
    expect(api.command).toHaveBeenCalledTimes(1);
  });
});
describe('POS interface', () => {
  it('starts from a product and keeps subsequent additions in the same checkout', async () => {
    const api = fixture();
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Honey' }));
    await screen.findByLabelText('Quantity for Honey');
    fireEvent.click(screen.getByRole('button', { name: 'Add Honey' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Quantity for Honey')).toHaveValue(2),
    );
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(api.command).toHaveBeenCalledWith('draft-a', 2, expect.any(String), {
      action: 'add',
      variantId: '11',
      quantity: 1,
    });
  });
  it('does not save an empty checkout or a cancelled variant choice', async () => {
    const api = fixture();
    vi.mocked(api.drafts).mockResolvedValue([structuredClone(draft)]);
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' }),
    );
    expect(api.start).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /Resume 0 items/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add Bread, choose variant' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Choose Bread' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(api.start).not.toHaveBeenCalled();
    expect(api.command).not.toHaveBeenCalled();
  });
  it('retries an uncertain first addition with its original product and request key', async () => {
    const api = fixture();
    vi.mocked(api.start).mockRejectedValueOnce(new AppError('network'));
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Honey' }));
    const retry = await screen.findByRole('button', {
      name: 'Retry first product',
    });
    expect(
      screen.getByRole('button', { name: 'Add Bread, choose variant' }),
    ).toBeDisabled();
    const original = vi.mocked(api.start).mock.calls[0];
    fireEvent.click(retry);
    await screen.findByLabelText('Quantity for Honey');
    expect(vi.mocked(api.start).mock.calls[1]).toEqual(original);
    expect(api.command).not.toHaveBeenCalled();
  });
  it('uses an independently filled heart for product favorites', async () => {
    const product = (await fixture().catalog({})).items[0]!,
      onAdd = vi.fn(),
      onFavorite = vi.fn();
    const { rerender } = render(
      <PosProductTile
        product={product}
        currency="USD"
        disabled={false}
        onAdd={onAdd}
        onFavorite={onFavorite}
      />,
    );
    const favorite = screen.getByRole('button', { name: 'Favorite Honey' });
    expect(favorite.querySelector('svg')).toHaveAttribute('fill', 'none');
    fireEvent.click(favorite);
    expect(onFavorite).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
    rerender(
      <PosProductTile
        product={{ ...product, favorite: true }}
        currency="USD"
        disabled={false}
        onAdd={onAdd}
        onFavorite={onFavorite}
      />,
    );
    expect(
      screen
        .getByRole('button', { name: 'Unfavorite Honey' })
        .querySelector('svg'),
    ).toHaveAttribute('fill', 'currentColor');
  });
  it('fills the Favorites filter heart and separates it from the categories', async () => {
    const api = fixture();
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    const favorite = await screen.findByRole('button', { name: 'Favorites' });
    fireEvent.click(favorite);
    expect(favorite).toHaveAttribute('aria-pressed', 'true');
    expect(favorite.querySelector('svg')).toHaveAttribute(
      'fill',
      'currentColor',
    );
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
    await waitFor(() =>
      expect(api.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ favorites: true }),
      ),
    );
  });
  it('gates navigation and routes by vendor POS permission', () => {
    const context: AdminContext = {
      scope: 'VENDOR',
      name: 'Honey',
      source: 'backend',
      subject: { vendorId: '1' },
      permissions: ['ReadOwnVendorIdentity'],
      membershipRole: 'staff',
    };
    expect(routeAllowed(context, '/vendor/pos')).toBe(false);
    const cashier = {
      ...context,
      permissions: [...context.permissions, 'OperateOwnPos' as const],
    };
    expect(routeAllowed(cashier, '/vendor/pos')).toBe(true);
    expect(
      visibleNavigation(cashier).some((n) => n.label === 'In-Person Checkout'),
    ).toBe(true);
    expect(routeAllowed({ ...cashier, scope: 'MARKET' }, '/vendor/pos')).toBe(
      false,
    );
  });
  it('quick-adds without a dialog, retains search focus and uses variant selection', async () => {
    const api = fixture();
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' }),
    );
    expect(api.start).not.toHaveBeenCalled();
    const search = screen.getByLabelText('Search products');
    search.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Add Honey' }));
    await waitFor(() =>
      expect(api.start).toHaveBeenCalledWith(expect.any(String), null, '11'),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Quantity for Honey')).toHaveValue(1),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Bread, choose variant' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Choose Bread' });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Small loaf · $4.00' }),
    );
    await waitFor(() => expect(api.command).toHaveBeenCalledTimes(1));
    expect(api.start).toHaveBeenCalledTimes(1);
  });
  it('filters with real categories and searches by server request', async () => {
    const api = fixture();
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bakery' }));
    await waitFor(() =>
      expect(api.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryId: 'cat' }),
      ),
    );
    fireEvent.change(screen.getByLabelText('Search products'), {
      target: { value: 'H-1' },
    });
    await waitFor(() =>
      expect(api.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'H-1' }),
      ),
    );
  });
  it('switches parent and child immediately, resets, combines search and retains the cart without navigation', async () => {
    const api = fixture();
    const base = await api.catalog({});
    const categories = [
      { id: 'produce', name: 'Produce', parentId: null },
      { id: 'vegetables', name: 'Vegetables', parentId: 'produce' },
      { id: 'fruits', name: 'Fruits', parentId: 'produce' },
      { id: 'bakery', name: 'Bakery', parentId: null },
      { id: 'bread', name: 'Bread & Rolls', parentId: 'bakery' },
    ];
    vi.mocked(api.catalog).mockImplementation(async (input) => ({
      ...base,
      categories,
      items:
        input.categoryId === 'fruits'
          ? []
          : input.categoryId === 'bakery' || input.categoryId === 'bread'
            ? [base.items[1]!]
            : input.categoryId
              ? [base.items[0]!]
              : base.items,
    }));
    const location = window.location.href;
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Add Honey' }));
    await screen.findByLabelText('Quantity for Honey');
    const unrelatedReads = [
      api.contexts,
      api.drafts,
      api.paymentMethods,
      api.recoverablePayments,
    ].map((fn) => vi.mocked(fn).mock.calls.length);
    const choose = async (label: string, categoryId: string) => {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await waitFor(() =>
        expect(api.catalog).toHaveBeenLastCalledWith(
          expect.objectContaining({ categoryId }),
        ),
      );
    };
    expect(
      screen.queryByRole('group', { name: 'Produce subcategories' }),
    ).not.toBeInTheDocument();
    await choose('Produce', 'produce');
    expect(
      screen.getByRole('button', { name: 'Add Honey' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Bread, choose variant' }),
    ).not.toBeInTheDocument();
    await choose('Vegetables', 'vegetables');
    fireEvent.click(screen.getByRole('button', { name: 'All Produce' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Honey' })).toBeEnabled(),
    );
    await choose('Bakery', 'bakery');
    expect(
      screen.queryByRole('button', { name: 'Vegetables' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Bakery' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await choose('Bread & Rolls', 'bread');
    fireEvent.change(screen.getByLabelText('Search products'), {
      target: { value: 'B-1' },
    });
    await waitFor(() =>
      expect(api.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'B-1', categoryId: 'bread' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'All Products' }));
    await waitFor(() =>
      expect(api.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryId: undefined, search: 'B-1' }),
      ),
    );
    expect(
      screen.queryByRole('group', { name: 'Bakery subcategories' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Quantity for Honey')).toHaveValue(1);
    expect(
      [
        api.contexts,
        api.drafts,
        api.paymentMethods,
        api.recoverablePayments,
      ].map((fn) => vi.mocked(fn).mock.calls.length),
    ).toEqual(unrelatedReads);
    expect(window.location.href).toBe(location);
  });
  it.each(['category', 'favorites'] as const)(
    'does not add a searched SKU hidden by the %s filter on Enter',
    async (filter) => {
      const api = fixture();
      const base = await api.catalog({});
      vi.mocked(api.catalog).mockImplementation(async (input) => ({
        ...base,
        items: input.categoryId || input.favorites ? [] : base.items,
        totalItems: input.categoryId || input.favorites ? 0 : base.totalItems,
      }));
      render(<PosRegister api={api} vendorName="Honey Farm" />);
      fireEvent.click(
        await screen.findByRole('button', { name: 'Start checkout' }),
      );
      fireEvent.click(
        await screen.findByRole('button', {
          name: filter === 'category' ? 'Bakery' : 'Favorites',
        }),
      );
      fireEvent.change(screen.getByLabelText('Search products'), {
        target: { value: 'B-2' },
      });
      fireEvent.submit(screen.getByRole('search'));
      await waitFor(() =>
        expect(api.catalog).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'B-2' }),
        ),
      );
      await waitFor(() =>
        expect(screen.getByRole('status')).not.toHaveTextContent(
          'Updating products',
        ),
      );
      const calls = vi.mocked(api.catalog).mock.calls.length;
      fireEvent.submit(screen.getByRole('search'));
      expect(api.start).not.toHaveBeenCalled();
      expect(api.command).not.toHaveBeenCalled();
      expect(vi.mocked(api.catalog).mock.calls.length).toBe(calls);
      expect(
        screen.queryByRole('button', { name: 'Add Bread, choose variant' }),
      ).not.toBeInTheDocument();
    },
  );
  it('adds the exact visible variant on Enter after the filtered search finishes', async () => {
    const api = fixture();
    const base = await api.catalog({});
    vi.mocked(api.catalog).mockImplementation(async () => ({
      ...base,
      items: [base.items[1]!],
      totalItems: 1,
    }));
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Bakery' }));
    fireEvent.change(screen.getByLabelText('Search products'), {
      target: { value: 'B-2' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(api.start).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(api.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'B-2', categoryId: 'cat' }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add Bread, choose variant' }),
      ).toBeEnabled(),
    );
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() =>
      expect(api.start).toHaveBeenCalledWith(expect.any(String), null, '22'),
    );
  });
  it('ignores stale category responses and reuses recently loaded pages', async () => {
    const api = fixture();
    const base = await api.catalog({});
    const categories = [
      { id: 'a', name: 'Produce', parentId: null },
      { id: 'b', name: 'Beverages', parentId: null },
    ];
    let resolveOld!: (value: typeof base) => void;
    vi.mocked(api.catalog).mockImplementation(async (input) => {
      if (input.categoryId === 'a')
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      return {
        ...base,
        categories,
        items: input.categoryId === 'b' ? [base.items[1]!] : base.items,
      };
    });
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Produce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Beverages' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Add Honey' }),
      ).not.toBeInTheDocument(),
    );
    resolveOld({ ...base, categories });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Add Honey' }),
      ).not.toBeInTheDocument(),
    );
    const calls = vi.mocked(api.catalog).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'All Products' }));
    await screen.findByRole('button', { name: 'Add Honey' });
    fireEvent.click(screen.getByRole('button', { name: 'Beverages' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Add Honey' }),
      ).not.toBeInTheDocument(),
    );
    expect(vi.mocked(api.catalog).mock.calls.length).toBe(calls);
  });
  it('enables payment after review and exposes optional customer controls', async () => {
    const api = fixture();
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Add Honey' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Quantity for Honey')).toHaveValue(1),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Customer (Optional)' }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Add Customer (Optional)' }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue anonymously' }),
    );
    await waitFor(() => expect(api.command).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole('button', { name: 'Review checkout · $0.00' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Continue to Payment' }),
    ).toBeEnabled();
  });
  it('shows server rewards and records one cashier verbal-consent command without an arbitrary discount', async () => {
    const api = fixture();
    const selected: PosDraft = {
      ...draft,
      customer: 'Casey Demo',
      customerMode: 'EXISTING',
      items: [
        {
          id: '11',
          variantId: '11',
          name: 'Honey',
          quantity: 5,
          unitPrice: 100,
          lineTotal: 500,
          tax: [],
          discounts: [],
        },
      ],
      loyalty: {
        balance: { available: 1000, pending: 0, reserved: 0 },
        selection: null,
        rewards: [
          {
            id: 1,
            versionId: 7,
            available: true,
            discount: 200,
            reason: null,
            terms: {
              name: 'Honey thank-you',
              kind: 'FIXED',
              points: 200,
              value: 200,
              maximum: 0,
              minimum: 0,
              variantIds: ['11'],
              quantity: 1,
              startsAt: null,
              endsAt: null,
              limit: 1,
            },
          },
        ],
      },
    };
    vi.mocked(api.start).mockResolvedValue(selected);
    vi.mocked(api.command).mockResolvedValue({ ...selected, version: 2 });
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Honey' }));
    expect(await screen.findByText('Casey Demo')).toBeVisible();
    expect(screen.getByText('1,000 available points')).toBeVisible();
    expect(screen.getByText('Selected products only')).toBeVisible();
    expect(
      screen.queryByLabelText(/verification|OTP|SMS/i),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Apply $2.00 reward, customer agreed',
      }),
    );
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith(
        'draft-a',
        1,
        expect.any(String),
        { action: 'reward', versionId: 7, verballyAgreed: true },
      ),
    );
  });
  it('explains ineligible rewards and keeps them disabled', async () => {
    const api = fixture(),
      selected: PosDraft = {
        ...draft,
        customer: 'Casey Demo',
        customerMode: 'EXISTING',
        loyalty: {
          balance: { available: 0, pending: 1000, reserved: 0 },
          selection: null,
          rewards: [
            {
              id: 1,
              versionId: 7,
              available: false,
              discount: 200,
              reason: 'Requires 200 points',
              terms: {
                name: 'Honey thank-you',
                kind: 'FIXED',
                points: 200,
                value: 200,
                maximum: 0,
                minimum: 0,
                variantIds: [],
                quantity: 1,
                startsAt: null,
                endsAt: null,
                limit: null,
              },
            },
          ],
        },
      };
    vi.mocked(api.start).mockResolvedValue(selected);
    render(<PosRegister api={api} vendorName="Honey Farm" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Honey' }));
    expect(await screen.findByText('Requires 200 points')).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Apply $2.00 reward, customer agreed',
      }),
    ).toBeDisabled();
    expect(api.command).not.toHaveBeenCalled();
  });
});
