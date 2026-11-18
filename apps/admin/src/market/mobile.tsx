import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { DataTable, Dialog, UtilityIcon } from '@market/ui';
import './market-mobile.css';
import '../vendor/vendor-mobile.css';

/**
 * Market Manager and Vendor phone and tablet presentation (`/market` and
 * `/vendor`).
 *
 * Everything here is inert outside those two dashboards: the context
 * defaults to `false`, and `market-mobile.css` is scoped to
 * `.market-dashboard` and `.vendor-admin` under the same width. Vendor-only
 * deviations (summary carousel, tighter page top, input sizing, focus and
 * modal scroll handling) live in `vendor/vendor-mobile.css`. Customer and
 * platform consumers of shared workspaces keep their existing presentation.
 */

/** Phones and tablets up to iPad landscape. Keep in sync with market-mobile.css. */
export const MARKET_COMPACT_QUERY = '(max-width: 1200px)';

const CompactContext = createContext(false);
const CarouselContext = createContext(false);

function subscribe(notify: () => void) {
  const query = window.matchMedia?.(MARKET_COMPACT_QUERY);
  query?.addEventListener('change', notify);
  return () => query?.removeEventListener('change', notify);
}

/** Provides the compact flag to Market Manager and Vendor routes; `enabled` gates other roles. */
export function MarketCompactProvider({
  enabled,
  summaryCarousel = false,
  children,
}: {
  enabled: boolean;
  /** Vendor only: summary cards scroll sideways on a phone, with position dots. */
  summaryCarousel?: boolean;
  children: ReactNode;
}) {
  const matches = useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(MARKET_COMPACT_QUERY).matches,
    () => false,
  );
  return (
    <CompactContext.Provider value={enabled && matches}>
      <CarouselContext.Provider value={summaryCarousel}>
        {children}
      </CarouselContext.Provider>
    </CompactContext.Provider>
  );
}

/** True where `MarketsSummary` may become a phone carousel (Vendor only). */
export function useSummaryCarousel() {
  return useContext(CarouselContext);
}

type RecordDetailsColumns = NonNullable<
  ComponentProps<typeof DataTable>['recordDetails']
>;

/** Phones: the shell's hamburger breakpoint. Keep in sync with the CSS. */
export const PHONE_QUERY = '(max-width: 767px)';

function subscribePhone(notify: () => void) {
  const query = window.matchMedia?.(PHONE_QUERY);
  query?.addEventListener('change', notify);
  return () => query?.removeEventListener('change', notify);
}

/**
 * Vendor phone tables. Returns a function that turns a table's
 * `recordDetails` settings into the TBL-02 record list (identifier, one
 * chosen column, an optional action column) whose rows open every column in
 * a bottom sheet, on a Vendor phone only. Everywhere else (desktop, tablets,
 * other roles) it returns `undefined`, so the full table renders unchanged.
 *
 * Use it on tables with more than three columns whose rows are literal
 * `<tr>` elements; `RecordDetailsTable` keeps the full table otherwise.
 */
function usePhone() {
  return useSyncExternalStore(
    subscribePhone,
    () => !!window.matchMedia?.(PHONE_QUERY).matches,
    () => false,
  );
}

/**
 * Render prop for shared workspaces that take a sheet flag (for example
 * `NotificationCenter detailSheet`): true on a Vendor phone only.
 */
export function PhoneSheet({
  children,
}: {
  children: (sheet: boolean) => ReactNode;
}) {
  const vendor = useContext(CarouselContext);
  const phone = usePhone();
  return <>{children(vendor && phone)}</>;
}

/** True on a Vendor phone: dialogs that opt in open as a bottom sheet. */
export function usePhoneSheet() {
  const vendor = useContext(CarouselContext);
  const phone = usePhone();
  return vendor && phone;
}

export function usePhoneRecords() {
  const vendor = useContext(CarouselContext);
  const phone = usePhone();
  return (columns: RecordDetailsColumns = {}) =>
    vendor && phone ? { ...columns, sheet: true } : undefined;
}

/**
 * Position dots for a summary carousel. Rendered as the next sibling of the
 * `.markets-summary` it tracks, so the summary's own DOM and parent selectors
 * are unchanged. The dots appear only while the summary actually overflows
 * sideways (the phone carousel in `vendor-mobile.css`); on wider screens the
 * summary is a grid, nothing overflows and nothing renders.
 *
 * No existing admin component fits: the storefront carousels are Astro-only
 * prev/next button controls, and `Pagination` pages data, not a scroll track.
 * The dots are decorative (`aria-hidden`); every card stays in the
 * accessibility tree and is reachable by swiping or Tab.
 */
export function SummaryCarouselDots({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ overflow: false, active: 0 });
  useEffect(() => {
    const track = ref.current?.previousElementSibling as HTMLElement | null;
    if (!track) return;
    // Measured straight from scroll events: a handful of rect reads per
    // event, and it keeps working where animation frames are paused.
    const measure = () => {
      const max = track.scrollWidth - track.clientWidth;
      const overflow = max > 1;
      let active = 0;
      if (overflow) {
        const cards = [...track.children] as HTMLElement[];
        const left = track.getBoundingClientRect().left;
        // The card whose leading edge sits nearest the track's leading edge;
        // the end of the track always selects the last card.
        const offsets = cards.map((card) =>
          Math.abs(card.getBoundingClientRect().left - left),
        );
        active =
          track.scrollLeft >= max - 2
            ? cards.length - 1
            : offsets.indexOf(Math.min(...offsets));
      }
      setState((prev) =>
        prev.overflow === overflow && prev.active === active
          ? prev
          : { overflow, active },
      );
    };
    measure();
    track.addEventListener('scroll', measure, { passive: true });
    // A track that is `display: contents` above the phone width has no box
    // for ResizeObserver to watch, so viewport changes re-measure too.
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(track);
    return () => {
      track.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [count]);
  return (
    <div
      ref={ref}
      className="summary-carousel-dots"
      aria-hidden="true"
      hidden={!state.overflow}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={index === state.active ? 'is-active' : undefined}
        />
      ))}
    </div>
  );
}

/** True on a Market Manager phone or tablet viewport. */
export function useMarketCompact() {
  return useContext(CompactContext);
}

/**
 * A list's selected-record panel. On desktop it renders in place beside the
 * list, unchanged. On a phone or tablet the panel would sit below the whole
 * table, so it opens in the shared Dialog drawer when a row is chosen.
 */
export function DetailSheet({
  title,
  open,
  onClose,
  phoneOnly = false,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  /** Keep the panel in place on tablets; use the sheet on phones only. */
  phoneOnly?: boolean;
  children: ReactNode;
}) {
  const compact = useMarketCompact();
  const phone = usePhone();
  if (!compact || (phoneOnly && !phone)) return <>{children}</>;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      drawer
      dismissOnBackdrop
      className="market-detail-sheet farmstand-controls"
    >
      {children}
    </Dialog>
  );
}

/**
 * Button content that collapses to its icon on a Market Manager phone or
 * tablet. Desktop shows the label alone, exactly as before; the label stays
 * in the accessibility tree at every width.
 */
export function CompactLabel({
  icon,
  children,
}: {
  /** Omit when the button already renders its own icon. */
  icon?: ComponentProps<typeof UtilityIcon>['name'];
  children: ReactNode;
}) {
  return (
    <>
      {icon && (
        <span className="compact-action-icon" aria-hidden="true">
          <UtilityIcon name={icon} />
        </span>
      )}
      <span className="compact-action-label">{children}</span>
    </>
  );
}
