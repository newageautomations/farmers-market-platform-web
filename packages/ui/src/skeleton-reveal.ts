/**
 * LOD-01 loaded-content reveal. When a skeleton leaves the page, the content
 * that replaces it in the same render fades in. Rows, list items and grid
 * cards settle in from just above, one after another from the top, so tables
 * and lists fill top to bottom. Presentation only: no data, focus or request
 * state is touched.
 *
 * The watch lasts two animation frames and only tags elements React inserted
 * in that window. Elements that already run their own animation, dialog
 * content and other skeletons are left alone. Reduced motion, and runtimes
 * without `matchMedia` (server rendering, jsdom), skip it entirely.
 */
const STAGGER_LIMIT = 12;
const ITEM_SELECTOR = 'tbody > tr, ul > li, ol > li';

function animated(element: Element) {
  const name = getComputedStyle(element).animationName;
  return !!name && name !== 'none';
}

function skip(element: Element) {
  return (
    !element.isConnected ||
    element.classList.contains('ui-reveal') ||
    element.classList.contains('ui-reveal-item') ||
    !!element.closest(
      '.ui-skeleton-layout, .ui-skeleton-inline, dialog, [data-page-loading]',
    ) ||
    animated(element)
  );
}

function stagger(items: readonly Element[]) {
  let order = 0;
  for (const item of items) {
    if (!(item instanceof HTMLElement) || skip(item)) continue;
    item.style.setProperty(
      '--ui-reveal-order',
      String(Math.min(order++, STAGGER_LIMIT)),
    );
    item.classList.add('ui-reveal-item');
  }
}

function reveal(nodes: readonly Node[], root: Element) {
  const elements: Element[] = [];
  for (const node of nodes) {
    // Text that replaced an inline skeleton fades with its parent element.
    const element =
      node instanceof Element
        ? node
        : node.parentElement && node.parentElement !== root
          ? node.parentElement
          : null;
    if (!element || elements.includes(element)) continue;
    elements.push(element);
  }
  const top = elements.filter(
    (element) =>
      !elements.some((other) => other !== element && other.contains(element)),
  );
  const rows = top.filter((element) => element.matches('tr, li'));
  stagger(rows);
  for (const element of top) {
    if (rows.includes(element) || skip(element)) continue;
    element.classList.add('ui-reveal');
    const items = [...element.querySelectorAll(ITEM_SELECTOR)];
    if (items.length > 1) stagger(items);
    else if (
      getComputedStyle(element).display === 'grid' &&
      element.children.length > 1
    )
      stagger([...element.children]);
  }
}

function motionAllowed() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Fades in a whole page that finished its first load (`PageLoad`). Each
 * table body and list fills from its first row down.
 */
export function revealLoadedPage(page: HTMLElement | null) {
  if (!page || !motionAllowed()) return;
  page.classList.remove('ui-reveal');
  void page.offsetWidth;
  page.classList.add('ui-reveal');
  for (const group of page.querySelectorAll('tbody, ul, ol')) {
    if (group.closest('dialog, nav')) continue;
    stagger([...group.children]);
  }
}

export function revealContentAfterSkeleton(scope: Element | null | undefined) {
  if (typeof MutationObserver === 'undefined' || !motionAllowed()) return;
  const root = scope?.isConnected ? scope : document.body;
  const observer = new MutationObserver((records) => {
    const added: Node[] = [];
    for (const record of records) added.push(...record.addedNodes);
    if (added.length) reveal(added, root);
  });
  observer.observe(root, { childList: true, subtree: true });
  const frame =
    window.requestAnimationFrame?.bind(window) ??
    ((callback: () => void) => window.setTimeout(callback, 16));
  frame(() => frame(() => observer.disconnect()));
}
