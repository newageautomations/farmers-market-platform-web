import type { StorefrontAppearance } from './storefront';
import { createWebsiteSection } from './website-sections';
import {
  websiteSectionLimit,
  permitsWebsiteSection,
  type WebsiteEditorialPage,
  type WebsitePageRegion,
  type WebsiteSection,
  type SectionTarget,
} from './website-section-contract';
import { themePageStructure } from './theme-page-structure';
export const websiteHeroPages = [
  'about',
  'contact',
  'find-us',
  'faq',
  'policies',
] as const;
export function supportsWebsitePageHero(
  appearance: StorefrontAppearance,
  page: string,
): boolean {
  return (
    (websiteHeroPages as readonly string[]).includes(page) &&
    !(
      themePageStructure(appearance.theme).headingOnlyPages as readonly string[]
    ).includes(page) &&
    permitsWebsiteSection('image-with-text', {
      theme: appearance.theme,
      themeVersion: appearance.template?.version ?? 1,
      page,
    })
  );
}
/** Absence derives a hero; an explicit empty array records deletion and never regenerates it. */
export function effectiveWebsitePageSections(
  appearance: StorefrontAppearance,
  page: WebsiteEditorialPage,
  region: WebsitePageRegion,
): WebsiteSection[] {
  const structure = themePageStructure(appearance.theme);
  const saved = appearance.pageSections?.[page]?.[region];
  // Heading-only pages never show a page hero, including one saved earlier.
  if (saved !== undefined)
    return (structure.headingOnlyPages as readonly string[]).includes(page)
      ? saved.filter((s) => s.id !== `image-with-text-page-hero-${page}`)
      : saved;
  if (region !== 'before' || !supportsWebsitePageHero(appearance, page))
    return [];
  if (
    (appearance.pageSections?.[page]?.after?.length ?? 0) >= websiteSectionLimit
  )
    return [];
  const target: SectionTarget = {
    theme: appearance.theme,
    themeVersion: appearance.template?.version ?? 1,
    page,
  };
  const hero = createWebsiteSection(
    'image-with-text',
    `image-with-text-page-hero-${page}`,
    target,
  );
  const config =
    page === 'about'
      ? appearance.about
      : page === 'find-us'
        ? appearance.findUs
        : page === 'contact'
          ? appearance.contact
          : page === 'faq'
            ? appearance.faq
            : appearance.policies;
  const intro =
    page === 'find-us' ? appearance.findUs?.introduction : undefined;
  const headings = {
    about: 'Our story',
    contact: 'Get in touch',
    'find-us': 'Find us at the market',
    faq: 'Frequently asked questions',
    policies: 'Our policies',
  };
  const copy = config && 'description' in config ? config.description : '';
  hero.content.heading = (
    intro?.heading ||
    (config && 'heading' in config ? config.heading : config?.title) ||
    headings[page as keyof typeof headings]
  ).slice(0, 160);
  hero.content.body = (intro?.body ?? copy ?? '').slice(0, 1200);
  hero.content.label = '';
  if (intro?.imageAssetId && intro.image)
    hero.content.image = {
      assetId: intro.imageAssetId,
      url: intro.image,
      alt: intro.alt,
    };
  if (intro) {
    hero.presentation.imageSide = intro.imagePosition;
    hero.presentation.alignment = intro.textAlign ?? 'left';
    hero.presentation.imageSize = intro.imageSize ?? 'medium';
  }
  if ((structure.shortHeroPages as readonly string[]).includes(page))
    hero.presentation.sizing = {
      ...hero.presentation.sizing,
      imageHeight: structure.shortHeroHeight,
    };
  return [hero];
}
