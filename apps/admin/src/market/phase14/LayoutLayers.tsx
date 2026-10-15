import { Button } from '@market/ui';
import type { MapElement } from '@market/api';
import { Check } from './common';
export function LayoutLayers({
  elements,
  selected,
  select,
  locate,
  flags,
  editable,
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
}) {
  return (
    <details className="designer-layers ui-disclosure" open>
      <summary>
        Layers <span>{elements.length} objects</span>
      </summary>
      <div className="ui-disclosure-content">
        <p>
          Hidden objects are hidden in this editor only. Published maps still
          show them.
        </p>
        <ul aria-label="Layout elements">
          {[...elements]
            .sort((a, b) => b.zIndex - a.zIndex)
            .map((e) => (
              <li
                key={e.id}
                data-element={e.id}
                data-geometry={JSON.stringify(e)}
              >
                <Button
                  variant={selected.includes(e.id) ? 'primary' : 'secondary'}
                  size="compact"
                  type="button"
                  className="layer-select"
                  aria-pressed={selected.includes(e.id)}
                  onClick={(event) => select(e.id, event.shiftKey)}
                >
                  <span className="layer-type" aria-hidden="true">
                    {e.type === 'SPACE'
                      ? '▦'
                      : e.type === 'TEXT'
                        ? 'T'
                        : e.type === 'CIRCLE'
                          ? '○'
                          : e.type === 'TRIANGLE'
                            ? '△'
                            : e.type === 'LINE'
                              ? '╱'
                              : '□'}
                  </span>
                  <span>
                    {e.text || e.type.toLowerCase()}
                    {e.groupId ? ' · grouped' : ''}
                  </span>
                </Button>
                <div className="layer-actions">
                  <Button
                    variant="secondary"
                    size="compact"
                    type="button"
                    onClick={() => locate(e.id)}
                    aria-label={`Locate ${e.text || e.type.toLowerCase()}`}
                  >
                    Locate
                  </Button>
                  <Check
                    label={`Lock ${e.text || e.type.toLowerCase()}`}
                    checked={!!e.locked}
                    onChange={(locked) => editable && flags([e.id], { locked })}
                  />
                  <Check
                    label={`Hide ${e.text || e.type.toLowerCase()}`}
                    checked={!!e.editorHidden}
                    onChange={(editorHidden) =>
                      editable && flags([e.id], { editorHidden })
                    }
                  />
                </div>
              </li>
            ))}
        </ul>
      </div>
    </details>
  );
}
