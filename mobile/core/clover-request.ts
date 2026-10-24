import type { NativeCheckout } from '../../packages/api/src/native-mobile';
/** Provider-neutral bridge mapping for future authorized Clover Go implementations. */
export function cloverGoRequest(c: NativeCheckout) {
  if (
    c.method !== 'CLOVER_GO' ||
    c.sale.currency !== 'USD' ||
    !Number.isSafeInteger(c.sale.amount) ||
    c.sale.amount <= 0 ||
    c.sale.amount > 999999999
  )
    throw new Error('Invalid authoritative Clover Go checkout');
  return {
    final: true,
    capture: true,
    amount: c.sale.amount,
    taxAmount: c.sale.tax,
    tipAmount: 0,
    externalPaymentId: c.reference.replaceAll('-', ''),
    externalReferenceId: c.reference,
    keyedInCard: null,
  };
}
