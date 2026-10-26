import type { CheckoutView, PublicCart } from '@market/api';
import { formatMoney } from '@market/config';
import { PhoneInput, ErrorBoundary, fieldLimits } from '@market/ui';
import { safeAsset } from '@market/storefront-core/catalog';
import type { VendorPreorderState } from '../../lib/vendor-preorder';
import { useVendorCheckout } from '../../lib/use-vendor-checkout';
import { useCheckout } from '../../lib/use-checkout';
import { VendorPreorderBanner } from '../VendorPreorderBanner';
import { CartTotals } from '../CartTotals';
import CheckoutLoyalty from '../CheckoutLoyalty';
import { shopCall } from '../shop-client';

export function Summary({ view }: { view: CheckoutView }) {
  return (
    <div className="farmhouse-summary">
      {view.groups.map((group) => (
        <section key={group.vendorId}>
          <h3>{group.vendorName}</h3>
          {group.lines.map((line) => (
            <p key={line.id}>
              {line.name} × {line.quantity}{' '}
              <span>{formatMoney(line.total, view.currency)}</span>
            </p>
          ))}
          {group.pickup.map((pickup, i) => (
            <p key={i}>
              {pickup.name} · {formatMoney(pickup.fee, view.currency)}
            </p>
          ))}
        </section>
      ))}
      <dl>
        <div>
          <dt>Subtotal including tax</dt>
          <dd>{formatMoney(view.subtotal, view.currency)}</dd>
        </div>
        {view.discounts.map((d, i) => (
          <div key={'d' + i}>
            <dt>{d.name}</dt>
            <dd>{formatMoney(d.total, view.currency)}</dd>
          </div>
        ))}
        {view.taxes.map((t, i) => (
          <div key={'t' + i}>
            <dt>{t.name} (included)</dt>
            <dd>{formatMoney(t.total, view.currency)}</dd>
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
export function Pickup({
  view,
  preorder,
}: {
  view: CheckoutView;
  preorder?: VendorPreorderState;
}) {
  const occurrence = preorder?.selected ?? preorder?.orderOccurrence;
  const venue = view.pickupPromise.venue || occurrence?.venue;
  const start = occurrence?.startsAt || view.pickupPromise.startsAt;
  const end = occurrence?.endsAt || view.pickupPromise.endsAt;
  const timeZone = occurrence?.timezone ?? 'UTC';
  const date = (value: string) =>
    new Date(value).toLocaleString('en-US', {
      timeZone,
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return (
    <section className="farmhouse-checkout-section">
      <h2>Your pickup</h2>
      {preorder?.selected?.marketName && (
        <p>{preorder!.selected!.marketName}</p>
      )}
      {start && (
        <p>
          {date(start)}
          {end &&
            ` to ${new Date(end).toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })}`}
        </p>
      )}
      {venue && <p>{venue}</p>}
      <p>
        {view.pickupPromise.instructions ||
          preorder?.selected?.pickupInstructions}
      </p>
    </section>
  );
}
function ContactFields({
  contact,
  errors = {},
  submitted = false,
}: {
  contact: CheckoutView['contact'] | CheckoutView['profile'];
  errors?: Record<string, string>;
  submitted?: boolean;
}) {
  return (
    <div className="farmhouse-checkout-fields">
      {(['firstName', 'lastName', 'emailAddress'] as const).map((name) => (
        <div
          className={name === 'emailAddress' ? 'field farmhouse-full' : 'field'}
          key={name}
        >
          <label htmlFor={name}>
            {
              {
                firstName: 'First name',
                lastName: 'Last name',
                emailAddress: 'Email address',
              }[name]
            }{' '}
            (required)
          </label>
          <input
            id={name}
            name={name}
            required
            type={name === 'emailAddress' ? 'email' : 'text'}
            maxLength={fieldLimits[name]}
            autoComplete={
              {
                firstName: 'given-name',
                lastName: 'family-name',
                emailAddress: 'email',
              }[name]
            }
            defaultValue={contact?.[name] ?? ''}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? name + '-error' : undefined}
          />
          {errors[name] && (
            <p id={name + '-error'} className="farmhouse-error">
              {errors[name]}
            </p>
          )}
        </div>
      ))}
      <div className="farmhouse-full">
        <PhoneInput
          id="phoneNumber"
          name="phoneNumber"
          label="Phone number (required)"
          required
          defaultValue={contact?.phoneNumber ?? ''}
          validationMode="blur"
          showValidation={submitted}
        />
      </div>
    </div>
  );
}
export function Checkout(props: {
  storefrontId: string;
  initial: CheckoutView;
  initialCart: PublicCart | null;
  initialPreorder: VendorPreorderState;
}) {
  return (
    <ErrorBoundary>
      <CheckoutViewContent {...props} />
    </ErrorBoundary>
  );
}
function CheckoutViewContent(props: Parameters<typeof Checkout>[0]) {
  const state = useVendorCheckout(props);
  const { view, cart, preorder, pending } = state;
  return (
    <article
      className="farmhouse-checkout farmhouse-space"
      aria-busy={pending}
      data-farmhouse-component="checkout"
    >
      <header className="farmhouse-commerce-heading">
        <h1>From our table to yours.</h1>
        <a href="/cart">Return to your bag</a>
      </header>
      <VendorPreorderBanner
        storefrontId={props.storefrontId}
        preorder={preorder}
        hasItems={!!cart?.lines.length}
        disabled={pending || !!view.attempt || view.committed}
      />
      {state.issue && !view.committed && (
        <p role="alert">
          {state.issue} <a href="/cart">Review your bag</a>
        </p>
      )}
      <div className="farmhouse-checkout-composition">
        <div>
          {state.legacy ? (
            <CheckoutFlow
              storefrontId={props.storefrontId}
              initial={view}
              onViewChange={state.setView}
            />
          ) : (
            <form
              className="farmhouse-form"
              noValidate
              onSubmit={state.submitDetails}
            >
              <section className="farmhouse-checkout-section">
                <h2>A way to reach you</h2>
                <p>Enter your pickup contact. No account is required.</p>
                <ContactFields
                  contact={state.contact}
                  errors={state.errors}
                  submitted={state.validated}
                />
              </section>
              <Pickup view={view} preorder={preorder} />
              <section className="farmhouse-checkout-section">
                <h2>Payment</h2>
                <p>
                  Online payments are not configured in this environment. Your
                  order has not been placed.
                </p>
              </section>
              <section className="farmhouse-checkout-section">
                <label htmlFor="order-notes">Order notes (optional)</label>
                <textarea
                  id="order-notes"
                  name="note"
                  rows={4}
                  maxLength={fieldLimits.note}
                  aria-invalid={!!state.errors['order-notes']}
                  aria-describedby={
                    state.errors['order-notes']
                      ? 'farmhouse-notes-help farmhouse-notes-error'
                      : 'farmhouse-notes-help'
                  }
                />
                {state.errors['order-notes'] && (
                  <p id="farmhouse-notes-error" className="farmhouse-error">
                    {state.errors['order-notes']}
                  </p>
                )}
                <p id="farmhouse-notes-help">
                  Draft only. Notes are not sent to the vendor yet. Special
                  requests cannot be guaranteed.
                </p>
              </section>
              <p role="status">{state.feedback}</p>
              <div className="ui-actions">
                <button
                  className="farmhouse-button"
                  type="submit"
                  disabled={pending}
                >
                  Check my details
                </button>
                <button className="farmhouse-button" type="button" disabled>
                  Place order
                </button>
              </div>
            </form>
          )}
        </div>
        <aside className="farmhouse-order-panel">
          <h2>Your gathering</h2>
          {cart?.lines.length ? (
            <>
              <ul className="farmhouse-order-lines">
                {cart.lines.map((line) => (
                  <li key={line.id}>
                    {safeAsset(line.featuredAsset?.preview) ? (
                      <img
                        src={safeAsset(line.featuredAsset?.preview)}
                        alt=""
                        width="64"
                        height="80"
                      />
                    ) : (
                      <span />
                    )}
                    <span>
                      {line.productVariant.product.name}
                      <br />
                      {line.productVariant.name} × {line.quantity}
                    </span>
                    <span>
                      {formatMoney(
                        line.discountedLinePriceWithTax,
                        cart.currencyCode,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {state.legacy ? (
                <Summary view={view} />
              ) : (
                <CartTotals cart={cart} />
              )}
            </>
          ) : (
            <Summary view={view} />
          )}
          <p>
            Current amounts include tax. Final taxes and pickup fees are
            confirmed during checkout.
          </p>
          <a href="/cart">Edit your bag ↗</a>
          <button
            className="farmhouse-text-link"
            disabled={pending}
            type="button"
            onClick={() => void state.refresh()}
          >
            Refresh order summary
          </button>
        </aside>
      </div>
    </article>
  );
}
function CheckoutFlow(props: {
  storefrontId: string;
  initial: CheckoutView;
  onViewChange: (view: CheckoutView) => void;
}) {
  const { headingRef, ...c } = useCheckout(props);
  const { view, pending } = c;
  const uncertain =
    c.paymentUncertain ||
    ['PENDING', 'RECONCILIATION_REQUIRED'].includes(view.paymentStatus);
  const blocked =
    uncertain ||
    view.paymentStatus === 'FAILED' ||
    view.availability.state !== 'AVAILABLE' ||
    (!!view.attempt && !['HELD', 'COMMITTED'].includes(view.attempt.state));
  return (
    <div className="farmhouse-checkout-flow" aria-busy={pending}>
      {!view.committed && view.profile && (
        <CheckoutLoyalty
          vendors={view.groups.map((g) => g.vendorId)}
          onApplied={c.refresh}
          disabled={pending || !!view.attempt || c.stage === 'Payment'}
        />
      )}
      <nav aria-label="Checkout progress">
        <ol className="farmhouse-progress">
          {['Contact', 'Pickup', 'Review', 'Payment', 'Confirmation'].map(
            (step) => (
              <li
                key={step}
                aria-current={c.stage === step ? 'step' : undefined}
              >
                {step}
              </li>
            ),
          )}
        </ol>
      </nav>
      <h2 ref={headingRef} tabIndex={-1}>
        {c.stage}
      </h2>
      {c.error && <p role="alert">{c.error}</p>}
      {view.committed ? (
        <p>
          Your order is confirmed.{' '}
          <a href={`/checkout/success?order=${view.orderId}`}>
            View confirmation
          </a>
        </p>
      ) : c.stage === 'Contact' ? (
        <form noValidate className="farmhouse-form" onSubmit={c.submitContact}>
          <ContactFields
            contact={c.contact}
            errors={c.contactErrors}
            submitted={c.contactSubmitted}
          />
          <button type="submit" className="farmhouse-button" disabled={pending}>
            Continue to pickup ↗
          </button>
        </form>
      ) : c.stage === 'Pickup' ? (
        <form className="farmhouse-form" onSubmit={c.submitPickup}>
          {view.groups.map((group) => (
            <fieldset key={group.vendorId} disabled={pending}>
              <legend>{group.vendorName}</legend>
              {c.options
                .filter((o) => o.vendorId === group.vendorId)
                .map((option) => (
                  <label key={option.methodId}>
                    <input
                      type="radio"
                      name={'pickup-' + group.vendorId}
                      value={option.methodId}
                      required
                      defaultChecked={
                        c.options.filter((o) => o.vendorId === group.vendorId)
                          .length === 1
                      }
                    />
                    {option.name} ·{' '}
                    {formatMoney(option.price, option.currencyCode)}
                  </label>
                ))}
              {!c.options.some((o) => o.vendorId === group.vendorId) && (
                <p role="alert">
                  Pickup is currently unavailable for this vendor.
                </p>
              )}
            </fieldset>
          ))}
          <div className="ui-actions">
            <button
              type="button"
              disabled={pending}
              onClick={() => c.go('Contact')}
            >
              Edit contact
            </button>
            <button
              className="farmhouse-button"
              disabled={
                pending ||
                view.groups.some(
                  (g) => !c.options.some((o) => o.vendorId === g.vendorId),
                )
              }
            >
              Review order ↗
            </button>
          </div>
        </form>
      ) : c.stage === 'Review' ? (
        <>
          <Summary view={view} />
          <button
            type="button"
            disabled={pending}
            onClick={() => c.go('Pickup')}
          >
            Edit pickup
          </button>
          <button
            className="farmhouse-button"
            disabled={pending}
            onClick={() =>
              void c.run(async () => {
                await c.refresh();
                c.go('Payment');
              })
            }
          >
            Continue to payment ↗
          </button>
        </>
      ) : (
        <>
          <Summary view={view} />
          {blocked ? (
            <p role="status">
              {uncertain
                ? 'Payment status is uncertain. Do not submit another payment. Refresh the checkout status.'
                : view.paymentStatus === 'FAILED'
                  ? 'Payment failed. Your purchase has not been confirmed.'
                  : view.availability.state !== 'AVAILABLE'
                    ? 'Online payment is not configured. Your order has not been placed.'
                    : 'Checkout is no longer available. Return to your bag.'}
            </p>
          ) : (
            <div className="farmhouse-form">
              {view.availability.mode === 'LOCAL' && (
                <>
                  <label htmlFor="farmhouse-payment-method">
                    Payment method
                  </label>
                  <select
                    id="farmhouse-payment-method"
                    value={c.paymentMethod}
                    disabled={pending}
                    onChange={(e) => c.setPaymentMethod(e.target.value)}
                  >
                    <option value="">Select a payment method</option>
                    <option value="dev-test-payment">
                      Test payment, no charge
                    </option>
                  </select>
                  <p>This is a test purchase. No real payment will be made.</p>
                </>
              )}
              <button
                type="button"
                className="farmhouse-button"
                disabled={
                  pending ||
                  view.availability.mode !== 'LOCAL' ||
                  c.paymentMethod !== 'dev-test-payment'
                }
                onClick={() => void c.pay()}
              >
                {pending
                  ? 'Checking checkout…'
                  : view.attempt
                    ? 'Complete purchase'
                    : 'Place order'}
              </button>
            </div>
          )}
          {view.attempt && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void c.run(async () => {
                  await shopCall(props.storefrontId, 'checkout-release', {
                    attemptId: view.attempt!.attemptId,
                  });
                  await c.refresh();
                })
              }
            >
              Cancel checkout
            </button>
          )}
          <button
            type="button"
            className="farmhouse-text-link"
            disabled={pending}
            onClick={() =>
              void c.run(async () => {
                const status = await c.refresh();
                c.setPaymentUncertain(
                  ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
                    status.paymentStatus,
                  ),
                );
              })
            }
          >
            Refresh checkout status
          </button>
          {!view.frozen && (
            <button
              type="button"
              disabled={pending}
              onClick={() => c.go('Contact')}
            >
              Edit contact
            </button>
          )}
        </>
      )}
    </div>
  );
}
