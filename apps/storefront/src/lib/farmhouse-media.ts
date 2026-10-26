/** Stable, accessible image failures within the version-two renderer only. */
export function mountFarmhouseMedia() {
  if (document.documentElement.dataset.templateVersion !== '2') return;
  const failed = (image: HTMLImageElement) => {
    if (image.hasAttribute('data-gallery-main') || image.hidden) return;
    const frame = image.parentElement;
    if (!frame || !image.closest('.farmhouse-site')) return;
    image.hidden = true;
    const message = document.createElement('span');
    message.className = 'farmhouse-image-unavailable';
    message.textContent = 'Photograph unavailable';
    message.setAttribute('role', 'img');
    message.setAttribute(
      'aria-label',
      image.alt
        ? `${image.alt}: photograph unavailable`
        : 'Photograph unavailable',
    );
    frame.append(message);
  };
  document.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLImageElement) failed(event.target);
    },
    true,
  );
  document
    .querySelectorAll<HTMLImageElement>('.farmhouse-site img')
    .forEach((image) => {
      if (image.complete && image.naturalWidth === 0) failed(image);
    });
}
