import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Spinner } from '@market/ui';
import { formatMoney } from '@market/config';
import {
  AppError,
  type CheckoutView,
  type StripeCheckoutStatus,
} from '@market/api';
import { shopCall } from './shop-client';
import {
  loadStripeSdk,
  prepareStripeForm,
  type StripeCard,
  type StripeClient,
  type StripeFactory,
} from '../lib/stripe-checkout';

const messages: Record<string, string> = {
  SETUP_REQUIRED: 'Enter your card details securely with Stripe.',
  AUTHENTICATION_REQUIRED:
    'Your bank needs you to authenticate a vendor charge.',
  AUTHORIZING: 'Authorizing vendor payments.',
  CAPTURING: 'Completing your purchase.',
  VERIFYING:
    'We are verifying the payment outcome. Please do not submit another payment.',
  COMPLETED: 'Purchase confirmed.',
  DECLINED: 'Your card was declined. This purchase was not placed.',
  AUTHORIZATION_FAILED: 'A vendor payment could not be authorized.',
  CAPTURE_FAILED:
    'Payment could not be completed. We are checking any charges.',
  CANCELED: 'Checkout canceled. This purchase was not placed.',
  COMPENSATION_PENDING:
    'This purchase was not placed. We are verifying cancellations and refunds. Funds have not yet been confirmed returned.',
  COMPENSATION_COMPLETED:
    'This purchase was not placed. Stripe has confirmed the required refunds. Your bank determines when they appear.',
  MANUAL_INTERVENTION_REQUIRED:
    'Your payment needs review. This purchase is not confirmed. Contact the storefront and do not submit another payment.',
};
const terminal = [
  'DECLINED',
  'AUTHORIZATION_FAILED',
  'CAPTURE_FAILED',
  'CANCELED',
  'COMPENSATION_COMPLETED',
  'MANUAL_INTERVENTION_REQUIRED',
];
/** Checkout-specific composition: existing primitives cannot host Stripe's account-scoped card/authentication lifecycle. */
export function StripeCheckout({
  storefrontId,
  view,
  loadSdk = loadStripeSdk,
  disabled = false,
  onBusyChange,
  backAction,
  concise = false,
}: {
  storefrontId: string;
  view: CheckoutView;
  loadSdk?: () => Promise<StripeFactory>;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  backAction?: ReactNode;
  /** Omit general reassurance copy. Charges, authorization and status stay. */
  concise?: boolean;
}) {
  const [status, setStatus] = useState<StripeCheckoutStatus | null>(null);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [complete, setComplete] = useState(false),
    [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const cardHost = useRef<HTMLDivElement>(null),
    card = useRef<StripeCard | null>(null),
    client = useRef<StripeClient | null>(null);
  const lock = useRef(false),
    mounted = useRef(true),
    factory = useRef<StripeFactory | null>(null);
  useEffect(() => {
    onBusyChange?.(pending || processing);
    return () => onBusyChange?.(false);
  }, [pending, processing, onBusyChange]);
  async function accept(next: StripeCheckoutStatus | null) {
    if (!mounted.current) return;
    if (next && next.orderId !== view.orderId)
      throw new Error('Checkout changed');
    setStatus(
      next?.state === 'COMPLETED' ? { ...next, state: 'VERIFYING' } : next,
    );
    setUncertain(false);
    if (
      next &&
      ['AUTHORIZING', 'CAPTURING', 'VERIFYING', 'COMPLETED'].includes(
        next.state,
      )
    )
      setProcessing(true);
    if (next && terminal.includes(next.state)) setProcessing(false);
    if (next?.state === 'COMPLETED') {
      const confirmed = await shopCall<CheckoutView>(
        storefrontId,
        'checkout-status',
        { orderId: view.orderId },
      );
      if (confirmed.committed && confirmed.orderId === view.orderId) {
        setStatus(next);
        window.location.assign(
          `/checkout/success?order=${encodeURIComponent(view.orderId)}`,
        );
      } else
        setError(
          'Your payment was received, but order confirmation is still being verified. Do not pay again.',
        );
    }
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      await work();
    } catch (cause) {
      if (mounted.current) {
        setProcessing(false);
        // This sentinel is returned by route qualification before a new group or
        // provider setup is created. Unknown failures still require reconciliation.
        if (
          !status &&
          cause instanceof AppError &&
          cause.code === 'ACCOUNT_NOT_READY'
        ) {
          setUncertain(false);
          setError(cause.message);
        } else {
          setUncertain(true);
          setError(
            'We could not verify the payment outcome. Your order is not yet confirmed. Do not pay again while we check its status.',
          );
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current) {
        setPending(false);
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => {
      if (!mounted.current) return;
      return run(async () =>
        accept(
          await prepareStripeForm(storefrontId, view.orderId, () =>
            shopCall<StripeCheckoutStatus>(
              storefrontId,
              'stripe-checkout-prepare',
              {},
            ),
          ),
        ),
      );
    });
    return () => {
      mounted.current = false;
      card.current?.destroy();
      card.current = null;
    };
  }, [storefrontId, view.orderId]);
  useEffect(() => {
    if (
      status?.state !== 'SETUP_REQUIRED' ||
      !status.setupSecret ||
      !cardHost.current
    )
      return;
    let active = true;
    void loadSdk()
      .then((sdk) => {
        if (!active || !cardHost.current) return;
        factory.current = sdk;
        client.current = sdk(status.publishableKey);
        const element = client.current
          .elements()
          .create('card', { hidePostalCode: false, disableLink: true });
        card.current = element;
        element.on('change', (value) => {
          setComplete(value.complete);
          setError(value.error ? 'Check your card information.' : '');
        });
        element.mount(cardHost.current);
      })
      .catch(() => {
        if (active)
          setError(
            'The secure card form could not load. Refresh the status to try loading it again.',
          );
      });
    return () => {
      active = false;
      card.current?.destroy();
      card.current = null;
      setComplete(false);
    };
  }, [status?.setupSecret, loadSdk]);
  useEffect(() => {
    if (
      !status ||
      terminal.includes(status.state) ||
      ['COMPLETED', 'SETUP_REQUIRED', 'AUTHENTICATION_REQUIRED'].includes(
        status.state,
      )
    )
      return;
    const timer = window.setInterval(() => {
      void run(async () =>
        accept(
          await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-advance',
            { groupId: status.groupId },
          ),
        ),
      );
    }, 4000);
    return () => window.clearInterval(timer);
  }, [status?.groupId, status?.state]);
  async function pay() {
    setPaymentSubmitted(true);
    await run(async () => {
      if (!status) return;
      if (status.state === 'SETUP_REQUIRED') {
        if (
          !card.current ||
          !client.current ||
          !complete ||
          !status.setupSecret
        )
          return;
        const result = await client.current.confirmCardSetup(
          status.setupSecret,
          { payment_method: { card: card.current } },
        );
        if (result.error) {
          setError(
            'Your card could not be set up. Check your details or complete the bank authentication.',
          );
          return;
        }
      }
      setProcessing(true);
      let next =
        status.state === 'SETUP_REQUIRED'
          ? await shopCall<StripeCheckoutStatus>(
              storefrontId,
              'stripe-checkout-start',
              { consent: 'checkout-vendors-once-v1' },
            )
          : await shopCall<StripeCheckoutStatus>(
              storefrontId,
              'stripe-checkout-advance',
              { groupId: status.groupId },
            );
      if (
        next.state === 'AUTHENTICATION_REQUIRED' &&
        next.actionSecret &&
        next.actionAccount
      ) {
        setProcessing(false);
        const sdk = factory.current ?? (await loadSdk());
        factory.current = sdk;
        const result = await sdk(next.publishableKey, {
          stripeAccount: next.actionAccount,
        }).handleNextAction({ clientSecret: next.actionSecret });
        if (result.error) {
          next = await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-cancel',
            { groupId: next.groupId },
          );
        } else
          next = await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-advance',
            { groupId: next.groupId },
          );
      }
      setProcessing(true);
      await accept(next);
      if (next.state === 'SETUP_REQUIRED')
        setError(
          'Card setup has not completed. Your order is not confirmed. Check your card details before continuing.',
        );
      if (terminal.includes(next.state) || next.state === 'SETUP_REQUIRED')
        setProcessing(false);
    });
  }
  const paymentProblem =
    error ||
    (status && [...terminal, 'COMPENSATION_PENDING'].includes(status.state)
      ? messages[status.state]
      : '');
  return (
    <section
      className="checkout-section"
      aria-label="Secure card payment"
      aria-busy={pending || loading}
    >
      <Dialog
        open={paymentSubmitted && (processing || !!paymentProblem)}
        title={
          error
            ? 'Payment needs verification'
            : paymentProblem
              ? 'Order not placed'
              : 'Processing your order'
        }
        size="standard"
        busy={processing && !paymentProblem}
        onClose={() => setPaymentSubmitted(false)}
      >
        {paymentProblem ? (
          <p role="alert">{paymentProblem}</p>
        ) : (
          <>
            <Spinner label="Processing your order" />
            <p>
              We are confirming your payment and order. Please keep this page
              open.
            </p>
          </>
        )}
      </Dialog>
      {!concise && <p>Payment details are securely handled by Stripe.</p>}
      {view.groups.length > 1 && (
        <p>
          You are buying from independent vendors. Your total will appear as
          separate vendor charges.
        </p>
      )}
      <ul aria-label="Vendor card charges">
        {(
          status?.charges ??
          view.preorderFee?.vendors.map((v) => ({
            vendorId: v.vendorId,
            amount: v.total,
            currency: view.currency,
          })) ??
          []
        ).map((c) => (
          <li key={c.vendorId}>
            {view.groups.find((g) => g.vendorId === c.vendorId)?.vendorName ??
              'Vendor'}
            : {formatMoney(c.amount, c.currency)}
          </li>
        ))}
      </ul>
      {status?.state === 'SETUP_REQUIRED' && (
        <div className="checkout-card-entry">
          <p id="checkout-card-label">Card details</p>
          <p
            id="checkout-card-help"
            className={concise ? 'sr-only' : undefined}
          >
            Enter your card number, expiration date, security code and ZIP code.
          </p>
          <div
            className="checkout-card-host"
            role="group"
            ref={cardHost}
            aria-labelledby="checkout-card-label"
            aria-describedby="checkout-card-help"
          />
        </div>
      )}
      {status?.state === 'SETUP_REQUIRED' && (
        <p>
          By selecting Complete purchase, you authorize the vendor charges shown
          above for this checkout.
        </p>
      )}
      <p role="status" aria-live="polite">
        {loading
          ? 'Loading secure payment status.'
          : status
            ? concise && status.state === 'SETUP_REQUIRED'
              ? ''
              : (messages[status.state] ?? messages.VERIFYING)
            : concise
              ? ''
              : 'Your card will be used only for this checkout.'}
      </p>
      {error && (
        <p className="ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      {(!status ||
        ['SETUP_REQUIRED', 'AUTHENTICATION_REQUIRED'].includes(
          status.state,
        )) && (
        <div className="checkout-stage-actions">
          {backAction}{' '}
          <Button
            type="button"
            variant="primary"
            disabled={
              disabled ||
              uncertain ||
              loading ||
              pending ||
              !status ||
              (status.state === 'SETUP_REQUIRED' && !complete)
            }
            onClick={() => void pay()}
          >
            {pending
              ? 'Checking payment…'
              : !status
                ? 'Preparing secure card entry'
                : status.state === 'AUTHENTICATION_REQUIRED'
                  ? 'Authenticate vendor payment'
                  : 'Complete purchase'}
          </Button>
        </div>
      )}
      {(error || uncertain) && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            void run(async () =>
              accept(
                await shopCall<StripeCheckoutStatus>(
                  storefrontId,
                  'stripe-checkout-prepare',
                  {},
                ),
              ),
            )
          }
        >
          Retry secure payment
        </Button>
      )}
      {status && terminal.includes(status.state) && (
        <>
          {status.state !== 'MANUAL_INTERVENTION_REQUIRED' && (
            <p>
              Your items are saved. You can return to your cart or continue with
              a new checkout.
            </p>
          )}
          {status.state !== 'MANUAL_INTERVENTION_REQUIRED' && (
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await shopCall(storefrontId, 'checkout-restart', {
                    orderId: view.orderId,
                  });
                  window.location.assign('/checkout?step=Review');
                })
              }
            >
              Continue checkout
            </Button>
          )}
          <a href="/cart">Return to cart</a>
        </>
      )}
    </section>
  );
}
