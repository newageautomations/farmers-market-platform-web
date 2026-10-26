import { afterEach, expect, it, vi } from 'vitest';
import { mountFarmhouseScrollFade } from '../apps/storefront/src/lib/farmhouse-scroll-fade';

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-scroll-fade');
  document.documentElement.removeAttribute('data-editor-preview');
  document.body.innerHTML = '';
});
function setup(reduced = false) {
  document.documentElement.dataset.scrollFade = 'true';
  document.body.innerHTML =
    '<div class="farmhouse-home"><section class="farmhouse-cinematic">Hero</section><section id="intro">Intro</section><section id="below"><div class="farmhouse-space"><a href="/products">Shop</a></div></section></div>';
  const hero = document.querySelector<HTMLElement>('.farmhouse-cinematic')!;
  const intro = document.getElementById('intro')!;
  const below = document.getElementById('below')!;
  below.getBoundingClientRect = () =>
    ({ top: window.innerHeight + 200 }) as DOMRect;
  let deliver: (
    entries: Array<{ target: Element; isIntersecting: boolean }>,
  ) => void = () => {};
  let observerOptions: IntersectionObserverInit | undefined;
  const observe = vi.fn(),
    unobserve = vi.fn();
  vi.stubGlobal('matchMedia', () => ({
    matches: reduced,
    addEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof deliver, options: IntersectionObserverInit) {
        deliver = callback;
        observerOptions = options;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
    },
  );
  return {
    hero,
    intro,
    below,
    observe,
    unobserve,
    options: () => observerOptions,
    enter: (isIntersecting = true) =>
      deliver([{ target: below, isIntersecting }]),
  };
}
it('keeps the hero and visible content visible and fades each offscreen section once', () => {
  const { hero, intro, below, observe, unobserve, enter, options } = setup();
  mountFarmhouseScrollFade();
  expect(hero).not.toHaveAttribute('data-fade-pending');
  expect(intro).not.toHaveAttribute('data-fade-pending');
  expect(below).toHaveAttribute('data-fade-pending');
  expect(observe).toHaveBeenCalledOnce();
  const margin = Number(
    options()!.rootMargin!.split(' ')[2]!.replace('px', ''),
  );
  expect(margin).toBeCloseTo(-window.innerHeight / 5, 0);
  enter(false);
  expect(below).toHaveAttribute('data-fade-pending');
  enter();
  expect(below).not.toHaveAttribute('data-fade-pending');
  expect(unobserve).toHaveBeenCalledWith(below);
});
it('reveals a section immediately when keyboard focus enters it', () => {
  const { below } = setup();
  mountFarmhouseScrollFade();
  below.querySelector('a')!.focus();
  expect(below).not.toHaveAttribute('data-fade-pending');
});

it('keeps the shop market selector visible independently of catalog scrolling', () => {
  const { observe } = setup();
  document.body.innerHTML =
    '<div class="farmhouse-space farmhouse-shop-pickup">Pickup selector</div><div class="farmhouse-space farmhouse-shop-content">Products</div>';
  const pickup = document.querySelector<HTMLElement>('.farmhouse-shop-pickup')!;
  const products = document.querySelector<HTMLElement>(
    '.farmhouse-shop-content',
  )!;
  pickup.getBoundingClientRect = products.getBoundingClientRect = () =>
    ({ top: window.innerHeight + 200 }) as DOMRect;
  mountFarmhouseScrollFade();
  expect(pickup).not.toHaveAttribute('data-fade-pending');
  expect(products).toHaveAttribute('data-fade-pending');
  expect(observe).toHaveBeenCalledWith(products);
  expect(observe).not.toHaveBeenCalledWith(pickup);
});
it.each(['disabled', 'preview', 'reduced motion', 'unsupported browser'])(
  'keeps content visible for %s',
  (mode) => {
    const { below, observe } = setup(mode === 'reduced motion');
    if (mode === 'disabled') delete document.documentElement.dataset.scrollFade;
    if (mode === 'preview')
      document.documentElement.dataset.editorPreview = 'true';
    if (mode === 'unsupported browser')
      delete (window as unknown as Record<string, unknown>)
        .IntersectionObserver;
    mountFarmhouseScrollFade();
    expect(below).not.toHaveAttribute('data-fade-pending');
    expect(observe).not.toHaveBeenCalled();
  },
);
