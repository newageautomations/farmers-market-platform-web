/** Progressive enhancement: content is visible until an observer is installed. */
export function mountFarmhouseScrollFade() {
  if (
    document.documentElement.dataset.scrollFade !== 'true' ||
    document.documentElement.dataset.editorPreview ||
    !('IntersectionObserver' in window)
  )
    return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.farmhouse-home > section:not(.farmhouse-cinematic), .farmhouse-space:not(.farmhouse-shop-pickup), .farmhouse-story-spread, .farmhouse-find-feature, .farmhouse-find-dates > section, .farmhouse-questions > details, .farmhouse-policy-list > section, .farmhouse-contact-composition, .farmhouse-content > .farmhouse-invitation, .farmhouse-footer-inner',
    ),
  );
  const targets = candidates.filter(
    (element) =>
      !candidates.some(
        (parent) => parent !== element && parent.contains(element),
      ),
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.removeAttribute('data-fade-pending');
          observer.unobserve(entry.target);
        }
    },
    // Start when the section reaches 80% of the viewport, so its entrance is visible.
    // Pixel margins avoid IntersectionObserver's width-relative percentage margins.
    {
      threshold: 0,
      rootMargin: `0px 0px -${Math.round(window.innerHeight * 0.2)}px 0px`,
    },
  );
  const revealAll = () => {
    targets.forEach((target) => target.removeAttribute('data-fade-pending'));
    observer.disconnect();
  };
  motion.addEventListener('change', (event) => {
    if (event.matches) revealAll();
  });
  // Keyboard focus and in-page navigation must never land on invisible content.
  document.addEventListener('focusin', (event) => {
    targets
      .filter((target) => target.contains(event.target as Node))
      .forEach((target) => {
        target.removeAttribute('data-fade-pending');
        observer.unobserve(target);
      });
  });
  for (const target of targets) {
    if (target.getBoundingClientRect().top < window.innerHeight) continue;
    target.setAttribute('data-fade-target', '');
    target.setAttribute('data-fade-pending', '');
    observer.observe(target);
  }
}
