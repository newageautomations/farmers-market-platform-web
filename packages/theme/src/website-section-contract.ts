/** Canonical dependency-free contract. The API keeps a byte-identical copy;
 * tests enforce parity. No runtime imports between the repositories are needed. */
/** Market-only Harvest pages. Vendor storefronts never route them. */
export const marketWebsitePages = [
  'market-dates',
  'vendors',
  'applications',
] as const;
export type MarketWebsitePage = (typeof marketWebsitePages)[number];
const harvestEditorialPages = [
  'home',
  'about',
  'contact',
  'faq',
  'policies',
  'find-us',
  'products',
  ...marketWebsitePages,
] as const;
const harvestMediaPages = [
  'home',
  'about',
  'find-us',
  ...marketWebsitePages,
] as const;
const harvestShopPages = ['home', 'about'] as const;
export const harvestFeatureIcons = [
  'carrot',
  'apple',
  'heart',
  'truck',
  'map-pin',
  'shield-check',
] as const;
const harvestSectionBase = {
  version: 1,
  themes: [
    { id: 'harvest', version: 1 },
    { id: 'modern-farmhouse', version: 2 },
    { id: 'editorial-market', version: 1 },
    { id: 'meadow', version: 1 },
    { id: 'hearth', version: 1 },
    { id: 'bloom', version: 1 },
  ],
  repeatable: true,
  maxInstances: 12,
  variants: {
    harvest: ['standard'],
    'modern-farmhouse': ['standard'],
    'editorial-market': ['standard'],
    meadow: ['standard'],
    hearth: ['standard'],
    bloom: ['standard'],
  },
  alignments: ['left', 'center', 'right'],
  backgrounds: ['paper', 'surface', 'ink'],
  limits: { heading: 160, body: 1200, label: 80 },
} as const;
const harvestPresentation = {
  alignment: 'left',
  background: 'paper',
  spacing: 'balanced',
} as const;
const emptySectionImage = { assetId: null, url: '', alt: '' };
export const harvestExpandedSectionManifest = {
  'image-banner': {
    ...harvestSectionBase,
    type: 'image-banner',
    limits: { ...harvestSectionBase.limits, introduction: 80, alt: 200 },
    label: 'Image Banner',
    category: 'Media',
    icon: 'image',
    description:
      'A photograph with an invitation, split story or centered composition.',
    pages: harvestEditorialPages,
    defaults: {
      content: {
        heading: 'Good things grow here',
        body: 'Discover the care behind every harvest.',
        introduction: '',
        image: emptySectionImage,
        label: '',
        destination: '/products',
      },
      presentation: {
        ...harvestPresentation,
        layout: 'photo-overlay',
        width: 'contained',
        placement: 'middle',
        focalPoint: 'center',
        overlay: 'strong',
        height: 'medium',
      },
    },
    editor: 'harvest-expanded',
    renderers: {
      harvest: 'harvest-image-banner',
      'modern-farmhouse': 'farmhouse-image-banner',
      'editorial-market': 'editorial-image-banner',
      meadow: 'harvest-image-banner',
      hearth: 'harvest-image-banner',
      bloom: 'harvest-image-banner',
    },
  },
  'image-gallery': {
    ...harvestSectionBase,
    type: 'image-gallery',
    limits: { ...harvestSectionBase.limits, images: 8, alt: 200, caption: 200 },
    label: 'Image Gallery',
    category: 'Media',
    icon: 'image',
    description:
      'Gather up to eight photographs in a grid, mosaic or editorial strip.',
    pages: harvestMediaPages,
    defaults: {
      content: { heading: 'A glimpse of life here', body: '', images: [] },
      presentation: {
        ...harvestPresentation,
        layout: 'grid',
        aspectRatio: 'landscape',
        captions: true,
      },
    },
    editor: 'harvest-expanded',
    renderers: {
      harvest: 'harvest-image-gallery',
      'modern-farmhouse': 'farmhouse-image-gallery',
      'editorial-market': 'editorial-image-gallery',
      meadow: 'harvest-image-gallery',
      hearth: 'harvest-image-gallery',
      bloom: 'harvest-image-gallery',
    },
  },
  'feature-grid': {
    ...harvestSectionBase,
    type: 'feature-grid',
    limits: {
      ...harvestSectionBase.limits,
      items: 6,
      title: 120,
      description: 400,
    },
    alignments: ['left', 'center'],
    label: 'Feature Grid',
    category: 'Content',
    icon: 'grid',
    description:
      'Share the values and details that make your business special.',
    pages: harvestEditorialPages,
    defaults: {
      content: {
        heading: 'Grown with care',
        body: '',
        items: [
          {
            id: 'feature-local',
            title: 'Rooted in our community',
            description:
              'Good food, familiar faces and a little closer to home.',
            icon: 'carrot',
          },
          {
            id: 'feature-care',
            title: 'Care in every detail',
            description: 'From our hands to your table.',
            icon: 'heart',
          },
        ],
      },
      presentation: {
        ...harvestPresentation,
        columns: 3,
        iconPosition: 'above',
        cardStyle: 'standard',
      },
    },
    editor: 'harvest-expanded',
    renderers: {
      harvest: 'harvest-feature-grid',
      'modern-farmhouse': 'farmhouse-feature-grid',
      'editorial-market': 'editorial-feature-grid',
      meadow: 'harvest-feature-grid',
      hearth: 'harvest-feature-grid',
      bloom: 'harvest-feature-grid',
    },
  },
  'product-showcase': {
    ...harvestSectionBase,
    type: 'product-showcase',
    limits: { ...harvestSectionBase.limits, products: 8 },
    label: 'Product Showcase',
    category: 'Shop',
    icon: 'grid',
    description: 'Curate up to eight real products from your own catalog.',
    pages: harvestShopPages,
    defaults: {
      content: {
        heading: 'Fresh from our stand',
        body: 'A few favorites, chosen for you.',
        productIds: [],
        showShopLink: true,
      },
      presentation: { ...harvestPresentation, layout: 'grid', columns: 3 },
    },
    editor: 'harvest-expanded',
    renderers: {
      harvest: 'harvest-product-showcase',
      'modern-farmhouse': 'farmhouse-product-showcase',
      'editorial-market': 'editorial-product-showcase',
      meadow: 'harvest-product-showcase',
      hearth: 'harvest-product-showcase',
      bloom: 'harvest-product-showcase',
    },
  },
  'category-showcase': {
    ...harvestSectionBase,
    type: 'category-showcase',
    limits: { ...harvestSectionBase.limits, categories: 8 },
    label: 'Category Showcase',
    category: 'Shop',
    icon: 'grid',
    description: 'Invite visitors into collections from your own catalog.',
    pages: harvestShopPages,
    defaults: {
      content: {
        heading: 'Find your favorites',
        body: '',
        categoryIds: [],
        showShopLink: true,
      },
      presentation: {
        ...harvestPresentation,
        layout: 'cards',
        aspectRatio: 'landscape',
      },
    },
    editor: 'harvest-expanded',
    renderers: {
      harvest: 'harvest-category-showcase',
      'modern-farmhouse': 'farmhouse-category-showcase',
      'editorial-market': 'editorial-category-showcase',
      meadow: 'harvest-category-showcase',
      hearth: 'harvest-category-showcase',
      bloom: 'harvest-category-showcase',
    },
  },
} as const;

export const websiteSectionManifest = {
  ...harvestExpandedSectionManifest,
  text: {
    type: 'text',
    category: 'Content',
    version: 1,
    label: 'Text',
    description: 'Tell your story with a heading and a few paragraphs.',
    icon: 'text',
    pages: [
      'home',
      'about',
      'contact',
      'faq',
      'policies',
      'find-us',
      'products',
      ...marketWebsitePages,
    ],
    themes: [
      { id: 'harvest', version: 1 },
      { id: 'modern-farmhouse', version: 2 },
      { id: 'editorial-market', version: 1 },
      { id: 'meadow', version: 1 },
      { id: 'hearth', version: 1 },
      { id: 'bloom', version: 1 },
    ],
    variants: {
      harvest: ['standard', 'featured', 'framed'],
      'modern-farmhouse': ['standard', 'featured', 'framed'],
      'editorial-market': ['standard', 'featured', 'framed'],
      meadow: ['standard', 'featured', 'framed'],
      hearth: ['standard', 'featured', 'framed'],
      bloom: ['standard', 'featured', 'framed'],
    },
    repeatable: true,
    maxInstances: 12,
    limits: { heading: 160, body: 1200 },
    alignments: ['left', 'center', 'right'],
    defaults: {
      content: {
        heading: 'Share your story',
        body: 'Tell visitors a little more about your farm or business.',
      },
      presentation: { alignment: 'left' },
    },
    editor: 'text',
    renderers: {
      harvest: 'harvest-text',
      'modern-farmhouse': 'farmhouse-text',
      'editorial-market': 'editorial-text',
      meadow: 'harvest-text',
      hearth: 'harvest-text',
      bloom: 'harvest-text',
    },
  },
  'image-with-text': {
    type: 'image-with-text',
    category: 'Content',
    version: 1,
    label: 'Image with Text',
    description: 'Pair a photograph with your story and an optional link.',
    icon: 'image',
    pages: [
      'home',
      'about',
      'contact',
      'faq',
      'policies',
      'find-us',
      'products',
      ...marketWebsitePages,
    ],
    themes: [
      { id: 'harvest', version: 1 },
      { id: 'modern-farmhouse', version: 2 },
      { id: 'editorial-market', version: 1 },
      { id: 'meadow', version: 1 },
      { id: 'hearth', version: 1 },
      { id: 'bloom', version: 1 },
    ],
    variants: {
      harvest: ['standard', 'featured', 'framed'],
      'modern-farmhouse': ['standard', 'featured', 'framed'],
      'editorial-market': ['standard', 'featured', 'framed'],
      meadow: ['standard', 'featured', 'framed'],
      hearth: ['standard', 'featured', 'framed'],
      bloom: ['standard', 'featured', 'framed'],
    },
    repeatable: true,
    maxInstances: 12,
    limits: { heading: 160, body: 1200, alt: 200, label: 80 },
    alignments: ['left', 'center', 'right'],
    imageSides: ['left', 'right', 'background'],
    imageSizes: ['small', 'medium', 'large'],
    backgrounds: ['paper', 'surface', 'ink'],
    defaults: {
      content: {
        heading: 'Rooted in something good',
        body: 'Share the people, places and care behind what you bring to the market.',
        image: { assetId: null, url: '', alt: '' },
        label: '',
        destination: '/about',
      },
      presentation: {
        alignment: 'left',
        imageSide: 'left',
        imageSize: 'medium',
        background: 'paper',
      },
    },
    editor: 'image-with-text',
    renderers: {
      harvest: 'harvest-image-with-text',
      'modern-farmhouse': 'farmhouse-image-with-text',
      'editorial-market': 'editorial-image-with-text',
      meadow: 'harvest-image-with-text',
      hearth: 'harvest-image-with-text',
      bloom: 'harvest-image-with-text',
    },
  },
  'cta-banner': {
    type: 'cta-banner',
    category: 'Content',
    version: 1,
    label: 'Call-to-Action Banner',
    description: 'Invite visitors to explore your shop or discover your story.',
    icon: 'external',
    pages: [
      'home',
      'about',
      'contact',
      'faq',
      'policies',
      'find-us',
      'products',
      ...marketWebsitePages,
    ],
    themes: [
      { id: 'harvest', version: 1 },
      { id: 'modern-farmhouse', version: 2 },
      { id: 'editorial-market', version: 1 },
      { id: 'meadow', version: 1 },
      { id: 'hearth', version: 1 },
      { id: 'bloom', version: 1 },
    ],
    variants: {
      harvest: ['standard', 'featured', 'framed'],
      'modern-farmhouse': ['standard', 'featured', 'framed'],
      'editorial-market': ['standard', 'featured', 'framed'],
      meadow: ['standard', 'featured', 'framed'],
      hearth: ['standard', 'featured', 'framed'],
      bloom: ['standard', 'featured', 'framed'],
    },
    repeatable: true,
    maxInstances: 12,
    limits: { heading: 160, body: 600, label: 80 },
    alignments: ['left', 'center'],
    backgrounds: ['paper', 'surface', 'ink'],
    defaults: {
      content: {
        heading: 'Good things are in season',
        body: 'Find something special for your next visit to the market.',
        label: 'Explore the shop',
        destination: '/products',
      },
      presentation: { alignment: 'center', background: 'ink' },
    },
    editor: 'cta-banner',
    renderers: {
      harvest: 'harvest-cta-banner',
      'modern-farmhouse': 'farmhouse-cta-banner',
      'editorial-market': 'editorial-cta-banner',
      meadow: 'harvest-cta-banner',
      hearth: 'harvest-cta-banner',
      bloom: 'harvest-cta-banner',
    },
  },
} as const;

/** Shared editorial budget per page, in addition to retained native content. */
export const websiteSectionLimit = 12;
export type WebsiteSectionType = keyof typeof websiteSectionManifest;

export type SectionTarget = {
  theme: string;
  themeVersion: number;
  page: string;
};
/** Percentages and pixels only. Arbitrary CSS is never accepted from the editor. */
export const websiteSizingLimits = {
  heading: [50, 250],
  paragraph: [50, 200],
  button: [60, 180],
  imageWidth: [20, 80],
  imageHeight: [160, 900],
  width: [40, 100],
  height: [0, 1000],
  gap: [0, 128],
  padding: [0, 160],
} as const;
export type WebsiteSectionSizing = Partial<
  Record<keyof typeof websiteSizingLimits, number>
>;
export function isWebsiteSectionSizing(
  value: unknown,
): value is WebsiteSectionSizing {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, size]) => {
    if (!Object.prototype.hasOwnProperty.call(websiteSizingLimits, key))
      return false;
    const [min, max] =
      websiteSizingLimits[key as keyof typeof websiteSizingLimits];
    return (
      typeof size === 'number' &&
      Number.isInteger(size) &&
      size >= min &&
      size <= max
    );
  });
}
export type WebsiteTextSection = {
  id: string;
  type: 'text';
  version: 1;
  visible: boolean;
  content: { heading: string; body: string };
  presentation: {
    alignment: 'left' | 'center' | 'right';
    variant?: WebsiteSectionVariant;
    backgroundType?: 'contained' | 'full';
    background?: 'paper' | 'surface' | 'ink';
    sizing?: WebsiteSectionSizing;
  };
};
export type WebsiteImageWithTextSection = {
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
    variant?: WebsiteSectionVariant;
    backgroundType?: 'contained' | 'full';
    sizing?: WebsiteSectionSizing;
    alignment: 'left' | 'center' | 'right';
    imageSide: 'left' | 'right' | 'background';
    imageSize: 'small' | 'medium' | 'large';
    columnRatio?: '50-50' | '40-60' | '60-40';
    verticalAlignment?: 'top' | 'center' | 'bottom';
    spacing?: 'compact' | 'balanced' | 'spacious';
    background: 'paper' | 'surface' | 'ink';
  };
};
export type WebsiteCtaBannerSection = {
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
    variant?: WebsiteSectionVariant;
    backgroundType?: 'contained' | 'full';
    sizing?: WebsiteSectionSizing;
    alignment: 'left' | 'center';
    background: 'paper' | 'surface' | 'ink';
  };
};
export type WebsiteSectionImage = {
  assetId: string | null;
  url: string;
  alt: string;
};
type HarvestPresentation = {
  backgroundType?: 'contained' | 'full';
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
export type WebsiteImageBannerSection = HarvestSection<
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
export type WebsiteGalleryImage = {
  id: string;
  image: WebsiteSectionImage;
  caption: string;
};
export type WebsiteImageGallerySection = HarvestSection<
  'image-gallery',
  { heading: string; body: string; images: WebsiteGalleryImage[] },
  {
    layout: 'grid' | 'mosaic' | 'strip' | 'carousel';
    aspectRatio: 'square' | 'portrait' | 'landscape';
    captions: boolean;
    visibleImages?: 1 | 2 | 3 | 4;
  }
>;
export type WebsiteFeatureItem = {
  id: string;
  title: string;
  description: string;
  icon: '' | (typeof harvestFeatureIcons)[number];
};
export type WebsiteFeatureGridSection = HarvestSection<
  'feature-grid',
  { heading: string; body: string; items: WebsiteFeatureItem[] },
  {
    columns: 2 | 3 | 4;
    iconPosition: 'above' | 'beside';
    iconSize?: number;
    cardStyle: 'standard' | 'highlighted' | 'bordered';
  }
>;
export type WebsiteProductShowcaseSection = HarvestSection<
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
export type WebsiteCategoryShowcaseSection = HarvestSection<
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
export type HarvestExpandedSection =
  | WebsiteImageBannerSection
  | WebsiteImageGallerySection
  | WebsiteFeatureGridSection
  | WebsiteProductShowcaseSection
  | WebsiteCategoryShowcaseSection;
export function isHarvestExpandedSection(
  section: WebsiteSection,
): section is HarvestExpandedSection {
  return Object.prototype.hasOwnProperty.call(
    harvestExpandedSectionManifest,
    section.type,
  );
}

export type WebsiteSection =
  | WebsiteTextSection
  | WebsiteImageWithTextSection
  | WebsiteCtaBannerSection
  | HarvestExpandedSection;

/** Only explicitly registered editorial pages are eligible; purchasing/account pages stay locked. */
export function permitsWebsiteSection(
  type: unknown,
  target: SectionTarget,
): boolean {
  if (
    typeof type !== 'string' ||
    !Object.prototype.hasOwnProperty.call(websiteSectionManifest, type)
  )
    return false;
  const definition = websiteSectionManifest[type as WebsiteSectionType];
  return (
    definition.pages.some((page) => page === target.page) &&
    definition.themes.some(
      (theme) =>
        theme.id === target.theme && theme.version === target.themeVersion,
    )
  );
}

export function isWebsiteSectionId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length <= 80 &&
    !/\s/u.test(id) &&
    /^(?:text|image-with-text|cta-banner|image-banner|image-gallery|feature-grid|product-showcase|category-showcase)-[a-zA-Z0-9][a-zA-Z0-9_-]{0,58}$/.test(
      id,
    )
  );
}

/** Same bounded internal destinations as retained Modern Farmhouse links. */
export function isWebsiteSectionDestination(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 300 &&
    !/\s/u.test(value) &&
    /^\/(?:$|products(?:\/[a-zA-Z0-9_%~-]+|\?category=[a-zA-Z0-9_-]+)?$|about$|find-us$|contact$|faq$|policies$|market-dates$|vendors$|applications$)/.test(
      value,
    )
  );
}

function isSectionImage(value: unknown): boolean {
  if (
    !exactObject(value, ['assetId', 'url', 'alt']) ||
    !plainText(
      value.alt,
      websiteSectionManifest['image-with-text'].limits.alt,
    ) ||
    typeof value.url !== 'string' ||
    value.url.length > 2000
  )
    return false;
  if (value.assetId === null) return value.url === '';
  if (
    typeof value.assetId !== 'string' ||
    !/^[1-9][0-9]*$/.test(value.assetId) ||
    !value.url
  )
    return false;
  try {
    const url = new URL(value.url);
    return (
      !url.username &&
      !url.password &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          (url.hostname === 'localhost' ||
            url.hostname.endsWith('.localhost') ||
            url.hostname === '127.0.0.1')))
    );
  } catch {
    return false;
  }
}

function exactObject(
  value: unknown,
  keys: string[],
): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}
function plainText(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)
  );
}

function isExpandedSection(value: Record<string, unknown>): boolean {
  const type = value.type as keyof typeof harvestExpandedSectionManifest;
  if (
    !isWebsiteSectionId(value.id) ||
    !value.id.startsWith(type + '-') ||
    value.version !== 1 ||
    typeof value.visible !== 'boolean'
  )
    return false;
  const c = value.content,
    p = value.presentation;
  const common = [
    'alignment',
    'background',
    'spacing',
    ...(p && typeof p === 'object' && 'backgroundType' in p
      ? ['backgroundType']
      : []),
  ];
  if (
    p &&
    typeof p === 'object' &&
    'backgroundType' in p &&
    !['contained', 'full'].includes(p.backgroundType as string)
  )
    return false;
  const contentKeys =
    type === 'image-banner'
      ? ['heading', 'body', 'introduction', 'image', 'label', 'destination']
      : type === 'image-gallery'
        ? ['heading', 'body', 'images']
        : type === 'feature-grid'
          ? ['heading', 'body', 'items']
          : [
              'heading',
              'body',
              type === 'product-showcase' ? 'productIds' : 'categoryIds',
              'showShopLink',
            ];
  const presentationKeys =
    type === 'image-banner'
      ? ['layout', 'width', 'placement', 'focalPoint', 'overlay', 'height']
      : type === 'image-gallery'
        ? [
            'layout',
            'aspectRatio',
            'captions',
            ...(p && typeof p === 'object' && 'visibleImages' in p
              ? ['visibleImages']
              : []),
          ]
        : type === 'feature-grid'
          ? [
              'columns',
              'iconPosition',
              'cardStyle',
              ...(p && typeof p === 'object' && 'iconSize' in p
                ? ['iconSize']
                : []),
            ]
          : type === 'product-showcase'
            ? [
                'layout',
                'columns',
                ...(p && typeof p === 'object' && 'visibleImages' in p
                  ? ['visibleImages']
                  : []),
              ]
            : ['layout', 'aspectRatio'];
  if (
    !exactObject(c, contentKeys) ||
    !exactObject(p, [...common, ...presentationKeys]) ||
    !plainText(c.heading, 160) ||
    !plainText(c.body, 1200)
  )
    return false;
  const choice = (key: string, options: readonly unknown[]) =>
    options.includes(p[key]);
  if (
    !choice('alignment', ['left', 'center', 'right']) ||
    !choice('background', ['paper', 'surface', 'ink']) ||
    !choice('spacing', ['compact', 'balanced', 'spacious'])
  )
    return false;
  if (type === 'image-banner')
    return (
      plainText(c.introduction, 80) &&
      plainText(c.label, 80) &&
      isWebsiteSectionDestination(c.destination) &&
      isSectionImage(c.image) &&
      choice('layout', [
        'photo-overlay',
        'split-editorial',
        'minimal-centered',
      ]) &&
      choice('width', ['full', 'contained']) &&
      choice('placement', ['top', 'middle', 'bottom']) &&
      choice('focalPoint', ['center', 'top', 'bottom', 'left', 'right']) &&
      choice('overlay', ['none', 'subtle', 'strong']) &&
      choice('height', ['small', 'medium', 'large'])
    );
  const uniqueItems = (
    items: unknown,
    max: number,
    valid: (v: unknown) => boolean,
  ) =>
    Array.isArray(items) &&
    items.length <= max &&
    items.every(valid) &&
    new Set(items.map((i) => i.id)).size === items.length;
  if (type === 'image-gallery')
    return (
      uniqueItems(
        c.images,
        8,
        (i) =>
          exactObject(i, ['id', 'image', 'caption']) &&
          typeof i.id === 'string' &&
          /^image-[a-zA-Z0-9_-]{1,60}$/.test(i.id) &&
          isSectionImage(i.image) &&
          plainText(i.caption, 200),
      ) &&
      choice('layout', ['grid', 'mosaic', 'strip', 'carousel']) &&
      choice('aspectRatio', ['square', 'portrait', 'landscape']) &&
      typeof p.captions === 'boolean' &&
      (!('visibleImages' in p) || choice('visibleImages', [1, 2, 3, 4]))
    );
  if (type === 'feature-grid')
    return (
      choice('alignment', ['left', 'center']) &&
      uniqueItems(
        c.items,
        6,
        (i) =>
          exactObject(i, ['id', 'title', 'description', 'icon']) &&
          typeof i.id === 'string' &&
          /^feature-[a-zA-Z0-9_-]{1,60}$/.test(i.id) &&
          plainText(i.title, 120) &&
          plainText(i.description, 400) &&
          ['', ...harvestFeatureIcons].includes(i.icon as never),
      ) &&
      choice('columns', [2, 3, 4]) &&
      choice('iconPosition', ['above', 'beside']) &&
      (!('iconSize' in p) ||
        (typeof p.iconSize === 'number' &&
          Number.isInteger(p.iconSize) &&
          p.iconSize >= 16 &&
          p.iconSize <= 96)) &&
      choice('cardStyle', ['standard', 'highlighted', 'bordered'])
    );
  const ids = c[type === 'product-showcase' ? 'productIds' : 'categoryIds'];
  if (
    !Array.isArray(ids) ||
    ids.length > 8 ||
    new Set(ids).size !== ids.length ||
    !ids.every(
      (id) =>
        typeof id === 'string' &&
        /^[1-9][0-9]{0,9}$/.test(id) &&
        Number(id) <= 2147483647,
    ) ||
    typeof c.showShopLink !== 'boolean'
  )
    return false;
  return type === 'product-showcase'
    ? choice('layout', [
        'grid',
        'featured-product',
        'compact-row',
        'carousel',
      ]) &&
        (!('visibleImages' in p) || choice('visibleImages', [1, 2, 3, 4])) &&
        choice('columns', [2, 3, 4])
    : choice('layout', ['cards', 'photo-tiles', 'compact']) &&
        choice('aspectRatio', ['square', 'portrait', 'landscape']);
}

/** Copy is always plain text, escaped by renderers. No HTML/CSS/code interpretation. */
export function isWebsiteSection(value: unknown): value is WebsiteSection {
  if (
    !exactObject(value, [
      'id',
      'type',
      'version',
      'visible',
      'content',
      'presentation',
    ])
  )
    return false;
  if (
    typeof value.type !== 'string' ||
    !Object.prototype.hasOwnProperty.call(websiteSectionManifest, value.type)
  )
    return false;
  if (
    Object.prototype.hasOwnProperty.call(
      harvestExpandedSectionManifest,
      value.type,
    )
  )
    return isExpandedSection(value);
  const definition =
    websiteSectionManifest[
      value.type as 'text' | 'image-with-text' | 'cta-banner'
    ];
  const presentation = value.presentation;
  if (!(
    isWebsiteSectionId(value.id) &&
    value.id.startsWith(`${definition.type}-`) &&
    value.type === definition.type &&
    value.version === definition.version &&
    typeof value.visible === 'boolean' &&
    ((value.type === 'image-with-text' &&
      isImageTextBlocksContent(value.content)) ||
      (exactObject(
        value.content,
        value.type === 'text'
          ? ['heading', 'body']
          : value.type === 'image-with-text'
            ? ['heading', 'body', 'image', 'label', 'destination']
            : ['heading', 'body', 'label', 'destination'],
      ) &&
        plainText(value.content.heading, definition.limits.heading) &&
        plainText(value.content.body, definition.limits.body))) &&
    exactObject(presentation, [
      ...(value.type === 'text' &&
      presentation &&
      typeof presentation === 'object' &&
      'background' in presentation
        ? ['background']
        : []),
      ...(presentation &&
      typeof presentation === 'object' &&
      'backgroundType' in presentation
        ? ['backgroundType']
        : []),
      ...(value.type === 'text'
        ? ['alignment']
        : value.type === 'image-with-text'
          ? ['alignment', 'imageSide', 'imageSize', 'background']
          : ['alignment', 'background']),
      ...(value.type === 'image-with-text' &&
      presentation &&
      typeof presentation === 'object'
        ? ['columnRatio', 'verticalAlignment', 'spacing'].filter(
            (key) => key in presentation,
          )
        : []),
      ...(presentation &&
      typeof presentation === 'object' &&
      'sizing' in presentation
        ? ['sizing']
        : []),
      ...(presentation &&
      typeof presentation === 'object' &&
      'variant' in presentation
        ? ['variant']
        : []),
    ]) &&
    definition.alignments.some(
      (alignment) => alignment === presentation.alignment,
    )
  ))
    return false;
  if (
    'backgroundType' in presentation &&
    !['contained', 'full'].includes(presentation.backgroundType as string)
  )
    return false;
  if ('sizing' in presentation && !isWebsiteSectionSizing(presentation.sizing))
    return false;
  if (
    'variant' in presentation &&
    !['standard', 'featured', 'framed'].includes(presentation.variant as string)
  )
    return false;
  if (value.type === 'text')
    return (
      !('background' in presentation) ||
      ['paper', 'surface', 'ink'].includes(presentation.background as string)
    );
  if (value.type === 'image-with-text') {
    if (
      'columnRatio' in presentation &&
      !['50-50', '40-60', '60-40'].includes(presentation.columnRatio as string)
    )
      return false;
    if (
      'verticalAlignment' in presentation &&
      !['top', 'center', 'bottom'].includes(
        presentation.verticalAlignment as string,
      )
    )
      return false;
    if (
      'spacing' in presentation &&
      !['compact', 'balanced', 'spacious'].includes(
        presentation.spacing as string,
      )
    )
      return false;
  }
  const content = value.content as Record<string, unknown>;
  const contentDefinition =
    value.type === 'image-with-text'
      ? websiteSectionManifest['image-with-text']
      : websiteSectionManifest['cta-banner'];
  if (
    (!(value.type === 'image-with-text' && isImageTextBlocksContent(content)) &&
      (!plainText(content.label, contentDefinition.limits.label) ||
        !isWebsiteSectionDestination(content.destination))) ||
    !contentDefinition.backgrounds.some(
      (background) => background === presentation.background,
    )
  )
    return false;
  if (value.type === 'cta-banner')
    return !!String((content as Record<string, unknown>).label).trim();
  return (
    (isImageTextBlocksContent(content) || isSectionImage(content.image)) &&
    websiteSectionManifest['image-with-text'].imageSides.some(
      (side) => side === presentation.imageSide,
    ) &&
    websiteSectionManifest['image-with-text'].imageSizes.some(
      (size) => size === presentation.imageSize,
    )
  );
}

export type WebsiteSectionVariant = 'standard' | 'featured' | 'framed';
export type HomepageDesign = {
  spacing?: 'compact' | 'balanced' | 'spacious';
  typographyScale?: 'standard' | 'expressive';
};
export function isHomepageDesign(value: unknown): value is HomepageDesign {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).every((key) =>
    key === 'spacing'
      ? ['compact', 'balanced', 'spacious'].includes(v[key] as string)
      : key === 'typographyScale'
        ? ['standard', 'expressive'].includes(v[key] as string)
        : false,
  );
}
export function websiteSectionVariants(
  type: WebsiteSectionType,
  target: SectionTarget,
): readonly WebsiteSectionVariant[] {
  if (!permitsWebsiteSection(type, target)) return [];
  const variants = websiteSectionManifest[type].variants;
  return (
    (variants as Partial<Record<string, readonly WebsiteSectionVariant[]>>)[
      target.theme
    ] ?? []
  );
}
export function permitsWebsiteSectionPresentation(
  section: WebsiteSection,
  target: SectionTarget,
): boolean {
  return (
    permitsWebsiteSection(section.type, target) &&
    websiteSectionVariants(section.type, target).some(
      (variant) => variant === (section.presentation.variant ?? 'standard'),
    )
  );
}

export const editorialHomepageTarget = {
  theme: 'editorial-market',
  themeVersion: 1,
  page: 'home',
} as const;
export const editorialOriginalSections = [
  'hero',
  'categories',
  'products',
  'impact',
] as const;
/** A market's Editorial Market homepage follows the market Harvest order, then the impact artwork. */
export const editorialMarketOriginalSections = [
  'hero',
  'markets',
  'vendors',
  'categories',
  'closing',
  'impact',
] as const;
export type EditorialOriginalSectionId =
  | (typeof editorialOriginalSections)[number]
  | (typeof editorialMarketOriginalSections)[number];
export type EditorialHomepageSection =
  { id: EditorialOriginalSectionId } | WebsiteSection;
/** A market composition is identified by its market-only native sections. */
export function isEditorialMarketHomepageComposition(value: unknown): boolean {
  return (
    Array.isArray(value) && value.some((section) => section?.id === 'markets')
  );
}
/** Native content and visibility stay in their original named objects. Only this list owns order. */
export function isEditorialHomepageComposition(
  value: unknown,
): value is EditorialHomepageSection[] {
  const market = isEditorialMarketHomepageComposition(value);
  const natives: readonly string[] = market
    ? editorialMarketOriginalSections
    : editorialOriginalSections;
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.length > natives.length + websiteSectionLimit ||
    new Set(value.map((section) => section?.id)).size !== value.length
  )
    return false;
  // A market's call-to-action banner may be replaced by an editable CTA section.
  const required = market
    ? natives.filter((id) => id !== 'closing')
    : (['hero', 'impact'] as const);
  return (
    required.every((id) => value.some((section) => section?.id === id)) &&
    value.every((section) =>
      isWebsiteSection(section)
        ? permitsWebsiteSectionPresentation(section, editorialHomepageTarget) &&
          (!market || permitsMarketWebsiteSection(section.type))
        : exactObject(section, ['id']) &&
          natives.some((id) => id === section.id),
    ) &&
    Object.values(websiteSectionManifest).every(
      (definition) =>
        value.filter((section) => section.type === definition.type).length <=
        definition.maxInstances,
    )
  );
}

export type WebsiteImageTextLegacyContent = {
  blocks?: never;
  heading: string;
  body: string;
  image: { assetId: string | null; url: string; alt: string };
  label: string;
  destination: string;
};
/** A block is eligible only inside the pilot section on an explicitly eligible page/theme. */
export const websiteBlockManifest = {
  heading: { label: 'Heading', version: 1, min: 1, max: 1, textLimit: 160 },
  paragraph: {
    label: 'Paragraph',
    version: 1,
    min: 0,
    max: 3,
    textLimit: 1200,
  },
  image: { label: 'Image', version: 1, min: 1, max: 1 },
  button: { label: 'Button', version: 1, min: 0, max: 2 },
  eyebrow: { label: 'Eyebrow', version: 1, min: 0, max: 1, textLimit: 80 },
} as const;
export type WebsiteBlockType = keyof typeof websiteBlockManifest;
export type WebsiteBlock = {
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
export function permitsWebsiteBlock(
  type: unknown,
  sectionType: unknown,
  target: SectionTarget,
): boolean {
  return (
    typeof type === 'string' &&
    Object.prototype.hasOwnProperty.call(websiteBlockManifest, type) &&
    sectionType === 'image-with-text' &&
    permitsWebsiteSection(sectionType, target)
  );
}
export function isWebsiteBlock(value: unknown): value is WebsiteBlock {
  if (
    !exactObject(value, [
      'id',
      'type',
      'version',
      'visible',
      'content',
      'presentation',
    ]) ||
    typeof value.id !== 'string' ||
    !/^block-[a-zA-Z0-9][a-zA-Z0-9_-]{0,58}$/.test(value.id) ||
    typeof value.visible !== 'boolean' ||
    typeof value.type !== 'string' ||
    !Object.prototype.hasOwnProperty.call(websiteBlockManifest, value.type)
  )
    return false;
  if (
    value.version !==
    websiteBlockManifest[value.type as WebsiteBlockType].version
  )
    return false;
  const p = value.presentation;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  if (value.type === 'image')
    return value.visible && exactObject(p, []) && isSectionImage(value.content);
  if (value.type === 'heading' && !value.visible) return false;
  if (
    'scale' in p &&
    !(
      typeof p.scale === 'number' &&
      Number.isInteger(p.scale) &&
      p.scale >= 50 &&
      p.scale <= 200
    )
  )
    return false;
  if (value.type === 'button')
    return (
      exactObject(value.content, ['label', 'destination']) &&
      plainText(value.content.label, 80) &&
      !!value.content.label.trim() &&
      isWebsiteSectionDestination(value.content.destination) &&
      exactObject(p, [
        ...('style' in p ? ['style'] : []),
        ...('scale' in p ? ['scale'] : []),
      ]) &&
      (!('style' in p) || ['primary', 'secondary'].includes(p.style as string))
    );
  const definition =
    websiteBlockManifest[value.type as 'heading' | 'paragraph' | 'eyebrow'];
  return (
    exactObject(value.content, ['text']) &&
    plainText(value.content.text, definition.textLimit) &&
    exactObject(p, [
      ...('size' in p ? ['size'] : []),
      ...('scale' in p ? ['scale'] : []),
    ]) &&
    (!('size' in p) || ['standard', 'large'].includes(p.size as string))
  );
}
export function isImageTextBlocksContent(
  value: unknown,
): value is { blocks: WebsiteBlock[] } {
  if (
    !exactObject(value, ['blocks']) ||
    !Array.isArray(value.blocks) ||
    value.blocks.length > 8 ||
    !value.blocks.every(isWebsiteBlock) ||
    new Set(value.blocks.map((b) => b.id)).size !== value.blocks.length
  )
    return false;
  return Object.entries(websiteBlockManifest).every(([type, definition]) => {
    const count = (value.blocks as WebsiteBlock[]).filter(
      (b) => b.type === type,
    ).length;
    return count >= definition.min && count <= definition.max;
  });
}
/** No read-time rewrite. Deterministic legacy identities keep selection stable until first block edit. */
export function effectiveWebsiteBlocks(
  section: WebsiteImageWithTextSection,
): WebsiteBlock[] {
  if (section.content.blocks) return section.content.blocks;
  const c = section.content as WebsiteImageTextLegacyContent;
  return [
    {
      id: 'block-legacy-image',
      type: 'image',
      version: 1,
      visible: true,
      content: c.image,
      presentation: {},
    },
    {
      id: 'block-legacy-heading',
      type: 'heading',
      version: 1,
      visible: true,
      content: { text: c.heading },
      presentation: {},
    },
    ...(c.body
      ? [
          {
            id: 'block-legacy-paragraph',
            type: 'paragraph',
            version: 1,
            visible: true,
            content: { text: c.body },
            presentation: {},
          } as WebsiteBlock,
        ]
      : []),
    ...(c.label
      ? [
          {
            id: 'block-legacy-button',
            type: 'button',
            version: 1,
            visible: true,
            content: { label: c.label, destination: c.destination },
            presentation: {},
          } as WebsiteBlock,
        ]
      : []),
  ];
}
/** All images, including hidden optional content, must be authorized by the host service. */
export function websiteSectionImages(
  section: WebsiteSection,
): WebsiteSectionImage[] {
  if (section.type === 'image-banner') return [section.content.image];
  if (section.type === 'image-gallery')
    return section.content.images.map((i) => i.image);
  return section.type === 'image-with-text'
    ? effectiveWebsiteBlocks(section).flatMap((block) =>
        block.type === 'image' ? [block.content] : [],
      )
    : [];
}
export function websiteSectionHeading(section: WebsiteSection): string {
  return section.type === 'image-with-text'
    ? (effectiveWebsiteBlocks(section).flatMap((b) =>
        b.type === 'heading' ? [b.content.text] : [],
      )[0] ?? '')
    : section.content.heading;
}

/** Explicit page boundaries. Native controllers are never section instances. */
export const websitePageRules = {
  home: {
    regions: ['composition'],
    limit: 12,
    native: ['theme-homepage'],
    nativeByTheme: {
      harvest: ['hero', 'featured', 'about', 'closing'],
      'modern-farmhouse': [
        'cinematic',
        'discovery',
        'products',
        'story',
        'collection',
        'invitation',
      ],
      'editorial-market': ['hero', 'categories', 'products', 'impact'],
      meadow: ['hero', 'markets', 'vendors', 'categories', 'closing'],
      hearth: ['hero', 'markets', 'vendors', 'categories', 'closing'],
      bloom: ['hero', 'featured', 'about', 'closing'],
    },
    protected: true,
  },
  about: {
    regions: ['before', 'after'],
    limit: 12,
    native: ['legacy-story-sections', 'story-cta'],
    protected: false,
  },
  contact: {
    regions: ['before', 'after'],
    limit: 12,
    native: ['contact-form', 'contact-information'],
    protected: true,
  },
  faq: {
    regions: ['before', 'after'],
    limit: 12,
    native: ['faq-questions'],
    protected: true,
  },
  policies: {
    regions: ['before', 'after'],
    limit: 12,
    native: ['policies-list'],
    protected: true,
  },
  'find-us': {
    regions: ['before', 'after'],
    limit: 12,
    native: ['find-markets'],
    protected: true,
  },
  products: {
    regions: ['before'],
    limit: 12,
    native: ['product-listing', 'filters', 'sorting', 'pagination'],
    protected: true,
  },
  'market-dates': {
    regions: ['before', 'after'],
    limit: 12,
    native: ['market-date-list'],
    protected: true,
  },
  vendors: {
    regions: ['before', 'after'],
    limit: 12,
    native: ['occurrence-selector', 'vendor-list'],
    protected: true,
  },
  applications: {
    regions: ['before', 'after'],
    limit: 12,
    native: ['application-list'],
    protected: true,
  },
} as const;
export type WebsiteEditorialPage = Exclude<
  keyof typeof websitePageRules,
  'home'
>;
export type WebsitePageRegion = 'before' | 'after';
export type WebsitePageCompositions = Partial<
  Record<
    WebsiteEditorialPage,
    {
      before?: WebsiteSection[];
      after?: WebsiteSection[];
      closingPosition?: number;
    }
  >
>;
export const harvestHomepageTarget = {
  theme: 'harvest',
  themeVersion: 1,
  page: 'home',
} as const;
export const harvestOriginalSections = [
  'hero',
  'featured',
  'about',
  'closing',
] as const;
/** A market's Harvest homepage keeps its own complete native set. */
export const marketOriginalSections = [
  'hero',
  'markets',
  'vendors',
  'categories',
  'closing',
] as const;
export type HarvestOriginalSectionId =
  | (typeof harvestOriginalSections)[number]
  | (typeof marketOriginalSections)[number];
export type HarvestHomepageSection =
  { id: HarvestOriginalSectionId } | WebsiteSection;
/** Market showcase sections are never offered: their projections are vendor catalogs. */
export function permitsMarketWebsiteSection(type: unknown) {
  return type !== 'product-showcase' && type !== 'category-showcase';
}
export function isMarketHomepageComposition(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    marketOriginalSections.every((id) => value.some((s) => s?.id === id)) &&
    value.every((s) =>
      isWebsiteSection(s)
        ? permitsMarketWebsiteSection(s.type)
        : marketOriginalSections.some((id) => id === s?.id),
    )
  );
}
export function isHarvestHomepageComposition(
  value: unknown,
): value is HarvestHomepageSection[] {
  if (!Array.isArray(value)) return false;
  const natives: readonly string[] = isMarketHomepageComposition(value)
    ? marketOriginalSections
    : harvestOriginalSections;
  return (
    value.length >= natives.length &&
    value.length <= natives.length + websiteSectionLimit &&
    new Set(value.map((s) => s?.id)).size === value.length &&
    natives.every((id) => value.some((s) => s?.id === id)) &&
    value.every((s) =>
      isWebsiteSection(s)
        ? permitsWebsiteSectionPresentation(s, harvestHomepageTarget)
        : exactObject(s, ['id']) && natives.some((id) => id === s.id),
    )
  );
}
export function isWebsitePageCompositions(
  value: unknown,
  target: Omit<SectionTarget, 'page'>,
): value is WebsitePageCompositions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ids = new Set<string>();
  return Object.entries(value).every(([page, regions]) => {
    if (
      page === 'home' ||
      !Object.prototype.hasOwnProperty.call(websitePageRules, page) ||
      !regions ||
      typeof regions !== 'object' ||
      Array.isArray(regions)
    )
      return false;
    const rule = websitePageRules[page as WebsiteEditorialPage];
    const position = (regions as { closingPosition?: unknown }).closingPosition;
    if (
      position !== undefined &&
      (page === 'products' ||
        !permitsWebsiteSection('image-with-text', { ...target, page }) ||
        typeof position !== 'number' ||
        !Number.isInteger(position) ||
        position < 0 ||
        position >
          ((regions as { before?: unknown[] }).before?.length ?? 0) +
            ((regions as { after?: unknown[] }).after?.length ?? 0) +
            1)
    )
      return false;

    let count = 0;
    return Object.entries(regions).every(([region, sections]) => {
      if (region === 'closingPosition') return true;
      if (
        !(rule.regions as readonly string[]).includes(region) ||
        !Array.isArray(sections)
      )
        return false;
      count += sections.length;
      return (
        count <= rule.limit &&
        sections.every((s) => {
          if (
            !isWebsiteSection(s) ||
            !permitsWebsiteSectionPresentation(s, { ...target, page }) ||
            ids.has(s.id)
          )
            return false;
          ids.add(s.id);
          return true;
        })
      );
    });
  });
}
/** Includes hidden sections and nested images. Host services authorize every reference. */
export function appearanceWebsiteSections(config: {
  harvestComposition?: HarvestHomepageSection[];
  pageSections?: WebsitePageCompositions;
}): WebsiteSection[] {
  return [
    ...(config.harvestComposition ?? []).filter(
      (s): s is WebsiteSection => 'type' in s,
    ),
    ...Object.values(config.pageSections ?? {}).flatMap((regions) => [
      ...(regions.before ?? []),
      ...(regions.after ?? []),
    ]),
  ];
}
export function uniqueWebsiteSectionIds(sections: { id: string }[]): boolean {
  return new Set(sections.map((s) => s.id)).size === sections.length;
}

/** Existing inspector selection can address these bounded list items without introducing nested blocks. */
export function websiteSectionItems(
  section: WebsiteSection,
): Array<{ id: string; label: string }> {
  if (section.type === 'image-gallery')
    return section.content.images.map((i, n) => ({
      id: i.id,
      label: i.caption || i.image.alt || `Photograph ${n + 1}`,
    }));
  if (section.type === 'feature-grid')
    return section.content.items.map((i, n) => ({
      id: i.id,
      label: i.title || `Feature ${n + 1}`,
    }));
  if (section.type === 'product-showcase')
    return section.content.productIds.map((id, n) => ({
      id,
      label: `Product ${n + 1}`,
    }));
  if (section.type === 'category-showcase')
    return section.content.categoryIds.map((id, n) => ({
      id,
      label: `Category ${n + 1}`,
    }));
  return [];
}
