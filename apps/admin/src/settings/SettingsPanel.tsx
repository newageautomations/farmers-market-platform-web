import { useId, type MouseEvent, type ReactNode } from 'react';
import {
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  type FarmstandIconName,
} from '@market/ui/farmstand';
import { go } from '../vendor/common';
import './settings-panel.css';

/**
 * One Settings section: a Farmstand panel with the Markets stat icon tile,
 * an h2 and an optional muted description. Section components render inside
 * with their `embedded` surface so the panel is the only card outline.
 * Optional `actions` sit at the end of the heading row (Documents uses this
 * for panel-level commands such as refresh or create).
 */
export function SettingsPanel({
  icon,
  media,
  title,
  description,
  className = '',
  module,
  actions,
  children,
}: {
  icon: FarmstandIconName;
  /** Replaces the icon tile, e.g. a provider logo. */
  media?: ReactNode;
  title: string;
  description?: ReactNode;
  className?: string;
  /** Owning module's existing layout wrapper (forms, facts, grids). */
  module?: 'vendor-workspace' | 'market-workspace' | 'management-workspace';
  /** Optional heading-row commands, aligned to the end. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <FarmstandPanel
      as="section"
      className={`settings-panel ${className}`.trim()}
      aria-labelledby={id}
    >
      <header className="settings-panel-heading">
        {media ?? (
          <span className="markets-stat-icon">
            <FarmstandIcon name={icon} />
          </span>
        )}
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="settings-panel-actions">{actions}</div>}
      </header>
      <div
        className={`settings-panel-body farmstand-controls ${module ?? ''}`.trim()}
      >
        {children}
      </div>
    </FarmstandPanel>
  );
}

/** In-app link that keeps native href semantics and leave guards. */
export function SettingsLink({
  to,
  children,
  appearance = 'text',
}: {
  to: string;
  children: ReactNode;
  appearance?: 'text' | 'button';
}) {
  return (
    <FarmstandLink
      href={to}
      appearance={appearance}
      variant="secondary"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (
          event.button === 0 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          go(to);
        }
      }}
    >
      {children}
      {appearance === 'button' && <FarmstandIcon name="arrow-right" />}
    </FarmstandLink>
  );
}
