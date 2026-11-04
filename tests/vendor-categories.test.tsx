import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  type VendorCategoryApi,
  type VendorCategory,
  type CategoryImage,
} from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { ProductImages } from '../apps/admin/src/vendor/ProductImages';

function setup() {
  let rows: VendorCategory[] = [
    {
      id: '1',
      name: 'Produce',
      productCount: 0,
      productIds: [],
      image: null,
      imageAssetId: null,
    },
  ];
  const api: VendorCategoryApi = {
    list: vi.fn(async () => rows),
    images: vi.fn(async () => []),
    upload: vi.fn(),
    save: vi.fn(async (input) => {
      const category = {
        id: input.id ?? '2',
        name: input.name,
        image: null,
        imageAssetId: input.imageAssetId ?? null,
        productIds: input.productIds ?? [],
        productCount: input.productIds?.length ?? 0,
      };
      rows = [...rows.filter((c) => c.id !== category.id), category];
      return category;
    }),
    remove: vi.fn(async (id) => {
      rows = rows.filter((c) => c.id !== id);
      return true;
    }),
  };
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.categories = api;
  return { service, api };
}
describe('Vendor category workflows', () => {
  it('keeps the product image picker usable when library or upload responses omit translated names', async () => {
    const { api } = setup();
    vi.mocked(api.images).mockResolvedValue([
      { id: '10', preview: '/assets/unnamed.png' } as CategoryImage,
      { id: '11', name: 'Carrots.png', preview: '/assets/carrots.png' },
    ]);
    vi.mocked(api.upload).mockResolvedValue({
      id: '12',
      preview: '/assets/uploaded.png',
    } as CategoryImage);
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <ProductImages api={api} />
      </form>,
    );
    await user.click(screen.getByText('Product photographs'));
    await user.click(screen.getByRole('button', { name: 'Add photograph' }));
    const picker = await screen.findByRole('combobox', {
      name: 'Photograph 1',
    });
    await waitFor(() => expect(picker).toBeEnabled());
    await user.click(picker);
    await user.type(picker, 'image 10');
    await user.click(screen.getByRole('option', { name: 'Image 10' }));
    expect(
      new FormData(container.querySelector('form')!).getAll('assetIds'),
    ).toEqual(['10']);
    fireEvent.change(screen.getByLabelText('Upload image (PNG or JPEG)'), {
      target: {
        files: [new File(['png'], 'uploaded.png', { type: 'image/png' })],
      },
    });
    await waitFor(() =>
      expect(
        new FormData(container.querySelector('form')!).getAll('assetIds'),
      ).toEqual(['12']),
    );
    await user.click(picker);
    expect(
      screen.getByRole('option', { name: 'Image 12' }),
    ).toBeInTheDocument();
  });
});
