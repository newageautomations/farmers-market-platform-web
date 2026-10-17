import { z } from 'zod';
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const localAsset = z
  .string()
  .regex(/^\/assets\/[a-zA-Z0-9_-]+\.(svg|png|webp|ico)$/);
export const themeSchema = z
  .object({
    primary: color,
    secondary: color,
    accent: color,
    background: color,
    surface: color,
    foreground: color,
    muted: color,
    headingFont: z.enum(['serif', 'sans']),
    bodyFont: z.literal('sans'),
    logo: localAsset.nullable(),
    favicon: localAsset,
  })
  .strict();
export type Theme = z.infer<typeof themeSchema>;
export const adminBrandingSchema = z
  .object({ logo: localAsset.nullable(), accent: color })
  .strict();
export function adminTheme(branding?: {
  logo: string | null;
  accent: string;
}): Theme {
  if (!branding) return { ...platformTheme };
  const approved = adminBrandingSchema.parse(branding);
  return { ...platformTheme, primary: approved.accent, logo: approved.logo };
}
export const fonts = {
  serif: 'Georgia, serif',
  sans: 'system-ui, sans-serif',
} as const;
export function themeVariables(input: Theme) {
  const theme = themeSchema.parse(input);
  return Object.freeze({
    '--brand-primary': theme.primary,
    '--brand-secondary': theme.secondary,
    '--brand-accent': theme.accent,
    '--brand-background': theme.background,
    '--brand-surface': theme.surface,
    '--brand-foreground': theme.foreground,
    '--brand-muted': theme.muted,
    '--brand-on-primary': readableColor(theme.primary),
    '--brand-on-secondary': readableColor(theme.secondary),
    '--font-heading': fonts[theme.headingFont],
    '--font-body': fonts[theme.bodyFont],
  });
}
export function themeStyle(theme: Theme) {
  return Object.entries(themeVariables(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
}
export const platformTheme: Theme = {
  primary: '#234D42',
  secondary: '#344A42',
  accent: '#DCA75D',
  background: '#F5F6F3',
  surface: '#FFFFFF',
  foreground: '#20352C',
  muted: '#54665E',
  headingFont: 'sans',
  bodyFont: 'sans',
  logo: null,
  favicon: '/assets/platform-mark.svg',
};
export const vendorTheme: Theme = {
  ...platformTheme,
  primary: '#244967',
  secondary: '#314860',
  accent: '#AF8053',
  background: '#F1F5F8',
  foreground: '#26394A',
  muted: '#526679',
};

/** Account palette controls existing dashboard tokens only, never storefront branding. */
export const dashboardPaletteSchema = z
  .object({
    primary: color,
    secondary: color,
    background: color,
    surface: color,
  })
  .strict();
export type DashboardPalette = z.infer<typeof dashboardPaletteSchema>;
export const dashboardPaletteDefaults: DashboardPalette = {
  primary: platformTheme.primary,
  secondary: platformTheme.secondary,
  background: platformTheme.background,
  surface: platformTheme.surface,
};
/** Presets edit the same four account tokens as custom colors. */
export const dashboardPalettePresets = [
  {
    id: 'forest',
    label: 'Forest',
    palette: {
      primary: '#315947',
      secondary: '#365349',
      background: '#F8F5EB',
      surface: '#FFFFFF',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    palette: {
      primary: '#245A75',
      secondary: '#315267',
      background: '#F0F5F8',
      surface: '#FFFFFF',
    },
  },
  {
    id: 'clay',
    label: 'Clay',
    palette: {
      primary: '#884A34',
      secondary: '#6D5143',
      background: '#F9F3ED',
      surface: '#FFFCF8',
    },
  },
  {
    id: 'plum',
    label: 'Plum',
    palette: {
      primary: '#65436E',
      secondary: '#5B4A66',
      background: '#F5F1F7',
      surface: '#FEFCFF',
    },
  },
  {
    id: 'slate',
    label: 'Slate',
    palette: {
      primary: '#455567',
      secondary: '#4D5967',
      background: '#F2F4F6',
      surface: '#FFFFFF',
    },
  },
] as const satisfies readonly {
  id: string;
  label: string;
  palette: DashboardPalette;
}[];
export function contrastRatio(a: string, b: string) {
  function luminance(hex: string) {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  }
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function dashboardPaletteError(value: unknown): string | undefined {
  const result = dashboardPaletteSchema.safeParse(value);
  if (!result.success) return 'Use a six-digit HEX color for each field.';
}
/** Contrast guidance is advisory. Only the strict color schema blocks saving. */
export function dashboardPaletteAdvice(value: unknown): string | undefined {
  const result = dashboardPaletteSchema.safeParse(value);
  if (!result.success) return;
  const p = result.data;
  if (
    [p.background, p.surface].some((bg) => contrastRatio('#54665e', bg) < 4.5)
  )
    return 'Choose lighter backgrounds to keep dashboard text and status controls readable.';
  if (
    [p.primary, p.secondary].some((fg) =>
      [p.background, p.surface, '#ffffff'].some(
        (bg) => contrastRatio(fg, bg) < 4.5,
      ),
    )
  )
    return 'Choose darker primary and secondary colors for readable buttons, links and focus indicators.';
}

function readableColor(background: string) {
  if (contrastRatio('#20352c', background) >= 4.5) return '#20352c';
  return contrastRatio('#ffffff', background) >= 4.5 ? '#ffffff' : '#000000';
}

export function dashboardTheme(base: Theme, palette: DashboardPalette): Theme {
  const approved = dashboardPaletteSchema.parse(palette);
  const foreground = readableColor(approved.surface);
  return {
    ...base,
    ...approved,
    foreground,
    muted:
      contrastRatio(base.muted, approved.surface) >= 4.5
        ? base.muted
        : foreground,
  };
}
