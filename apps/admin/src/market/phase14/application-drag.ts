import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

export type DragKind = 'question' | 'section';

export interface DragSession {
  kind: DragKind;
  id: string;
  /** Pointer position in viewport coordinates. */
  x: number;
  y: number;
  /** Where the card was grabbed, relative to its top-left corner. */
  offsetX: number;
  offsetY: number;
  width: number;
  left: number;
}

/** Nearest scrolling ancestor, or the document scroller. */
function scroller(element: HTMLElement | null): HTMLElement {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      /(auto|scroll)/.test(overflowY) &&
      node.scrollHeight > node.clientHeight
    )
      return node;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/**
 * Pointer-driven reordering in the manner of the dashboard layout editor:
 * the grabbed card follows the pointer while the list reflows live around a
 * placeholder. The caller turns pointer positions into moves (`onHover`) and
 * owns the order. A short movement threshold keeps ordinary clicks working,
 * and the page scrolls when the pointer nears the top or bottom edge. No
 * drag-and-drop library is introduced.
 */
export function useReorderDrag({
  root,
  onHover,
  onDrop,
}: {
  root: RefObject<HTMLElement | null>;
  onHover: (kind: DragKind, id: string, x: number, y: number) => void;
  onDrop: (kind: DragKind, id: string) => void;
}) {
  const [drag, setDrag] = useState<DragSession>();
  const callbacks = useRef({ onHover, onDrop });
  useLayoutEffect(() => {
    callbacks.current = { onHover, onDrop };
  });
  const suppressClick = useRef(false);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);

  const begin = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      kind: DragKind,
      id: string,
      card: HTMLElement,
      threshold = 5,
    ) => {
      if (event.button !== 0 || !event.isPrimary) return;
      cleanup.current();
      const startX = event.clientX,
        startY = event.clientY;
      const rect = card.getBoundingClientRect();
      const area = scroller(root.current);
      let session: DragSession | undefined;
      let frame = 0;
      let pointer = { x: startX, y: startY };
      const scroll = () => {
        frame = 0;
        if (!session) return;
        const top =
          area === document.scrollingElement
            ? 0
            : area.getBoundingClientRect().top;
        const bottom =
          area === document.scrollingElement
            ? window.innerHeight
            : area.getBoundingClientRect().bottom;
        const edge = 72;
        const speed =
          pointer.y < top + edge
            ? -Math.ceil(((top + edge - pointer.y) / edge) * 18)
            : pointer.y > bottom - edge
              ? Math.ceil(((pointer.y - (bottom - edge)) / edge) * 18)
              : 0;
        if (!speed) return;
        const before = area.scrollTop;
        area.scrollTop += speed;
        if (area.scrollTop !== before)
          callbacks.current.onHover(kind, id, pointer.x, pointer.y);
        frame = requestAnimationFrame(scroll);
      };
      const move = (e: PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        pointer = { x: e.clientX, y: e.clientY };
        if (!session) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) < threshold)
            return;
          session = {
            kind,
            id,
            x: e.clientX,
            y: e.clientY,
            offsetX: startX - rect.left,
            offsetY: startY - rect.top,
            width: rect.width,
            left: rect.left,
          };
          document.body.classList.add('application-dragging');
        }
        e.preventDefault();
        session = { ...session, x: e.clientX, y: e.clientY };
        setDrag(session);
        callbacks.current.onHover(kind, id, e.clientX, e.clientY);
        if (!frame) frame = requestAnimationFrame(scroll);
      };
      const end = (e: PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        const dropped = !!session;
        cleanup.current();
        if (!dropped) return;
        // The click that follows a drag must not open the card.
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 0);
        callbacks.current.onDrop(kind, id);
      };
      cleanup.current = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (session) {
          session = undefined;
          document.body.classList.remove('application-dragging');
          setDrag(undefined);
        }
        cleanup.current = () => {};
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    [root],
  );

  return { drag, begin, suppressClick };
}

/**
 * Slides cards from their previous position to their new one when the order
 * changes, so neighbours visibly make room. Positions are measured relative
 * to `root`, so scrolling never animates. Skipped under reduced motion.
 */
export function useReorderAnimation(
  root: RefObject<HTMLElement | null>,
  orderKey: string,
  enabled: boolean,
) {
  const positions = useRef(new Map<string, number>());
  const previousKey = useRef(orderKey);
  // Measures after every render so positions are current when a move starts.
  useLayoutEffect(() => {
    const element = root.current;
    const moved = previousKey.current !== orderKey;
    previousKey.current = orderKey;
    if (!element) return;
    const origin = element.getBoundingClientRect().top;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, number>();
    element.querySelectorAll<HTMLElement>('[data-flip]').forEach((card) => {
      const key = card.dataset.flip!;
      const top = card.getBoundingClientRect().top - origin;
      next.set(key, top);
      const previous = positions.current.get(key);
      if (
        enabled &&
        moved &&
        !reduced &&
        previous !== undefined &&
        Math.abs(previous - top) > 1 &&
        typeof card.animate === 'function'
      )
        card.animate(
          [
            { transform: `translateY(${previous - top}px)` },
            { transform: 'none' },
          ],
          { duration: 170, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        );
    });
    positions.current = next;
  });
}
