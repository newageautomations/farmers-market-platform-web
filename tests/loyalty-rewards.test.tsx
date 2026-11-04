import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppError,
  type LoyaltyOverview,
  type LoyaltyReward,
} from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { VendorLoyalty } from '../apps/admin/src/vendor/loyalty';
import {
  LoyaltyRewardWizard,
  rewardKindLabels,
} from '../apps/admin/src/vendor/LoyaltyRewardWizard';

function setup(manage = true, count = 4) {
  const service = createFixtureVendorService({
    ...fixtureContexts.VENDOR,
    permissions: [
      ...fixtureContexts.VENDOR.permissions,
      ...(manage ? ['ManageOwnCoupon' as const] : []),
    ],
  });
  let rewards: LoyaltyReward[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    versionId: i + 10,
    status: ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'DRAFT'][i % 4]!,
    redemptions: i + 9,
    terms: {
      name:
        [
          'Honey discount',
          'Free berry pint',
          'Produce discount',
          'Tote discount',
        ][i % 4] + (count > 4 ? ` ${String(i).padStart(2, '0')}` : ''),
      description: i === 0 ? 'Save on a jar of honey.' : '',
      imageAssetId: i === 0 ? '9' : null,
      image: i === 0 ? '/honey.png' : null,
      kind: i === 1 ? 'FREE_PRODUCT' : 'FIXED',
      points: (i + 1) * 500,
      value: 200,
      maximum: 0,
      minimum: 0,
      quantity: 1,
      variantIds: [],
      startsAt: null,
      endsAt: null,
      limit: null,
    },
  }));
  const overview = vi.fn(async (): Promise<LoyaltyOverview> => ({
    enabled: true,
    rewards: structuredClone(rewards),
    redemptions: [],
    trend: [],
    top: [],
    leaderboard: [],
    skip: 0,
    take: 25,
    metrics: {
      customers: 0,
      outstanding: '0',
      pending: '0',
      issued: '0',
      lifetime: '0',
      repeat: 0,
      rewardOrders: 0,
    },
  }));
  const save = vi.fn(async (terms, status, id) => {
    const reward = {
      id: id ?? 100,
      versionId: 100,
      terms,
      status,
      redemptions: 0,
    };
    rewards = id
      ? rewards.map((row) => (row.id === id ? reward : row))
      : [...rewards, reward];
    return reward;
  });
  service.loyalty = {
    overview,
    program: vi.fn(),
    save,
  } as unknown as NonNullable<typeof service.loyalty>;
  service.categories = {
    images: vi.fn(async () => [
      { id: '9', name: 'Honey photo', preview: '/honey.png' },
      { id: '10', name: 'New photo', preview: '/new.png' },
    ]),
    upload: vi.fn(async () => ({
      id: '11',
      name: 'Uploaded photo',
      preview: '/uploaded.png',
    })),
  } as unknown as NonNullable<typeof service.categories>;
  return { service, save, overview };
}
beforeEach(() => window.history.replaceState(null, '', '/vendor/loyalty'));
const openRewards = async () => {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Loyalty' })).getByRole(
      'link',
      { name: 'Rewards' },
    ),
  );
  return screen.findByRole('table', { name: 'Loyalty rewards' });
};
function actions(name = 'Honey discount') {
  fireEvent.click(screen.getByText(`Actions for ${name}`));
}

describe('loyalty rewards workspace', () => {
  it('keeps its header and route, filters real types and statuses, sorts and follows history', async () => {
    render(<VendorLoyalty service={setup().service} path="/vendor/loyalty" />);
    const heading = screen.getByRole('heading', { name: 'Loyalty Program' });
    await openRewards();
    expect(window.location.pathname).toBe('/vendor/loyalty');
    expect(window.location.hash).toBe('#rewards');
    expect(screen.getByRole('heading', { name: 'Loyalty Program' })).toBe(
      heading,
    );
    expect(screen.getByLabelText('Active rewards')).toHaveTextContent('1');
    expect(document.querySelector('img[src="/honey.png"]')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Reward type'), {
      target: { value: 'FREE_PRODUCT' },
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      2,
    );
    fireEvent.change(screen.getByLabelText('Reward type'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Reward status'), {
      target: { value: 'ARCHIVED' },
    });
    expect(screen.queryByText('Honey discount')).toBeNull();
    expect(screen.queryByText('Actions for Produce discount')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search rewards'), {
      target: { value: 'unknown' },
    });
    expect(screen.getByText('No rewards match')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Sort rewards'), {
      target: { value: 'points' },
    });
    expect(
      within(screen.getByRole('table')).getAllByRole('row')[1],
    ).toHaveTextContent('Honey discount');
    window.history.replaceState(null, '', '/vendor/loyalty');
    fireEvent.popState(window);
    await screen.findByRole('img', { name: /Points earned by day/ });
    window.history.replaceState(null, '', '/vendor/loyalty#rewards');
    fireEvent.popState(window);
    await screen.findByRole('table', { name: 'Loyalty rewards' });
  });
  it('confirms deactivation and archival, preserves terms, and refreshes counts', async () => {
    const { service, save } = setup();
    window.history.replaceState(null, '', '/vendor/loyalty#rewards');
    render(<VendorLoyalty service={service} path="/vendor/loyalty" />);
    await screen.findByRole('table');
    actions();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate reward' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ imageAssetId: '9', image: '/honey.png' }),
        'INACTIVE',
        1,
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Paused rewards')).toHaveTextContent('2'),
    );
    actions();
    fireEvent.click(
      within(
        screen.getByText('Actions for Honey discount').closest('details')!,
      ).getByRole('button', { name: 'Archive' }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'cannot be edited or reactivated',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Archive reward' }));
    await waitFor(() =>
      expect(screen.queryByText('Actions for Honey discount')).toBeNull(),
    );
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Honey discount' }),
      'ARCHIVED',
      1,
    );
  });
  it('edits images through the existing library and saves the chosen asset with the existing reward', async () => {
    const { service, save } = setup();
    render(<VendorLoyalty service={service} path="/vendor/loyalty/rewards" />);
    await screen.findByRole('table');
    actions();
    fireEvent.click(
      within(
        screen.getByText('Actions for Honey discount').closest('details')!,
      ).getByRole('button', { name: 'Edit' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Reward image (optional)' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Choose New photo' }),
    );
    expect(screen.getByRole('img', { name: 'Reward preview' })).toHaveAttribute(
      'src',
      '/new.png',
    );
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Fresh honey reward.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish reward' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          imageAssetId: '10',
          image: '/new.png',
          description: 'Fresh honey reward.',
        }),
        'ACTIVE',
        1,
      ),
    );
    await screen.findByRole('heading', {
      name: 'Reward successfully published',
    });
    expect(screen.queryByRole('button', { name: 'Publish reward' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.pathname).toBe('/vendor/loyalty');
  });
  it('creates in a dialog, and does not reopen it when returning to rewards', async () => {
    render(<VendorLoyalty service={setup().service} path="/vendor/loyalty" />);
    fireEvent.click(screen.getByRole('link', { name: 'Create Reward' }));
    expect(
      await screen.findByRole('dialog', { name: 'Create reward' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Loyalty' })).getByRole(
        'link',
        { name: 'Overview' },
      ),
    );
    await openRewards();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('keeps mutation controls unavailable to read-only users and paginates the complete reward list', async () => {
    const { service } = setup(false, 24);
    render(<VendorLoyalty service={service} path="/vendor/loyalty/rewards" />);
    await screen.findByRole('table');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      21,
    );
    expect(screen.queryByRole('link', { name: 'Create Reward' })).toBeNull();
    expect(screen.queryByText(/Actions for/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      5,
    );
  });
  it('blocks repeated writes when the save outcome is uncertain', async () => {
    const { service, save } = setup();
    save.mockRejectedValue(new AppError('network'));
    render(<VendorLoyalty service={service} path="/vendor/loyalty/rewards" />);
    await screen.findByRole('table');
    actions();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate reward' }));
    await screen.findByText(/save result could not be confirmed/);
    expect(
      screen.getByRole('button', { name: 'Deactivate reward' }),
    ).toBeDisabled();
    expect(save).toHaveBeenCalledOnce();
  });
});

describe('reward creation stages', () => {
  const next = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  it('blocks a free product reward without a selected variant or valid quantity', async () => {
    const { service } = setup();
    const save = vi.fn();
    const { container } = render(
      <LoyaltyRewardWizard service={service} onSave={save} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Free product' }));
    next();
    fireEvent.change(screen.getByLabelText('Reward name *'), {
      target: { value: 'Free honey' },
    });
    fireEvent.submit(container.querySelector('form')!);
    expect(
      screen.getByText('Select a product and a positive whole quantity.'),
    ).toBeVisible();
    expect(screen.getByText(/Step 2 of 4/)).toBeVisible();
    const picker = screen.getByRole('combobox', {
      name: 'Product and variant *',
    });
    await waitFor(() => expect(picker).toHaveAttribute('aria-busy', 'false'));
    fireEvent.focus(picker);
    fireEvent.click(
      screen
        .getAllByRole('option')
        .find((o) => o.getAttribute('aria-disabled') !== 'true')!,
    );
    fireEvent.change(screen.getByLabelText('Free quantity *'), {
      target: { value: '1.5' },
    });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByText(/Step 2 of 4/)).toBeVisible();
    expect(save).not.toHaveBeenCalled();
  });
  it('keeps rejected reward details editable and dates cover the selected full day', async () => {
    const { service } = setup();
    const save = vi
      .fn()
      .mockRejectedValue(
        new AppError('validation', 'REWARD_PRODUCT_UNAVAILABLE'),
      );
    render(<LoyaltyRewardWizard service={service} onSave={save} />);
    next();
    fireEvent.change(screen.getByLabelText('Reward name *'), {
      target: { value: 'Keep my progress' },
    });
    next();
    expect(screen.getByLabelText('Start date (optional)')).toHaveAttribute(
      'type',
      'date',
    );
    fireEvent.change(screen.getByLabelText('Start date (optional)'), {
      target: { value: '2026-11-10' },
    });
    fireEvent.change(screen.getByLabelText('End date (optional)'), {
      target: { value: '2026-11-10' },
    });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Publish reward' }));
    await screen.findByText(/selected product is disabled or unavailable/);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: '2026-11-10T00:00:00.000Z',
        endsAt: '2026-11-11T00:00:00.000Z',
      }),
      'ACTIVE',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Reward name *')).toHaveValue(
      'Keep my progress',
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Eligible products (optional)' }),
      ).toHaveAttribute('aria-busy', 'false'),
    );
    save.mockResolvedValueOnce(undefined);
    next();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Publish reward' }));
    await screen.findByRole('heading', {
      name: 'Reward successfully published',
    });
    expect(save).toHaveBeenCalledTimes(2);
  });
  it.each(['FIXED', 'PERCENTAGE', 'FREE_PRODUCT'] as const)(
    'reviews and publishes a %s reward with an immutable product dropdown',
    async (kind) => {
      const { service } = setup();
      const catalog = await service.catalog('', 0);
      const product = catalog.items.find((p) => p.variants.length)!;
      const variant = product.variants[0]!;
      const label = `${product.name}: ${variant.name}`;
      const save = vi.fn().mockResolvedValue(undefined);
      render(<LoyaltyRewardWizard service={service} onSave={save} />);
      expect(screen.getByText(/Step 1 of 4/)).toHaveTextContent('Reward type');
      expect(
        screen
          .getByRole('list', { name: 'Reward creation progress' })
          .querySelectorAll('[aria-current="step"]'),
      ).toHaveLength(1);
      fireEvent.click(
        screen.getByRole('radio', { name: rewardKindLabels[kind] }),
      );
      next();
      expect(
        screen.getByRole('heading', { name: 'Enter reward details' }),
      ).toHaveFocus();
      fireEvent.change(screen.getByLabelText('Reward name *'), {
        target: { value: 'Honey reward' },
      });
      const field =
        kind === 'FIXED'
          ? 'Discount amount (USD) *'
          : kind === 'PERCENTAGE'
            ? 'Percentage discount *'
            : 'Free quantity *';
      expect(screen.getByLabelText(field)).toBeVisible();
      fireEvent.change(screen.getByLabelText(field), {
        target: {
          value:
            kind === 'FREE_PRODUCT'
              ? '2'
              : kind === 'PERCENTAGE'
                ? '15'
                : '5.25',
        },
      });
      const picker = screen.getByRole('combobox', {
        name:
          kind === 'FREE_PRODUCT'
            ? 'Product and variant *'
            : 'Eligible products (optional)',
      });
      await waitFor(() => expect(picker).toHaveAttribute('aria-busy', 'false'));
      fireEvent.focus(picker);
      fireEvent.click(screen.getByRole('option', { name: label }));
      fireEvent.blur(picker);
      next();
      expect(screen.getByText(/Step 3 of 4/)).toHaveTextContent(
        'Redemption rules',
      );
      expect(screen.queryByLabelText('Availability')).toBeNull();
      fireEvent.change(screen.getByLabelText('Required points *'), {
        target: { value: '500' },
      });
      fireEvent.change(
        screen.getByLabelText('Redemptions per customer (optional)'),
        { target: { value: '1' } },
      );
      next();
      expect(save).not.toHaveBeenCalled();
      expect(screen.getByText(/Step 4 of 4/)).toHaveTextContent(
        'Review & publish',
      );
      fireEvent.focus(
        screen.getByRole('combobox', {
          name: 'Eligible products',
        }),
      );
      const products = screen.getByRole('listbox', {
        name: 'Eligible products',
      });
      expect(products).toHaveTextContent(label);
      expect(within(products).queryByRole('combobox')).toBeNull();
      expect(within(products).queryByRole('checkbox')).toBeNull();
      expect(
        screen.getByRole('combobox', {
          name: 'Eligible products',
        }),
      ).toHaveAttribute('aria-readonly', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByLabelText('Required points *')).toHaveValue(500);
      next();
      fireEvent.click(screen.getByRole('button', { name: 'Publish reward' }));
      await waitFor(() =>
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Honey reward',
            kind,
            points: 500,
            limit: 1,
            value: kind === 'FIXED' ? 525 : kind === 'PERCENTAGE' ? 15 : 0,
            quantity: kind === 'FREE_PRODUCT' ? 2 : 1,
            variantIds: [variant.id],
          }),
          'ACTIVE',
        ),
      );
    },
  );
  it('saves a draft explicitly and shows the unrestricted product scope', async () => {
    const { service } = setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(<LoyaltyRewardWizard service={service} onSave={save} />);
    next();
    fireEvent.change(screen.getByLabelText('Reward name *'), {
      target: { value: 'Draft reward' },
    });
    next();
    next();
    fireEvent.focus(
      screen.getByRole('combobox', { name: 'Eligible products' }),
    );
    expect(
      screen.getByRole('listbox', { name: 'Eligible products' }),
    ).toHaveTextContent('All your products');
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Draft reward', variantIds: [] }),
        'DRAFT',
      ),
    );
  });
  it('keeps product labels across searches and returning from review', async () => {
    const { service } = setup();
    const catalog = await service.catalog('', 0);
    const product = catalog.items.find((p) => p.variants.length)!;
    const variant = product.variants[0]!;
    const label = `${product.name}: ${variant.name}`;
    service.catalog = vi.fn(async (query) =>
      query ? { ...catalog, items: [] } : catalog,
    );
    render(<LoyaltyRewardWizard service={service} onSave={vi.fn()} />);
    next();
    fireEvent.change(screen.getByLabelText('Reward name *'), {
      target: { value: 'Search reward' },
    });
    const picker = screen.getByRole('combobox', {
      name: 'Eligible products (optional)',
    });
    await waitFor(() => expect(picker).toHaveAttribute('aria-busy', 'false'));
    fireEvent.focus(picker);
    fireEvent.click(screen.getByRole('option', { name: label }));
    fireEvent.change(picker, { target: { value: 'missing' } });
    await waitFor(() => expect(picker).toHaveAttribute('aria-busy', 'false'));
    fireEvent.blur(picker);
    expect(picker).toHaveValue(label);
    next();
    next();
    fireEvent.focus(
      screen.getByRole('combobox', { name: 'Eligible products' }),
    );
    expect(
      screen.getByRole('listbox', { name: 'Eligible products' }),
    ).toHaveTextContent(label);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      screen.getByRole('combobox', { name: 'Eligible products (optional)' }),
    ).toHaveValue(label);
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Eligible products (optional)' }),
      ).toHaveAttribute('aria-busy', 'false'),
    );
  });
  it('validates amounts and date order, and blocks both actions after an uncertain save', async () => {
    const { service } = setup();
    const save = vi.fn().mockRejectedValue(new AppError('network'));
    const { container } = render(
      <LoyaltyRewardWizard service={service} onSave={save} />,
    );
    next();
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Eligible products (optional)' }),
      ).toHaveAttribute('aria-busy', 'false'),
    );
    fireEvent.change(screen.getByLabelText('Reward name *'), {
      target: { value: 'Valid reward' },
    });
    fireEvent.change(
      screen.getByLabelText('Minimum eligible product subtotal (USD) *'),
      { target: { value: '10' } },
    );
    fireEvent.submit(container.querySelector('form')!);
    expect(
      screen.getByText(
        'Minimum eligible subtotal cannot exceed the discount amount.',
      ),
    ).toBeVisible();
    fireEvent.change(
      screen.getByLabelText('Minimum eligible product subtotal (USD) *'),
      { target: { value: '0' } },
    );
    next();
    fireEvent.change(screen.getByLabelText('Start date (optional)'), {
      target: { value: '2026-11-10' },
    });
    fireEvent.change(screen.getByLabelText('End date (optional)'), {
      target: { value: '2026-11-09' },
    });
    next();
    expect(
      screen.getByText('The end date must be later than the start date.'),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText('End date (optional)'), {
      target: { value: '2026-11-11' },
    });
    next();
    expect(screen.getByText('Nov 10, 2026')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Publish reward' }));
    await screen.findByText(/save result could not be confirmed/);
    expect(
      screen.getByRole('button', { name: 'Publish reward' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save as draft' }),
    ).toBeDisabled();
    fireEvent.submit(container.querySelector('form')!);
    expect(save).toHaveBeenCalledOnce();
  });
});
