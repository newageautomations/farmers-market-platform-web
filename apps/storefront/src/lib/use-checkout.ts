import { useEffect, useState, useRef, type SubmitEvent } from 'react';
import type {
  CheckoutView,
  PickupOption,
  StripeCheckoutStatus,
} from '@market/api';
import { shopCall } from '../components/shop-client';
import { checkoutFieldError } from './checkout-contact';
export function useCheckout({
  storefrontId,
  initial,
  onViewChange,
}: {
  storefrontId: string;
  initial: CheckoutView;
  onViewChange?: (view: CheckoutView) => void;
}) {
  const [view, setView] = useState(initial),
    [stage, setStage] = useState(initial.attempt ? 'Payment' : 'Contact'),
    [options, setOptions] = useState<PickupOption[]>([]),
    [pending, setPending] = useState(false),
    [quoting, setQuoting] = useState(false),
    [error, setError] = useState(''),
    [paymentMethod, setPaymentMethod] = useState(''),
    [paymentUncertain, setPaymentUncertain] = useState(false);
  const stripeEnabled = view.availability.mode === 'STRIPE_TEST';
  const [contactErrors, setContactErrors] = useState<Record<string, string>>(
    {},
  );
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [pickupSelections, setPickupSelections] = useState<
    Record<string, string>
  >({});
  const [paymentBusy, setPaymentBusy] = useState(false);
  const refreshVersion = useRef(0),
    latestView = useRef(initial),
    queuedRefresh = useRef(false);
  const lock = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  const contact = view.contact ?? view.profile;
  useEffect(() => {
    if (view.committed)
      window.location.assign(
        `/checkout/success?order=${encodeURIComponent(view.orderId)}`,
      );
  }, [view.committed, view.orderId]);
  useEffect(() => {
    if (!initial.contact) return;
    let active = true;
    void shopCall<PickupOption[]>(storefrontId, 'checkout-pickup')
      .then((items) => {
        if (!active) return;
        setOptions(items);
        setPickupSelections(
          Object.fromEntries(
            items
              .filter((o) =>
                initial.groups.some(
                  (g) =>
                    g.vendorId === o.vendorId &&
                    g.pickup.some((p) => p.name === o.name),
                ),
              )
              .map((o) => [o.vendorId, o.methodId]),
          ),
        );
        const requested = new URLSearchParams(window.location.search).get(
          'step',
        );
        if (
          requested &&
          ['Contact', 'Pickup', 'Review'].includes(requested) &&
          !initial.attempt
        )
          go(requested);
      })
      .catch(() => {
        /* Contact submission can retry the pickup read. */
      });
    return () => {
      active = false;
    };
  }, [storefrontId, initial.orderId]);
  async function back(next: string) {
    if (paymentBusy || pending) return;
    if (!stripeEnabled || stage !== 'Payment') {
      go(next);
      return;
    }
    await run(async () => {
      let payment = await shopCall<StripeCheckoutStatus | null>(
        storefrontId,
        'stripe-checkout-status',
        { orderId: view.orderId },
      );
      if (!payment) {
        go(next);
        return;
      }
      if (payment.state === 'SETUP_REQUIRED')
        payment = await shopCall<StripeCheckoutStatus>(
          storefrontId,
          'stripe-checkout-cancel',
          { groupId: payment.groupId },
        );
      if (
        ![
          'CANCELED',
          'DECLINED',
          'AUTHORIZATION_FAILED',
          'CAPTURE_FAILED',
          'COMPENSATION_COMPLETED',
        ].includes(payment.state)
      )
        throw new Error('Payment must finish before editing checkout');
      await shopCall(storefrontId, 'checkout-restart', {
        orderId: view.orderId,
      });
      window.location.assign(`/checkout?step=${encodeURIComponent(next)}`);
    });
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      await work();
    } catch {
      setError(
        'The Shop could not complete this step. Refresh to check the current checkout status before trying again.',
      );
    } finally {
      lock.current = false;
      setPending(false);
      heading.current?.focus();
      if (queuedRefresh.current) {
        queuedRefresh.current = false;
        void run(async () => {
          await refresh();
        });
      }
    }
  }
  async function refresh() {
    const revision = ++refreshVersion.current;
    setQuoting(true);
    try {
      const current = await shopCall<CheckoutView>(
        storefrontId,
        'checkout-status',
        { orderId: view.orderId },
      );
      if (revision !== refreshVersion.current) return latestView.current;
      updateView(current);
      return current;
    } finally {
      if (revision === refreshVersion.current) setQuoting(false);
    }
  }
  function updateView(current: CheckoutView) {
    if (current.orderId !== initial.orderId)
      throw new Error('Checkout changed');
    latestView.current = current;
    setView(current);
    onViewChange?.(current);
  }
  useEffect(() => {
    if (!stripeEnabled || !['Review', 'Payment'].includes(stage)) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!active) return;
        if (lock.current) {
          queuedRefresh.current = true;
          return;
        }
        void run(async () => {
          const current = await refresh();
          if (!current.preorderFee)
            throw new Error('Authoritative total unavailable');
        });
      }, 150);
    };
    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('vendor-cart-updated', update);
    window.addEventListener('market-cart-updated', update);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('pageshow', update);
      window.removeEventListener('vendor-cart-updated', update);
      window.removeEventListener('market-cart-updated', update);
    };
  }, [storefrontId, view.orderId, stripeEnabled, stage]);
  function go(next: string) {
    setStage(next);
    setTimeout(() => heading.current?.focus(), 0);
  }
  async function submitContact(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setContactSubmitted(true);
    const fields = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"])',
      ),
    );
    const errors = Object.fromEntries(
      fields.map((input) => [
        input.name || input.id,
        checkoutFieldError(input),
      ]),
    );
    setContactErrors(errors);
    const invalid = fields.find((input) => errors[input.name || input.id]);
    if (invalid) {
      invalid.focus();
      return;
    }
    const data = new FormData(e.currentTarget);
    void run(async () => {
      await shopCall(
        storefrontId,
        'checkout-contact',
        Object.fromEntries(data),
      );
      await refresh();
      setOptions(
        await shopCall<PickupOption[]>(storefrontId, 'checkout-pickup'),
      );
      go('Pickup');
    });
  }
  async function submitPickup(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    void run(async () => {
      await shopCall(storefrontId, 'checkout-select-pickup', {
        methodIds: view.groups.map((g) =>
          String(data.get('pickup-' + g.vendorId)),
        ),
      });
      const current = await refresh();
      if (
        stripeEnabled &&
        (!current.preorderFee || current.orderId !== view.orderId)
      )
        throw new Error('Stripe checkout requires a current fee quote');
      go('Review');
    });
  }
  function pay() {
    return run(async () => {
      const current = await refresh();
      if (current.committed) {
        window.location.assign(`/checkout/success?order=${current.orderId}`);
        return;
      }
      if (
        current.availability.state !== 'AVAILABLE' ||
        current.availability.mode !== 'LOCAL' ||
        ['PENDING', 'RECONCILIATION_REQUIRED', 'FAILED'].includes(
          current.paymentStatus,
        )
      )
        return;
      // Once payment work starts, a lost response must be reconciled by a status read.
      setPaymentUncertain(true);
      const attempt =
        current.attempt ??
        (await shopCall<{ attemptId: string; state: string }>(
          storefrontId,
          'checkout-begin',
        ));
      if (attempt.state !== 'HELD' && attempt.state !== 'COMMITTED') {
        const status = await refresh();
        setPaymentUncertain(
          ['PENDING', 'RECONCILIATION_REQUIRED'].includes(status.paymentStatus),
        );
        return;
      }
      if (attempt.state === 'COMMITTED') {
        const status = await refresh();
        if (status.committed)
          window.location.assign(`/checkout/success?order=${status.orderId}`);
        return;
      }
      const result = await shopCall<{
        state: string;
        orderId: string;
      }>(storefrontId, 'checkout-finalize', {
        attemptId: attempt.attemptId,
      });
      if (result.state === 'COMMITTED')
        window.location.assign(`/checkout/success?order=${result.orderId}`);
      else {
        const status = await refresh();
        setPaymentUncertain(
          ['PENDING', 'RECONCILIATION_REQUIRED'].includes(status.paymentStatus),
        );
      }
    });
  }
  return {
    stripeEnabled,
    quoting,
    updateView,
    view,
    stage,
    options,
    pending,
    error,
    paymentMethod,
    setPaymentMethod,
    paymentUncertain,
    setPaymentUncertain,
    contactErrors,
    setContactErrors,
    contactSubmitted,
    setContactSubmitted,
    headingRef: heading,
    contact,
    run,
    refresh,
    go,
    submitContact,
    submitPickup,
    back,
    pickupSelections,
    setPickupSelections,
    setPaymentBusy,
    paymentBusy,
    pay,
  };
}
