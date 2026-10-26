import { expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { mountFarmhouseCarousel } from '../apps/storefront/src/lib/farmhouse-carousel';

it('uses finite pages, hides controls at both ends and supports keyboard navigation', () => {
  document.body.innerHTML =
    '<div data-farmhouse-carousel><button data-carousel-direction="previous" hidden>Previous</button><div data-carousel-track tabindex="0"><article>One</article><article>Two</article></div><button data-carousel-direction="next" hidden>Next</button></div>';
  const root = document.querySelector<HTMLElement>(
    '[data-farmhouse-carousel]',
  )!;
  const track = root.querySelector<HTMLElement>('[data-carousel-track]')!;
  const previous = root.querySelector<HTMLButtonElement>(
    '[data-carousel-direction="previous"]',
  )!;
  const next = root.querySelector<HTMLButtonElement>(
    '[data-carousel-direction="next"]',
  )!;
  Object.defineProperties(track, {
    clientWidth: { value: 300 },
    scrollWidth: { value: 900 },
  });
  track.scrollTo = vi.fn((options: ScrollToOptions | number = {}) => {
    if (typeof options === 'object') {
      track.scrollLeft = options.left ?? 0;
      track.dispatchEvent(new Event('scroll'));
    }
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const cleanup = mountFarmhouseCarousel(root);
  try {
    expect(previous.hidden).toBe(true);
    expect(next.hidden).toBe(false);
    fireEvent.click(next);
    expect(track.scrollLeft).toBe(300);
    expect(previous.hidden).toBe(false);
    fireEvent.click(next);
    expect(track.scrollLeft).toBe(600);
    expect(next.hidden).toBe(true);
    fireEvent.click(next);
    expect(track.scrollLeft).toBe(600);
    fireEvent.keyDown(track, { key: 'ArrowLeft' });
    expect(track.scrollLeft).toBe(300);
    fireEvent.click(previous);
    expect(track.scrollLeft).toBe(0);
    expect(previous.hidden).toBe(true);
    fireEvent.click(previous);
    expect(track.scrollLeft).toBe(0);
  } finally {
    cleanup?.();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  }
});

it('hides both controls when the entire collection fits', () => {
  document.body.innerHTML =
    '<div data-farmhouse-carousel><button data-carousel-direction="previous">Previous</button><div data-carousel-track tabindex="0"></div><button data-carousel-direction="next">Next</button></div>';
  const root = document.querySelector<HTMLElement>(
    '[data-farmhouse-carousel]',
  )!;
  const track = root.querySelector<HTMLElement>('[data-carousel-track]')!;
  Object.defineProperties(track, {
    clientWidth: { value: 900 },
    scrollWidth: { value: 900 },
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const cleanup = mountFarmhouseCarousel(root);
  try {
    expect(
      Array.from(root.querySelectorAll('button')).every(
        (button) => button.hidden,
      ),
    ).toBe(true);
  } finally {
    cleanup?.();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  }
});
