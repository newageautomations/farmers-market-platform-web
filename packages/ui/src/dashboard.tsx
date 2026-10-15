import { useEffect, useRef, type ReactNode } from 'react';
import {
  dashboardClasses,
  installDashboardMenu,
  buttonClassName,
} from './presentation';

/** DSH-01 structure only. Role routing, identity and services stay in callers. */
export function DashboardFrame({
  sidebar,
  header,
  children,
  collapsed = false,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
}) {
  return (
    <div
      className={`${dashboardClasses.frame}${collapsed ? ' sidebar-collapsed' : ''}`}
    >
      {sidebar}
      <div className={dashboardClasses.main}>
        {header}
        {children}
      </div>
    </div>
  );
}

/** MOB-01 native disclosure shares the Astro contract without duplicating controls. */
export function DashboardMenu({
  navigation,
  children,
}: {
  navigation: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(
    () => (ref.current ? installDashboardMenu(ref.current) : undefined),
    [],
  );
  return (
    <details ref={ref} open className={dashboardClasses.menu}>
      <summary
        className={buttonClassName({ variant: 'secondary', iconOnly: true })}
        aria-label="Dashboard menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </summary>
      <div className={dashboardClasses.menuContent}>
        <div className={dashboardClasses.mobileNavigation}>{navigation}</div>
        <div className="actions">{children}</div>
      </div>
    </details>
  );
}
