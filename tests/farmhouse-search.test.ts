import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { mountFarmhouseSearch } from '../apps/storefront/src/lib/farmhouse-search';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});
function setup() {
  document.body.innerHTML =
    '<form><input role="combobox" aria-expanded="false" aria-controls="matches"><div id="matches" role="listbox" hidden></div><p data-search-status role="status"></p></form>';
  const root = document.querySelector('form')!;
  const input = root.querySelector('input')!;
  const popup = root.querySelector<HTMLElement>('[role="listbox"]')!;
  mountFarmhouseSearch(root);
  return { root, input, popup };
}
it('debounces suggestions, renders literal names and supports keyboard selection through real links', async () => {
  const fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      items: [
        { name: 'Farm <Box>', href: '/products/farm-box' },
        { name: 'Unsafe destination', href: 'https://other.test/product' },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetcher);
  const { input, popup } = setup();
  fireEvent.input(input, { target: { value: 'B' } });
  fireEvent.input(input, { target: { value: 'Box' } });
  expect(fetcher).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(150);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledWith('/api/product-search?q=Box', {
    signal: expect.any(AbortSignal),
  });
  expect(input).toHaveAttribute('aria-expanded', 'true');
  const link = popup.querySelector('a')!;
  expect(link.textContent).toBe('Farm <Box>');
  expect(popup.querySelector('box')).toBeNull();
  expect(popup.querySelectorAll('[role="option"]')).toHaveLength(1);
  const activate = vi.fn((event: Event) => event.preventDefault());
  link.addEventListener('click', activate);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(input).toHaveAttribute('aria-activedescendant', link.id);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(activate).toHaveBeenCalledOnce();
  expect(popup.hidden).toBe(true);
});
it('does not reopen after Escape when an older response arrives, and clears empty queries', async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
  );
  const { input, popup } = setup();
  fireEvent.input(input, { target: { value: 'box' } });
  await vi.advanceTimersByTimeAsync(150);
  expect(input).toHaveAttribute('aria-busy', 'true');
  fireEvent.keyDown(input, { key: 'Escape' });
  resolve({
    ok: true,
    json: async () => ({ items: [{ name: 'Box', href: '/products/box' }] }),
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(popup.hidden).toBe(true);
  expect(input).not.toHaveAttribute('aria-busy');
  fireEvent.input(input, { target: { value: '' } });
  expect(input).toHaveAttribute('aria-expanded', 'false');
});
it('shows empty and failure states, dismisses outside, and preserves plain Enter submission', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
    .mockRejectedValueOnce(new Error('Offline'));
  vi.stubGlobal('fetch', fetcher);
  const { root, input, popup } = setup();
  fireEvent.input(input, { target: { value: 'missing' } });
  await vi.advanceTimersByTimeAsync(150);
  expect(popup.textContent).toBe('No products found.');
  fireEvent.pointerDown(document.body);
  expect(popup.hidden).toBe(true);
  fireEvent.input(input, { target: { value: 'box' } });
  await vi.advanceTimersByTimeAsync(150);
  expect(popup.textContent).toContain('temporarily unavailable');
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(root.querySelector('[role="status"]')!.textContent).toContain(
    'temporarily unavailable',
  );
});
