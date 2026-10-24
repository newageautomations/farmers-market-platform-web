import { expect, it, vi } from 'vitest';
import {
  defaultStorefrontAppearance,
  defaultFaq,
  defaultPolicies,
  vendorAppearanceDefaults,
} from '@market/theme/storefront';

it('does nothing when Astro hoists the bridge onto a public page without preview state', async () => {
  document.body.innerHTML = '<h1>Published homepage</h1>';
  await expect(
    import('../apps/storefront/src/lib/editor-preview-client'),
  ).resolves.toBeDefined();
  expect(document.body).toHaveTextContent('Published homepage');
  expect(document.documentElement).not.toHaveAttribute('data-editor-preview');
});

it('patches actual elements without rebuilding their markup, validates messages and debounces real SSR navigation', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const initial = {
    ...defaultStorefrontAppearance,
    vendor: {
      ...vendorAppearanceDefaults,
      aboutEnabled: true,
      aboutBlurb: 'Saved story',
    },
  };
  document.body.innerHTML =
    '<style id="storefront-text-sizes"></style><script type="application/json" id="storefront-editor-state"></script><section data-editor-section="hero"><h1 data-home-text="title">Published heading</h1><p data-home-text="introduction"></p><a href="/products"><span data-storefront-text="heroPrimaryLabel">Shop the collection</span></a><div class="harvest-hero-visual"></div><button>Add to cart</button></section><section data-editor-section="featured"><div class="ui-section-heading"><h2>Collection</h2></div></section><section data-editor-section="about"><p data-about-blurb>Saved story</p></section><span data-storefront-text="closingLabel"></span>';
  document.getElementById('storefront-editor-state')!.textContent =
    JSON.stringify({
      parent: window.location.origin,
      state: { config: initial, path: '/', scroll: 0, id: '11' },
      name: 'Garden Farm',
    });
  const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  const submit = vi
    .spyOn(HTMLFormElement.prototype, 'submit')
    .mockImplementation(() => {});
  const action = vi.fn();
  document.querySelector('button')!.addEventListener('click', action);
  const expiresAt = Date.now() + 300000;
  await import('../apps/storefront/src/lib/editor-preview-client');
  const anchor = document.querySelector('a');
  const value = {
    ...initial,
    textSizes: { hero: { heading: 125, paragraph: 110 } },
    palette: 'blue',
    homepage: { ...initial.homepage, title: 'Unsaved heading' },
    vendor: {
      ...initial.vendor,
      typography: 'friendly',
      heroShape: 'star',
      aboutBlurb: 'Unsaved story',
      text: {
        heroPrimaryLabel: 'Shop fresh',
        featuredHeading: 'Fresh picks',
        closingLabel: 'Choose dinner',
      },
    },
  };
  const update = (
    patch: object = {},
    origin = window.location.origin,
    source = window,
  ) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        origin,
        source,
        data: {
          protocol: 'storefront-editor-v1',
          type: 'update',
          token: 'x'.repeat(43),
          expiresAt,
          config: value,
          path: '/',
          section: 'hero',
          mode: 'inspect',
          ...patch,
        },
      }),
    );
  try {
    update({}, 'https://untrusted.example');
    expect(document.querySelector('h1')).toHaveTextContent('Published heading');
    update({ config: { ...value, injectedHtml: '<script>bad</script>' } });
    expect(document.querySelector('h1')).toHaveTextContent('Published heading');
    update();
    expect(document.getElementById('storefront-text-sizes')).toHaveTextContent(
      '--storefront-heading-base',
    );
    expect(document.getElementById('storefront-text-sizes')).toHaveTextContent(
      '*1.25',
    );
    expect(document.querySelector('h1')).toHaveTextContent('Unsaved heading');
    expect(document.querySelector('a')).toBe(anchor);
    expect(anchor).toHaveTextContent('Shop fresh');
    expect(document.querySelector('[data-about-blurb]')).toHaveTextContent(
      'Unsaved story',
    );
    expect(document.querySelector('.ui-section-heading h2')).toHaveTextContent(
      'Fresh picks',
    );
    expect(
      document.querySelector('[data-storefront-text="closingLabel"]'),
    ).toHaveTextContent('Choose dinner');
    expect(
      document.documentElement.style.getPropertyValue('--font-heading'),
    ).toContain('Trebuchet');
    expect(
      document.documentElement.style.getPropertyValue('--brand-primary'),
    ).toBe('#365C6E');
    expect(document.querySelector('.harvest-hero-visual')).toHaveAttribute(
      'data-hero-shape',
      'star',
    );
    expect(submit).not.toHaveBeenCalled();
    update({ mode: 'browse' });
    document.querySelector<HTMLButtonElement>('button')!.click();
    expect(action).not.toHaveBeenCalled();
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'blocked' }),
      window.location.origin,
    );
    anchor!.click();
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'navigate', path: '/products' }),
      window.location.origin,
    );
    update({
      config: { ...value, faq: defaultFaq, policies: defaultPolicies },
    });
    vi.advanceTimersByTime(299);
    expect(submit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(submit).toHaveBeenCalledOnce();
    const form = document.querySelector<HTMLFormElement>('form')!;
    expect(form.action).toBe(
      new URL('/storefront-editor-preview/render', window.location.origin).href,
    );
    expect(
      JSON.parse(new FormData(form).get('payload') as string),
    ).toMatchObject({
      config: { faq: defaultFaq, policies: defaultPolicies },
      path: '/',
      token: 'x'.repeat(43),
    });
    vi.advanceTimersByTime(300000);
    expect(document.body.children).toHaveLength(0);
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'expired' }),
      window.location.origin,
    );
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.replaceChildren();
    delete document.documentElement.dataset.editorPreview;
    delete document.documentElement.dataset.editorInspect;
    document.documentElement.removeAttribute('style');
  }
});
