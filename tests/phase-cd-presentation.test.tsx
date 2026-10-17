import { readFileSync } from 'node:fs';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Dropdown,
  Pagination,
  Tabs,
  DashboardMenu,
} from '@market/ui';
import { AdminShell } from '../apps/admin/src/AdminShell';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { RouteLink } from '../apps/admin/src/vendor/common';
import { vendorOrderStatus } from '../apps/admin/src/vendor/order-presentation';
import { vendorStatusTone } from '../apps/admin/src/vendor/status-presentation';
import { managementStatusTone } from '../apps/admin/src/management/status-presentation';
import { purchaseStatusTone } from '../apps/storefront/src/components/purchase-status';
import { InvoiceTable } from '../apps/admin/src/market/phase14/InvoiceTable';
import { Pager } from '../apps/admin/src/management/common';
import {
  dashboardClasses,
  installDashboardSidebarToggle,
  navigationIconPaths,
} from '@market/ui/presentation';

function viewport(width: number) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const media = {
    matches: width <= 767,
    addEventListener: (_: string, fn: (event: { matches: boolean }) => void) =>
      listeners.add(fn),
    removeEventListener: (
      _: string,
      fn: (event: { matches: boolean }) => void,
    ) => listeners.delete(fn),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  return (width: number) => {
    media.matches = width <= 767;
    listeners.forEach((fn) => fn(media));
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('approved dashboard presentation', () => {
  it.each(['PLATFORM', 'VENDOR', 'MARKET'] as const)(
    'toggles the %s desktop sidebar by keyboard with the shared panel icon',
    async (scope) => {
      const resize = viewport(768);
      const user = userEvent.setup();
      const { container } = render(
        <AdminShell context={fixtureContexts[scope]} onLogout={() => {}} />,
      );
      const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
      const sidebar = document.getElementById(
        toggle.getAttribute('aria-controls')!,
      )!;
      expect(toggle.querySelector('path')).toHaveAttribute(
        'd',
        navigationIconPaths['panel-left'],
      );
      expect(toggle).toHaveClass(dashboardClasses.sidebarToggle, 'button-icon');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      act(() => toggle.focus());
      await user.keyboard('{Enter}');
      expect(toggle).toHaveAccessibleName('Expand sidebar');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).not.toHaveAttribute('inert');
      expect(
        sidebar.querySelectorAll('.navigation-icon').length,
      ).toBeGreaterThan(0);
      expect(container.querySelector('.ui-dashboard')).toHaveClass(
        'sidebar-collapsed',
      );
      act(() => resize(767));
      const summary = container.querySelector('summary')!;
      expect(summary).toHaveFocus();
      expect(summary.querySelector('path')).toHaveAttribute(
        'd',
        'M4 6h16M4 12h16M4 18h16',
      );
      expect(container.querySelectorAll('summary')).toHaveLength(1);
      act(() => resize(768));
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      act(() => toggle.focus());
      await user.keyboard(' ');
      expect(toggle).toHaveAccessibleName('Collapse sidebar');
      expect(sidebar).not.toHaveAttribute('inert');
      expect(container.querySelector('.ui-dashboard')).not.toHaveClass(
        'sidebar-collapsed',
      );
    },
  );
  it('enhances the native customer sidebar without changing its links or mobile menu', () => {
    viewport(768);
    const { container } = render(
      <div className={dashboardClasses.frame}>
        <aside id="customer-sidebar" className={dashboardClasses.sidebar}>
          <a href="/account/orders" aria-current="page">
            Order History
          </a>
        </aside>
        <button
          type="button"
          className={dashboardClasses.sidebarToggle}
          aria-controls="customer-sidebar"
          hidden
        />
        <DashboardMenu navigation={<a href="/account/orders">Order History</a>}>
          <Button>Sign out</Button>
        </DashboardMenu>
      </div>,
    );
    const toggle = container.querySelector<HTMLButtonElement>(
      '.ui-dashboard-sidebar-toggle',
    )!;
    const sidebar = container.querySelector<HTMLElement>('#customer-sidebar')!;
    const menu = container.querySelector<HTMLDetailsElement>('details')!;
    const cleanup = installDashboardSidebarToggle(toggle);
    expect(toggle.hidden).toBe(false);
    expect(toggle).toHaveAccessibleName('Collapse sidebar');
    sidebar.querySelector('a')!.focus();
    fireEvent.click(toggle);
    expect(sidebar.inert).toBe(true);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAccessibleName('Expand sidebar');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(menu.open).toBe(true);
    fireEvent.click(toggle);
    expect(sidebar.inert).toBe(false);
    expect(sidebar.querySelector('a')).toHaveAttribute(
      'href',
      '/account/orders',
    );
    expect(sidebar.querySelector('a')).toHaveAttribute('aria-current', 'page');
    cleanup?.();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
  it.each([390, 600, 601, 767, 768])(
    'uses one toolbar and a native menu at %ipx',
    (width) => {
      viewport(width);
      window.history.replaceState(null, '', '/vendor');
      const logout = vi.fn();
      const { container } = render(
        <AdminShell
          context={fixtureContexts.VENDOR}
          onLogout={logout}
          controls={<Button>Refresh workspace</Button>}
        />,
      );
      const menu =
        container.querySelector<HTMLDetailsElement>('.ui-dashboard-menu')!;
      expect(menu.open).toBe(width >= 768);
      expect(container.querySelector('summary')).toHaveAttribute(
        'aria-expanded',
        String(width >= 768),
      );
      expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('button')).toContain(
        screen.getByText('Sign out'),
      );
      if (width < 768) {
        menu.open = true;
        fireEvent(menu, new Event('toggle'));
      }
      expect(
        screen.getAllByRole('button', { name: 'Refresh workspace' }),
      ).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(logout).toHaveBeenCalledOnce();
    },
  );
  it('retains control state across viewport changes and closes with Escape and local navigation', () => {
    const resize = viewport(768),
      mounts = vi.fn();
    function Controls() {
      useEffect(() => {
        mounts();
      }, []);
      return (
        <input aria-label="Workspace value" defaultValue="Current business" />
      );
    }
    const { container } = render(
      <>
        <DashboardMenu
          navigation={
            <nav>
              <a href="#main">Overview</a>
            </nav>
          }
        >
          <Controls />
        </DashboardMenu>
        <main id="main" tabIndex={-1} />
      </>,
    );
    const menu = container.querySelector<HTMLDetailsElement>('details')!,
      summary = container.querySelector<HTMLElement>('summary')!;
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'Retained selection' } });
    resize(601);
    expect(menu.open).toBe(false);
    expect(field).toHaveValue('Retained selection');
    expect(mounts).toHaveBeenCalledOnce();
    menu.open = true;
    fireEvent(menu, new Event('toggle'));
    field.focus();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(menu.open).toBe(false);
    expect(summary).toHaveFocus();
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    menu.open = true;
    fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
    expect(menu.open).toBe(false);
    expect(container.querySelector('main')).toHaveFocus();
    resize(768);
    expect(menu.open).toBe(true);
    expect(mounts).toHaveBeenCalledOnce();
  });
  it.each(['PLATFORM', 'VENDOR', 'MARKET'] as const)(
    'keeps %s navigation role-owned',
    (scope) => {
      viewport(390);
      window.history.replaceState(null, '', `/${scope.toLowerCase()}`);
      const { container } = render(
        <AdminShell context={fixtureContexts[scope]} onLogout={() => {}} />,
      );
      const menu = container.querySelector<HTMLDetailsElement>('details')!;
      menu.open = true;
      const hrefs = Array.from(menu.querySelectorAll('nav a')).map((a) =>
        a.getAttribute('href'),
      );
      expect(hrefs.some((h) => h?.startsWith(`/${scope.toLowerCase()}`))).toBe(
        true,
      );
      if (scope !== 'PLATFORM')
        expect(hrefs.some((h) => h?.startsWith('/platform'))).toBe(false);
      if (scope === 'MARKET') expect(hrefs).not.toContain('/vendor/products');
    },
  );
  it('keeps customer native SSR slots, permitted navigation and POST logout', () => {
    const layout = readFileSync(
      'apps/storefront/src/layouts/CustomerLayout.astro',
      'utf8',
    );
    const menu = readFileSync(
      'apps/storefront/src/components/ui/DashboardMenu.astro',
      'utf8',
    );
    expect(layout).toContain('<DashboardFrame>');
    expect(layout).toContain('<DashboardMenu>');
    expect(layout).toContain('method="post" action="/api/account"');
    expect(layout).toContain('name="action" value="logout"');
    expect(layout).toContain('type="submit" variant="secondary"');
    expect(layout).not.toMatch(/AdminShell|AdminApp|admin-core/);
    expect(layout).toContain("navigationIconPaths['panel-left']");
    expect(layout).toContain('installDashboardSidebarToggle');
    expect(layout).toContain('<AccountModeSelect');
    expect(layout).toContain('client:load');
    expect(layout).toContain('await customerApi(Astro).contexts()');
    expect(layout).not.toContain('createPlatformAccountApi');
    expect(menu).toContain('<details');
    expect(menu).toContain('installDashboardMenu');
    const discovery = readFileSync(
      'apps/storefront/src/pages/account/[section].astro',
      'utf8',
    );
    expect(discovery).toContain('api.subjects(kind, search, browseSkip)');
    expect(discovery).toContain('method="get"');
    expect(discovery).toContain('ui-field-action');
  });
});
describe('approved display and navigation contracts', () => {
  it.each([
    { skip: 40, count: 5, range: '41 to 45' },
    { skip: 40, count: 0, range: '0 to 0' },
  ])(
    'uses the actual management pager count at $range',
    ({ skip, count, range }) => {
      render(<Pager skip={skip} total={45} count={count} setSkip={() => {}} />);
      expect(screen.getByRole('navigation')).toHaveTextContent(
        `45 results · ${range}`,
      );
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    },
  );
  it('keeps severity independent of urgency and status domains independent', () => {
    const { container } = render(
      <>
        <Alert severity="partial" role="alert">
          Some changes could not be confirmed.
        </Alert>
        <Alert severity="success">Confirmed</Alert>
        <Badge tone={vendorOrderStatus('pickup', 'PENDING').tone}>
          Pending pickup
        </Badge>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveClass('ui-alert-partial');
    expect(screen.getByRole('status')).toHaveClass('ui-alert-success');
    expect(container.querySelector('.ui-status-warning')).toHaveTextContent(
      'Pending pickup',
    );
    expect(vendorOrderStatus('payment', 'PAID').tone).toBe('success');
    expect(vendorOrderStatus('pickup', 'PAID').tone).toBe('neutral');
    expect(vendorStatusTone('membership', 'approved')).toBe('success');
    expect(managementStatusTone('readiness', 'NOT_CONFIGURED')).toBe('neutral');
    expect(purchaseStatusTone('financial', 'REFUND_REQUIRED')).toBe('danger');
    expect(purchaseStatusTone('pickup', 'PAID')).toBe('neutral');
    expect(managementStatusTone('tenant', 'constructor')).toBe('neutral');
  });
  it('retains independent native nested disclosures and their mounted controls', () => {
    const { container } = render(
      <Dropdown label="Parent">
        <input defaultValue="Draft" aria-label="Draft" />
        <Dropdown label="Child">
          <Button>Child action</Button>
        </Dropdown>
      </Dropdown>,
    );
    const [parent, child] = Array.from(container.querySelectorAll('details'));
    parent!.open = true;
    child!.open = true;
    parent!.open = false;
    expect(child!.open).toBe(true);
    expect(container.querySelector('input')).toHaveValue('Draft');
    expect(container.querySelectorAll('.ui-disclosure-content')).toHaveLength(
      2,
    );
  });
  it('preserves table semantics, sorting announcements and complete data', () => {
    render(
      <DataTable
        label="Products"
        headings={['Name', 'Price']}
        sort={{ heading: 'Name', direction: 'ascending' }}
      >
        <tr>
          <th scope="row">Long product name</th>
          <td>$12.34</td>
        </tr>
      </DataTable>,
    );
    const table = screen.getByRole('table', { name: 'Products' });
    expect(table).toHaveClass('ui-table');
    expect(
      within(table).getByRole('columnheader', { name: 'Name' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    expect(within(table).getByRole('rowheader')).toHaveTextContent(
      'Long product name',
    );
    expect(table).toHaveTextContent('$12.34');
  });
  it('keeps in-page tabs non-submitting and skips disabled tabs', async () => {
    const submit = vi.fn(),
      user = userEvent.setup();
    render(
      <form onSubmit={submit}>
        <Tabs
          items={[
            { label: 'First', content: 'Draft one' },
            { label: 'Disabled', content: 'Two', disabled: true },
            { label: 'Last', content: 'Draft three' },
          ]}
        />
      </form>,
    );
    screen.getByRole('tab', { name: 'First' }).focus();
    expect(screen.getByRole('tab', { name: 'First' })).not.toHaveClass(
      'button',
    );
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Last' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Draft three');
    await user.keyboard('{Enter}');
    expect(submit).not.toHaveBeenCalled();
  });
  it('keeps route deep links and modifier clicks while sharing tab appearance', () => {
    render(
      <nav className="ui-tabs">
        <RouteLink variant="tab" current to="/platform/billing/plans">
          Plans
        </RouteLink>
      </nav>,
    );
    const link = screen.getByRole('link', { name: 'Plans' });
    expect(link).toHaveClass('ui-route-tab');
    expect(link).not.toHaveClass('button');
    expect(link).toHaveAttribute('href', '/platform/billing/plans');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).not.toHaveAttribute('role', 'tab');
    const modified = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    fireEvent(link, modified);
    expect(modified.defaultPrevented).toBe(false);
    fireEvent.click(link);
    expect(window.location.pathname).toBe('/platform/billing/plans');
  });
  it('uses secondary Previous and preserves caller paging callbacks and range', () => {
    const previous = vi.fn(),
      next = vi.fn();
    render(
      <Pagination
        label="Order pages"
        summary="45 records. Showing 21 to 40."
        hasPrevious
        hasNext
        onPrevious={previous}
        onNext={next}
      />,
    );
    expect(screen.getByRole('navigation')).toHaveTextContent(
      '45 records. Showing 21 to 40.',
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveClass(
      'secondary',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(previous).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });
  it('derives invoice description allocation from 0.8 of measured natural width', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const widths = [300, 100, 100, 100];
        return {
          width:
            this.tagName === 'TH'
              ? widths[(this as HTMLTableCellElement).cellIndex]
              : 600,
        } as DOMRect;
      },
    );
    const { container } = render(
      <InvoiceTable>
        <caption>Invoice line items</caption>
        <thead>
          <tr>
            {['Description', 'Quantity', 'Unit price', 'Amount'].map((s) => (
              <th key={s} scope="col">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Complete description</td>
            <td>2</td>
            <td>$6.00</td>
            <td>$12.00</td>
          </tr>
        </tbody>
      </InvoiceTable>,
    );
    const table = container.querySelector('table')!;
    expect(table.style.getPropertyValue('--invoice-column-0')).toBe('40%');
    expect(table.dataset.columns).toBe('measured');
    expect(table).toHaveTextContent('Complete description');
    expect(table).toHaveTextContent('$12.00');
    expect(table).not.toHaveClass('ui-table');
  });
});
