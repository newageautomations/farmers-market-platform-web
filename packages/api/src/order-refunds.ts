import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';

export interface OrderRefundHistory {
  operationKey?: string;
  id: string;
  state: string;
  amount: number;
  currency: string;
  reconciliationCode: string | null;
  financialState: string;
  customerState: string;
  applicationFeeState: string;
  platform: number;
  recovery: number;
  feeTax: number;
  createdAt: string;
}
export interface OrderRefundView {
  allocationId: string;
  currency: string;
  blocked: boolean;
  providerReview?: string | null;
  lines: Array<{ lineId: string; unitIds: string[] }>;
  history: OrderRefundHistory[];
}
export interface OrderRefundPreview {
  allocationId: string;
  unitIds: string[];
  currency: string;
  merchandise: number;
  tax: number;
  shipping: number;
  platform: number;
  recovery: number;
  feeTax: number;
  preorderFee: number;
  total: number;
}
export function createOrderRefundsApi(
  options: TransportOptions & { channelToken: string },
) {
  const run = transport('admin', options);
  return {
    read: async (orderId: string): Promise<OrderRefundView | null> =>
      (
        await run(
          { api: 'admin', document: g.OwnOrderRefundsDocument },
          { orderId },
        )
      ).ownOrderRefunds as OrderRefundView | null,
    preview: async (
      allocationId: string,
      unitIds: string[],
    ): Promise<OrderRefundPreview> =>
      (
        await run(
          { api: 'admin', document: g.PreviewOwnRefundDocument },
          { allocationId, unitIds },
        )
      ).previewOwnOriginalUnitRefund as OrderRefundPreview,
    request: async (input: g.RequestOwnRefundMutationVariables['input']) =>
      (
        await run(
          { api: 'admin', document: g.RequestOwnRefundDocument },
          { input },
        )
      ).requestOwnOriginalUnitRefund,
  };
}
export type OrderRefundsApi = ReturnType<typeof createOrderRefundsApi>;
