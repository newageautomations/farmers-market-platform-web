/**
 * Page structure rules a theme opts into. Each entry describes how the
 * theme's informational pages are composed and where they are linked from,
 * so the editor, the storefront renderer and the starter content read one
 * source. A theme without an entry keeps the platform's historical
 * behaviour. See docs/THEME_PAGE_STRUCTURE_STANDARD.md.
 */
export type ThemePageStructure = {
  /** Pages whose native content opens the page: nothing may be placed above it. */
  lockedTopPages: readonly ('vendors' | 'applications' | 'market-dates')[];
  /** Pages that open with their own editable heading instead of a section hero. */
  headingOnlyPages: readonly ('policies' | 'terms-and-conditions')[];
  /** Pages that never show the shared closing invitation. */
  noClosingPages: readonly ('policies' | 'terms-and-conditions')[];
  /** Pages linked from the footer only, never the header. */
  footerOnlyPages: readonly ('faq' | 'policies' | 'terms-and-conditions')[];
  /** Image height, in pixels, of the derived hero on these pages. */
  shortHeroPages: readonly ('contact' | 'faq')[];
  shortHeroHeight: number;
  /** Market websites get a structured Terms & Conditions page. */
  marketTermsPage: boolean;
  /** Market Contact pages carry the inquiry form with manager-editable fields. */
  marketContactForm: boolean;
  /** Enabling About seeds an example page that explains how to compose it. */
  aboutStarter: boolean;
  /** Shop paging: numbered controls without a product count. */
  shopPagination: 'summary' | 'numbered';
  /** Section controls the theme's renderer honours. */
  sectionImageShape: boolean;
  ctaButtonStyle: boolean;
  /**
   * Every custom section has space above and below it. Managers adjust it per
   * section with a slider; 0 turns it off. `null` keeps the historical layout
   * (no slider, no default space).
   */
  sectionSpaceDefault: number | null;
  /** The shop card says nothing about availability when the product can be added. */
  shopAvailabilityNote: boolean;
  /** Market Policies and Terms & Conditions start with written example text. */
  marketStarterText: boolean;
  /** Pointing at a booth on the Market Day map shows the vendor's card. */
  marketDayBoothCards: boolean;
  /**
   * Vendor Find Us is a fixed page: the next market, then the upcoming
   * markets, with no hero, library sections or closing invitation. The
   * upcoming list opens with `initial` rows and each "Show more markets"
   * press adds `more`. `null` keeps the editable historical page.
   */
  fixedFindUs: { initial: number; more: number } | null;
};

const historical: ThemePageStructure = {
  lockedTopPages: [],
  headingOnlyPages: [],
  noClosingPages: [],
  footerOnlyPages: [],
  shortHeroPages: [],
  shortHeroHeight: 0,
  marketTermsPage: false,
  marketContactForm: false,
  aboutStarter: false,
  shopPagination: 'summary',
  sectionImageShape: false,
  ctaButtonStyle: false,
  sectionSpaceDefault: null,
  shopAvailabilityNote: true,
  marketStarterText: false,
  marketDayBoothCards: false,
  fixedFindUs: null,
};

/**
 * Pasture is the reference market theme. Meadow and Hearth follow the same
 * market storefront standard (docs/market-storefronts/), so they share its
 * rules; a theme that needs a different value gets its own entry.
 */
const marketStandard: ThemePageStructure = {
  lockedTopPages: ['vendors', 'applications'],
  headingOnlyPages: ['policies', 'terms-and-conditions'],
  noClosingPages: ['policies', 'terms-and-conditions'],
  footerOnlyPages: ['faq', 'policies', 'terms-and-conditions'],
  shortHeroPages: ['contact', 'faq'],
  shortHeroHeight: 220,
  marketTermsPage: true,
  marketContactForm: true,
  aboutStarter: true,
  shopPagination: 'numbered',
  sectionImageShape: true,
  ctaButtonStyle: true,
  sectionSpaceDefault: 32,
  shopAvailabilityNote: false,
  marketStarterText: true,
  marketDayBoothCards: true,
  fixedFindUs: null,
};

/**
 * Vendor websites follow the same page standard as markets
 * (docs/vendor-storefronts/). Rules about market-only pages and features stay
 * off, and Find Us is a fixed page.
 */
const vendorStandard: ThemePageStructure = {
  ...marketStandard,
  lockedTopPages: [],
  marketTermsPage: false,
  marketContactForm: false,
  aboutStarter: false,
  marketStarterText: false,
  marketDayBoothCards: false,
  fixedFindUs: { initial: 4, more: 8 },
};

/** Market website rules by theme. */
export const themePageStructures: Partial<Record<string, ThemePageStructure>> =
  {
    pasture: marketStandard,
    meadow: marketStandard,
    hearth: marketStandard,
  };

/** Every theme a vendor website can use follows the vendor standard. */
export const vendorStandardThemes = [
  'harvest',
  'editorial-market',
  'modern-farmhouse',
  'bloom',
] as const;

/** Which kind of website the rules are for. Harvest and Editorial Market serve both. */
export type StorefrontSiteKind = 'MARKET' | 'VENDOR';

/**
 * The page rules of a theme on a market or vendor website. The kind is
 * required because Harvest and Editorial Market serve both, with different
 * rules; pass `undefined` only where the kind is genuinely unknown, which
 * reads the market rules.
 */
export function themePageStructure(
  theme: unknown,
  kind: StorefrontSiteKind | undefined,
): ThemePageStructure {
  if (kind === 'VENDOR')
    return (vendorStandardThemes as readonly unknown[]).includes(theme)
      ? vendorStandard
      : historical;
  return (
    (typeof theme === 'string' ? themePageStructures[theme] : undefined) ??
    historical
  );
}

/** Colors a section background choice resolves to on a given theme and palette. */
const pastureLeading = {
  sage: '#2a8239',
  terracotta: '#b8432c',
  blue: '#2c6c9c',
  charcoal: '#3d4a3f',
} as const;
/* Copies of each theme's per-palette leading color (`--mw-primary` in
   meadow.css, `--hw-primary` in hearth.css). Keep them identical. */
const meadowLeading = {
  sage: '#2f6b3a',
  terracotta: '#b4412a',
  blue: '#2f5597',
  charcoal: '#3a3340',
} as const;
const hearthLeading = {
  sage: '#5c3a21',
  terracotta: '#8a3324',
  blue: '#37476b',
  charcoal: '#4a5330',
} as const;
export type SectionBackground = 'paper' | 'surface' | 'ink';
export function sectionBackgroundSwatches(
  theme: unknown,
  palette: { background: string; surface: string; primary: string },
  paletteKey: string,
): Record<SectionBackground, { color: string; label: string }> {
  if (theme === 'pasture')
    return {
      paper: { color: '#e4f3df', label: 'Page background' },
      surface: { color: '#fbfdf6', label: 'Light card' },
      ink: {
        color:
          pastureLeading[paletteKey as keyof typeof pastureLeading] ??
          pastureLeading.sage,
        label: 'Theme color',
      },
    };
  if (theme === 'meadow')
    return {
      paper: { color: '#fff8ea', label: 'Page background' },
      surface: { color: '#ffffff', label: 'Light card' },
      ink: {
        color:
          meadowLeading[paletteKey as keyof typeof meadowLeading] ??
          meadowLeading.sage,
        label: 'Theme color',
      },
    };
  if (theme === 'hearth')
    return {
      paper: { color: '#f4ead8', label: 'Page background' },
      surface: { color: '#fcf7ec', label: 'Light card' },
      ink: {
        color:
          hearthLeading[paletteKey as keyof typeof hearthLeading] ??
          hearthLeading.sage,
        label: 'Theme color',
      },
    };
  return {
    paper: { color: palette.background, label: 'Page background' },
    surface: { color: palette.surface, label: 'Light card' },
    ink: { color: palette.primary, label: 'Theme color' },
  };
}
