import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Finances, financeDates } from '../apps/admin/src/finance/Finances';
import { ProductionCost } from '../apps/admin/src/finance/ProductionCost';
import {
  FinancialGraph,
  FinanceDonut,
  buckets,
} from '../apps/admin/src/finance/charts';
import { visibleNavigation, routeAllowed } from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import type {
  FinanceApi,
  FinanceExpense,
  FinanceOptions,
  FinanceReport,
  FinanceScope,
} from '@market/api';

const scope: FinanceScope = {
  timezone: 'America/Chicago',
  from: '2026-09-01',
  through: '2026-09-30',
  market: 'ALL',
  currency: 'USD',
};
const summary = {
  gross: 80000,
  discounts: 1000,
  refunds: 500,
  netSales: 78500,
  productionCosts: 20000,
  processingFees: 0,
  platformFees: 0,
  marketFees: 0,
  deductibleExpenses: 27500,
  recordedSpending: 36500,
  totalExpenses: 47500,
  profit: 31000,
  orders: 3,
  missingCostUnits: 2,
  unknownFeeSales: 1,
};
const options: FinanceOptions = {
  timezone: 'America/Chicago',
  kind: 'VENDOR',
  currency: 'USD',
  currencies: ['USD'],
  markets: [{ id: '5', name: 'Boerne Farmers Market' }],
  events: [{ id: '9', marketId: '5', date: '2026-09-02' }],
  categories: ['Market booth fees', 'Equipment', 'Packaging'],
};
const expense: FinanceExpense = {
  id: '7b6aa774-2ca8-41ae-b61a-416d319d1807',
  description: 'Juicer repair',
  amount: 27500,
  currency: 'USD',
  spentOn: '2026-09-08',
  category: 'Equipment',
  attribution: 'GENERAL',
  marketId: null,
  occurrenceId: null,
  treatment: 'DEDUCT',
  payee: 'Repair shop',
  notes: 'Parts',
  version: 1,
  voided: false,
};
const report: FinanceReport = {
  scope,
  kind: 'VENDOR',
  asOf: '2026-10-20',
  costPolicy: 'Known costs only; missing costs are excluded.',
  summary,
  daily: [
    { ...summary, date: '2026-09-02' },
    {
      ...summary,
      gross: 0,
      profit: -27500,
      totalExpenses: 27500,
      date: '2026-09-08',
    },
  ],
  products: [
    {
      id: '6',
      name: 'Green Garden Juice',
      units: 10,
      gross: 8500,
      discounts: 0,
      refunds: 0,
      revenue: 8500,
      productionCosts: 2500,
      contribution: 6000,
      missingCostUnits: 0,
    },
  ],
  categories: [
    { name: 'Equipment', spending: 27500, deducted: 27500 },
    { name: 'Packaging', spending: 9000, deducted: 0 },
  ],
  transactions: [
    {
      id: 'sale:1',
      date: '2026-09-02',
      marketId: '5',
      occurrenceId: '9',
      variantId: '6',
      name: 'Green Garden Juice',
      orderId: '30',
      kind: 'SALE',
      quantity: 10,
      gross: 8500,
      discount: 0,
      refund: 0,
      productionCost: 2500,
      processingFee: null,
      platformFee: 0,
      currency: 'USD',
      method: 'CASH',
    },
  ],
  expenses: [expense],
};
function apiMock() {
  return {
    options: vi.fn(async () => options),
    report: vi.fn(async () => report),
    export: vi.fn(async () => ({ filename: 'report.csv', content: 'sample' })),
    detail: vi.fn(async () => ({
      expense,
      history: [
        {
          id: '1',
          action: 'CREATE',
          created_at: '2026-09-08',
          before_value: null,
          after_value: expense,
        },
      ],
      receipts: [],
    })),
    save: vi.fn(async () => expense),
    costs: vi.fn(async () => [
      { id: '2', unitCost: 250, currency: 'USD', effectiveAt: '2026-09-01' },
    ]),
    setCost: vi.fn(async () => []),
    createVariant: vi.fn(async () => ({ id: '8' })),
    upload: vi.fn(async () => ({})),
    download: vi.fn(async () => ({
      filename: 'receipt.png',
      mime: 'image/png',
      bytesBase64: '',
    })),
  } satisfies FinanceApi;
}
beforeEach(() => {
  history.replaceState(
    null,
    '',
    '/vendor/finances?' + new URLSearchParams({ ...scope }),
  );
});

describe('combined finance workspace', () => {
  it('shows point and donut details on hover and keyboard focus, including signed percentages', () => {
    const { container, unmount } = render(
      <FinancialGraph report={report} series={['profit']} group="daily" />,
    );
    const point = container.querySelector<SVGCircleElement>(
      '[data-value="-27500"]',
    )!;
    fireEvent.mouseEnter(point);
    expect(screen.getByRole('tooltip')).toHaveTextContent('-$275.00');
    fireEvent.keyDown(point, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.focus(point);
    expect(screen.getByRole('tooltip')).toBeVisible();
    unmount();
    const { container: donut } = render(
      <FinanceDonut
        currency="USD"
        items={[
          { id: 'a', name: 'Juice', value: 7500 },
          { id: 'b', name: 'Loss', value: -2500 },
        ]}
      />,
    );
    const slice = screen.getByRole('button', { name: /Loss: -\$25.00, 25%/ });
    fireEvent.mouseEnter(slice);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '25% of absolute total',
    );
    expect(slice).toHaveAttribute('stroke-width', '40');
    expect(donut.querySelectorAll('.finance-donut-slice')).toHaveLength(2);
  });
  it('uses the selected account calendar at UTC midnight', () => {
    const at = new Date('2026-10-20T01:00:00Z');
    expect(financeDates('7', at, 'America/Chicago').through).toBe('2026-10-19');
    expect(financeDates('7', at, 'Asia/Tokyo').through).toBe('2026-10-20');
  });
  it('keeps the graph mounted while a filter request is pending and changes grouping locally', async () => {
    const api = apiMock();
    const { container } = render(
      <Finances api={api} path="/vendor/finances" />,
    );
    await screen.findByText('$800.00', { selector: 'strong' });
    const graph = container.querySelector('.finance-main-graph');
    let complete!: (value: FinanceReport) => void;
    api.report.mockImplementationOnce(
      () =>
        new Promise<FinanceReport>((resolve) => {
          complete = resolve;
        }),
    );
    fireEvent.change(screen.getByLabelText('Sales scope'), {
      target: { value: '5' },
    });
    await waitFor(() => expect(api.report).toHaveBeenCalledTimes(2));
    expect(container.querySelector('.finance-main-graph')).toBe(graph);
    fireEvent.change(screen.getByLabelText('Group by'), {
      target: { value: 'weekly' },
    });
    expect(api.report).toHaveBeenCalledTimes(2);
    complete({ ...report, scope: { ...scope, market: '5' } });
    await waitFor(() =>
      expect(screen.queryByText('Updating chart…')).not.toBeInTheDocument(),
    );
    expect(container.querySelector('.finance-main-graph')).toBe(graph);
  });
  it('keeps the market finance route discoverable only with billing authority', () => {
    const manager = {
      ...fixtureContexts.MARKET,
      permissions: ['ReadOwnMarket', 'ReadOwnMarketBilling'] as const,
    };
    expect(
      visibleNavigation(manager).find((item) => item.label === 'Finances')
        ?.path,
    ).toBe('/market/finances');
    expect(routeAllowed(manager, '/market/finances/expenses')).toBe(true);
    expect(routeAllowed(manager, '/market/finances/quickbooks')).toBe(true);
    const restricted = { ...manager, permissions: ['ReadOwnMarket'] as const };
    expect(
      visibleNavigation(restricted).some((item) => item.label === 'Finances'),
    ).toBe(false);
    expect(routeAllowed(restricted, '/market/finances')).toBe(false);
    expect(routeAllowed(restricted, '/market/finances/quickbooks')).toBe(false);
  });
  it('computes inclusive presets and exact month boundaries', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    expect(financeDates('7', now)).toEqual({
      from: '2026-10-14',
      through: '2026-10-20',
    });
    expect(financeDates('last-month', now)).toEqual({
      from: '2026-09-01',
      through: '2026-09-30',
    });
    expect(financeDates('month', now).from).toBe('2026-10-01');
    expect(
      financeDates('last-month', new Date('2024-03-01T12:00:00Z')),
    ).toEqual({
      from: '2024-02-01',
      through: '2024-02-29',
    });
  });
  it('uses one report for cards and graphs with explicit negative values and zero baseline', async () => {
    const api = apiMock(),
      { container } = render(<Finances api={api} path="/vendor/finances" />);
    expect(
      await screen.findByText('$800.00', { selector: 'strong' }),
    ).toBeVisible();
    expect(screen.getByText('$310.00', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('$475.00', { selector: 'strong' })).toBeVisible();
    expect(
      container.querySelector('.finance-main-graph .finance-zero'),
    ).toBeTruthy();
    fireEvent.focus(screen.getByRole('combobox', { name: 'Metric' }));
    fireEvent.click(screen.getByRole('option', { name: 'Gross sales' }));
    expect(container.querySelector('[data-series="gross"]')).toBeNull();
    expect(container.querySelector('[data-value="-27500"]')).toBeTruthy();
    expect(screen.getByText(/2 units without production costs/)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('updates date, market and cards together without mixing stale results', async () => {
    const api = apiMock();
    render(<Finances api={api} path="/vendor/finances" />);
    await screen.findByText('$800.00', { selector: 'strong' });
    fireEvent.change(screen.getByLabelText('Sales scope'), {
      target: { value: 'INDEPENDENT' },
    });
    await waitFor(() =>
      expect(api.report).toHaveBeenLastCalledWith({
        ...scope,
        market: 'INDEPENDENT',
      }),
    );
    fireEvent.change(screen.getByLabelText('Sales scope'), {
      target: { value: '5' },
    });
    await waitFor(() =>
      expect(api.report).toHaveBeenLastCalledWith({ ...scope, market: '5' }),
    );
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-09-03' },
    });
    await waitFor(() =>
      expect(api.report).toHaveBeenLastCalledWith({
        ...scope,
        market: '5',
        from: '2026-09-03',
      }),
    );
  });
  it('keeps product details in shared dialogs and switches product sales metrics', async () => {
    const api = apiMock();
    render(<Finances api={api} path="/vendor/finances" />);
    await screen.findByText('$800.00', { selector: 'strong' });
    fireEvent.change(screen.getByLabelText('Show product sales by'), {
      target: { value: 'revenue' },
    });
    expect(screen.getByRole('region', { name: 'Product sales' })).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Green Garden Juice' })[0]!,
    );
    const dialog = screen.getByRole('dialog', { name: 'Green Garden Juice' });
    expect(within(dialog).getByText('Estimated contribution')).toBeVisible();
    expect(within(dialog).getByText('$60.00')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });
  it('opens daily values with negative profits and preserves keyboard-readable figures', async () => {
    render(<Finances api={apiMock()} path="/vendor/finances" />);
    await screen.findByText('$800.00', { selector: 'strong' });
    fireEvent.click(screen.getByRole('button', { name: 'Daily values' }));
    expect(
      within(screen.getByRole('dialog')).getByText('-$275.00'),
    ).toBeVisible();
  });
  it('records an expense with an explicit production-cost classification', async () => {
    const api = apiMock();
    render(<Finances api={api} path="/vendor/finances" />);
    await screen.findByText('$800.00', { selector: 'strong' });
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Expense' });
    fireEvent.change(within(dialog).getByLabelText('Expense description'), {
      target: { value: 'Bottles' },
    });
    fireEvent.change(within(dialog).getByLabelText('Amount (USD)'), {
      target: { value: '90.00' },
    });
    fireEvent.change(within(dialog).getByLabelText('Category'), {
      target: { value: 'Packaging' },
    });
    fireEvent.change(within(dialog).getByLabelText('Profit treatment'), {
      target: { value: 'IN_PRODUCTION_COST' },
    });
    fireEvent.submit(
      within(dialog).getByLabelText('Expense description').closest('form')!,
    );
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9000,
          treatment: 'IN_PRODUCTION_COST',
          attribution: 'GENERAL',
          marketId: null,
        }),
      ),
    );
  });
  it('keeps expense rows compact and edits inside the existing detail modal', async () => {
    const api = apiMock();
    render(<Finances api={api} path="/vendor/finances/expenses" />);
    await screen.findByRole('button', { name: 'Open Juicer repair' });
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Open Juicer repair' }));
    await screen.findByRole('button', { name: 'Edit expense' });
    expect(
      within(screen.getByRole('dialog')).getByText('Expense history'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit expense' }));
    expect(screen.getByLabelText('Expense description')).toHaveValue(
      'Juicer repair',
    );
    fireEvent.change(screen.getByLabelText('Amount (USD)'), {
      target: { value: '280.00' },
    });
    fireEvent.submit(
      screen.getByLabelText('Expense description').closest('form')!,
    );
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: expense.id, version: 1, amount: 28000 }),
      ),
    );
  });
  it('renders the shared expense disclosure as a chronological readable audit log without changing the current amount', async () => {
    const api: FinanceApi = apiMock();
    const initial = {
      amount: '10000',
      currency: 'USD',
      category: 'Packaging',
      voided: false,
    };
    const reduced = { ...initial, amount: '8000', category: 'Equipment' };
    const audit = [
      {
        id: 'internal-event-2',
        action: 'EDIT',
        created_at: '2026-10-21T18:00:00Z',
        before_value: initial,
        after_value: reduced,
      },
      {
        id: 'internal-event-1',
        action: 'CREATE',
        created_at: '2026-10-21T17:00:00Z',
        before_value: null,
        after_value: initial,
      },
    ];
    const unchanged = structuredClone(audit);
    vi.mocked(api.detail).mockResolvedValue({
      expense: { ...expense, amount: 8000 },
      history: audit,
      receipts: [],
    });
    render(<Finances api={api} path="/vendor/finances/expenses" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Juicer repair' }),
    );
    const loadedDialog = await screen.findByRole('dialog', {
      name: 'Juicer repair',
    });
    const summary = within(loadedDialog).getByText('Expense history');
    expect(summary.closest('details')).toHaveClass('ui-disclosure');
    fireEvent.click(summary);
    const log = screen.getByRole('list', { name: 'Expense activity' });
    expect(log.children[0]).toHaveTextContent('Created $100.00');
    expect(log.children[1]).toHaveTextContent(
      'Reduced -$20.00 · Category changed to Equipment',
    );
    expect(log.querySelectorAll('time')).toHaveLength(2);
    expect(screen.getByRole('dialog')).toHaveTextContent('$80.00');
    expect(log).not.toHaveTextContent('internal-event');
    expect(log).not.toHaveTextContent('before_value');
    expect(log.querySelector('pre')).toBeNull();
    expect(audit).toEqual(unchanged);
    expect(api.save).not.toHaveBeenCalled();
  });
  it('keeps transaction rows compact and details accessible', async () => {
    render(<Finances api={apiMock()} path="/vendor/finances/transactions" />);
    const row = await screen.findByRole('button', {
      name: 'Open Green Garden Juice · 30',
    });
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    fireEvent.click(row);
    expect(
      within(screen.getByRole('dialog')).getByText('Production cost'),
    ).toBeVisible();
  });
  it('searches and paginates order rows while keeping products, taxes and refund events inside details', async () => {
    const api = apiMock();
    api.report.mockResolvedValue({
      ...report,
      orderTransactions: Array.from({ length: 21 }, (_, i) => ({
        id: String(i),
        orderId: String(i),
        orderCode: `CHECKOUT-${i}`,
        date: '2026-09-02T12:00:00Z',
        currency: 'USD',
        marketId: null,
        occurrenceId: null,
        method: 'CASH',
        status: 'Partially refunded',
        gross: 2500,
        discount: 500,
        subtotal: 2000,
        tax: 165,
        shipping: 0,
        payment: 2165,
        refund: 433,
        refundedTax: 33,
        remaining: 1732,
        lines: [
          {
            id: 'honey',
            name: 'Honey',
            quantity: 1,
            gross: 1000,
            discount: 200,
            subtotal: 800,
            tax: 66,
            payment: 866,
          },
          {
            id: 'jam',
            name: 'Jam',
            quantity: 1,
            gross: 800,
            discount: 160,
            subtotal: 640,
            tax: 53,
            payment: 693,
          },
          {
            id: 'bread',
            name: 'Bread',
            quantity: 1,
            gross: 700,
            discount: 140,
            subtotal: 560,
            tax: 46,
            payment: 606,
          },
        ],
        events: [
          {
            id: 'sale',
            kind: 'Sale',
            date: '2026-09-02T12:00:00Z',
            amount: 2165,
            tax: 165,
          },
          {
            id: 'refund',
            kind: 'Refund',
            date: '2026-09-03T12:00:00Z',
            amount: 433,
            tax: 33,
          },
        ],
      })),
    });
    render(<Finances api={api} path="/vendor/finances/transactions" />);
    const row = await screen.findByRole('button', {
      name: 'Open Order CHECKOUT-0',
    });
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: /Open Order CHECKOUT-/ }),
    ).toHaveLength(20);
    expect(screen.getByText('21 records')).toBeVisible();
    fireEvent.click(row);
    const dialog = within(screen.getByRole('dialog'));
    for (const name of ['Honey', 'Jam', 'Bread'])
      expect(dialog.getByText(new RegExp(name))).toBeVisible();
    expect(
      dialog.getByText('Sales tax collected').parentElement,
    ).toHaveTextContent('$1.65');
    expect(
      dialog.getByText('Merchandise subtotal').parentElement,
    ).toHaveTextContent('$20.00');
    expect(
      dialog.getByText('Customer payment for your items').parentElement,
    ).toHaveTextContent('$21.65');
    expect(
      dialog.getByText('Refunded to customer').parentElement,
    ).toHaveTextContent('$4.33');
    expect(dialog.getByText(/Refund ·/)).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.getAllByRole('button', { name: /Open Order CHECKOUT-/ }),
    ).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search transactions'), {
      target: { value: 'CHECKOUT-20' },
    });
    expect(
      screen.getByRole('button', { name: 'Open Order CHECKOUT-20' }),
    ).toBeVisible();
    expect(screen.getByText('1 records')).toBeVisible();
  });
  it('adapts manager reporting without displaying vendor product analytics', async () => {
    const api = apiMock();
    api.options.mockResolvedValue({ ...options, kind: 'MARKET' });
    api.report.mockResolvedValue({
      ...report,
      kind: 'MARKET',
      products: [],
      events: [{ id: '9', name: 'September 2', profit: 8000 }],
      outstanding: 1500,
    });
    history.replaceState(
      null,
      '',
      '/market/finances?' + new URLSearchParams({ ...scope }),
    );
    render(<Finances api={api} path="/market/finances" manager />);
    expect(await screen.findByText('Profit by event')).toBeVisible();
    expect(screen.queryByText('Profit by product')).not.toBeInTheDocument();
    expect(screen.getByText('Outstanding fees: $15.00')).toBeVisible();
  });
  it('saves private costs and preserves an explicit unknown value', async () => {
    const api = apiMock();
    render(<ProductionCost api={api} variantId="6" currency="USD" />);
    const input = await screen.findByLabelText(
      'Cost to produce (USD, optional)',
    );
    expect(input).toHaveValue('2.50');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(api.setCost).toHaveBeenCalledWith('6', null));
  });
  it('aggregates weeks without losing negative days or totals', () => {
    const grouped = buckets(report.daily, 'monthly');
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.profit).toBe(3500);
    const { container } = render(
      <FinancialGraph report={report} series={['profit']} group="daily" />,
    );
    expect(container.querySelectorAll('.finance-negative-point')).toHaveLength(
      1,
    );
  });
  it('shows helpful empty states and does not display old records after an error', async () => {
    const api = apiMock();
    api.report.mockResolvedValue({
      ...report,
      products: [],
      categories: [],
      transactions: [],
      expenses: [],
    });
    render(<Finances api={api} path="/vendor/finances" />);
    expect((await screen.findAllByText('No matching activity')).length).toBe(3);
  });
});
