import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from './index';

function isBackdrop(
  event: { target: EventTarget | null; clientX: number; clientY: number },
  dialog: HTMLDialogElement,
) {
  if (event.target !== dialog) return false;
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

function restoreDialogFocus(target: HTMLElement | null) {
  if (
    !target?.isConnected ||
    target.matches(':disabled') ||
    target.closest(
      '[hidden], [inert], [aria-hidden="true"], dialog:not([open])',
    )
  )
    return;
  for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return;
  }
  target.focus({ preventScroll: true });
}

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  drawer?: boolean;
  busy?: boolean;
  focusTitle?: boolean;
  beforeClose?: () => boolean;
  /** Existing callers do not dismiss on backdrop interaction. */
  dismissOnBackdrop?: boolean;
  className?: string;
  size?: 'standard' | 'wide';
  description?: ReactNode;
  'aria-describedby'?: string;
  actions?: ReactNode;
  /** @deprecated All dialogs provide the shared header dismiss button. */
  showClose?: boolean;
};

// Keep the render prop separate from the native lifecycle's event-only refs.
function DialogContent({
  children,
  onDismiss,
}: Pick<DialogProps, 'children'> & { onDismiss: () => void }) {
  return typeof children === 'function' ? children(onDismiss) : children;
}

/** DLG-02 native modality, with one dismissal path for every presentation. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  drawer = false,
  busy = false,
  focusTitle = true,
  beforeClose,
  dismissOnBackdrop = false,
  className = '',
  size = 'wide',
  description,
  'aria-describedby': describedBy,
  actions,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [transition, setTransition] = useState({ open, closing: false });
  if (transition.open !== open) setTransition({ open, closing: false });
  const closing = transition.open === open && transition.closing;
  const setClosing = useCallback((value: boolean) => {
    setTransition((current) => ({ ...current, closing: value }));
  }, []);
  const policy = useRef({ busy, beforeClose, onClose, focusTitle });
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeClose = useRef<(value?: string) => void>(() => {});
  const internalCloseEvents = useRef({ pending: 0 });
  const trigger = useRef<HTMLElement | null>(null);
  const backdropStart = useRef(false);

  useLayoutEffect(() => {
    policy.current = { busy, beforeClose, onClose, focusTitle };
  });

  const stopClosing = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const restoreFocus = useCallback(() => {
    const target = trigger.current;
    trigger.current = null;
    restoreDialogFocus(target);
  }, []);

  const finish = useCallback(
    (notify: boolean, value?: string) => {
      const wasActive = active.current;
      active.current = false;
      stopClosing();
      if (ref.current?.open) {
        // Native close events are queued in browsers, synchronous in DOM tests.
        // Consume the matching event even if the caller reopens before it arrives.
        internalCloseEvents.current.pending++;
        nativeClose.current(value);
      }
      restoreFocus();
      if (notify && wasActive) policy.current.onClose();
    },
    [restoreFocus, stopClosing],
  );

  const requestClose = useCallback(
    (value?: string) => {
      if (!active.current || timer.current !== null || policy.current.busy)
        return;
      if (policy.current.beforeClose && !policy.current.beforeClose()) return;
      setClosing(true);
      const delay = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        .matches
        ? 0
        : 150;
      timer.current = setTimeout(() => {
        timer.current = null;
        setClosing(false);
        // A command may start while the exit animation is running.
        if (policy.current.busy) stopClosing();
        else finish(true, value);
      }, delay);
    },
    [finish, stopClosing, setClosing],
  );

  useLayoutEffect(() => {
    const dialog = ref.current!;
    const closeEvents = internalCloseEvents.current;
    const hadOwnClose = Object.hasOwn(dialog, 'close');
    const previousClose = dialog.close;
    nativeClose.current = previousClose.bind(dialog);
    // Programmatic element.close() must obey the same busy/draft policy.
    dialog.close = requestClose;
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
      active.current = false;
      if (dialog.open) {
        closeEvents.pending++;
        nativeClose.current();
      }
      if (hadOwnClose) dialog.close = previousClose;
      else Reflect.deleteProperty(dialog, 'close');
      // Route/unmount may remove the trigger in the same React commit.
      const previousTrigger = trigger.current;
      queueMicrotask(() => {
        if (!active.current) restoreDialogFocus(previousTrigger);
      });
    };
  }, [requestClose, restoreFocus]);

  useLayoutEffect(() => {
    const dialog = ref.current!;
    stopClosing();
    if (open) {
      // StrictMode can replay mount effects while focus is still in the title.
      // Retain that session's original trigger through the cleanup/replay.
      trigger.current ??=
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      active.current = true;
      if (!dialog.open) dialog.showModal();
      if (policy.current.focusTitle)
        titleRef.current?.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    } else {
      // Parent state is authoritative, including successful command completion.
      // Do not echo another onClose or veto feature-owned state changes.
      finish(false);
    }
  }, [open, finish, stopClosing]);

  function nativeClosed() {
    if (internalCloseEvents.current.pending > 0) {
      internalCloseEvents.current.pending--;
      return;
    }
    if (!active.current) return;
    setClosing(false);
    // Native form method="dialog" and direct prototype.close() bypass the
    // instance method. Recover rejected closure without discarding the draft.
    if (
      policy.current.busy ||
      (policy.current.beforeClose && !policy.current.beforeClose())
    ) {
      stopClosing();
      ref.current?.showModal();
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    finish(true);
  }

  useLayoutEffect(() => {
    const dialog = ref.current!;
    function clicked(event: MouseEvent) {
      if (
        dismissOnBackdrop &&
        backdropStart.current &&
        isBackdrop(event, dialog)
      )
        requestClose();
      backdropStart.current = false;
    }
    dialog.addEventListener('click', clicked);
    return () => dialog.removeEventListener('click', clicked);
  }, [dismissOnBackdrop, requestClose]);

  return (
    <dialog
      ref={ref}
      className={`ui-dialog ui-dialog-${drawer ? 'drawer' : 'modal'} ui-dialog-${size} ${drawer ? 'drawer' : ''} ${className} ${closing ? 'is-closing' : ''}`}
      aria-labelledby={id}
      aria-describedby={
        [description ? `${id}-description` : '', describedBy]
          .filter(Boolean)
          .join(' ') || undefined
      }
      aria-busy={busy}
      onClose={(event) => {
        event.stopPropagation();
        nativeClosed();
      }}
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        backdropStart.current = isBackdrop(event, event.currentTarget);
      }}
    >
      <div className="ui-dialog-header">
        <h2 ref={titleRef} id={id} tabIndex={-1}>
          {title}
        </h2>
        <Button
          iconOnly
          variant="secondary"
          className="ui-dialog-close"
          aria-label="Close"
          disabled={busy || closing}
          onClick={() => requestClose()}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </Button>
      </div>
      {description && <div id={`${id}-description`}>{description}</div>}
      <DialogContent onDismiss={() => requestClose()}>{children}</DialogContent>
      {actions && <div className="ui-actions ui-modal-actions">{actions}</div>}
    </dialog>
  );
}

export function Drawer(props: Omit<DialogProps, 'drawer'>) {
  return <Dialog {...props} size={props.size ?? 'standard'} drawer />;
}
