import { useState, useRef, useEffect, type SubmitEvent } from 'react';
import {
  cartMessage,
  type PublicProduct,
  type VendorPreorderAvailability,
} from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from '../components/shop-client';
export function useProductPurchase({
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
  async function submit(event: SubmitEvent<HTMLFormElement>) {
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
  }
  function selectVariant(value: string) {
    setVariantId(value);
    setMessage('');
    setError('');
    setQuantity('1');
    if (!preview) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', value);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }
  return {
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
    selectVariant,
  };
}
