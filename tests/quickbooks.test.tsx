import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  QuickBooks,
  quickBooksError,
} from '../apps/admin/src/finance/QuickBooks';
import type { QuickBooksApi, QuickBooksStatus } from '@market/api';

function fixture(overrides: Partial<QuickBooksStatus> = {}) {
  const data: QuickBooksStatus = {
    environment: 'sandbox',
    configured: true,
    kind: 'VENDOR',
    status: 'CONNECTED',
    company: 'Sandbox farm',
    realm: '123',
    lastSuccess: null,
    counts: [],
    settings: { sources: [], mappings: {}, active: false },
    ...overrides,
  };
  const api: QuickBooksApi = {
    status: vi.fn(async () => structuredClone(data)),
    prepareAutomation: vi.fn(async () => ({
      token: 'consent',
      since: '2026-10-21T18:00:00.000Z',
    })),
    automation: vi.fn(async (input) => {
      data.automation = {
        enabled: input.enabled,
        since: '2026-10-21T18:00:00.000Z',
        lastCheck: null,
        error: null,
      };
    }),
    begin: vi.fn(async () => ({
      url: 'https://appcenter.intuit.com/connect/oauth2',
    })),
    complete: vi.fn(async () => ({})),
    salesMappings: vi.fn(async () => ({
      enabled: true,
      items: [],
      customers: [],
      codes: [],
    })),
    accounts: vi.fn(async () => [
      { Id: '1', Name: 'Income account', AccountType: 'Income', Active: true },
      { Id: '2', Name: 'Cash account', AccountType: 'Bank', Active: true },
    ]),
    save: vi.fn(async (input) => {
      data.settings = input;
    }),
    preview: vi.fn(async () => ({
      previewToken: 'preview',
      items: [
        {
          id: 'expense:1',
          date: '2026-09-02',
          source: 'expenses',
          status: 'ELIGIBLE',
          reason: '',
        },
        {
          id: 'sale:1',
          date: '2026-09-02',
          source: 'stripe',
          status: 'EXCLUDED',
          reason: 'Tax unsupported',
        },
      ],
    })),
    sync: vi.fn(async () => ({
      completed: true,
      created: 1,
      reconciled: 0,
      failed: 0,
      noOp: false,
    })),
    disconnect: vi.fn(async () => ({})),
    history: vi.fn(async () => [
      {
        id: 'r1',
        event_id: 'expense:1',
        event_date: '2026-09-02',
        source: 'expenses',
        status: 'RETRY',
        realm: '123',
        entity_type: 'JournalEntry',
        entity_id: null,
        attempts: 1,
        error: 'QBO_RATE_LIMIT',
        last_attempt: null,
        success_at: null,
        payload: {},
      },
    ]),
  };
  return { api, data };
}
async function dates() {
  fireEvent.change(await screen.findByLabelText('From'), {
    target: { value: '2026-09-01' },
  });
  fireEvent.change(screen.getByLabelText('Through'), {
    target: { value: '2026-09-02' },
  });
}
describe('QuickBooks finance settings', () => {
  it.each([
    ['QBO_MAPPING_INVALID_REVENUE', /Revenue account.*Income/],
    ['QBO_MAPPING_INVALID_CASH', /Cash on hand.*Bank or Other Current Asset/],
    [
      'QBO_MAPPING_INVALID_EXPENSE_EQUIPMENT',
      /equipment.*Expense or Cost of Goods Sold/,
    ],
    [
      'QBO_SALES_MAPPING_INVALID_ITEM_REVENUE',
      /income account must match.*Revenue/,
    ],
    ['QBO_SALES_MAPPING_INVALID_CUSTOMER', /FMP Walk-in/],
    ['QBO_SALES_MAPPING_INVALID_TAX_RATE', /tax agency/],
  ])('explains the specific invalid mapping %s', (code, message) => {
    expect(quickBooksError(code as string)).toMatch(message as RegExp);
  });
  it.each([
    ['QBO_AUTHORITY_CHANGED', /last automatic check could not authorize/i],
    ['QBO_MAPPING_INVALID_REVENUE', /Revenue account/],
  ])(
    'shows the actual worker failure without an uncertain-write warning for %s',
    async (error, message) => {
      const { api } = fixture({
        automation: {
          enabled: true,
          since: null,
          lastCheck: null,
          error: error as string,
          state: 'BLOCKED',
        },
      });
      render(<QuickBooks api={api} categories={['Equipment']} />);
      expect(await screen.findByText(message as RegExp)).toBeVisible();
      expect(
        screen.queryByText(/may be paused for review/),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/history contains uncertain/),
      ).not.toBeInTheDocument();
    },
  );
  it('suppresses stale review errors when history has no blocking records', async () => {
    const { api } = fixture({
      automation: {
        enabled: true,
        since: null,
        lastCheck: null,
        error: 'QBO_REVIEW_REQUIRED',
        state: 'ON',
      },
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    await screen.findByRole('switch', { name: 'Automatic Synchronization' });
    expect(
      screen.queryByText(/Automatic sync is paused/),
    ).not.toBeInTheDocument();
  });
  it('shows reconciliation guidance only for actual uncertain records', async () => {
    const { api } = fixture({
      automation: {
        enabled: true,
        since: null,
        lastCheck: null,
        error: 'QBO_REVIEW_REQUIRED',
        state: 'REVIEW',
      },
      counts: [{ status: 'UNCERTAIN', count: 1 }],
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    expect(await screen.findByText(/history contains uncertain/)).toBeVisible();
  });
  it('explains renewed consent while off without mislabeling it as provider uncertainty', async () => {
    const { api } = fixture({
      automation: {
        enabled: false,
        since: null,
        lastCheck: null,
        error: 'QBO_AUTOMATION_RECONSENT_REQUIRED',
        state: 'AWAITING_CONSENT',
      },
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    expect(
      await screen.findByText(/off because selected export settings changed/),
    ).toBeVisible();
    expect(
      screen.queryByText(/history contains uncertain/),
    ).not.toBeInTheDocument();
  });

  it('requires renewed acknowledgment after a saved source expansion pauses automation', async () => {
    const { api, data } = fixture({
      automation: {
        enabled: true,
        since: '2026-10-21T18:00:00Z',
        lastCheck: null,
        error: null,
      },
      settings: {
        sources: ['expenses'],
        mappings: { spending: '2' },
        active: true,
      },
    });
    api.save = vi.fn(async (input) => {
      data.settings = input;
      data.automation = { ...data.automation!, enabled: false };
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Platform cash sales' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Automatic Synchronization' }),
      ).not.toBeChecked(),
    );
    expect(api.automation).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Automatic Synchronization' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Enable Automatic QuickBooks Sync?',
    });
    expect(within(dialog).getByRole('checkbox')).not.toBeChecked();
    expect(
      within(dialog).getByRole('button', { name: 'Enable Automatic Sync' }),
    ).toBeDisabled();
  });

  it('shows the persistent external-duplicate explanation while disconnected and leaves manual sync available', async () => {
    const { api } = fixture({
      status: 'DISCONNECTED',
      realm: null,
      company: null,
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    expect(
      await screen.findByRole('switch', { name: 'Automatic Synchronization' }),
    ).not.toBeChecked();
    expect(
      screen.getByText(/Square, Clover, Stripe, or another payment processor/),
    ).toBeVisible();
    expect(
      screen.getByText(
        /cannot reliably detect entries created by other integrations/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'View Sync History' }),
    ).toBeEnabled();
  });
  it('requires unchecked duplicate acknowledgment and shows the server cutoff before activation', async () => {
    const { api } = fixture({
      settings: {
        sources: ['cash'],
        mappings: { revenue: '1', cash: '2' },
        active: true,
      },
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    fireEvent.click(
      await screen.findByRole('switch', { name: 'Automatic Synchronization' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Enable Automatic QuickBooks Sync?',
    });
    const confirm = within(dialog).getByRole('button', {
      name: 'Enable Automatic Sync',
    });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByText(/2026-10-21T18:00:00.000Z/)).toBeVisible();
    const acknowledgment = within(dialog).getByRole('checkbox');
    expect(acknowledgment).not.toBeChecked();
    expect(api.automation).not.toHaveBeenCalled();
    fireEvent.click(acknowledgment);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(api.automation).toHaveBeenCalledWith({
        enabled: true,
        token: 'consent',
        acknowledgeDuplicates: true,
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Automatic Synchronization' }),
      ).toBeChecked(),
    );
  });
  it('cancel does not enable and disable preserves the manual controls', async () => {
    const { api } = fixture({
      settings: { sources: ['cash'], mappings: {}, active: true },
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    fireEvent.click(
      await screen.findByRole('switch', { name: 'Automatic Synchronization' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Enable Automatic QuickBooks Sync?',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.automation).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Preview Sync' })).toBeVisible();
  });
  it('turns automatic sync off independently and preserves Preview Sync', async () => {
    const { api } = fixture({
      automation: {
        enabled: true,
        since: '2026-10-21T18:00:00Z',
        lastCheck: null,
        error: null,
      },
    });
    render(<QuickBooks api={api} categories={['Equipment']} />);
    fireEvent.click(
      await screen.findByRole('switch', { name: 'Automatic Synchronization' }),
    );
    await waitFor(() =>
      expect(api.automation).toHaveBeenCalledWith({ enabled: false }),
    );
    expect(
      await screen.findByRole('button', { name: 'Preview Sync' }),
    ).toBeVisible();
    expect(api.disconnect).not.toHaveBeenCalled();
  });

  it('shows confirmed refund evidence and original accounting linkage in the existing details dialog', async () => {
    const { api } = fixture({
      settings: { active: true, sources: ['cash'], mappings: {} },
    });
    vi.mocked(api.preview).mockResolvedValue({
      previewToken: 'refund',
      items: [
        {
          id: 'refund:1',
          date: '2026-10-21',
          source: 'cash',
          status: 'ELIGIBLE',
          reason: '',
          entityType: 'RefundReceipt',
          amounts: { merchandise: 2000, discount: 0, tax: 165, payment: 2165 },
          adjustment: {
            kind: 'REFUND',
            original: {
              recordId: 'r1',
              eventId: 'sale:1',
              entityType: 'SalesReceipt',
              entityId: '42',
              date: '2026-10-15',
            },
            orderId: '15',
            refundOperationId: '9',
          },
        },
      ],
    });
    render(<QuickBooks api={api} categories={[]} />);
    fireEvent.change(await screen.findByLabelText('From'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText('Through'), {
      target: { value: '2026-10-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    fireEvent.click(await screen.findByRole('button', { name: 'refund:1' }));
    const dialog = screen.getByRole('dialog', { name: 'refund:1' });
    expect(within(dialog).getByText(/SalesReceipt 42/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Original order: 15/)).toBeInTheDocument();
    expect(within(dialog).getByText('Tax refunded')).toBeInTheDocument();
    expect(within(dialog).getByText('$1.65')).toBeInTheDocument();
    expect(within(dialog).getByText('$21.65')).toBeInTheDocument();
    expect(api.sync).not.toHaveBeenCalled();
  });

  it.each(['EXPENSE_CORRECTION', 'EXPENSE_VOID'] as const)(
    'previews and confirms %s using original and corrected amounts',
    async (kind) => {
      const { api } = fixture({
        settings: { active: true, sources: ['expenses'], mappings: {} },
      });
      vi.mocked(api.preview).mockResolvedValue({
        previewToken: 'correction',
        items: [
          {
            id: 'expense-correction:e:v2',
            date: '2026-10-21',
            source: 'expenses',
            status: 'ELIGIBLE',
            reason: '',
            entityType: 'JournalEntry',
            adjustment: {
              kind,
              original: {
                recordId: 'r1',
                eventId: 'expense:e',
                entityType: 'JournalEntry',
                entityId: '42',
                date: '2026-10-15',
              },
              previous: { recordId: 'r1', entityId: '42' },
              originalAmount: 10000,
              correctedAmount: kind === 'EXPENSE_VOID' ? 0 : 8000,
              version: 2,
            },
          },
        ],
      });
      render(<QuickBooks api={api} categories={[]} />);
      fireEvent.change(await screen.findByLabelText('From'), {
        target: { value: '2026-10-01' },
      });
      fireEvent.change(screen.getByLabelText('Through'), {
        target: { value: '2026-10-31' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
      fireEvent.click(
        await screen.findByRole('button', { name: 'expense-correction:e:v2' }),
      );
      const dialog = screen.getByRole('dialog', {
        name: 'expense-correction:e:v2',
      });
      expect(
        within(dialog).getByText(/Original expense amount: \$100.00/),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(
          kind === 'EXPENSE_VOID'
            ? /Corrected amount: \$0.00/
            : /Corrected amount: \$80.00/,
        ),
      ).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Sync Now' }));
      expect(api.sync).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          /Expense corrections reverse the saved previous expense/,
        ),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirm sandbox export' }),
      );
      await waitFor(() =>
        expect(api.sync).toHaveBeenCalledWith(
          expect.objectContaining({
            previewToken: 'correction',
            confirmHistorical: true,
          }),
        ),
      );
    },
  );
  it('shows original tax amounts, entity type and a retained tax mismatch warning in record details', async () => {
    const { api } = fixture({
      settings: { active: true, sources: ['cash'], mappings: {} },
    });
    vi.mocked(api.preview).mockResolvedValue({
      previewToken: 'tax',
      items: [
        {
          id: 'sale:tax',
          date: '2026-10-15',
          source: 'cash',
          status: 'NEEDS_ATTENTION',
          reason: 'QBO_TAX_REVIEW_REQUIRED',
          entityType: 'SalesReceipt',
          amounts: {
            merchandise: 2000,
            discount: 200,
            tax: 149,
            payment: 1949,
          },
        },
      ],
    });
    render(<QuickBooks api={api} categories={[]} />);
    await dates();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    fireEvent.click(await screen.findByRole('button', { name: 'sale:tax' }));
    const dialog = screen.getByRole('dialog', { name: 'sale:tax' });
    expect(
      within(dialog).getByText('Transaction type: SalesReceipt'),
    ).toBeVisible();
    for (const value of ['$20.00', '$2.00', '$1.49', '$19.49'])
      expect(within(dialog).getByText(value)).toBeVisible();
    expect(
      within(dialog).getByText(/tax treatment or amounts differ/),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
  });
  it('offers ordinary tax liability accounts and retains legacy mappings without native tax setup', async () => {
    const sales = {
      itemId: '10',
      customerId: '20',
      taxCodeId: '30',
      vendorResponsible: true,
    };
    const { api } = fixture({
      settings: { sources: ['cash'], mappings: {}, active: true, sales },
    });
    vi.mocked(api.accounts).mockResolvedValue([
      {
        Id: '5',
        Name: 'Collected tax',
        Active: true,
        AccountType: 'Other Current Liability',
        AccountSubType: 'OtherCurrentLiabilities',
      },
      {
        Id: '6',
        Name: 'Agency tax',
        Active: true,
        AccountType: 'Other Current Liability',
        AccountSubType: 'SalesTaxPayable',
      },
      {
        Id: '7',
        Name: 'Inactive liability',
        Active: false,
        AccountType: 'Other Current Liability',
        AccountSubType: 'OtherCurrentLiabilities',
      },
    ]);
    render(<QuickBooks api={api} categories={[]} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load company accounts' }),
    );
    const select = await screen.findByLabelText(
      'Collected Sales Tax Liability',
    );
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(
      within(select).getByRole('option', { name: 'Collected tax' }),
    ).toBeVisible();
    expect(
      within(select).queryByRole('option', { name: 'Agency tax' }),
    ).toBeNull();
    expect(
      within(select).queryByRole('option', { name: 'Inactive liability' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Load sales mappings' }),
    ).toBeNull();
    expect(
      screen.getByText(/do not automatically populate QuickBooks/),
    ).toBeVisible();
    fireEvent.change(select, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({ sales, mappings: { taxLiability: '5' } }),
      ),
    );
    expect(api.salesMappings).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'disables an already synchronized preview for manager=%s',
    async (manager) => {
      const { api } = fixture({
        settings: { sources: ['expenses'], mappings: {}, active: true },
      });
      vi.mocked(api.preview).mockResolvedValue({
        previewToken: 'done',
        items: [
          {
            id: 'expense:1',
            date: '2026-09-22',
            source: 'expenses',
            status: 'SUCCEEDED',
            reason: 'Already synchronized',
          },
        ],
      });
      render(<QuickBooks api={api} manager={manager} categories={[]} />);
      await dates();
      fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
      expect(
        await screen.findByText(
          'All selected records are already synchronized.',
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          '0 new eligible · 1 already synchronized · 0 excluded · 0 need attention',
        ),
      ).toBeVisible();
      expect(screen.getByText('succeeded')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
      expect(api.sync).not.toHaveBeenCalled();
      expect(
        screen.queryByText(/Synchronization finished/),
      ).not.toBeInTheDocument();
    },
  );
  it.each([true, false])(
    'disables a preview with no eligible work, exclusions=%s',
    async (hasExclusions) => {
      const { api } = fixture({
        settings: { sources: ['expenses'], mappings: {}, active: true },
      });
      vi.mocked(api.preview).mockResolvedValue({
        previewToken: 'empty',
        items: hasExclusions
          ? [
              {
                id: 'sale:1',
                date: '2026-09-22',
                source: 'stripe',
                status: 'EXCLUDED',
                reason: 'Tax unsupported',
              },
            ]
          : [],
      });
      render(<QuickBooks api={api} categories={[]} />);
      await dates();
      fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
      expect(
        await screen.findByText(
          hasExclusions
            ? 'No eligible records. Review exclusions for details.'
            : 'No new transactions available to synchronize.',
        ),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
      expect(api.sync).not.toHaveBeenCalled();
    },
  );
  it('distinguishes attention records and preserves confirmed recovery without enabling Sync Now', async () => {
    const { api } = fixture({
      settings: { sources: ['expenses'], mappings: {}, active: true },
    });
    vi.mocked(api.preview).mockResolvedValue({
      previewToken: 'retry',
      items: [
        {
          id: 'expense:1',
          date: '2026-09-22',
          source: 'expenses',
          status: 'RETRY',
          reason: 'QBO_RATE_LIMIT',
          payload: {},
        },
      ],
    });
    vi.mocked(api.sync).mockResolvedValue({
      completed: true,
      created: 0,
      reconciled: 1,
      failed: 0,
      noOp: false,
    });
    render(<QuickBooks api={api} categories={[]} />);
    await dates();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    expect(
      await screen.findByText(
        'No new eligible records. Review records requiring attention.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry / reconcile records' }),
    );
    expect(api.sync).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm sandbox export' }),
    );
    expect(
      await screen.findByText(
        'No new records exported. 1 existing record reconciled.',
      ),
    ).toBeVisible();
  });
  it.each(['created', 'noop', 'failed', 'rejected'] as const)(
    'reports the actual sync outcome: %s',
    async (outcome) => {
      const { api } = fixture({
        settings: { sources: ['expenses'], mappings: {}, active: true },
      });
      if (outcome === 'rejected')
        vi.mocked(api.sync).mockRejectedValue(new Error('Sync request failed'));
      else
        vi.mocked(api.sync).mockResolvedValue({
          completed: true,
          created: outcome === 'created' ? 1 : 0,
          reconciled: 0,
          failed: outcome === 'failed' ? 1 : 0,
          noOp: outcome === 'noop',
        });
      render(<QuickBooks api={api} categories={[]} />);
      await dates();
      fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Sync Now' })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Sync Now' }));
      expect(api.sync).not.toHaveBeenCalled();
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirm sandbox export' }),
      );
      const expected =
        outcome === 'created'
          ? '1 new record synchronized.'
          : outcome === 'noop'
            ? 'No new records were synchronized. Preview again and review exclusions or records requiring attention.'
            : outcome === 'failed'
              ? '0 new records synchronized. Some records require attention. Review history for details.'
              : 'Sync request failed';
      expect(await screen.findByText(expected)).toBeVisible();
      expect(
        screen.queryByText(/Synchronization finished/),
      ).not.toBeInTheDocument();
      if (outcome !== 'created')
        expect(
          screen.queryByText('1 new record synchronized.'),
        ).not.toBeInTheDocument();
    },
  );
  it('completes an authenticated OAuth return once and removes callback parameters', async () => {
    window.history.replaceState(
      null,
      '',
      '/vendor/finances/quickbooks?code=mock-code&state=mock-state&realmId=123',
    );
    const { api } = fixture();
    render(<QuickBooks api={api} categories={[]} />);
    await waitFor(() =>
      expect(api.complete).toHaveBeenCalledExactlyOnceWith({
        code: 'mock-code',
        state: 'mock-state',
        realmId: '123',
      }),
    );
    expect(location.search).toBe('');
    expect(await screen.findByText(/Sandbox company connected/)).toBeVisible();
    expect(api.sync).not.toHaveBeenCalled();
  });
  it('rejects duplicate callback parameters and scrubs the URL', async () => {
    window.history.replaceState(
      null,
      '',
      '/vendor/finances/quickbooks?code=a&state=one&state=two&realmId=123',
    );
    const { api } = fixture();
    render(<QuickBooks api={api} categories={[]} />);
    expect(
      await screen.findByText('Invalid QuickBooks callback. Connect again.'),
    ).toBeVisible();
    expect(api.complete).not.toHaveBeenCalled();
    expect(location.search).toBe('');
  });
  it('labels sandbox and configuration status without offering unconfigured connection', async () => {
    const { api } = fixture({
      configured: false,
      status: 'DISCONNECTED',
      company: null,
    });
    render(<QuickBooks api={api} categories={[]} />);
    expect(await screen.findByText('Sandbox')).toBeVisible();
    expect(
      await screen.findByRole('button', { name: 'Connect QuickBooks' }),
    ).toBeDisabled();
    expect(
      screen.queryByLabelText('Platform cash sales'),
    ).not.toBeInTheDocument();
  });
  it('warns about external duplicates, selects sources and filters company account types', async () => {
    const { api } = fixture();
    render(<QuickBooks api={api} categories={['Equipment']} />);
    fireEvent.click(await screen.findByLabelText('Platform cash sales'));
    expect(
      screen.getByText(/already export through another integration/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Load company accounts' }),
    );
    await waitFor(() => expect(api.accounts).toHaveBeenCalledOnce());
    const revenue = screen.getByLabelText('Revenue');
    await waitFor(() => expect(revenue).toBeEnabled());
    expect(within(revenue).getByText('Income account')).toBeInTheDocument();
    expect(within(revenue).queryByText('Cash account')).not.toBeInTheDocument();
    fireEvent.change(revenue, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sources: ['cash'],
          mappings: { revenue: '1' },
        }),
      ),
    );
  });
  it('uses manager sources and hides vendor merchandise sources', async () => {
    const { api } = fixture({ kind: 'MARKET' });
    render(<QuickBooks api={api} manager categories={[]} />);
    expect(
      await screen.findByLabelText('Cash market collections'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Stripe online orders'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to Finances' }),
    ).toHaveAttribute('href', '/market/finances');
  });
  it('previews without writing, requires confirmation and invalidates preview when dates change', async () => {
    const { api } = fixture({
      settings: { sources: ['expenses'], mappings: {}, active: true },
    });
    render(<QuickBooks api={api} categories={[]} />);
    await dates();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    expect(
      await screen.findByText(
        '1 new eligible · 0 already synchronized · 1 excluded · 0 need attention',
      ),
    ).toBeVisible();
    expect(api.sync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sync Now' }));
    expect(api.sync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sync Now' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm sandbox export' }),
    );
    await waitFor(() =>
      expect(api.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          previewToken: 'preview',
          confirmHistorical: true,
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled(),
    );
  });
  it('shows excluded reasons and history details with retry guidance', async () => {
    const { api } = fixture();
    render(<QuickBooks api={api} categories={[]} />);
    await dates();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    fireEvent.click(await screen.findByRole('button', { name: 'sale:1' }));
    expect(await screen.findByText('Tax unsupported')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Sync History' }));
    expect(await screen.findByText(/To retry eligible failures/)).toBeVisible();
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Synchronization history' }),
      ).getByRole('button', { name: 'expense:1' }),
    );
    expect(await screen.findByText('QBO_RATE_LIMIT')).toBeVisible();
  });
  it('displays recoverable errors and confirms disconnect', async () => {
    const { api } = fixture();
    vi.mocked(api.preview).mockRejectedValueOnce(new Error('QBO_RATE_LIMIT'));
    render(<QuickBooks api={api} categories={[]} />);
    await dates();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    expect(await screen.findByText('QBO_RATE_LIMIT')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Preview Sync' }));
    expect(
      await screen.findByText(
        '1 new eligible · 0 already synchronized · 1 excluded · 0 need attention',
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(api.disconnect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect' }));
    await waitFor(() => expect(api.disconnect).toHaveBeenCalledOnce());
  });
});
