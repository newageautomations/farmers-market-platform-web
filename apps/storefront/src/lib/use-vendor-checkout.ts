import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import type { PublicCart, CheckoutView } from '@market/api';
import { cartCheckoutIssue } from './vendor-cart';
import { checkoutFieldError } from './checkout-contact';
import { shopCall } from '../components/shop-client';
import type { VendorPreorderState } from './vendor-preorder';
type Snapshot = { cart: PublicCart | null; preorder: VendorPreorderState };
export function useVendorCheckout({
  storefrontId,
  initial,
  initialCart,
  initialPreorder,
}: {
  storefrontId: string;
  initial: CheckoutView;
  initialCart: PublicCart | null;
  initialPreorder: VendorPreorderState;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    cart: initialCart,
    preorder: initialPreorder,
  });
  const [view, setView] = useState(initial);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState(false);
  const [validated, setValidated] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const { cart, preorder } = snapshot;
  const contact = initial.contact ?? initial.profile;
  const legacy =
    view.committed ||
    !!view.attempt ||
    initial.availability.state === 'AVAILABLE';
  const issue = stale
    ? 'The latest order could not be confirmed. Refresh before continuing.'
    : cartCheckoutIssue(cart, preorder);
  async function refresh() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const current = await shopCall<CheckoutView>(
        storefrontId,
        'checkout-status',
        { orderId: initial.orderId },
      );
      const next = await shopCall<Snapshot>(storefrontId, 'cart', {
        includePreorder: true,
      });
      if (
        next.cart?.id !== initial.orderId ||
        current.orderId !== initial.orderId
      )
        throw new Error('Order changed');
      setSnapshot(next);
      setView(current);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  useEffect(() => {
    const update = () => {
      void refresh();
    };
    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('vendor-cart-updated', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('pageshow', update);
      window.removeEventListener('vendor-cart-updated', update);
    };
    // This island remains bound to the original session order.
  }, [storefrontId, initial.orderId]);
  function submitDetails(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const inputs = Array.from(
      event.currentTarget.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >('input:not([type="hidden"]), textarea'),
    );
    const next = Object.fromEntries(
      inputs.map((input) => [input.id, checkoutFieldError(input)]),
    );
    setErrors(next);
    setValidated(true);
    const invalid = inputs.find((input) => next[input.id]);
    if (invalid) {
      setFeedback('Please check your contact information.');
      invalid.focus();
    } else {
      setFeedback(
        'Your details are valid. Payments are not configured, so your order has not been placed.',
      );
      void refresh();
    }
  }
  return {
    cart,
    preorder,
    view,
    setView,
    pending,
    validated,
    setValidated,
    feedback,
    setFeedback,
    errors,
    setErrors,
    contact,
    legacy,
    issue,
    refresh,
    submitDetails,
  };
}
