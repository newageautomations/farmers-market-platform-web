import type { ReactNode } from 'react';
import { StripeCheckout } from '../StripeCheckout';
import { CheckoutTermsAcceptance } from '../CheckoutTermsAcceptance';
import { CheckoutContactDetails } from '../CheckoutContactDetails';
import { CheckoutPickup, CheckoutPickupSelections } from '../CheckoutPickup';
import {
  CheckoutReviewSummary,
  checkoutStageLabel,
  checkoutSteps,
} from '../Checkout';
import type { CheckoutView, PublicCart } from '@market/api';
import { formatMoney } from '@market/config';
import { Button, PhoneInput, ErrorBoundary, fieldLimits } from '@market/ui';
import { safeAsset } from '@market/storefront-core/catalog';
import type { VendorPreorderState } from '../../lib/vendor-preorder';
import { useVendorCheckout } from '../../lib/use-vendor-checkout';
import { useCheckout } from '../../lib/use-checkout';
import { VendorPreorderBanner } from '../VendorPreorderBanner';
import { CartTotals } from '../CartTotals';
import CheckoutLoyalty from '../CheckoutLoyalty';
import { shopCall } from '../shop-client';

export function Summary({
  view,
  unresolved = false,
  images = {},
}: {
  view: CheckoutView;
  unresolved?: boolean;
  images?: Record<string, string>;
}) {
  return (
    <div className="farmhouse-summary">
      {view.groups.map((group) => (
        <section key={group.vendorId}>
          <h3>{group.vendorName}</h3>
          {group.lines.map((line) => (
            <p className="checkout-summary-product" key={line.id}>
              {safeAsset(images[line.id]) && (
                <img
                  src={safeAsset(images[line.id])}
                  alt=""
                  width="64"
                  height="64"
                />
              )}
              <span>
                {line.name} × {line.quantity}
              </span>
              <span>{formatMoney(line.total, view.currency)}</span>
            </p>
          ))}
          {!unresolved &&
            view.preorderFee?.vendors
              .filter(
                (v) => v.vendorId === group.vendorId && v.preorderFee !== 0,
              )
              .map((v) => (
                <p key={v.vendorId}>
                  Preorder fee: {formatMoney(v.preorderFee, view.currency)}
                </p>
              ))}
          {group.pickup
            .filter((pickup) => pickup.fee !== 0)
            .map((pickup, i) => (
              <p key={i}>
                {pickup.name}
                {pickup.fee !== 0 &&
                  ` · ${formatMoney(pickup.fee, view.currency)}`}
              </p>
            ))}
        </section>
      ))}
      {unresolved ? (
        <p role="status">Updating order total…</p>
      ) : (
        <dl>
          <div>
            <dt>Subtotal including tax</dt>
            <dd>{formatMoney(view.subtotal, view.currency)}</dd>
          </div>
          {view.discounts
            .filter((d) => d.total !== 0)
            .map((d, i) => (
              <div key={'d' + i}>
                <dt>{d.name}</dt>
                <dd>{formatMoney(d.total, view.currency)}</dd>
              </div>
            ))}
          {view.taxes
            .filter((t) => t.total !== 0)
            .map((t, i) => (
              <div key={'t' + i}>
                <dt>{t.name} (included)</dt>
                <dd>{formatMoney(t.total, view.currency)}</dd>
              </div>
            ))}
          {view.shipping !== 0 && (
            <div>
              <dt>Pickup fees</dt>
              <dd>{formatMoney(view.shipping, view.currency)}</dd>
            </div>
          )}
          {!!view.preorderFee?.preorderFee && (
            <div>
              <dt>Preorder fee</dt>
              <dd>
                {formatMoney(view.preorderFee.preorderFee, view.currency)}
              </dd>
            </div>
          )}
          <div>
            <dt>Total</dt>
            <dd>{formatMoney(view.total, view.currency)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
export function Pickup({
  view,
  preorder,
  showSelections = false,
}: {
  view: CheckoutView;
  preorder?: VendorPreorderState;
  showSelections?: boolean;
}) {
  const occurrence = preorder?.selected ?? preorder?.orderOccurrence;
  const venue = view.pickupPromise.venue || occurrence?.venue;
  const start = occurrence?.startsAt || view.pickupPromise.startsAt;
  const end = occurrence?.endsAt || view.pickupPromise.endsAt;
  const timeZone = occurrence?.timezone;
  const date = (value: string) =>
    new Date(value).toLocaleString('en-US', {
      timeZone,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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
      {showSelections && <CheckoutPickupSelections view={view} />}
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
      <p className="required-legend farmhouse-full">
        <span className="required-mark" aria-hidden="true">
          *
        </span>{' '}
        Required
      </p>
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
            <span className="required-mark" aria-hidden="true">
              *
            </span>
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
          label="Phone number (optional)"
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
  const orderSummary = (
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
          {state.legacy || view.preorderFee ? (
            <Summary
              view={view}
              unresolved={
                view.availability.mode === 'STRIPE_TEST' && !view.preorderFee
              }
            />
          ) : (
            <CartTotals cart={cart} />
          )}
        </>
      ) : (
        <Summary
          view={view}
          unresolved={
            view.availability.mode === 'STRIPE_TEST' && !view.preorderFee
          }
        />
      )}
      <p>
        Current amounts include tax. Final taxes and pickup fees are confirmed
        during checkout.
      </p>
      <a href="/cart">Edit your bag ↗</a>
    </aside>
  );
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
      {state.issue && !view.committed && !view.frozen && (
        <p role="alert">
          {state.issue} <a href="/cart">Review your bag</a>
        </p>
      )}
      {state.legacy ? (
        <CheckoutFlow
          preorder={preorder}
          storefrontId={props.storefrontId}
          initial={view}
          onViewChange={state.setView}
          orderSummary={orderSummary}
          images={Object.fromEntries(
            (cart?.lines ?? []).map((line) => [
              line.id,
              line.featuredAsset?.preview ?? '',
            ]),
          )}
        />
      ) : (
        <div className="farmhouse-checkout-composition">
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
          {orderSummary}
        </div>
      )}
    </article>
  );
}
function CheckoutFlow(props: {
  preorder?: VendorPreorderState;
  storefrontId: string;
  initial: CheckoutView;
  onViewChange: (view: CheckoutView) => void;
  orderSummary: ReactNode;
  images: Record<string, string>;
}) {
  const { headingRef, ...c } = useCheckout({
    ...props,
    reviewIncludesPayment: true,
  });
  const { view, pending } = c;
  const review = c.stage === 'Review' && !view.committed;
  const uncertain =
    c.paymentUncertain ||
    ['PENDING', 'RECONCILIATION_REQUIRED'].includes(view.paymentStatus);
  const blocked =
    uncertain ||
    view.paymentStatus === 'FAILED' ||
    view.availability.state !== 'AVAILABLE' ||
    (!!view.attempt && !['HELD', 'COMMITTED'].includes(view.attempt.state));
  const backAction = !view.committed &&
    c.stage !== 'Contact' &&
    c.stage !== 'Confirmation' && (
      <Button
        type="button"
        variant="secondary"
        disabled={pending || c.paymentBusy}
        onClick={() => void c.back(review ? 'Pickup' : 'Contact')}
      >
        Back
      </Button>
    );
  return (
    <div className="farmhouse-checkout-flow" aria-busy={pending}>
      {!view.committed && !review && view.profile && (
        <CheckoutLoyalty
          vendors={view.groups.map((g) => g.vendorId)}
          onApplied={c.refresh}
          disabled={pending || !!view.attempt}
        />
      )}
      <nav aria-label="Checkout progress">
        <ol className="farmhouse-progress">
          {checkoutSteps.map((step) => (
            <li key={step} aria-current={c.stage === step ? 'step' : undefined}>
              {checkoutStageLabel(step)}
            </li>
          ))}
        </ol>
      </nav>
      <h2
        className={review ? undefined : 'sr-only'}
        ref={headingRef}
        tabIndex={-1}
      >
        {checkoutStageLabel(c.stage)}
      </h2>
      {c.error && (
        <>
          <p role="alert">{c.error}</p>
          {c.stripeEnabled && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending || c.quoting}
              onClick={() =>
                void c.run(async () => {
                  await c.refresh();
                })
              }
            >
              Retry checkout
            </Button>
          )}
        </>
      )}
      <div
        className={
          review ? 'vendor-checkout-layout' : 'farmhouse-checkout-composition'
        }
      >
        <div>
          {view.committed ? (
            <p>
              Your order is confirmed.{' '}
              <a href={`/checkout/success?order=${view.orderId}`}>
                View confirmation
              </a>
            </p>
          ) : c.stage === 'Contact' ? (
            <form
              noValidate
              className="farmhouse-form"
              onSubmit={c.submitContact}
            >
              <ContactFields
                contact={c.contact}
                errors={c.contactErrors}
                submitted={c.contactSubmitted}
              />
              <button
                type="submit"
                className="farmhouse-button"
                disabled={pending}
              >
                Continue to pickup ↗
              </button>
            </form>
          ) : c.stage === 'Pickup' ? (
            <form className="farmhouse-form" onSubmit={c.submitPickup}>
              <Pickup view={view} preorder={props.preorder} />
              {view.groups.map((group) => (
                <fieldset key={group.vendorId} disabled={pending}>
                  <legend>{group.vendorName}</legend>
                  {c.options
                    .filter((o) => o.vendorId === group.vendorId)
                    .map((option) => (
                      <label
                        className="checkout-pickup-choice"
                        key={option.methodId}
                      >
                        <input
                          type="radio"
                          name={'pickup-' + group.vendorId}
                          value={option.methodId}
                          required
                          checked={
                            c.pickupSelections[group.vendorId] ===
                              option.methodId ||
                            (!c.pickupSelections[group.vendorId] &&
                              c.options.filter(
                                (o) => o.vendorId === group.vendorId,
                              ).length === 1)
                          }
                          onChange={() =>
                            c.setPickupSelections((previous) => ({
                              ...previous,
                              [group.vendorId]: option.methodId,
                            }))
                          }
                        />
                        <span>
                          {option.name}
                          {option.price !== 0 &&
                            ` · ${formatMoney(option.price, option.currencyCode)}`}
                          {option.instructions && (
                            <>
                              <br />
                              <small>{option.instructions}</small>
                            </>
                          )}
                        </span>
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
                <div className="checkout-stage-actions">
                  {backAction}
                  <button
                    className="farmhouse-button"
                    disabled={
                      pending ||
                      view.groups.some(
                        (g) =>
                          !c.options.some((o) => o.vendorId === g.vendorId),
                      )
                    }
                  >
                    Review order ↗
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <CheckoutContactDetails contact={c.contact} />
              <CheckoutPickup
                view={view}
                preorder={props.preorder}
                showSelections
              />
              {c.stripeEnabled ? (
                view.preorderFee ? (
                  <StripeCheckout
                    backAction={backAction}
                    onBusyChange={c.setPaymentBusy}
                    disabled={pending || c.quoting || !!c.error}
                    key={view.orderId}
                    storefrontId={props.storefrontId}
                    view={view}
                    onTermsChanged={c.refresh}
                  />
                ) : (
                  <>
                    <p role="status">Updating order total…</p>
                    {backAction}
                  </>
                )
              ) : (
                <>
                  {!view.attempt && backAction}
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
                          <p>
                            This is a test purchase. No real payment will be
                            made.
                          </p>
                        </>
                      )}
                      <CheckoutTermsAcceptance
                        disclosure={view.termsDisclosure}
                        checked={c.termsAccepted}
                        disabled={pending}
                        onChange={c.setTermsAccepted}
                      />
                      <button
                        type="button"
                        className="farmhouse-button"
                        disabled={
                          pending ||
                          !c.termsAccepted ||
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
                          await shopCall(
                            props.storefrontId,
                            'checkout-release',
                            {
                              attemptId: view.attempt!.attemptId,
                            },
                          );
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
                </>
              )}
            </>
          )}
        </div>
        {review ? (
          <CheckoutReviewSummary
            view={view}
            images={props.images}
            unresolved={
              c.stripeEnabled &&
              (pending || c.quoting || !!c.error || !view.preorderFee)
            }
          />
        ) : (
          props.orderSummary
        )}
      </div>
    </div>
  );
}
