import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, Pagination, scrollToPaginatedTable } from '@market/ui';

describe('table pagination navigation', () => {
  it('scrolls each pager to its own table and retains callbacks and disabled behavior', () => {
    const next = vi.fn(),
      previous = vi.fn();
    const { container } = render(
      <main>
        <section>
          <DataTable label="First" headings={['Name']}>
            <tr>
              <td>One</td>
            </tr>
          </DataTable>
          <Pagination
            label="First pages"
            hasPrevious={false}
            hasNext
            onPrevious={previous}
            onNext={next}
          />
        </section>
        <section>
          <DataTable label="Second" headings={['Name']}>
            <tr>
              <td>Two</td>
            </tr>
          </DataTable>
          <Pagination
            label="Second pages"
            hasPrevious
            hasNext
            onPrevious={previous}
            onNext={next}
          />
        </section>
      </main>,
    );
    const tables = container.querySelectorAll<HTMLElement>('.table-scroll');
    const first = vi.fn(),
      second = vi.fn();
    tables[0]!.scrollIntoView = first;
    tables[1]!.scrollIntoView = second;
    fireEvent.click(screen.getAllByRole('button', { name: 'Next' })[1]!);
    expect(second).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'instant',
    });
    expect(first).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Previous' })[0]!);
    expect(first).not.toHaveBeenCalled();
    expect(previous).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Next' })[0]!);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('never scrolls a background table from a dialog without a table', () => {
    const { container } = render(
      <main>
        <DataTable label="Background" headings={['Name']}>
          <tr>
            <td>One</td>
          </tr>
        </DataTable>
        <dialog open>
          <button>Next</button>
        </dialog>
      </main>,
    );
    const scroll = vi.fn();
    container.querySelector<HTMLElement>('.table-scroll')!.scrollIntoView =
      scroll;
    scrollToPaginatedTable(screen.getByRole('button', { name: 'Next' }));
    expect(scroll).not.toHaveBeenCalled();
  });
});
