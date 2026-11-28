import type { StripePaymentStatus } from '@market/api';
import { Alert, Badge } from '@market/ui';
import { codeLabel } from '../settings/providers';
import { date } from '../vendor/common';

const remediation: Record<string, string> = {
  ACCOUNT_DISCONNECTED: 'Connect Stripe to continue account setup.',
  PLATFORM_IDENTITY_MISMATCH:
    'Reconnect with the configured platform. Ask support to review historical connections.',
  OWNERSHIP_UNKNOWN: 'Organization ownership needs review.',
  LIVE_ACCOUNT_ACTIVATION_DISABLED:
    'Live account activation is unavailable in this phase.',
  CONFIGURATION_INCOMPATIBLE:
    'This account must use the full Stripe Dashboard with Stripe collecting processing fees and payment losses. Ask support to review it.',
  ACCOUNT_STALE: 'Refresh status to retrieve current verification information.',
  ACCOUNT_RESTRICTED: 'Open Stripe to resolve the account restriction.',
  INFORMATION_REQUIRED:
    'Continue setup in Stripe to supply the required information.',
  VERIFICATION_PENDING:
    'Stripe is reviewing your information. Refresh status later.',
  PAYMENT_CAPABILITY_NOT_READY: 'Stripe has not enabled card payments yet.',
  PAYOUT_NOT_READY: 'Stripe has not enabled payouts yet.',
};

export function stripeDestination(url: string) {
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    target.port ||
    target.username ||
    target.password ||
    ![
      'connect.stripe.com',
      'accounts.stripe.com',
      'dashboard.stripe.com',
    ].includes(target.hostname)
  )
    throw new Error('Unexpected Stripe destination');
  return target.href;
}

export function stripeReadiness(
  account: StripePaymentStatus | null | undefined,
  purpose: string,
) {
  return account?.readiness.find((entry) => entry.purpose === purpose);
}

export function StripeConnectionBadge({
  account,
}: {
  account?: StripePaymentStatus | null;
}) {
  return (
    <Badge
      tone={account?.connectionStatus === 'CONNECTED' ? 'success' : 'neutral'}
    >
      {account ? codeLabel(account.connectionStatus) : 'Not connected'}
    </Badge>
  );
}

export function StripeStatusDetails({
  account,
  mode,
}: {
  account?: StripePaymentStatus | null;
  mode: 'TEST' | 'LIVE';
}) {
  const charge = stripeReadiness(account, 'ACCEPT_DIRECT_CHARGE');
  const payout = stripeReadiness(account, 'RECEIVE_PAYOUT');
  const transfer = stripeReadiness(account, 'RECEIVE_TRANSFER');
  const reasons = [
    ...new Set([
      ...(charge?.reasons ?? []),
      ...(payout?.reasons ?? []),
      ...(transfer?.reasons ?? []),
    ]),
  ];
  return (
    <>
      <dl className="provider-facts">
        <div>
          <dt>Payment environment</dt>
          <dd>{mode === 'LIVE' ? 'Live' : 'Sandbox (test mode)'}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd>
            <StripeConnectionBadge account={account} />
          </dd>
        </div>
        {account && (
          <>
            <div>
              <dt>Account</dt>
              <dd>{account.accountReference}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{codeLabel(charge?.state ?? 'UNKNOWN')}</dd>
            </div>
            <div>
              <dt>Details submitted</dt>
              <dd>{account.detailsSubmitted ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Card payments</dt>
              <dd>
                {account.chargesEnabled
                  ? 'Enabled by Stripe'
                  : 'Not enabled by Stripe'}
              </dd>
            </div>
            <div>
              <dt>Direct charge readiness</dt>
              <dd>
                {charge?.ready ? 'Provider requirements met' : 'Not ready'}
              </dd>
            </div>
            <div>
              <dt>Payouts</dt>
              <dd>
                {account.payoutsEnabled
                  ? 'Enabled by Stripe'
                  : 'Not enabled by Stripe'}
              </dd>
            </div>
            <div>
              <dt>Payout readiness</dt>
              <dd>{payout?.ready ? 'Ready' : 'Not ready'}</dd>
            </div>
            <div>
              <dt>Transfer readiness</dt>
              <dd>{transfer?.ready ? 'Ready' : 'Not ready'}</dd>
            </div>
            <div>
              <dt>Requirements</dt>
              <dd>
                {account.currentlyDueCount} currently due,{' '}
                {account.pastDueCount} past due
              </dd>
            </div>
            <div>
              <dt>Pending verification</dt>
              <dd>{account.pendingVerificationCount ?? 0}</dd>
            </div>
            {account.currentDeadline && (
              <div>
                <dt>Requirements deadline</dt>
                <dd>{date(account.currentDeadline)}</dd>
              </div>
            )}
            <div>
              <dt>Card payments capability</dt>
              <dd>{codeLabel(account.cardPayments ?? 'UNKNOWN')}</dd>
            </div>
            <div>
              <dt>Transfers capability</dt>
              <dd>{codeLabel(account.transfers ?? 'UNKNOWN')}</dd>
            </div>
            <div>
              <dt>Legacy payments capability</dt>
              <dd>{codeLabel(account.legacyPayments ?? 'UNKNOWN')}</dd>
            </div>
          </>
        )}
      </dl>
      {account && (
        <>
          <p>Last checked: {date(account.lastSyncAt)}</p>
          {account.disabledReason && (
            <Alert>
              Stripe restriction: {codeLabel(account.disabledReason)}
            </Alert>
          )}
          {reasons.length > 0 && (
            <ul>
              {reasons.map((reason) => (
                <li key={reason}>{remediation[reason] ?? codeLabel(reason)}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
