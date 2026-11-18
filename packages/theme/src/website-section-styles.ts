import {
  isWebsiteSectionSizing,
  type WebsiteBlock,
  type WebsiteSection,
} from './website-section-contract';

/** Only validated numbers become CSS. These helpers are shared by the three SSR adapters. */
export function websiteSectionStyle(section: WebsiteSection): string {
  const sizing = section.presentation.sizing;
  const values = sizing && isWebsiteSectionSizing(sizing) ? sizing : {};
  const styles = Object.entries(values).map(
    ([key, value]) =>
      `--website-${key}:${value}${['heading', 'paragraph', 'button'].includes(key) ? '' : key === 'width' ? '%' : 'px'}`,
  );
  if (section.type === 'image-with-text') {
    const p = section.presentation;
    const imageWidth = values.imageWidth;
    if (imageWidth !== undefined) {
      const first = p.imageSide === 'right' ? 100 - imageWidth : imageWidth;
      styles.push(
        `--website-columns:minmax(0,${first}fr) minmax(0,${100 - first}fr)`,
      );
    }
    styles.push(
      `--website-vertical:${p.verticalAlignment === 'top' ? 'flex-start' : p.verticalAlignment === 'bottom' ? 'flex-end' : 'center'}`,
    );
    styles.push(
      `--website-content-gap:${values.gap ?? (p.spacing === 'compact' ? 16 : p.spacing === 'spacious' ? 40 : 28)}px`,
    );
    if (p.spacing)
      styles.push(
        `--website-copy-padding:${values.padding ?? (p.spacing === 'compact' ? 24 : p.spacing === 'spacious' ? 80 : 48)}px`,
      );
  }
  return styles.join(';');
}
export function websiteSectionAttributes(section: WebsiteSection) {
  const sizing = section.presentation.sizing;
  return {
    'data-website-section': section.type,
    'data-background':
      'background' in section.presentation
        ? section.presentation.background
        : undefined,
    'data-background-type': section.presentation.backgroundType ?? 'contained',
    ...Object.fromEntries(
      Object.keys(sizing && isWebsiteSectionSizing(sizing) ? sizing : {}).map(
        (key) => [`data-custom-${key.toLowerCase()}`, 'true'],
      ),
    ),
  };
}
export function websiteObjectStyle(
  section: WebsiteSection,
  type: 'heading' | 'paragraph' | 'eyebrow' | 'button',
  block?: WebsiteBlock,
): string | undefined {
  const sizing = section.presentation.sizing;
  const key = type === 'eyebrow' ? 'paragraph' : type;
  const sectionScale =
    sizing && isWebsiteSectionSizing(sizing) ? sizing[key] : undefined;
  const p = block?.presentation;
  const blockScale =
    p &&
    'scale' in p &&
    typeof p.scale === 'number' &&
    Number.isInteger(p.scale) &&
    p.scale >= 50 &&
    p.scale <= 200
      ? p.scale
      : undefined;
  if (sectionScale === undefined && blockScale === undefined) return undefined;
  const legacyScale = p && 'size' in p && p.size === 'large' ? 125 : 100;
  const scale =
    ((sectionScale ?? 100) / 100) * ((blockScale ?? legacyScale) / 100);
  const base =
    type === 'heading'
      ? 'var(--website-heading-base, 2.5rem)'
      : type === 'button'
        ? 'var(--website-button-base, 1rem)'
        : type === 'eyebrow'
          ? '0.9rem'
          : 'var(--website-paragraph-base, 1rem)';
  return `font-size:calc(${base} * ${scale})${type === 'button' ? `;padding:calc(var(--website-button-block-padding, 6px) * ${scale}) calc(var(--website-button-inline-padding, var(--ui-button-padding-inline, 18px)) * ${scale});min-height:max(var(--ui-control-height, 40px), calc(var(--website-button-height, var(--ui-control-height, 40px)) * ${scale}))` : ''}`;
}

/** Explicit block choices take precedence over automatic contrast defaults. */
export function websiteButtonStyle(
  section: WebsiteSection,
  block?: WebsiteBlock,
): 'primary' | 'secondary' {
  if (block?.type === 'button' && block.presentation.style)
    return block.presentation.style;
  return section.type !== 'text' &&
    (section.presentation.background === 'ink' ||
      (section.type === 'image-with-text' &&
        section.presentation.imageSide === 'background'))
    ? 'secondary'
    : 'primary';
}
