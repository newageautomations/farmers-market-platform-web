import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  createWebsiteBlock,
  createWebsiteSection,
  isWebsiteBlock,
  websiteSectionSchema,
  websiteSizingLimits,
  websiteSectionStyle,
  websiteObjectStyle,
  type WebsiteSection,
  type SectionTarget,
} from '@market/theme/storefront';
import { websiteSectionEditors } from '../apps/admin/src/WebsiteTextSectionEditor';

const targets: SectionTarget[] = [
  { theme: 'harvest', themeVersion: 1, page: 'home' },
  { theme: 'modern-farmhouse', themeVersion: 2, page: 'home' },
  { theme: 'editorial-market', themeVersion: 1, page: 'home' },
];

it.each(targets)(
  'strictly validates numeric sizing for $theme on every section and page',
  (target) => {
    for (const type of ['text', 'image-with-text', 'cta-banner'] as const) {
      const section = createWebsiteSection(type, `${type}-sizing`, target);
      for (const [key, [min, max]] of Object.entries(websiteSizingLimits)) {
        for (const value of [min, max])
          expect(
            websiteSectionSchema.safeParse({
              ...section,
              presentation: {
                ...section.presentation,
                sizing: { [key]: value },
              },
            }).success,
          ).toBe(true);
        for (const value of [
          min - 1,
          max + 1,
          99.5,
          NaN,
          Infinity,
          '100',
          null,
        ])
          expect(
            websiteSectionSchema.safeParse({
              ...section,
              presentation: {
                ...section.presentation,
                sizing: { [key]: value },
              },
            }).success,
          ).toBe(false);
      }
      for (const sizing of [
        null,
        [],
        { css: 'color:red' },
        { heading: '100;display:none' },
      ]) {
        expect(
          websiteSectionSchema.safeParse({
            ...section,
            presentation: { ...section.presentation, sizing },
          }).success,
        ).toBe(false);
        expect(
          websiteSectionStyle({
            ...section,
            presentation: { ...section.presentation, sizing },
          } as WebsiteSection),
        ).not.toContain('display:none');
      }
    }
  },
);

it.each(['heading', 'paragraph', 'eyebrow', 'button'] as const)(
  'bounds per-object %s scale while preserving its other presentation values',
  (type) => {
    const block = createWebsiteBlock(type, 'block-sized');
    for (const scale of [50, 123, 200])
      expect(
        isWebsiteBlock({
          ...block,
          presentation: { ...block.presentation, scale },
        }),
      ).toBe(true);
    for (const scale of [49, 201, 100.5, NaN, '120', null])
      expect(isWebsiteBlock({ ...block, presentation: { scale } })).toBe(false);
    expect(
      websiteObjectStyle(
        createWebsiteSection('text', 'text-test', targets[0]!),
        type,
        {
          ...block,
          presentation: { scale: '100;display:none' },
        } as unknown as typeof block,
      ),
    ).toBeUndefined();
  },
);

it.each(targets)(
  'edits numeric section sizing and allows presets and reset to take control for $theme',
  (target) => {
    let latest: WebsiteSection;
    function Editor() {
      const [value, setValue] = useState<WebsiteSection>(() =>
        createWebsiteSection(
          'image-with-text',
          'image-with-text-controls',
          target,
        ),
      );
      latest = value;
      const SectionEditor = websiteSectionEditors['image-with-text'];
      return (
        <SectionEditor value={value} target={target} onChange={setValue} />
      );
    }
    render(<Editor />);
    for (const [label, value] of [
      ['Heading size', 137],
      ['Paragraph size', 119],
      ['Button size', 123],
      ['Image width', 67],
      ['Image height', 531],
      ['Content width', 84],
      ['Section minimum height', 629],
      ['Content spacing', 37],
      ['Section padding', 61],
    ] as const) {
      expect(screen.getByLabelText(label)).toHaveAttribute('type', 'range');
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    expect(latest!.presentation.sizing).toEqual({
      heading: 137,
      paragraph: 119,
      button: 123,
      imageWidth: 67,
      imageHeight: 531,
      width: 84,
      height: 629,
      gap: 37,
      padding: 61,
    });
    expect(
      screen.getByLabelText('Column proportions (image / text)'),
    ).toHaveValue('custom');
    expect(screen.getByLabelText('Internal spacing')).toHaveValue('custom');
    expect(
      websiteSectionSchema.parse(JSON.parse(JSON.stringify(latest!))),
    ).toEqual(latest!);
    fireEvent.change(
      screen.getByLabelText('Column proportions (image / text)'),
      { target: { value: '40-60' } },
    );
    expect(screen.getByLabelText('Image width')).toHaveValue('40');
    fireEvent.change(screen.getByLabelText('Internal spacing'), {
      target: { value: 'compact' },
    });
    expect(latest!.presentation.sizing).not.toHaveProperty('gap');
    expect(latest!.presentation.sizing).not.toHaveProperty('padding');
    fireEvent.change(screen.getByLabelText('Image position'), {
      target: { value: 'background' },
    });
    expect(screen.queryByLabelText('Image width')).toBeNull();
    expect(
      screen.queryByLabelText('Column proportions (image / text)'),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset sizes' }));
    expect(latest!.presentation.sizing).toEqual({});
  },
);
