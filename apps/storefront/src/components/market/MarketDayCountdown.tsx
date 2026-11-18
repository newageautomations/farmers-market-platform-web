import { useEffect, useState } from 'react';
import type { MarketDayOccurrence } from '@market/api';

/**
 * One digit that rolls the old value out and the new value in whenever it
 * changes. The previous value is kept only for the length of the animation.
 */
function RollingDigit({ value }: { value: string }) {
  const [shown, setShown] = useState({
    current: value,
    previous: null as string | null,
    tick: 0,
  });
  if (shown.current !== value)
    setShown((s) => ({ current: value, previous: s.current, tick: s.tick + 1 }));
  return (
    <span className="market-day-digit">
      <span
        key={`in-${shown.tick}`}
        className={shown.previous === null ? undefined : 'is-entering'}
      >
        {shown.current}
      </span>
      {shown.previous !== null && (
        <span
          key={`out-${shown.tick}`}
          className="is-leaving"
          aria-hidden="true"
        >
          {shown.previous}
        </span>
      )}
    </span>
  );
}

function Tile({ value, unit }: { value: number; unit: string }) {
  const digits = String(value).padStart(2, '0');
  return (
    <span className="market-day-tile">
      <span className="market-day-digits">
        {[...digits].map((digit, index) => (
          // Position is the identity: each column rolls independently.
          // eslint-disable-next-line react/no-array-index-key
          <RollingDigit key={digits.length - index} value={digit} />
        ))}
      </span>
      <span className="market-day-unit">{unit}</span>
    </span>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Hero countdown to the scheduled close (or opening, before the start time).
 * Uses the server clock offset so a wrong device clock cannot skew it; the
 * `MarketDayLive` island keeps owning refreshes and the cutoff redirect.
 */
export function MarketDayCountdown({
  occurrence,
  serverNow,
}: {
  occurrence: MarketDayOccurrence;
  serverNow: string;
}) {
  const [receivedAt] = useState(() => Date.now());
  const [now, setNow] = useState(receivedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const current = Date.parse(serverNow) + now - receivedAt;
  const start = Date.parse(occurrence.startsAt);
  const end = Date.parse(occurrence.endsAt);
  const opening = current < start;
  const remaining = Math.max(0, (opening ? start : end) - current);
  const totalMinutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const progress = opening
    ? 0
    : Math.min(1, Math.max(0, (current - start) / (end - start || 1)));
  const time = (iso: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: occurrence.timezone,
      timeStyle: 'short',
    }).format(new Date(iso));

  if (!remaining && !opening)
    return (
      <div className="market-day-countdown is-closed" role="status">
        <p className="market-day-countdown-label">Market hours have ended</p>
        <p className="market-day-countdown-note">
          Thanks for visiting today. See you at the next market!
        </p>
      </div>
    );

  const spoken = `${opening ? 'Market opens' : 'Market closes'} in ${
    hours ? `${plural(hours, 'hour')} ` : ''
  }${plural(minutes, 'minute')}`;
  return (
    <div className="market-day-countdown">
      <p className="market-day-countdown-label">
        <span className="market-day-live" aria-hidden="true" />
        {opening ? 'Opening soon' : 'Open now'}
        <span className="market-day-countdown-hours">
          {time(occurrence.startsAt)} – {time(occurrence.endsAt)}
        </span>
      </p>
      <div className="market-day-clock" role="timer" aria-label={spoken}>
        <span className="market-day-clock-lead" aria-hidden="true">
          {opening ? 'Opens in' : 'Closes in'}
        </span>
        <span className="market-day-tiles" aria-hidden="true">
          <Tile value={hours} unit={hours === 1 ? 'hour' : 'hours'} />
          <span className="market-day-separator">:</span>
          <Tile value={minutes} unit={minutes === 1 ? 'minute' : 'minutes'} />
        </span>
      </div>
      {!opening && (
        <div className="market-day-progress" aria-hidden="true">
          <span style={{ inlineSize: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}
