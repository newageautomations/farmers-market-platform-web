import type { MarketChallenge, MarketChallengeTerms } from '@market/api';
import { Badge, Button, Card, RecordCard, UtilityIcon } from './index';
import { LoyaltyProgressRing } from './loyalty';
export const challengeKindLabels = {
  DISCOVERY: 'Vendor Discovery',
  VISITS: 'Market Visits',
  SPENDING: 'Market Spending',
} as const;
export function challengeAmount(
  value: number,
  kind: MarketChallengeTerms['kind'],
) {
  return kind === 'SPENDING'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value / 100)
    : value.toLocaleString('en-US');
}
export function challengeRequirement(t: MarketChallengeTerms) {
  const money = (v: number) => challengeAmount(v, 'SPENDING');
  return t.kind === 'SPENDING'
    ? `Spend ${money(t.target)} across ${t.occurrenceCount} market occurrences`
    : t.kind === 'DISCOVERY'
      ? `Shop from ${t.target} different vendors${t.minimum ? `, spending at least ${money(t.minimum)} per vendor in one order` : ''}`
      : `Purchase at ${t.target} different market occurrences${t.minimum ? `, spending at least ${money(t.minimum)} in one order` : ''}`;
}
/** Feature composition, shared by manager previews and customer details. */
export function MarketChallengeTermsView({
  terms,
  window = [],
}: {
  terms: MarketChallengeTerms;
  window?: MarketChallenge['window'];
}) {
  return (
    <>
      <p>{challengeRequirement(terms)}</p>
      {terms.description && <p>{terms.description}</p>}
      <p className="market-challenge-multiline">{terms.reward}</p>
      {terms.instructions && (
        <p className="market-challenge-multiline">{terms.instructions}</p>
      )}
      {terms.occurrenceCount ? (
        <>
          <p>
            {terms.occurrenceCount} scheduled occurrences, starting with
            occurrence {terms.startOccurrenceId}. Cancelled opportunities are
            skipped and replacements follow the frozen sequence.
          </p>
          {window.length > 0 && (
            <ul>
              {window.map((w) => (
                <li key={w.occurrence_id}>
                  {w.label} · Occurrence {w.occurrence_id}
                  {w.skipped ? ' · Cancelled, skipped' : ''}
                </li>
              ))}
            </ul>
          )}
          {window.filter((w) => !w.skipped).length < terms.occurrenceCount && (
            <p>
              Remaining opportunities will be added as the market schedule is
              published.
            </p>
          )}
        </>
      ) : (
        <p>
          Eligible purchases accumulate while this challenge and the market
          program are active.
        </p>
      )}
      <p>
        Product spending after discounts, excluding taxes and fees. Fulfilled
        purchases count toward rewards. Refunds can reverse qualification. Each
        campaign offers one reward per customer.
      </p>
    </>
  );
}
export function MarketChallengeCard({
  challenge,
  children,
  onOpen,
}: {
  challenge: MarketChallenge;
  children?: React.ReactNode;
  onOpen?: () => void;
}) {
  const t = challenge.terms,
    p = challenge.progress ?? {
      confirmed: 0,
      pending: 0,
      target: t.target,
      complete: false,
    };
  const unit =
    t.kind === 'DISCOVERY'
      ? 'vendors'
      : t.kind === 'VISITS'
        ? 'visits'
        : 'spent';
  const detail = `${challengeAmount(p.confirmed, t.kind)} / ${challengeAmount(t.target, t.kind)} ${unit}`;
  const content = (
    <div className="market-loyalty-record-body">
      <h2 className="loyalty-vendor-heading">
        <UtilityIcon name="store" />
        <span>{challenge.market_name ?? 'Market challenge'}</span>
      </h2>
      <div className="market-challenge-heading">
        <h3>{t.title}</h3>
        <Badge
          tone={
            challenge.claim?.review === 'REQUIRED'
              ? 'warning'
              : p.complete
                ? 'success'
                : 'neutral'
          }
        >
          {challenge.claim?.review === 'REQUIRED'
            ? 'Needs review'
            : challenge.claim?.status === 'FULFILLED'
              ? 'Fulfilled'
              : challenge.claim
                ? 'Claimed'
                : p.complete
                  ? 'Available to claim'
                  : challenge.programEnabled === false
                    ? 'Program paused'
                    : challenge.availability.toLowerCase()}
        </Badge>
      </div>
      {t.description && <p>{t.description}</p>}
      <LoyaltyProgressRing
        available={p.confirmed}
        milestones={[t.target]}
        label={t.title}
        display={{
          value: challengeAmount(p.confirmed, t.kind),
          caption: unit,
          detail,
        }}
      />
      {p.pending > 0 && (
        <p>
          {challengeAmount(p.pending, t.kind)} {unit} pending fulfillment.
          Pending progress cannot unlock a reward.
        </p>
      )}
      <p className="market-challenge-multiline">{t.reward}</p>
      {children}
    </div>
  );
  return onOpen ? (
    <RecordCard
      title={t.title}
      label={`${t.title} at ${challenge.market_name ?? 'your market'}`}
      className="market-loyalty-record"
      summary={content}
      onOpen={onOpen}
      renderTrigger={(props) => (
        <Button {...props} className={`${props.className} sr-only`}>
          Open {t.title}
        </Button>
      )}
    />
  ) : (
    <Card as="article">{content}</Card>
  );
}
