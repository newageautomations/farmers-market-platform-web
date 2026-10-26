/** Keep the real SSR catalog and commerce islands while replacing only its results. */
export function mountFarmhouseShop(root: HTMLElement) {
  if (document.documentElement.dataset.editorPreview === 'true')
    return () => {};
  const status = root.querySelector<HTMLElement>('[data-catalog-status]');
  let request: AbortController | undefined;
  const catalog = () =>
    root.querySelector<HTMLElement>('[data-farmhouse-catalog]');
  function position() {
    const section =
      root.querySelector<HTMLElement>('#farmhouse-catalog') ?? catalog();
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  async function load(url: URL, push = true, focusId?: string) {
    if (url.origin !== window.location.origin || url.pathname !== '/products')
      return;
    request?.abort();
    const active = new AbortController();
    request = active;
    catalog()?.setAttribute('aria-busy', 'true');
    if (status) status.textContent = 'Updating products…';
    try {
      const response = await fetch(url.pathname + url.search, {
        signal: active.signal,
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Catalog unavailable');
      const page = new DOMParser().parseFromString(
        await response.text(),
        'text/html',
      );
      const next = page.querySelector<HTMLElement>('[data-farmhouse-catalog]');
      if (!next || active.signal.aborted)
        throw new Error('Catalog unavailable');
      const current = catalog();
      if (!current) return;
      // Astro's React adapter listens for this event to dispose removed islands.
      current.querySelectorAll('astro-island').forEach((island) => {
        island.dispatchEvent(new CustomEvent('astro:unmount'));
      });
      current.replaceWith(document.importNode(next, true));
      // Complete Astro's disconnected-island cleanup after the bounded swap.
      document.dispatchEvent(new Event('astro:after-swap'));
      if (push)
        window.history.pushState(
          null,
          '',
          url.pathname + url.search + '#farmhouse-catalog',
        );
      position();
      if (focusId)
        document.getElementById(focusId)?.focus({ preventScroll: true });
      if (status) status.textContent = 'Products updated.';
    } catch {
      if (active.signal.aborted) return;
      const sort = root.querySelector<HTMLSelectElement>(
        '[data-catalog-sort] select',
      );
      if (sort)
        sort.value =
          new URL(window.location.href).searchParams.get('sort') === 'name'
            ? 'name'
            : 'default';
      if (status) {
        status.textContent = 'Products could not be updated. Please try again.';
      }
      // Keep the current view and address consistent on a failed history restore.
      if (!push) window.location.reload();
    } finally {
      if (request === active) catalog()?.removeAttribute('aria-busy');
    }
  }
  function click(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      'a[data-catalog-link]',
    );
    if (
      !link ||
      !root.contains(link) ||
      link.target ||
      link.hasAttribute('download')
    )
      return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.pathname !== '/products')
      return;
    event.preventDefault();
    void load(url);
  }
  function sort(event: Event) {
    const select = event.target;
    if (
      !(select instanceof HTMLSelectElement) ||
      !select.closest('[data-catalog-sort]')
    )
      return;
    const url = new URL(window.location.href);
    url.searchParams.set('sort', select.value);
    url.searchParams.delete('page');
    void load(url, true, select.id);
  }
  function submit(event: SubmitEvent) {
    if (
      !(event.target instanceof HTMLFormElement) ||
      !event.target.matches('[data-catalog-sort]')
    )
      return;
    event.preventDefault();
    const select = event.target.querySelector('select');
    select?.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const pop = () => void load(new URL(window.location.href), false);
  root.addEventListener('click', click);
  root.addEventListener('change', sort);
  root.addEventListener('submit', submit);
  window.addEventListener('popstate', pop);
  if (window.location.hash === '#farmhouse-catalog') {
    // Wait for the shared masthead to measure itself before applying its offset.
    window.requestAnimationFrame(position);
  }
  return () => {
    request?.abort();
    root.removeEventListener('click', click);
    root.removeEventListener('change', sort);
    root.removeEventListener('submit', submit);
    window.removeEventListener('popstate', pop);
  };
}
