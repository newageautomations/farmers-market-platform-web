import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import type { BoothInvoice } from './market-operations';
export interface BoothInvoiceFee {
  base: number;
  eligible: number;
  platform: number;
  recovery: number;
  fee: number;
  feeTax: number;
  gross: number;
  currency: string;
  policy: string;
}
export interface BoothInvoiceCollection {
  id: string;
  invoiceId: number;
  state:
    | 'PREPARED'
    | 'CARD_REQUIRED'
    | 'PROCESSING'
    | 'CAPTURED'
    | 'COMPLETED'
    | 'CANCELED'
    | 'REVIEW';
  active: boolean;
  quote: BoothInvoiceFee;
  reviewCode: string | null;
  createdAt?: string;
}
export interface BoothInvoicePayment extends BoothInvoiceCollection {
  publishableKey: string;
  account: string;
  consentPolicy: string;
  clientSecret?: string;
}
export interface BoothInvoiceDetail {
  occurrenceStatus?: 'scheduled' | 'cancelled';
  invoice: BoothInvoice;
  marketName: string;
  eligible: boolean;
  unavailable: string;
  payments: Array<{
    id: string;
    amountMinor: number;
    currency: string;
    method: string;
    paidAt: string;
  }>;
  collections: BoothInvoiceCollection[];
}
export function createBoothInvoiceApi(options: TransportOptions) {
  const run = transport('admin', options);
  return {
    detail: async (invoiceId: number) =>
      (
        await run(
          { api: 'admin', document: g.OwnBoothInvoiceDocument },
          { invoiceId },
        )
      ).ownBoothInvoice as unknown as BoothInvoiceDetail,
    prepare: async (invoiceId: number) =>
      (
        await run(
          { api: 'admin', document: g.PrepareBoothInvoicePaymentDocument },
          { invoiceId },
        )
      ).prepareBoothInvoicePayment as unknown as BoothInvoicePayment,
    act: async (
      invoiceId: number,
      action: 'CONFIRM' | 'STATUS' | 'CANCEL',
      consent?: string,
    ) =>
      (
        await run(
          { api: 'admin', document: g.BoothInvoicePaymentDocument },
          { invoiceId, action, consent },
        )
      ).boothInvoicePayment as unknown as BoothInvoicePayment | null,
  };
}
export type BoothInvoiceApi = ReturnType<typeof createBoothInvoiceApi>;
