/** Find the preceding table in the nearest common container, keeping independently
 * paged tables and dialog tables scoped to their own navigation controls. */
export function scrollToPaginatedTable(control: HTMLElement) {
  for (
    let container = control.parentElement;
    container;
    container = container.parentElement
  ) {
    const tables = Array.from(
      container.querySelectorAll<HTMLElement>('.table-scroll'),
    );
    const target = tables
      .filter((table) =>
        Boolean(
          table.compareDocumentPosition(control) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      )
      .at(-1);
    if (target) {
      target.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      // React may replace the table while loading the next page. Restore the
      // position after that commit as well, including when a short page grows.
      const boundary = control.closest('dialog, main') ?? container;
      const label = target.getAttribute('aria-label');
      const observer = new MutationObserver(restore);
      const timeout = window.setTimeout(() => observer.disconnect(), 10000);
      function restore() {
        const replacement = target.isConnected
          ? target
          : Array.from(
              boundary.querySelectorAll<HTMLElement>('.table-scroll'),
            ).find((element) => element.getAttribute('aria-label') === label);
        if (!replacement) return;
        replacement.scrollIntoView?.({ block: 'start', behavior: 'instant' });
        observer.disconnect();
        window.clearTimeout(timeout);
      }
      observer.observe(boundary, { childList: true, subtree: true });
      window.requestAnimationFrame(restore);
      return;
    }
    if (container.matches('dialog, main')) return;
  }
}
