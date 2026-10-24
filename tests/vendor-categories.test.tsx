import { describe, it, expect, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  type VendorCategoryApi,
  type VendorCategory,
  type CategoryImage,
} from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { Products } from '../apps/admin/src/vendor/catalog';
import { Categories } from '../apps/admin/src/vendor/categories';
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
  it('quick-creates in a separate form, preserves unsaved product fields and persists assignments only with product save', async () => {
    const { service, api } = setup();
    const create = vi
      .spyOn(service, 'createProduct')
      .mockResolvedValue({ id: '99' });
    const user = userEvent.setup();
    render(<Products service={service} id="new" />);
    await screen.findByRole('combobox', { name: 'Categories' });
    await user.type(
      screen.getByRole('textbox', { name: 'Product name' }),
      'Unsaved radishes',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Slug' }),
      'unsaved-radishes',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Keep this description',
    );
    await user.click(
      screen.getByRole('button', { name: '+ Create New Category' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Create category',
    });
    const form = within(dialog)
      .getByRole('textbox', { name: 'Category name' })
      .closest('form')!;
    expect(form.parentElement?.closest('form')).toBeNull();
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Category name' }),
      'Harvest',
    );
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Create category',
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Create category' }),
      ).not.toBeInTheDocument(),
    );
    expect(api.save).toHaveBeenCalledWith({
      name: 'Harvest',
      imageAssetId: null,
    });
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Product name' })).toHaveValue(
      'Unsaved radishes',
    );
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Keep this description',
    );
    expect(
      document.querySelector('input[name="categoryIds"][value="2"]'),
    ).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Unsaved radishes',
          categoryIds: ['2'],
        }),
      ),
    );
  });
  it('creates empty categories, edits membership and confirms deletion', async () => {
    const { service, api } = setup();
    const user = userEvent.setup();
    render(<Categories service={service} />);
    await user.click(await screen.findByRole('button', { name: 'Produce' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit category' });
    expect(
      within(dialog).getByRole('combobox', { name: 'Products' }),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Delete category',
      }),
    );
    expect(api.remove).not.toHaveBeenCalled();
    const confirm = await screen.findByRole('dialog', {
      name: 'Confirm delete category',
    });
    await user.click(
      within(confirm).getByRole('button', { name: 'Confirm change' }),
    );
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('1'));
  });
  it('saves selected products from the category editor', async () => {
    const { service, api } = setup();
    const product = (await service.catalog('', 0)).items[0]!;
    const user = userEvent.setup();
    render(<Categories service={service} />);
    await user.click(await screen.findByRole('button', { name: 'Produce' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit category' });
    await user.click(
      within(dialog).getByRole('combobox', { name: 'Products' }),
    );
    await user.click(
      within(dialog).getByRole('option', { name: product.name }),
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        id: '1',
        name: 'Produce',
        imageAssetId: null,
        productIds: [product.id],
      }),
    );
  });
  it('uploads through the existing multipart API and saves only the resulting image ID', async () => {
    const { service, api } = setup();
    vi.mocked(api.upload).mockResolvedValue({
      id: '9',
      name: 'photo.png',
      preview: '/assets/photo.png',
    });
    const user = userEvent.setup();
    render(<Categories service={service} />);
    await user.click(screen.getByRole('button', { name: 'Create Category' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Create category',
    });
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Category name' }),
      'New',
    );
    const file = new File(['png'], 'photo.png', { type: 'image/png' });
    fireEvent.change(
      within(dialog).getByLabelText('Upload image (PNG or JPEG)'),
      { target: { files: [file] } },
    );
    await waitFor(() =>
      expect(
        within(dialog).getByAltText('Selected category'),
      ).toBeInTheDocument(),
    );
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Create category',
      }),
    );
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        name: 'New',
        imageAssetId: '9',
        productIds: [],
      }),
    );
  });
});
