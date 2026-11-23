/** Keep the controls mounted while replacing the server-rendered market results. */
export function installMarketShopFilters(shop: HTMLElement) {
  const form = shop.querySelector<HTMLFormElement>(
    '[data-market-shop-filters]',
  );
  const modes = shop.querySelector<HTMLElement>('[data-market-shop-modes]');
  const clear = shop.querySelector<HTMLAnchorElement>(
    '[data-market-shop-clear]',
  );
  const sort = shop.querySelector<HTMLSelectElement>(
    '[data-market-shop-sort] select',
  );
  const status = shop.querySelector<HTMLElement>('[data-market-shop-status]');
  const count = shop.querySelector<HTMLElement>('[data-market-shop-count]');
  const initialResults = shop.querySelector<HTMLElement>(
    '[data-market-shop-results]',
  );
  if (
    !form ||
    !modes ||
    !clear ||
    !sort ||
    !status ||
    !count ||
    !initialResults
  )
    return;

  const choices = Array.from(
    form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  );
  const panels = Array.from(
    form.querySelectorAll<HTMLFieldSetElement>('[data-market-shop-options]'),
  );
  const links = Array.from(
    modes.querySelectorAll<HTMLAnchorElement>('[data-market-shop-mode]'),
  );
  let applied = new URLSearchParams(form.dataset.query);
  let requested = applied;
  let pending: AbortController | undefined;
  let results = initialResults;

  function withoutSelections(query: URLSearchParams, mode: string) {
    const next = new URLSearchParams(query);
    next.set('filter', mode);
    next.delete('category');
    next.delete('vendor');
    next.delete('page');
    return next;
  }

  const renderControls = (query: URLSearchParams) => {
    const mode = query.get('filter') ?? 'category';
    const selected = query.getAll(mode);
    for (const panel of panels) {
      panel.hidden = panel.dataset.marketShopOptions !== mode;
      panel.disabled = panel.hidden;
    }
    for (const choice of choices)
      choice.checked = choice.name === mode && selected.includes(choice.value);
    for (const link of links) {
      const target = link.dataset.marketShopMode ?? 'category';
      const active = target === mode;
      link.className =
        (active ? modes.dataset.activeClass : modes.dataset.inactiveClass) ??
        '';
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      link.href = `${form.action}?${active ? query : withoutSelections(query, target)}`;
    }
    clear.hidden = selected.length === 0;
    clear.href = `${form.action}?${withoutSelections(query, mode)}`;
    sort.value = query.get('sort') ?? 'NAME_ASC';
  };

  const update = async (next: URLSearchParams, paging = false) => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    requested = next;
    renderControls(next);
    results.setAttribute('aria-busy', 'true');
    status.className = 'sr-only';
    status.textContent = 'Updating products…';
    try {
      const url = new URL(form.action);
      url.search = next.toString();
      const response = await fetch(url, {
        headers: { 'x-market-shop-results': '1' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Market shop request failed');
      const html = await response.text();
      if (controller.signal.aborted) return;
      const rendered = new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector<HTMLElement>('[data-market-shop-results]');
      if (!rendered) throw new Error('Market shop results missing');

      const replacement = document.importNode(rendered, true);
      results.replaceWith(replacement);
      results = replacement;
      applied = next;
      count.textContent = replacement.dataset.count ?? '';
      for (const heading of shop.querySelectorAll('[data-market-shop-heading]'))
        heading.textContent = replacement.dataset.heading ?? '';
      if (paging) {
        count.focus({ preventScroll: true });
        count.scrollIntoView({ block: 'nearest' });
        status.textContent = '';
      } else {
        status.textContent = count.textContent;
      }
    } catch {
      if (controller.signal.aborted) return;
      requested = applied;
      renderControls(applied);
      status.className = 'ui-alert ui-alert-error';
      status.textContent = 'Products could not be updated. Please try again.';
    } finally {
      if (pending === controller) {
        pending = undefined;
        results.removeAttribute('aria-busy');
      }
    }
  };

  form.addEventListener('change', (event) => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.type !== 'checkbox'
    )
      return;
    const mode = requested.get('filter') ?? 'category';
    const next = withoutSelections(requested, mode);
    for (const choice of choices)
      if (choice.checked && choice.name === mode)
        next.append(mode, choice.value);
    void update(next);
  });

  sort.addEventListener('change', () => {
    const next = new URLSearchParams(requested);
    next.set('sort', sort.value);
    next.delete('page');
    void update(next);
  });
  sort.form?.addEventListener('submit', (event) => event.preventDefault());

  shop.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    )
      return;
    const link = event.target.closest<HTMLAnchorElement>(
      '[data-market-shop-mode], [data-market-shop-clear], [data-market-shop-page]',
    );
    if (!link) return;
    event.preventDefault();
    const mode = requested.get('filter') ?? 'category';
    const target = link.dataset.marketShopMode;
    if (target) {
      if (target !== mode) void update(withoutSelections(requested, target));
    } else if (link === clear) {
      const returnFocus = document.activeElement === clear;
      void update(withoutSelections(requested, mode));
      if (returnFocus)
        links.find((item) => item.dataset.marketShopMode === mode)?.focus();
    } else if (!pending && link.dataset.marketShopPage) {
      const next = new URLSearchParams(requested);
      next.set('page', link.dataset.marketShopPage);
      void update(next, true);
    }
  });
}
