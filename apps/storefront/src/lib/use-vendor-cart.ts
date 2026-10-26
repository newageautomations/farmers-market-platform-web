import { useEffect, useRef, useState } from 'react';
import { cartMessage, type PublicCart } from '@market/api';
import { shopCall } from '../components/shop-client';
import type { VendorPreorderState } from './vendor-preorder';
import { cartCheckoutIssue } from './vendor-cart';
type Snapshot = { cart: PublicCart | null; preorder: VendorPreorderState };
export function useVendorCart({
  storefrontId,
  initialCart,
  initialPreorder,
}: {
  storefrontId: string;
  initialCart: PublicCart | null;
  initialPreorder: VendorPreorderState;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    cart: initialCart,
    preorder: initialPreorder,
  });
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [uncertain, setUncertain] = useState(false),
    [affectedLine, setAffectedLine] = useState('');
  const lock = useRef(false);
  const refreshQueued = useRef(false);
  const { cart, preorder } = snapshot;
  const count =
    cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
  const shopHref = preorder.selected
    ? `/products?occurrence=${encodeURIComponent(preorder.selected.id)}`
    : '/products';
  const issue = uncertain
    ? 'The latest cart could not be confirmed. Refresh the cart before continuing.'
    : cartCheckoutIssue(cart, preorder);
  function releaseRequest() {
    lock.current = false;
    setPending(false);
    if (refreshQueued.current) {
      refreshQueued.current = false;
      void refresh();
    }
  }
  async function read() {
    const result = await shopCall<Snapshot>(storefrontId, 'cart', {
      includePreorder: true,
    });
    setSnapshot(result);
    setUncertain(false);
    return result;
  }
  async function refresh() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      await read();
    } catch {
      setUncertain(true);
    } finally {
      releaseRequest();
    }
  }
  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    const onCartUpdated = (event: Event) => {
      if (
        !(event instanceof CustomEvent) ||
        event.detail?.storefrontId !== storefrontId
      )
        return;
      if (lock.current) refreshQueued.current = true;
      else void refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    window.addEventListener('vendor-cart-updated', onCartUpdated);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
      window.removeEventListener('vendor-cart-updated', onCartUpdated);
    };
    // Refresh uses only this mounted storefront's session.
  }, [storefrontId]);
  async function change(
    action: 'adjust' | 'remove',
    lineId: string,
    quantity?: number,
  ) {
    if (lock.current) return;
    if (
      action === 'adjust' &&
      cart?.lines.find((line) => line.id === lineId)?.quantity === quantity
    )
      return;
    if (
      action === 'adjust' &&
      (!Number.isSafeInteger(quantity) ||
        quantity! < 1 ||
        quantity! > 2147483647)
    ) {
      setAffectedLine(lineId);
      setError('Enter a positive whole quantity.');
      return;
    }
    lock.current = true;
    setPending(true);
    setError('');
    setMessage('');
    setAffectedLine(lineId);
    try {
      const result = await shopCall<{ cart: PublicCart | null }>(
        storefrontId,
        action,
        { lineId, quantity },
      );
      setSnapshot((previous) => ({ ...previous, cart: result.cart }));
      await read();
      setMessage(
        action === 'remove'
          ? 'Item removed from your cart.'
          : 'Quantity and order totals updated.',
      );
    } catch (e) {
      setError(cartMessage(e as { kind?: string; code?: string }));
      try {
        await read();
      } catch {
        setUncertain(true);
      }
    } finally {
      releaseRequest();
    }
  }
  async function checkout() {
    if (lock.current || issue) return;
    lock.current = true;
    setPending(true);
    setError('');
    setAffectedLine('');
    try {
      const current = await read();
      if (!cartCheckoutIssue(current.cart, current.preorder)) {
        window.location.assign('/checkout');
      }
    } catch {
      setUncertain(true);
    } finally {
      releaseRequest();
    }
  }

  function setExternalBusy(busy: boolean) {
    if (!busy) {
      releaseRequest();
      return;
    }
    lock.current = busy;
    setPending(busy);
  }
  return {
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
    releaseRequest,
    setExternalBusy,
    read,
    setUncertain,
  };
}
