import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
import { data } from './fixtures/phase15-data';

test('application route tabs preserve the heading, actions and summary cards', () => {
  const props = { data: structuredClone(data), run: vi.fn(), canManage: true };
  const view = render(<Applications {...props} />);
  const heading = screen.getByRole('heading', {
    name: 'Applications',
    level: 1,
  });
  const create = screen.getByRole('link', { name: 'Create application' });
  expect(screen.queryByRole('link', { name: 'Review submissions' })).toBeNull();
  const summary = screen.getByText('Accepting submissions');
  const menu = screen.getByRole('navigation', { name: 'Applications' });
  const submitted = within(menu).getByRole('link', {
    name: 'Submitted Applications',
  });
  expect(submitted).toHaveAttribute('href', '/market/application-submissions');
  fireEvent.click(submitted);
  expect(window.location.pathname).toBe('/market/application-submissions');
  view.rerender(
    <Applications
      {...props}
      view="submissions"
      path="/market/application-submissions"
    />,
  );
  expect(screen.getByRole('heading', { name: 'Applications', level: 1 })).toBe(
    heading,
  );
  expect(screen.getByRole('link', { name: 'Create application' })).toBe(create);
  expect(screen.getByText('Accepting submissions')).toBe(summary);
  expect(submitted).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('table', { name: 'Your applications' })).toBeNull();
  view.rerender(<Applications {...props} canManage={false} />);
  expect(screen.queryByRole('link', { name: 'Create application' })).toBeNull();
  window.history.replaceState(null, '', '/');
});
