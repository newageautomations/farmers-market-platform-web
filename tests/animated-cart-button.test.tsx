import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeaturedAdd } from '../apps/storefront/src/components/FeaturedAdd';

const call = vi.hoisted(() => vi.fn());
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: call,
}));

afterEach(() => {
  vi.useRealTimers();
  call.mockReset();
});

describe('market add button feedback', () => {
  it('waits for success, replays the icon, restarts the timer and cleans up', async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    call.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { unmount } = render(
      <FeaturedAdd storefrontId="1" variantId="21" occurrenceId="7" market />,
    );
    const button = screen.getByRole('button', { name: 'Add to cart' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).not.toHaveClass('is-added');
    fireEvent.click(button);
    expect(call).toHaveBeenCalledTimes(1);
    await act(async () => finish({ cart: { totalQuantity: 1 } }));
    expect(button).toHaveClass('is-added');
    expect(button).toBeEnabled();
    expect(screen.getByText('Added to your cart.')).not.toBeVisible();
    expect(screen.getByText('View cart')).not.toBeVisible();
    const icon = button.querySelector('.market-cart-button__check');
    act(() => vi.advanceTimersByTime(1_000));
    call.mockResolvedValue({ cart: { totalQuantity: 2 } });
    await act(async () => fireEvent.click(button));
    expect(button.querySelector('.market-cart-button__check')).not.toBe(icon);
    act(() => vi.advanceTimersByTime(1_000));
    expect(button).toHaveClass('is-added');
    act(() => vi.advanceTimersByTime(500));
    expect(button).not.toHaveClass('is-added');
    await act(async () => fireEvent.click(button));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains error feedback without showing success on failure', async () => {
    call.mockRejectedValue(new Error('Cart unavailable'));
    render(
      <FeaturedAdd storefrontId="1" variantId="21" occurrenceId="7" market />,
    );
    const button = screen.getByRole('button', { name: 'Add to cart' });
    await act(async () => fireEvent.click(button));
    expect(button).not.toHaveClass('is-added');
    expect(button).toBeEnabled();
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
    expect(screen.queryByText('Added to your cart.')).not.toBeInTheDocument();
  });

  it('does not animate option selection and animates vendor buttons like market ones', async () => {
    const { rerender } = render(
      <FeaturedAdd
        storefrontId="1"
        occurrenceId="7"
        market
        variantOptions={[{ id: '21', name: 'Loaf' }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(call).not.toHaveBeenCalled();
    expect(document.querySelector('.is-added')).toBeNull();
    rerender(<FeaturedAdd storefrontId="1" variantId="21" occurrenceId="7" />);
    call.mockResolvedValue({ cart: { totalQuantity: 1 } });
    await act(async () =>
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Add to cart' })[0]!,
      ),
    );
    // Vendor websites confirm on the button too, without the text message.
    const vendorButton = document.querySelector('.market-cart-button');
    expect(vendorButton).toHaveClass('is-added');
    expect(document.querySelector('p[role="status"]')).toHaveAttribute(
      'hidden',
    );
  });
});
