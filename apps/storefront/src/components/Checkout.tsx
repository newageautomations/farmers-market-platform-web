import type { ReactNode } from 'react';
import { VendorPreorderBanner } from './VendorPreorderBanner';
import { safeAsset } from '@market/storefront-core/catalog';
import { CheckoutPickup } from './CheckoutPickup';
import type { VendorPreorderState } from '../lib/vendor-preorder';
import { StripeCheckout } from './StripeCheckout';
import { CheckoutTermsAcceptance } from './CheckoutTermsAcceptance';
import { CheckoutContactDetails } from './CheckoutContactDetails';
import { checkoutFieldError } from '../lib/checkout-contact';
import CheckoutLoyalty from './CheckoutLoyalty';
import { buttonClassName } from '@market/ui/presentation';
import { Button, Dropdown, FormError, Input, Select } from '@market/ui';
import { PhoneInput } from '@market/ui';
import { useCheckout } from '../lib/use-checkout';
import type { CheckoutView } from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from './shop-client';

export function CheckoutSummary({
  view,
  totalsOnly = false,
  unresolved = false,
  images = {},
  showPickup = true,
  showContact = true,
}: {
  view: CheckoutView;
  totalsOnly?: boolean;
  unresolved?: boolean;
  images?: Record<string, string>;
  showPickup?: boolean;
  showContact?: boolean;
}) {
  return (
    <div className="checkout-summary">
      {!totalsOnly && showPickup && view.occurrenceId && (
        <p>
          Market pickup: {view.pickupPromise.venue}{' '}
          {view.pickupPromise.startsAt &&
            new Date(view.pickupPromise.startsAt).toLocaleString()}
        </p>
      )}
      {!totalsOnly && showContact && view.contact && (
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
                <li className="checkout-summary-product" key={line.id}>
                  {safeAsset(images[line.id]) && (
                    <img
                      src={safeAsset(images[line.id])}
                      alt=""
                      width="64"
                      height="64"
                    />
                  )}
                  <span>
                    <span className="checkout-summary-name">{line.name}</span>{' '}
                    <span className="checkout-summary-quantity">
                      × {line.quantity}
                    </span>
                  </span>
                  <span>{formatMoney(line.total, view.currency)}</span>
                </li>
              ))}
            </ul>
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
        <dl className="checkout-totals">
          <div>
            <dt>Subtotal including tax</dt>
            <dd>{formatMoney(view.subtotal, view.currency)}</dd>
          </div>
          {view.discounts
            .filter((d) => d.total !== 0)
            .map((item, i) => (
              <div key={`discount-${i}`}>
                <dt>{item.name}</dt>
                <dd>{formatMoney(item.total, view.currency)}</dd>
              </div>
            ))}
          {view.taxes
            .filter((t) => t.total !== 0)
            .map((item, i) => (
              <div key={`tax-${i}`}>
                <dt>{item.name} (included)</dt>
                <dd>{formatMoney(item.total, view.currency)}</dd>
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
export function CheckoutReviewSummary({
  view,
  images,
  unresolved,
}: Pick<
  Parameters<typeof CheckoutSummary>[0],
  'view' | 'images' | 'unresolved'
>) {
  return (
    <aside
      className="checkout-section checkout-order-summary checkout-review-summary"
      aria-label="Order summary"
    >
      <h2>Order summary</h2>
      <CheckoutSummary
        view={view}
        images={images}
        showPickup={false}
        showContact={false}
        unresolved={unresolved}
      />
    </aside>
  );
}

export const checkoutSteps = ['Contact', 'Pickup', 'Review', 'Confirmation'];
export const checkoutStageLabel = (step: string) =>
  step === 'Review' ? 'Review & Pay' : step;

export function Checkout({
  storefrontId,
  initial,
  onViewChange,
  preorder,
  marketLayout = false,
  orderSummary,
  images = {},
  concise = false,
}: {
  storefrontId: string;
  initial: CheckoutView;
  onViewChange?: (view: CheckoutView) => void;
  preorder?: VendorPreorderState;
  marketLayout?: boolean;
  /** Storefront-specific summary for the editable checkout steps. */
  orderSummary?: ReactNode;
  images?: Record<string, string>;
  /** Omit general guidance that only describes the checkout steps. */
  concise?: boolean;
}) {
  const {
    view,
    stage,
    options,
    pending,
    error,
    paymentMethod,
    setPaymentMethod,
    stripeEnabled,
    quoting,
    paymentUncertain,
    setPaymentUncertain,
    contactErrors,
    setContactErrors,
    contactSubmitted,
    headingRef: heading,
    contact,
    run,
    refresh,
    submitContact,
    submitPickup,
    pay,
    back,
    pickupSelections,
    setPickupSelections,
    setPaymentBusy,
    paymentBusy,
    termsAccepted,
    setTermsAccepted,
  } = useCheckout({
    storefrontId,
    initial,
    onViewChange,
    reviewIncludesPayment: true,
  });
  const review = stage === 'Review' && !view.committed;
  const showColumns = marketLayout || !!orderSummary || review;
  const awaitingPickupTotal =
    stripeEnabled &&
    !view.preorderFee &&
    (stage === 'Contact' || stage === 'Pickup');
  const backAction = !view.committed &&
    stage !== 'Contact' &&
    stage !== 'Confirmation' && (
      <Button
        type="button"
        variant="secondary"
        disabled={pending || paymentBusy}
        onClick={() => void back(review ? 'Pickup' : 'Contact')}
      >
        Back
      </Button>
    );
  return (
    <div
      className={
        marketLayout
          ? 'vendor-checkout market-checkout checkout-shell'
          : 'checkout-shell'
      }
      aria-busy={pending}
    >
      {marketLayout && (
        <>
          {preorder && !review && (
            <VendorPreorderBanner
              storefrontId={storefrontId}
              preorder={preorder}
              concise={concise}
              hasItems={!!view.groups.length}
              disabled={
                pending || paymentBusy || !!view.attempt || view.committed
              }
            />
          )}
          <header className="checkout-heading">
            <h1>Checkout</h1>
          </header>
        </>
      )}
      {stage !== 'Confirmation' &&
        !review &&
        !view.committed &&
        view.profile && (
          <CheckoutLoyalty
            earnedOnly={marketLayout}
            vendors={view.groups.map((g) => g.vendorId)}
            onApplied={refresh}
            disabled={pending || !!view.attempt}
          />
        )}
      <nav aria-label="Checkout progress">
        <ol className="checkout-progress">
          {checkoutSteps.map((step, index) => (
            <li key={step} aria-current={stage === step ? 'step' : undefined}>
              {/* Completed steps go back like the Back button; later steps
                  can't be skipped to. */}
              {index < checkoutSteps.indexOf(stage) &&
              !view.committed &&
              stage !== 'Confirmation' ? (
                <button
                  type="button"
                  className="checkout-progress-step"
                  disabled={pending || paymentBusy}
                  aria-label={`Return to ${checkoutStageLabel(step)}`}
                  onClick={() => void back(step)}
                >
                  {checkoutStageLabel(step)}
                </button>
              ) : (
                checkoutStageLabel(step)
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h2
        className={review ? undefined : 'sr-only'}
        ref={heading}
        tabIndex={-1}
      >
        {checkoutStageLabel(stage)}
      </h2>
      {error && (
        <>
          <p className="alert ui-alert ui-alert-error" role="alert">
            {error}
          </p>
          {stripeEnabled && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending || quoting}
              onClick={() =>
                void run(async () => {
                  await refresh();
                })
              }
            >
              Retry checkout
            </Button>
          )}
        </>
      )}
      <div className={showColumns ? 'vendor-checkout-layout' : undefined}>
        <div>
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
              className={marketLayout ? 'checkout-section' : undefined}
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
              onSubmit={submitContact}
            >
              {marketLayout && <h2>Contact information</h2>}
              {!concise && (
                <p>
                  Enter your pickup contact. You can purchase without an
                  account.
                </p>
              )}
              <p className="required-legend">
                <span className="required-mark" aria-hidden="true">
                  *
                </span>{' '}
                Required
              </p>
              <div
                className={marketLayout ? 'checkout-contact-grid' : undefined}
              >
                <div className="field">
                  <label htmlFor="firstName">
                    First name{' '}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </label>
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
                  <label htmlFor="lastName">
                    Last name{' '}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </label>
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
                <div
                  className={
                    marketLayout ? 'field checkout-full-field' : 'field'
                  }
                >
                  <label htmlFor="emailAddress">
                    Email{' '}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <Input
                    aria-invalid={!!contactErrors.emailAddress}
                    aria-describedby={
                      contactErrors.emailAddress
                        ? 'emailAddress-error'
                        : undefined
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
                <div
                  className={
                    marketLayout ? 'field checkout-full-field' : 'field'
                  }
                >
                  <PhoneInput
                    id="phoneNumber"
                    name="phoneNumber"
                    label="Phone number (optional)"
                    validationMode="blur"
                    showValidation={contactSubmitted}
                    defaultValue={contact?.phoneNumber ?? ''}
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Continue to pickup
              </Button>
            </form>
          ) : stage === 'Pickup' ? (
            <form onSubmit={submitPickup}>
              <CheckoutPickup
                view={view}
                preorder={preorder}
                compact={!marketLayout}
              />
              {view.groups.map((group) => {
                const own = options.filter(
                  (o) => o.vendorId === group.vendorId,
                );
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
                            checked={
                              pickupSelections[group.vendorId] ===
                                option.methodId ||
                              (!pickupSelections[group.vendorId] &&
                                own.length === 1)
                            }
                            onChange={() =>
                              setPickupSelections((previous) => ({
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
                      ))
                    ) : (
                      <p className="alert ui-alert ui-alert-error" role="alert">
                        Pickup is currently unavailable for this Vendor. Contact
                        the Storefront before continuing.
                      </p>
                    )}
                  </fieldset>
                );
              })}{' '}
              <div className="checkout-stage-actions">
                {backAction}
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
              </div>
            </form>
          ) : (
            <>
              <CheckoutContactDetails contact={contact} />
              <CheckoutPickup view={view} preorder={preorder} showSelections />
              {stripeEnabled ? (
                view.preorderFee ? (
                  <StripeCheckout
                    accordion={marketLayout}
                    backAction={backAction}
                    onBusyChange={setPaymentBusy}
                    disabled={pending || quoting || !!error}
                    key={view.orderId}
                    storefrontId={storefrontId}
                    view={view}
                    market={marketLayout}
                    onTermsChanged={refresh}
                    concise={concise || marketLayout}
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
                  {paymentUncertain ||
                  ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
                    view.paymentStatus,
                  ) ? (
                    <p className="alert ui-alert ui-alert-warning" role="alert">
                      Payment status is uncertain. Your purchase has not been
                      confirmed. Refresh the checkout status before continuing.
                      Do not submit another payment.
                    </p>
                  ) : view.paymentStatus === 'FAILED' ? (
                    <p className="alert ui-alert ui-alert-error" role="alert">
                      Payment failed. Your purchase has not been confirmed.
                      Check the checkout status before trying again.
                    </p>
                  ) : view.availability.state !== 'AVAILABLE' ? (
                    <p className="alert ui-alert ui-alert-info" role="status">
                      Online payment is not currently configured. Your order has
                      not been placed.
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
                            onChange={(event) =>
                              setPaymentMethod(event.target.value)
                            }
                            disabled={pending}
                            aria-describedby="test-payment-notice"
                          >
                            <option value="">Select a payment method</option>
                            <option value="dev-test-payment">
                              {'Test Payment \u2014 No Charge'}
                            </option>
                          </Select>
                          <p id="test-payment-notice">
                            This is a test purchase. No real payment will be
                            made.
                          </p>
                        </div>
                      )}
                      {view.attempt?.state === 'HELD' && (
                        <p
                          className="alert ui-alert ui-alert-info"
                          role="status"
                        >
                          Checkout is held until{' '}
                          {view.attempt.expiresAt
                            ? new Date(
                                view.attempt.expiresAt,
                              ).toLocaleTimeString()
                            : 'the hold expires'}
                          . Check status before resuming.
                        </p>
                      )}
                      <CheckoutTermsAcceptance
                        disclosure={view.termsDisclosure}
                        market={marketLayout}
                        checked={termsAccepted}
                        disabled={pending}
                        onChange={setTermsAccepted}
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={
                          pending ||
                          !termsAccepted ||
                          view.availability.mode !== 'LOCAL' ||
                          paymentMethod !== 'dev-test-payment'
                        }
                        onClick={() => void pay()}
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
                </>
              )}
            </>
          )}
        </div>
        {review ? (
          <CheckoutReviewSummary
            view={view}
            images={images}
            unresolved={
              stripeEnabled &&
              (pending || quoting || !!error || !view.preorderFee)
            }
          />
        ) : (
          orderSummary
        )}
        {marketLayout && !review && (
          <aside className="checkout-order-summary" aria-label="Order summary">
            <Dropdown
              defaultOpen
              label={
                <>
                  <span>
                    {awaitingPickupTotal
                      ? 'Order summary before fees'
                      : 'Order summary'}
                  </span>
                  <strong className="checkout-summary-total">
                    {quoting ||
                    (stripeEnabled && !view.preorderFee && !awaitingPickupTotal)
                      ? 'Updating…'
                      : formatMoney(view.total, view.currency)}
                  </strong>
                </>
              }
            >
              <CheckoutSummary
                view={view}
                images={images}
                showPickup={false}
                showContact={false}
                unresolved={
                  stripeEnabled &&
                  (pending ||
                    quoting ||
                    !!error ||
                    (!view.preorderFee && !awaitingPickupTotal))
                }
              />
              {!view.committed && (
                <a
                  className={buttonClassName({ variant: 'secondary' })}
                  href="/cart"
                >
                  Edit cart
                </a>
              )}
            </Dropdown>
          </aside>
        )}
      </div>
    </div>
  );
}
