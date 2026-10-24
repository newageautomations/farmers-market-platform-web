import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  aboutSections,
  defaultAboutCta,
  defaultStorefrontAppearance,
  storefrontAppearanceSchema,
  storefrontStoryImageShapes,
  type AboutSection,
} from '@market/theme/storefront';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import type { StorefrontAppearanceRecord } from '@market/api';

function section(id = 'story-one'): AboutSection {
  return {
    id,
    layout: 'text-image',
    heading: 'Our farm',
    body: 'First paragraph\n\nSecond paragraph',
    imageAssetId: '10',
    image: 'https://assets.example.test/farm.jpg',
    alt: 'Our field',
    shape: 'rounded',
    imagePosition: 'right',
    visible: true,
  };
}
function setup(items?: AboutSection[]) {
  const record: StorefrontAppearanceRecord = {
    id: '11',
    name: 'Garden Farm',
    version: 3,
    published: null,
    publishedAt: null,
    draft: {
      ...structuredClone(defaultStorefrontAppearance),
      about: {
        enabled: true,
        title: 'Our story',
        content: 'Original full story',
        ...(items ? { sections: items, sectionsVersion: 1 as const } : {}),
      },
    },
  };
  const api = {
    read: vi.fn(async () => [record]),
    links: vi.fn(async () => []),
    preview: vi.fn(async () => ({
      token: 'x'.repeat(43),
      url: 'http://preview-vendor.localhost:4321',
      expiresAt: Date.now() + 300000,
    })),
    save: vi.fn(
      async (_id: string, _version: number, config: typeof record.draft) => ({
        ...record,
        draft: config,
        version: 4,
      }),
    ),
    publish: vi.fn(async () => ({ ...record, version: 5 })),
    media: {
      images: vi.fn(async () => [
        { id: '10', name: 'Field', preview: section().image },
      ]),
      upload: vi.fn(async () => ({
        id: '20',
        name: 'Uploaded',
        preview: 'https://assets.example.test/new.jpg',
      })),
      list: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
    },
  };
  return { record, api };
}
async function openAbout(api: ReturnType<typeof setup>['api']) {
  render(<StorefrontAppearanceSettings market={false} api={api} />);
  fireEvent.change(await screen.findByLabelText('Preview page'), {
    target: { value: 'about' },
  });
}
async function add(layout: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add Section' });
  fireEvent.click(within(dialog).getByRole('button', { name: layout }));
  const picker = screen.queryByRole('button', { name: 'Section image' });
  if (picker) await waitFor(() => expect(picker).toBeEnabled());
}
describe('Our Story sections', () => {
  it('warns before changing type, keeps cancelled content and resets only the confirmed section', async () => {
    const { api } = setup([
      section(),
      { ...section('other'), heading: 'Other story' },
    ]);
    await openAbout(api);
    fireEvent.click(screen.getByRole('button', { name: 'Our farm' }));
    const select = () =>
      fireEvent.change(screen.getByLabelText('Section type'), {
        target: { value: 'image' },
      });
    select();
    let dialog = await screen.findByRole('dialog', {
      name: 'Change section type?',
    });
    expect(within(dialog).getByText(/removes all text/)).toBeInTheDocument();
    expect(screen.getByLabelText('Body text')).toHaveValue(section().body);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(screen.getByLabelText('Section type')).toHaveValue('text-image');
    expect(screen.getByLabelText('Heading')).toHaveValue('Our farm');
    select();
    dialog = await screen.findByRole('dialog', {
      name: 'Change section type?',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Change section type' }),
    );
    expect(screen.queryByLabelText('Heading')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Heading')).toHaveValue('Our farm');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.sections?.[0]).toMatchObject({
      id: 'story-one',
      layout: 'image',
      heading: '',
      body: '',
      imageAssetId: null,
      image: '',
      alt: '',
      shape: 'natural',
      textAlign: 'left',
      imageSize: 'medium',
      imagePosition: 'right',
    });
    expect(api.save.mock.calls[0]![2].about.sections?.[1]).toEqual({
      ...section('other'),
      heading: 'Other story',
    });
    expect(api.media.remove).not.toHaveBeenCalled();
  });
  it('explains alternative text and offers proportional rounded and straight-edge images', async () => {
    const { api } = setup([section()]);
    await openAbout(api);
    fireEvent.click(screen.getByRole('button', { name: 'Our farm' }));
    const info = screen.getByRole('button', {
      name: 'About Image alternative text',
    });
    fireEvent.focus(info);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Screen readers read it aloud',
    );
    const shapes = screen.getByLabelText('Image shape');
    for (const name of [
      'Straight edges',
      'Rounded',
      'Rounded square',
      'Square',
    ])
      expect(within(shapes).getByRole('option', { name })).toBeInTheDocument();
    fireEvent.change(shapes, { target: { value: 'natural-rounded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.sections?.[0]?.shape).toBe(
      'natural-rounded',
    );
  });
  it('groups global settings above Add, keeps the page switch beside it, and reorders collapsed sections', async () => {
    const { api } = setup([
      section(),
      { ...section('second'), heading: 'Second story' },
    ]);
    await openAbout(api);
    const nav = screen.getByRole('navigation', { name: 'Page sections' });
    const top = Array.from(
      nav.querySelectorAll(':scope > details > summary'),
    ).map((node) => node.textContent?.trim());
    expect(top).toEqual(['Header', 'Footer', 'Theme settings']);
    const addButton = screen.getByRole('button', { name: 'Add Section' });
    const toggle = screen.getByRole('switch', {
      name: 'Enable the About page',
    });
    expect(addButton.parentElement).toContainElement(toggle);
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    const up = screen.getByRole('button', { name: 'Move up: Second story' });
    expect(up.closest('details')).toBeNull();
    expect(up.querySelector('svg')).not.toBeNull();
    fireEvent.click(up);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.sections?.map((s) => s.id)).toEqual(
      ['second', 'story-one'],
    );
    expect(api.save.mock.calls[0]![2].about.enabled).toBe(false);
  });
  it('lets the image dialog reach library images beyond the first page', async () => {
    const { api } = setup([section()]);
    const initial = Array.from({ length: 100 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Photo ${i + 1}`,
      preview: `https://assets.example.test/${i + 1}.jpg`,
    }));
    api.media.images.mockImplementation(async (skip = 0) =>
      skip === 0
        ? initial
        : [
            {
              id: '101',
              name: 'Last photo',
              preview: 'https://assets.example.test/101.jpg',
            },
          ],
    );
    await openAbout(api);
    fireEvent.click(screen.getByRole('button', { name: 'Our farm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Section image' }));
    const library = await screen.findByRole('dialog', {
      name: 'Choose an image',
    });
    await within(library).findByRole('button', { name: 'Choose Photo 100' });
    fireEvent.click(
      within(library).getByRole('button', { name: 'Load more images' }),
    );
    fireEvent.click(
      await within(library).findByRole('button', { name: 'Choose Last photo' }),
    );
    expect(api.media.images).toHaveBeenLastCalledWith(100);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.sections?.[0]?.imageAssetId).toBe(
      '101',
    );
  });
  it('opens the selected preview section and ignores stale IDs and untrusted origins', async () => {
    const { api } = setup([
      section(),
      { ...section('second-story'), heading: 'Second story' },
    ]);
    await openAbout(api);
    const frame = await screen.findByTitle<HTMLIFrameElement>(
      'Actual storefront preview',
    );
    await waitFor(() => expect(api.preview).toHaveBeenCalled());
    const select = (
      id: string,
      origin = 'http://preview-vendor.localhost:4321',
    ) =>
      act(() =>
        window.dispatchEvent(
          new MessageEvent('message', {
            origin,
            source: frame.contentWindow,
            data: {
              protocol: 'storefront-editor-v1',
              type: 'select',
              section: `story:${id}`,
            },
          }),
        ),
      );
    await waitFor(() => {
      select('second-story');
      expect(screen.getByLabelText('Heading')).toHaveValue('Second story');
    });
    select('missing-story');
    select('story-one', 'https://untrusted.example');
    expect(screen.getByLabelText('Heading')).toHaveValue('Second story');
    select('story-one');
    expect(screen.getByLabelText('Heading')).toHaveValue('Our farm');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Section image' }),
      ).toBeEnabled(),
    );
  });
  it('retains edits made during an upload and ignores completion after leaving its settings', async () => {
    const { api } = setup([section()]);
    let complete!: (value: {
      id: string;
      name: string;
      preview: string;
    }) => void;
    api.media.upload.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    await openAbout(api);
    fireEvent.click(screen.getByRole('button', { name: 'Our farm' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Section image' }),
      ).toBeEnabled(),
    );
    const upload = () =>
      fireEvent.change(screen.getByLabelText('Upload image (PNG or JPEG)'), {
        target: {
          files: [new File(['png'], 'new.png', { type: 'image/png' })],
        },
      });
    fireEvent.click(screen.getByRole('button', { name: 'Section image' }));
    upload();
    fireEvent.change(screen.getByLabelText('Body text'), {
      target: { value: 'Written while uploading' },
    });
    await act(async () =>
      complete({
        id: '20',
        name: 'Uploaded',
        preview: 'https://assets.example.test/new.jpg',
      }),
    );
    expect(screen.getByLabelText('Body text')).toHaveValue(
      'Written while uploading',
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Section image' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Section image' }));
    upload();
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: 'home' },
    });
    await act(async () =>
      complete({
        id: '30',
        name: 'Later upload',
        preview: 'https://assets.example.test/later.jpg',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.sections?.[0]).toMatchObject({
      body: 'Written while uploading',
      imageAssetId: '20',
    });
  });
  it('preserves full legacy content, supports intentional empty pages and provides a blank editable starter', () => {
    const legacy = {
      enabled: true,
      title: 'Legacy heading',
      content: 'x'.repeat(20000),
    };
    expect(aboutSections(legacy)[0]).toMatchObject({
      id: 'legacy-story',
      layout: 'text',
      heading: legacy.title,
      body: legacy.content,
    });
    expect(aboutSections({ ...legacy, sections: [] })[0]?.body).toBe(
      legacy.content,
    );
    expect(
      aboutSections({ ...legacy, sections: [], sectionsVersion: 1 }),
    ).toEqual([]);
    expect(aboutSections(defaultStorefrontAppearance.about)[0]).toMatchObject({
      layout: 'text-image',
      heading: '',
      body: '',
      image: '',
    });
    expect(defaultStorefrontAppearance.about.enabled).toBe(false);
  });
  it('bounds sections, rejects unsafe values and accepts every existing shape', () => {
    const config = {
      ...defaultStorefrontAppearance,
      about: {
        enabled: true,
        title: 'Story',
        content: '',
        sections: [section()],
        cta: defaultAboutCta,
      },
    };
    for (const layout of ['text', 'image', 'text-image'])
      for (const shape of storefrontStoryImageShapes)
        for (const imagePosition of ['left', 'right']) {
          expect(
            storefrontAppearanceSchema.safeParse({
              ...config,
              about: {
                ...config.about,
                sections: [{ ...section(), layout, shape, imagePosition }],
              },
            }).success,
          ).toBe(true);
        }
    for (const patch of [
      { layout: 'hero' },
      { shape: 'triangle' },
      { imagePosition: 'top' },
      { textAlign: 'justify' },
      { imageSize: 'huge' },
      { id: 'bad"]' },
      { heading: 'x'.repeat(161) },
      { body: 'x'.repeat(20001) },
      { image: 'javascript:alert(1)' },
      { imageAssetId: 'other' },
      { imageAssetId: null },
      { visible: 'yes' },
      { html: '<script>' },
    ]) {
      expect(
        storefrontAppearanceSchema.safeParse({
          ...config,
          about: { ...config.about, sections: [{ ...section(), ...patch }] },
        }).success,
      ).toBe(false);
    }
    for (const sections of [
      [section(), section()],
      Array.from({ length: 13 }, (_, i) => section(`s${i}`)),
      Array.from({ length: 12 }, (_, i) => ({
        ...section(`s${i}`),
        body: 'x'.repeat(20000),
      })),
    ]) {
      expect(
        storefrontAppearanceSchema.safeParse({
          ...config,
          about: { ...config.about, sections },
        }).success,
      ).toBe(false);
    }
    expect(
      storefrontAppearanceSchema.safeParse({
        ...config,
        about: {
          ...config.about,
          cta: { ...defaultAboutCta, destination: 'https://example.test' },
        },
      }).success,
    ).toBe(false);
  });
  it('adds each layout, selects it, duplicates and reorders stable identities, and saves without publishing', async () => {
    const { api, record } = setup([]);
    await openAbout(api);
    for (const layout of ['Text Only', 'Image Only', 'Text + Image'])
      await add(layout);
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Growing together' },
    });
    fireEvent.change(screen.getByLabelText('Body text'), {
      target: { value: 'Our own words\n\nAnother paragraph' },
    });
    fireEvent.change(screen.getByLabelText('Image shape'), {
      target: { value: 'star' },
    });
    fireEvent.change(screen.getByLabelText('Image position'), {
      target: { value: 'left' },
    });
    fireEvent.change(screen.getByLabelText('Text alignment'), {
      target: { value: 'center' },
    });
    fireEvent.change(screen.getByLabelText('Image size'), {
      target: { value: 'large' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(screen.getByLabelText('Heading')).toHaveValue('Growing together');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Section image' }),
      ).toBeEnabled(),
    );
    const movingRow = screen
      .getByLabelText('Heading')
      .closest('details')!.parentElement!;
    fireEvent.click(
      within(movingRow).getByRole('button', { name: /^Move up:/ }),
    );
    fireEvent.click(screen.getByLabelText('Show section'));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const saved = api.save.mock.calls[0]![2];
    expect(saved.about.sections?.map((s) => s.layout)).toEqual([
      'text',
      'image',
      'text-image',
      'text-image',
    ]);
    expect(new Set(saved.about.sections?.map((s) => s.id)).size).toBe(4);
    expect(saved.about.sections?.[2]).toMatchObject({
      heading: 'Growing together',
      shape: 'star',
      imagePosition: 'left',
      textAlign: 'center',
      imageSize: 'large',
      visible: false,
    });
    expect(saved.about.sections?.[3]?.visible).toBe(true);
    expect(saved.about.content).toBe('Original full story');
    expect(saved.homepage).toEqual(record.draft.homepage);
    expect(api.publish).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('11', 4));
  });
  it('reuses media selection and upload and never deletes an asset when removing a section', async () => {
    const { api } = setup([section()]);
    await openAbout(api);
    fireEvent.click(screen.getByRole('button', { name: 'Our farm' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Section image' }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByLabelText('Upload image (PNG or JPEG)').closest('dialog'),
    ).not.toHaveAttribute('open');
    expect(
      screen.queryByRole('button', { name: 'Remove image' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Section image' }));
    let library = await screen.findByRole('dialog', {
      name: 'Choose an image',
    });
    fireEvent.click(within(library).getByRole('button', { name: 'No image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Section image' }));
    library = await screen.findByRole('dialog', { name: 'Choose an image' });
    fireEvent.click(
      await within(library).findByRole('button', { name: 'Choose Field' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Section image' }));
    fireEvent.change(screen.getByLabelText('Upload image (PNG or JPEG)'), {
      target: { files: [new File(['png'], 'new.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(api.media.upload).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.sections?.[0]).toMatchObject({
      imageAssetId: '20',
      image: 'https://assets.example.test/new.jpg',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete section' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete this section?',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Delete section' }),
    );
    expect(api.media.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[1]![2].about.sections).toEqual([]);
    expect(api.save.mock.calls[1]![2].about.content).toBe(
      'Original full story',
    );
  });
  it('limits Add and Duplicate and keeps the CTA fixed with safe destinations', async () => {
    const { api } = setup(
      Array.from({ length: 12 }, (_, i) => ({
        ...section(`s${i}`),
        heading: `Story ${i}`,
      })),
    );
    await openAbout(api);
    expect(screen.getByRole('button', { name: 'Add Section' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Story 0' }));
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Closing invitation' }));
    expect(
      screen.queryByRole('button', { name: 'Duplicate' }),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole('button', { name: 'Closing invitation' })
        .closest('details')!
        .parentElement!.querySelector('.story-editor-reorder'),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Delete section' }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('CTA heading'), {
      target: { value: 'Meet us at the market' },
    });
    fireEvent.change(screen.getByLabelText('Button destination'), {
      target: { value: '/' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].about.cta).toMatchObject({
      heading: 'Meet us at the market',
      destination: '/',
    });
  });
});
