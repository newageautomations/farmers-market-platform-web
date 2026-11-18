/**
 * Row selection for server-rendered workspace tables, matching the vendor
 * Applications/Upcoming Dates presentation: choosing a row shows its details
 * in the side panel. Every row's details are rendered on the server and the
 * row name is a real `?param=` link, so selection also works without
 * JavaScript; with it, selection skips the reload and the URL is replaced.
 */
export function installRowSelection(root: HTMLElement) {
  const param = root.dataset.selectParam ?? 'selected';
  const rows = [...root.querySelectorAll<HTMLElement>('[data-select-row]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-select-panel]')];
  const live = root.querySelector<HTMLElement>('[data-select-live]');
  function select(key: string, focusPanel = false) {
    for (const row of rows) {
      const current = row.dataset.selectRow === key;
      row.classList.toggle('market-application-selected', current);
      row.setAttribute('aria-selected', String(current));
    }
    let shown: HTMLElement | undefined;
    for (const panel of panels) {
      const current = panel.dataset.selectPanel === key;
      panel.hidden = !current;
      if (current) shown = panel;
    }
    if (shown) {
      // Restart the fade so the change is visible, as in the vendor panel.
      shown.classList.remove('customer-panel-enter');
      void shown.offsetWidth;
      shown.classList.add('customer-panel-enter');
      if (live)
        live.textContent = `Showing ${shown.dataset.selectLabel ?? 'details'}.`;
      if (focusPanel && window.matchMedia('(max-width: 1080px)').matches)
        shown.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const url = new URL(window.location.href);
    url.searchParams.set(param, key);
    window.history.replaceState(window.history.state, '', url);
  }
  for (const row of rows) {
    const key = row.dataset.selectRow!;
    row.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      // Real links other than the row's own selection link keep navigating.
      if (link && !link.hasAttribute('data-select-link')) return;
      if (
        link &&
        (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      )
        return;
      if (target.closest('button, form, input, select, textarea')) return;
      event.preventDefault();
      select(key, true);
    });
    row.addEventListener('keydown', (event) => {
      if (event.target !== row) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(key, true);
      }
    });
  }
}
