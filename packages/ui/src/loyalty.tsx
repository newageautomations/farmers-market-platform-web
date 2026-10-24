import { useId, type ComponentProps, type CSSProperties } from 'react';
import { Button } from './index';
export {
  MarketChallengeCard,
  MarketChallengeTermsView,
  challengeAmount,
  challengeRequirement,
  challengeKindLabels,
} from './market-challenges';

export function loyaltyProgress(
  available: number,
  milestones: readonly number[],
) {
  const points = Math.max(0, Number.isSafeInteger(available) ? available : 0);
  const values = [
    ...new Set(milestones.filter((n) => Number.isSafeInteger(n) && n > 0)),
  ].sort((a, b) => a - b);
  const target = values.find((n) => n > points) ?? values.at(-1) ?? 0;
  const previous = values.filter((n) => n <= points && n < target).at(-1) ?? 0;
  const complete = target > 0 && points >= target;
  return {
    points,
    target,
    previous,
    complete,
    completed: complete ? 1 : target ? previous / target : 0,
    current: target && !complete ? (points - previous) / target : 0,
  };
}
/** Available progress uses the next higher milestone. A tinted track marks a passed milestone. */
export function LoyaltyProgressRing({
  available,
  milestones,
  label = 'Loyalty points',
  display,
}: {
  available: number;
  milestones: readonly number[];
  label?: string;
  /** Fixed objective presentation. Omit to retain vendor cumulative milestone behavior. */
  display?: { value: string; caption: string; detail: string };
}) {
  const id = useId(),
    p = loyaltyProgress(available, milestones);
  const text = !p.target
    ? `${p.points.toLocaleString('en-US')} points. No rewards configured.`
    : p.complete
      ? `${p.points.toLocaleString('en-US')} points. All reward milestones unlocked.`
      : `${p.points.toLocaleString('en-US')} of ${p.target.toLocaleString('en-US')} points. ${p.previous.toLocaleString('en-US')} point milestone completed.`;
  return (
    <div
      className="loyalty-ring"
      data-milestone-reached={p.previous > 0 || p.complete}
    >
      <svg viewBox="0 0 120 120" role="img" aria-labelledby={id}>
        <title id={id}>{`${label}: ${display?.detail ?? text}`}</title>
        <circle className="loyalty-ring-track" cx="60" cy="60" r="48" />
        <circle
          className="loyalty-ring-current"
          key={`${p.points}:${p.target}`}
          cx="60"
          cy="60"
          r="48"
          pathLength="100"
          strokeDasharray="100 100"
          style={
            {
              strokeDashoffset: 100 * (1 - p.completed - p.current),
            } as CSSProperties
          }
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" className="loyalty-ring-value">
          {display?.value ?? p.points.toLocaleString('en-US')}
        </text>
        <text
          x="60"
          y="75"
          textAnchor="middle"
          className="loyalty-ring-caption"
        >
          {display?.caption ?? 'available points'}
        </text>
      </svg>
      <p>
        {display
          ? display.detail
          : !p.target
            ? 'No rewards configured'
            : p.complete
              ? 'All milestones unlocked'
              : `${(p.target - p.points).toLocaleString('en-US')} points to the next reward`}
      </p>
    </div>
  );
}
export function LoyaltyRedeemButton({
  eligible,
  className = '',
  ...props
}: ComponentProps<typeof Button> & { eligible: boolean }) {
  return (
    <Button
      {...props}
      disabled={!eligible || props.disabled}
      className={`${className} ${eligible && !props.loading && !props.disabled ? 'loyalty-redeem-ready' : ''}`.trim()}
    />
  );
}
