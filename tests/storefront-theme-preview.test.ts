import { expect, it, vi } from 'vitest';
import { defaultStorefrontAppearance } from '@market/theme/storefront';

it('rerenders the real Astro composition for a theme change instead of partially patching Harvest', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const original = structuredClone(defaultStorefrontAppearance);
  document.body.innerHTML =
    '<script type="application/json" id="storefront-editor-state"></script><h1>Harvest layout</h1>';
  document.getElementById('storefront-editor-state')!.textContent =
    JSON.stringify({
      parent: window.location.origin,
      state: { config: original, path: '/', scroll: 0, id: '11' },
      name: 'Garden Farm',
    });
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  const submit = vi
    .spyOn(HTMLFormElement.prototype, 'submit')
    .mockImplementation(() => {});
  try {
    await import('../apps/storefront/src/lib/editor-preview-client');
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        source: window,
        data: {
          protocol: 'storefront-editor-v1',
          type: 'update',
          token: 'x'.repeat(43),
          expiresAt: Date.now() + 300000,
          path: '/',
          mode: 'inspect',
          section: 'theme',
          config: { ...original, theme: 'modern-farmhouse' },
        },
      }),
    );
    expect(submit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(submit).toHaveBeenCalledOnce();
    const payload = JSON.parse(
      new FormData(document.querySelector('form')!).get('payload') as string,
    );
    expect(payload.config).toEqual({ ...original, theme: 'modern-farmhouse' });
    expect(payload.path).toBe('/');
    expect(document.querySelector('h1')).toHaveTextContent('Harvest layout');
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});
