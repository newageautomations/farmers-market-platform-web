/** Renderer-neutral approved presentation. No business controllers or runtime imports. */
export type ButtonVariant =
  'primary' | 'secondary' | 'tertiary' | 'destructive' | 'disclosure';
export type ButtonSize = 'default' | 'compact';
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type AlertSeverity =
  'success' | 'partial' | 'warning' | 'error' | 'info' | 'neutral';
export type HeadingLevel = 2 | 3 | 4;
export const dashboardClasses = {
  frame: 'admin-shell ui-dashboard',
  sidebar: 'admin-sidebar',
  sidebarToggle: 'ui-dashboard-sidebar-toggle',
  main: 'admin-main',
  header: 'admin-topbar',
  content: 'admin-content',
  menu: 'ui-dashboard-menu',
  menuContent: 'ui-dashboard-menu-content',
  mobileNavigation: 'ui-dashboard-mobile-links',
} as const;
export const navigationIconPaths = {
  // Lucide panel-left geometry, shared by both dashboard renderers.
  'panel-left':
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 3v18',
  overview: 'M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7',
  orders: 'M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h4',
  markets: 'M3 10h18l-2-6H5l-2 6Zm2 0v11h14V10m-10 11v-7h6v7',
  vendors:
    'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m12-14a4 4 0 0 1 0 8m6 6v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  settings:
    'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
} as const;
export function alertClassName(
  severity: AlertSeverity = 'info',
  className = '',
) {
  return ['alert', 'ui-alert', `ui-alert-${severity}`, className]
    .filter(Boolean)
    .join(' ');
}
export function sectionHeadingClassName(
  variant: 'dashboard' | 'consumer' = 'dashboard',
) {
  return `ui-section-heading ui-section-heading-${variant}`;
}
/** Native SSR enhancement for SID-01. Without JS the sidebar stays available. */
export function installDashboardSidebarToggle(button: HTMLButtonElement) {
  const frame = button.closest<HTMLElement>('.ui-dashboard');
  const sidebar = frame?.querySelector<HTMLElement>('.admin-sidebar');
  if (!frame || !sidebar || button.getAttribute('aria-controls') !== sidebar.id)
    return;
  const sync = () => {
    const collapsed = frame.classList.contains('sidebar-collapsed');
    if (collapsed && sidebar.contains(document.activeElement)) button.focus();
    sidebar.inert = collapsed;
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute(
      'aria-label',
      collapsed ? 'Expand sidebar' : 'Collapse sidebar',
    );
  };
  const toggle = () => {
    frame.classList.toggle('sidebar-collapsed');
    sync();
  };
  sync();
  button.hidden = false;
  button.addEventListener('click', toggle);
  return () => button.removeEventListener('click', toggle);
}
/** Enhances native disclosure only. One mounted toolbar survives viewport changes. */
export function installDashboardMenu(menu: HTMLDetailsElement) {
  const summary = menu.querySelector<HTMLElement>('summary');
  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 767px)')
      : { matches: false, addEventListener() {}, removeEventListener() {} };
  const navigation = menu.querySelector<HTMLElement>(
    `.${dashboardClasses.mobileNavigation}`,
  );
  const sync = () => summary?.setAttribute('aria-expanded', String(menu.open));
  const resize = () => {
    const focused = document.activeElement;
    // Before hiding desktop-only or menu content, move focus to a visible target.
    if (focused instanceof HTMLElement && menu.contains(focused)) {
      if (media.matches) summary?.focus();
      else document.querySelector<HTMLElement>('#main')?.focus();
    }
    if (
      media.matches &&
      focused instanceof HTMLElement &&
      (focused.closest('.admin-sidebar') ===
        menu.closest('.ui-dashboard')?.querySelector('.admin-sidebar') ||
        focused ===
          menu
            .closest('.ui-dashboard')
            ?.querySelector(`.${dashboardClasses.sidebarToggle}`))
    )
      summary?.focus();
    menu.open = !media.matches;
    if (navigation) navigation.hidden = !media.matches;
    sync();
  };
  const keydown = (event: KeyboardEvent) => {
    if (media.matches && event.key === 'Escape' && menu.open) {
      event.preventDefault();
      menu.open = false;
      sync();
      summary?.focus();
    }
  };
  const navigate = (event: MouseEvent) => {
    const target = event.target;
    if (
      media.matches &&
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey &&
      target instanceof Element &&
      target.closest('a[href]')
    ) {
      menu.open = false;
      sync();
      document.querySelector<HTMLElement>('#main')?.focus();
    }
  };
  resize();
  menu.addEventListener('toggle', sync);
  menu.addEventListener('keydown', keydown);
  menu.addEventListener('click', navigate);
  media.addEventListener('change', resize);
  return () => {
    menu.removeEventListener('toggle', sync);
    menu.removeEventListener('keydown', keydown);
    menu.removeEventListener('click', navigate);
    media.removeEventListener('change', resize);
  };
}
/** BDG-02 appearance only. Each feature owns its status meanings and labels. */
export function statusBadgeClassName(tone: StatusTone) {
  return `ui-status ui-status-${tone}`;
}
/** DDN-03 native details adapter. Retains native expansion and nested state. */
export function disclosureClassName(className = '') {
  return ['ui-disclosure', className].filter(Boolean).join(' ');
}
export function cardClassName({
  spacing = 'block',
  padding = 'default',
  surface = 'card',
  className = '',
}: {
  spacing?: 'block' | 'contained';
  padding?: 'default' | 'none';
  surface?: 'card' | 'embedded';
  className?: string;
} = {}) {
  return [
    'card',
    'ui-card',
    surface === 'embedded' ? 'ui-card-embedded' : '',
    spacing === 'contained' ? 'ui-card-contained' : '',
    padding === 'none' ? 'ui-card-flush' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
export function selectClassName(
  className = '',
  variant: 'ordinary' | 'status' = 'ordinary',
) {
  return [variant === 'ordinary' ? 'ui-select' : '', className]
    .filter(Boolean)
    .join(' ');
}
export function inputClassName(type = 'text', className = '') {
  const ordinary = ![
    'hidden',
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'button',
    'submit',
    'reset',
    'image',
  ].includes(type);
  return [ordinary ? 'ui-input' : '', className].filter(Boolean).join(' ');
}
export function buttonClassName({
  variant,
  size = 'default',
  iconOnly = false,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
} = {}) {
  // Retain existing consumers' className="secondary" contract.
  const selected =
    variant ??
    (className.split(/\s+/).includes('secondary') ? 'secondary' : 'primary');
  return [
    'button',
    'ui-button',
    selected === 'secondary' ? 'secondary' : '',
    selected === 'tertiary' ? 'button-tertiary' : '',
    selected === 'destructive' ? 'button-destructive' : '',
    selected === 'disclosure' ? 'button-disclosure' : '',
    size === 'compact' ? 'button-compact' : '',
    iconOnly ? 'button-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
