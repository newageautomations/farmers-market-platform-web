import { expect, it, vi } from 'vitest';
import {
  defaultStorefrontAppearance,
  farmhouseDefaults,
} from '@market/theme/storefront';
import { readFileSync } from 'node:fs';

it('selects the photographic hero without replacing its gradient pseudo-element', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const config = {
    ...defaultStorefrontAppearance,
    theme: 'modern-farmhouse',
    template: {
      id: 'modern-farmhouse',
      version: 2,
      settings: farmhouseDefaults(),
    },
  };
  document.body.innerHTML =
    '<script type="application/json" id="storefront-editor-state"></script><section class="farmhouse-cinematic" data-editor-section="farmhouse:cinematic" style="position:relative"><img src="https://example.test/farm.jpg" alt="Farm"/></section>';
  document.getElementById('storefront-editor-state')!.textContent =
    JSON.stringify({
      parent: window.location.origin,
      name: 'Farm',
      state: { config, path: '/', scroll: 0, id: '1' },
    });
  document.documentElement.dataset.editorInspect = 'true';
  const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  try {
    await import('../apps/storefront/src/lib/editor-preview-client');
    document.querySelector('img')!.click();
    const hero = document.querySelector<HTMLElement>('.farmhouse-cinematic')!;
    expect(hero).toHaveAttribute('data-editor-selected');
    expect(
      hero.querySelector('.storefront-editor-selection-label'),
    ).toHaveTextContent('Modern Farmhouse section');
    expect(hero.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.test/farm.jpg',
    );
    expect(
      readFileSync('apps/storefront/src/components/EditorBridge.astro', 'utf8'),
    ).not.toContain('[data-editor-selected]::after');
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    post.mockRestore();
    delete document.documentElement.dataset.editorInspect;
    document.body.replaceChildren();
  }
});
