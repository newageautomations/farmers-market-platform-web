import { useState } from 'react';
import { Dialog } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandTable,
} from '@market/ui/farmstand';

export interface EquipmentItem {
  name: string;
  quantity?: number;
}

/**
 * Equipment allocations as a one-line summary with a View action; the full
 * list opens in the shared Dialog so long rental lists never crowd the page.
 * Quantities are allocations, not confirmed handoffs.
 */
export function EquipmentSummary({
  items,
  title,
  compact = false,
  buttonOnly = false,
}: {
  items: EquipmentItem[];
  /** Dialog title, e.g. "Booth A2 equipment". */
  title: string;
  compact?: boolean;
  /** Only the View equipment button, without the item count. */
  buttonOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!items.length)
    return <span className="markets-muted">No equipment allocated</span>;
  const units = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  return (
    <span className={`day-equipment-summary${compact ? ' is-compact' : ''}`}>
      {!buttonOnly && (
        <span>
          {items.length} {items.length === 1 ? 'item' : 'items'}
          {units !== items.length ? ` · ${units} units` : ''}
        </span>
      )}
      <FarmstandButton
        variant="secondary"
        size="compact"
        onClick={() => setOpen(true)}
      >
        <FarmstandIcon name="package" />
        View equipment
      </FarmstandButton>
      <Dialog open={open} title={title} onClose={() => setOpen(false)}>
        <div className="day-equipment-dialog farmstand-controls">
          <FarmstandTable label={title} headings={['Item', 'Quantity']}>
            {items.map((item, index) => (
              <tr key={`${item.name}:${index}`}>
                <th scope="row">
                  <span className="day-equipment-name">
                    <FarmstandIcon name="package" />
                    {item.name}
                  </span>
                </th>
                <td>{item.quantity ?? '—'}</td>
              </tr>
            ))}
          </FarmstandTable>
          <p className="markets-muted">
            Quantities are allocations. They do not confirm physical handoff or
            return.
          </p>
        </div>
      </Dialog>
    </span>
  );
}
