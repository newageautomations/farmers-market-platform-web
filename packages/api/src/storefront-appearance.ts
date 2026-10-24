import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
import { createVendorCategoryApi } from './vendor-categories';
export interface StorefrontAppearanceConfig {
  textSizes?: Record<string, { heading: number; paragraph: number }>;
  theme: 'harvest';
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
}
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
  const products = parse(
    'query StorefrontProducts($search: String) { ownStorefrontProducts(search: $search) }',
  ) as TypedDocumentNode<
    {
      ownStorefrontProducts: Array<{ id: string; name: string; slug?: string }>;
    },
    { search: string }
  >;
  const preview = parse(
    'mutation StartStorefrontPreview($id: ID!) { startStorefrontPreview(id: $id) }',
  ) as TypedDocumentNode<
    {
      startStorefrontPreview: { token: string; expiresAt: number; url: string };
    },
    { id: string }
  >;
  return {
    media: options.channelToken
      ? createVendorCategoryApi({
          ...options,
          channelToken: options.channelToken,
        })
      : undefined,
    preview: async (id: string) =>
      (await execute({ api: 'admin', document: preview }, { id }))
        .startStorefrontPreview,
    products: async (search = '') =>
      (await execute({ api: 'admin', document: products }, { search }))
        .ownStorefrontProducts,
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
  'products' | 'preview' | 'media'
> &
  Partial<
    Pick<
      ReturnType<typeof createStorefrontAppearanceApi>,
      'products' | 'preview' | 'media'
    >
  >;
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
