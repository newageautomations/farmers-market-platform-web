import { FarmstandIcon, FarmstandPanel } from '@market/ui/farmstand';
import type { ComponentProps, ReactNode } from 'react';

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
