import { Button, UtilityIcon, bounds } from '@market/ui';
import type { MapElement } from '@market/api';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

// Layout editor chrome (TAB-02 retained specialist). The developer asked for
// a dedicated full-screen editor look, so these pieces are editor-only: no
// shared component supplies an icon rail, a collapsible inspector section, or
// a toolbar that floats over a canvas selection. Buttons, inputs and selects
// inside them remain the shared BTN-01, INP-02 and SEL-03 controls.

type IconName = ComponentProps<typeof UtilityIcon>['name'];

/** Collapsible inspector/drawer section with a full-width heading row. */
export function PanelSection({
  title,
  children,
  defaultOpen = true,
  className = '',
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      className={['designer-section', className].filter(Boolean).join(' ')}
      open={defaultOpen}
    >
      <summary>
        <span>{title}</span>
        <UtilityIcon name="chevron-down" />
      </summary>
      <div className="designer-section-body">{children}</div>
    </details>
  );
}

/** Small popover menu anchored to an icon button. */
export function ToolbarMenu({
  icon,
  label,
  disabled = false,
  children,
  align = 'start',
}: {
  icon: IconName;
  label: string;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key, true);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  return (
    <div className="designer-menu" ref={root}>
      <Button
        type="button"
        variant="tertiary"
        size="compact"
        iconOnly
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <UtilityIcon name={icon} />
      </Button>
      {open && (
        <div
          id={id}
          className={`designer-menu-panel is-${align}`}
          role="group"
          aria-label={label}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Menu entry used inside ToolbarMenu panels. */
export function MenuItem({
  children,
  onClick,
  disabled,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <button
      type="button"
      className="designer-menu-item"
      disabled={disabled}
      onClick={onClick}
    >
      {icon ? <UtilityIcon name={icon} /> : <span aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export type DrawerId = 'add' | 'layers' | 'smart' | 'assets' | 'settings';

/** Vertical icon rail that opens the left drawer. */
export function EditorRail({
  items,
  active,
  onSelect,
}: {
  items: Array<{ id: DrawerId; label: string; icon: IconName }>;
  active: DrawerId | null;
  onSelect: (id: DrawerId) => void;
}) {
  return (
    <nav className="designer-rail designer-chrome" aria-label="Design tools">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="designer-rail-item"
          aria-pressed={active === item.id}
          aria-controls="layout-drawer"
          onClick={() => onSelect(item.id)}
        >
          <UtilityIcon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Heading row of the left drawer with its close control. */
export function DrawerHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="designer-drawer-header">
      <h2>{title}</h2>
      <Button
        type="button"
        variant="tertiary"
        size="compact"
        iconOnly
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
      >
        <UtilityIcon name="close" />
      </Button>
    </div>
  );
}

// Clears the transformer's rotate handle (28px) above the selection.
const TOOLBAR_GAP = 44;

/** Places the floating selection toolbar above the selection's screen bounds. */
export function selectionAnchor(
  items: MapElement[],
  view: { x: number; y: number; scale: number } | null,
  size: { width: number; height: number } | null,
) {
  if (!items.length || !view || !size || size.width < 2) return null;
  const box = items.map(bounds);
  const left = Math.min(...box.map((b) => b.x)),
    right = Math.max(...box.map((b) => b.x + b.width)),
    top = Math.min(...box.map((b) => b.y)),
    bottom = Math.max(...box.map((b) => b.y + b.height));
  const screenTop = top * view.scale + view.y,
    screenBottom = bottom * view.scale + view.y,
    centerX = ((left + right) / 2) * view.scale + view.x;
  const below = screenTop < 104;
  return {
    x: Math.max(150, Math.min(size.width - 150, centerX)),
    y: below
      ? Math.min(size.height - 56, screenBottom + TOOLBAR_GAP)
      : screenTop - TOOLBAR_GAP,
    below,
  };
}
