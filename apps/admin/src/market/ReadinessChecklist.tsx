import { useCallback } from 'react';
import { Badge, Button, Card } from '@market/ui';
import type { MarketService } from './service';
import { ReadState, RouteLink, useRead } from './common';

/** Live operational facts, composed from shared primitives. No presentation-only completion flags. */
export function ReadinessChecklist({
  service,
  occurrenceId,
}: {
  service: MarketService;
  occurrenceId: string;
}) {
  const read = useCallback(
    () => service.checklist!(occurrenceId),
    [service, occurrenceId],
  );
  const state = useRead(
    `${service.readKey}:checklist:${occurrenceId}`,
    read,
    !!service.checklist,
  );
  if (!service.checklist) return null;
  const data = state.data;
  return (
    <Card as="section" id="checklist" aria-labelledby="market-checklist-title">
      <h2 id="market-checklist-title">Market Day Checklist</h2>
      <ReadState {...state} retry={state.refresh} />
      {data && (
        <>
          <p>
            {data.market} · {data.localDate} · {data.timezone}
          </p>
          {data.status === 'canceled' ? (
            <p>
              This occurrence is canceled. Operational requirements are not
              marked complete.
            </p>
          ) : data.status === 'unavailable' ? (
            <p>
              Readiness sources are unavailable. Requirements have not been
              marked complete.
            </p>
          ) : (
            <>
              <p>
                {data.status === 'today'
                  ? 'This occurrence is scheduled for today.'
                  : data.status === 'future'
                    ? 'Preview for an upcoming occurrence.'
                    : 'Historical occurrence. Current source state does not reconstruct historical approvals.'}{' '}
                Readiness is advisory.
              </p>
              <ul className="notification-checklist">
                {data.items.map((item) => (
                  <li key={item.title}>
                    <h3>{item.title}</h3>
                    <Badge tone={item.count ? 'warning' : 'neutral'}>
                      {item.status}
                      {item.count ? ` (${item.count})` : ''}
                    </Badge>
                    <p>{item.explanation}</p>
                    <RouteLink to={item.href}>{item.action}</RouteLink>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            As of{' '}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleString()}
            </time>
          </p>
        </>
      )}
      <Button variant="secondary" onClick={state.refresh}>
        Refresh checklist
      </Button>
    </Card>
  );
}
