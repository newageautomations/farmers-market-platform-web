import { describe, expect, it } from 'vitest';
import {
  headingOnlyMarketText,
  isHearth,
  isMeadow,
  isPasture,
  marketAppearanceDefaults,
  marketOnlyStorefrontThemes,
  marketOnlyTheme,
  marketOriginalSections,
  marketStorefrontThemes,
  meadowHiddenText,
  permitsWebsiteSection,
  storefrontAppearanceSchema,
  storefrontThemes,
  usesHarvestContract,
  websiteSectionManifest,
  type StorefrontAppearance,
  themePageStructure,
  supportsWebsitePageHero,
  effectiveWebsitePageSections,
  createWebsiteSection,
  isWebsiteSection,
  defaultMarketTerms,
  defaultMarketPolicies,
  defaultContact,
  defaultMarketContactForm,
  aboutStarterSections,
} from '@market/theme/storefront';
import {
  pastureArt,
  pastureCategoryArt,
} from '../apps/storefront/src/components/pasture/art';

const pasture = (): StorefrontAppearance => ({
  theme: 'pasture',
  palette: 'sage',
  buttonShape: 'pill',
  buttonHover: 'lift',
  homepage: { title: '', introduction: '', image: '', story: '' },
  about: { enabled: false, title: 'Our story', content: '' },
  market: structuredClone(marketAppearanceDefaults),
  harvestComposition: marketOriginalSections.map((id) => ({ id })),
});

describe('Pasture market theme', () => {
  it('is offered to markets only, beside Meadow and Hearth', () => {
    expect(storefrontThemes.pasture.available).toBe(true);
    expect(marketStorefrontThemes).toContain('pasture');
    expect(marketOnlyStorefrontThemes).toEqual(['meadow', 'hearth', 'pasture']);
  });

  it('stores its homepage in the Harvest market contract', () => {
    const parsed = storefrontAppearanceSchema.safeParse(pasture());
    expect(parsed.success).toBe(true);
    expect(isPasture(parsed.data)).toBe(true);
    expect(isHearth(parsed.data)).toBe(false);
    expect(isMeadow(parsed.data)).toBe(false);
    expect(marketOnlyTheme(parsed.data)).toBe('pasture');
    expect(usesHarvestContract('pasture')).toBe(true);
  });

  it('keeps the hero image as an ordinary editable homepage field', () => {
    const value = pasture();
    value.homepage.image = 'https://example.com/farmer.jpg';
    expect(storefrontAppearanceSchema.safeParse(value).success).toBe(true);
  });

  it('rejects vendor content', () => {
    expect(
      storefrontAppearanceSchema.safeParse({
        ...pasture(),
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
          (theme) => theme.id === 'pasture' && theme.version === 1,
        ),
      ).toBe(true);
      expect(definition.renderers.pasture).toBe(definition.renderers.harvest);
      expect(definition.variants.pasture).toEqual(definition.variants.harvest);
    }
    expect(
      permitsWebsiteSection('image-banner', {
        theme: 'pasture',
        themeVersion: 1,
        page: 'vendors',
      }),
    ).toBe(true);
  });

  it('shows section headings without supporting text, as Meadow does', () => {
    expect(headingOnlyMarketText('pasture')).toEqual(meadowHiddenText);
  });

  it('chooses category artwork, with a fallback', () => {
    expect(pastureCategoryArt('Vegetables', 0)).toBe('lettuce');
    expect(pastureCategoryArt('Tomatoes', 1)).toBe('tomato');
    expect(pastureCategoryArt('Fruit & Berries', 2)).toBe('apple');
    expect(pastureCategoryArt('Eggs & Dairy', 3)).toBe('egg');
    expect(pastureCategoryArt('Breads & Bakery', 4)).toBe('loaf');
    expect(pastureCategoryArt('Plants & Flowers', 5)).toBe('sprout');
    expect(pastureArt).toContain(pastureCategoryArt('Handmade soap', 6));
  });
});

describe('Pasture page structure', () => {
  it('opts into the page structure rules; Meadow and Hearth share them, other themes keep the historical behaviour', () => {
    const rules = themePageStructure('pasture', 'MARKET');
    expect(rules.lockedTopPages).toEqual(['vendors', 'applications']);
    expect(rules.footerOnlyPages).toEqual([
      'faq',
      'policies',
      'terms-and-conditions',
    ]);
    expect(rules.shopPagination).toBe('numbered');
    expect(themePageStructure('meadow', 'MARKET')).toEqual(rules);
    expect(themePageStructure('hearth', 'MARKET')).toEqual(rules);
    expect(themePageStructure('harvest', 'MARKET').headingOnlyPages).toEqual(
      [],
    );
    expect(themePageStructure('harvest', 'MARKET').marketContactForm).toBe(
      false,
    );
  });

  it('opens Policies with its own heading, ignoring a saved page hero', () => {
    const value = pasture();
    expect(supportsWebsitePageHero(value, 'policies', 'MARKET')).toBe(false);
    expect(
      effectiveWebsitePageSections(value, 'policies', 'before', 'MARKET'),
    ).toEqual([]);
    const saved = effectiveWebsitePageSections(
      { ...value, theme: 'meadow' },
      'faq',
      'before',
      'MARKET',
    );
    expect(
      effectiveWebsitePageSections(
        {
          ...value,
          pageSections: {
            policies: {
              before: [
                { ...saved[0]!, id: 'image-with-text-page-hero-policies' },
              ],
            },
          },
        },
        'policies',
        'before',
        'MARKET',
      ),
    ).toEqual([]);
  });

  it('derives short Contact and FAQ heroes', () => {
    for (const page of ['contact', 'faq'] as const) {
      const [hero] = effectiveWebsitePageSections(
        pasture(),
        page,
        'before',
        'MARKET',
      );
      expect(hero?.presentation.sizing?.imageHeight).toBe(220);
    }
    const [about] = effectiveWebsitePageSections(
      pasture(),
      'about',
      'before',
      'MARKET',
    );
    expect(about?.presentation.sizing).toBeUndefined();
  });

  it('accepts an image frame on Image with Text and a CTA button style, and nothing else', () => {
    const target = { theme: 'pasture', themeVersion: 1, page: 'about' };
    const image = createWebsiteSection(
      'image-with-text',
      'image-with-text-a',
      target,
    );
    expect(
      isWebsiteSection({
        ...image,
        presentation: { ...image.presentation, imageShape: 'circle' },
      }),
    ).toBe(true);
    expect(
      isWebsiteSection({
        ...image,
        presentation: { ...image.presentation, imageShape: 'blob' },
      }),
    ).toBe(false);
    const cta = createWebsiteSection('cta-banner', 'cta-banner-a', target);
    expect(
      isWebsiteSection({
        ...cta,
        presentation: { ...cta.presentation, buttonStyle: 'secondary' },
      }),
    ).toBe(true);
    expect(
      isWebsiteSection({
        ...cta,
        presentation: { ...cta.presentation, buttonStyle: 'ghost' },
      }),
    ).toBe(false);
  });

  it('stores market Terms like Policies and a contact form with fixed essentials', () => {
    const value = pasture();
    expect(
      storefrontAppearanceSchema.safeParse({
        ...value,
        marketTerms: defaultMarketTerms,
        contact: { ...defaultContact, form: defaultMarketContactForm },
      }).success,
    ).toBe(true);
    const withoutEmail = defaultMarketContactForm.fields.filter(
      (field) => field.type !== 'email',
    );
    expect(
      storefrontAppearanceSchema.safeParse({
        ...value,
        contact: { ...defaultContact, form: { fields: withoutEmail } },
      }).success,
    ).toBe(false);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...value,
        contact: {
          ...defaultContact,
          form: {
            fields: [
              ...defaultMarketContactForm.fields,
              {
                id: 'stall',
                type: 'select',
                label: 'Stall size',
                required: false,
              },
            ],
          },
        },
      }).success,
    ).toBe(false);
  });

  it('seeds an About page that explains how to compose it', () => {
    const starter = aboutStarterSections({
      theme: 'pasture',
      themeVersion: 1,
      page: 'about',
    });
    expect(starter.after.map((section) => section.type)).toEqual([
      'image-with-text',
      'feature-grid',
      'image-gallery',
      'text',
      'cta-banner',
    ]);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...pasture(),
        about: {
          enabled: true,
          title: 'Our story',
          content: '',
          sections: [starter.story],
          sectionsVersion: 1,
        },
        pageSections: { about: { after: starter.after } },
      }).success,
    ).toBe(true);
  });
});

describe('Pasture section spacing, shop and starter text', () => {
  it('accepts a bounded space above and below on every custom section', () => {
    const target = { theme: 'pasture', themeVersion: 1, page: 'about' };
    for (const type of [
      'text',
      'image-with-text',
      'cta-banner',
      'image-banner',
      'image-gallery',
      'feature-grid',
    ] as const) {
      const section = createWebsiteSection(type, `${type}-space`, target);
      const spaced = (spaceBlock: unknown) => ({
        ...section,
        presentation: { ...section.presentation, spaceBlock },
      });
      expect(isWebsiteSection(spaced(64))).toBe(true);
      expect(isWebsiteSection(spaced(0))).toBe(true);
      expect(isWebsiteSection(spaced(161))).toBe(false);
      expect(isWebsiteSection(spaced(12.5))).toBe(false);
    }
    expect(themePageStructure('pasture', 'MARKET').sectionSpaceDefault).toBe(
      32,
    );
    expect(themePageStructure('pasture', 'MARKET').marketDayBoothCards).toBe(
      true,
    );
    expect(themePageStructure('meadow', 'MARKET').marketDayBoothCards).toBe(
      true,
    );
    expect(themePageStructure('harvest', 'MARKET').marketDayBoothCards).toBe(
      false,
    );
    expect(
      themePageStructure('harvest', 'MARKET').sectionSpaceDefault,
    ).toBeNull();
  });

  it('starts market Policies and Terms with written text, free of em dashes', () => {
    for (const config of [defaultMarketPolicies, defaultMarketTerms])
      for (const item of config.policies) {
        expect(item.content.trim()).not.toBe('');
        expect(item.content).not.toMatch(/[–—]/);
        expect(item.content).not.toMatch(/storefront|platform|channel/i);
      }
    expect(defaultMarketPolicies.heading).toBe('Our policies');
  });
});
