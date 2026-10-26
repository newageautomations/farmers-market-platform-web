import { useState, useRef, type SubmitEvent } from 'react';
import type { CheckoutView, PickupOption } from '@market/api';
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
    [error, setError] = useState(''),
    [paymentMethod, setPaymentMethod] = useState(''),
    [paymentUncertain, setPaymentUncertain] = useState(false);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>(
    {},
  );
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const lock = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  const contact = view.contact ?? view.profile;
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
    }
  }
  async function refresh() {
    const current = await shopCall<CheckoutView>(
      storefrontId,
      'checkout-status',
      { orderId: view.orderId },
    );
    setView(current);
    onViewChange?.(current);
    return current;
  }
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
      await refresh();
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
    pay,
  };
}
