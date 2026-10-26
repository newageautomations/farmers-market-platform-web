import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { mountFarmhouseShop } from '../apps/storefront/src/lib/farmhouse-shop';

let cleanup: (() => void) | undefined;
let scroll: ReturnType<typeof vi.fn>;
function markup(name = 'Original products') {
  return `<section tabindex="-1" data-farmhouse-catalog>
    <nav><a data-catalog-link href="/products?category=fruit&sort=default&occurrence=7#farmhouse-catalog">Fruit</a>
    <a data-catalog-link href="/products?page=2&sort=default&occurrence=7#farmhouse-catalog">Next</a></nav>
    <form data-catalog-sort><select id="farmhouse-sort" name="sort"><option value="default">Default</option><option value="name">Name A to Z</option></select></form>
    <article>${name}</article><astro-island></astro-island></section>`;
}
function setup() {
  document.body.innerHTML = `<div data-fixed-header>Header</div><article class="farmhouse-shop"><header>Hero</header><div id="farmhouse-catalog" tabindex="-1" data-pickup>Pickup</div>${markup()}<p data-catalog-status role="status"></p></article>`;
  const root = document.querySelector<HTMLElement>('.farmhouse-shop')!;
  cleanup = mountFarmhouseShop(root);
  return root;
}
beforeEach(() => {
  window.history.replaceState(
    null,
    '',
    '/products?occurrence=7&search=apple&page=3',
  );
  scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scroll,
  });
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  delete document.documentElement.dataset.editorPreview;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

it('updates only the catalog for categories and paging, retaining the masthead, hero and market picker', async () => {
  const fetcher = vi.fn(
    async (_url: string) => new Response(markup('Fruit products')),
  );
  vi.stubGlobal('fetch', fetcher);
  const root = setup();
  const hero = root.querySelector('header');
  const pickup = root.querySelector('[data-pickup]');
  const header = document.querySelector('[data-fixed-header]');
  const unmount = vi.fn();
  root
    .querySelector('astro-island')!
    .addEventListener('astro:unmount', unmount);
  fireEvent.click(root.querySelector('a')!);
  await waitFor(() => expect(root.textContent).toContain('Fruit products'));
  expect(fetcher.mock.calls[0]![0]).toBe(
    '/products?category=fruit&sort=default&occurrence=7',
  );
  expect(root.querySelector('header')).toBe(hero);
  expect(root.querySelector('[data-pickup]')).toBe(pickup);
  expect(document.querySelector('[data-fixed-header]')).toBe(header);
  expect(unmount).toHaveBeenCalledOnce();
  expect(window.location.hash).toBe('#farmhouse-catalog');
  expect(document.activeElement?.id).toBe('farmhouse-catalog');
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  fireEvent.click(root.querySelectorAll('a')[1]!);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(fetcher.mock.calls[1]![0]).toContain('page=2');
});

it('sorts on change without submission, resets paging and preserves category, search and market', async () => {
  window.history.replaceState(
    null,
    '',
    '/products?category=fruit&occurrence=7&search=apple&page=3',
  );
  const fetcher = vi.fn(
    async (_url: string) => new Response(markup('Sorted products')),
  );
  vi.stubGlobal('fetch', fetcher);
  const root = setup();
  fireEvent.change(root.querySelector('select')!, {
    target: { value: 'name' },
  });
  await waitFor(() => expect(root.textContent).toContain('Sorted products'));
  const requested = new URL(
    fetcher.mock.calls[0]![0] as string,
    window.location.origin,
  );
  expect(Object.fromEntries(requested.searchParams)).toEqual({
    category: 'fruit',
    occurrence: '7',
    search: 'apple',
    sort: 'name',
  });
  expect(document.activeElement?.id).toBe('farmhouse-sort');
});

it('aborts superseded filters and ignores late responses', async () => {
  const replies: Array<(response: Response) => void> = [];
  const fetcher = vi.fn(
    (_url: string, _options: RequestInit) =>
      new Promise<Response>((done) => replies.push(done)),
  );
  vi.stubGlobal('fetch', fetcher);
  const root = setup();
  fireEvent.click(root.querySelector('a')!);
  fireEvent.click(root.querySelectorAll('a')[1]!);
  expect(fetcher.mock.calls[0]![1].signal?.aborted).toBe(true);
  replies[1]!(new Response(markup('Second request')));
  await waitFor(() => expect(root.textContent).toContain('Second request'));
  replies[0]!(new Response(markup('Stale request')));
  await waitFor(() =>
    expect(root.querySelector('[data-farmhouse-catalog]')).not.toHaveAttribute(
      'aria-busy',
    ),
  );
  expect(root.textContent).not.toContain('Stale request');
});

it('retains the previous view and URL with an actionable message after a failed catalog read', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('Unavailable', { status: 503 })),
  );
  const root = setup();
  const address = window.location.href;
  fireEvent.click(root.querySelector('a')!);
  await waitFor(() =>
    expect(root.querySelector('[data-catalog-status]')!.textContent).toContain(
      'Please try again',
    ),
  );
  expect(root.textContent).toContain('Original products');
  expect(window.location.href).toBe(address);
  expect(root.querySelector('[data-farmhouse-catalog]')).not.toHaveAttribute(
    'aria-busy',
  );
  fireEvent.change(root.querySelector('select')!, {
    target: { value: 'name' },
  });
  await waitFor(() =>
    expect(root.querySelector('select')!.value).toBe('default'),
  );
});

it('restores the catalog on history navigation without pushing a new entry', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(markup('Restored products'))),
  );
  const root = setup();
  const push = vi.spyOn(window.history, 'pushState');
  window.dispatchEvent(new PopStateEvent('popstate'));
  await waitFor(() => expect(root.textContent).toContain('Restored products'));
  expect(push).not.toHaveBeenCalled();
});

it('retains modifier-click behavior and disables enhancement inside the editor', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const root = setup();
  const modifier = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
  });
  root.querySelector('a')!.dispatchEvent(modifier);
  expect(modifier.defaultPrevented).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
  cleanup?.();
  document.documentElement.dataset.editorPreview = 'true';
  cleanup = mountFarmhouseShop(root);
  fireEvent.change(root.querySelector('select')!, {
    target: { value: 'name' },
  });
  expect(fetcher).not.toHaveBeenCalled();
});
