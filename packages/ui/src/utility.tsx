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
  refresh:
    'M3 11a9 9 0 0 1 15.5-6.5L21 7M21 3v4h-4M21 13a9 9 0 0 1-15.5 6.5L3 17M3 21v-4h4',
  edit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M14 2v6h6M14 2l6 6M8 14l8-8 3 3-8 8-4 1 1-4Z',
  store: navigationIconPaths.markets,
  panel: navigationIconPaths['panel-left'],
};
export function UtilityIcon({ name }: { name: keyof typeof utilityPaths }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
> & { icon: 'refresh' | 'edit' | 'panel'; label: string }) {
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
