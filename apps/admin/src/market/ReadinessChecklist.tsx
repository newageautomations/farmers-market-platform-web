import { useCallback, type MouseEvent } from 'react';
import type { AppError, MarketDayChecklist } from '@market/api';
import { Badge } from '@market/ui';
import { FarmstandIcon, FarmstandLink } from '@market/ui/farmstand';
import { Panel } from '../vendor/application-detail';
import type { MarketService } from './service';
import { go, ReadState, useRead } from './common';
import { checklistItems, type AttentionItem } from './operations-data';

function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(href);
}

function ChecklistRows({
  items,
  attention,
}: {
  items: readonly AttentionItem[];
  attention: boolean;
}) {
  return (
    <ul className="application-detail-documents operations-checklist-items">
      {items.map((item) => (
        <li key={item.id}>
          <span
            className={`application-detail-timeline-icon application-detail-tone-${attention ? 'warning' : 'success'}`}
            aria-hidden="true"
          >
            <FarmstandIcon name={attention ? item.icon : 'circle-check'} />
          </span>
          <div>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </div>
          <div className="operations-checklist-aside">
            <Badge tone={attention ? 'warning' : 'neutral'}>
              {item.status}
              {item.count ? ` (${item.count})` : ''}
            </Badge>
            <FarmstandLink
              appearance="text"
              href={item.href}
              onClick={(event) => inApp(event, item.href)}
            >
              <span className="farmstand-text-link">{item.action}</span>
              <FarmstandIcon name="arrow-right" />
            </FarmstandLink>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Live readiness for one date: backend checklist items plus caller-supplied
 * booth and check-in items, grouped so items needing the manager come first.
 * No completion checkbox or local completion state; canceled, past and
 * unavailable sources are never presented as complete.
 */
export function ReadinessChecklistPanel({
  data,
  loading,
  error,
  retry,
  extra = [],
  sourceless = false,
}: {
  data?: MarketDayChecklist;
  loading: boolean;
  error?: AppError;
  retry: () => void;
  /** Booth and check-in items for the same date. */
  extra?: readonly AttentionItem[];
  /** No checklist source for this account: show only the extra items. */
  sourceless?: boolean;
}) {
  const sourced = !!data && ['today', 'future'].includes(data.status);
  const grouped = sourced || (sourceless && !loading && !error);
  const items = [...extra, ...(sourced ? checklistItems(data) : [])];
  const attention = items.filter((item) => item.count > 0);
  const clear = items.filter((item) => item.count === 0);
  return (
    <Panel
      icon={{ farmstand: 'clipboard-list' }}
      title="Market Day Checklist"
      className="operations-checklist"
      aside={
        data && (
          <small className="operations-checklist-time">
            As of{' '}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
          </small>
        )
      }
    >
      <div className="operations-checklist-body">
        <ReadState loading={loading} error={error} retry={retry} />
        {(data || grouped) &&
          (data?.status === 'canceled' ? (
            <p className="operations-checklist-note">
              This occurrence is canceled. Operational requirements are not
              marked complete.
            </p>
          ) : data?.status === 'unavailable' ? (
            <p className="operations-checklist-note">
              Readiness sources are unavailable. Requirements have not been
              marked complete.
            </p>
          ) : data?.status === 'past' ? (
            <p className="operations-checklist-note">
              Historical occurrence. Current source state does not reconstruct
              historical approvals.
            </p>
          ) : (
            <>
              <p className="operations-checklist-note">
                {!data
                  ? 'Vendor document and policy readiness is unavailable for this account.'
                  : data.status === 'today'
                    ? 'This occurrence is scheduled for today.'
                    : 'Preview for an upcoming occurrence.'}{' '}
                Readiness is advisory.
              </p>
              {attention.length ? (
                <section aria-labelledby="operations-attention-title">
                  <h3
                    id="operations-attention-title"
                    className="operations-checklist-group"
                  >
                    <FarmstandIcon name="triangle-alert" />
                    Needs attention
                    <span className="operations-checklist-count">
                      {attention.length}
                    </span>
                  </h3>
                  <ChecklistRows items={attention} attention />
                </section>
              ) : (
                sourced && (
                  <p className="operations-checklist-clear" role="status">
                    <FarmstandIcon name="circle-check" />
                    Nothing needs attention for this date right now.
                  </p>
                )
              )}
              {clear.length > 0 && (
                <section aria-labelledby="operations-clear-title">
                  <h3
                    id="operations-clear-title"
                    className="operations-checklist-group"
                  >
                    <FarmstandIcon name="circle-check" />
                    On track
                    <span className="operations-checklist-count">
                      {clear.length}
                    </span>
                  </h3>
                  <ChecklistRows items={clear} attention={false} />
                </section>
              )}
            </>
          ))}
      </div>
    </Panel>
  );
}

/** Reads and renders one date's checklist; refresh comes from the shell. */
export function ReadinessChecklist({
  service,
  occurrenceId,
  extra,
}: {
  service: MarketService;
  occurrenceId: string;
  extra?: readonly AttentionItem[];
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
  return (
    <ReadinessChecklistPanel
      data={state.data}
      loading={state.loading}
      error={state.error}
      retry={state.refresh}
      extra={extra}
    />
  );
}
