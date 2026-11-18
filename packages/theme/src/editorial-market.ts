import { z } from 'zod';
import {
  createWebsiteSection,
  editorialHomepageTarget,
  homepageDesignSchema,
  isEditorialHomepageComposition,
  editorialOriginalSections,
  editorialMarketOriginalSections,
  isEditorialMarketHomepageComposition,
  type EditorialHomepageSection,
} from './website-sections';

const cleanText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))
    .transform((value) => value.trim());

const imageUrl = cleanText(2000).refine((value) => {
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

export const editorialMarketPhotoSchema = z
  .object({
    assetId: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .nullable(),
    url: imageUrl,
    alt: cleanText(200),
  })
  .strict()
  .refine((photo) => !!photo.assetId === !!photo.url, {
    message: 'Choose an image from the image library.',
  });

export type EditorialMarketPhoto = z.infer<typeof editorialMarketPhotoSchema>;

const categoryImageSchema = z
  .object({
    assetId: z.string().regex(/^[1-9][0-9]*$/),
    url: imageUrl.refine(Boolean),
  })
  .strict();

export const editorialMarketTemplateSchema = z
  .object({
    id: z.literal('editorial-market'),
    version: z.literal(1),
    settings: z
      .object({
        version: z.literal(1),
        homepageDesign: homepageDesignSchema.optional(),
        composition: z
          .custom<EditorialHomepageSection[]>(isEditorialHomepageComposition)
          .optional(),
        assets: z
          .object({
            desktopHero: editorialMarketPhotoSchema,
            mobileHero: editorialMarketPhotoSchema,
            desktopFooter: editorialMarketPhotoSchema,
            mobileFooter: editorialMarketPhotoSchema,
          })
          .strict(),
        header: z
          .object({
            announcement: cleanText(160),
            shopLabel: cleanText(60),
            storyLabel: cleanText(60),
            findUsLabel: cleanText(60),
            contactLabel: cleanText(60),
          })
          .strict(),
        hero: z
          .object({
            heading: cleanText(160),
            introduction: cleanText(600),
            buttonLabel: cleanText(80),
          })
          .strict(),
        categories: z
          .object({
            visible: z.boolean(),
            heading: cleanText(160),
            linkLabel: cleanText(80),
            limit: z.number().int().min(1).max(12),
            images: z
              .record(z.string().regex(/^[1-9][0-9]*$/), categoryImageSchema)
              .refine((images) => Object.keys(images).length <= 100),
          })
          .strict(),
        products: z
          .object({
            visible: z.boolean(),
            heading: cleanText(160),
            linkLabel: cleanText(80),
            productIds: z
              .array(z.string().regex(/^[1-9][0-9]*$/))
              .max(8)
              .refine((ids) => new Set(ids).size === ids.length),
          })
          .strict(),
        impact: z
          .object({
            visible: z.boolean(),
            imageAlt: cleanText(200),
          })
          .strict(),
        footer: z
          .object({
            tagline: cleanText(240),
            shopLabel: cleanText(60),
            storyLabel: cleanText(60),
          })
          .strict(),
        pages: z
          .object({
            shopHeading: cleanText(160),
            shopIntroduction: cleanText(600),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type EditorialMarketTemplate = z.infer<
  typeof editorialMarketTemplateSchema
>;
export type EditorialMarketSettings = EditorialMarketTemplate['settings'];

export const editorialMarketPhoto: EditorialMarketPhoto = {
  assetId: null,
  url: '',
  alt: '',
};

export function editorialMarketStarterSettings(): EditorialMarketSettings {
  return editorialMarketTemplateSchema.parse({
    id: 'editorial-market',
    version: 1,
    settings: {
      version: 1,
      assets: {
        desktopHero: { ...editorialMarketPhoto },
        mobileHero: { ...editorialMarketPhoto },
        desktopFooter: { ...editorialMarketPhoto },
        mobileFooter: { ...editorialMarketPhoto },
      },
      header: {
        announcement: 'Fresh, local food from our community to your table.',
        shopLabel: 'Shop',
        storyLabel: 'Our Story',
        findUsLabel: 'Find Us',
        contactLabel: 'Contact',
      },
      hero: {
        heading: 'Good Food Grows Here',
        introduction:
          'Shop fresh, seasonal produce, pasture-raised meats, artisan goods, and more from local farmers and makers in our community.',
        buttonLabel: 'Shop the Market',
      },
      categories: {
        visible: true,
        heading: 'Shop by Category',
        linkLabel: 'See all',
        limit: 8,
        images: {},
      },
      products: {
        visible: true,
        heading: 'Featured Products',
        linkLabel: 'See all',
        productIds: [],
      },
      impact: {
        visible: true,
        imageAlt:
          'Supporting local farmers builds stronger communities and healthier food systems.',
      },
      footer: {
        tagline: 'Fresh food from local farms and makers.',
        shopLabel: 'Shop',
        storyLabel: 'Our Story',
      },
      pages: {
        shopHeading: 'Shop the Market',
        shopIntroduction:
          'Browse fresh food and locally made goods available for market pickup.',
      },
    },
  }).settings;
}

export function isEditorialMarket(value: unknown): value is {
  theme: 'editorial-market';
  template: EditorialMarketTemplate;
} {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { theme?: unknown }).theme === 'editorial-market' &&
    editorialMarketTemplateSchema.safeParse(
      (value as { template?: unknown }).template,
    ).success
  );
}

/** Copy for a market's original call-to-action banner (its market text). */
export type EditorialMarketClosing = {
  heading: string;
  body: string;
  label: string;
  destination: string;
};
export const editorialMarketClosingSectionId = 'cta-banner-market-closing';

/** Upgrade old homepage slots to the same editable instances used by Add Section.
 * An explicit composition is authoritative: deleted instances never regenerate. */
export function editorialHomepageComposition(
  settings: EditorialMarketSettings,
  catalog: { productIds?: string[]; categoryIds?: string[] } = {},
  market = false,
  closing?: EditorialMarketClosing,
): EditorialHomepageSection[] {
  // Market natives render live market data, so they are never converted to
  // showcases. The static call-to-action banner becomes the styleable
  // Call-to-Action Banner section, seeded with the market's banner copy.
  if (market)
    return (
      isEditorialMarketHomepageComposition(settings.composition)
        ? settings.composition!
        : editorialMarketOriginalSections.map((id) => ({ id }))
    ).map((section) => {
      if ('type' in section || section.id !== 'closing' || !closing)
        return section;
      const banner = createWebsiteSection(
        'cta-banner',
        editorialMarketClosingSectionId,
        editorialHomepageTarget,
      );
      banner.content = { ...closing };
      banner.presentation = {
        ...banner.presentation,
        alignment: 'left',
        background: 'paper',
      };
      return banner;
    });
  return (
    settings.composition ?? editorialOriginalSections.map((id) => ({ id }))
  ).map((section) => {
    if (
      'type' in section ||
      (section.id !== 'products' && section.id !== 'categories')
    )
      return section;
    if (section.id === 'products') {
      const showcase = createWebsiteSection(
        'product-showcase',
        'product-showcase-homepage',
        editorialHomepageTarget,
      );
      showcase.visible = settings.products.visible;
      showcase.content.heading = settings.products.heading;
      showcase.content.body = '';
      showcase.content.productIds = settings.products.productIds.length
        ? [...settings.products.productIds]
        : (catalog.productIds ?? []).slice(0, 4);
      showcase.presentation.columns = 4;
      return showcase;
    }
    const showcase = createWebsiteSection(
      'category-showcase',
      'category-showcase-homepage',
      editorialHomepageTarget,
    );
    showcase.visible = settings.categories.visible;
    showcase.content.heading = settings.categories.heading;
    showcase.content.body = '';
    showcase.content.categoryIds = (catalog.categoryIds ?? []).slice(
      0,
      Math.min(8, settings.categories.limit),
    );
    return showcase;
  });
}
