import { buttonClassName } from '@market/ui/presentation';
import { Select, Button, Input } from '@market/ui';
import { useProductPurchase } from '../lib/use-product-purchase';
import {
  type PublicProduct,
  type VendorPreorderAvailability,
} from '@market/api';
import { formatMoney } from '@market/config';

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
  });
  const editorial = presentation === 'editorial-market';
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
              {!availability.some((a) => a.variantId === v.id && a.available)
                ? ' (unavailable at this market)'
                : ''}
            </option>
          ))}
        </Select>
      </div>
      {selected && (
        <p className="product-price" data-variant-price hidden={!!priceTarget}>
          {formatMoney(selected.priceWithTax, selected.currencyCode)}
        </p>
      )}
      <div className="field em-product-quantity-field">
        <label htmlFor="product-quantity">Quantity</label>
        {editorial ? (
          <div className="em-product-quantity vendor-cart-quantity">
            <Button
              className="em-product-quantity-button"
              variant="secondary"
              aria-label="Decrease quantity"
              disabled={pending || Number(quantity) <= 1}
              onClick={() => setQuantity(String(Number(quantity) - 1))}
            >
              −
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
              className="em-product-quantity-button"
              variant="secondary"
              aria-label="Increase quantity"
              disabled={pending || Number(quantity) >= maximum}
              onClick={() => setQuantity(String(Number(quantity) + 1))}
            >
              +
            </Button>
          </div>
        ) : (
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
        )}
      </div>
      <Button
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
              ? 'Unavailable'
              : preview
                ? 'Preview only'
                : 'Add to cart'}
      </Button>
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
                ? `/products?occurrence=${encodeURIComponent(occurrenceId)}`
                : '/products'
            }
          >
            Browse markets and products
          </a>
        </p>
      )}
      {eligible && !editorial && (
        <p role="status">
          Available for this market
          {maximum < 2147483647 ? `, up to ${maximum} available` : ''}.
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
      <p
        className={
          pending || message ? 'alert ui-alert ui-alert-info' : undefined
        }
        role="status"
        aria-live="polite"
      >
        {pending ? 'Updating your cart…' : message}
        {message && (
          <>
            {' '}
            <a
              className={buttonClassName({
                variant: 'secondary',
                className: 'button secondary',
              })}
              href="/cart"
            >
              View cart
            </a>
          </>
        )}
      </p>
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
