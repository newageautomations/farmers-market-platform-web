import type { PosSale } from './in-person';

/** Renderer-neutral contracts. These contain no provider credentials. */
export type NativePaymentMethod = 'SQUARE_MOBILE' | 'CLOVER_GO';
export interface NativeHandoff {
  id: string;
  expiresAt: string;
  url: string;
  requiresCompanion: true;
}
export interface NativeSessionProof {
  sessionId: string;
  installationId: string;
  secret: string;
}
export interface NativeCheckout {
  handoffId: string;
  attemptId: string;
  method: NativePaymentMethod;
  merchant: {
    connectionId: string;
    merchantId: string;
    merchantName: string;
    locationId: string | null;
    applicationId: string;
    environment: 'Sandbox';
  };
  sale: PosSale;
  reference: string;
  sdkAttemptId: string;
  canStart: boolean;
  cancelRequested: boolean;
  receiptPath: string;
  readerQualification: 'CONTROLLED_TEST' | 'SDK_SANDBOX_UNVERIFIED';
}
export interface NativeLaunch extends NativeCheckout {
  credentials?: {
    accessToken: string;
    locationId: string;
    applicationId: string;
  };
}
export interface NativeProviderCapability {
  method: NativePaymentMethod;
  available: boolean;
  merchant: NativeCheckout['merchant'] | null;
  reason: string;
  qualification?: string;
}
export const nativePaymentLabel = (method: NativePaymentMethod) =>
  method === 'SQUARE_MOBILE' ? 'Square mobile reader' : 'Clover Go';
export function nativePaymentStatus(checkout: NativeCheckout) {
  if (checkout.sale.state === 'COMPLETED')
    return 'Payment independently verified';
  if (checkout.sale.state === 'PAID')
    return 'Payment verified, completing the order';
  if (checkout.sale.state === 'DECLINED') return 'Payment declined';
  if (checkout.sale.state === 'CANCELLED') return 'Payment cancelled';
  if (checkout.sale.state === 'FAILED') return 'Payment failed';
  return checkout.canStart && !checkout.cancelRequested
    ? 'Ready for native payment'
    : 'Payment uncertain. Recover the original payment before collecting money again';
}
export function nativeHandoffId(url: string) {
  const match =
    /^market-pos:\/\/checkout\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(
      url,
    );
  if (!match?.[1]) throw new Error('Invalid companion handoff');
  return match[1];
}
