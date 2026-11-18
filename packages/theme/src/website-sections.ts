import { z } from 'zod';
import {
  isWebsiteSection,
  harvestExpandedSectionManifest,
  isHomepageDesign,
  type HomepageDesign,
  permitsWebsiteSection,
  websiteSectionManifest,
  type SectionTarget,
  type WebsiteSection,
  type WebsiteSectionType,
  type WebsiteTextSection,
  type WebsiteBlock,
  type WebsiteBlockType,
  type WebsiteImageWithTextSection,
  type WebsiteImageTextLegacyContent,
  effectiveWebsiteBlocks,
  isImageTextBlocksContent,
  websiteBlockManifest,
} from './website-section-contract';
export * from './website-section-contract';
export * from './website-section-styles';

export const homepageDesignSchema = z.custom<HomepageDesign>(isHomepageDesign);
export const websiteSectionSchema = z.custom<WebsiteSection>(isWebsiteSection);
/** Preserve each discriminated instance while patching only its declared fields. */
export function withWebsiteSectionContent<T extends WebsiteSection>(
  value: T,
  patch: Partial<T['content']>,
): T {
  return { ...value, content: { ...value.content, ...patch } };
}
export function withWebsiteSectionPresentation<T extends WebsiteSection>(
  value: T,
  patch: Partial<T['presentation']>,
): T {
  return { ...value, presentation: { ...value.presentation, ...patch } };
}
const expandedRegistry = Object.fromEntries(
  Object.entries(harvestExpandedSectionManifest).map(([type, definition]) => [
    type,
    {
      ...definition,
      schema: websiteSectionSchema,
      create: (id: string, target: SectionTarget) =>
        createWebsiteSection(
          type as keyof typeof harvestExpandedSectionManifest,
          id,
          target,
        ),
    },
  ]),
) as {
  [
    K in keyof typeof harvestExpandedSectionManifest
  ]: (typeof harvestExpandedSectionManifest)[K] & {
    schema: typeof websiteSectionSchema;
    create: (
      id: string,
      target: SectionTarget,
    ) => Extract<WebsiteSection, { type: K }>;
  };
};
export const websiteSectionRegistry = {
  ...expandedRegistry,
  text: {
    ...websiteSectionManifest.text,
    schema: websiteSectionSchema,
    create: createTextSection,
  },
  'image-with-text': {
    ...websiteSectionManifest['image-with-text'],
    schema: websiteSectionSchema,
    create: (id: string, target: SectionTarget) =>
      createWebsiteSection('image-with-text', id, target),
  },
  'cta-banner': {
    ...websiteSectionManifest['cta-banner'],
    schema: websiteSectionSchema,
    create: (id: string, target: SectionTarget) =>
      createWebsiteSection('cta-banner', id, target),
  },
} as const;

export function availableWebsiteSections(target: SectionTarget) {
  return Object.values(websiteSectionRegistry).filter((definition) =>
    permitsWebsiteSection(definition.type, target),
  );
}

export function createWebsiteSection<T extends WebsiteSectionType>(
  type: T,
  id: string,
  target: SectionTarget,
): Extract<WebsiteSection, { type: T }> &
  (T extends 'image-with-text'
    ? { content: WebsiteImageTextLegacyContent }
    : unknown) {
  if (!permitsWebsiteSection(type, target))
    throw new Error('Section is not permitted on this page or theme');
  return websiteSectionSchema.parse({
    id,
    type,
    version: websiteSectionManifest[type].version,
    visible: true,
    ...structuredClone(websiteSectionManifest[type].defaults),
  }) as Extract<WebsiteSection, { type: T }> &
    (T extends 'image-with-text'
      ? { content: WebsiteImageTextLegacyContent }
      : unknown);
}

export function createTextSection(
  id: string,
  target: SectionTarget,
): WebsiteTextSection {
  return createWebsiteSection('text', id, target);
}

/** A drop is one immutable history entry. Unknown/self targets leave order intact. */
export function reorderWebsiteSection<T extends { id: string }>(
  sections: T[],
  id: string,
  targetId: string,
  placement: 'before' | 'after',
): T[] {
  const item = sections.find((section) => section.id === id);
  if (
    !item ||
    id === targetId ||
    !sections.some((section) => section.id === targetId)
  )
    return sections;
  const next = sections.filter((section) => section.id !== id);
  const index = next.findIndex((section) => section.id === targetId);
  next.splice(index + (placement === 'after' ? 1 : 0), 0, item);
  return next.every((section, i) => section === sections[i]) ? sections : next;
}

/** Immutable operations also work with retained theme-specific sections. */
export function moveWebsiteSection<T extends { id: string }>(
  sections: T[],
  id: string,
  offset: -1 | 1,
): T[] {
  const index = sections.findIndex((section) => section.id === id);
  const next = index + offset;
  if (index < 0 || next < 0 || next >= sections.length) return sections;
  const moved = [...sections];
  [moved[index], moved[next]] = [moved[next]!, moved[index]!];
  return moved;
}

/** The first block mutation replaces legacy content, leaving a single authoritative source. */
export function withWebsiteBlocks(
  section: WebsiteImageWithTextSection,
  blocks: WebsiteBlock[],
): WebsiteImageWithTextSection {
  if (!isImageTextBlocksContent({ blocks }))
    throw new Error('Invalid block composition');
  return { ...section, content: { blocks } };
}
export function createWebsiteBlock(
  type: WebsiteBlockType,
  id: string,
): WebsiteBlock {
  const common = { id, version: 1 as const, visible: true, presentation: {} };
  if (type === 'image')
    return { ...common, type, content: { assetId: null, url: '', alt: '' } };
  if (type === 'button')
    return {
      ...common,
      type,
      content: { label: 'Explore the shop', destination: '/products' },
    };
  return {
    ...common,
    type,
    content: {
      text:
        type === 'heading'
          ? 'Share your story'
          : type === 'eyebrow'
            ? 'From our farm'
            : 'Tell visitors a little more.',
    },
  };
}
export function editWebsiteBlocks(
  section: WebsiteImageWithTextSection,
  action:
    | { type: 'add'; block: WebsiteBlock }
    | { type: 'update'; block: WebsiteBlock }
    | { type: 'delete' | 'toggle'; id: string }
    | { type: 'duplicate'; id: string; newId: string }
    | { type: 'move'; id: string; offset: -1 | 1 }
    | {
        type: 'reorder';
        id: string;
        targetId: string;
        placement: 'before' | 'after';
      },
): WebsiteImageWithTextSection {
  const blocks = effectiveWebsiteBlocks(section);
  let next = blocks;
  const current =
    'id' in action ? blocks.find((b) => b.id === action.id) : undefined;
  if (action.type === 'add') next = [...blocks, action.block];
  if (action.type === 'update')
    return {
      ...section,
      content: {
        blocks: blocks.map((b) =>
          b.id === action.block.id ? action.block : b,
        ),
      },
    };
  if (current) {
    const definition = websiteBlockManifest[current.type];
    if (action.type === 'delete' && definition.min === 0)
      next = blocks.filter((b) => b.id !== current.id);
    if (action.type === 'toggle' && definition.min === 0)
      next = blocks.map((b) =>
        b === current ? { ...b, visible: !b.visible } : b,
      );
    if (action.type === 'duplicate') {
      next = [...blocks];
      next.splice(blocks.indexOf(current) + 1, 0, {
        ...structuredClone(current),
        id: action.newId,
      });
    }
    if (
      action.type === 'reorder' &&
      current.type !== 'image' &&
      blocks.some((b) => b.id === action.targetId && b.type !== 'image')
    ) {
      const text = blocks.filter((b) => b.type !== 'image');
      const reordered = reorderWebsiteSection(
        text,
        current.id,
        action.targetId,
        action.placement,
      );
      if (reordered !== text) {
        let i = 0;
        next = blocks.map((b) => (b.type === 'image' ? b : reordered[i++]!));
      }
    }
    if (action.type === 'move' && current.type !== 'image') {
      const copy = blocks.filter((b) => b.type !== 'image');
      const moved = moveWebsiteSection(copy, current.id, action.offset);
      if (copy.some((b, i) => b !== moved[i])) {
        let i = 0;
        next = blocks.map((b) => (b.type === 'image' ? b : moved[i++]!));
      }
    }
  }
  if (next === blocks || !isImageTextBlocksContent({ blocks: next }))
    return section;
  return withWebsiteBlocks(section, next);
}
