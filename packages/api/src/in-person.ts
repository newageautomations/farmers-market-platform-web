import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import type {
  NativeHandoff,
  NativePaymentMethod,
  NativeProviderCapability,
} from './native-mobile';
import type { LoyaltyTerms } from './loyalty';
export interface PosVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  available: number;
  reason: string | null;
}
export interface PosProduct {
  id: string;
  name: string;
  image: string | null;
  favorite: boolean;
  variants: PosVariant[];
}
export interface PosContext {
  kind: 'INDEPENDENT' | 'MARKET';
  label: string;
  marketId: string | null;
  occurrenceId: string | null;
}
export interface PosCatalog {
  items: PosProduct[];
  totalItems: number;
  currency: string;
  categories: {
    id: string;
    name: string;
    parentId: string | null;
    position?: number;
  }[];
}
export interface PosLine {
  id: string;
  variantId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  lineTax?: number;
  lineDiscount?: number;
  merchandiseAmount?: number;
  tax: { description: string; taxRate: number }[];
  discounts: unknown[];
}
export interface PosDraft {
  loyalty?: null | {
    balance: { available: number; pending: number; reserved: number };
    rewards: Array<{
      id: number;
      versionId: number;
      terms: LoyaltyTerms;
      available: boolean;
      discount: number;
      reason: string | null;
    }>;
    selection: null | {
      id: number;
      versionId: number;
      terms: LoyaltyTerms;
      status: string;
    };
  };
  marketRewards?: Array<{
    id: number;
    title: string;
    description: string;
    instructions: string;
    reason: string;
    available: boolean;
  }>;
  id: string;
  version: number;
  state:
    | 'OPEN'
    | 'VALIDATING'
    | 'READY_FOR_PAYMENT'
    | 'PAYMENT_PENDING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED';
  expiresAt: string;
  items: PosLine[];
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customer: string;
  customerMode: 'ANONYMOUS' | 'EXISTING' | 'INVITE';
  context: PosContext;
  coupons: string[];
  quote: null | {
    id: string;
    version: number;
    expiresAt: string;
    paymentAvailable: boolean;
  };
}
export type PosCommand =
  | {
      action: 'add' | 'quantity' | 'delta';
      variantId: string;
      quantity: number;
    }
  | { action: 'customer'; identifier: string; invite?: boolean }
  | { action: 'reward'; versionId: number; verballyAgreed: true }
  | { action: 'removeReward' }
  | { action: 'anonymous' | 'review' | 'reopen' | 'cancel' }
  | { action: 'context'; occurrenceId: string | null }
  | { action: 'coupon' | 'removeCoupon'; code: string };
export class PosInputError extends Error {}
export interface PosPaymentMethods {
  native?: NativeProviderCapability[];
  cash: boolean;
  simulated: boolean;
  scenarios: string[];
  clover?: {
    environment: string;
    qualification: 'CONTROLLED_TEST' | 'CLOVER_SANDBOX';
    merchant: string;
    devices: CloverDevice[];
  } | null;
  square?: {
    environment: 'Sandbox' | 'Production';
    qualification?: 'FIXTURE' | 'SQUARE_API';
    merchant: string;
    location: string;
    devices: SquareDevice[];
    mobile: boolean;
  } | null;
}
export interface CloverDevice {
  id: string;
  label: string;
  serial: string;
  model: string;
  isDefault: boolean;
  status: string;
  availability: string;
  checkedAt: string | null;
}
export interface CloverIntegration {
  configured: boolean;
  environment?: string;
  qualification?: 'CONTROLLED_TEST' | 'CLOVER_SANDBOX';
  remoteAppConfigured: boolean;
  applicationId?: string;
  oauthAvailable?: boolean;
  connection: {
    id: string;
    merchantId: string;
    merchant: string;
    status: string;
  } | null;
  devices: CloverDevice[];
}
export interface SquareDevice {
  id: string;
  label: string;
  locationId: string;
  providerId: string | null;
  kind: 'PHYSICAL' | 'VIRTUAL';
  status: string;
  code: string | null;
  pairBy: string | null;
  isDefault: boolean;
  availability: string;
}
export interface SquareIntegration {
  nativeReaderReason?: string | null;
  connectionError?: string | null;
  qualification?: 'FIXTURE' | 'SQUARE_API';
  configured: boolean;
  environment?: 'Sandbox' | 'Production';
  oauthAvailable?: boolean;
  sandboxImportAvailable?: boolean;
  connection: null | {
    id: string;
    merchantId: string;
    merchant: string;
    status: string;
    locationId: string | null;
    location: string | null;
    currency: string | null;
  };
  locations: {
    id: string;
    name: string;
    currency: string;
    status: string;
    eligible: boolean;
  }[];
  devices: SquareDevice[];
  virtualDevices: { id: string; label: string }[];
  mobileAvailable?: boolean;
  mobileReason?: string;
}
export interface PosPaymentInput {
  draftId: string;
  version: number;
  quoteId: string;
  key: string;
  method:
    | 'CASH'
    | 'SIMULATED'
    | 'SQUARE_TERMINAL'
    | 'SQUARE_POS_APP'
    | 'CLOVER'
    | NativePaymentMethod;
  deviceId?: string;
  platform?: 'android' | 'ios';
  tendered?: number;
  confirmCashReceived?: boolean;
  scenario?: string;
}
export interface PosSale {
  native?: {
    method: NativePaymentMethod;
    merchantId: string;
    locationId: string | null;
    paymentId: string | null;
    reference: string;
    sdkAttemptId: string;
    environment: string;
  } | null;
  handoffUrl?: string | null;
  id: string;
  draftId: string;
  orderId: string;
  orderCode: string;
  orderState: string;
  state:
    | 'PREPARING'
    | 'AWAITING_PAYMENT'
    | 'PROCESSING'
    | 'UNCERTAIN'
    | 'PAID'
    | 'COMPLETED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'FAILED';
  method: PosPaymentInput['method'];
  clover?: {
    environment: string;
    merchantId: string;
    paymentId: string | null;
    externalPaymentId: string;
    status: string;
    deviceLabel: string | null;
  } | null;
  square?: {
    environment: string;
    merchantId: string;
    locationId: string;
    checkoutId: string | null;
    paymentId: string | null;
    status: string;
    deviceLabel: string | null;
  } | null;
  evidenceType: string;
  vendor: string;
  amount: number;
  currency: string;
  tendered: number | null;
  changeDue: number | null;
  confirmedAt: string;
  completedAt: string | null;
  context: PosContext;
  customer: string;
  invitationState: string;
  items: PosLine[];
  subtotal: number;
  discount: number;
  tax: number;
  cashierId?: string;
  financialStatus?: 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  timezone?: string;
  canRecordRefund?: boolean;
  units: { id: string; amount: number; lineId: string; reserved: boolean }[];
  refunds: {
    id: string;
    amount: number;
    state: string;
    reason: string;
    createdAt: string;
    details?: {
      merchandise: number;
      discount: number;
      tax: number;
      shipping: number;
      total: number;
      completedAt: string | null;
      products: Array<{ name: string; quantity: number }>;
    } | null;
  }[];
}
export interface PosRefundInput {
  key: string;
  unitIds: string[];
  reason: string;
  cashReturned?: boolean;
  scenario?: string;
}
export function createInPersonApi(options: TransportOptions) {
  const run = transport('admin', options);
  async function execute<T>(
    source: string,
    field: string,
    variables: Record<string, unknown> = {},
  ) {
    const document = parse(source) as TypedDocumentNode<
      Record<string, T | { error: string }>,
      Record<string, unknown>
    >;
    const result = (await run({ api: 'admin', document }, variables))[field]!;
    if (result && typeof result === 'object' && 'error' in result)
      throw new PosInputError(String(result.error));
    return result as T;
  }
  return {
    clover: {
      finish: (state: string) =>
        execute<CloverIntegration>(
          'mutation($state:String!){finishOwnCloverConnection(state:$state)}',
          'finishOwnCloverConnection',
          { state },
        ),
      settings: () =>
        execute<CloverIntegration>(
          'query{ownCloverIntegration}',
          'ownCloverIntegration',
        ),
      begin: () =>
        execute<{ url: string; controlledState?: string }>(
          'mutation{beginOwnCloverConnection}',
          'beginOwnCloverConnection',
        ),
      complete: (
        state: string,
        code: string,
        merchantId: string,
        clientId: string,
      ) =>
        execute<CloverIntegration>(
          'mutation($state:String!,$code:String!,$merchantId:String!,$clientId:String!){completeOwnCloverConnection(state:$state,code:$code,merchantId:$merchantId,clientId:$clientId)}',
          'completeOwnCloverConnection',
          { state, code, merchantId, clientId },
        ),
      disconnect: () =>
        execute<CloverIntegration>(
          'mutation{disconnectOwnClover}',
          'disconnectOwnClover',
        ),
      addDevice: (input: { key: string; serial: string; label: string }) =>
        execute<CloverIntegration>(
          'mutation($input:JSON!){addOwnCloverDevice(input:$input)}',
          'addOwnCloverDevice',
          { input },
        ),
      device: (id: string, action: 'default' | 'remove' | 'check') =>
        execute<CloverIntegration>(
          'mutation($id:String!,$action:String!){commandOwnCloverDevice(id:$id,action:$action)}',
          'commandOwnCloverDevice',
          { id, action },
        ),
      control: (id: string, outcome: string) =>
        execute<PosSale>(
          'mutation($id:String!,$outcome:String!){controlOwnCloverPayment(id:$id,outcome:$outcome)}',
          'controlOwnCloverPayment',
          { id, outcome },
        ),
      cancel: (id: string) =>
        execute<PosSale>(
          'mutation($id:String!){cancelOwnCloverPayment(id:$id)}',
          'cancelOwnCloverPayment',
          { id },
        ),
    },
    square: {
      settings: () =>
        execute<SquareIntegration>(
          'query{ownSquareIntegration}',
          'ownSquareIntegration',
        ),
      begin: () =>
        execute<{ url: string }>(
          'mutation{beginOwnSquareConnection}',
          'beginOwnSquareConnection',
        ),
      complete: (state: string, code: string) =>
        execute<SquareIntegration>(
          'mutation($state:String!,$code:String!){completeOwnSquareConnection(state:$state,code:$code)}',
          'completeOwnSquareConnection',
          { state, code },
        ),
      importSandbox: () =>
        execute<SquareIntegration>(
          'mutation{importOwnSquareSandbox}',
          'importOwnSquareSandbox',
        ),
      disconnect: () =>
        execute<SquareIntegration>(
          'mutation{disconnectOwnSquare}',
          'disconnectOwnSquare',
        ),
      location: (id: string) =>
        execute<SquareIntegration>(
          'mutation($id:String!){selectOwnSquareLocation(id:$id)}',
          'selectOwnSquareLocation',
          { id },
        ),
      addTerminal: (input: {
        key: string;
        label: string;
        virtualId?: string;
      }) =>
        execute<SquareIntegration>(
          'mutation($input:JSON!){addOwnSquareTerminal(input:$input)}',
          'addOwnSquareTerminal',
          { input },
        ),
      terminal: (id: string, action: 'poll' | 'default' | 'remove') =>
        execute<SquareIntegration>(
          'mutation($id:String!,$action:String!){commandOwnSquareTerminal(id:$id,action:$action)}',
          'commandOwnSquareTerminal',
          { id, action },
        ),
    },
    cancelSquare: (id: string) =>
      execute<PosSale>(
        'mutation($id:String!){cancelOwnSquarePayment(id:$id)}',
        'cancelOwnSquarePayment',
        { id },
      ),
    squareMobileCallback: (state: string, transactionId?: string) =>
      execute<PosSale>(
        'mutation($state:String!,$transactionId:String){reconcileOwnSquareMobileCallback(state:$state,transactionId:$transactionId)}',
        'reconcileOwnSquareMobileCallback',
        { state, transactionId },
      ),
    nativeHandoff: (input: {
      draftId: string;
      version: number;
      quoteId: string;
      method: NativePaymentMethod;
    }) =>
      execute<NativeHandoff>(
        'mutation($input:JSON!){createOwnPosNativeHandoff(input:$input)}',
        'createOwnPosNativeHandoff',
        { input },
      ),
    paymentMethods: () =>
      execute<PosPaymentMethods>(
        'query{ownPosPaymentMethods}',
        'ownPosPaymentMethods',
      ),
    payment: (draftId: string) =>
      execute<PosSale | null>(
        'query($draftId:String!){ownPosPayment(draftId:$draftId)}',
        'ownPosPayment',
        { draftId },
      ),
    recoverablePayments: () =>
      execute<PosSale[]>(
        'query{ownPosRecoverablePayments}',
        'ownPosRecoverablePayments',
      ),
    latestSale: () =>
      execute<PosSale | null>('query{ownPosLatestSale}', 'ownPosLatestSale'),
    orderPayment: (orderId: string) =>
      execute<PosSale | null>(
        'query($orderId:ID!){ownPosOrderPayment(orderId:$orderId)}',
        'ownPosOrderPayment',
        { orderId },
      ),
    pay: (input: PosPaymentInput) =>
      execute<PosSale>(
        'mutation($input:JSON!){payOwnPosSale(input:$input)}',
        'payOwnPosSale',
        { input },
      ),
    reconcile: (id: string) =>
      execute<PosSale>(
        'mutation($id:String!){reconcileOwnPosPayment(id:$id)}',
        'reconcileOwnPosPayment',
        { id },
      ),
    refund: (id: string, input: PosRefundInput) =>
      execute<PosSale>(
        'mutation($id:String!,$input:JSON!){refundOwnPosSale(id:$id,input:$input)}',
        'refundOwnPosSale',
        { id, input },
      ),
    retryRefund: (id: string, refundId: string) =>
      execute<PosSale>(
        'mutation($id:String!,$refundId:ID!){retryOwnPosRefund(id:$id,refundId:$refundId)}',
        'retryOwnPosRefund',
        { id, refundId },
      ),
    catalog: (input: {
      search?: string;
      /** Exact SKU lookup is independent of browsing category and favorites. */
      sku?: string;
      skip?: number;
      categoryId?: string;
      favorites?: boolean;
      occurrenceId?: string | null;
    }) =>
      execute<PosCatalog>(
        'query($input:JSON){ownPosCatalog(input:$input)}',
        'ownPosCatalog',
        { input },
      ),
    contexts: () =>
      execute<PosContext[]>('query{ownPosContexts}', 'ownPosContexts'),
    drafts: () => execute<PosDraft[]>('query{ownPosDrafts}', 'ownPosDrafts'),
    draft: (id: string) =>
      execute<PosDraft>(
        'query($id:String!){ownPosDraft(id:$id)}',
        'ownPosDraft',
        { id },
      ),
    start: (key: string, occurrenceId: string | null, variantId?: string) =>
      execute<PosDraft>(
        'mutation($key:String!,$occurrenceId:ID,$variantId:ID){startOwnPosDraft(key:$key,occurrenceId:$occurrenceId,variantId:$variantId)}',
        'startOwnPosDraft',
        { key, occurrenceId, variantId },
      ),
    command: (id: string, version: number, key: string, input: PosCommand) =>
      execute<PosDraft>(
        'mutation($id:String!,$version:Int!,$key:String!,$input:JSON!){commandOwnPosDraft(id:$id,version:$version,key:$key,input:$input)}',
        'commandOwnPosDraft',
        { id, version, key, input },
      ),
    favorite: (productId: string, value: boolean) =>
      execute<boolean>(
        'mutation($productId:ID!,$value:Boolean!){setOwnPosFavorite(productId:$productId,value:$value)}',
        'setOwnPosFavorite',
        { productId, value },
      ),
  };
}
export type InPersonApi = ReturnType<typeof createInPersonApi>;
