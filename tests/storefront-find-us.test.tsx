import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import { AppearancePreorder } from '../apps/storefront/src/components/AppearancePreorder';
import {
  defaultFindUs,
  defaultStorefrontAppearance,
  storefrontAppearanceSchema,
  storefrontPreviewPath,
} from '@market/theme/storefront';
import type { StorefrontAppearanceRecord } from '@market/api';

describe('Find Us editor', () => {
  it('keeps older documents valid and rejects manual schedules and external destinations', () => {
    expect(
      storefrontAppearanceSchema.safeParse(defaultStorefrontAppearance).success,
    ).toBe(true);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        findUs: defaultFindUs,
      }).success,
    ).toBe(true);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        findUs: { ...defaultFindUs, markets: [{ id: '1' }] },
      }).success,
    ).toBe(false);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        findUs: {
          ...defaultFindUs,
          cta: { ...defaultFindUs.cta, destination: 'https://example.com' },
        },
      }).success,
    ).toBe(false);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        findUs: {
          ...defaultFindUs,
          introduction: {
            ...defaultFindUs.introduction,
            image: 'https://example.com/x.jpg',
          },
        },
      }).success,
    ).toBe(false);
    expect(storefrontPreviewPath('/find-us')).toBe(true);
    expect(storefrontPreviewPath('/find-us/checkout')).toBe(false);
  });
  it('edits independent introduction and invitation, saves a draft and publishes through the existing workflow', async () => {
    const record: StorefrontAppearanceRecord = {
      id: '11',
      name: 'Farm',
      version: 1,
      draft: structuredClone(defaultStorefrontAppearance),
      published: null,
      publishedAt: null,
    };
    const api = {
      read: vi.fn(async () => [record]),
      links: vi.fn(async () => []),
      preview: vi.fn(async () => ({
        token: 'x'.repeat(43),
        url: 'http://preview.localhost:4321',
        expiresAt: Date.now() + 300000,
      })),
      save: vi.fn(async (_id, _version, draft) => ({
        ...record,
        draft,
        version: 2,
      })),
      publish: vi.fn(async () => ({ ...record, version: 3 })),
    };
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.change(await screen.findByLabelText('Preview page'), {
      target: { value: 'find' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find Us page' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Enable Find Us page' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Come meet us' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Heading size' }), {
      target: { value: '125' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Paragraph size' }), {
      target: { value: '110' },
    });
    fireEvent.change(screen.getByLabelText('Image size'), {
      target: { value: 'large' },
    });
    fireEvent.change(screen.getByLabelText('Text alignment'), {
      target: { value: 'center' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Closing invitation' }));
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Bring something home' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    const saved = api.save.mock.calls[0]![2];
    expect(saved.findUs).toMatchObject({
      enabled: true,
      introduction: {
        heading: 'Come meet us',
        imageSize: 'large',
        textAlign: 'center',
      },
      cta: { heading: 'Bring something home' },
    });
    expect(saved.textSizes?.['find-intro']).toEqual({
      heading: 125,
      paragraph: 110,
    });
    expect(saved.about).toEqual(defaultStorefrontAppearance.about);
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('11', 2));
  });
});
it('protects the direct appearance action against duplicate clicks and surfaces cart conflicts without navigating', async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: { kind: 'conflict', code: 'NONEMPTY_CONTEXT_SWITCH_DENIED' },
      }),
      { status: 409 },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  render(<AppearancePreorder storefrontId="11" occurrenceId="9" />);
  const button = screen.getByRole('button', {
    name: 'Preorder for This Market',
  });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByRole('alert');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toMatchObject({
    action: 'select-occurrence',
    occurrenceId: '9',
    requireAvailable: true,
  });
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Remove the current items',
  );
});
it('disables commerce on the actual page preview action', () => {
  render(<AppearancePreorder storefrontId="11" occurrenceId="9" preview />);
  expect(screen.getByRole('button')).toBeDisabled();
});
