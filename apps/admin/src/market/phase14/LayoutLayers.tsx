import {
  Button,
  UtilityIcon,
  mapElementLabel,
  isMapLegend,
} from '@market/ui';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import type { MapElement } from '@market/api';
import { Entry } from './common';
import { objectIcons } from './LayoutTools';

function RowAction({
  label,
  icon,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children' | 'aria-label'> & {
  label: string;
  icon: ComponentProps<typeof UtilityIcon>['name'];
}) {
  return (
    <Button
      type="button"
      variant="tertiary"
      size="compact"
      iconOnly
      aria-label={label}
      title={label}
      {...props}
    >
      <UtilityIcon name={icon} />
    </Button>
  );
}

export function LayoutLayers({
  elements,
  selected,
  select,
  locate,
  flags,
  editable,
  rename,
  order,
}: {
  elements: MapElement[];
  selected: string[];
  select: (id: string, shift: boolean) => void;
  locate: (id: string) => void;
  flags: (
    ids: string[],
    patch: Pick<MapElement, 'locked' | 'editorHidden'>,
  ) => void;
  editable: boolean;
  rename?: (id: string, name: string) => void;
  order?: (id: string, direction: 'forward' | 'backward') => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [renaming, setRenaming] = useState(''),
    [name, setName] = useState('');
  useEffect(() => {
    const row = Array.from(list.current?.children ?? []).find((row) =>
      selected.includes((row as HTMLElement).dataset.element ?? ''),
    );
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);
  return (
    <div className="designer-layers">
      <p className="designer-muted">
        {elements.length} objects · Hidden objects are hidden in this editor
        only. Published maps still show them.
      </p>
      <ul ref={list} aria-label="Layout elements">
        {[...elements]
          .sort((a, b) => b.zIndex - a.zIndex)
          .map((e) => {
            const label = mapElementLabel(e);
            return (
              <li
                key={e.id}
                className="layer-row"
                data-element={e.id}
                data-geometry={JSON.stringify(e)}
                data-selected={selected.includes(e.id)}
                data-hidden={!!e.editorHidden}
              >
                <div className="layer-main">
                  <button
                    type="button"
                    className="layer-select"
                    aria-pressed={selected.includes(e.id)}
                    onClick={(event) => select(e.id, event.shiftKey)}
                  >
                    <span className="layer-type" aria-hidden="true">
                      <UtilityIcon name={objectIcons[e.type]} />
                    </span>
                    <span className="layer-name">
                      {label}
                      {e.groupId ? ' · grouped' : ''}
                    </span>
                  </button>
                  <RowAction
                    label={`Hide ${label}`}
                    icon={e.editorHidden ? 'eye-off' : 'eye'}
                    aria-pressed={!!e.editorHidden}
                    disabled={!editable}
                    className="layer-flag"
                    onClick={() =>
                      flags([e.id], { editorHidden: !e.editorHidden })
                    }
                  />
                  <RowAction
                    label={`Lock ${label}`}
                    icon={e.locked ? 'lock' : 'unlock'}
                    aria-pressed={!!e.locked}
                    disabled={!editable}
                    className="layer-flag"
                    onClick={() => flags([e.id], { locked: !e.locked })}
                  />
                </div>
                <div className="layer-actions">
                  <RowAction
                    label={`Locate ${label}`}
                    icon="search"
                    onClick={() => locate(e.id)}
                  />
                  {rename && (
                    <RowAction
                      label={`Rename ${label}`}
                      icon="edit"
                      disabled={!editable || e.locked}
                      onClick={() => {
                        setRenaming(e.id);
                        setName(label);
                      }}
                    />
                  )}
                  {order && (
                    <>
                      <RowAction
                        label={`Bring ${label} forward`}
                        icon="arrow-up"
                        disabled={!editable || e.locked}
                        onClick={() => order(e.id, 'forward')}
                      />
                      <RowAction
                        label={`Send ${label} backward`}
                        icon="arrow-down"
                        disabled={!editable || e.locked}
                        onClick={() => order(e.id, 'backward')}
                      />
                    </>
                  )}
                </div>
                {renaming === e.id && (
                  <form
                    className="layer-rename"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (name.trim()) {
                        rename?.(e.id, name.trim());
                        setRenaming('');
                      }
                    }}
                  >
                    <Entry
                      label="Object name"
                      value={name}
                      maxLength={
                        e.type === 'SPACE' || isMapLegend(e) ? 80 : 500
                      }
                      onChange={setName}
                    />
                    <div className="layer-rename-actions">
                      <Button
                        type="submit"
                        size="compact"
                        disabled={!name.trim()}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() => setRenaming('')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
