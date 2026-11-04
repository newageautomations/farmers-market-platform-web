import { FarmstandIcon, FarmstandPanel } from '@market/ui/farmstand';
import type { ComponentProps } from 'react';

/** Shared Markets composition; values and their meaning remain caller-owned. */
export function MarketsSummary({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    hint: string;
    icon: ComponentProps<typeof FarmstandIcon>['name'];
    tone?: 'warning' | 'success';
  }>;
}) {
  return (
    <div className="markets-summary ui-kpi-grid">
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
