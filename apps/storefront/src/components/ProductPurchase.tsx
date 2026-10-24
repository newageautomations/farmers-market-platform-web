import { buttonClassName } from '@market/ui/presentation';
import { Select, Button, Input } from '@market/ui';
import { useEffect, useRef, useState } from 'react';
import {
  cartMessage,
  type PublicProduct,
  type VendorPreorderAvailability,
} from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from './shop-client';

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
}) {
  const [variantId, setVariantId] = useState(
      variants.some((v) => v.id === initialVariantId)
        ? initialVariantId!
        : variants.length === 1
          ? variants[0]!.id
          : '',
    ),
    [quantity, setQuantity] = useState('1'),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [availability, setAvailability] = useState(initialAvailability);
  const lock = useRef(false),
    selected = variants.find((v) => v.id === variantId),
    eligible =
      !!occurrenceId &&
      availability.some((a) => a.variantId === variantId && a.available);
  const maximum =
    availability.find((a) => a.variantId === variantId)?.quantity ?? 2147483647;
  const validQuantity =
    Number.isSafeInteger(Number(quantity)) &&
    Number(quantity) >= 1 &&
    Number(quantity) <= maximum;
  useEffect(() => {
    const target = priceTarget ? document.getElementById(priceTarget) : null;
    if (target)
      target.textContent = selected
        ? formatMoney(selected.priceWithTax, selected.currencyCode)
        : priceFallback;
  }, [priceTarget, priceFallback, selected]);
  useEffect(() => {
    const image = selected?.featuredAsset ?? selected?.assets[0];
    if (image)
      window.dispatchEvent(
        new CustomEvent('product-variant-image', {
          detail: image.id,
        }),
      );
  }, [selected]);
  useEffect(() => {
    if (!occurrenceId || preview || fixture) return;
    let active = true,
      refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        let next: VendorPreorderAvailability = [];
        for (let skip = 0; skip < variants.length; skip += 20) {
          next = [
            ...next,
            ...(await shopCall<VendorPreorderAvailability>(
              storefrontId,
              'product-availability',
              {
                occurrenceId,
                variantIds: variants.slice(skip, skip + 20).map((v) => v.id),
              },
            )),
          ];
        }
        if (active) setAvailability(next);
      } catch {
        if (active) setAvailability([]);
      } finally {
        refreshing = false;
      }
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [storefrontId, occurrenceId, preview, fixture, variants]);
  return (
    <form
      className="purchase-form"
      aria-busy={pending}
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          lock.current ||
          !selected ||
          fixture ||
          preview ||
          !eligible ||
          !validQuantity
        )
          return;
        lock.current = true;
        setPending(true);
        setMessage('');
        setError('');
        try {
          const current = await shopCall<VendorPreorderAvailability>(
            storefrontId,
            'product-availability',
            { occurrenceId, variantIds: [variantId] },
          );
          setAvailability((previous) => [
            ...previous.filter((a) => a.variantId !== variantId),
            ...current,
          ]);
          const status = current.find((a) => a.variantId === variantId);
          if (
            !status?.available ||
            Number(quantity) > (status.quantity ?? 2147483647)
          ) {
            setError(
              status?.available
                ? `Only ${status.quantity} are available. Reduce the quantity and try again.`
                : (status?.reason ??
                    'Availability changed. Check your selection and quantity.'),
            );
            return;
          }
          await shopCall(storefrontId, 'add', {
            variantId,
            quantity: Number(quantity),
            occurrenceId,
          });
          setMessage('Added to your cart.');
          window.dispatchEvent(
            new CustomEvent('vendor-cart-updated', {
              detail: { storefrontId },
            }),
          );
        } catch (e) {
          setError(cartMessage(e as { code?: string; kind?: string }));
        } finally {
          lock.current = false;
          setPending(false);
        }
      }}
    >
      <div className="field">
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
      <div className="field">
        <label htmlFor="product-quantity">Quantity</label>
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
      </div>
      <Button
        type="submit"
        variant="primary"
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
      {eligible && (
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
