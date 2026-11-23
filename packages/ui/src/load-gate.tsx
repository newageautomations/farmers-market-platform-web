import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * LOD-01 coordinated content loading. Reads tracked by one gate that are in
 * flight together are released together: a finished read's result is held
 * until every other tracked read has settled, then all of them resolve in the
 * same task. React batches the resulting state updates into one render, so
 * every skeleton is replaced, and every loaded section fades in, at the same
 * moment instead of shifting the layout one section at a time.
 *
 * Only presentation timing changes. Requests start exactly as before and are
 * never retried, cached or cancelled; errors are held and released the same
 * way. A short settle window lets reads that start a moment later (sections
 * that mount after a sibling) join the batch, and a hold limit releases
 * finished reads if another read is still unsettled after several seconds.
 * Reads that only start after another read's data arrives cannot join its
 * batch and load on their own.
 */
const SETTLE_MS = 40;
export const HOLD_LIMIT_MS = 8000;

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

export class LoadGate {
  private pending = 0;
  private waiting: Array<() => void> = [];
  private settleTimer?: ReturnType<typeof setTimeout>;
  private limitTimer?: ReturnType<typeof setTimeout>;
  private holds = 0;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private idleListeners = new Set<() => void>();

  track<T>(promise: Promise<T>): Promise<T> {
    this.pending += 1;
    clearTimeout(this.settleTimer);
    this.changed();
    return promise
      .then(
        (value): Settled<T> => ({ ok: true, value }),
        (error: unknown): Settled<T> => ({ ok: false, error }),
      )
      .then(
        (result) =>
          new Promise<T>((resolve, reject) => {
            this.pending -= 1;
            this.waiting.push(() =>
              result.ok ? resolve(result.value) : reject(result.error),
            );
            this.limitTimer ??= setTimeout(() => this.release(), HOLD_LIMIT_MS);
            this.schedule();
            this.changed();
          }),
      );
  }

  private schedule() {
    clearTimeout(this.settleTimer);
    if (this.pending > 0) return;
    this.settleTimer = setTimeout(() => {
      if (this.pending === 0) this.release();
    }, SETTLE_MS);
  }

  private release() {
    clearTimeout(this.settleTimer);
    clearTimeout(this.limitTimer);
    this.settleTimer = this.limitTimer = undefined;
    for (const resume of this.waiting.splice(0)) resume();
    this.changed();
  }

  /**
   * Marks visible loading (a mounted skeleton) so the page stays in its
   * loading phase, including content that loads without a tracked read and
   * lazily loaded modules. Returns the release callback.
   */
  hold() {
    this.holds += 1;
    this.changed();
    let held = true;
    return () => {
      if (!held) return;
      held = false;
      this.holds -= 1;
      this.changed();
    };
  }

  /** Calls `listener` once nothing has been loading for the settle window. */
  onIdle(listener: () => void) {
    this.idleListeners.add(listener);
    this.changed();
    return () => {
      this.idleListeners.delete(listener);
    };
  }

  private busy() {
    return this.pending > 0 || this.holds > 0 || this.waiting.length > 0;
  }

  private changed() {
    clearTimeout(this.idleTimer);
    if (!this.idleListeners.size || this.busy()) return;
    this.idleTimer = setTimeout(() => {
      if (this.busy()) return;
      const listeners = [...this.idleListeners];
      this.idleListeners.clear();
      for (const listener of listeners) listener();
    }, SETTLE_MS);
  }
}

const LoadGateContext = createContext<LoadGate | null>(null);

/** The nearest page load gate, or null outside a `LoadGateProvider`. */
export function useLoadGateInstance() {
  return useContext(LoadGateContext);
}

/** Coordinates content reads inside one page area (the dashboard content). */
export function LoadGateProvider({ children }: { children: ReactNode }) {
  const [gate] = useState(() => new LoadGate());
  return (
    <LoadGateContext.Provider value={gate}>{children}</LoadGateContext.Provider>
  );
}

/**
 * Wraps a content read so it settles together with the other reads in the
 * nearest `LoadGateProvider`. Outside a provider it returns the read as is.
 * Use it for reads that fill page content, never for writes or commands.
 */
export function useLoadGate() {
  const gate = useContext(LoadGateContext);
  return useCallback(
    <T,>(promise: Promise<T>): Promise<T> =>
      gate ? gate.track(promise) : promise,
    [gate],
  );
}

/** Keeps the page in its loading phase while the calling skeleton is mounted. */
export function useLoadHold(active = true) {
  const gate = useContext(LoadGateContext);
  useLayoutEffect(
    () => (active && gate ? gate.hold() : undefined),
    [gate, active],
  );
}
