/** Anchors are the actual slide starts, capped at the last full viewport. */
export function galleryStops(offsets: number[], maximum: number): number[] {
  return [
    ...new Set(offsets.map((offset) => Math.max(0, Math.min(offset, maximum)))),
  ];
}
export function nextGalleryIndex(
  current: number,
  direction: number,
  count: number,
): number {
  return Math.max(0, Math.min(current + direction, count - 1));
}
let installed = false;
export function installGalleryCarousel() {
  if (installed) return;
  installed = true;
  const states = new WeakMap<HTMLElement, { index: number; moving: boolean }>();
  function geometry(track: HTMLElement) {
    const start = track.getBoundingClientRect().left;
    return galleryStops(
      Array.from(track.children).map(
        (child) =>
          child.getBoundingClientRect().left - start + track.scrollLeft,
      ),
      Math.max(0, track.scrollWidth - track.clientWidth),
    );
  }
  function update(track: HTMLElement, index: number, stops: number[]) {
    for (const button of track
      .closest('[data-harvest-carousel]')!
      .querySelectorAll<HTMLButtonElement>('[data-gallery-direction]'))
      button.disabled =
        stops.length <= 1 ||
        (Number(button.dataset.galleryDirection) < 0
          ? index === 0
          : index === stops.length - 1);
  }
  function initialize(track: HTMLElement) {
    if (states.has(track)) return;
    if (track.classList.contains('catalog-grid')) track.tabIndex = 0;
    const state = { index: 0, moving: false };
    states.set(track, state);
    const settle = () => {
      const stops = geometry(track);
      state.index = stops.reduce(
        (best, left, index) =>
          Math.abs(left - track.scrollLeft) <
          Math.abs(stops[best]! - track.scrollLeft)
            ? index
            : best,
        0,
      );
      state.moving = false;
      update(track, state.index, stops);
    };
    track.addEventListener('scrollend', settle);
    const resize = new ResizeObserver(() => {
      const stops = geometry(track);
      state.index = Math.min(state.index, Math.max(0, stops.length - 1));
      track.scrollTo({ left: stops[state.index] ?? 0, behavior: 'instant' });
      state.moving = false;
      update(track, state.index, stops);
    });
    resize.observe(track);
    update(track, 0, geometry(track));
  }
  for (const track of document.querySelectorAll<HTMLElement>(
    '[data-harvest-carousel] [data-carousel-track], [data-harvest-carousel] .catalog-grid',
  ))
    initialize(track);
  document.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-gallery-direction]')
        : null;
    if (!button || button.disabled) return;
    const track = button
      .closest('[data-harvest-carousel]')
      ?.querySelector<HTMLElement>('[data-carousel-track], .catalog-grid');
    if (!track) return;
    initialize(track);
    const state = states.get(track)!;
    const stops = geometry(track);
    if (!state.moving)
      state.index = stops.reduce(
        (best, left, index) =>
          Math.abs(left - track.scrollLeft) <
          Math.abs(stops[best]! - track.scrollLeft)
            ? index
            : best,
        0,
      );
    state.index = nextGalleryIndex(
      state.index,
      Number(button.dataset.galleryDirection),
      stops.length,
    );
    state.moving = true;
    track.scrollTo({
      left: stops[state.index] ?? 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
    update(track, state.index, stops);
  });
}
