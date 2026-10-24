import { IconButton } from '@market/ui';

/** Shared FAQ arrow rail. Keep geometry and states identical for ordered editors. */
export function StorefrontReorderControls({
  label,
  item,
  index,
  count,
  busy,
  onMove,
}: {
  label: string;
  item: string;
  index: number;
  count: number;
  busy: boolean;
  onMove: (delta: number) => void;
}) {
  return (
    <div className="story-editor-reorder">
      {(['up', 'down'] as const).map((direction) => (
        <IconButton
          key={direction}
          icon={direction === 'up' ? 'arrow-up' : 'arrow-down'}
          label={`Move ${item} ${direction}: ${label}`}
          size="compact"
          disabled={
            busy || (direction === 'up' ? index === 0 : index === count - 1)
          }
          onClick={() => onMove(direction === 'up' ? -1 : 1)}
        />
      ))}
    </div>
  );
}
