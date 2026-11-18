/**
 * Behaviour shared by the Meadow and Hearth site headers: the mobile menu
 * disclosure, a scrolled state, and a brief cart highlight when the shared
 * cart events report a change. Presentation stays in each theme's styles.
 */
export function mountMarketThemeHeader() {
  for (const menu of document.querySelectorAll<HTMLDetailsElement>(
    '[data-theme-menu]',
  )) {
    const summary = menu.querySelector('summary');
    summary?.setAttribute('aria-expanded', 'false');
    menu.addEventListener('toggle', () => {
      summary?.setAttribute('aria-expanded', String(menu.open));
      summary?.setAttribute(
        'aria-label',
        menu.open ? 'Close navigation menu' : 'Open navigation menu',
      );
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        summary?.focus();
      }
    });
    menu.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a'))
        menu.open = false;
    });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !menu.contains(event.target))
        menu.open = false;
    });
  }
  for (const header of document.querySelectorAll<HTMLElement>(
    '[data-theme-header]',
  )) {
    const shade = () =>
      header.toggleAttribute('data-scrolled', window.scrollY > 8);
    shade();
    window.addEventListener('scroll', shade, { passive: true });
    const cart = header.querySelector<HTMLElement>('[data-theme-cart]');
    window.addEventListener('market-cart-updated', () => {
      if (!cart) return;
      cart.removeAttribute('data-bump');
      void cart.offsetWidth;
      cart.setAttribute('data-bump', '');
    });
  }
}
