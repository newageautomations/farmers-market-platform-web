import { z } from 'zod';
import {
  websiteSectionSchema,
  permitsWebsiteSectionPresentation,
  homepageDesignSchema,
  websiteSectionManifest,
  websiteSectionLimit,
} from './website-sections';

const copy = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v));
const destination = z
  .string()
  .max(300)
  .refine((v) =>
    /^\/(?:$|products(?:\/[a-zA-Z0-9_%~-]+|\?category=[a-zA-Z0-9_-]+)?$|about$|find-us$|contact$|faq$|policies$)/.test(
      v,
    ),
  );
const photo = z
  .object({
    assetId: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .nullable(),
    url: z.string().max(2000),
    alt: copy(200),
    desktop: z.enum(['center', 'top', 'bottom', 'left', 'right']),
    mobile: z.enum(['center', 'top', 'bottom', 'left', 'right']),
  })
  .strict()
  .refine(
    (v) =>
      !!v.assetId === !!v.url &&
      (!v.url ||
        (() => {
          try {
            const u = new URL(v.url);
            return (
              !u.username &&
              !u.password &&
              (u.protocol === 'https:' ||
                (u.protocol === 'http:' &&
                  (u.hostname === 'localhost' ||
                    u.hostname.endsWith('.localhost') ||
                    u.hostname === '127.0.0.1')))
            );
          } catch {
            return false;
          }
        })()),
  );
export const farmhouseSectionKinds = [
  'cinematic',
  'discovery',
  'products',
  'story',
  'collection',
  'invitation',
] as const;
export const farmhouseHomepageTarget = {
  theme: 'modern-farmhouse',
  themeVersion: 2,
  page: 'home',
} as const;
const farmhouseOriginalSectionSchema = z
  .object({
    id: z.enum(farmhouseSectionKinds),
    visible: z.boolean(),
    heading: copy(160),
    body: copy(1200),
    label: copy(80),
    destination,
    photo,
    tiles: z
      .array(
        z
          .object({
            title: copy(100),
            body: copy(300),
            destination,
            photo,
          })
          .strict(),
      )
      .max(3),
    productIds: z
      .array(z.string().regex(/^[1-9][0-9]*$/))
      .max(12)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export type FarmhouseSection = z.infer<typeof farmhouseOriginalSectionSchema>;
export const farmhouseSettingsSchema = z
  .object({
    version: z.literal(2),
    homepageDesign: homepageDesignSchema.optional(),
    scrollFade: z.boolean().optional(),
    palette: z.enum([
      'evergreen',
      'clay',
      'charcoal',
      'sage',
      'terracotta',
      'blue',
      'harvest-charcoal',
    ]),
    typography: z.enum([
      'literary',
      'classic',
      'editorial',
      'minimal',
      'warm',
      'friendly',
      'refined',
    ]),
    header: z
      .object({
        logo: photo.optional(),
        overlay: z.boolean(),
        message: copy(120),
        shopLabel: copy(60),
        storyLabel: copy(60),
      })
      .strict(),
    footer: z.object({ invitation: copy(200), tagline: copy(300) }).strict(),
    pages: z
      .object({
        shopHeading: copy(160),
        shopIntroduction: copy(600),
        storyLayout: z.enum(['alternating', 'image-first']),
        gallery: z.enum(['mosaic', 'rail']),
      })
      .strict(),
    sections: z
      .array(z.union([farmhouseOriginalSectionSchema, websiteSectionSchema]))
      .min(6)
      .max(6 + websiteSectionLimit)
      .refine(
        (sections) =>
          new Set(sections.map((section) => section.id)).size ===
            sections.length &&
          farmhouseSectionKinds.every((id) =>
            sections.some((section) => section.id === id),
          ) &&
          sections.every(
            (section) =>
              !('type' in section) ||
              permitsWebsiteSectionPresentation(
                section,
                farmhouseHomepageTarget,
              ),
          ) &&
          Object.values(websiteSectionManifest).every(
            (definition) =>
              sections.filter(
                (section) =>
                  'type' in section && section.type === definition.type,
              ).length <= definition.maxInstances,
          ),
      ),
  })
  .strict();
export type FarmhouseSettings = z.infer<typeof farmhouseSettingsSchema>;
export type FarmhouseHomepageSection = FarmhouseSettings['sections'][number];
export const farmhousePhoto = {
  assetId: null,
  url: '',
  alt: '',
  desktop: 'center',
  mobile: 'center',
} as const;
export function farmhouseDefaults(): Omit<FarmhouseSettings, 'sections'> & {
  sections: FarmhouseSection[];
} {
  // Hero, featured products, categories (discovery), then the closing
  // invitation, like every vendor theme; story and collection sit before it.
  const content = [
    [
      'cinematic',
      'Good food. A little closer.',
      'Discover the people and produce behind your next market visit.',
      'Explore the shop',
      '/products',
    ],
    [
      'products',
      'From our market table',
      'A few things to bring home and make your own.',
      'Visit the shop',
      '/products',
    ],
    [
      'discovery',
      'Make room for something good.',
      'Explore the shop, one delicious discovery at a time.',
      'Browse all products',
      '/products',
    ],
    [
      'story',
      'Every table has a story.',
      'Meet the people behind the food, and discover what brings us to the market.',
      'Read our story',
      '/about',
    ],
    [
      'collection',
      'A closer look',
      'Something from our shop, ready for your next market visit.',
      'Discover more',
      '/products',
    ],
    [
      'invitation',
      'See you at the market.',
      'Explore our products and choose an available pickup market.',
      'Find your next favorite',
      '/products',
    ],
  ];
  return farmhouseSettingsSchema.parse({
    version: 2,
    palette: 'evergreen',
    typography: 'literary',
    header: {
      overlay: true,
      message: 'Explore the shop. Plan your next market visit.',
      shopLabel: 'The shop',
      storyLabel: 'Our story',
    },
    footer: {
      invitation: 'Good things begin around a table.',
      tagline: 'Explore our shop and find us at the market.',
    },
    pages: {
      shopHeading: 'The market table',
      shopIntroduction:
        'Browse our collection. Choose a pickup market to see what is available for your visit.',
      storyLayout: 'alternating',
      gallery: 'mosaic',
    },
    sections: content.map(([id, heading, body, label, destination]) => ({
      id,
      heading,
      body,
      label,
      destination,
      visible: true,
      photo: { ...farmhousePhoto },
      tiles: [],
      productIds: [],
    })),
  }) as Omit<FarmhouseSettings, 'sections'> & { sections: FarmhouseSection[] };
}
export const farmhouseTemplateSchema = z
  .object({
    id: z.literal('modern-farmhouse'),
    version: z.literal(2),
    settings: farmhouseSettingsSchema,
  })
  .strict();
export function isFarmhouse(config?: { template?: unknown }) {
  return farmhouseTemplateSchema.safeParse(config?.template).success;
}

/** Shared page editors retain their bounded text-size controls in this renderer. */
export function farmhouseTextSizeCss(config: {
  textSizes?: Record<string, { heading: number; paragraph: number }>;
}) {
  return Object.entries(config.textSizes ?? {})
    .filter(
      ([id, size]) =>
        /^(?:story:[a-zA-Z0-9_-]+|story-cta|find-intro|find-cta)$/.test(id) &&
        Number.isInteger(size.heading) &&
        size.heading >= 75 &&
        size.heading <= 200 &&
        Number.isInteger(size.paragraph) &&
        size.paragraph >= 75 &&
        size.paragraph <= 150,
    )
    .map(
      ([id, size]) =>
        `html[data-template-version='2'] [data-editor-section="${id}"]{--farmhouse-heading-scale:${size.heading / 100};--farmhouse-paragraph-scale:${size.paragraph / 100}}`,
    )
    .join('');
}
