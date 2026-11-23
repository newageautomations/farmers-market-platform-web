import { useCallback, useEffect, useState } from 'react';
import { MarketMap, Card, Alert, SectionHeader } from '@market/ui';
import { cardClassName } from '@market/ui/presentation';
import { safeAsset } from '@market/storefront-core/catalog';
import {
  marketDayRemaining,
  type MarketOccurrenceVendor,
  type MarketDayOccurrence,
  type MarketDayPersonal,
  type MarketDayPublicState,
  type PublicOccurrenceMap,
} from '@market/api';
import { pickupStatus } from '../../lib/customer-presentation';
import { boothCategoryLabel, boothVendor } from '../../lib/market-day-booths';

/** Only follows participate in map overlays. Orders never enter this function. */
export function followedBoothOverlays(
  map: PublicOccurrenceMap | null,
  followedVendorIds: readonly string[],
) {
  const followed = new Set(followedVendorIds);
  return Object.fromEntries(
    (map?.spaces ?? [])
      .filter(
        (space) =>
          space.vendor?.vendorId && followed.has(String(space.vendor.vendorId)),
      )
      .map((space) => [space.elementId, 'Following']),
  );
}
/**
 * The booth card shown when a shopper points at a booth on the map, built
 * from the vendor-card classes so it matches the "Vendors today" cards: the
 * vendor's picture, the booth, the vendor, their main category and a link to
 * their storefront.
 */
function BoothVendorCard({
  space,
  vendor,
}: {
  space: PublicOccurrenceMap['spaces'][number];
  vendor?: MarketOccurrenceVendor;
}) {
  const name = vendor?.name ?? space.vendor?.businessName;
  const image = safeAsset(vendor?.image ?? undefined);
  const category = boothCategoryLabel(space.vendor?.category);
  return (
    <div
      className={cardClassName({
        spacing: 'contained',
        className: 'market-vendor-card market-day-booth-card',
      })}
    >
      {/* Booth name in the top corner; the picture sits beside the name and category. */}
      <p className="market-day-booth-name">{space.label}</p>
      <div className="market-day-booth-vendor">
        {name &&
          (image ? (
            <img
              className="market-vendor-image"
              src={image}
              alt=""
              width="56"
              height="56"
            />
          ) : (
            <span className="harvest-vendor-symbol" aria-hidden="true">
              {name.trim()[0]?.toUpperCase() ?? '•'}
            </span>
          ))}
        <div className="market-day-booth-text">
          {/* Plain text: "Visit storefront" below is the card's only link. */}
          <h3>{name ?? 'Open booth'}</h3>
          {category && <p className="market-vendor-meta">{category}</p>}
        </div>
      </div>
      {name && vendor?.storefrontUrl && (
        <div className="market-vendor-actions">
          <a className="harvest-text-link" href={vendor.storefrontUrl}>
            Visit storefront <span aria-hidden="true">&#8599;</span>
          </a>
        </div>
      )}
    </div>
  );
}
const signature = (state: MarketDayPublicState) =>
  state.occurrences.map((o) => `${o.id}:${o.startsAt}:${o.endsAt}`).join('|');

/** Narrow island: timer, private reads and the existing read-only map. The page shell remains SSR. */
export function MarketDayLive({
  state,
  occurrence,
  map,
  boothVendors,
}: {
  state: MarketDayPublicState;
  occurrence?: MarketDayOccurrence;
  map?: PublicOccurrenceMap | null;
  /** Themes that show vendor cards on the map pass today's vendors. */
  boothVendors?: readonly MarketOccurrenceVendor[];
}) {
  const [clock, setClock] = useState(() => ({
    serverNow: state.serverNow,
    receivedAt: Date.now(),
    now: Date.now(),
  }));
  const [personal, setPersonal] = useState<MarketDayPersonal>();
  const [unavailable, setUnavailable] = useState(false);
  // "Find their booth" links on the vendor cards (data-market-day-booth)
  // scroll to the map and select that booth.
  const [locateId, setLocateId] = useState<string>();
  // Done once the map has shown the booth, so a remounted map (sign-in
  // state changes its key) does not repeat it.
  const clearLocate = useCallback(() => setLocateId(undefined), []);
  useEffect(() => {
    const find = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-market-day-booth]')
          : null;
      const id = link?.dataset.marketDayBooth;
      if (!id || !map?.spaces.some((s) => s.elementId === id)) return;
      event.preventDefault();
      document.getElementById('market-day-map')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
      // Clearing first lets the same booth be chosen again.
      setLocateId(undefined);
      requestAnimationFrame(() => setLocateId(id));
    };
    document.addEventListener('click', find);
    return () => document.removeEventListener('click', find);
  }, [map]);
  // The vendors page's booth links arrive as `?booth=<elementId>`.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('booth');
    if (!id || !map?.spaces.some((s) => s.elementId === id)) return;
    document
      .getElementById('market-day-map')
      ?.scrollIntoView({ block: 'start' });
    const frame = requestAnimationFrame(() => setLocateId(id));
    return () => cancelAnimationFrame(frame);
  }, [map]);
  useEffect(() => {
    let epoch = 0,
      active = true,
      reading = false;
    let controller: AbortController | undefined;
    const initial = signature(state);
    const clear = () => {
      controller?.abort();
      epoch++;
      setPersonal(undefined);
      setUnavailable(false);
    };
    const privateRead = async () => {
      if (!occurrence || document.hidden) return;
      controller = new AbortController();
      const requestEpoch = epoch;
      try {
        const response = await fetch(
          `/api/market-day?occurrence=${occurrence.id}`,
          {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal,
          },
        );
        if (!active || requestEpoch !== epoch || document.hidden) return;
        if (response.status === 401) {
          setPersonal(undefined);
          return;
        }
        if (!response.ok) throw new Error('unavailable');
        const data: MarketDayPersonal = await response.json();
        if (active && requestEpoch === epoch && !document.hidden)
          setPersonal(data);
      } catch {
        if (active && requestEpoch === epoch) setUnavailable(true);
      }
    };
    const publicRead = async () => {
      if (reading || document.hidden) return;
      reading = true;
      try {
        const response = await fetch('/api/market-day', {
          cache: 'no-store',
          credentials: 'omit',
        });
        if (!response.ok) return;
        const next: MarketDayPublicState = await response.json();
        if (!active || document.hidden) return;
        const current =
          occurrence && next.occurrences.find((o) => o.id === occurrence.id);
        if (occurrence && !current) {
          location.replace('/');
          return;
        }
        if (signature(next) !== initial) {
          location.reload();
          return;
        }
        setClock({
          serverNow: next.serverNow,
          receivedAt: Date.now(),
          now: Date.now(),
        });
      } finally {
        reading = false;
      }
    };
    const enter = () => {
      clear();
      if (!document.hidden) {
        void publicRead().catch(() => {});
        void privateRead();
      }
    };
    const visibility = () => {
      if (document.hidden) clear();
      else enter();
    };
    const interval = setInterval(() => {
      void publicRead().catch(() => {});
    }, 30000);
    const timer = occurrence
      ? setInterval(() => {
          setClock((c) => ({ ...c, now: Date.now() }));
        }, 1000)
      : undefined;
    window.addEventListener('focus', enter);
    window.addEventListener('blur', clear);
    window.addEventListener('pageshow', enter);
    window.addEventListener('pagehide', clear);
    document.addEventListener('visibilitychange', visibility);
    enter();
    return () => {
      active = false;
      epoch++;
      clearInterval(interval);
      clearInterval(timer);
      window.removeEventListener('focus', enter);
      window.removeEventListener('blur', clear);
      window.removeEventListener('pageshow', enter);
      window.removeEventListener('pagehide', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [state, occurrence]);
  useEffect(() => {
    const follows = new Set(personal?.followedVendorIds ?? []);
    document
      .querySelectorAll<HTMLElement>('[data-market-day-follow]')
      .forEach((el) => {
        el.hidden = !follows.has(el.dataset.marketDayFollow!);
      });
    return () => {
      document
        .querySelectorAll<HTMLElement>('[data-market-day-follow]')
        .forEach((el) => {
          el.hidden = true;
        });
    };
  }, [personal]);
  const cutoff =
    occurrence &&
    marketDayRemaining(
      occurrence.cutoffAt,
      clock.serverNow,
      clock.receivedAt,
      clock.now,
    );
  useEffect(() => {
    if (cutoff === 0) location.replace('/');
  }, [cutoff]);
  if (!occurrence) return null;
  const overlays = followedBoothOverlays(
    map ?? null,
    personal?.followedVendorIds ?? [],
  );
  // The hours countdown and the jump links live in the SSR hero
  // (`MarketDayCountdown`); this island keeps pickups and the map.
  return (
    <>
      <section
        id="market-day-map"
        className="harvest-section"
        aria-labelledby="market-day-map-title"
      >
        <SectionHeader
          title="Market map"
          id="market-day-map-title"
          variant="consumer"
        />
        {personal && (
          <p>
            Dashed outlines and Following labels mark published booths for
            vendors you follow. Your order pickup locations appear only on your
            order cards.
          </p>
        )}
        {map ? (
          <>
            <p>{map.publicInstructions}</p>
            <MarketMap
              key={`${occurrence.id}:${personal?.customerId ?? 'public'}`}
              definition={map.definition}
              spaces={map.spaces}
              overlays={overlays}
              highlightedIds={Object.keys(overlays)}
              showBoothList={false}
              locateId={locateId}
              onLocated={clearLocate}
              renderHoverCard={
                boothVendors
                  ? (space) => (
                      <BoothVendorCard
                        space={space}
                        vendor={boothVendor(space, boothVendors)}
                      />
                    )
                  : undefined
              }
            />
          </>
        ) : (
          <p>
            No map is published for this date. You can still use the directory
            and your pickups.
          </p>
        )}
      </section>
      <section
        className="market-day-pickups-section"
        aria-labelledby="market-day-pickups"
      >
        <h2 id="market-day-pickups">Your pickups</h2>
        {unavailable ? (
          <Alert severity="warning">
            Your pickups and followed vendors are unavailable. Refocus this page
            to retry.
          </Alert>
        ) : personal ? (
          personal.pickups.length ? (
            <div className="market-day-pickups">
              {personal.pickups.map((pickup, index) => (
                <Card key={`${pickup.orderId}:${pickup.vendorId}:${index}`}>
                  <h3>{pickup.vendorName}</h3>
                  <p>Order {pickup.reference}</p>
                  <p>{pickupStatus(pickup.status).label}</p>
                  <p>{pickup.venue || 'Pickup location not provided.'}</p>
                  {pickup.instructions && (
                    <p className="market-day-instructions">
                      {pickup.instructions}
                    </p>
                  )}
                  <a
                    href={`/account/orders/${encodeURIComponent(pickup.orderId)}`}
                  >
                    View order details
                  </a>
                </Card>
              ))}
            </div>
          ) : (
            <p>You have no pickup orders for this market date.</p>
          )
        ) : (
          <p>
            <a
              className="market-day-sign-in"
              href={`/account/login?returnTo=${encodeURIComponent('/?marketDay=' + occurrence.id)}`}
            >
              Sign in
            </a>{' '}
            to see your pickups and vendors you follow.
          </p>
        )}
      </section>
    </>
  );
}
