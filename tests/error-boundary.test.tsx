import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, ErrorState } from '@market/ui';
import { AppError } from '@market/api';

describe('existing production ErrorBoundary and resilient surface', () => {
  it('keeps a normalized asynchronous HTTP failure inside the usable shell', () => {
    render(
      <ErrorBoundary>
        <nav aria-label="Workspace">Tenants</nav>
        <ErrorState error={new AppError('unavailable')} />
        <button>Refresh records</button>
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The service is unavailable. Please try again later.',
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh records' }),
    ).toBeInTheDocument();
  });
  it('contains a render failure and retains its existing reload control', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Failed(): never {
      throw new AppError('unavailable');
    }
    render(
      <ErrorBoundary>
        <Failed />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This page is temporarily unavailable',
    );
    expect(
      screen.getByRole('button', { name: 'Reload page' }),
    ).toBeInTheDocument();
    expect(
      output.mock.calls.some((args) =>
        String(args[0]).includes('surface_failure'),
      ),
    ).toBe(true);
  });
});
