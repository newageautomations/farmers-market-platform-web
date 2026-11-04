import { render } from '@testing-library/react';
import { CategoryIcon } from '@market/ui';
import {
  categoryIconDataUrl,
  categoryIconShapes,
  categoryIconArtwork,
} from '@market/ui/category-icons';
import { categoryIconReference } from '@market/ui/category-icon-reference';
import { categoryArt } from '../apps/storefront/src/components/editorial-market/category-art';

const categories = categoryIconReference.flatMap((parent) => [
  parent,
  ...parent.children,
]);

it('covers every parent and child with distinct, nonempty geometry', () => {
  const codes = categories.map((category) => category.code);
  expect(categoryIconReference).toHaveLength(15);
  expect(categories).toHaveLength(90);
  expect(new Set(codes).size).toBe(codes.length);
  expect(Object.keys(categoryIconArtwork).sort()).toEqual([...codes].sort());
  const artwork = codes.map((code) => categoryIconShapes(code));
  expect(artwork.every((shapes) => shapes && shapes.length > 0)).toBe(true);
  expect(new Set(artwork.map((shapes) => JSON.stringify(shapes))).size).toBe(
    codes.length,
  );
});

it('uses identical geometry in React and standalone SVGs for all categories', () => {
  for (const { code } of categories) {
    const { container, unmount } = render(<CategoryIcon code={code} />);
    const svg = container.querySelector('svg')!;
    const standalone = new DOMParser().parseFromString(
      decodeURIComponent(categoryIconDataUrl(code)!.split(',')[1]!),
      'image/svg+xml',
    );
    expect(standalone.querySelector('parsererror')).toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('stroke-width')).toBe('2');
    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
    const describeShapes = (root: Element) =>
      Array.from(root.children).map((shape) => ({
        tag: shape.tagName,
        attrs: Object.fromEntries(
          Array.from(shape.attributes).map(({ name, value }) => [name, value]),
        ),
      }));
    expect(describeShapes(svg)).toEqual(
      describeShapes(standalone.documentElement),
    );
    unmount();
  }
});

it('uses canonical identity and preserves explicit storefront artwork', () => {
  expect(categoryArt('produce.fruits')).toBe(
    categoryIconDataUrl('produce.fruits'),
  );
  expect(categoryArt('produce.fruits')).not.toBe(categoryArt('produce'));
  expect(categoryArt('produce.fruits', '/custom-fruit.png')).toBe(
    '/custom-fruit.png',
  );
  expect(categoryArt('unknown', '/custom.png')).toBe('/custom.png');
  for (const code of ['Fruits', 'produce.unknown', '__proto__', 'toString']) {
    expect(categoryIconShapes(code)).toBeUndefined();
    expect(categoryArt(code)).toBeUndefined();
    const { container, unmount } = render(<CategoryIcon code={code} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
  }
});
