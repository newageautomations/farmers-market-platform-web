export {
  loadStripeSdk,
  type StripePaymentClient,
  type StripePaymentElement,
  type StripePaymentElements,
  type StripePaymentFactory,
} from '@market/ui/stripe-card';

const preparations = new Map<
  string,
  Promise<import('@market/api').StripeCheckoutStatus>
>();
export function prepareStripeForm(
  storefrontId: string,
  orderId: string,
  load: () => Promise<import('@market/api').StripeCheckoutStatus>,
) {
  const key = `${storefrontId}:${orderId}`;
  let current = preparations.get(key);
  if (!current) {
    current = load().finally(() => preparations.delete(key));
    preparations.set(key, current);
  }
  return current;
}
