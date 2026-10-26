/** Native finite scrolling. No clones, wraparound, autoplay or commerce operations. */
export function mountFarmhouseCarousel(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const previous = root.querySelector<HTMLButtonElement>(
    '[data-carousel-direction="previous"]',
  );
  const next = root.querySelector<HTMLButtonElement>(
    '[data-carousel-direction="next"]',
  );
  if (!track || !previous || !next) return;
  const update = () => {
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    previous.hidden = track.scrollLeft <= 2;
    next.hidden = maximum - track.scrollLeft <= 2;
    if (
      (previous.hidden && document.activeElement === previous) ||
      (next.hidden && document.activeElement === next)
    )
      track.focus({ preventScroll: true });
  };
  const move = (direction: number) => {
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    track.scrollTo({
      left: Math.max(
        0,
        Math.min(maximum, track.scrollLeft + direction * track.clientWidth),
      ),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };
  const back = () => move(-1),
    forward = () => move(1);
  const keyboard = (event: KeyboardEvent) => {
    if (
      event.target !== track ||
      !['ArrowLeft', 'ArrowRight'].includes(event.key)
    )
      return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  };
  previous.addEventListener('click', back);
  next.addEventListener('click', forward);
  track.addEventListener('scroll', update, { passive: true });
  track.addEventListener('keydown', keyboard);
  const observer = new ResizeObserver(update);
  observer.observe(track);
  Array.from(track.children).forEach((child) => observer.observe(child));
  update();
  return () => {
    observer.disconnect();
    previous.removeEventListener('click', back);
    next.removeEventListener('click', forward);
    track.removeEventListener('scroll', update);
    track.removeEventListener('keydown', keyboard);
  };
}
