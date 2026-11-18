import { createRoot } from 'react-dom/client';
import type {
  BoothInvoice,
  MarketOperationsApi,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { managerOverviewData } from './manager-overview-data';
import '@market/ui/styles.css';

/**
 * Market Finances › Booth invoices with in-memory invoices that carry line
 * items, payments, adjustments and refunds. Commands mutate the in-memory
 * data; a reason containing "fail" makes the command reject (and "preview
 * fail" the refund preview) so failure feedback can be checked.
 */
const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketBilling',
  'ManageOwnMarketBilling',
];
const service = createFixtureMarketService(context);
const overview = managerOverviewData();
const DAY = 86400000;
const at = (offset: number) =>
  new Date(Date.now() + offset * DAY).toISOString();
let invoices: BoothInvoice[] = [];
const payments: NonNullable<MarketOperationsData['payments']> = [];
let nextId = 50;
const base = await overview.operations.read('BILLING');
invoices = (base.invoices ?? []).map((invoice) => ({
  ...invoice,
  lines: [
    {
      description: `Booth ${invoice.assignmentId} · 10 ft × 10 ft`,
      quantity: 1,
      unitMinor: invoice.totalMinor - 1000,
      lineMinor: invoice.totalMinor - 1000,
      currency: 'USD',
    },
    {
      description: 'Tent rental',
      quantity: 1,
      unitMinor: 1000,
      lineMinor: 1000,
      currency: 'USD',
    },
  ],
  originalTotalMinor: invoice.totalMinor,
  remainingMinor: invoice.totalMinor - invoice.paidMinor,
  adjustments: [],
  refunds: [],
}));
for (const invoice of invoices)
  if (invoice.paidMinor)
    payments.push({
      id: nextId++,
      invoiceId: invoice.id,
      amountMinor: invoice.paidMinor,
      currency: 'USD',
      method: invoice.id === 1 ? 'CASH' : 'CHECK',
      paidAt: at(-6 + invoice.id),
    });
// Invoice 1 has a full history: charge increase, payment, partial refund.
const first = invoices[0]!;
first.adjustments = [
  {
    id: 1,
    amountMinor: 500,
    reason: 'Added electricity hookup',
    createdAt: at(-8),
    actorId: 1,
  },
];
first.totalMinor += 500;
payments.push({
  id: nextId++,
  invoiceId: 1,
  amountMinor: 500,
  currency: 'USD',
  method: 'CASH',
  paidAt: at(-5),
});
first.paidMinor += 500;
first.refunds = [
  {
    id: 1,
    paymentId: payments[0]!.id,
    amountMinor: 1000,
    method: 'CASH',
    reason: 'Tent was not provided',
    returnedAt: at(-3),
    createdAt: at(-3),
    state: 'COMPLETED',
    reviewCode: null,
    shares: {
      principal: 1000,
      platform: 0,
      recovery: 0,
      feeTax: 0,
      gross: 1000,
    },
  },
];
first.paidMinor -= 1000;
first.status = 'OPEN';
first.billingStatus = 'OPEN';
first.remainingMinor = first.totalMinor - first.paidMinor;
const sync = (i: BoothInvoice) => {
  i.remainingMinor = i.totalMinor - i.paidMinor;
  if (i.status === 'OPEN' && i.remainingMinor <= 0) {
    i.status = 'PAID';
    i.billingStatus = 'PAID';
  } else if (i.status === 'PAID' && i.remainingMinor > 0) {
    i.status = 'OPEN';
    i.billingStatus = 'OPEN';
  }
  i.revision += 1;
};
const command = async (c: OperationsCommand) => {
  await new Promise((r) => setTimeout(r, 450));
  const data = (c as { data?: Record<string, unknown> }).data ?? {};
  // "fail" rejects the command itself; "preview fail" rejects the refund preview.
  const reason = String(data.reason ?? data.note ?? '').toLowerCase();
  if (
    c.action === 'PREVIEW_INVOICE_REFUND'
      ? reason.includes('preview fail')
      : reason.includes('fail')
  )
    throw new Error('Fixture failure');
  const i = invoices.find((x) => x.id === (c as { id?: number }).id)!;
  const share = (n: number) => ({
    principal: n,
    platform: 0,
    recovery: 0,
    feeTax: 0,
    gross: n,
  });
  switch (c.action) {
    case 'PREVIEW_INVOICE_REFUND':
      return { shares: share(Number(data.amountMinor)) };
    case 'REFUND_PAYMENT':
      i.refunds = [
        ...(i.refunds ?? []),
        {
          id: nextId++,
          paymentId: Number(data.paymentId),
          amountMinor: Number(data.amountMinor),
          method: String(data.method),
          reason: String(data.reason),
          returnedAt: String(data.returnedAt),
          createdAt: new Date().toISOString(),
          state: 'COMPLETED',
          reviewCode: null,
          shares: share(Number(data.amountMinor)),
        },
      ];
      i.paidMinor -= Number(data.amountMinor);
      break;
    case 'RECORD_PAYMENT':
      payments.push({
        id: nextId++,
        invoiceId: i.id,
        amountMinor: Number(data.amountMinor),
        currency: 'USD',
        method: String(data.method),
        paidAt: String(data.paidAt),
      });
      i.paidMinor += Number(data.amountMinor);
      break;
    case 'ADJUST_INVOICE':
      i.adjustments = [
        ...(i.adjustments ?? []),
        {
          id: nextId++,
          amountMinor: Number(data.amountMinor),
          reason: String(data.reason),
          createdAt: new Date().toISOString(),
          actorId: 1,
        },
      ];
      i.totalMinor += Number(data.amountMinor);
      break;
    case 'ISSUE_INVOICE':
      i.status = 'OPEN';
      i.billingStatus = 'OPEN';
      break;
    case 'CANCEL_INVOICE':
      i.status = i.paidMinor ? 'CANCEL_PENDING' : 'CANCELED';
      i.billingStatus = i.status;
      break;
  }
  sync(i);
  return {};
};
const summary = () => {
  const by = (s: string) =>
    invoices.filter((i) => (i.billingStatus ?? i.status) === s).length;
  return {
    paid: by('PAID'),
    open: by('OPEN'),
    draft: by('DRAFT'),
    complimentary: by('COMPLIMENTARY'),
    pastDue: by('PAST_DUE'),
    byCurrency: {
      USD: {
        expectedMinor: invoices.reduce((n, i) => n + i.totalMinor, 0),
        collectedMinor: invoices.reduce((n, i) => n + i.paidMinor, 0),
        waivedMinor: 0,
        outstandingMinor: invoices.reduce(
          (n, i) => n + Math.max(0, i.totalMinor - i.paidMinor),
          0,
        ),
      },
    },
  };
};
service.phase14 = {
  ...overview.operations,
  read: async (
    section: Parameters<MarketOperationsApi['read']>[0],
    occurrenceId?: number,
  ) => {
    const data = await overview.operations.read(section, occurrenceId);
    return structuredClone({
      ...data,
      invoices,
      payments,
      invoiceCollections: [],
      billingSummary: summary(),
    }) as MarketOperationsData;
  },
  command,
} as unknown as MarketOperationsApi;
history.replaceState(null, '', '/market/finances/invoices');
createRoot(document.getElementById('root')!).render(
  <AdminShell context={context} marketService={service} onLogout={() => {}} />,
);
