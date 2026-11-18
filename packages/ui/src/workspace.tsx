import { useId, type ComponentProps, type ReactNode } from 'react';
import {
  FarmstandIcon,
  FarmstandPanel,
  type FarmstandIconName,
} from './farmstand';

/**
 * Workspace compositions shared by the admin workspaces and the customer
 * dashboard. Moved unchanged from `apps/admin` (vendor `MarketsSummary`,
 * settings `SettingsPanel`) so both renderers share one presentation.
 * Styles: `@market/ui/workspace.css` and `@market/ui/settings-panel.css`.
 */

/** Shared Markets composition; values and their meaning remain caller-owned. */
export function MarketsSummary({
  items,
  className = '',
}: {
  items: Array<{
    label: string;
    /** Counts, or caller-formatted values such as money. */
    value: number | string;
    hint: ReactNode;
    icon: ComponentProps<typeof FarmstandIcon>['name'];
    tone?: 'warning' | 'success' | 'danger';
  }>;
  /** Optional layout modifier, for example a four-card grid. */
  className?: string;
}) {
  return (
    <div className={`markets-summary ui-kpi-grid ${className}`.trim()}>
      {items.map((stat) => (
        <FarmstandPanel
          as="div"
          className={`markets-stat${stat.tone ? ` markets-stat-${stat.tone}` : ''}`}
          key={stat.label}
        >
          <span className="markets-stat-icon">
            <FarmstandIcon name={stat.icon} />
          </span>
          <dl>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </dl>
          <p>{stat.hint}</p>
        </FarmstandPanel>
      ))}
    </div>
  );
}

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
  module?:
    | 'vendor-workspace'
    | 'market-workspace'
    | 'management-workspace'
    | 'customer-workspace';
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

/**
 * Identity tile for a Market or Vendor: its icon, with the business's own
 * profile picture (chosen in dashboard Settings) covering it when one is set.
 * The icon stays underneath, so a missing or blocked image still reads as
 * the icon. `className` selects the tile: the table-row
 * `markets-identity-icon` (default) or the detail panel `markets-next-art`.
 */
export function IdentityIcon({
  icon,
  image,
  className = 'markets-identity-icon',
}: {
  icon: FarmstandIconName;
  image?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`${className}${image ? ' markets-identity-photo' : ''}`}
      aria-hidden="true"
    >
      <FarmstandIcon name={icon} />
      {image && (
        <img
          key={image}
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
