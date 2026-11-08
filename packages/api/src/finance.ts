import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { safeError } from './errors';
import { uploadDocumentFile } from './document-upload';
import type { QuickBooksApi } from './quickbooks';
export interface FinanceScope {
  timezone?: string;
  from: string;
  through: string;
  market: string;
  currency: string;
}
export interface FinanceTotals {
  gross: number;
  discounts: number;
  refunds: number;
  netSales: number;
  productionCosts: number;
  processingFees: number;
  platformFees: number;
  marketFees: number;
  deductibleExpenses: number;
  recordedSpending: number;
  totalExpenses: number;
  profit: number;
  orders: number;
  missingCostUnits: number;
  unknownFeeSales: number;
}
export interface FinanceActivity {
  id: string;
  date: string;
  marketId: string | null;
  occurrenceId: string | null;
  variantId: string | null;
  name: string;
  orderId: string;
  kind: 'SALE' | 'REFUND' | 'COST';
  marketFee?: number;
  quantity: number;
  gross: number;
  discount: number;
  refund: number;
  productionCost: number | null;
  processingFee: number | null;
  platformFee: number;
  currency: string;
  method: string;
  /** Checkout context of a sale or refund, when the backend reports it. */
  channel?: 'DIRECT_VENDOR' | 'MARKET_OCCURRENCE' | 'IN_PERSON' | (string & {});
}
export interface FinanceExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  spentOn: string;
  category: string;
  attribution: 'MARKET' | 'INDEPENDENT' | 'GENERAL';
  marketId: string | null;
  occurrenceId: string | null;
  treatment: 'DEDUCT' | 'IN_PRODUCTION_COST' | 'IN_AUTOMATIC_FEES';
  payee: string;
  notes: string;
  version: number;
  voided: boolean;
}
export interface FinanceOrderTransaction {
  id: string;
  orderId: string;
  orderCode: string;
  date: string;
  currency: string;
  marketId: string | null;
  occurrenceId: string | null;
  method: string;
  /** Checkout context, when the backend reports it. */
  channel?: FinanceActivity['channel'];
  status: 'Paid' | 'Partially refunded' | 'Refunded';
  gross: number;
  discount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  payment: number;
  refund: number;
  refundedTax: number;
  remaining: number;
  lines: Array<{
    id: string;
    name: string;
    quantity: number;
    gross: number;
    discount: number;
    subtotal: number;
    tax: number;
    payment: number;
  }>;
  events: Array<{
    id: string;
    date: string;
    kind: string;
    amount: number;
    tax: number;
  }>;
}
export interface FinanceProduct {
  id: string;
  name: string;
  units: number;
  gross: number;
  discounts: number;
  refunds: number;
  revenue: number;
  productionCosts: number;
  contribution: number;
  missingCostUnits: number;
}
export interface FinanceReport {
  unattributedSales?: number;
  scope: FinanceScope;
  kind: 'VENDOR' | 'MARKET';
  asOf: string;
  costPolicy: string;
  summary: FinanceTotals;
  daily: Array<FinanceTotals & { date: string }>;
  products: FinanceProduct[];
  categories: Array<{ name: string; spending: number; deducted: number }>;
  transactions: FinanceActivity[];
  orderTransactions?: FinanceOrderTransaction[];
  expenses: FinanceExpense[];
  events?: Array<{ id: string; name: string; profit: number }>;
  outstanding?: number;
}
export interface FinanceOptions {
  timezone?: string;
  canManageExpenses?: boolean;
  kind: 'VENDOR' | 'MARKET';
  currency: string;
  currencies: string[];
  markets: Array<{ id: string; name: string }>;
  events: Array<{ id: string; marketId: string; date: string }>;
  categories: string[];
}
export interface ExpenseDetails {
  expense: FinanceExpense;
  history: Array<{
    id: string;
    action: string;
    created_at: string;
    before_value: unknown;
    after_value: unknown;
  }>;
  receipts: Array<{
    id: string;
    filename: string;
    mime: string;
    status: string;
  }>;
}
export interface ProductionCost {
  id: string;
  unitCost: number | null;
  currency: string;
  effectiveAt: string;
}
export function createFinanceApi(
  options: TransportOptions & {
    channelToken: string;
    onAuthorityFailure?: () => void;
  },
) {
  const run = transport('admin', options);
  const handle = (error: unknown): never => {
    const e = safeError(error);
    if (['forbidden', 'authentication'].includes(e.kind))
      options.onAuthorityFailure?.();
    throw e;
  };
  const execute = async <T>(
    source: string,
    field: string,
    variables: Record<string, unknown> = {},
  ) =>
    (
      await run(
        {
          api: 'admin',
          document: parse(source) as TypedDocumentNode<
            Record<string, T>,
            Record<string, unknown>
          >,
        },
        variables,
      ).catch(handle)
    )[field]!;
  return {
    quickbooks: {
      prepareAutomation: () =>
        execute(
          'mutation { prepareOwnQuickBooksAutomation }',
          'prepareOwnQuickBooksAutomation',
        ),
      automation: (input) =>
        execute(
          'mutation($input:JSON!){setOwnQuickBooksAutomation(input:$input)}',
          'setOwnQuickBooksAutomation',
          { input },
        ),
      status: () => execute('query { ownQuickBooks }', 'ownQuickBooks'),
      begin: () =>
        execute('mutation { beginOwnQuickBooks }', 'beginOwnQuickBooks'),
      complete: (input) =>
        execute(
          'mutation($input:JSON!){completeOwnQuickBooks(input:$input)}',
          'completeOwnQuickBooks',
          { input },
        ),
      salesMappings: () =>
        execute(
          'mutation { ownQuickBooksSalesMappings }',
          'ownQuickBooksSalesMappings',
        ),
      accounts: () =>
        execute('mutation { ownQuickBooksAccounts }', 'ownQuickBooksAccounts'),
      save: (input) =>
        execute(
          'mutation($input:JSON!){saveOwnQuickBooks(input:$input)}',
          'saveOwnQuickBooks',
          { input },
        ),
      preview: (input) =>
        execute(
          'mutation($input:JSON!){previewOwnQuickBooks(input:$input)}',
          'previewOwnQuickBooks',
          { input },
        ),
      sync: (input) =>
        execute(
          'mutation($input:JSON!){syncOwnQuickBooks(input:$input)}',
          'syncOwnQuickBooks',
          { input },
        ),
      history: (offset) =>
        execute(
          'query($offset:Int){ownQuickBooksHistory(offset:$offset)}',
          'ownQuickBooksHistory',
          { offset },
        ),
      disconnect: () =>
        execute(
          'mutation { disconnectOwnQuickBooks }',
          'disconnectOwnQuickBooks',
        ),
    } satisfies QuickBooksApi,
    options: () =>
      execute<FinanceOptions>(
        'query FinanceOptions($timezone:String) { ownFinanceOptions(timezone:$timezone) }',
        'ownFinanceOptions',
        { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      ),
    report: (input: FinanceScope) =>
      execute<FinanceReport>(
        'query FinanceReport($input:JSON!){ownFinanceReport(input:$input)}',
        'ownFinanceReport',
        { input },
      ),
    export: (input: FinanceScope) =>
      execute<{ filename: string; content: string }>(
        'query FinanceExport($input:JSON!){ownFinanceExport(input:$input)}',
        'ownFinanceExport',
        { input },
      ),
    detail: (id: string) =>
      execute<ExpenseDetails>(
        'query FinanceExpense($id:String!){ownFinanceExpense(id:$id)}',
        'ownFinanceExpense',
        { id },
      ),
    save: (input: Record<string, unknown>) =>
      execute<FinanceExpense>(
        'mutation SaveExpense($input:JSON!){saveOwnFinanceExpense(input:$input)}',
        'saveOwnFinanceExpense',
        { input },
      ),
    costs: (variantId: string) =>
      execute<ProductionCost[]>(
        'query ProductionCost($variantId:ID!){ownProductionCost(variantId:$variantId)}',
        'ownProductionCost',
        { variantId },
      ),
    setCost: (variantId: string, unitCost: number | null) =>
      execute<unknown>(
        'mutation SetProductionCost($input:JSON!){setOwnProductionCost(input:$input)}',
        'setOwnProductionCost',
        { input: { variantId, unitCost } },
      ),
    createVariant: (
      variant: Record<string, unknown>,
      unitCost: number | null,
    ) =>
      execute<{ id: string }>(
        'mutation CreateCostedVariant($input:JSON!){createOwnCostedVariant(input:$input)}',
        'createOwnCostedVariant',
        { input: { variant, unitCost } },
      ),
    upload: (expenseId: string, file: File) =>
      uploadDocumentFile(
        options,
        parse(
          'mutation UploadFinanceReceipt($input:JSON!,$file:Upload!){uploadOwnFinanceReceipt(input:$input,file:$file)}',
        ),
        'uploadOwnFinanceReceipt',
        file,
        { expenseId },
      ).catch(handle),
    download: (id: string) =>
      execute<{ filename: string; mime: string; bytesBase64: string }>(
        'mutation FinanceReceipt($id:String!){downloadOwnFinanceReceipt(id:$id)}',
        'downloadOwnFinanceReceipt',
        { id },
      ),
  };
}
export type FinanceApi = Omit<
  ReturnType<typeof createFinanceApi>,
  'quickbooks'
> & { quickbooks?: QuickBooksApi };
