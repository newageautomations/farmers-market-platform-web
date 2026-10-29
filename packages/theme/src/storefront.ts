import { policiesSchema } from './policies';
import { farmhouseTemplateSchema } from './modern-farmhouse';
import { editorialMarketTemplateSchema } from './editorial-market';
export * from './modern-farmhouse';
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
} as const;
export type StorefrontThemeId = keyof typeof storefrontThemes;

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
export const storefrontAppearanceSchema = z
  .object({
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
    theme: z.enum(['harvest', 'modern-farmhouse', 'editorial-market']),
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
    (Object.hasOwn(storefrontEditorSections, value) ||
      /^(?:farmhouse:(?:cinematic|discovery|products|story|collection|invitation|shop-settings|story-layout|gallery)|editorial:(?:header|hero|categories|products|impact|footer|shop-settings))$/.test(
        value,
      ) ||
      /^(?:story|faq|policy):[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value))
  );
}
export function storefrontEditorSectionLabel(value: StorefrontEditorSection) {
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
} as const;
export type StorefrontEditorSection =
  | keyof typeof storefrontEditorSections
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
    /^\/$|^\/about$|^\/find-us$|^\/contact$|^\/faq$|^\/policies$|^\/products(?:\/[a-zA-Z0-9_%~-]+)?$/.test(
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
      storefrontFonts[input.vendor?.typography ?? 'editorial'].heading,
    '--font-body':
      storefrontFonts[input.vendor?.typography ?? 'editorial'].body,
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
