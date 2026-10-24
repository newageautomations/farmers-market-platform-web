import { checkoutFieldError } from '../lib/checkout-contact';
import CheckoutLoyalty from './CheckoutLoyalty';
import { buttonClassName } from '@market/ui/presentation';
import { Button, FormError, Input, Select } from '@market/ui';
import { PhoneInput } from '@market/ui';
import { useRef, useState } from 'react';
import type { CheckoutView, PickupOption } from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from './shop-client';

export function CheckoutSummary({
  view,
  totalsOnly = false,
}: {
  view: CheckoutView;
  totalsOnly?: boolean;
}) {
  return (
    <div className="checkout-summary">
      {!totalsOnly && view.occurrenceId && (
        <p>
          Market pickup: {view.pickupPromise.venue}{' '}
          {view.pickupPromise.startsAt &&
            new Date(view.pickupPromise.startsAt).toLocaleString()}
        </p>
      )}
      {!totalsOnly && view.contact && (
        <p>
          {view.contact.firstName} {view.contact.lastName} ·{' '}
          {view.contact.emailAddress}
          {view.contact.phoneNumber && ` · ${view.contact.phoneNumber}`}
        </p>
      )}
      {!totalsOnly &&
        view.groups.map((group) => (
          <section key={group.vendorId} aria-label={group.vendorName}>
            <h2 className="ui-section-title-consumer">{group.vendorName}</h2>
            <ul>
              {group.lines.map((line) => (
                <li key={line.id}>
                  {line.name} × {line.quantity}{' '}
                  <span>{formatMoney(line.total, view.currency)}</span>
                </li>
              ))}
            </ul>
            {group.pickup.map((pickup, i) => (
              <p key={i}>
                {pickup.name} · {formatMoney(pickup.fee, view.currency)}
              </p>
            ))}
          </section>
        ))}
      <dl className="checkout-totals">
        <div>
          <dt>Subtotal including tax</dt>
          <dd>{formatMoney(view.subtotal, view.currency)}</dd>
        </div>
        {view.discounts.map((item, i) => (
          <div key={`discount-${i}`}>
            <dt>{item.name}</dt>
            <dd>{formatMoney(item.total, view.currency)}</dd>
          </div>
        ))}
        {view.taxes.map((item, i) => (
          <div key={`tax-${i}`}>
            <dt>{item.name} (included)</dt>
            <dd>{formatMoney(item.total, view.currency)}</dd>
          </div>
        ))}
        <div>
          <dt>Pickup fees</dt>
          <dd>{formatMoney(view.shipping, view.currency)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatMoney(view.total, view.currency)}</dd>
        </div>
      </dl>
    </div>
  );
}
export function Checkout({
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
  return (
    <div className="checkout-shell" aria-busy={pending}>
      {stage !== 'Confirmation' && !view.committed && view.profile && (
        <CheckoutLoyalty
          vendors={view.groups.map((g) => g.vendorId)}
          onApplied={refresh}
          disabled={pending || !!view.attempt || stage === 'Payment'}
        />
      )}
      <nav aria-label="Checkout progress">
        <ol className="checkout-progress">
          {['Contact', 'Pickup', 'Review', 'Payment', 'Confirmation'].map(
            (step) => (
              <li key={step} aria-current={stage === step ? 'step' : undefined}>
                {step}
              </li>
            ),
          )}
        </ol>
      </nav>
      <h2 className="ui-section-title-consumer" ref={heading} tabIndex={-1}>
        {stage}
      </h2>
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      {view.committed ? (
        <p>
          Your order is confirmed.{' '}
          <a
            className={buttonClassName({
              variant: 'secondary',
              className: 'button secondary',
            })}
            href={`/checkout/success?order=${view.orderId}`}
          >
            View confirmation
          </a>
        </p>
      ) : stage === 'Contact' ? (
        <form
          noValidate
          onBlurCapture={(event) => {
            if (
              !(event.target instanceof HTMLInputElement) ||
              !['firstName', 'lastName', 'emailAddress'].includes(
                event.target.name,
              )
            )
              return;
            const input = event.target;
            input.value = input.value.trim();
            setContactErrors((previous) => ({
              ...previous,
              [input.name]: checkoutFieldError(input),
            }));
          }}
          onSubmit={(e) => {
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
            const invalid = fields.find(
              (input) => errors[input.name || input.id],
            );
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
          }}
        >
          <p>Enter your pickup contact. You can purchase without an account.</p>
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <Input
              aria-invalid={!!contactErrors.firstName}
              aria-describedby={
                contactErrors.firstName ? 'firstName-error' : undefined
              }
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={100}
              required
              defaultValue={contact?.firstName ?? ''}
              disabled={pending}
            />
            {contactErrors.firstName && (
              <FormError id="firstName-error">
                {contactErrors.firstName}
              </FormError>
            )}
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <Input
              aria-invalid={!!contactErrors.lastName}
              aria-describedby={
                contactErrors.lastName ? 'lastName-error' : undefined
              }
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              maxLength={100}
              required
              defaultValue={contact?.lastName ?? ''}
              disabled={pending}
            />
            {contactErrors.lastName && (
              <FormError id="lastName-error">
                {contactErrors.lastName}
              </FormError>
            )}
          </div>
          <div className="field">
            <label htmlFor="emailAddress">Email</label>
            <Input
              aria-invalid={!!contactErrors.emailAddress}
              aria-describedby={
                contactErrors.emailAddress ? 'emailAddress-error' : undefined
              }
              id="emailAddress"
              name="emailAddress"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              defaultValue={contact?.emailAddress ?? ''}
              readOnly={!!view.profile}
              disabled={pending}
            />
            {contactErrors.emailAddress && (
              <FormError id="emailAddress-error">
                {contactErrors.emailAddress}
              </FormError>
            )}
          </div>
          <div className="field">
            <PhoneInput
              id="phoneNumber"
              name="phoneNumber"
              label="Phone number"
              required
              validationMode="blur"
              showValidation={contactSubmitted}
              defaultValue={contact?.phoneNumber ?? ''}
            />
          </div>
          <Button type="submit" variant="primary" disabled={pending}>
            Continue to pickup
          </Button>
        </form>
      ) : stage === 'Pickup' ? (
        <form
          onSubmit={(e) => {
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
          }}
        >
          {view.groups.map((group) => {
            const own = options.filter((o) => o.vendorId === group.vendorId);
            return (
              <fieldset key={group.vendorId} disabled={pending}>
                <legend>{group.vendorName}</legend>
                {own.length ? (
                  own.map((option) => (
                    <label className="pickup-choice" key={option.methodId}>
                      <Input
                        type="radio"
                        name={'pickup-' + group.vendorId}
                        value={option.methodId}
                        required
                        defaultChecked={own.length === 1}
                      />
                      <span>
                        {option.name} ·{' '}
                        {formatMoney(option.price, option.currencyCode)}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="alert ui-alert ui-alert-error" role="alert">
                    Pickup is currently unavailable for this Vendor. Contact the
                    Storefront before continuing.
                  </p>
                )}
              </fieldset>
            );
          })}
          <Button
            variant="secondary"
            type="button"
            onClick={() => go('Contact')}
            disabled={pending}
          >
            Edit contact
          </Button>{' '}
          <Button
            type="submit"
            variant="primary"
            disabled={
              pending ||
              view.groups.some(
                (g) => !options.some((o) => o.vendorId === g.vendorId),
              )
            }
          >
            Review order
          </Button>
        </form>
      ) : stage === 'Review' ? (
        <>
          <CheckoutSummary view={view} />
          <Button
            type="submit"
            variant="primary"
            onClick={() => go('Pickup')}
            disabled={pending}
          >
            Edit pickup
          </Button>{' '}
          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                await refresh();
                go('Payment');
              })
            }
          >
            Continue to payment
          </Button>
        </>
      ) : (
        <>
          <CheckoutSummary view={view} />
          {paymentUncertain ||
          ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
            view.paymentStatus,
          ) ? (
            <p className="alert ui-alert ui-alert-warning" role="alert">
              Payment status is uncertain. Your purchase has not been confirmed.
              Refresh the checkout status before continuing. Do not submit
              another payment.
            </p>
          ) : view.paymentStatus === 'FAILED' ? (
            <p className="alert ui-alert ui-alert-error" role="alert">
              Payment failed. Your purchase has not been confirmed. Check the
              checkout status before trying again.
            </p>
          ) : view.availability.state !== 'AVAILABLE' ? (
            <p className="alert ui-alert ui-alert-info" role="status">
              Online payment is not currently configured. Your order has not
              been placed.
            </p>
          ) : view.attempt &&
            !['HELD', 'COMMITTED'].includes(view.attempt.state) ? (
            <p className="alert ui-alert ui-alert-error" role="alert">
              {view.attempt.state === 'EXPIRED'
                ? 'Checkout expired.'
                : 'Inventory or checkout details are no longer available.'}{' '}
              Your purchase has not been confirmed.{' '}
              <a
                className={buttonClassName({
                  variant: 'secondary',
                  className: 'button secondary',
                })}
                href="/cart"
              >
                Return to cart
              </a>
            </p>
          ) : (
            <>
              {view.availability.mode === 'LOCAL' && (
                <div className="field">
                  <label htmlFor="payment-method">Payment method</label>
                  <Select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    disabled={pending}
                    aria-describedby="test-payment-notice"
                  >
                    <option value="">Select a payment method</option>
                    <option value="dev-test-payment">
                      {'Test Payment \u2014 No Charge'}
                    </option>
                  </Select>
                  <p id="test-payment-notice">
                    This is a test purchase. No real payment will be made.
                  </p>
                </div>
              )}
              {view.attempt?.state === 'HELD' && (
                <p className="alert ui-alert ui-alert-info" role="status">
                  Checkout is held until{' '}
                  {view.attempt.expiresAt
                    ? new Date(view.attempt.expiresAt).toLocaleTimeString()
                    : 'the hold expires'}
                  . Check status before resuming.
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={
                  pending ||
                  view.availability.mode !== 'LOCAL' ||
                  paymentMethod !== 'dev-test-payment'
                }
                onClick={() =>
                  void run(async () => {
                    const current = await refresh();
                    if (current.committed) {
                      window.location.assign(
                        `/checkout/success?order=${current.orderId}`,
                      );
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
                    if (
                      attempt.state !== 'HELD' &&
                      attempt.state !== 'COMMITTED'
                    ) {
                      const status = await refresh();
                      setPaymentUncertain(
                        ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
                          status.paymentStatus,
                        ),
                      );
                      return;
                    }
                    if (attempt.state === 'COMMITTED') {
                      const status = await refresh();
                      if (status.committed)
                        window.location.assign(
                          `/checkout/success?order=${status.orderId}`,
                        );
                      return;
                    }
                    const result = await shopCall<{
                      state: string;
                      orderId: string;
                    }>(storefrontId, 'checkout-finalize', {
                      attemptId: attempt.attemptId,
                    });
                    if (result.state === 'COMMITTED')
                      window.location.assign(
                        `/checkout/success?order=${result.orderId}`,
                      );
                    else {
                      const status = await refresh();
                      setPaymentUncertain(
                        ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
                          status.paymentStatus,
                        ),
                      );
                    }
                  })
                }
              >
                {pending
                  ? 'Checking checkout…'
                  : view.attempt
                    ? 'Complete purchase'
                    : 'Place order'}
              </Button>
            </>
          )}
          {view.attempt && !view.committed && (
            <Button
              type="submit"
              variant="primary"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await shopCall(storefrontId, 'checkout-release', {
                    attemptId: view.attempt!.attemptId,
                  });
                  await refresh();
                })
              }
            >
              Cancel checkout
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                const status = await refresh();
                setPaymentUncertain(
                  ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
                    status.paymentStatus,
                  ),
                );
              })
            }
          >
            Refresh checkout status
          </Button>
          {!view.frozen && (
            <Button
              type="submit"
              variant="primary"
              disabled={pending}
              onClick={() => go('Review')}
            >
              Back to review
            </Button>
          )}
        </>
      )}
    </div>
  );
}
