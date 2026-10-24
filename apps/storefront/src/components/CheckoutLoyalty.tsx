import { useEffect, useRef, useState } from 'react';
import type { LoyaltyCheckout, LoyaltyWallet } from '@market/api';
import { Alert, Button, Dialog, Input } from '@market/ui';
import { rewardValue } from './CustomerLoyalty';
import '@market/ui/loyalty.css';
async function call(action: string, input: Record<string, unknown> = {}) {
  const response = await fetch('/api/loyalty', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...input }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Loyalty is unavailable.');
  return data;
}
/** Shared cart/checkout composition. Selecting an option never spends or reserves points. */
export default function CheckoutLoyalty({
  vendors,
  onApplied,
  disabled,
  revision,
  onBusyChange,
}: {
  vendors?: readonly string[];
  onApplied: () => Promise<unknown>;
  disabled: boolean;
  revision?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [data, setData] = useState<LoyaltyCheckout>();
  const [wallet, setWallet] = useState<LoyaltyWallet>();
  const [selected, setSelected] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const preferenceOpened = useRef(false);
  useEffect(() => {
    let current = true;
    call('checkout')
      .then((value: LoyaltyCheckout) => {
        if (!current) return;
        setData(value);
        setWallet((previous) =>
          previous
            ? value.wallets.find((w) => w.id === previous.id)
            : undefined,
        );
        const preferred = value.preferredVersionId;
        if (preferred && !preferenceOpened.current) {
          const match = value.wallets.find(
            (w) =>
              w.inCart &&
              w.rewards.some((r) => r.versionId === preferred) &&
              !value.redemptions.some(
                (d) =>
                  d.wallet_id === w.id &&
                  ['SELECTED', 'RESERVED', 'COMPLETED'].includes(d.status),
              ),
          );
          if (match) {
            preferenceOpened.current = true;
            setWallet(match);
            setSelected(preferred);
          }
        }
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [revision]);
  async function apply() {
    const reward = wallet?.rewards.find((r) => r.versionId === selected);
    const applied = data?.redemptions.find(
      (d) =>
        d.wallet_id === wallet?.id &&
        ['SELECTED', 'RESERVED', 'COMPLETED'].includes(d.status),
    );
    if (
      lock.current ||
      disabled ||
      !data?.orderId ||
      (selected === 0 ? applied?.status !== 'SELECTED' : !reward?.available)
    )
      return;
    lock.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      await call(selected === 0 ? 'remove' : 'apply', {
        ...(selected === 0
          ? { redemptionId: applied!.id }
          : { versionId: reward!.versionId }),
        orderId: data.orderId,
      });
      await onApplied();
      setData(await call('checkout'));
      setWallet(undefined);
      setSelected(undefined);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Reward could not be applied. Refresh your cart.',
      );
      try {
        setData(await call('checkout'));
      } catch {
        /* Preserve the uncertainty message. */
      }
    } finally {
      setBusy(false);
      lock.current = false;
      onBusyChange?.(false);
    }
  }
  if (!data) return null;
  const wallets = data.wallets.filter((w) =>
    vendors ? vendors.includes(String(w.vendor_id)) : w.inCart,
  );
  if (!wallets.length) return null;
  const selectedReward = wallet?.rewards.find((r) => r.versionId === selected);
  const currentReward = data.redemptions.find(
    (d) =>
      d.wallet_id === wallet?.id &&
      ['SELECTED', 'RESERVED', 'COMPLETED'].includes(d.status),
  );
  return (
    <section aria-label="Loyalty rewards">
      <h2>Loyalty rewards</h2>
      <p>
        Choose rewards before checkout. Points are reserved when payment begins.
      </p>
      {error && <Alert severity="error">{error}</Alert>}
      {wallets.map((w) => {
        const applied = data.redemptions.find(
          (d) =>
            d.wallet_id === w.id &&
            ['SELECTED', 'RESERVED', 'COMPLETED'].includes(d.status),
        );
        return (
          <div
            className="loyalty-reward"
            role="group"
            aria-label={`${w.name} checkout rewards`}
            key={w.vendor_id}
          >
            <h3>{w.name}</h3>
            <div className="loyalty-cart-actions">
              <Button
                variant="secondary"
                disabled={
                  disabled ||
                  busy ||
                  (applied
                    ? applied.status !== 'SELECTED'
                    : !w.rewards.some((r) => r.available))
                }
                onClick={() => {
                  setWallet(w);
                  setSelected(
                    applied?.version_id ??
                      w.rewards.find((r) => r.available)?.versionId,
                  );
                }}
              >
                Use Rewards
              </Button>
              {applied ? (
                <p>
                  {applied.terms.name} applied ·{' '}
                  {applied.terms.points.toLocaleString('en-US')} points
                </p>
              ) : (
                <>
                  <p>
                    {w.balance.available.toLocaleString('en-US')} available
                    points
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}
      <Dialog
        open={!!wallet}
        busy={busy}
        title={`${wallet?.name ?? 'Choose'} rewards`}
        onClose={() => setWallet(undefined)}
        actions={
          <Button
            loading={busy}
            disabled={
              disabled ||
              (selected === 0
                ? currentReward?.status !== 'SELECTED'
                : !selectedReward?.available)
            }
            onClick={() => void apply()}
          >
            {selected === 0 ? 'Remove reward' : 'Apply to this order'}
          </Button>
        }
      >
        {wallet && (
          <>
            <p>
              {wallet.balance.available.toLocaleString('en-US')} available
              points. Only this vendor’s eligible products receive the discount.
            </p>
            <fieldset
              disabled={disabled || busy}
              className="loyalty-reward-options"
            >
              <legend>Choose a reward</legend>
              {currentReward?.status === 'SELECTED' && (
                <label htmlFor={`loyalty-no-reward-${wallet.id}`}>
                  <Input
                    id={`loyalty-no-reward-${wallet.id}`}
                    type="radio"
                    name="cart-loyalty-reward"
                    value="0"
                    checked={selected === 0}
                    onChange={() => setSelected(0)}
                  />
                  <span>Save my points, use no reward</span>
                </label>
              )}
              {wallet.rewards.map((reward) => (
                <label
                  key={reward.versionId}
                  htmlFor={`loyalty-option-${reward.versionId}`}
                >
                  <Input
                    id={`loyalty-option-${reward.versionId}`}
                    type="radio"
                    name="cart-loyalty-reward"
                    value={reward.versionId}
                    checked={selected === reward.versionId}
                    disabled={!reward.available}
                    onChange={() => setSelected(reward.versionId)}
                  />
                  <span>
                    <strong>{reward.terms.name}</strong>
                    <span>
                      {' '}
                      · {rewardValue(reward)} ·{' '}
                      {reward.terms.points.toLocaleString('en-US')} points
                    </span>
                    {!reward.available && (
                      <p>
                        Not available for this cart, points balance or reward
                        dates.
                      </p>
                    )}
                    {reward.terms.kind === 'FREE_PRODUCT' && (
                      <p>
                        The required variant and additional paid merchandise
                        from this vendor must be in the cart.
                      </p>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
            <p>
              One reward per vendor order. No points are deducted until payment
              begins.
            </p>
          </>
        )}
      </Dialog>
    </section>
  );
}
