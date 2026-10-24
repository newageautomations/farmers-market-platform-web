import { useState } from 'react';
import type {
  LoyaltyActivity,
  LoyaltyReward,
  LoyaltyWallet,
} from '@market/api';
import { formatDate, formatMoney } from '@market/config';
import {
  Badge,
  Card,
  UtilityIcon,
  Dialog,
  Dropdown,
  EmptyState,
  RecordCard,
  Button,
  buttonClassName,
} from '@market/ui';
import { LoyaltyProgressRing, LoyaltyRedeemButton } from '@market/ui/loyalty';
import '@market/ui/loyalty.css';

export function rewardValue(reward: Pick<LoyaltyReward, 'terms'>) {
  const t = reward.terms;
  return t.kind === 'FIXED'
    ? `${formatMoney(t.value, 'USD')} off`
    : t.kind === 'PERCENTAGE'
      ? `${t.value}% off, up to ${formatMoney(t.maximum, 'USD')}`
      : `${t.quantity} free product${t.quantity === 1 ? '' : 's'}`;
}
const activityLabels = {
  PURCHASE: 'Purchase',
  REDEMPTION: 'Redemption',
  REFUND: 'Refund',
  REWARD_RETURNED: 'Refund',
  ADJUSTMENT: 'Points adjustment',
};
export default function CustomerLoyalty({
  wallets,
}: {
  wallets: LoyaltyWallet[];
}) {
  const [wallet, setWallet] = useState<LoyaltyWallet>();
  const [selected, setSelected] = useState<LoyaltyReward>();
  const [activity, setActivity] = useState<
    LoyaltyActivity & { vendor: string }
  >();
  const history = wallets
    .flatMap((w) =>
      (w.activity ?? []).map((row) => ({ ...row, vendor: w.name })),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <>
      {wallets.length ? (
        <>
          <div className="loyalty-wallet-grid">
            {wallets.map((w) => (
              <RecordCard
                key={w.vendor_id}
                title={w.name}
                label={`${w.name} loyalty`}
                icon={<UtilityIcon name="store" />}
                className="loyalty-wallet"
                header={
                  <h2 className="loyalty-vendor-heading">
                    <UtilityIcon name="store" />
                    <span>{w.name}</span>
                  </h2>
                }
                renderTrigger={(props) =>
                  w.rewards.some((r) => r.available) ? (
                    <LoyaltyRedeemButton
                      {...props}
                      variant="primary"
                      className="ui-record-trigger loyalty-wallet-redeem"
                      eligible
                      aria-label={`Redeem ${w.name} rewards`}
                    >
                      Redeem
                    </LoyaltyRedeemButton>
                  ) : null
                }
                onOpen={() => {
                  setWallet(w);
                  setSelected(undefined);
                }}
                summary={
                  <>
                    <LoyaltyProgressRing
                      available={w.balance.available}
                      milestones={w.rewards.map((r) => r.terms.points)}
                      label={`${w.name} loyalty`}
                    />
                  </>
                }
              />
            ))}
          </div>
          <Dropdown label="Points and reward history">
            {history.length ? (
              <ul
                className="loyalty-activity-list"
                aria-label="Points and reward history"
              >
                {history.map((row) => (
                  <li key={`${row.vendor}:${row.id}`}>
                    <Button
                      variant="disclosure"
                      className="loyalty-activity-row"
                      aria-label={`${activityLabels[row.kind]} · ${row.vendor} · ${row.points >= 0 ? '+' : ''}${row.points.toLocaleString('en-US')} points`}
                      onClick={() => setActivity(row)}
                    >
                      <span>{activityLabels[row.kind]}</span>
                      <Badge tone={row.points >= 0 ? 'success' : 'danger'}>
                        {row.points >= 0 ? '+' : ''}
                        {row.points.toLocaleString('en-US')} points
                      </Badge>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No purchases or redemptions yet.</p>
            )}
          </Dropdown>
        </>
      ) : (
        <EmptyState title="Your loyalty starts with a purchase">
          <p>
            Earn one point per eligible cent from a participating vendor. Points
            become available after fulfillment.
          </p>
        </EmptyState>
      )}
      <Dialog
        open={!!wallet}
        title={
          selected ? selected.terms.name : `${wallet?.name ?? 'Vendor'} rewards`
        }
        onClose={() => {
          setWallet(undefined);
          setSelected(undefined);
        }}
      >
        {wallet &&
          (selected ? (
            <>
              <p>
                {rewardValue(selected)} from {wallet.name} for{' '}
                {selected.terms.points.toLocaleString('en-US')} points.
              </p>
              <p>
                Minimum eligible products:{' '}
                {formatMoney(selected.terms.minimum, 'USD')}. One loyalty reward
                per vendor order. Cannot combine with that vendor’s coupon.
              </p>
              {selected.terms.kind === 'FREE_PRODUCT' && (
                <p>
                  Add the selected product variant and additional paid
                  merchandise from this vendor to your cart. Inventory and
                  pickup availability are checked before payment.
                </p>
              )}
              <p>
                No points are deducted here. Your reward will be preselected in
                the cart. Confirm it before continuing to checkout.
              </p>
              <div className="actions">
                <Button
                  variant="secondary"
                  onClick={() => setSelected(undefined)}
                >
                  Back to rewards
                </Button>
                {wallet.storefrontUrl && (
                  <a
                    href={`${wallet.storefrontUrl}/cart?loyalty=${selected.versionId}&loyaltyVendor=${wallet.vendor_id}`}
                    className={buttonClassName({ variant: 'primary' })}
                  >
                    Continue to vendor cart
                  </a>
                )}
              </div>
              {!wallet.storefrontUrl && (
                <p>
                  Open a participating storefront to choose this reward in your
                  cart.
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                {wallet.balance.available.toLocaleString('en-US')} available
                points. Pending points cannot be redeemed.
              </p>
              {wallet.balance.pending > 0 && (
                <p>
                  {wallet.balance.pending.toLocaleString('en-US')} points
                  pending fulfillment.
                </p>
              )}
              {wallet.balance.reserved > 0 && (
                <p>
                  {wallet.balance.reserved.toLocaleString('en-US')} points
                  reserved at checkout.
                </p>
              )}
              {wallet.balance.available < 0 && (
                <p>
                  Refunded earnings have left a points debt. Future earnings
                  restore your spendable balance.
                </p>
              )}
              <div className="loyalty-rewards">
                {wallet.rewards.map((reward) => (
                  <Card
                    key={reward.versionId}
                    surface="embedded"
                    className="loyalty-reward"
                  >
                    <h3>{reward.terms.name}</h3>
                    <p>
                      {rewardValue(reward)} ·{' '}
                      {reward.terms.points.toLocaleString('en-US')} points
                    </p>
                    <LoyaltyRedeemButton
                      eligible={!!reward.available}
                      onClick={() => setSelected(reward)}
                    >
                      Redeem
                    </LoyaltyRedeemButton>
                    {!reward.available && (
                      <p>
                        {wallet.enabled
                          ? 'Not currently available. Check your points, dates and reward limits.'
                          : 'New redemptions are paused.'}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
              {!wallet.rewards.length && (
                <p>No rewards are currently configured.</p>
              )}
            </>
          ))}
      </Dialog>
      <Dialog
        open={!!activity}
        title={
          activity
            ? `${activityLabels[activity.kind]} · ${activity.vendor}`
            : 'Activity details'
        }
        onClose={() => setActivity(undefined)}
      >
        {activity && (
          <>
            <p>
              {activity.points >= 0 ? '+' : ''}
              {activity.points.toLocaleString('en-US')} points ·{' '}
              {activity.status.toLowerCase()}
            </p>
            <p>{formatDate(activity.createdAt, 'UTC')}</p>
            {activity.pending > 0 && (
              <p>
                {activity.pending.toLocaleString('en-US')} points are pending
                fulfillment.
              </p>
            )}
            {activity.items && (
              <ul>
                {activity.items.map((item, index) => (
                  <li key={index}>
                    {item.quantity} × {item.name} ·{' '}
                    {formatMoney(Number(item.eligible), 'USD')} eligible
                    spending
                  </li>
                ))}
              </ul>
            )}
            {activity.terms && (
              <p>
                {activity.terms.name}: {rewardValue({ terms: activity.terms })}.
                Actual discount:{' '}
                {formatMoney(Number(activity.discount ?? 0), 'USD')}.
              </p>
            )}
            {activity.orderId && (
              <a
                className={buttonClassName({ variant: 'secondary' })}
                href={`/account/orders/${activity.orderId}`}
              >
                View order {activity.orderCode ?? activity.orderId}
              </a>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
