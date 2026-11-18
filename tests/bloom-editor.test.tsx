import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import {
  bloomPalettes,
  defaultStorefrontAppearance,
  type StorefrontThemeId,
} from '@market/theme/storefront';
import type { StorefrontAppearanceRecord } from '@market/api';

function fixture(theme: StorefrontThemeId) {
  const record: StorefrontAppearanceRecord = {
    id: '11',
    name: 'Garden Farm',
    version: 3,
    draft: { ...structuredClone(defaultStorefrontAppearance), theme },
    published: null,
    publishedAt: null,
  };
  return {
    read: vi.fn(async () => [record]),
    links: vi.fn(async () => []),
    preview: vi.fn(async () => ({
      token: 'x'.repeat(43),
      url: 'http://preview-vendor.localhost:4321',
      expiresAt: Date.now() + 300000,
    })),
    products: vi.fn(async () => []),
    save: vi.fn(async () => record),
    publish: vi.fn(async () => record),
  };
}

async function openAppearance(theme: StorefrontThemeId) {
  render(<StorefrontAppearanceSettings market={false} api={fixture(theme)} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Theme settings' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
}

describe('Bloom appearance settings', () => {
  it('shows Bloom palettes with their own colours and no hover setting', async () => {
    await openAppearance('bloom');
    const palette = screen.getByLabelText('Color palette');
    for (const [key, colors] of Object.entries(bloomPalettes)) {
      const option = palette.querySelector(`option[value="${key}"]`)!;
      expect(option.textContent).toContain(colors.label);
      expect(
        [...option.querySelectorAll<HTMLElement>('.ui-palette-swatch')].map(
          (swatch) => swatch.style.backgroundColor,
        ),
      ).toHaveLength(4);
    }
    const sage = palette.querySelector('option[value="sage"]')!;
    const first = sage.querySelector<HTMLElement>('.ui-palette-swatch')!;
    first.style.color = bloomPalettes.sage.primary;
    expect(first.style.backgroundColor).toBe(first.style.color);
    expect(screen.queryByLabelText('Button hover effect')).toBeNull();
  });

  it('keeps the shared palettes and hover setting for Harvest', async () => {
    await openAppearance('harvest');
    expect(
      screen.getByLabelText('Color palette').querySelector('option')
        ?.textContent,
    ).toContain('Sage');
    expect(screen.getByLabelText('Button hover effect')).toBeInTheDocument();
  });
});
