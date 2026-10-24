/** Controller for the real SSR gallery. Native thumbnail buttons retain keyboard behavior. */
export function mountProductGallery(gallery: HTMLElement) {
  const main = gallery.querySelector<HTMLImageElement>('[data-gallery-main]');
  let fallback: HTMLDivElement | undefined;
  function clearError() {
    if (main) main.hidden = false;
    fallback?.remove();
    fallback = undefined;
  }
  function showError() {
    if (!main) return;
    main.hidden = true;
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.className = 'product-media product-placeholder';
      fallback.textContent = 'Image unavailable';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', `${main.alt}: image unavailable`);
      main.after(fallback);
    }
  }
  main?.addEventListener('error', showError);
  main?.addEventListener('load', clearError);
  if (main?.complete && main.naturalWidth === 0) showError();
  const buttons = [
    ...gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-id]'),
  ];
  function select(button: HTMLButtonElement) {
    if (!main) return;
    clearError();
    main.src = button.dataset.gallerySrc!;
    main.alt = button.dataset.galleryAlt!;
    buttons.forEach((b) =>
      b.setAttribute('aria-pressed', String(b === button)),
    );
  }
  const click = (event: Event) =>
    select(event.currentTarget as HTMLButtonElement);
  const variant = (event: Event) => {
    const button = buttons.find(
      (b) => b.dataset.galleryId === (event as CustomEvent<string>).detail,
    );
    if (button) select(button);
  };
  buttons.forEach((button) => button.addEventListener('click', click));
  window.addEventListener('product-variant-image', variant);
  return () => {
    main?.removeEventListener('error', showError);
    main?.removeEventListener('load', clearError);
    buttons.forEach((button) => button.removeEventListener('click', click));
    window.removeEventListener('product-variant-image', variant);
  };
}
