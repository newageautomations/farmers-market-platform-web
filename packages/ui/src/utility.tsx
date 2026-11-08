import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Button } from './index';
import { navigationIconPaths } from './presentation';

const utilityPaths = {
  cursor: 'M4 3l7 18 3-7 7-3L4 3Z',
  hand: 'M8 13V5a2 2 0 0 1 4 0v7M12 11V4a2 2 0 0 1 4 0v8M16 11V6a2 2 0 0 1 4 0v9c0 4-3 7-7 7h-1c-2 0-4-1-5-3l-4-6a2 2 0 0 1 3-2l2 2',
  square: 'M4 4h16v16H4z',
  circle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  triangle: 'M12 3 22 21H2L12 3Z',
  line: 'M4 20 20 4',
  text: 'M4 5V3h16v2M12 3v18M8 21h8',
  image: 'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M9 7h.01',
  path: 'M3 18c0-8 18 2 18-6s-18 2-18-6',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',
  copy: 'M8 8h13v13H8zM16 8V3H3v13h5',
  close: 'm6 6 12 12M18 6 6 18',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  check: 'm5 12 4 4L19 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  calendar:
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM16 2v4M8 2v4M3 10h18',
  'document-check':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 15l3 3 5-6',
  notebook:
    'M6 3h13a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM2 7h4M2 12h4M2 17h4M10 8h7M10 12h7M10 16h5',
  email: 'M3 5h18v14H3zM3 5l9 7 9-7',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L9 11a16 16 0 0 0 4 4l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z',
  address:
    'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  facebook:
    'M14 22v-9h3l.5-4H14V6.5c0-1.2.3-2 2-2h2V1.2A24 24 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9',
  instagram:
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17.5 6.5h.01',
  desktop: 'M3 4h18v13H3zM8 21h8M12 17v4',
  tablet: 'M5 2h14v20H5zM11 18h2',
  mobile: 'M7 2h10v20H7zM11 18h2',
  expand: 'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6',
  restore: 'M3 9h6V3M15 3v6h6M9 21v-6H3M21 15h-6v6',
  external: 'M14 3h7v7M21 3l-11 11M10 3H3v18h18v-7',

  refresh:
    'M3 11a9 9 0 0 1 15.5-6.5L21 7M21 3v4h-4M21 13a9 9 0 0 1-15.5 6.5L3 17M3 21v-4h4',
  edit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M14 2v6h6M14 2l6 6M8 14l8-8 3 3-8 8-4 1 1-4Z',
  store: navigationIconPaths.markets,
  trophy:
    'M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 12v6M8 21h8M9 18h6v3H9',
  medal:
    'm8 3 4 7 4-7M5 3h4l3 5 3-5h4l-4 8M9 11 5 3M17 16a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM12 13v6M10 15h4',
  panel: navigationIconPaths['panel-left'],
  heart:
    'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 6 6 6-6 6',
  'chevron-down': 'm6 9 6 6 6-6',
  'arrow-up': 'M12 20V4m-7 7 7-7 7 7',
  'arrow-down': 'M12 4v16m-7-7 7 7 7-7',
  /** Drag handle: two columns of three dots. */
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'm15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM21 21l-5-5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  sparkle:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  unlock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 7.5-2',
  'eye-off':
    'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  exit: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12',
  booth: 'M3 9 5 4h14l2 5M3 9h18M3 9v11h18V9M9 20v-6h6v6',
  'booth-double': 'M2 9l2-5h16l2 5M2 9h20M2 9v11h20V9M12 9v11',
  align: 'M4 3v18M8 6h12v4H8zM8 14h7v4H8z',
  paste:
    'M9 4h6v3H9zM15 5h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3',
  legend: 'M4 5h3v3H4zM10 6.5h10M4 11h3v3H4zM10 12.5h10M4 17h3v3H4zM10 18.5h10',
  grid: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
};
export function UtilityIcon({
  name,
  filled = false,
}: {
  name: keyof typeof utilityPaths;
  filled?: boolean;
}) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'heart' ? 2 : name === 'grip' ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={utilityPaths[name]} />
    </svg>
  );
}

/** Native popovers escape clipping and dialog stacking while inheriting theme tokens. */
export function Tooltip({
  label,
  children,
  enabled = true,
  id: suppliedId,
}: {
  label: string;
  children: ReactNode;
  enabled?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const ref = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  const nativePopover =
    typeof HTMLElement !== 'undefined' &&
    'showPopover' in HTMLElement.prototype;
  useLayoutEffect(() => {
    const tooltip = surface.current;
    if (!enabled || !shown || !tooltip || !ref.current) return;
    if (nativePopover) tooltip.showPopover();
    function place() {
      if (!ref.current) return;
      const anchor = ref.current.getBoundingClientRect();
      const box = tooltip!.getBoundingClientRect();
      const preferred = anchor.right + 8;
      const left =
        preferred + box.width <= window.innerWidth - 8
          ? preferred
          : anchor.left - box.width - 8;
      tooltip!.style.left = `${Math.max(8, Math.min(left, window.innerWidth - box.width - 8))}px`;
      tooltip!.style.top = `${Math.max(8, Math.min(anchor.top + (anchor.height - box.height) / 2, window.innerHeight - box.height - 8))}px`;
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      if (nativePopover && tooltip.matches(':popover-open'))
        tooltip.hidePopover();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [enabled, shown, nativePopover]);
  return (
    <span
      role="presentation"
      ref={ref}
      className="ui-tooltip-anchor"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
      onFocus={() => setShown(true)}
      onBlur={() => setShown(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && shown) {
          e.stopPropagation();
          setShown(false);
        }
      }}
    >
      {children}
      {enabled && shown && (
        <span
          ref={surface}
          id={id}
          role="tooltip"
          popover={nativePopover ? 'manual' : undefined}
          className="ui-tooltip ui-tooltip-surface"
        >
          {label}
        </span>
      )}
    </span>
  );
}
export function IconButton({
  icon,
  label,
  ...props
}: Omit<
  ComponentProps<typeof Button>,
  'children' | 'iconOnly' | 'aria-label'
> & { icon: keyof typeof utilityPaths; label: string }) {
  return (
    <Tooltip label={label}>
      <Button variant="secondary" {...props} iconOnly aria-label={label}>
        <UtilityIcon name={icon} />
      </Button>
    </Tooltip>
  );
}
export function MarketPlatformLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="ui-platform-logo">
      <UtilityIcon name="store" />
      <span className={compact ? 'sr-only' : 'ui-platform-name'}>
        Market platform
      </span>
    </span>
  );
}
