import {
  Children,
  Fragment,
  isValidElement,
  useState,
  type ReactNode,
  type ReactElement,
  type MouseEvent,
} from 'react';
import { Button, Card, DataTable, Dialog } from './index';

/** Forward surface clicks to the real keyboard target without stretching its box. */
function activateRecord(event: MouseEvent<HTMLElement>) {
  if (
    !(event.target instanceof Element) ||
    event.target.closest('button, a, input, select, textarea, label')
  )
    return;
  const trigger =
    event.currentTarget.querySelector<HTMLButtonElement>('.ui-record-trigger');
  trigger?.focus({ preventScroll: true });
  trigger?.click();
}

function elements(
  children: ReactNode,
): ReactElement<{ children?: ReactNode; colSpan?: number }>[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode; colSpan?: number }>(child)
      ? child.type === Fragment
        ? elements(child.props.children)
        : [child]
      : [],
  );
}
function text(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children)
        : String(child),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export type RecordDetailsColumns = {
  identifier?: number;
  status?: number;
  labels?: readonly string[];
  statuses?: readonly ReactNode[];
  /** Reuse a feature's existing complete detail dialog when available. */
  onOpen?: (index: number) => void;
};

/** Opt-in adapter for ordinary tr/cell markup. Controllers and actions stay with callers. */
export function RecordDetailsTable({
  headings,
  children,
  label,
  columns,
  sort,
}: {
  headings: readonly string[];
  children: ReactNode;
  label: string;
  columns: RecordDetailsColumns;
  sort?: { heading: string; direction: 'ascending' | 'descending' };
}) {
  const [selected, setSelected] = useState<string>();
  const sourceRows = elements(children);
  const rows = sourceRows.map((row) => ({
    key: String(row.key),
    cells: elements(row.props.children),
  }));
  const selectedIndex = rows.findIndex((row) => row.key === selected);
  const chosen = rows[selectedIndex];
  const identifier = columns.identifier ?? 0;
  const title = (index: number) =>
    columns.labels?.[index] ??
    (text(rows[index]?.cells[identifier]?.props.children) || 'Record');
  // Stateful row components must expose their cells before opting in. Keep their full table intact.
  if (sourceRows.some((row) => row.type !== 'tr'))
    return (
      <DataTable label={label} headings={headings} sort={sort}>
        {children}
      </DataTable>
    );
  return (
    <>
      <DataTable
        label={label}
        headings={[
          headings[identifier]!,
          ...(columns.status === undefined ? [] : [headings[columns.status]!]),
        ]}
        sort={sort}
      >
        {rows.map((row, index) =>
          row.cells.length === 1 && row.cells[0]?.props.colSpan ? (
            <tr key={row.key}>
              <td colSpan={columns.status === undefined ? 1 : 2}>
                {row.cells[0].props.children}
              </td>
            </tr>
          ) : (
            <tr
              className="ui-record-row"
              key={row.key}
              onClickCapture={activateRecord}
            >
              <th scope="row">
                <Button
                  variant="disclosure"
                  className="ui-record-trigger"
                  onClick={() =>
                    columns.onOpen
                      ? columns.onOpen(index)
                      : setSelected(row.key)
                  }
                  aria-label={`Open ${title(index)}`}
                >
                  {title(index)}
                </Button>
              </th>
              {columns.status !== undefined && (
                <td>
                  {columns.statuses?.[index] ??
                    row.cells[columns.status]?.props.children}
                </td>
              )}
            </tr>
          ),
        )}
      </DataTable>
      {chosen && (
        <Dialog
          open
          title={title(selectedIndex)}
          onClose={() => setSelected(undefined)}
        >
          <dl className="ui-record-facts">
            {chosen.cells.map((cell, index) => (
              <div key={headings[index] ?? index}>
                <dt>{headings[index]}</dt>
                <dd>{cell.props.children}</dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
    </>
  );
}

/** A single native target covers the summary, with no nested actions. */
export function RecordCard({
  title,
  summary,
  children,
  onOpen,
}: {
  title: string;
  summary: ReactNode;
  children?: ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card
        as="article"
        className="ui-record-card"
        spacing="contained"
        onClickCapture={activateRecord}
      >
        {summary}
        <Button
          variant="disclosure"
          className="ui-record-trigger"
          aria-label={`Open ${title}`}
          onClick={() => (onOpen ? onOpen() : setOpen(true))}
        >
          {title}
        </Button>
      </Card>
      {open && (
        <Dialog open title={title} onClose={() => setOpen(false)}>
          {children}
        </Dialog>
      )}
    </>
  );
}
