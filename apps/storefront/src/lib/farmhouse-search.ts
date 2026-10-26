type Suggestion = { name: string; href: string };

/** Native Astro adapter for the shared SEL-07 popup and active-option contract.
 * Real anchors preserve ordinary navigation and the editor's capture-phase bridge. */
export function mountFarmhouseSearch(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]');
  const popup = root.querySelector<HTMLElement>('[role="listbox"]');
  const status = root.querySelector<HTMLElement>('[data-search-status]');
  if (!input || !popup || !status) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: AbortController | undefined;
  let revision = 0;
  let active = -1;
  let links: HTMLAnchorElement[] = [];
  function close() {
    clearTimeout(timer);
    pending?.abort();
    revision++;
    popup!.hidden = true;
    popup!.classList.remove('is-open');
    input!.setAttribute('aria-expanded', 'false');
    input!.removeAttribute('aria-activedescendant');
    input!.removeAttribute('aria-busy');
    active = -1;
  }
  function highlight(index: number) {
    active = index;
    links.forEach((link, i) => {
      link.classList.toggle('is-active', i === active);
      link.setAttribute('aria-selected', String(i === active));
    });
    if (links[active]) {
      input!.setAttribute('aria-activedescendant', links[active]!.id);
      links[active]!.scrollIntoView?.({ block: 'nearest' });
    } else input!.removeAttribute('aria-activedescendant');
  }
  function show(items: Suggestion[], message?: string) {
    popup!.replaceChildren();
    links = items.map((item, index) => {
      const link = document.createElement('a');
      link.id = popup!.id + '-' + index;
      link.href = item.href;
      link.textContent = item.name;
      link.tabIndex = -1;
      link.setAttribute('role', 'option');
      link.setAttribute('aria-selected', 'false');
      link.addEventListener('pointermove', () => highlight(index));
      popup!.append(link);
      return link;
    });
    highlight(-1);
    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = message ?? 'No products found.';
      popup!.append(empty);
    }
    status!.textContent =
      message ??
      (items.length
        ? items.length + ' matching products.'
        : 'No products found.');
    popup!.hidden = false;
    popup!.classList.add('is-open');
    input!.setAttribute('aria-expanded', 'true');
  }
  function search() {
    close();
    const query = input!.value.trim().slice(0, 100);
    status!.textContent = '';
    input!.removeAttribute('aria-busy');
    if (!query) return;
    const current = revision;
    timer = setTimeout(async () => {
      pending = new AbortController();
      input!.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(
          '/api/product-search?q=' + encodeURIComponent(query),
          { signal: pending.signal },
        );
        if (!response.ok) throw new Error('Search unavailable');
        const data = (await response.json()) as { items: Suggestion[] };
        if (current !== revision) return;
        // Only accept local product paths, even if a response is malformed.
        show(
          data.items
            .filter(
              (item) =>
                typeof item.name === 'string' &&
                /^\/products\/[a-zA-Z0-9_%~-]+$/.test(item.href),
            )
            .slice(0, 8),
        );
      } catch {
        if (current === revision)
          show(
            [],
            'Search is temporarily unavailable. Press Enter to search the shop.',
          );
      } finally {
        if (current === revision) input!.removeAttribute('aria-busy');
      }
    }, 150);
  }
  input.addEventListener('input', search);
  input.addEventListener('focus', search);
  input.addEventListener('click', () => {
    if (popup.hidden && input.value.trim()) search();
  });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (
      !popup.hidden &&
      links.length &&
      ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
    ) {
      event.preventDefault();
      highlight(
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? links.length - 1
            : Math.max(
                0,
                Math.min(
                  links.length - 1,
                  active + (event.key === 'ArrowDown' ? 1 : -1),
                ),
              ),
      );
    } else if (event.key === 'Enter' && !popup.hidden && active >= 0) {
      event.preventDefault();
      links[active]?.click();
      close();
    }
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) close();
  });
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!root.contains(event.target as Node)) close();
    },
    { passive: true },
  );
}
