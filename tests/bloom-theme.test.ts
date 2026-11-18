import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bloomPalettes,
  storefrontPalettes,
  themeOffersButtonHover,
} from '../packages/theme/src/storefront';

const css = readFileSync(
  resolve(process.cwd(), 'apps/storefront/src/styles/bloom.css'),
  'utf8',
);
const cssNames = {
  paper: 'paper',
  cream: 'cream',
  ink: 'ink',
  muted: 'muted',
  primary: 'primary',
  deep: 'primary-deep',
  soft: 'primary-soft',
  pop: 'coral',
  sun: 'sun',
  lilac: 'lilac',
  mint: 'mint',
  sky: 'sky',
} as const;

/** The declarations of the first rule whose selector ends with `selector`. */
function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

describe('Bloom palettes', () => {
  it('offers a Bloom set for every Colors choice', () => {
    expect(Object.keys(bloomPalettes).sort()).toEqual(
      Object.keys(storefrontPalettes).sort(),
    );
  });

  it.each(Object.entries(bloomPalettes))(
    'keeps the %s stylesheet values identical to the editor swatches',
    (key, palette) => {
      const rule = block(
        key === 'sage'
          ? "html[data-storefront-theme='bloom']"
          : `html[data-storefront-theme='bloom'][data-theme-palette='${key}']`,
      );
      for (const [token, name] of Object.entries(cssNames))
        expect(rule, `${key} ${token}`).toContain(
          `--bl-${name}: ${palette[token as keyof typeof cssNames].toLowerCase()};`,
        );
    },
  );

  it('uses no colour outside the palettes', () => {
    const literals = css
      .replace(/url\("data:[^"]*"\)/g, '')
      .match(/#[0-9a-f]{6}\b/gi);
    const allowed = new Set(
      Object.values(bloomPalettes).flatMap((palette) =>
        Object.entries(palette)
          .filter(([token]) => token !== 'label')
          .map(([, value]) => value.toLowerCase()),
      ),
    );
    expect(
      literals?.filter((value) => !allowed.has(value.toLowerCase())),
    ).toEqual([]);
  });
});

describe('Bloom button hover', () => {
  it('is not offered for Bloom and stays available elsewhere', () => {
    expect(themeOffersButtonHover('bloom')).toBe(false);
    expect(themeOffersButtonHover('harvest')).toBe(true);
    expect(themeOffersButtonHover('editorial-market')).toBe(true);
  });
});
