import { describe, expect, it } from 'vitest';
import {
  createWebsiteSection,
  defaultStorefrontAppearance,
  effectiveWebsitePageSections,
  storefrontAppearanceSchema,
  supportsWebsitePageHero,
  themePageStructure,
  vendorStandardThemes,
} from '@market/theme/storefront';

// The vendor storefront standard (docs/vendor-storefronts/): every vendor
// theme shares the market page rules except the market-only features, and
// Find Us is a fixed page.
describe('vendor storefront standard', () => {
  it('gives every vendor theme the same page rules', () => {
    expect([...vendorStandardThemes]).toEqual([
      'harvest',
      'editorial-market',
      'modern-farmhouse',
      'bloom',
    ]);
    const market = themePageStructure('pasture', 'MARKET');
    for (const theme of vendorStandardThemes) {
      const rules = themePageStructure(theme, 'VENDOR');
      expect(rules).toEqual(themePageStructure('harvest', 'VENDOR'));
      expect(rules).toMatchObject({
        headingOnlyPages: market.headingOnlyPages,
        noClosingPages: market.noClosingPages,
        footerOnlyPages: ['faq', 'policies', 'terms-and-conditions'],
        shortHeroPages: ['contact', 'faq'],
        shortHeroHeight: 220,
        shopPagination: 'numbered',
        sectionImageShape: true,
        ctaButtonStyle: true,
        sectionSpaceDefault: 32,
        shopAvailabilityNote: false,
        fixedFindUs: { initial: 4, more: 8 },
      });
      // Market-only pages and features stay off on vendor websites.
      expect(rules).toMatchObject({
        lockedTopPages: [],
        marketTermsPage: false,
        marketContactForm: false,
        aboutStarter: false,
        marketStarterText: false,
        marketDayBoothCards: false,
      });
    }
  });

  it('puts market websites on Harvest and Editorial Market on the market standard', () => {
    for (const theme of ['harvest', 'editorial-market']) {
      const rules = themePageStructure(theme, 'MARKET');
      expect(rules).toEqual({
        ...themePageStructure('pasture', 'MARKET'),
        marketDayBoothCards: false,
      });
      expect(rules.fixedFindUs).toBeNull();
      expect(rules.footerOnlyPages).toEqual([
        'faq',
        'policies',
        'terms-and-conditions',
      ]);
      expect(rules.marketContactForm).toBe(true);
      expect(themePageStructure(theme, undefined)).toEqual(rules);
      // The vendor theme of the same name keeps the vendor standard.
      expect(themePageStructure(theme, 'VENDOR').marketContactForm).toBe(false);
      expect(themePageStructure(theme, 'VENDOR').fixedFindUs).not.toBeNull();
    }
    // Market-only themes keep the market standard.
    expect(themePageStructure('pasture', 'MARKET').fixedFindUs).toBeNull();
    expect(themePageStructure('pasture', 'VENDOR').fixedFindUs).toBeNull();
  });

  it('keeps Find Us fixed: no hero and no library sections, saved ones kept', () => {
    for (const theme of ['harvest', 'bloom', 'editorial-market'] as const) {
      const appearance = storefrontAppearanceSchema.parse({
        ...defaultStorefrontAppearance,
        theme,
      });
      expect(supportsWebsitePageHero(appearance, 'find-us', 'VENDOR')).toBe(
        false,
      );
      const text = createWebsiteSection('text', 'text-find-us', {
        theme,
        themeVersion: 1,
        page: 'find-us',
      });
      const saved = {
        ...appearance,
        pageSections: { 'find-us': { before: [text], after: [text] } },
      };
      for (const region of ['before', 'after'] as const)
        expect(
          effectiveWebsitePageSections(saved, 'find-us', region, 'VENDOR'),
        ).toEqual([]);
      // Nothing is deleted: the saved sections are only not shown.
      expect(saved.pageSections['find-us'].before).toEqual([text]);
      // Contact and FAQ still open with a short page hero.
      for (const page of ['contact', 'faq'] as const) {
        const [hero] = effectiveWebsitePageSections(
          appearance,
          page,
          'before',
          'VENDOR',
        );
        expect(hero?.presentation.sizing?.imageHeight).toBe(220);
      }
    }
  });
});
