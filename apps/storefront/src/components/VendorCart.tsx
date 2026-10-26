import { CartTotals } from './CartTotals';
import { buttonClassName } from '@market/ui/presentation';
import { Card, Button, Input, EmptyState } from '@market/ui';
import { useVendorCart } from '../lib/use-vendor-cart';
import type { PublicCart } from '@market/api';
import { occurrenceLabel } from '@market/storefront-core/market';
import { safeAsset } from '@market/storefront-core/catalog';
import { formatMoney } from '@market/config';
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
    uncertain,
    affectedLine,
    cart,
    preorder,
    count,
    shopHref,
    issue,
    refresh,
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
      {uncertain && (
        <p className="ui-alert ui-alert-error" role="alert">
          {issue}{' '}
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => void refresh()}
          >
            Refresh cart
          </Button>
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
                const image = safeAsset(line.featuredAsset?.preview);
                return (
                  <li className="vendor-cart-line" key={line.id}>
                    <a
                      className="vendor-cart-image"
                      href={productHref}
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <span>Image unavailable</span>
                      {image && (
                        <img
                          src={image}
                          alt=""
                          width="120"
                          height="120"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      )}
                    </a>
                    <div className="vendor-cart-description">
                      <h2>
                        <a href={productHref}>
                          {line.productVariant.product.name}
                        </a>
                      </h2>
                      <p>{line.productVariant.name}</p>
                      <p>
                        {formatMoney(line.unitPriceWithTax, cart.currencyCode)}{' '}
                        each, including tax
                      </p>
                      {warning && (
                        <p
                          id={`availability-${line.id}`}
                          className="ui-alert ui-alert-warning"
                        >
                          {warning}
                        </p>
                      )}
                      {error && affectedLine === line.id && (
                        <p className="ui-alert ui-alert-error">{error}</p>
                      )}
                      <form
                        className="vendor-cart-controls"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void change(
                            'adjust',
                            line.id,
                            Number(
                              new FormData(event.currentTarget).get('quantity'),
                            ),
                          );
                        }}
                      >
                        <div className="vendor-cart-quantity">
                          <Button
                            variant="primary"
                            className="vendor-cart-stepper"
                            type="button"
                            disabled={disabled || line.quantity <= 1}
                            aria-label={`Decrease quantity for ${line.productVariant.name}`}
                            onClick={(event) => {
                              const input =
                                event.currentTarget.form?.elements.namedItem(
                                  'quantity',
                                );
                              void change(
                                'adjust',
                                line.id,
                                (input instanceof HTMLInputElement
                                  ? Number(input.value)
                                  : line.quantity) - 1,
                              );
                            }}
                          >
                            −
                          </Button>
                          <label
                            className="sr-only"
                            htmlFor={`quantity-${line.id}`}
                          >
                            Quantity for {line.productVariant.name}
                          </label>
                          <Input
                            key={`${line.id}-${line.quantity}-${pending}`}
                            id={`quantity-${line.id}`}
                            name="quantity"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max={maximum}
                            step="1"
                            required
                            defaultValue={line.quantity}
                            disabled={disabled}
                            onBlur={(event) => {
                              // These buttons apply their own change using the draft quantity.
                              if (
                                event.relatedTarget instanceof Node &&
                                event.currentTarget.form?.contains(
                                  event.relatedTarget,
                                )
                              )
                                return;
                              void change(
                                'adjust',
                                line.id,
                                Number(event.currentTarget.value),
                              );
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter') return;
                              event.preventDefault();
                              void change(
                                'adjust',
                                line.id,
                                Number(event.currentTarget.value),
                              );
                            }}
                            aria-describedby={
                              warning ? `availability-${line.id}` : undefined
                            }
                          />
                          <Button
                            variant="primary"
                            className="vendor-cart-stepper"
                            type="button"
                            disabled={
                              disabled ||
                              !fact?.available ||
                              line.quantity >= maximum
                            }
                            aria-label={`Increase quantity for ${line.productVariant.name}`}
                            onClick={(event) => {
                              const input =
                                event.currentTarget.form?.elements.namedItem(
                                  'quantity',
                                );
                              void change(
                                'adjust',
                                line.id,
                                (input instanceof HTMLInputElement
                                  ? Number(input.value)
                                  : line.quantity) + 1,
                              );
                            }}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          variant="destructive-outline"
                          type="button"
                          aria-label={`Remove ${line.productVariant.name}`}
                          disabled={disabled}
                          onClick={() => void change('remove', line.id)}
                        >
                          Remove
                        </Button>
                      </form>
                    </div>
                    <strong
                      className="vendor-cart-line-total"
                      aria-label={`Subtotal for ${line.productVariant.name}`}
                    >
                      {formatMoney(
                        line.discountedLinePriceWithTax,
                        cart.currencyCode,
                      )}
                    </strong>
                  </li>
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
