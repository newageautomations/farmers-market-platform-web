export * from './website-page-heroes';
import {
  isHarvestHomepageComposition,
  isWebsitePageCompositions,
  appearanceWebsiteSections,
  uniqueWebsiteSectionIds,
  type HarvestHomepageSection,
  type WebsitePageCompositions,
} from './website-section-contract';
import { policiesSchema } from './policies';
import { farmhouseTemplateSchema } from './modern-farmhouse';
import {
  editorialHomepageComposition,
  editorialMarketTemplateSchema,
  type EditorialMarketSettings,
} from './editorial-market';
export * from './modern-farmhouse';
export * from './website-sections';
export * from './editorial-market';
export {
  policiesSchema,
  defaultPolicies,
  policyLimit,
  policyTitleLimit,
  policyContentLimit,
  policyContentParts,
  publishedPolicyEntries,
  type PoliciesConfig,
} from './policies';
import { faqSchema } from './faq';
export {
  faqSchema,
  defaultFaq,
  faqAnswerParts,
  faqQuestionLimit,
  type FaqConfig,
} from './faq';
import { contactSchema } from './contact';
export {
  contactSchema,
  defaultContact,
  contactEntryTypes,
  contactDetails,
  contactTextAdvice,
  contactValueAdvice,
  contactHref,
  contactSubjects,
  type ContactConfig,
} from './contact';
import { z } from 'zod';
import { platformTheme, themeVariables } from './index';

/** Presentation identities only. Billing and tenant access remain backend owned. */
export const storefrontThemes = {
  harvest: {
    label: 'Harvest',
    available: true,
    description: 'Our basic storefront theme.',
    premium: false,
  },
  'modern-farmhouse': {
    label: 'Modern Farmhouse',
    available: true,
    description:
      'An editorial, photographic storefront. Premium template, version 2.',
    premium: true,
  },
  'editorial-market': {
    label: 'Editorial Market',
    available: true,
    description:
      'A bright illustrated market storefront with an editorial homepage.',
    premium: false,
  },
  meadow: {
    label: 'Meadow',
    available: true,
    description:
      'A sunny, illustrated market storefront with bright produce, bees and farm friends.',
    premium: false,
  },
  hearth: {
    label: 'Hearth',
    available: true,
    description:
      'A rustic bakehouse storefront in kraft and roast tones for breads, preserves, coffee and pastries.',
    premium: false,
  },
  bloom: {
    label: 'Bloom',
    available: true,
    description:
      'A lively, curvy vendor storefront with wavy section edges and hand-drawn photo shapes.',
    premium: false,
  },
} as const;
export type StorefrontThemeId = keyof typeof storefrontThemes;
/** Themes a market website can use. Vendor-only themes are never offered to markets. */
export const marketStorefrontThemes: readonly StorefrontThemeId[] = [
  'harvest',
  'editorial-market',
  'meadow',
  'hearth',
];
/** Themes that only a market website can use. */
export const marketOnlyStorefrontThemes = ['meadow', 'hearth'] as const;
export type MarketOnlyStorefrontTheme =
  (typeof marketOnlyStorefrontThemes)[number];
/** Themes that only a vendor website can use. Markets are never offered them. */
export const vendorOnlyStorefrontThemes = ['bloom'] as const;
export type VendorOnlyStorefrontTheme =
  (typeof vendorOnlyStorefrontThemes)[number];
/** Meadow, Hearth and Bloom store their homepage, copy and page sections in the Harvest contract. */
export function usesHarvestContract(theme: unknown): boolean {
  return (
    theme === 'harvest' ||
    (marketOnlyStorefrontThemes as readonly unknown[]).includes(theme) ||
    (vendorOnlyStorefrontThemes as readonly unknown[]).includes(theme)
  );
}
/** Bloom: the curvy vendor theme on the Harvest vendor contract. */
export function isBloom(value: unknown): value is { theme: 'bloom' } {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { theme?: unknown }).theme === 'bloom'
  );
}
/** The market-only theme of an appearance: Meadow or Hearth. */
export function marketOnlyTheme(
  value: unknown,
): MarketOnlyStorefrontTheme | undefined {
  const theme =
    value && typeof value === 'object'
      ? (value as { theme?: unknown }).theme
      : undefined;
  return marketOnlyStorefrontThemes.find((id) => id === theme);
}
export function isHearth(
  value: unknown,
): value is { theme: 'hearth'; market?: MarketAppearance } {
  return marketOnlyTheme(value) === 'hearth';
}
export function isMeadow(
  value: unknown,
): value is { theme: 'meadow'; market?: MarketAppearance } {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { theme?: unknown }).theme === 'meadow'
  );
}

const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))
    .transform((value) => value.trim());
const image = text(2000).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
            url.hostname.endsWith('.localhost'))))
    );
  } catch {
    return false;
  }
});
export const textSizeSections = [
  'hero',
  'featured',
  'about',
  'closing',
  'footer',
  'related',
  'find-intro',
  'find-cta',
  'story-cta',
  'markets',
  'vendors',
  'categories',
] as const;
export const storefrontTextSizesSchema = z
  .record(
    z
      .string()
      .refine(
        (key) =>
          (textSizeSections as readonly string[]).includes(key) ||
          /^(?:story|faq|policy):[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(key),
      ),
    z
      .object({
        heading: z.number().int().min(75).max(200),
        paragraph: z.number().int().min(75).max(150),
      })
      .strict(),
  )
  .refine((value) => Object.keys(value).length <= 64);
export type StorefrontTextSizes = z.infer<typeof storefrontTextSizesSchema>;
/** Bounded percentages retain each section's responsive theme sizes and font families. */
export function storefrontTextSizeCss(config: {
  textSizes?: StorefrontTextSizes;
  theme?: StorefrontThemeId;
}) {
  const checked = storefrontTextSizesSchema.safeParse(config.textSizes ?? {});
  if (!checked.success) return '';
  return Object.entries(checked.data)
    .map(([id, size]) => {
      // Premium type rules include the themed root. Keep authored percentages
      // authoritative while retaining Harvest's existing selector contract.
      const root =
        config.theme === 'modern-farmhouse'
          ? "html:root[data-storefront-theme='modern-farmhouse']"
          : '[data-storefront-theme]';
      const scope = `${root} [data-editor-section="${id}"]`;
      const heading =
        id === 'hero'
          ? '[data-home-text="title"]'
          : id === 'featured'
            ? '.ui-section-heading h2'
            : id.startsWith('story:')
              ? '.story-copy h2'
              : 'h1, h2';
      const paragraph =
        id === 'hero'
          ? '[data-home-text="introduction"]'
          : id === 'about'
            ? '[data-about-blurb]'
            : id === 'closing'
              ? '[data-storefront-text="closingText"]'
              : id === 'footer'
                ? '[data-storefront-text="footerTagline"]'
                : id.startsWith('story:') || id === 'find-intro'
                  ? '.story-copy p'
                  : 'p';
      const headingSelectors = heading
        .split(', ')
        .map((selector) => `${scope} ${selector}`)
        .join(',');
      const bodyRule = ['featured', 'related'].includes(id)
        ? ''
        : `${scope} ${paragraph}{font-size:calc(var(--storefront-paragraph-base,1rem)*${size.paragraph / 100})}`;
      return `${headingSelectors}{font-size:calc(var(--storefront-heading-base,clamp(1.7rem,3vw,2.3rem))*${size.heading / 100})}${bodyRule}`;
    })
    .join('');
}
export const aboutSectionLimit = 12;
export const storefrontImageShapes = [
  'square',
  'rounded',
  'circle',
  'dome',
  'star',
  'corner',
] as const;
export const storefrontStoryImageShapes = [
  ...storefrontImageShapes,
  'natural',
  'natural-rounded',
] as const;
export const aboutSectionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/),
    layout: z.enum(['text', 'image', 'text-image']),
    heading: text(160),
    body: text(20000),
    imageAssetId: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .nullable(),
    image,
    alt: text(200),
    shape: z.enum(storefrontStoryImageShapes),
    imagePosition: z.enum(['left', 'right']),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    imageSize: z.enum(['small', 'medium', 'large']).optional(),
    visible: z.boolean(),
  })
  .strict()
  .refine((s) => !!s.imageAssetId === !!s.image, {
    message: 'Choose an image from your library.',
  });
export type AboutSection = z.infer<typeof aboutSectionSchema>;
export function createAboutSection(
  id: string,
  layout: AboutSection['layout'],
): AboutSection {
  return {
    id,
    layout,
    heading: '',
    body: '',
    imageAssetId: null,
    image: '',
    alt: '',
    shape: 'natural',
    imagePosition: 'right',
    textAlign: 'left',
    imageSize: 'medium',
    visible: true,
  };
}
export const defaultAboutCta = {
  heading: "See what we've been growing.",
  text: 'Explore our products and discover your next market favorite.',
  label: 'Shop Our Products',
  destination: '/products' as const,
};
const aboutCtaSchema = z
  .object({
    heading: text(160),
    text: text(600),
    label: text(80),
    destination: z.enum(['/products', '/']),
  })
  .strict()
  .refine((cta) => !!cta.heading && !!cta.label);
export const defaultFindUs = {
  enabled: false,
  title: 'Find Us',
  introduction: {
    ...createAboutSection('find-intro', 'text-image'),
    heading: 'Find us at the market.',
    body: "We'd love to see you! Browse our upcoming market dates, find out where we'll be, and preorder your favorites for pickup.",
    imageSize: 'small' as const,
  },
  cta: {
    heading: 'Shop ahead. Pick up fresh.',
    text: 'Explore our products and preorder for your next market visit.',
    label: 'Shop Our Products',
    destination: '/products' as const,
  },
};
export const findUsSchema = z
  .object({
    enabled: z.boolean(),
    title: text(160).refine((value) => !!value),
    introduction: aboutSectionSchema,
    cta: aboutCtaSchema,
  })
  .strict();
/** Stable, bounded content identifiers shared by the editor and actual Astro templates. */
export const storefrontTextFields = {
  headerShopLabel: {
    section: 'header',
    label: 'Shop navigation label',
    fallback: 'Shop the collection',
    max: 80,
  },
  headerAboutLabel: {
    section: 'header',
    label: 'About navigation label',
    fallback: 'About',
    max: 80,
  },
  heroPrimaryLabel: {
    section: 'hero',
    label: 'Primary button label',
    fallback: 'Shop the collection',
    max: 80,
  },
  heroSecondaryLabel: {
    section: 'hero',
    label: 'Secondary button label',
    fallback: 'Our story',
    max: 80,
  },
  relatedHeading: {
    section: 'related',
    label: 'Section heading',
    fallback: 'You might also like',
    max: 160,
  },
  featuredHeading: {
    section: 'featured',
    label: 'Section heading',
    fallback: 'Find your next favorite',
    max: 160,
  },
  featuredLinkLabel: {
    section: 'featured',
    label: 'Collection link label',
    fallback: 'Explore all products',
    max: 80,
  },
  aboutHeading: {
    section: 'about',
    label: 'About heading',
    fallback: '',
    max: 160,
  },
  aboutLinkLabel: {
    section: 'about',
    label: 'Story button label',
    fallback: 'Read our story',
    max: 80,
  },
  closingHeading: {
    section: 'closing',
    label: 'Invitation heading',
    fallback: 'Bring a little\ngoodness home.',
    max: 160,
  },
  closingText: {
    section: 'closing',
    label: 'Invitation supporting text',
    fallback:
      'Take a closer look at our collection. Find the details, explore your options, and choose something for your table.',
    max: 600,
  },
  closingLabel: {
    section: 'closing',
    label: 'Shopping button label',
    fallback: 'Explore the collection',
    max: 80,
  },
  footerTagline: {
    section: 'footer',
    label: 'Footer tagline',
    fallback: 'Something good to bring home.',
    max: 200,
  },
  footerShopLabel: {
    section: 'footer',
    label: 'Collection link label',
    fallback: 'Explore the collection',
    max: 80,
  },
  footerAboutLabel: {
    section: 'footer',
    label: 'Story link label',
    fallback: 'Our story',
    max: 80,
  },
} as const;
export type StorefrontTextKey = keyof typeof storefrontTextFields;
export const vendorHeroIntroduction =
  'Good things, thoughtfully made. Explore our collection and find something to bring home.';
const storefrontTextSchema = z
  .object(
    Object.fromEntries(
      Object.entries(storefrontTextFields).map(([key, field]) => [
        key,
        text(field.max).optional(),
      ]),
    ) as Record<StorefrontTextKey, z.ZodOptional<ReturnType<typeof text>>>,
  )
  .strict();
export const categoryPresentationSchema = z
  .record(
    z.string().regex(/^[1-9][0-9]*$/),
    z
      .object({
        position: z.number().int().min(0).max(10000),
        visible: z.boolean(),
        imageAssetId: z
          .string()
          .regex(/^[1-9][0-9]*$/)
          .nullable(),
        image,
      })
      .strict()
      .refine((value) => !!value.image === !!value.imageAssetId),
  )
  .refine((value) => Object.keys(value).length <= 200);
/** Market Harvest homepage copy. Every key falls back to a template default. */
export const marketTextFields = {
  heroPrimaryLabel: {
    section: 'hero',
    label: 'Primary button label',
    fallback: 'Find your next market day',
    max: 80,
  },
  heroSecondaryLabel: {
    section: 'hero',
    label: 'Secondary button label',
    fallback: 'Meet the vendors',
    max: 80,
  },
  marketsHeading: {
    section: 'markets',
    label: 'Section heading',
    fallback: 'A good day starts at the market.',
    max: 160,
  },
  marketsText: {
    section: 'markets',
    label: 'Supporting text',
    fallback: 'Pick a date. Meet the makers. Find something wonderful.',
    max: 600,
  },
  marketsLinkLabel: {
    section: 'markets',
    label: 'All dates link label',
    fallback: 'See every market date',
    max: 80,
  },
  vendorsHeading: {
    section: 'vendors',
    label: 'Section heading',
    fallback: 'Get to know your local favorites.',
    max: 160,
  },
  vendorsText: {
    section: 'vendors',
    label: 'Supporting text',
    fallback: 'Meet the growers and makers coming to our next market day.',
    max: 600,
  },
  vendorsLinkLabel: {
    section: 'vendors',
    label: 'All vendors link label',
    fallback: 'Meet every vendor',
    max: 80,
  },
  categoriesHeading: {
    section: 'categories',
    label: 'Section heading',
    fallback: 'Shop by category',
    max: 160,
  },
  categoriesText: {
    section: 'categories',
    label: 'Supporting text',
    fallback: "Browse what's coming to the next market day.",
    max: 600,
  },
  closingHeading: {
    section: 'closing',
    label: 'Banner heading',
    fallback: 'Come for the market.\nStay for the community.',
    max: 160,
  },
  closingText: {
    section: 'closing',
    label: 'Banner supporting text',
    fallback: 'Fresh food, good neighbors and something new every week.',
    max: 600,
  },
  closingLabel: {
    section: 'closing',
    label: 'Banner button label',
    fallback: 'Find your next market day',
    max: 80,
  },
  footerTagline: {
    section: 'footer',
    label: 'Footer tagline',
    fallback: 'Make a little room for local.',
    max: 200,
  },
} as const;
export type MarketTextKey = keyof typeof marketTextFields;
export const marketPageDefaults = {
  'market-dates': {
    enabled: true,
    title: 'Market Dates',
    description:
      'Plan your visit. Every upcoming market day, with times and location.',
  },
  vendors: {
    enabled: true,
    title: 'Vendors',
    description:
      'Choose a market day to see who will be there, then visit their shop or browse what they are bringing.',
  },
  applications: {
    enabled: true,
    title: 'Become a Vendor',
    description:
      'Grow with us. Choose an open application to join an upcoming market.',
  },
} as const;
export type MarketPageId = keyof typeof marketPageDefaults;
const marketPageSchema = z
  .object({
    enabled: z.boolean(),
    title: text(160).refine((value) => !!value),
    description: text(600),
  })
  .strict();
export const marketHeroDestinations = [
  ['/', 'Homepage'],
  ['/market-dates', 'Market dates'],
  ['/vendors', 'Vendors'],
  ['/shop', 'Shop'],
  ['/applications', 'Applications'],
  ['/about', 'Our story'],
  ['/contact', 'Contact'],
  ['/faq', 'FAQ'],
  ['/policies', 'Policies'],
  ['#markets', 'Upcoming markets section'],
  ['#vendors', 'Vendors section'],
] as const;
const marketDestination = text(200).refine((value) =>
  marketHeroDestinations.some(([path]) => path === value),
);
export const marketAppearanceSchema = z
  .object({
    text: z
      .object(
        Object.fromEntries(
          Object.entries(marketTextFields).map(([key, field]) => [
            key,
            text(field.max).optional(),
          ]),
        ) as Record<MarketTextKey, z.ZodOptional<ReturnType<typeof text>>>,
      )
      .strict()
      .optional(),
    heroPrimaryDestination: marketDestination.optional(),
    heroSecondaryDestination: marketDestination.optional(),
    heroImageAssetId: text(200).nullable().optional(),
    marketsCardTheme: z.enum(['standard', 'inverse', 'soft']).optional(),
    vendorsCardTheme: z.enum(['standard', 'inverse', 'soft']).optional(),
    heroShape: z.enum(storefrontImageShapes),
    typography: z.enum(['editorial', 'minimal', 'warm', 'friendly', 'refined']),
    pages: z
      .object({
        'market-dates': marketPageSchema,
        vendors: marketPageSchema,
        applications: marketPageSchema,
      })
      .strict(),
  })
  .strict();
export type MarketAppearance = z.infer<typeof marketAppearanceSchema>;
export const marketAppearanceDefaults: MarketAppearance = {
  heroShape: 'dome',
  typography: 'editorial',
  pages: {
    'market-dates': { ...marketPageDefaults['market-dates'] },
    vendors: { ...marketPageDefaults.vendors },
    applications: { ...marketPageDefaults.applications },
  },
};
export function marketText(
  config: { market?: MarketAppearance } | undefined,
  key: MarketTextKey,
) {
  return config?.market?.text?.[key] || marketTextFields[key].fallback;
}
export function marketPage(
  config: { market?: MarketAppearance } | undefined,
  page: MarketPageId,
) {
  return config?.market?.pages[page] ?? marketPageDefaults[page];
}
/** Market homepage text that Meadow does not show: its sections use their
 * headings alone. */
export const meadowHiddenText: readonly MarketTextKey[] = [
  'marketsText',
  'vendorsText',
  'categoriesText',
  'closingText',
];
/** Market homepage text a theme does not show. Meadow and Hearth sections use
 * their headings alone. */
export function headingOnlyMarketText(
  theme: unknown,
): readonly MarketTextKey[] {
  return (marketOnlyStorefrontThemes as readonly unknown[]).includes(theme)
    ? meadowHiddenText
    : [];
}
/** Market homepage text that Editorial Market does not show: its dates and
 * vendor sections use their headings alone. */
export const editorialMarketHiddenText: readonly MarketTextKey[] = [
  'marketsText',
  'vendorsText',
];
/** An Editorial Market market homepage, with the original call-to-action
 * banner seeded from the market's banner copy as an editable CTA section. */
export function editorialMarketHomepageComposition(config: {
  market?: MarketAppearance;
  template: { settings: EditorialMarketSettings };
}) {
  return editorialHomepageComposition(config.template.settings, {}, true, {
    heading: marketText(config, 'closingHeading'),
    body: marketText(config, 'closingText'),
    label: marketText(config, 'closingLabel'),
    destination: marketPage(config, 'market-dates').enabled
      ? '/market-dates'
      : '/',
  });
}
export const storefrontAppearanceSchema = z
  .object({
    market: marketAppearanceSchema.optional(),
    harvestComposition: z
      .custom<HarvestHomepageSection[]>(isHarvestHomepageComposition)
      .optional(),
    pageSections: z.custom<WebsitePageCompositions>().optional(),
    categoryPresentation: categoryPresentationSchema.optional(),
    template: z
      .union([farmhouseTemplateSchema, editorialMarketTemplateSchema])
      .optional(),
    vendor: z
      .object({
        text: storefrontTextSchema.optional(),
        relatedEnabled: z.boolean().optional(),
        aboutUseLegacyStory: z.boolean().optional(),
        aboutShape: z.enum(storefrontImageShapes).optional(),
        heroShape: z.enum(storefrontImageShapes),
        typography: z.enum([
          'editorial',
          'minimal',
          'warm',
          'friendly',
          'refined',
        ]),
        featuredIds: z
          .array(z.string().regex(/^[1-9][0-9]*$/))
          .max(3)
          .refine((ids) => new Set(ids).size === ids.length)
          .nullable(),
        aboutEnabled: z.boolean(),
        aboutBlurb: text(600),
        aboutImage: image,
        aboutAlt: text(200),
      })
      .strict()
      .refine(
        (v) =>
          !v.aboutEnabled || !!v.aboutBlurb || v.aboutUseLegacyStory === true,
        {
          message:
            'Add a short About blurb before showing the homepage About section.',
        },
      )
      .optional(),
    textSizes: storefrontTextSizesSchema.optional(),
    findUs: findUsSchema.optional(),
    contact: contactSchema.optional(),
    policies: policiesSchema.optional(),
    faq: faqSchema.optional(),
    theme: z.enum([
      'harvest',
      'modern-farmhouse',
      'editorial-market',
      'meadow',
      'hearth',
      'bloom',
    ]),
    palette: z.enum(['sage', 'terracotta', 'blue', 'charcoal']),
    buttonShape: z.enum(['square', 'soft', 'pill']),
    buttonHover: z.enum(['lift', 'darken', 'outline']),
    homepage: z
      .object({
        title: text(160),
        introduction: text(600),
        image,
        story: text(3000),
      })
      .strict(),
    about: z
      .object({
        enabled: z.boolean(),
        title: text(160),
        content: text(20000),
        sectionsVersion: z.literal(1).optional(),
        sections: z
          .array(aboutSectionSchema)
          .max(aboutSectionLimit)
          .refine(
            (sections) =>
              new Set(sections.map((s) => s.id)).size === sections.length,
          )
          .optional(),
        cta: aboutCtaSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      (!value.harvestComposition || usesHarvestContract(value.theme)) &&
      (!value.market || marketStorefrontThemes.includes(value.theme)) &&
      // Meadow and Hearth are market website themes only.
      (!marketOnlyTheme(value) || !value.vendor) &&
      // Bloom is a vendor website theme only.
      (!isBloom(value) || !value.market) &&
      (value.pageSections === undefined ||
        isWebsitePageCompositions(value.pageSections, {
          theme: value.theme,
          themeVersion: value.template?.version ?? 1,
        })) &&
      uniqueWebsiteSectionIds([
        ...appearanceWebsiteSections(value),
        ...(value.template?.id === 'modern-farmhouse'
          ? value.template.settings.sections
          : (value.template?.settings.composition ?? [])
        ).filter((s) => 'type' in s),
      ]),
    { message: 'Invalid page composition or duplicate section identity.' },
  )
  .refine((value) => !value.template || value.theme === value.template.id, {
    message: 'Template identity does not match appearance.',
  })
  .refine(
    (value) => !value.vendor?.aboutUseLegacyStory || !!value.homepage.story,
    { message: 'Legacy homepage story is required.' },
  )
  .refine(
    (value) =>
      !value.about.enabled ||
      (!!value.about.title &&
        (value.about.sections !== undefined || !!value.about.content)),
    { message: 'An enabled About page needs a title and content.' },
  )
  .refine(
    (value) =>
      value.about.sectionsVersion === undefined ||
      value.about.sections !== undefined,
  )
  .refine((value) => JSON.stringify(value).length <= 80000, {
    message:
      'Storefront content is too large. Shorten your page content, including policies and story sections.',
  });
export type StorefrontAppearance = z.infer<typeof storefrontAppearanceSchema>;
/** Absence and accidental empty adoption preserve the original full-page text. */
export function aboutSections(
  about: StorefrontAppearance['about'],
): AboutSection[] {
  if (about.sections?.length || (about.sectionsVersion === 1 && about.sections))
    return about.sections;
  if (!about.content.trim())
    return [createAboutSection('first-story', 'text-image')];
  return [
    {
      id: 'legacy-story',
      layout: 'text',
      heading: about.title,
      body: about.content,
      imageAssetId: null,
      image: '',
      alt: '',
      shape: 'rounded',
      imagePosition: 'right',
      visible: true,
    },
  ];
}
export function isStorefrontEditorSection(
  value: unknown,
): value is StorefrontEditorSection {
  return (
    typeof value === 'string' &&
    !/\s/u.test(value) &&
    (Object.hasOwn(storefrontEditorSections, value) ||
      /^harvest:(?:hero|featured|about|closing|markets|vendors|categories|(?:text|image-with-text|cta-banner|image-banner|image-gallery|feature-grid|product-showcase|category-showcase)-[a-zA-Z0-9][a-zA-Z0-9_-]{0,58})$/.test(
        value,
      ) ||
      /^page:(?:(?:about|contact|faq|policies|find-us|market-dates|vendors|applications):(?:before|after)|products:before):(?:text|image-with-text|cta-banner|image-banner|image-gallery|feature-grid|product-showcase|category-showcase)-[a-zA-Z0-9][a-zA-Z0-9_-]{0,58}$/.test(
        value,
      ) ||
      /^(?:farmhouse:(?:cinematic|discovery|products|story|collection|invitation|(?:text|image-with-text|cta-banner|image-banner|image-gallery|feature-grid|product-showcase|category-showcase)-[a-zA-Z0-9][a-zA-Z0-9_-]{0,58}|shop-settings|story-layout|gallery)|editorial:(?:header|hero|categories|products|impact|markets|vendors|closing|footer|theme|(?:text|image-with-text|cta-banner|image-banner|image-gallery|feature-grid|product-showcase|category-showcase)-[a-zA-Z0-9][a-zA-Z0-9_-]{0,58}|shop-settings))$/.test(
        value,
      ) ||
      /^(?:story|faq|policy):[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value))
  );
}
export function storefrontEditorSectionLabel(value: StorefrontEditorSection) {
  if (value.startsWith('harvest:')) {
    const native = value.slice(8);
    return (
      storefrontEditorSections[
        native as keyof typeof storefrontEditorSections
      ] ?? 'Harvest section'
    );
  }
  if (value.startsWith('page:')) return 'Page section';
  return value.startsWith('farmhouse:')
    ? 'Modern Farmhouse section'
    : value.startsWith('editorial:')
      ? 'Editorial Market section'
      : value.startsWith('policy:')
        ? 'Policy'
        : value.startsWith('faq:')
          ? 'Question'
          : value.startsWith('story:')
            ? 'Story section'
            : storefrontEditorSections[
                value as keyof typeof storefrontEditorSections
              ];
}
export function storefrontText(
  config: StorefrontAppearance | undefined,
  key: StorefrontTextKey,
  name = '',
) {
  return (
    config?.vendor?.text?.[key] ||
    (key === 'aboutHeading'
      ? `Meet ${name}`
      : storefrontTextFields[key].fallback)
  );
}
export const storefrontEditorSections = {
  product: 'Product details',
  information: 'Product information',
  related: 'Related products',
  header: 'Header',
  hero: 'Hero',
  featured: 'Featured products',
  about: 'About',
  closing: 'Final shopping invitation',
  footer: 'Footer',
  theme: 'Theme settings',
  'policies-settings': 'Policies page',
  'policies-intro': 'Introduction',
  'policies-list': 'Policies',
  'policies-cta': 'Closing invitation',
  'faq-settings': 'FAQ page',
  'faq-intro': 'Introduction',
  'faq-questions': 'Questions',
  'faq-cta': 'Closing invitation',
  'contact-settings': 'Contact page',
  'contact-intro': 'Introduction',
  'contact-information': 'Public contact information',
  'contact-form': 'Contact form',
  'contact-cta': 'Closing invitation',
  'find-settings': 'Find Us page',
  'find-intro': 'Introduction',
  'find-markets': 'Market appearances',
  'find-cta': 'Closing invitation',
  'story-settings': 'Our Story page',
  'story-cta': 'Closing invitation',
  markets: 'Upcoming markets',
  vendors: 'Vendors',
  categories: 'Product categories',
  'market-dates-settings': 'Market dates',
  'vendors-settings': 'Vendor directory',
  'applications-settings': 'Open applications',
} as const;
export type StorefrontEditorSection =
  | keyof typeof storefrontEditorSections
  | `harvest:${string}`
  | `page:${string}`
  | `story:${string}`
  | `faq:${string}`
  | `policy:${string}`
  | `farmhouse:${string}`
  | `editorial:${string}`;
/** Only existing, read-only storefront routes can be browsed inside the editor. */
export function storefrontPreviewPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 400 &&
    /^\/$|^\/about$|^\/find-us$|^\/contact$|^\/faq$|^\/policies$|^\/market-dates$|^\/vendors$|^\/applications$|^\/occurrences\/[1-9][0-9]{0,9}$|^\/shop(?:\/products\/[1-9][0-9]{0,9})?$|^\/products(?:\/[a-zA-Z0-9_%~-]+)?$/.test(
      value,
    ) &&
    !/%(?:2f|5c|2e|00)/i.test(value)
  );
}
export const defaultStorefrontAppearance: StorefrontAppearance = {
  theme: 'harvest',
  palette: 'sage',
  buttonShape: 'pill',
  buttonHover: 'lift',
  homepage: { title: '', introduction: '', image: '', story: '' },
  about: { enabled: false, title: 'Our story', content: '' },
};
export const storefrontPalettes = {
  sage: {
    label: 'Sage',
    primary: '#355747',
    secondary: '#354D3D',
    background: '#F7F5EF',
    surface: '#FFFEFA',
    foreground: '#263B30',
    muted: '#59665C',
    accent: '#D7B879',
  },
  terracotta: {
    label: 'Terracotta',
    primary: '#8B4938',
    secondary: '#734735',
    background: '#FAF4EC',
    surface: '#FFFDF9',
    foreground: '#422E27',
    muted: '#746052',
    accent: '#D4AA73',
  },
  blue: {
    label: 'Coastal blue',
    primary: '#365C6E',
    secondary: '#334F60',
    background: '#F2F5F4',
    surface: '#FEFEFA',
    foreground: '#283E47',
    muted: '#586972',
    accent: '#CCB484',
  },
  charcoal: {
    label: 'Charcoal',
    primary: '#343F3A',
    secondary: '#3F4943',
    background: '#F5F3EE',
    surface: '#FFFEFB',
    foreground: '#2D3530',
    muted: '#61685F',
    accent: '#CCB78F',
  },
} as const;
/**
 * Bloom's own reading of the Colors setting: a complete, matched set for each
 * choice, from the page background to the accent blobs behind product photos.
 * `styles/bloom.css` declares the same values per `data-theme-palette`
 * (tests keep them identical); the editor's swatches read them from here.
 */
export const bloomPalettes = {
  sage: {
    label: 'Fern & sunshine',
    paper: '#FDF8EC',
    cream: '#FFFDF6',
    ink: '#22261F',
    muted: '#5E6356',
    primary: '#2F6B4A',
    deep: '#1C4A32',
    soft: '#DDEFE1',
    pop: '#FF8A5C',
    sun: '#FFCD4F',
    lilac: '#C3B5F2',
    mint: '#A5DCB8',
    sky: '#A9DCD9',
  },
  terracotta: {
    label: 'Paprika & apricot',
    paper: '#FFF6EE',
    cream: '#FFFCF8',
    ink: '#2C1F1A',
    muted: '#6E5A50',
    primary: '#B4432B',
    deep: '#7D2B1A',
    soft: '#FBE2D8',
    pop: '#F2A65A',
    sun: '#F4CF62',
    lilac: '#F2B5B0',
    mint: '#B9D3A3',
    sky: '#F5CFB6',
  },
  blue: {
    label: 'Lagoon & lemon',
    paper: '#F7F9FD',
    cream: '#FDFEFF',
    ink: '#1C2331',
    muted: '#566074',
    primary: '#2457A0',
    deep: '#163A6E',
    soft: '#DDE7F7',
    pop: '#FF8F6E',
    sun: '#FFD75E',
    lilac: '#B9B4F4',
    mint: '#9FDED0',
    sky: '#A6D4F4',
  },
  charcoal: {
    label: 'Plum & blush',
    paper: '#FCF6F7',
    cream: '#FFFCFD',
    ink: '#2A2030',
    muted: '#66596D',
    primary: '#5B3A70',
    deep: '#3D2650',
    soft: '#EEE3F4',
    pop: '#FF9EB5',
    sun: '#F2C15A',
    lilac: '#CDB7F0',
    mint: '#B7DCC8',
    sky: '#F7C6D4',
  },
} as const satisfies Record<
  keyof typeof storefrontPalettes,
  Record<string, string>
>;
/** Bloom always uses its default button hover; the setting is not offered. */
export function themeOffersButtonHover(theme: unknown): boolean {
  return theme !== 'bloom';
}
/** Shared by Astro pages and the dashboard preview. Only validated preset values enter CSS. */
export function storefrontThemeVariables(input: StorefrontAppearance) {
  const config = storefrontAppearanceSchema.parse(input);
  const palette = storefrontPalettes[config.palette];
  return {
    ...themeVariables({
      ...platformTheme,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background,
      surface: palette.surface,
      foreground: palette.foreground,
      muted: palette.muted,
      headingFont: 'serif',
    }),
    '--font-heading':
      storefrontFonts[
        input.vendor?.typography ?? input.market?.typography ?? 'editorial'
      ].heading,
    '--font-body':
      storefrontFonts[
        input.vendor?.typography ?? input.market?.typography ?? 'editorial'
      ].body,
    '--storefront-card-radius': { square: '0px', soft: '12px', pill: '28px' }[
      config.buttonShape
    ],
    '--ui-button-radius': { square: '2px', soft: '10px', pill: '999px' }[
      config.buttonShape
    ],
  };
}
export function storefrontThemeStyle(input: StorefrontAppearance) {
  return Object.entries(storefrontThemeVariables(input))
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

export const vendorAppearanceDefaults = {
  heroShape: 'dome',
  typography: 'editorial',
  featuredIds: null,
  aboutEnabled: false,
  aboutBlurb: '',
  aboutImage: '',
  aboutAlt: '',
} as const;
export const storefrontFonts = {
  editorial: {
    label: 'Classic editorial',
    heading: 'Georgia, serif',
    body: 'system-ui, sans-serif',
  },
  minimal: {
    label: 'Modern minimal',
    heading: 'Arial, sans-serif',
    body: 'Arial, sans-serif',
  },
  warm: {
    label: 'Warm contemporary',
    heading: 'Palatino Linotype, Book Antiqua, serif',
    body: 'system-ui, sans-serif',
  },
  friendly: {
    label: 'Friendly modern',
    heading: 'Trebuchet MS, sans-serif',
    body: 'Verdana, sans-serif',
  },
  refined: {
    label: 'Refined pairing',
    heading: 'Baskerville, Georgia, serif',
    body: 'Arial, sans-serif',
  },
} as const;
