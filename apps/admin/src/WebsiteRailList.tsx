import { useState } from 'react';
import { Button, IconButton, UtilityIcon } from '@market/ui';

/**
 * Rows of a page's own items (policies, FAQ questions, terms) in the website
 * editor's layer rail. Rows reorder by dragging their grip, or with the arrow
 * keys on the grip, and only within this list. Extracted unchanged from the
 * Policies rail so every page list behaves the same way.
 */
export function WebsiteRailList<T extends { id: string }>({
  items,
  label,
  itemLabel,
  noun,
  selectedId,
  busy,
  onSelect,
  onReorder,
  addLabel,
  addDisabled,
  onAdd,
  itemAttribute = 'data-rail-item',
}: {
  items: readonly T[];
  /** Accessible name of the list. */
  label: string;
  itemLabel: (item: T) => string;
  /** Lower-case item name used in the grip's accessible name, e.g. "policy". */
  noun: string;
  selectedId?: string;
  busy: boolean;
  onSelect: (item: T) => void;
  onReorder: (items: T[]) => void;
  addLabel: string;
  addDisabled?: boolean;
  onAdd: () => void;
  /** Data attribute that carries each row's id, for callers and tests. */
  itemAttribute?: `data-${string}`;
}) {
  const [dragging, setDragging] = useState<string>();
  const [drop, setDrop] = useState<{
    id: string;
    placement: 'before' | 'after';
  }>();
  const move = (id: string, delta: number) => {
    const next = [...items];
    const index = next.findIndex((item) => item.id === id);
    if (index < 0 || index + delta < 0 || index + delta >= next.length) return;
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    onReorder(next);
  };
  const reorder = (
    id: string,
    targetId: string,
    placement: 'before' | 'after',
  ) => {
    const moving = items.find((item) => item.id === id);
    if (!moving || id === targetId) return;
    const rest = items.filter((item) => item.id !== id);
    const target = rest.findIndex((item) => item.id === targetId);
    if (target < 0) return;
    rest.splice(placement === 'before' ? target : target + 1, 0, moving);
    onReorder(rest);
  };
  return (
    <div
      className="website-block-hierarchy policies-hierarchy"
      aria-label={label}
    >
      {items.map((item) => {
        const text = itemLabel(item);
        return (
          <div
            key={item.id}
            className="website-block-row"
            {...{ [itemAttribute]: item.id }}
            data-selected={selectedId === item.id || undefined}
            data-drop={drop?.id === item.id ? drop.placement : undefined}
            onDragOver={(event) => {
              if (busy || !dragging || dragging === item.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              const rect = event.currentTarget.getBoundingClientRect();
              setDrop({
                id: item.id,
                placement:
                  event.clientY < rect.top + rect.height / 2
                    ? 'before'
                    : 'after',
              });
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (!busy && dragging && drop?.id === item.id)
                reorder(dragging, item.id, drop.placement);
              setDragging(undefined);
              setDrop(undefined);
            }}
          >
            <IconButton
              icon="grip"
              label={`Drag to reorder ${noun}: ${text}`}
              size="compact"
              disabled={busy}
              draggable={!busy}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
                setDragging(item.id);
              }}
              onDragEnd={() => {
                setDragging(undefined);
                setDrop(undefined);
              }}
              onKeyDown={(event) => {
                if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                move(item.id, event.key === 'ArrowUp' ? -1 : 1);
              }}
            />
            <Button
              variant="tertiary"
              size="compact"
              aria-pressed={selectedId === item.id}
              disabled={busy}
              onClick={() => onSelect(item)}
            >
              {text}
            </Button>
          </div>
        );
      })}
      <Button
        variant="tertiary"
        size="compact"
        disabled={busy || addDisabled}
        onClick={onAdd}
      >
        <UtilityIcon name="plus" /> {addLabel}
      </Button>
    </div>
  );
}
