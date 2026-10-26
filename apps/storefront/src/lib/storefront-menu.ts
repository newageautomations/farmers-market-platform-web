/** Native disclosure navigation: usable without JS, Escape and outside dismissal with JS. */
export function mountStorefrontMenu(menu: HTMLDetailsElement) {
  const summary = menu.querySelector('summary');
  const update = () => {
    summary?.setAttribute('aria-expanded', String(menu.open));
    summary?.setAttribute(
      'aria-label',
      menu.open ? 'Close navigation menu' : 'Open navigation menu',
    );
  };
  update();
  menu.addEventListener('toggle', update);
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      summary?.focus();
    }
  });
  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      menu.open = false;
      summary?.focus();
    }
  });
  const outside = (event: Event) => {
    if (event.target instanceof Node && !menu.contains(event.target))
      menu.open = false;
  };
  document.addEventListener('click', outside);
  document.addEventListener('focusin', outside);
}
