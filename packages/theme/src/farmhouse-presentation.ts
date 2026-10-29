import {
  storefrontFonts,
  storefrontPalettes,
  type StorefrontAppearance,
  type FarmhouseSettings,
} from './storefront';

export const farmhousePalettes: Record<
  FarmhouseSettings['palette'],
  {
    label: string;
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    foreground?: string;
    muted?: string;
    accent?: string;
  }
> = {
  evergreen: {
    label: 'Evergreen and ivory',
    primary: '#253c30',
    secondary: '#415b49',
    background: '#f6f3ea',
    surface: '#fffefa',
  },
  clay: {
    label: 'Clay and parchment',
    primary: '#653d2e',
    secondary: '#805943',
    background: '#f8f0e7',
    surface: '#fffefa',
  },
  charcoal: {
    label: 'Charcoal and stone',
    primary: '#292c2a',
    secondary: '#50554e',
    background: '#f2f1eb',
    surface: '#fffefa',
  },
  sage: { ...storefrontPalettes.sage, label: 'Harvest sage' },
  terracotta: { ...storefrontPalettes.terracotta, label: 'Harvest terracotta' },
  blue: { ...storefrontPalettes.blue, label: 'Harvest coastal blue' },
  'harvest-charcoal': {
    ...storefrontPalettes.charcoal,
    label: 'Harvest charcoal',
  },
};
export const farmhouseFonts = {
  literary: {
    label: 'Literary serif',
    heading: "Georgia, 'Times New Roman', serif",
    body: 'Arial, Helvetica, sans-serif',
  },
  classic: {
    label: 'Classic serif',
    heading: "'Palatino Linotype', Palatino, Georgia, serif",
    body: 'Arial, Helvetica, sans-serif',
  },
  ...storefrontFonts,
};
/** Approved palette/font contracts are shared, while the premium layout stays independent. */
export function farmhousePresentationStyle(config: StorefrontAppearance) {
  if (config.template?.id !== 'modern-farmhouse') return '';
  const palette = farmhousePalettes[config.template.settings.palette];
  const font = farmhouseFonts[config.template.settings.typography];
  return Object.entries({
    '--farmhouse-ink': palette.primary,
    '--farmhouse-paper': palette.background,
    '--farmhouse-surface': palette.surface,
    '--farmhouse-serif': font.heading,
    '--farmhouse-body': font.body,
    '--brand-primary': palette.primary,
    '--brand-secondary': palette.secondary,
    '--brand-background': palette.background,
    '--brand-surface': palette.surface,
    '--brand-foreground': palette.foreground ?? palette.primary,
    '--brand-muted': palette.muted ?? palette.primary,
    '--brand-accent': palette.accent ?? palette.secondary,
    '--ui-input-focus-background': `color-mix(in srgb, ${palette.primary} 10%, ${palette.surface})`,
    '--font-heading': font.heading,
    '--font-body': font.body,
  })
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}
