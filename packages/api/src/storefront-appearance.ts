type WebsiteSectionImage = { assetId: string | null; url: string; alt: string };
type HarvestPresentation = {
  alignment: 'left' | 'center' | 'right';
  background: 'paper' | 'surface' | 'ink';
  spacing: 'compact' | 'balanced' | 'spacious';
  variant?: never;
  sizing?: never;
};
type HarvestSection<T extends string, C, P> = {
  id: string;
  type: T;
  version: 1;
  visible: boolean;
  content: C;
  presentation: HarvestPresentation & P;
};
type WebsiteImageBannerSection = HarvestSection<
  'image-banner',
  {
    heading: string;
    body: string;
    introduction: string;
    image: WebsiteSectionImage;
    label: string;
    destination: string;
  },
  {
    layout: 'photo-overlay' | 'split-editorial' | 'minimal-centered';
    width: 'full' | 'contained';
    placement: 'top' | 'middle' | 'bottom';
    focalPoint: 'center' | 'top' | 'bottom' | 'left' | 'right';
    overlay: 'none' | 'subtle' | 'strong';
    height: 'small' | 'medium' | 'large';
  }
>;
type WebsiteGalleryImage = {
  id: string;
  image: WebsiteSectionImage;
  caption: string;
};
type WebsiteImageGallerySection = HarvestSection<
  'image-gallery',
  { heading: string; body: string; images: WebsiteGalleryImage[] },
  {
    layout: 'grid' | 'mosaic' | 'strip' | 'carousel';
    aspectRatio: 'square' | 'portrait' | 'landscape';
    captions: boolean;
    visibleImages?: 1 | 2 | 3 | 4;
  }
>;
type WebsiteFeatureItem = {
  id: string;
  title: string;
  description: string;
  icon:
    '' | 'carrot' | 'apple' | 'heart' | 'truck' | 'map-pin' | 'shield-check';
};
type WebsiteFeatureGridSection = HarvestSection<
  'feature-grid',
  { heading: string; body: string; items: WebsiteFeatureItem[] },
  {
    columns: 2 | 3 | 4;
    iconPosition: 'above' | 'beside';
    iconSize?: number;
    cardStyle: 'standard' | 'highlighted' | 'bordered';
  }
>;
type WebsiteProductShowcaseSection = HarvestSection<
  'product-showcase',
  {
    heading: string;
    body: string;
    productIds: string[];
    showShopLink: boolean;
  },
  {
    layout: 'grid' | 'featured-product' | 'compact-row' | 'carousel';
    columns: 2 | 3 | 4;
    visibleImages?: 1 | 2 | 3 | 4;
  }
>;
type WebsiteCategoryShowcaseSection = HarvestSection<
  'category-showcase',
  {
    heading: string;
    body: string;
    categoryIds: string[];
    showShopLink: boolean;
  },
  {
    layout: 'cards' | 'photo-tiles' | 'compact';
    aspectRatio: 'square' | 'portrait' | 'landscape';
  }
>;
type HarvestExpandedSection =
  | WebsiteImageBannerSection
  | WebsiteImageGallerySection
  | WebsiteFeatureGridSection
  | WebsiteProductShowcaseSection
  | WebsiteCategoryShowcaseSection;

type WebsiteImageTextLegacyContent = {
  blocks?: never;
  heading: string;
  body: string;
  image: { assetId: string | null; url: string; alt: string };
  label: string;
  destination: string;
};
type WebsiteBlock = {
  id: string;
  version: 1;
  visible: boolean;
} & (
  | {
      type: 'heading' | 'paragraph' | 'eyebrow';
      content: { text: string };
      presentation: { size?: 'standard' | 'large'; scale?: number };
    }
  | {
      type: 'image';
      content: WebsiteImageTextLegacyContent['image'];
      presentation: Record<string, never>;
    }
  | {
      type: 'button';
      content: { label: string; destination: string };
      presentation: { style?: 'primary' | 'secondary'; scale?: number };
    }
);
type HomepageDesign = {
  spacing?: 'compact' | 'balanced' | 'spacious';
  typographyScale?: 'standard' | 'expressive';
};
type WebsiteSectionSizing = Partial<
  Record<
    | 'heading'
    | 'paragraph'
    | 'button'
    | 'imageWidth'
    | 'imageHeight'
    | 'width'
    | 'height'
    | 'gap'
    | 'padding',
    number
  >
>;
/** Transport-only shape, structurally checked against the theme contract by editor calls. */
type WebsiteSection =
  | HarvestExpandedSection
  | {
      id: string;
      type: 'text';
      version: 1;
      visible: boolean;
      content: { heading: string; body: string };
      presentation: {
        alignment: 'left' | 'center' | 'right';
        variant?: 'standard' | 'featured' | 'framed';
        sizing?: WebsiteSectionSizing;
      };
    }
  | {
      id: string;
      type: 'image-with-text';
      version: 1;
      visible: boolean;
      content:
        | WebsiteImageTextLegacyContent
        | {
            blocks: WebsiteBlock[];
            heading?: never;
            body?: never;
            image?: never;
            label?: never;
            destination?: never;
          };
      presentation: {
        variant?: 'standard' | 'featured' | 'framed';
        sizing?: WebsiteSectionSizing;
        alignment: 'left' | 'center' | 'right';
        imageSide: 'left' | 'right' | 'background';
        imageSize: 'small' | 'medium' | 'large';
        columnRatio?: '50-50' | '40-60' | '60-40';
        verticalAlignment?: 'top' | 'center' | 'bottom';
        spacing?: 'compact' | 'balanced' | 'spacious';
        background: 'paper' | 'surface' | 'ink';
      };
    }
  | {
      id: string;
      type: 'cta-banner';
      version: 1;
      visible: boolean;
      content: {
        heading: string;
        body: string;
        label: string;
        destination: string;
      };
      presentation: {
        variant?: 'standard' | 'featured' | 'framed';
        sizing?: WebsiteSectionSizing;
        alignment: 'left' | 'center';
        background: 'paper' | 'surface' | 'ink';
      };
    };
interface FarmhousePhoto {
  assetId: string | null;
  url: string;
  alt: string;
  desktop: 'center' | 'top' | 'bottom' | 'left' | 'right';
  mobile: 'center' | 'top' | 'bottom' | 'left' | 'right';
}
import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
import {
  createVendorCategoryApi,
  type CategoryImage,
} from './vendor-categories';
import { uploadDocumentFile } from './document-upload';
import { createProductTaxonomyApi } from './product-taxonomy';
export interface StorefrontAppearanceConfig {
  market?: {
    text?: Partial<Record<string, string>>;
    heroPrimaryDestination?: string;
    heroSecondaryDestination?: string;
    heroImageAssetId?: string | null;
    marketsCardTheme?: 'standard' | 'inverse' | 'soft';
    vendorsCardTheme?: 'standard' | 'inverse' | 'soft';
    heroShape: 'square' | 'rounded' | 'circle' | 'dome' | 'star' | 'corner';
    typography: 'editorial' | 'minimal' | 'warm' | 'friendly' | 'refined';
    pages: Record<
      'market-dates' | 'vendors' | 'applications',
      { enabled: boolean; title: string; description: string }
    >;
  };
  harvestComposition?: Array<
    | {
        id:
          | 'hero'
          | 'featured'
          | 'about'
          | 'closing'
          | 'markets'
          | 'vendors'
          | 'categories';
      }
    | WebsiteSection
  >;
  pageSections?: Partial<
    Record<
      | 'about'
      | 'contact'
      | 'faq'
      | 'policies'
      | 'find-us'
      | 'products'
      | 'market-dates'
      | 'vendors'
      | 'applications',
      {
        before?: WebsiteSection[];
        after?: WebsiteSection[];
        closingPosition?: number;
      }
    >
  >;
  categoryPresentation?: Record<
    string,
    {
      position: number;
      visible: boolean;
      imageAssetId: string | null;
      image: string;
    }
  >;
  template?:
    | {
        id: 'modern-farmhouse';
        version: 2;
        settings: {
          version: 2;
          homepageDesign?: HomepageDesign;
          scrollFade?: boolean;
          palette:
            | 'evergreen'
            | 'clay'
            | 'charcoal'
            | 'sage'
            | 'terracotta'
            | 'blue'
            | 'harvest-charcoal';
          typography:
            | 'literary'
            | 'classic'
            | 'editorial'
            | 'minimal'
            | 'warm'
            | 'friendly'
            | 'refined';
          header: {
            logo?: FarmhousePhoto;
            overlay: boolean;
            message: string;
            shopLabel: string;
            storyLabel: string;
          };
          footer: { invitation: string; tagline: string };
          pages: {
            shopHeading: string;
            shopIntroduction: string;
            storyLayout: 'alternating' | 'image-first';
            gallery: 'mosaic' | 'rail';
          };
          sections: Array<
            | WebsiteSection
            | {
                id:
                  | 'cinematic'
                  | 'discovery'
                  | 'products'
                  | 'story'
                  | 'collection'
                  | 'invitation';
                visible: boolean;
                heading: string;
                body: string;
                label: string;
                destination: string;
                photo: FarmhousePhoto;
                tiles: Array<{
                  title: string;
                  body: string;
                  destination: string;
                  photo: FarmhousePhoto;
                }>;
                productIds: string[];
              }
          >;
        };
      }
    | {
        id: 'editorial-market';
        version: 1;
        settings: {
          version: 1;
          homepageDesign?: HomepageDesign;
          composition?: Array<
            | {
                id:
                  | 'hero'
                  | 'categories'
                  | 'products'
                  | 'impact'
                  | 'markets'
                  | 'vendors'
                  | 'closing';
              }
            | WebsiteSection
          >;
          assets: Record<
            'desktopHero' | 'mobileHero' | 'desktopFooter' | 'mobileFooter',
            {
              assetId: string | null;
              url: string;
              alt: string;
            }
          >;
          header: {
            announcement: string;
            shopLabel: string;
            storyLabel: string;
            findUsLabel: string;
            contactLabel: string;
          };
          hero: { heading: string; introduction: string; buttonLabel: string };
          categories: {
            visible: boolean;
            heading: string;
            linkLabel: string;
            limit: number;
            images: Record<string, { assetId: string; url: string }>;
          };
          products: {
            visible: boolean;
            heading: string;
            linkLabel: string;
            productIds: string[];
          };
          impact: { visible: boolean; imageAlt: string };
          footer: { tagline: string; shopLabel: string; storyLabel: string };
          pages: { shopHeading: string; shopIntroduction: string };
        };
      };
  textSizes?: Record<string, { heading: number; paragraph: number }>;
  theme:
    | 'harvest'
    | 'modern-farmhouse'
    | 'editorial-market'
    | 'meadow'
    | 'hearth'
    | 'pasture'
    | 'bloom';
  palette: 'sage' | 'terracotta' | 'blue' | 'charcoal';
  buttonShape: 'square' | 'soft' | 'pill';
  buttonHover: 'lift' | 'darken' | 'outline';
  vendor?: {
    aboutUseLegacyStory?: boolean;
    text?: Partial<
      Record<
        | 'headerShopLabel'
        | 'headerAboutLabel'
        | 'heroPrimaryLabel'
        | 'heroSecondaryLabel'
        | 'featuredHeading'
        | 'featuredLinkLabel'
        | 'aboutHeading'
        | 'aboutLinkLabel'
        | 'closingHeading'
        | 'closingText'
        | 'closingLabel'
        | 'footerTagline'
        | 'footerShopLabel'
        | 'footerAboutLabel',
        string
      >
    >;
    aboutShape?: 'square' | 'rounded' | 'circle' | 'dome' | 'star' | 'corner';
    heroShape: 'square' | 'rounded' | 'circle' | 'dome' | 'star' | 'corner';
    typography: 'editorial' | 'minimal' | 'warm' | 'friendly' | 'refined';
    featuredIds: string[] | null;
    aboutEnabled: boolean;
    aboutBlurb: string;
    aboutImage: string;
    aboutAlt: string;
  };
  homepage: {
    title: string;
    introduction: string;
    image: string;
    story: string;
  };
  terms?: string;
  policies?: {
    version: 1;
    enabled: boolean;
    title: string;
    heading: string;
    description: string;
    policies: Array<{
      id: string;
      title: string;
      content: string;
      visible: boolean;
    }>;
    cta: { heading: string; text: string; label: string };
  };
  faq?: {
    version: 1;
    enabled: boolean;
    title: string;
    heading: string;
    description: string;
    questions: Array<{
      id: string;
      question: string;
      answer: string;
      visible: boolean;
    }>;
    cta: { heading: string; text: string; label: string };
  };
  contact?: {
    enabled: boolean;
    title: string;
    heading: string;
    description: string;
    informationHeading: string;
    socialHeading: string;
    entries: Array<{
      id: string;
      type: 'email' | 'phone' | 'address' | 'instagram' | 'facebook';
      value: string;
      visible: boolean;
    }>;
    cta: { heading: string; text: string; label: string };
  };
  findUs?: {
    enabled: boolean;
    title: string;
    introduction: NonNullable<
      StorefrontAppearanceConfig['about']['sections']
    >[number];
    cta: NonNullable<StorefrontAppearanceConfig['about']['cta']>;
  };
  about: {
    enabled: boolean;
    title: string;
    content: string;
    sectionsVersion?: 1;
    sections?: Array<{
      id: string;
      layout: 'text' | 'image' | 'text-image';
      heading: string;
      body: string;
      imageAssetId: string | null;
      image: string;
      alt: string;
      shape:
        | 'square'
        | 'rounded'
        | 'circle'
        | 'dome'
        | 'star'
        | 'corner'
        | 'natural'
        | 'natural-rounded';
      imagePosition: 'left' | 'right';
      textAlign?: 'left' | 'center' | 'right';
      imageSize?: 'small' | 'medium' | 'large';
      visible: boolean;
    }>;
    cta?: {
      heading: string;
      text: string;
      label: string;
      destination: '/products' | '/';
    };
  };
}
type StorefrontAppearance = StorefrontAppearanceConfig;

export interface StorefrontLink {
  id: string;
  name: string;
  url: string | null;
}
export interface StorefrontAppearanceRecord {
  id: string;
  name: string;
  version: number;
  draft: StorefrontAppearance;
  published: StorefrontAppearance | null;
  publishedAt: string | null;
  isLive?: boolean;
}
export interface StorefrontWebsiteRecord extends StorefrontAppearanceRecord {
  storefrontId: string;
  templateId: string;
  templateVersion: number;
  templateConfig: Record<string, unknown>;
  publishedTemplateConfig?: Record<string, unknown> | null;
  updatedAt: string;
  isLive: boolean;
  publicationVersion: number;
}
export interface StorefrontWebsitePage {
  items: StorefrontWebsiteRecord[];
  totalItems: number;
  live: StorefrontWebsiteRecord | null;
  publicationVersion: number;
}
/** Instance operations remain admin-only and always include their storefront scope. */
export function createWebsiteLibraryApi(options: TransportOptions) {
  const execute = transport('admin', options);
  const list = parse(
    'query Websites($storefrontId: ID!, $skip: Int!, $take: Int!) { ownStorefrontWebsites(storefrontId: $storefrontId, skip: $skip, take: $take) }',
  ) as TypedDocumentNode<
    { ownStorefrontWebsites: StorefrontWebsitePage },
    { storefrontId: string; skip: number; take: number }
  >;
  const read = parse(
    'query Website($storefrontId: ID!, $id: ID!) { ownStorefrontWebsite(storefrontId: $storefrontId, id: $id) }',
  ) as TypedDocumentNode<
    { ownStorefrontWebsite: StorefrontWebsiteRecord },
    { storefrontId: string; id: string }
  >;
  const create = parse(
    'mutation CreateWebsite($storefrontId: ID!, $name: String!, $templateId: String!, $sourceId: ID) { createStorefrontWebsite(storefrontId: $storefrontId, name: $name, templateId: $templateId, sourceId: $sourceId) }',
  ) as TypedDocumentNode<
    { createStorefrontWebsite: StorefrontWebsiteRecord },
    {
      storefrontId: string;
      name: string;
      templateId: string;
      sourceId?: string;
    }
  >;
  const change = parse(
    'mutation ChangeWebsite($storefrontId: ID!, $id: ID!, $version: Int!, $action: String!, $input: JSON, $publicationVersion: Int, $templateConfig: JSON) { changeStorefrontWebsite(storefrontId: $storefrontId, id: $id, version: $version, action: $action, input: $input, publicationVersion: $publicationVersion, templateConfig: $templateConfig) }',
  ) as TypedDocumentNode<
    { changeStorefrontWebsite: StorefrontWebsiteRecord },
    {
      storefrontId: string;
      id: string;
      version: number;
      action: string;
      input?: unknown;
      publicationVersion?: number;
      templateConfig?: Record<string, unknown>;
    }
  >;
  const preview = parse(
    'mutation WebsitePreview($id: ID!, $websiteId: ID!) { startStorefrontPreview(id: $id, websiteId: $websiteId) }',
  ) as TypedDocumentNode<
    {
      startStorefrontPreview: { token: string; expiresAt: number; url: string };
    },
    { id: string; websiteId: string }
  >;
  return {
    list: async (storefrontId: string, skip = 0, take = 20) =>
      (
        await execute(
          { api: 'admin', document: list },
          { storefrontId, skip, take },
        )
      ).ownStorefrontWebsites,
    read: async (storefrontId: string, id: string) =>
      (await execute({ api: 'admin', document: read }, { storefrontId, id }))
        .ownStorefrontWebsite,
    create: async (
      storefrontId: string,
      name: string,
      templateId: string,
      sourceId?: string,
    ) =>
      (
        await execute(
          { api: 'admin', document: create },
          { storefrontId, name, templateId, sourceId },
        )
      ).createStorefrontWebsite,
    change: async (
      record: StorefrontWebsiteRecord,
      action: 'save' | 'publish' | 'rename' | 'delete',
      input?: unknown,
    ) =>
      (
        await execute(
          { api: 'admin', document: change },
          {
            storefrontId: record.storefrontId,
            id: record.id,
            version: record.version,
            action,
            input:
              input && typeof input === 'object' && 'template' in input
                ? Object.fromEntries(
                    Object.entries(input).filter(([key]) => key !== 'template'),
                  )
                : input,
            publicationVersion: record.publicationVersion,
            templateConfig:
              input && typeof input === 'object' && 'template' in input
                ? (input as StorefrontAppearanceConfig).template?.settings
                : record.templateConfig,
          },
        )
      ).changeStorefrontWebsite,
    preview: async (storefrontId: string, websiteId: string) =>
      (
        await execute(
          { api: 'admin', document: preview },
          { id: storefrontId, websiteId },
        )
      ).startStorefrontPreview,
  };
}
export type WebsiteLibraryApi = ReturnType<typeof createWebsiteLibraryApi>;
/** Admin-only operations. Public pages use the existing host-resolved published DTO. */
export function createStorefrontAppearanceApi(options: TransportOptions) {
  const execute = transport('admin', options);
  const read = parse(
    'query OwnStorefrontAppearance { ownStorefrontAppearance }',
  ) as TypedDocumentNode<
    { ownStorefrontAppearance: StorefrontAppearanceRecord[] },
    Record<string, never>
  >;
  const links = parse(
    'query OwnStorefrontLinks { ownStorefrontLinks }',
  ) as TypedDocumentNode<
    { ownStorefrontLinks: StorefrontLink[] },
    Record<string, never>
  >;
  const save = parse(
    'mutation SaveOwnStorefrontAppearance($id: ID!, $version: Int!, $config: JSON!) { saveOwnStorefrontAppearance(id: $id, version: $version, config: $config) }',
  ) as TypedDocumentNode<
    { saveOwnStorefrontAppearance: StorefrontAppearanceRecord },
    { id: string; version: number; config: StorefrontAppearance }
  >;
  const publish = parse(
    'mutation PublishOwnStorefrontAppearance($id: ID!, $version: Int!) { publishOwnStorefrontAppearance(id: $id, version: $version) }',
  ) as TypedDocumentNode<
    { publishOwnStorefrontAppearance: StorefrontAppearanceRecord },
    { id: string; version: number }
  >;
  const showcaseCategories = parse(
    'query OwnStorefrontShowcaseCategories { ownStorefrontShowcaseCategories }',
  ) as TypedDocumentNode<
    {
      ownStorefrontShowcaseCategories: Array<{
        id: string;
        name: string;
        pathIds?: string[];
      }>;
    },
    Record<string, never>
  >;
  const products = parse(
    'query StorefrontProducts($search: String, $ids: [ID!]) { ownStorefrontProducts(search: $search, ids: $ids) }',
  ) as TypedDocumentNode<
    {
      ownStorefrontProducts: Array<{ id: string; name: string; slug?: string }>;
    },
    { search: string; ids?: string[] }
  >;
  const preview = parse(
    'mutation StartStorefrontPreview($id: ID!) { startStorefrontPreview(id: $id) }',
  ) as TypedDocumentNode<
    {
      startStorefrontPreview: { token: string; expiresAt: number; url: string };
    },
    { id: string }
  >;
  const themeAssets = parse(
    'query StorefrontThemeAssets($themeId: String!) { ownStorefrontThemeAssets(themeId: $themeId) }',
  ) as TypedDocumentNode<
    {
      ownStorefrontThemeAssets: Array<{
        id: string;
        name: string;
        preview: string;
        source?: string;
        placement?: string;
      }>;
    },
    { themeId: string }
  >;
  const images = parse(
    'query OwnStorefrontImages($skip: Int) { ownStorefrontImages(skip: $skip) }',
  ) as TypedDocumentNode<
    { ownStorefrontImages: CategoryImage[] },
    { skip: number }
  >;
  return {
    hierarchy: options.channelToken
      ? createProductTaxonomyApi({
          ...options,
          channelToken: options.channelToken,
        }).hierarchy
      : undefined,
    media: options.channelToken
      ? {
          ...createVendorCategoryApi({
            ...options,
            channelToken: options.channelToken,
          }),
          images: async (skip = 0) =>
            (await execute({ api: 'admin', document: images }, { skip }))
              .ownStorefrontImages,
          upload: (file: File) =>
            uploadDocumentFile(
              { ...options, channelToken: options.channelToken! },
              parse(
                'mutation UploadOwnStorefrontImage($input: JSON!, $file: Upload!) { uploadOwnStorefrontImage(input:$input,file:$file) }',
              ),
              'uploadOwnStorefrontImage',
              file,
              {},
            ) as Promise<CategoryImage>,
          themeImages: async (themeId: string) =>
            (
              await execute(
                { api: 'admin', document: themeAssets },
                { themeId },
              )
            ).ownStorefrontThemeAssets.filter(
              (image) =>
                themeId !== 'editorial-market' ||
                image.placement?.startsWith('category-library-'),
            ),
        }
      : undefined,
    preview: async (id: string) =>
      (await execute({ api: 'admin', document: preview }, { id }))
        .startStorefrontPreview,
    showcaseCategories: async () =>
      (await execute({ api: 'admin', document: showcaseCategories }, {}))
        .ownStorefrontShowcaseCategories,
    products: async (search = '', ids?: string[]) =>
      (
        await execute({ api: 'admin', document: products }, { search, ids })
      ).ownStorefrontProducts.map((product) => ({
        ...product,
        id: String(product.id),
      })),
    read: async () =>
      (await execute({ api: 'admin', document: read }, {}))
        .ownStorefrontAppearance,
    links: async () =>
      (await execute({ api: 'admin', document: links }, {})).ownStorefrontLinks,
    save: async (id: string, version: number, config: StorefrontAppearance) =>
      (await execute({ api: 'admin', document: save }, { id, version, config }))
        .saveOwnStorefrontAppearance,
    publish: async (id: string, version: number) =>
      (await execute({ api: 'admin', document: publish }, { id, version }))
        .publishOwnStorefrontAppearance,
  };
}
export type StorefrontAppearanceApi = Omit<
  ReturnType<typeof createStorefrontAppearanceApi>,
  'products' | 'preview' | 'media' | 'hierarchy' | 'showcaseCategories'
> &
  Partial<
    Pick<
      ReturnType<typeof createStorefrontAppearanceApi>,
      'products' | 'preview' | 'hierarchy' | 'showcaseCategories'
    >
  > & {
    media?: Omit<
      NonNullable<ReturnType<typeof createStorefrontAppearanceApi>['media']>,
      'themeImages'
    > &
      Partial<
        Pick<
          NonNullable<
            ReturnType<typeof createStorefrontAppearanceApi>['media']
          >,
          'themeImages'
        >
      >;
  };
export function safeStorefrontUrl(value: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    const local =
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.hostname.endsWith('.localhost');
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.hash ||
      url.search
    )
      throw new AppError('validation');
    return url.origin;
  } catch {
    return;
  }
}
