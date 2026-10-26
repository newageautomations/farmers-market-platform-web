import type { PublicCart } from '@market/api';
import { formatMoney } from '@market/config';
import { safeAsset } from '@market/storefront-core/catalog';
import { ErrorBoundary } from '@market/ui';
import type { VendorPreorderState } from '../../lib/vendor-preorder';
import { useVendorCart } from '../../lib/use-vendor-cart';
import { cartLineIssue } from '../../lib/vendor-cart';
import { VendorPreorderBanner } from '../VendorPreorderBanner';
import { CartTotals } from '../CartTotals';
import CheckoutLoyalty from '../CheckoutLoyalty';
export function Cart(props: {
  storefrontId: string;
  initialCart: PublicCart | null;
  initialPreorder: VendorPreorderState;
}) {
  return (
    <ErrorBoundary>
      <CartView {...props} />
    </ErrorBoundary>
  );
}
function CartView(props: Parameters<typeof Cart>[0]) {
  const state = useVendorCart(props);
  const { cart, preorder, pending } = state;
  return (
    <article
      className="farmhouse-cart farmhouse-space"
      aria-busy={pending}
      data-farmhouse-component="cart"
    >
      <header className="farmhouse-commerce-heading">
        <h1>Your market bag</h1>
        <a href={state.shopHref}>Continue exploring ↗</a>
      </header>
      <VendorPreorderBanner
        storefrontId={props.storefrontId}
        preorder={preorder}
        hasItems={!!cart?.lines.length}
        disabled={pending}
        onBusyChange={state.setExternalBusy}
      />
      <p role="status" aria-live="polite">
        {pending ? 'Updating your bag…' : state.message}
      </p>
      {state.error && <p role="alert">{state.error}</p>}
      {state.uncertain && (
        <p role="alert">
          {state.issue}{' '}
          <button
            className="farmhouse-button"
            type="button"
            disabled={pending}
            onClick={() => void state.refresh()}
          >
            Refresh bag
          </button>
        </p>
      )}
      {!cart?.lines.length ? (
        <div className="farmhouse-empty">
          <h2>A place for something good.</h2>
          <p>Your bag is empty. Discover what is on the market table.</p>
          <a className="farmhouse-button" href={state.shopHref}>
            Explore the shop ↗
          </a>
        </div>
      ) : (
        <div className="farmhouse-cart-composition">
          <div>
            <ul className="farmhouse-cart-lines">
              {cart.lines.map((line) => {
                const warning = cartLineIssue(line, preorder);
                const fact = preorder.availability.find(
                  (v) => v.variantId === line.productVariant.id,
                );
                const disabled = pending || cart.state !== 'AddingItems';
                const href = `/products/${encodeURIComponent(line.productVariant.product.slug)}?${new URLSearchParams({ variant: line.productVariant.id, ...(preorder.selected ? { occurrence: preorder.selected.id } : {}) })}`;
                const image = safeAsset(line.featuredAsset?.preview);
                return (
                  <li key={line.id}>
                    <a href={href} className="farmhouse-bag-photo">
                      {image ? (
                        <img
                          src={image}
                          alt={line.productVariant.product.name}
                          width="240"
                          height="300"
                          loading="lazy"
                        />
                      ) : (
                        <span>Photograph unavailable</span>
                      )}
                    </a>
                    <div>
                      <h2>
                        <a href={href}>{line.productVariant.product.name}</a>
                      </h2>
                      <p>{line.productVariant.name}</p>
                      <p>
                        {formatMoney(line.unitPriceWithTax, cart.currencyCode)}{' '}
                        each, including tax
                      </p>
                      {warning && (
                        <p id={`farmhouse-line-${line.id}`} role="status">
                          {warning}
                        </p>
                      )}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void state.change(
                            'adjust',
                            line.id,
                            Number(
                              new FormData(e.currentTarget).get('quantity'),
                            ),
                          );
                        }}
                      >
                        <div className="farmhouse-quantity">
                          <button
                            type="button"
                            aria-label={`Decrease ${line.productVariant.name}`}
                            disabled={disabled || line.quantity <= 1}
                            onClick={() =>
                              void state.change(
                                'adjust',
                                line.id,
                                line.quantity - 1,
                              )
                            }
                          >
                            −
                          </button>
                          <label
                            className="sr-only"
                            htmlFor={`farmhouse-quantity-${line.id}`}
                          >
                            Quantity for {line.productVariant.name}
                          </label>
                          <input
                            key={`${line.id}:${line.quantity}`}
                            id={`farmhouse-quantity-${line.id}`}
                            name="quantity"
                            type="number"
                            min="1"
                            max={Math.max(1, fact?.quantity ?? 2147483647)}
                            step="1"
                            defaultValue={line.quantity}
                            disabled={disabled}
                            aria-describedby={
                              warning ? `farmhouse-line-${line.id}` : undefined
                            }
                            onBlur={(e) =>
                              void state.change(
                                'adjust',
                                line.id,
                                Number(e.currentTarget.value),
                              )
                            }
                          />
                          <button
                            type="button"
                            aria-label={`Increase ${line.productVariant.name}`}
                            disabled={
                              disabled ||
                              !fact?.available ||
                              line.quantity >= (fact?.quantity ?? 2147483647)
                            }
                            onClick={() =>
                              void state.change(
                                'adjust',
                                line.id,
                                line.quantity + 1,
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="farmhouse-text-link"
                          type="button"
                          disabled={disabled}
                          onClick={() => void state.change('remove', line.id)}
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                    <strong>
                      {formatMoney(
                        line.discountedLinePriceWithTax,
                        cart.currencyCode,
                      )}
                    </strong>
                  </li>
                );
              })}
            </ul>
          </div>
          <aside className="farmhouse-order-panel">
            <h2>A good gathering</h2>
            <p>
              {state.count} {state.count === 1 ? 'item' : 'items'} for market
              pickup
            </p>
            <CartTotals cart={cart} />
            <CheckoutLoyalty
              disabled={pending || !!state.issue}
              revision={JSON.stringify(cart)}
              onApplied={async () => {
                try {
                  await state.read();
                } catch (error) {
                  state.setUncertain(true);
                  throw error;
                }
              }}
              onBusyChange={state.setExternalBusy}
            />
            <p>{state.issue}</p>
            <button
              type="button"
              className="farmhouse-button"
              disabled={pending || !!state.issue}
              onClick={() => void state.checkout()}
            >
              Continue to checkout ↗
            </button>
          </aside>
        </div>
      )}
    </article>
  );
}
