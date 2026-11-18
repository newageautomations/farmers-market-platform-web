import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  dashboardClasses,
  installDashboardMenu,
  installHeaderMenu,
  closeHeaderMenu,
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

/**
 * Compact topbar menu: an icon trigger (Farmstand icon button) opening a
 * floating panel. Native details/summary keeps keyboard and no-JS semantics;
 * a pointer press outside or Escape closes it. Used by the Market Manager
 * topbar for notifications and the account menu, where the DDN-03 Dropdown's
 * inline disclosure presentation does not fit a floating header menu.
 */
export function HeaderMenu({
  label,
  icon,
  badge,
  className = '',
  children,
}: {
  /** Accessible name of the trigger. */
  label: string;
  icon: ReactNode;
  /** Small visual indicator on the trigger (e.g. an unread count). */
  badge?: ReactNode;
  className?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [menu, setMenu] = useState<HTMLDetailsElement | null>(null);
  /** Plays the closing animation, then closes the native disclosure. */
  const close = useCallback(() => {
    if (menu) closeHeaderMenu(menu);
  }, [menu]);
  useEffect(() => (menu ? installHeaderMenu(menu) : undefined), [menu]);
  return (
    <details ref={setMenu} className={`ui-header-menu ${className}`}>
      <summary
        className={buttonClassName({
          variant: 'secondary',
          iconOnly: true,
          className: 'farmstand-button ui-header-menu-trigger',
        })}
        aria-label={label}
      >
        {icon}
        {badge}
      </summary>
      <div className="ui-header-menu-panel">
        {typeof children === 'function' ? children(close) : children}
      </div>
    </details>
  );
}

/** Lucide `user` glyph for the compact shell's account menu (all roles). */
export function AccountIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
