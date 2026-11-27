import { describe, expect, it } from 'vitest';
import {
  headingOnlyMarketText,
  isHearth,
  isMeadow,
  marketAppearanceDefaults,
  marketOnlyStorefrontThemes,
  marketOnlyTheme,
  marketOriginalSections,
  marketStorefrontThemes,
  meadowHiddenText,
  permitsWebsiteSection,
  sectionBackgroundSwatches,
  storefrontAppearanceSchema,
  storefrontThemes,
  themePageStructure,
  usesHarvestContract,
  websiteSectionManifest,
  type StorefrontAppearance,
} from '@market/theme/storefront';
import {
  hearthArt,
  hearthCategoryArt,
} from '../apps/storefront/src/components/hearth/art';

const hearth = (): StorefrontAppearance => ({
  theme: 'hearth',
  palette: 'sage',
  buttonShape: 'soft',
  buttonHover: 'lift',
  homepage: { title: '', introduction: '', image: '', story: '' },
  about: { enabled: false, title: 'Our story', content: '' },
  market: structuredClone(marketAppearanceDefaults),
  harvestComposition: marketOriginalSections.map((id) => ({ id })),
});

describe('Hearth market theme', () => {
  it('is offered to markets only, beside Meadow', () => {
    expect(storefrontThemes.hearth.available).toBe(true);
    expect(marketStorefrontThemes).toContain('hearth');
    expect(marketOnlyStorefrontThemes).toContain('hearth');
    expect(marketOnlyStorefrontThemes).toContain('meadow');
  });

  it('stores its homepage in the Harvest market contract', () => {
    const parsed = storefrontAppearanceSchema.safeParse(hearth());
    expect(parsed.success).toBe(true);
    expect(isHearth(parsed.data)).toBe(true);
    expect(isMeadow(parsed.data)).toBe(false);
    expect(marketOnlyTheme(parsed.data)).toBe('hearth');
    expect(marketOnlyTheme({ theme: 'harvest' })).toBeUndefined();
    expect(usesHarvestContract('hearth')).toBe(true);
  });

  it('rejects vendor content', () => {
    expect(
      storefrontAppearanceSchema.safeParse({
        ...hearth(),
        market: undefined,
        harvestComposition: undefined,
        vendor: {
          heroShape: 'dome',
          typography: 'editorial',
          featuredIds: null,
          aboutEnabled: false,
          aboutBlurb: '',
          aboutImage: '',
          aboutAlt: '',
        },
      }).success,
    ).toBe(false);
  });

  it('accepts the shared section library through the Harvest renderers', () => {
    for (const definition of Object.values(websiteSectionManifest)) {
      expect(
        definition.themes.some(
          (theme) => theme.id === 'hearth' && theme.version === 1,
        ),
      ).toBe(true);
      expect(definition.renderers.hearth).toBe(definition.renderers.harvest);
      expect(definition.variants.hearth).toEqual(definition.variants.harvest);
    }
    expect(
      permitsWebsiteSection('image-banner', {
        theme: 'hearth',
        themeVersion: 1,
        page: 'vendors',
      }),
    ).toBe(true);
  });

  it('shows section headings without supporting text, as Meadow does', () => {
    expect(headingOnlyMarketText('hearth')).toEqual(meadowHiddenText);
    expect(headingOnlyMarketText('meadow')).toEqual(meadowHiddenText);
    expect(headingOnlyMarketText('harvest')).toEqual([]);
    expect(headingOnlyMarketText('editorial-market')).toEqual([]);
  });

  it('chooses category artwork, with a fallback for non-bakery goods', () => {
    expect(hearthCategoryArt('Breads & Bakery', 0)).toBe('loaf');
    expect(hearthCategoryArt('Jams & Preserves', 1)).toBe('jam');
    expect(hearthCategoryArt('Coffee', 2)).toBe('coffee');
    expect(hearthCategoryArt('Pastries', 3)).toBe('croissant');
    expect(hearthCategoryArt('Vegetables', 4)).toBe('crate');
    expect(hearthArt).toContain(hearthCategoryArt('Handmade soap', 5));
  });
  it('follows the market storefront standard', () => {
    expect(themePageStructure('hearth', 'MARKET')).toEqual(
      themePageStructure('pasture', 'MARKET'),
    );
  });

  it('shows its own colors in the section background picker', () => {
    const generic = { background: '#000', surface: '#000', primary: '#000' };
    const leading = {
      sage: '#5c3a21',
      terracotta: '#8a3324',
      blue: '#37476b',
      charcoal: '#4a5330',
    };
    for (const [palette, color] of Object.entries(leading)) {
      const swatches = sectionBackgroundSwatches('hearth', generic, palette);
      expect(swatches.paper.color).toBe('#f4ead8');
      expect(swatches.surface.color).toBe('#fcf7ec');
      expect(swatches.ink.color).toBe(color);
    }
  });
});
