import { useRef, useState } from 'react';
import type { LoyaltyWallet, MarketChallenge } from '@market/api';
import { Alert, Button, Dialog, EmptyState, Tabs } from '@market/ui';
import { FarmstandIcon } from '@market/ui/farmstand';
import { MarketsSummary, SettingsPanel } from '@market/ui/workspace';
import {
  LoyaltyRedeemButton,
  MarketChallengeCard,
  MarketChallengeTermsView,
} from '@market/ui/loyalty';
import CustomerLoyalty from './CustomerLoyalty';

export function CustomerMarketChallenges({
  initialChallenges,
  unavailable = false,
}: {
  initialChallenges: MarketChallenge[];
  unavailable?: boolean;
}) {
  const [challenges, setChallenges] = useState(initialChallenges),
    [selected, setSelected] = useState<number>(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false),
    challenge = challenges.find((c) => c.id === selected);
  async function claim() {
    if (!challenge || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/market-loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', id: challenge.id }),
      });
      if (!response.ok)
        throw new Error(
          'Your reward could not be claimed. Refresh to check its current eligibility.',
        );
      const saved = (await response.json()) as NonNullable<
        MarketChallenge['claim']
      >;
      setChallenges((items) =>
        items.map((c) => (c.id === challenge.id ? { ...c, claim: saved } : c)),
      );
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      {unavailable ? (
        <Alert severity="info">
          Market challenges are currently unavailable. Your vendor rewards
          remain available.
        </Alert>
      ) : challenges.length ? (
        <div className="loyalty-wallet-grid">
          {challenges.map((c) => (
            <MarketChallengeCard
              key={c.id}
              challenge={c}
              onOpen={() => {
                setSelected(c.id);
                setConfirm(false);
                setError('');
              }}
            >
              {c.progress?.complete && !c.claim && (
                <div className="actions">
                  <LoyaltyRedeemButton
                    eligible
                    onClick={() => {
                      setSelected(c.id);
                      setConfirm(true);
                      setError('');
                    }}
                  >
                    Claim Reward
                  </LoyaltyRedeemButton>
                </div>
              )}
            </MarketChallengeCard>
          ))}
        </div>
      ) : (
        <EmptyState title="No market challenges yet">
          <p>
            Follow a market with an active loyalty program or make a qualifying
            market purchase to discover its challenges.
          </p>
          <a href="/account/markets">Explore your markets</a>
        </EmptyState>
      )}
      <Dialog
        open={!!challenge}
        title={
          confirm
            ? 'Claim Reward'
            : (challenge?.terms.title ?? 'Market challenge')
        }
        busy={busy}
        onClose={() => setSelected(undefined)}
        actions={
          confirm && challenge?.progress?.complete && !challenge.claim ? (
            <Button loading={busy} onClick={() => void claim()}>
              Confirm claim
            </Button>
          ) : undefined
        }
      >
        {challenge && (
          <>
            <p>{challenge.market_name}</p>
            <MarketChallengeTermsView
              terms={challenge.completion?.terms ?? challenge.terms}
              window={challenge.window}
            />
            {challenge.claim && (
              <p role="status">
                {challenge.claim.status === 'FULFILLED'
                  ? 'Reward fulfilled'
                  : 'Reward claimed. Your market manager will arrange fulfillment.'}
                {challenge.claim.review === 'REQUIRED'
                  ? ' Qualification changed after a refund or cancellation. The manager will review this reward.'
                  : ''}
              </p>
            )}
            {challenge.claim?.fulfilled_at && (
              <p>
                {new Date(challenge.claim.fulfilled_at).toLocaleString()}.{' '}
                {challenge.claim.note}
              </p>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {!confirm && challenge.progress?.complete && !challenge.claim && (
              <LoyaltyRedeemButton eligible onClick={() => setConfirm(true)}>
                Claim Reward
              </LoyaltyRedeemButton>
            )}
            {challenge.history && (
              <ul aria-label="Challenge history">
                {challenge.history.map((event, i) => (
                  <li key={i}>
                    {event.event.toLowerCase().replaceAll('_', ' ')} ·{' '}
                    {new Date(event.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
const count = (n: number, word: string) =>
  `${n} ${n === 1 ? word : word + 's'}`;

/**
 * Customer Loyalty workspace: summary cards, the workspace-menu tabs (as on
 * vendor Packing) and Settings-style panels around the existing wallet and
 * challenge controllers, whose behavior is unchanged.
 */
export default function CustomerLoyaltyDashboard({
  wallets,
  challenges,
  unavailable,
}: {
  wallets: LoyaltyWallet[];
  challenges: MarketChallenge[];
  unavailable?: boolean;
}) {
  const ready = wallets.reduce(
    (total, w) => total + w.rewards.filter((r) => r.available).length,
    0,
  );
  const pending = wallets.reduce((total, w) => total + w.balance.pending, 0);
  const claimable = challenges.filter(
    (c) => c.progress?.complete && !c.claim,
  ).length;
  return (
    <div className="customer-loyalty">
      <MarketsSummary
        items={[
          {
            label: 'Rewards ready',
            value: ready,
            hint: ready
              ? `${count(ready, 'reward')} you can redeem now`
              : 'Keep earning to unlock a reward',
            icon: 'gift',
            tone: ready ? 'success' : undefined,
          },
          {
            label: 'Pending points',
            value: pending.toLocaleString('en-US'),
            hint: 'Available after your orders are fulfilled',
            icon: 'clock',
            tone: pending ? 'warning' : undefined,
          },
          {
            label: 'Market challenges',
            value: unavailable ? '—' : challenges.length,
            hint: unavailable
              ? 'Challenges are currently unavailable'
              : claimable
                ? `${count(claimable, 'reward')} ready to claim`
                : 'Goals set by your markets',
            icon: 'circle-check',
            tone: claimable ? 'success' : undefined,
          },
        ]}
      />
      <Tabs
        className="workspace-menu customer-loyalty-tabs"
        items={[
          {
            label: 'Vendor Rewards',
            icon: <FarmstandIcon name="gift" />,
            content: (
              <SettingsPanel
                icon="gift"
                title="Vendor rewards"
                module="customer-workspace"
                description="One point for every eligible product cent. Every vendor has its own wallet. Pending points become available after fulfillment."
              >
                <CustomerLoyalty wallets={wallets} />
              </SettingsPanel>
            ),
          },
          {
            label: 'Market Challenges',
            icon: <FarmstandIcon name="store" />,
            content: (
              <SettingsPanel
                icon="circle-check"
                title="Market challenges"
                module="customer-workspace"
                description="Meet your market’s purchase goals and claim the rewards its manager promises."
              >
                <CustomerMarketChallenges
                  initialChallenges={challenges}
                  unavailable={unavailable}
                />
              </SettingsPanel>
            ),
          },
        ]}
      />
    </div>
  );
}
