import { useId, useState, type ReactNode } from 'react';
import { Button, Dialog, type DialogProps } from '@market/ui';
import { statusBadgeClassName } from '@market/ui/presentation';
import { Chevron } from '../NavigationIcon';
export function AnimatedDisclosure({
  title,
  action,
  children,
  defaultOpen = false,
  className = '',
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visited, setVisited] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={`market-disclosure ${open ? 'is-open' : ''} ${className}`}>
      <div className="market-disclosure-header">
        <Button
          type="button"
          variant="disclosure"
          className="market-disclosure-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setVisited(true);
            setOpen(!open);
          }}
        >
          <span>{title}</span>
          <span className="market-disclosure-chevron" aria-hidden="true">
            <Chevron />
          </span>
        </Button>
        {action}
      </div>
      <div
        id={id}
        className="market-disclosure-content"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="market-disclosure-inner">{visited && children}</div>
      </div>
    </div>
  );
}
export function friendlyLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w+/g,
      (word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase(),
    );
}
export function statusTone(value: string) {
  const status = value.toLowerCase();
  if (
    [
      'approved',
      'confirmed',
      'accepted',
      'active',
      'published',
      'paid',
      'available',
      'enabled',
      'attended',
      'checked_in',
      'completed',
    ].includes(status)
  )
    return 'success';
  if (
    [
      'pending',
      'planned',
      'under_review',
      'needs_info',
      'waitlisted',
      'draft',
      'awaiting',
      'not_checked_in',
    ].includes(status)
  )
    return 'warning';
  if (
    [
      'suspended',
      'cancelled',
      'declined',
      'overdue',
      'past_due',
      'failed',
      'no_show',
    ].includes(status)
  )
    return 'danger';
  if (['scheduled', 'open', 'submitted'].includes(status)) return 'info';
  return 'neutral';
}
export function StatusBadge({ children }: { children: string }) {
  return (
    <span className={statusBadgeClassName(statusTone(children))}>
      {friendlyLabel(children)}
    </span>
  );
}
export function date(
  value: string | null | undefined,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not provided';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: dateOnly ? 'UTC' : timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(dateOnly
      ? {}
      : ({
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        } as const)),
  }).format(new Date(dateOnly ? `${value}T12:00:00Z` : value));
}
export function clockTime(value: string) {
  const [hour, minute] = value.split(':');
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
}
// Existing market callers retain their import and the approved wide sizing.
export function MarketDialog(props: DialogProps) {
  return <Dialog {...props} size={props.size ?? 'wide'} />;
}
export { SearchSelect } from '@market/ui';
