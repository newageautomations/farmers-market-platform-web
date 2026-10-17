import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** TBL-03 keeps native invoice markup. Measure its natural allocation, then use
 * 0.8 of the actual description width; never guess a table-wide percentage. */
export function InvoiceTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLTableElement>(null);
  useLayoutEffect(() => {
    const table = ref.current;
    if (!table) return;
    const container = table.parentElement!;
    let lastWidth = -1;
    const measure = () => {
      delete table.dataset.columns;
      const cells = Array.from(
        table.querySelectorAll<HTMLTableCellElement>('thead th'),
      );
      const widths = cells.map((cell) => cell.getBoundingClientRect().width);
      const total = widths.reduce((sum, width) => sum + width, 0);
      if (widths.length !== 4 || !total || widths.some((width) => !width))
        return;
      const released = widths[0]! * 0.2;
      const allocation = [
        widths[0]! * 0.8,
        ...widths.slice(1).map((width) => width + released / 3),
      ];
      allocation.forEach((width, index) =>
        table.style.setProperty(
          `--invoice-column-${index}`,
          `${(width / total) * 100}%`,
        ),
      );
      table.dataset.columns = 'measured';
      lastWidth = container.getBoundingClientRect().width;
    };
    measure();
    const observer = new ResizeObserver(() => {
      if (Math.abs(container.getBoundingClientRect().width - lastWidth) > 0.5)
        measure();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [children]);
  return (
    <div
      className="invoice-line-scroll"
      role="region"
      aria-label="Invoice line items scroll area"
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- Keyboard users must be able to scroll the invoice region.
      tabIndex={0}
    >
      <table ref={ref} className="invoice-lines">
        <colgroup>
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        {children}
      </table>
    </div>
  );
}
