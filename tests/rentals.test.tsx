import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppError } from '@market/api';
import { expect, it, vi } from 'vitest';
import { Rentals } from '../apps/admin/src/market/phase14/Rentals';
import { CategoryImageField } from '../apps/admin/src/vendor/categories';
import { rentalStockImages } from '../apps/admin/src/market/phase14/rental-stock';
import { createLiveMarketService } from '../apps/admin/src/market/service';
import { marketFixtureContext } from '../apps/admin/src/market/fixture';
import { managerData } from './fixtures/market-dashboard-data';

const image = { id: '81', name: 'Market table', preview: '/assets/table.jpg' };
it('selects shared stock without copying it into My Images', async () => {
  const user = userEvent.setup();
  const upload = vi.fn().mockResolvedValue(image);
  render(
    <Rentals
      data={managerData()}
      run={vi.fn()}
      canManage
      view="add"
      media={{ images: vi.fn().mockResolvedValue([]), upload }}
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Upload or choose image' }),
  );
  await user.click(screen.getByRole('tab', { name: 'Stock Images' }));
  expect(screen.queryByText(/Original AI/i)).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Enlarge / })).toHaveLength(10);
  await user.click(
    screen.getByRole('button', { name: 'Enlarge Six-foot folding table' }),
  );
  const enlarged = screen.getByRole('dialog', {
    name: 'Image preview: Six-foot folding table',
  });
  expect(within(enlarged).getByRole('img')).toHaveAttribute(
    'src',
    rentalStockImages[0]!.preview,
  );
  expect(upload).not.toHaveBeenCalled();
  await user.click(within(enlarged).getByRole('button', { name: 'Close' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', {
        name: 'Image preview: Six-foot folding table',
      }),
    ).toBeNull(),
  );
  await user.click(
    screen.getByRole('button', { name: 'Choose Six-foot folding table' }),
  );
  await screen.findByRole('button', { name: 'Replace image' });
  expect(upload).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Replace image' }));
  await user.click(screen.getByRole('tab', { name: 'My Images' }));
  expect(
    within(screen.getByRole('tabpanel', { name: 'My Images' })).queryByRole(
      'button',
      { name: /^Choose / },
    ),
  ).toBeNull();
  expect(
    screen.getByText(
      'Your image library is empty. Upload a PNG or JPEG to get started.',
    ),
  ).toBeInTheDocument();
});
it('does not add a saved theme selection to My Images after reopening', async () => {
  const user = userEvent.setup();
  const theme = {
    ...image,
    id: 'theme-1',
    name: 'Theme sample',
    source: 'theme',
  };
  const api = {
    images: vi.fn().mockResolvedValue([image]),
    upload: vi.fn(),
    themeImages: vi.fn().mockResolvedValue([theme]),
  };
  const choose = vi.fn();
  const view = render(
    <CategoryImageField
      api={api}
      themeId="harvest"
      presentation="library"
      onImageChange={choose}
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Category image (optional)' }),
  );
  await user.click(screen.getByRole('tab', { name: 'Theme Images' }));
  await user.click(
    await screen.findByRole('button', { name: 'Choose Theme sample' }),
  );
  expect(choose).toHaveBeenCalledWith(theme);
  view.rerender(
    <CategoryImageField
      api={api}
      themeId="harvest"
      presentation="library"
      value={theme.id}
      preview={theme.preview}
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Category image (optional)' }),
  );
  await user.click(screen.getByRole('tab', { name: 'My Images' }));
  const mine = within(screen.getByRole('tabpanel', { name: 'My Images' }));
  expect(
    mine.getByRole('button', { name: 'Choose Market table' }),
  ).toBeInTheDocument();
  expect(
    mine.queryByRole('button', { name: 'Choose Current image' }),
  ).toBeNull();
  expect(
    mine.queryByRole('button', { name: 'Choose Theme sample' }),
  ).toBeNull();
  expect(api.upload).not.toHaveBeenCalled();
});
it('preserves the ordinary image picker without a stock tab', async () => {
  const user = userEvent.setup();
  render(
    <CategoryImageField
      api={{ images: vi.fn().mockResolvedValue([]), upload: vi.fn() }}
      presentation="library"
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Category image (optional)' }),
  );
  expect(screen.queryByRole('tab', { name: 'Stock Images' })).toBeNull();
});
it('enlarges library and theme images without choosing them', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <CategoryImageField
      api={{
        images: vi.fn().mockResolvedValue([image]),
        upload: vi.fn(),
        themeImages: vi
          .fn()
          .mockResolvedValue([
            { ...image, id: 'theme-1', name: 'Theme sample' },
          ]),
      }}
      themeId="harvest"
      presentation="library"
      onImageChange={change}
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Category image (optional)' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Enlarge Market table' }),
  );
  const preview = screen.getByRole('dialog', {
    name: 'Image preview: Market table',
  });
  await user.click(within(preview).getByRole('button', { name: 'Close' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Image preview: Market table' }),
    ).toBeNull(),
  );
  await user.click(screen.getByRole('tab', { name: 'Theme Images' }));
  await user.click(
    await screen.findByRole('button', { name: 'Enlarge Theme sample' }),
  );
  expect(
    screen.getByRole('dialog', { name: 'Image preview: Theme sample' }),
  ).toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});
it('enables market media with the market storefront grant and does not substitute vendor grants', () => {
  const context = marketFixtureContext();
  const service = (permissions: typeof context.permissions) =>
    createLiveMarketService(
      { ...context, permissions },
      'http://localhost/admin-api',
      'market',
      vi.fn(),
    );
  expect(
    service([...context.permissions, 'ManageMarketStorefront']).rentalMedia,
  ).toBeDefined();
  expect(
    service([...context.permissions, 'ManageOwnStorefront']).rentalMedia,
  ).toBeUndefined();
});
async function review() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  return user;
}

it('chooses an image, preserves drafts between stages and saves only after review', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue({ id: 9 });
  render(
    <Rentals
      data={managerData()}
      run={run}
      canManage
      media={{ images: vi.fn().mockResolvedValue([image]), upload: vi.fn() }}
    />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(
    screen.queryByRole('link', { name: 'Add rental equipment' }),
  ).toBeNull();
  await user.click(
    screen.getByRole('button', { name: 'Add rental equipment' }),
  );
  await user.type(screen.getByLabelText('Rental name'), 'Table set');
  await user.click(
    screen.getByRole('button', { name: 'Upload or choose image' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Choose Market table' }),
  );
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.clear(screen.getByLabelText('Default quantity'));
  await user.type(screen.getByLabelText('Default quantity'), '11');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(
    screen.getByText('Default quantity cannot exceed the maximum per vendor.'),
  ).toBeInTheDocument();
  expect(run).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Default quantity'));
  await user.type(screen.getByLabelText('Default quantity'), '2');
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByLabelText('Rental name')).toHaveValue('Table set');
  await review();
  expect(
    screen.getByRole('heading', { name: 'Review your rental equipment' }),
  ).toBeInTheDocument();
  expect(run).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save rental' }));
  await screen.findByRole('heading', { name: 'Rental equipment added' });
  expect(run).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      action: 'SAVE_RENTAL',
      data: {
        details: expect.objectContaining({
          name: 'Table set',
          imageAssetId: image.id,
          image: image.preview,
          defaultQuantity: 2,
        }),
      },
    }),
  );
});

it('uploads through the existing media API and supports removing the image', async () => {
  const user = userEvent.setup();
  const upload = vi.fn().mockResolvedValue(image);
  render(
    <Rentals
      data={managerData()}
      run={vi.fn()}
      canManage
      view="add"
      media={{ images: vi.fn().mockResolvedValue([]), upload }}
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Upload or choose image' }),
  );
  const file = new File(['image'], 'table.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('Upload image (PNG or JPEG)'), file);
  await screen.findByRole('button', { name: 'Replace image' });
  expect(upload).toHaveBeenCalledWith(file);
  await user.click(screen.getByRole('button', { name: 'Remove image' }));
  expect(screen.queryByRole('img', { name: 'Selected equipment' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Upload or choose image' }),
  ).toBeInTheDocument();
});

it('edits with the original revision and prevents duplicate saves and dismissal while pending', async () => {
  const user = userEvent.setup();
  const data = managerData();
  let finish!: (value: unknown) => void;
  const run = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<Rentals data={data} run={run} canManage />);
  await user.click(screen.getByRole('button', { name: 'Edit Folding Table' }));
  expect(screen.getByLabelText('Rental name')).toHaveValue('Folding Table');
  await review();
  const dialog = screen.getByRole('dialog');
  await user.dblClick(screen.getByRole('button', { name: 'Save rental' }));
  expect(run).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole('button', { name: 'Close' })).toBeDisabled();
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 1,
      expectedRevision: data.rentals![0]!.revision,
    }),
  );
  finish({ id: 1 });
  await screen.findByRole('heading', { name: 'Rental equipment updated' });
});

it('keeps a failed save in the modal and prevents replay when the outcome is uncertain', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockRejectedValue(new AppError('network'));
  render(<Rentals data={managerData()} run={run} canManage />);
  await user.click(screen.getByRole('button', { name: 'Edit Folding Table' }));
  await review();
  await user.click(screen.getByRole('button', { name: 'Save rental' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save rental' })).toBeDisabled(),
  );
  expect(
    screen.getByText(/The save could not be confirmed/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Rental equipment updated' }),
  ).toBeNull();
});

it('filters the table and does not expose creation or editing to read-only users', () => {
  render(
    <Rentals data={managerData()} run={vi.fn()} canManage={false} view="add" />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Add rental equipment' }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: /Edit Folding/ })).toBeNull();
  fireEvent.change(screen.getByLabelText('Search rental equipment'), {
    target: { value: 'tent' },
  });
  expect(screen.getByRole('row', { name: /Market Tent/ })).toBeInTheDocument();
  expect(screen.queryByRole('row', { name: /Folding Table/ })).toBeNull();
});
