import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AboutStoryEditor } from '../apps/admin/src/AboutStoryEditor';
import type { StorefrontAppearanceApi } from '@market/api';
import {
  createAboutSection,
  type StorefrontAppearance,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import { TextSizeControls } from '../apps/admin/src/TextSizeControls';
import {
  defaultStorefrontAppearance,
  storefrontAppearanceSchema,
  storefrontTextSizeCss,
  type StorefrontTextSizes,
} from '@market/theme/storefront';
it('bounds font percentages, validates section keys, and keeps original documents unchanged', () => {
  expect(
    storefrontAppearanceSchema.parse(defaultStorefrontAppearance).textSizes,
  ).toBeUndefined();
  for (const textSizes of [
    { hero: { heading: 201, paragraph: 100 } },
    { hero: { heading: 100, paragraph: 74 } },
    { hero: { heading: 100, paragraph: 151 } },
    { hero: { heading: 100.1, paragraph: 100 } },
    { 'hero]{}': { heading: 100, paragraph: 100 } },
  ])
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        textSizes,
      }).success,
    ).toBe(false);
  expect(
    storefrontTextSizeCss({
      textSizes: {
        'story:my-story': { heading: 150, paragraph: 120 },
        hero: { heading: 125, paragraph: 110 },
      },
    }),
  ).toContain('[data-editor-section="story:my-story"]');
  expect(storefrontTextSizeCss({})).toBe('');
  expect(
    storefrontTextSizeCss({
      textSizes: { featured: { heading: 150, paragraph: 100 } },
    }),
  ).not.toContain(' p{');
});
it('provides separate keyboard-accessible native size sliders with current values', () => {
  function Form() {
    const [value, onChange] = useState<StorefrontTextSizes[string]>({
      heading: 100,
      paragraph: 100,
    });
    return <TextSizeControls value={value} onChange={onChange} />;
  }
  render(<Form />);
  const heading = screen.getByRole('slider', { name: 'Heading size' }),
    paragraph = screen.getByRole('slider', { name: 'Paragraph size' });
  fireEvent.change(heading, { target: { value: '150' } });
  expect(heading).toHaveValue('150');
  expect(paragraph).toHaveValue('100');
  expect(heading).toHaveAttribute('aria-valuetext', '150% of theme size');
  fireEvent.change(paragraph, { target: { value: '120' } });
  expect(paragraph).toHaveValue('120');
});

it('preserves duplicated story sizes and allows independent adjustments', () => {
  function Editor() {
    const [about, setAbout] = useState<StorefrontAppearance['about']>({
      enabled: true,
      title: 'Our Story',
      content: '',
      sectionsVersion: 1,
      sections: [
        {
          ...createAboutSection('intro', 'text'),
          heading: 'Our farm',
          body: 'Hello',
        },
      ],
    });
    const [sizes, setSizes] = useState<StorefrontTextSizes>({
      'story:intro': { heading: 150, paragraph: 120 },
    });
    const [selected, choose] = useState<StorefrontEditorSection>('story:intro');
    return (
      <>
        <button onClick={() => choose('story:intro')}>Select original</button>
        <AboutStoryEditor
          about={about}
          api={{} as StorefrontAppearanceApi}
          selected={selected}
          collapsed={false}
          choose={choose}
          collapse={() => {}}
          onChange={(about, sizes) => {
            setAbout(about);
            if (sizes) setSizes(sizes);
          }}
          busy={false}
          textSizes={sizes}
          onTextSizeChange={(id, value) =>
            setSizes((current) => ({ ...current, [id]: value }))
          }
        />
      </>
    );
  }
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
  expect(screen.getByRole('slider', { name: 'Heading size' })).toHaveValue(
    '150',
  );
  fireEvent.change(screen.getByRole('slider', { name: 'Heading size' }), {
    target: { value: '175' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Select original' }));
  expect(screen.getByRole('slider', { name: 'Heading size' })).toHaveValue(
    '150',
  );
  expect(screen.getByRole('slider', { name: 'Paragraph size' })).toHaveValue(
    '120',
  );
});
