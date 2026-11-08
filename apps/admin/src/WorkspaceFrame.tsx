import type { CSSProperties, ReactNode } from 'react';
import { FarmstandIcon, type FarmstandIconName } from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { WorkspaceMenu } from './WorkspaceMenu';
import './vendor/markets-workspace.css';

export interface WorkspaceTab<T extends string> {
  value: T;
  label: string;
  href: string;
  icon: FarmstandIconName;
}

/**
 * Shared tabbed workspace frame: the Markets heading (icon, title, subtitle,
 * optional actions) and the segmented `WorkspaceMenu`, followed by the
 * caller's content. Used by Markets, Finances and Settings. Callers own the
 * current view, routing and every read; this frame owns presentation only.
 */
export function WorkspaceFrame<T extends string>({
  icon,
  title,
  description,
  menuLabel = title,
  tabs,
  value,
  onChange,
  actions,
  className = '',
  headingClassName = '',
  actionsClassName = 'workspace-heading-actions',
  style,
  children,
}: {
  icon: FarmstandIconName;
  title: string;
  description: ReactNode;
  menuLabel?: string;
  tabs: Array<WorkspaceTab<T>>;
  value: T;
  onChange: (value: T) => void;
  actions?: ReactNode;
  className?: string;
  headingClassName?: string;
  actionsClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`markets-workspace ${className}`.trim()}
      style={{
        ['--workspace-tabs' as string]: tabs.length,
        // Opt-in narrow layouts wrap long tab sets onto rows of three.
        ['--workspace-tabs-narrow' as string]: Math.min(tabs.length, 3),
        ...style,
      }}
    >
      <header className={`markets-heading ${headingClassName}`.trim()}>
        <FarmstandIcon name={icon} />
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className={actionsClassName}>{actions}</div>}
      </header>
      {tabs.length > 1 && (
        <WorkspaceMenu
          label={menuLabel}
          value={value}
          onChange={onChange}
          items={tabs.map((tab) => ({
            value: tab.value,
            label: tab.label,
            href: tab.href,
            icon: <FarmstandIcon name={tab.icon} />,
          }))}
        />
      )}
      {children}
    </div>
  );
}
