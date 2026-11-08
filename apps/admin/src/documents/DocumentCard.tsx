import type { ReactNode } from 'react';
import { RecordCard } from '@market/ui';
import { FarmstandIcon, type FarmstandIconName } from '@market/ui/farmstand';

/**
 * Documents card: the shared RecordCard (one keyboard target, details in its
 * dialog or `onOpen`) arranged as an icon tile, title, subtitle and a footer
 * of statuses and a date. Presentation only; callers own every action.
 */
export function DocumentCard({
  title,
  icon = 'file-text',
  subtitle,
  statuses,
  meta,
  onOpen,
  children,
}: {
  title: string;
  icon?: FarmstandIconName;
  subtitle?: ReactNode;
  statuses?: ReactNode;
  /** Short date or deadline line shown at the footer's end. */
  meta?: ReactNode;
  onOpen?: () => void;
  children?: ReactNode;
}) {
  return (
    <RecordCard
      className="document-card"
      title={title}
      onOpen={onOpen}
      header={
        <span className="markets-stat-icon document-card-icon" aria-hidden>
          <FarmstandIcon name={icon} />
        </span>
      }
      summary={
        <>
          {subtitle && <p className="document-card-subtitle">{subtitle}</p>}
          <span className="document-card-chevron" aria-hidden>
            <FarmstandIcon name="chevron-right" />
          </span>
          {(statuses || meta) && (
            <div className="document-card-footer">
              <span className="document-card-statuses">{statuses}</span>
              {meta && (
                <span className="document-card-meta">
                  <FarmstandIcon name="calendar-days" />
                  {meta}
                </span>
              )}
            </div>
          )}
        </>
      }
    >
      {children}
    </RecordCard>
  );
}

/** Label/value facts for document details dialogs. */
export function DocumentFacts({
  items,
}: {
  items: Array<[label: string, value: ReactNode] | false | null | undefined>;
}) {
  return (
    <dl className="documents-facts">
      {items
        .filter((item): item is [string, ReactNode] => !!item)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** A titled group inside a documents dialog. */
export function DocumentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="documents-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** "2026-11-18" (or an ISO timestamp) as a short local date. */
export function documentDate(value: string | null | undefined) {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}
