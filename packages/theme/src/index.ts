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
