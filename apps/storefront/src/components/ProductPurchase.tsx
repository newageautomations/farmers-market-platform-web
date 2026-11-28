import { Select, Button, Input } from '@market/ui';
import { StepperGlyph } from './StepperGlyph';
import { useProductPurchase } from '../lib/use-product-purchase';
import { AnimatedCartButton } from './AnimatedCartButton';
import {
  type PublicProduct,
  type VendorPreorderAvailability,
} from '@market/api';
import { formatMoney } from '@market/config';
import {
  isOutOfStock,
  lowStock,
  lowStockLabel,
} from '@market/storefront-core/stock';

export function ProductPurchase({
  storefrontId,
  variants,
  signedIn: _signedIn,
  fixture,
  occurrenceId,
  availability: initialAvailability = [],
  initialVariantId,
  priceTarget,
  priceFallback = '',
  preview = false,
  presentation = 'default',
  market = false,
}: {
  storefrontId: string;
  variants: PublicProduct['variants'];
  signedIn: boolean;
  fixture: boolean;
  occurrenceId?: string;
  availability?: VendorPreorderAvailability;
  initialVariantId?: string;
  priceTarget?: string;
  priceFallback?: string;
  preview?: boolean;
  presentation?: 'default' | 'editorial-market';
  market?: boolean;
}) {
  const {
    variantId,
    setVariantId,
    quantity,
    setQuantity,
    pending,
    message,
    setMessage,
    error,
    setError,
    availability,
    selected,
    eligible,
    maximum,
    validQuantity,
    submit,
    cartFeedback,
  } = useProductPurchase({
    storefrontId,
    variants,
    signedIn: _signedIn,
    fixture,
    occurrenceId,
    availability: initialAvailability,
    initialVariantId,
    priceTarget,
    priceFallback,
    preview,
    market,
  });
  const editorial = presentation === 'editorial-market';
  const fact = availability.find((a) => a.variantId === variantId);
  const outOfStock = !!occurrenceId && isOutOfStock(fact);
  const remaining = eligible ? lowStock(fact) : null;
  return (
    <form
      className={`purchase-form${editorial ? ' em-product-purchase' : ''}`}
      aria-busy={pending}
      onSubmit={submit}
    >
      <div className="field" hidden={editorial && variants.length === 1}>
        <label htmlFor="product-variant">Product option</label>
        <Select
          id="product-variant"
          value={variantId}
          onChange={(e) => {
            setVariantId(e.target.value);
            setMessage('');
            setError('');
            setQuantity('1');
            if (!preview) {
              const url = new URL(window.location.href);
              url.searchParams.set('variant', e.target.value);
              window.history.replaceState(null, '', url.pathname + url.search);
            }
          }}
          disabled={pending || !variants.length}
        >
          {variants.length > 1 && <option value="">Choose an option</option>}
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.options.length
                ? ` (${v.options.map((o) => o.name).join(', ')})`
                : ''}
              {availability.some((a) => a.variantId === v.id && a.available)
                ? ''
                : isOutOfStock(availability.find((a) => a.variantId === v.id))
                  ? ' (out of stock)'
                  : ' (unavailable at this market)'}
            </option>
          ))}
        </Select>
      </div>
      {selected && (
        <p className="product-price" data-variant-price hidden={!!priceTarget}>
          {formatMoney(selected.price, selected.currencyCode)}
        </p>
      )}
      <div className="field em-product-quantity-field">
        <label htmlFor="product-quantity">Quantity</label>
        {/* The cart's quantity stepper, so choosing a quantity looks and works
            the same here as in the cart. */}
        <div
          className={`vendor-cart-quantity${editorial ? ' em-product-quantity' : ''}`}
        >
          <Button
            className={
              editorial ? 'em-product-quantity-button' : 'vendor-cart-stepper'
            }
            variant={editorial ? 'secondary' : 'primary'}
            type="button"
            aria-label="Decrease quantity"
            disabled={pending || Number(quantity) <= 1}
            onClick={() => setQuantity(String(Number(quantity) - 1))}
          >
            <StepperGlyph kind="minus" />
          </Button>
          <Input
            id="product-quantity"
            type="number"
            inputMode="numeric"
            min="1"
            max={Math.max(1, maximum)}
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={pending}
          />
          <Button
            className={
              editorial ? 'em-product-quantity-button' : 'vendor-cart-stepper'
            }
            variant={editorial ? 'secondary' : 'primary'}
            type="button"
            aria-label="Increase quantity"
            disabled={pending || Number(quantity) >= maximum}
            onClick={() => setQuantity(String(Number(quantity) + 1))}
          >
            <StepperGlyph kind="plus" />
          </Button>
        </div>
      </div>
      <AnimatedCartButton
        enabled
        feedback={cartFeedback}
        type="submit"
        variant="primary"
        className={editorial ? 'em-product-add' : undefined}
        disabled={
          pending ||
          !selected ||
          fixture ||
          preview ||
          !eligible ||
          !validQuantity
        }
      >
        {pending
          ? 'Adding…'
          : !selected
            ? 'Choose an option'
            : !eligible
              ? outOfStock
                ? 'Out of Stock'
                : 'Unavailable'
              : preview
                ? 'Preview only'
                : 'Add to cart'}
      </AnimatedCartButton>
      {!eligible && (
        <p role="status">
          {!selected
            ? 'Choose a product option to check availability.'
            : !occurrenceId
              ? 'Choose an upcoming pickup market on the Shop page.'
              : (availability.find((a) => a.variantId === variantId)?.reason ??
                'Availability could not be confirmed.')}{' '}
          <a
            href={
              occurrenceId
                ? `${market ? '/shop' : '/products'}?occurrence=${encodeURIComponent(occurrenceId)}`
                : market
                  ? '/shop'
                  : '/products'
            }
          >
            Browse markets and products
          </a>
        </p>
      )}
      {/* Only a low stock warning is shown while the product can be added. */}
      {remaining != null && (
        <p role="status">
          <span className="stock-low">{lowStockLabel(remaining)}</span>
        </p>
      )}
      {eligible && !validQuantity && (
        <p role="alert">
          Enter a whole quantity between 1 and {Math.max(1, maximum)}.
        </p>
      )}

      {fixture && (
        <p>Fixture preview. Cart mutations require a connected Shop session.</p>
      )}
      {/* The greyed-out button shows the add is in progress and its
          animation confirms it, so no progress or success text is drawn.
          Screen readers still hear the result. */}
      <p className="sr-only" role="status" aria-live="polite">
        {pending ? '' : message}
      </p>
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
