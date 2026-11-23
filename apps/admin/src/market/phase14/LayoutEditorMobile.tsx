import { Button, UtilityIcon } from '@market/ui';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import './designer-mobile.css';

/*
 * Phone presentation of the layout editor (TAB-02 retained specialist).
 *
 * Only `LayoutEditor` uses these pieces, and only while
 * `useLayoutEditorMobile()` is true, so the desktop and tablet editor render
 * exactly as before. Every rule in `designer-mobile.css` is scoped to
 * `.designer.is-mobile`.
 *
 * Why not the shared DLG-02 `Dialog drawer` / `DetailSheet` for the panels:
 * those are modal. A layout editor has to keep the map interactive while a
 * panel is open (pick an element on the map, watch a property change apply),
 * and a modal top-layer dialog would also flip the editor to the light dialog
 * tokens (`.designer-chrome dialog`) and be skipped by the editor's keyboard
 * handler. `MobileSheet` is therefore a non-modal region inside the editor,
 * with detents and a drag handle. Buttons, inputs and menu rows inside it are
 * still the shared BTN-01 / INP-02 controls and the editor's `MenuItem`.
 */

/**
 * Phones in portrait (the shell's 767px hamburger breakpoint) and phones in
 * landscape, which are wider than 767px but too short for the desktop chrome.
 */
export const LAYOUT_MOBILE_QUERY =
  '(max-width: 767px), (max-height: 500px) and (pointer: coarse)';

function subscribe(notify: () => void) {
  const query = window.matchMedia?.(LAYOUT_MOBILE_QUERY);
  query?.addEventListener('change', notify);
  return () => query?.removeEventListener('change', notify);
}

/** True while the layout editor should use its phone presentation. */
export function useLayoutEditorMobile() {
  return useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(LAYOUT_MOBILE_QUERY).matches,
    () => false,
  );
}

type IconName = ComponentProps<typeof UtilityIcon>['name'];
export type SheetDetent = 'auto' | 'half' | 'full';

const reducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Non-modal bottom sheet docked over the map. Drag the handle (or the title
 * row) to move between the half and full detents or to dismiss it; the handle
 * is also a button that toggles the detent for keyboard and screen-reader
 * users. Escape closes it.
 */
export function MobileSheet({
  id,
  title,
  open,
  onClose,
  detent: initialDetent = 'half',
  className = '',
  hideTitle = false,
  children,
}: {
  id?: string;
  title: string;
  open: boolean;
  onClose: () => void;
  detent?: SheetDetent;
  className?: string;
  /** The content renders its own visible heading (the inspector does). */
  hideTitle?: boolean;
  children: ReactNode;
}) {
  const [detent, setDetent] = useState<SheetDetent>(initialDetent);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const last = useRef<{ title: string; children: ReactNode }>({
    title,
    children,
  });
  const gesture = useRef<{ y: number; at: number; moved: boolean } | null>(
    null,
  );
  const root = useRef<HTMLElement>(null);
  if (open) last.current = { title, children };

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDetent(initialDetent);
      setDrag(0);
      return;
    }
    if (!mounted) return;
    if (reducedMotion()) {
      setMounted(false);
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setDrag(0);
    }, 220);
    return () => window.clearTimeout(timer);
    // Only open/close transitions restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) setDetent(initialDetent);
  }, [initialDetent, open]);

  if (!mounted) return null;

  const start = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    // The grip, and the content's own heading row (the inspector's title),
    // move the sheet; its buttons and fields keep their own behaviour.
    if (
      !target.closest('.designer-sheet-grip, .designer-inspector-header') ||
      target.closest('[data-sheet-close], input, select, textarea') ||
      (target.closest('button') && !target.closest('.designer-sheet-handle'))
    )
      return;
    gesture.current = { y: event.clientY, at: Date.now(), moved: false };
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dy = event.clientY - g.y;
    if (!g.moved && Math.abs(dy) > 4) {
      g.moved = true;
      // Capture only once it is a drag, so a tap still clicks the handle.
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (!g.moved) return;
    // Dragging up past the current height rubber-bands instead of tearing.
    setDrag(dy < 0 ? dy / 3 : dy);
  };
  const end = (event: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const dy = event.clientY - g.y;
    const velocity = dy / Math.max(1, Date.now() - g.at);
    setDrag(0);
    if (!g.moved) return;
    const height = root.current?.offsetHeight ?? 400;
    if (dy < -40 || velocity < -0.5) setDetent('full');
    else if (dy > height * 0.45 || velocity > 0.8) {
      if (detent === 'full' && dy < height * 0.6 && velocity <= 1.4)
        setDetent('half');
      else onClose();
    } else if (dy > 60 && detent === 'full') setDetent('half');
  };

  const shown = open ? { title, children } : last.current;
  return (
    <aside
      ref={root}
      id={id}
      className={[
        'designer-sheet designer-chrome',
        className,
        closing ? 'is-closing' : '',
        drag ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-detent={detent}
      aria-label={shown.title}
      style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onFocus={(event) => {
        // A field in a half sheet would sit under the on-screen keyboard.
        if (
          detent === 'half' &&
          (event.target as HTMLElement).matches(
            'input:not([type="checkbox"], [type="radio"], [type="color"], [type="range"]), textarea',
          )
        )
          setDetent('full');
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="designer-sheet-grip">
        {detent !== 'auto' && (
          <button
            type="button"
            className="designer-sheet-handle"
            aria-label={
              detent === 'full' ? 'Shrink panel' : 'Expand panel to full height'
            }
            aria-expanded={detent === 'full'}
            aria-controls={id}
            onClick={() => setDetent(detent === 'full' ? 'half' : 'full')}
          >
            <span aria-hidden="true" />
          </button>
        )}
        {detent === 'auto' && (
          <span className="designer-sheet-handle" aria-hidden="true">
            <span />
          </span>
        )}
        <div
          className={`designer-sheet-header${hideTitle ? ' is-hidden-title' : ''}`}
        >
          <h2 className={hideTitle ? 'sr-only' : undefined}>{shown.title}</h2>
          <Button
            type="button"
            variant="tertiary"
            size="compact"
            iconOnly
            data-sheet-close
            className="designer-sheet-close"
            aria-label={`Close ${shown.title.toLowerCase()}`}
            onClick={onClose}
          >
            <UtilityIcon name="close" />
          </Button>
        </div>
      </div>
      <div className="designer-sheet-content designer-drawer-content">
        {shown.children}
      </div>
    </aside>
  );
}

export interface BarItem {
  id: string;
  label: string;
  icon: IconName;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** Opens a sheet: announces the popup and which panel it controls. */
  controls?: string;
}

/** Bottom tool bar: icon over a short label, thumb-height targets. */
export function MobileToolbar({
  label,
  items,
  leading,
  className = '',
}: {
  label: string;
  items: BarItem[];
  /** Pinned before the scrolling items (the contextual bar's Done). */
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={['designer-mobile-bar designer-chrome', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      {leading}
      <div className="designer-mobile-bar-items">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`designer-mobile-tool${item.danger ? ' is-danger' : ''}`}
            aria-pressed={item.pressed}
            aria-controls={item.controls}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            <span className="designer-mobile-tool-icon" aria-hidden="true">
              <UtilityIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
