import { describe, expect, it } from 'vitest';
import {
  createWebsiteSection,
  isMeadow,
  marketAppearanceDefaults,
  marketOnlyStorefrontThemes,
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
  meadowArt,
  meadowCategoryArt,
} from '../apps/storefront/src/components/meadow/art';

const meadow = (): StorefrontAppearance => ({
  theme: 'meadow',
  palette: 'sage',
  buttonShape: 'pill',
  buttonHover: 'lift',
  homepage: { title: '', introduction: '', image: '', story: '' },
  about: { enabled: false, title: 'Our story', content: '' },
  market: structuredClone(marketAppearanceDefaults),
  harvestComposition: marketOriginalSections.map((id) => ({ id })),
});

describe('Meadow market theme', () => {
  it('is offered to markets only', () => {
    expect(storefrontThemes.meadow.available).toBe(true);
    expect(marketStorefrontThemes).toContain('meadow');
    expect(marketOnlyStorefrontThemes).toContain('meadow');
    expect(marketStorefrontThemes).not.toContain('modern-farmhouse');
  });

  it('stores its homepage in the Harvest market contract', () => {
    const parsed = storefrontAppearanceSchema.safeParse(meadow());
    expect(parsed.success).toBe(true);
    expect(isMeadow(parsed.data)).toBe(true);
    expect(usesHarvestContract('meadow')).toBe(true);
    expect(usesHarvestContract('editorial-market')).toBe(false);
  });

  it('rejects vendor content and another template identity', () => {
    expect(
      storefrontAppearanceSchema.safeParse({
        ...meadow(),
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
    expect(
      storefrontAppearanceSchema.safeParse({
        ...meadow(),
        theme: 'modern-farmhouse',
      }).success,
    ).toBe(false);
  });

  it('accepts the shared section library on its homepage and pages', () => {
    for (const definition of Object.values(websiteSectionManifest)) {
      expect(
        definition.themes.some(
          (theme) => theme.id === 'meadow' && theme.version === 1,
        ),
      ).toBe(true);
      expect(definition.renderers.meadow).toBe(definition.renderers.harvest);
    }
    const target = { theme: 'meadow', themeVersion: 1, page: 'market-dates' };
    expect(permitsWebsiteSection('text', target)).toBe(true);
    const text = createWebsiteSection('text', 'text-meadow-note', {
      theme: 'harvest',
      themeVersion: 1,
      page: 'home',
    });
    const parsed = storefrontAppearanceSchema.safeParse({
      ...meadow(),
      harvestComposition: [...meadow().harvestComposition!, text],
      pageSections: {
        'market-dates': {
          before: [{ ...text, id: 'text-meadow-dates' }],
        },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('shows section headings without supporting text', () => {
    expect(meadowHiddenText).toEqual([
      'marketsText',
      'vendorsText',
      'categoriesText',
      'closingText',
    ]);
  });

  it('chooses category artwork from its own illustration set', () => {
    expect(meadowCategoryArt('Honey & Preserves', 0)).toBe('honey');
    expect(meadowCategoryArt('Farm Eggs', 1)).toBe('egg');
    expect(meadowCategoryArt('Vegetables', 2)).toBe('carrot');
    expect(meadowArt).toContain(meadowCategoryArt('Handmade soap', 3));
  });
  it('follows the market storefront standard', () => {
    expect(themePageStructure('meadow', 'MARKET')).toEqual(
      themePageStructure('pasture', 'MARKET'),
    );
  });

  it('shows its own colors in the section background picker', () => {
    const generic = { background: '#000', surface: '#000', primary: '#000' };
    const leading = {
      sage: '#2f6b3a',
      terracotta: '#b4412a',
      blue: '#2f5597',
      charcoal: '#3a3340',
    };
    for (const [palette, color] of Object.entries(leading)) {
      const swatches = sectionBackgroundSwatches('meadow', generic, palette);
      expect(swatches.paper.color).toBe('#fff8ea');
      expect(swatches.surface.color).toBe('#ffffff');
      expect(swatches.ink.color).toBe(color);
    }
  });
});
