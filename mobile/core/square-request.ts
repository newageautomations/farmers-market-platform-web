import type { NativeLaunch } from '../../packages/api/src/native-mobile';
/** Primitive bridge terms, shared with tests. Native enums are supplied by the SDK adapter. */
export function squarePaymentTerms(c: NativeLaunch) {
  if (
    c.method !== 'SQUARE_MOBILE' ||
    c.merchant.environment !== 'Sandbox' ||
    !Number.isSafeInteger(c.sale.amount) ||
    c.sale.amount <= 0 ||
    c.sale.currency !== 'USD' ||
    !c.merchant.locationId
  )
    throw new Error('Invalid authoritative Square checkout');
  return {
    amountMoney: { amount: c.sale.amount, currencyCode: 'USD' as const },
    processingMode: 0,
    paymentAttemptId: c.sdkAttemptId,
    referenceId: c.reference,
    locationId: c.merchant.locationId,
    acceptPartialAuthorization: false,
    autocomplete: true,
    allowCardSurcharge: false,
    appFeeMoney: { amount: 0, currencyCode: 'USD' as const },
    tipMoney: { amount: 0, currencyCode: 'USD' as const },
  };
}
