import { useId, useState } from 'react';
import { Badge, Button, IconButton, Tooltip } from '@market/ui';
import type { VendorPreorderOccurrence } from '@market/api';
import '../styles/market-pickup-calendar.css';

function monthAfter(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, number! - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}
export function marketHours(occurrence: VendorPreorderOccurrence) {
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: occurrence.timezone,
  });
  const end = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: occurrence.timezone,
    timeZoneName: 'short',
  });
  return `${time.format(new Date(occurrence.startsAt))} to ${end.format(new Date(occurrence.endsAt))}`;
}
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));

/** Public market facts composed with shared controls, independent of storefront theme. */
export function MarketPickupCalendar({
  occurrences,
  selectedId,
  disabled = false,
  onSelect,
}: {
  occurrences: readonly VendorPreorderOccurrence[];
  selectedId: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const dates = [...new Set(occurrences.map((o) => o.scheduleDate))].sort();
  const initial =
    occurrences.find((o) => o.id === selectedId)?.scheduleDate ??
    dates[0] ??
    new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [day, setDay] = useState(initial);
  const [year, number] = month.split('-').map(Number);
  const offset = new Date(Date.UTC(year!, number! - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year!, number!, 0)).getUTCDate();
  const cells = Array.from(
    { length: Math.ceil((offset + count) / 7) * 7 },
    (_, index) => {
      const value = index - offset + 1;
      return value > 0 && value <= count
        ? `${month}-${String(value).padStart(2, '0')}`
        : null;
    },
  );
  const title = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(month + '-01T12:00:00Z'));
  const events = occurrences
    .filter((o) => o.scheduleDate === day)
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        a.marketName.localeCompare(b.marketName),
    );
  function move(offset: number) {
    const next = monthAfter(month, offset);
    setMonth(next);
    setDay(dates.find((date) => date.startsWith(next)) ?? '');
  }
  return (
    <div className="market-pickup-calendar">
      <div className="market-calendar-navigation">
        <IconButton
          icon="chevron-left"
          label="Previous month"
          disabled={disabled || !dates.length || month <= dates[0]!.slice(0, 7)}
          onClick={() => move(-1)}
        />
        <span
          id={id + '-month'}
          className="market-calendar-month"
          aria-live="polite"
        >
          {title}
        </span>
        <IconButton
          icon="chevron-right"
          label="Next month"
          disabled={
            disabled || !dates.length || month >= dates.at(-1)!.slice(0, 7)
          }
          onClick={() => move(1)}
        />
      </div>
      <table className="market-calendar-grid" aria-labelledby={id + '-month'}>
        <thead>
          <tr>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
              <th key={name} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((date, column) => {
                const markets = date
                  ? occurrences.filter((o) => o.scheduleDate === date)
                  : [];
                const label = markets
                  .map((o) => `${o.marketName} · ${marketHours(o)}`)
                  .join('; ');
                const selected = markets.some((o) => o.id === selectedId);
                return (
                  <td key={date ?? 'blank-' + column}>
                    {date &&
                      (markets.length ? (
                        <Tooltip label={label}>
                          <Button
                            className="market-calendar-day"
                            variant={selected ? undefined : 'secondary'}
                            aria-pressed={selected}
                            aria-label={`${dateLabel(date)}: ${label}`}
                            disabled={disabled}
                            onClick={() => setDay(date)}
                          >
                            {Number(date.slice(-2))}
                          </Button>
                        </Tooltip>
                      ) : (
                        <span
                          className="market-calendar-empty-day"
                          aria-label={`${dateLabel(date)}: No pickup markets`}
                        >
                          {Number(date.slice(-2))}
                        </span>
                      ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="market-calendar-help">
        Highlighted days have pickup markets. Choose a day, then select your
        market.
      </p>
      <div
        className="market-calendar-events"
        aria-label="Pickup markets on the selected day"
      >
        {day && (
          <div className="market-calendar-date-row" aria-live="polite">
            <p className="market-calendar-date">{dateLabel(day)}</p>
            <Badge
              tone={
                events.some((o) => o.id === selectedId) ? 'success' : 'danger'
              }
            >
              {events.some((o) => o.id === selectedId)
                ? 'Selected'
                : 'Not Selected'}
            </Badge>
          </div>
        )}
        {events.map((o) => (
          <Button
            key={o.id}
            variant={o.id === selectedId ? undefined : 'secondary'}
            className="market-calendar-event"
            aria-pressed={o.id === selectedId}
            disabled={disabled}
            onClick={() => onSelect(o.id)}
          >
            <span>
              {o.marketName}
              {o.id === selectedId ? ' (current)' : ''}
            </span>
            <span>{marketHours(o)}</span>
          </Button>
        ))}
        {!events.length && <p>No pickup markets this month.</p>}
      </div>
    </div>
  );
}
