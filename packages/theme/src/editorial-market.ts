import { z } from 'zod';

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
