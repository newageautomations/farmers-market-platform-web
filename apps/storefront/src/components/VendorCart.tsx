import { HarvestCartLine } from './HarvestCartLine';
import { CartTotals } from './CartTotals';
import { buttonClassName } from '@market/ui/presentation';
import { Card, Button, EmptyState } from '@market/ui';
import { useVendorCart } from '../lib/use-vendor-cart';
import type { PublicCart } from '@market/api';
import { occurrenceLabel } from '@market/storefront-core/market';
import { VendorPreorderBanner } from './VendorPreorderBanner';
import type { VendorPreorderState } from '../lib/vendor-preorder';
import { cartLineIssue } from '../lib/vendor-cart';
import CheckoutLoyalty from './CheckoutLoyalty';

export function VendorCart({
  storefrontId,
  initialCart,
  initialPreorder,
}: {
  storefrontId: string;
  initialCart: PublicCart | null;
  initialPreorder: VendorPreorderState;
}) {
  const {
    pending,
    error,
    message,
    affectedLine,
    cart,
    preorder,
    count,
    shopHref,
    issue,
    change,
    checkout,
    setExternalBusy,
    read,
    setUncertain,
  } = useVendorCart({ storefrontId, initialCart, initialPreorder });
  return (
    <div className="vendor-cart" aria-busy={pending}>
      <VendorPreorderBanner
        scheduleFormat="compact"
        storefrontId={storefrontId}
        preorder={preorder}
        hasItems={!!cart?.lines.length}
        disabled={pending}
        onBusyChange={setExternalBusy}
      />
      <div
        className="vendor-cart-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {pending ? 'Updating your cart…' : message}
      </div>
      {error && (
        <p className="ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}

      {!cart?.lines.length ? (
        <>
          <h1>Your Cart</h1>
          <EmptyState
            title="Your basket is waiting"
            level={2}
            action={
              <a
                className={buttonClassName({ variant: 'primary' })}
                href={shopHref}
              >
                <span aria-hidden="true">←</span>
                Continue Shopping
              </a>
            }
          >
            <svg
              className="vendor-cart-basket"
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m7 10 5-7 5 7M3 10h18l-2 11H5L3 10ZM9 14v3m6-3v3" />
            </svg>
            <p>
              Add something fresh from this vendor for your next market visit.
            </p>
          </EmptyState>
        </>
      ) : (
        <div className="vendor-cart-layout">
          <section
            className="vendor-cart-items"
            aria-labelledby="vendor-cart-title"
          >
            <header className="vendor-cart-heading">
              <h1 id="vendor-cart-title">Your Cart</h1>
              <p>
                {count} {count === 1 ? 'item' : 'items'}
              </p>
            </header>
            <ul className="vendor-cart-lines">
              {cart.lines.map((line) => {
                const warning = cartLineIssue(line, preorder);
                const fact = preorder.availability.find(
                  (entry) => entry.variantId === line.productVariant.id,
                );
                const maximum = Math.max(1, fact?.quantity ?? 2147483647);
                const disabled = pending || cart.state !== 'AddingItems';
                const productHref = `/products/${encodeURIComponent(line.productVariant.product.slug)}?${new URLSearchParams({ variant: line.productVariant.id, ...(preorder.selected ? { occurrence: preorder.selected.id } : {}) })}`;
                return (
                  <HarvestCartLine
                    key={line.id}
                    line={line}
                    currency={cart.currencyCode}
                    productHref={productHref}
                    disabled={disabled}
                    maximum={maximum}
                    available={!!fact?.available}
                    warning={warning}
                    error={affectedLine === line.id ? error : undefined}
                    change={change}
                  />
                );
              })}
            </ul>
            <a
              className={buttonClassName({ variant: 'primary' })}
              href={shopHref}
            >
              <span aria-hidden="true">←</span>
              Continue Shopping
            </a>
          </section>
          <Card
            as="section"
            spacing="contained"
            className="vendor-cart-summary"
            aria-labelledby="vendor-cart-summary-title"
          >
            <h2
              id="vendor-cart-summary-title"
              className="ui-section-title-consumer"
            >
              Order Summary
            </h2>
            <p>
              {count} {count === 1 ? 'item' : 'items'} for market pickup
            </p>
            <CartTotals cart={cart} />
            <p className="vendor-cart-total-note">
              Current order amounts include tax. Final taxes and pickup fees are
              confirmed during checkout.
            </p>
            {preorder.selected && (
              <p className="vendor-cart-pickup">
                Pickup at {preorder.selected.marketName}
                <br />
                {occurrenceLabel(preorder.selected, 'compact')}
              </p>
            )}
            <CheckoutLoyalty
              disabled={pending || !!issue}
              revision={JSON.stringify(cart)}
              onApplied={async () => {
                try {
                  await read();
                } catch (error) {
                  setUncertain(true);
                  throw error;
                }
              }}
              onBusyChange={setExternalBusy}
            />
            {issue && (
              <p id="vendor-cart-blocked" className="ui-alert ui-alert-warning">
                {issue}
              </p>
            )}
            <Button
              disabled={pending || !!issue}
              aria-describedby={issue ? 'vendor-cart-blocked' : undefined}
              onClick={() => void checkout()}
            >
              Continue to Checkout
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
