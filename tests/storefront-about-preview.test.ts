import { expect, it, vi } from 'vitest';
import {
  defaultStorefrontAppearance,
  defaultAboutCta,
  type StorefrontAppearance,
} from '@market/theme/storefront';

it('selects stable story IDs, patches real Astro nodes and requests SSR only for structural edits', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const initial: StorefrontAppearance = {
    ...defaultStorefrontAppearance,
    about: {
      enabled: true,
      title: 'Story',
      content: 'Legacy text',
      sectionsVersion: 1,
      sections: [
        {
          id: 'field',
          layout: 'text-image',
          heading: 'Our field',
          body: 'Saved words',
          imageAssetId: '10',
          image: 'https://assets.example.test/field.jpg',
          alt: 'Field',
          shape: 'rounded',
          imagePosition: 'right',
          visible: true,
        },
      ],
      cta: defaultAboutCta,
    },
  };
  document.body.innerHTML =
    '<script type="application/json" id="storefront-editor-state"></script><h1 data-story-title>Story</h1><section data-editor-section="story:field"><h2 data-story-field="heading">Our field</h2><p data-story-field="body">Saved words</p><div class="story-image-frame" data-story-shape="rounded"><img alt="Field" width="960" height="960"></div></section><section data-editor-section="story-cta"><h2 data-story-cta="heading"></h2><p data-story-cta="text"></p><a href="/products"><span data-story-cta="label"></span></a></section>';
  document.getElementById('storefront-editor-state')!.textContent =
    JSON.stringify({
      parent: window.location.origin,
      state: { config: initial, path: '/about', scroll: 0, id: '11' },
      name: 'Garden Farm',
    });
  const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  const submit = vi
    .spyOn(HTMLFormElement.prototype, 'submit')
    .mockImplementation(() => {});
  const updated = structuredClone(initial);
  Object.assign(updated.about.sections![0]!, {
    heading: '<script>plain text</script>',
    body: 'First paragraph\n\nSecond paragraph',
    alt: 'Growing field',
    shape: 'star',
    imagePosition: 'left',
    textAlign: 'right',
    imageSize: 'small',
  });
  updated.about.cta = {
    heading: 'Visit the farm',
    text: 'Come meet us.',
    label: 'Home',
    destination: '/',
  };
  const update = (
    config: StorefrontAppearance,
    origin = window.location.origin,
  ) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        origin,
        data: {
          protocol: 'storefront-editor-v1',
          type: 'update',
          token: 'x'.repeat(43),
          expiresAt: Date.now() + 300000,
          config,
          path: '/about',
          section: 'story:field',
          mode: 'inspect',
        },
      }),
    );
  try {
    await import('../apps/storefront/src/lib/editor-preview-client');
    update(updated, 'https://untrusted.example');
    expect(
      document.querySelector('[data-story-field="body"]'),
    ).toHaveTextContent('Saved words');
    update(updated);
    expect(submit).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-story-field="heading"]')!.textContent,
    ).toBe('<script>plain text</script>');
    expect(
      document.querySelector('[data-story-field="heading"] script'),
    ).toBeNull();
    expect(
      document.querySelector('[data-story-field="body"]')!.textContent,
    ).toBe('First paragraph\n\nSecond paragraph');
    expect(document.querySelector('img')).toHaveAttribute(
      'data-hero-shape',
      'star',
    );
    expect(document.querySelector('img')).toHaveAttribute(
      'alt',
      'Growing field',
    );
    expect(
      document.querySelector('[data-editor-section="story:field"]'),
    ).toHaveAttribute('data-image-position', 'left');
    expect(
      document.querySelector('[data-editor-section="story:field"]'),
    ).toHaveAttribute('data-text-align', 'right');
    expect(
      document.querySelector('[data-editor-section="story:field"]'),
    ).toHaveAttribute('data-image-size', 'small');
    expect(document.querySelector('a')).toHaveAttribute('href', '/');
    expect(
      document.querySelector('[data-story-cta="label"]'),
    ).toHaveTextContent('Home');
    document.querySelector<HTMLElement>('[data-story-field="body"]')!.click();
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'select', section: 'story:field' }),
      window.location.origin,
    );
    const proportional = structuredClone(updated);
    proportional.about.sections![0]!.shape = 'natural-rounded';
    update(proportional);
    expect(document.querySelector('.story-image-frame')).toHaveAttribute(
      'data-story-shape',
      'natural-rounded',
    );
    expect(document.querySelector('img')).not.toHaveAttribute('width');
    expect(document.querySelector('img')).not.toHaveAttribute('height');
    expect(submit).not.toHaveBeenCalled();
    update(updated);
    expect(document.querySelector('.story-image-frame')).toHaveAttribute(
      'data-story-shape',
      'star',
    );
    expect(document.querySelector('img')).toHaveAttribute('width', '960');
    const reordered = structuredClone(updated);
    reordered.about.sections!.unshift({
      ...reordered.about.sections![0]!,
      id: 'another-field',
      visible: false,
    });
    update(reordered);
    vi.advanceTimersByTime(300);
    expect(submit).toHaveBeenCalledOnce();
    const payload = JSON.parse(
      document.querySelector<HTMLInputElement>('input[name="payload"]')!.value,
    );
    expect(
      payload.config.about.sections.map((s: { id: string }) => s.id),
    ).toEqual(['another-field', 'field']);
    expect(payload.config.about.sections[0].visible).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});
