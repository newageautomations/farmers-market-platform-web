import { useRef, useState } from 'react';
import type { CheckoutView, PickupOption } from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from './shop-client';

export function CheckoutSummary({ view }: { view: CheckoutView }) {
  return (
    <div className="checkout-summary">
      {view.occurrenceId && (
        <p>
          Market pickup: {view.pickupPromise.venue}{' '}
          {view.pickupPromise.startsAt &&
            new Date(view.pickupPromise.startsAt).toLocaleString()}
        </p>
      )}
      {view.contact && (
        <p>
          {view.contact.firstName} {view.contact.lastName} ·{' '}
          {view.contact.emailAddress}
          {view.contact.phoneNumber && ` · ${view.contact.phoneNumber}`}
        </p>
      )}
      {view.groups.map((group) => (
        <section key={group.vendorId} aria-label={group.vendorName}>
          <h2>{group.vendorName}</h2>
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
            <dt>{item.name}</dt>
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
}: {
  storefrontId: string;
  initial: CheckoutView;
}) {
  const [view, setView] = useState(initial),
    [stage, setStage] = useState(initial.attempt ? 'Payment' : 'Contact'),
    [options, setOptions] = useState<PickupOption[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
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
    );
    setView(current);
    return current;
  }
  function go(next: string) {
    setStage(next);
    setTimeout(() => heading.current?.focus(), 0);
  }
  return (
    <div className="checkout-shell" aria-busy={pending}>
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
      <h2 ref={heading} tabIndex={-1}>
        {stage}
      </h2>
      {error && <p role="alert">{error}</p>}
      {view.committed ? (
        <p>
          Your order is confirmed.{' '}
          <a href={`/checkout/success?order=${view.orderId}`}>
            View confirmation
          </a>
        </p>
      ) : stage === 'Contact' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
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
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={100}
              required
              defaultValue={contact?.firstName ?? ''}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              maxLength={100}
              required
              defaultValue={contact?.lastName ?? ''}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="emailAddress">Email</label>
            <input
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
          </div>
          <div className="field">
            <label htmlFor="phoneNumber">Phone (optional pickup contact)</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              defaultValue={contact?.phoneNumber ?? ''}
              disabled={pending}
            />
          </div>
          <button className="button" disabled={pending}>
            Continue to pickup
          </button>
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
                      <input
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
                  <p role="alert">
                    Pickup is currently unavailable for this Vendor. Contact the
                    Storefront before continuing.
                  </p>
                )}
              </fieldset>
            );
          })}
          <button
            type="button"
            onClick={() => go('Contact')}
            disabled={pending}
          >
            Edit contact
          </button>{' '}
          <button
            className="button"
            disabled={
              pending ||
              view.groups.some(
                (g) => !options.some((o) => o.vendorId === g.vendorId),
              )
            }
          >
            Review order
          </button>
        </form>
      ) : stage === 'Review' ? (
        <>
          <CheckoutSummary view={view} />
          <button onClick={() => go('Pickup')} disabled={pending}>
            Edit pickup
          </button>{' '}
          <button
            className="button"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                await refresh();
                go('Payment');
              })
            }
          >
            Continue to payment
          </button>
        </>
      ) : (
        <>
          <CheckoutSummary view={view} />
          {['PENDING', 'RECONCILIATION_REQUIRED'].includes(
            view.paymentStatus,
          ) ? (
            <p role="alert">
              Payment status is uncertain. Your purchase has not been confirmed.
              Refresh the checkout status before continuing. Do not submit
              another payment.
            </p>
          ) : view.paymentStatus === 'FAILED' ? (
            <p role="alert">
              Payment failed. Your purchase has not been confirmed. Check the
              checkout status before trying again.
            </p>
          ) : view.availability.state !== 'AVAILABLE' ? (
            <p role="status">
              Online payment is not currently configured. Your order has not
              been placed.
            </p>
          ) : view.attempt &&
            !['HELD', 'COMMITTED'].includes(view.attempt.state) ? (
            <p role="alert">
              {view.attempt.state === 'EXPIRED'
                ? 'Checkout expired.'
                : 'Inventory or checkout details are no longer available.'}{' '}
              Your purchase has not been confirmed.{' '}
              <a href="/cart">Return to cart</a>
            </p>
          ) : (
            <>
              {view.availability.mode === 'LOCAL' && (
                <p>
                  Local test payment. No card or external payment provider is
                  used.
                </p>
              )}
              {view.attempt?.state === 'HELD' && (
                <p role="status">
                  Checkout is held until{' '}
                  {view.attempt.expiresAt
                    ? new Date(view.attempt.expiresAt).toLocaleTimeString()
                    : 'the hold expires'}
                  . Check status before resuming.
                </p>
              )}
              <button
                className="button"
                disabled={pending || view.availability.mode !== 'LOCAL'}
                onClick={() =>
                  void run(async () => {
                    const current = await refresh();
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
                      await refresh();
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
                    else await refresh();
                  })
                }
              >
                {pending
                  ? 'Checking checkout…'
                  : view.attempt
                    ? 'Resume local payment'
                    : 'Confirm local test payment'}
              </button>
            </>
          )}
          {view.attempt && !view.committed && (
            <button
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
            </button>
          )}
          <button
            disabled={pending}
            onClick={() =>
              void run(async () => {
                await refresh();
              })
            }
          >
            Refresh checkout status
          </button>
          {!view.frozen && (
            <button disabled={pending} onClick={() => go('Review')}>
              Back to review
            </button>
          )}
        </>
      )}
    </div>
  );
}
