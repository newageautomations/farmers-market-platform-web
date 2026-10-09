import type { ComponentProps } from 'react';
import { ErrorBoundary } from '@market/ui';
import { Checkout as CheckoutSurface } from './Checkout';
import { VendorCart as VendorCartSurface } from './VendorCart';
import { MarketCart as MarketCartSurface } from './MarketCart';
import { PurchaseSuccess as PurchaseSuccessSurface } from './PurchaseSuccess';
import CommunicationPreferencesSurface from './CommunicationPreferences';
export function Checkout(props: ComponentProps<typeof CheckoutSurface>) {
  return (
    <ErrorBoundary>
      <CheckoutSurface {...props} />
    </ErrorBoundary>
  );
}
export function VendorCart(props: ComponentProps<typeof VendorCartSurface>) {
  return (
    <ErrorBoundary>
      <VendorCartSurface {...props} />
    </ErrorBoundary>
  );
}
export function MarketCart(props: ComponentProps<typeof MarketCartSurface>) {
  return (
    <ErrorBoundary>
      <MarketCartSurface {...props} />
    </ErrorBoundary>
  );
}
export function PurchaseSuccess(
  props: ComponentProps<typeof PurchaseSuccessSurface>,
) {
  return (
    <ErrorBoundary>
      <PurchaseSuccessSurface {...props} />
    </ErrorBoundary>
  );
}
export function CommunicationPreferences(
  props: ComponentProps<typeof CommunicationPreferencesSurface>,
) {
  return (
    <ErrorBoundary>
      <CommunicationPreferencesSurface {...props} />
    </ErrorBoundary>
  );
}
export default CommunicationPreferences;
