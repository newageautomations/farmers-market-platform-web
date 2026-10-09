import { useReducer, useState } from 'react';
import type {
  LayoutVersion,
  MapDefinition,
  MapElement,
  MarketOperationsData,
  OperationsCommand,
  SpaceDetails,
} from '@market/api';
import { MarketMap } from '@market/ui';
import { Check, Control, Entry } from './common';
interface Drawing {
  definition: MapDefinition;
  spaces: Record<string, SpaceDetails>;
}
interface History {
  present: Drawing;
  past: Drawing[];
  future: Drawing[];
}
export function drawingHistory(
  state: History,
  action: { type: 'EDIT'; value: Drawing } | { type: 'UNDO' | 'REDO' },
): History {
  if (action.type === 'EDIT')
    return {
      present: action.value,
      past: [...state.past, state.present].slice(-100),
      future: [],
    };
  if (action.type === 'UNDO' && state.past.length)
    return {
      present: state.past[state.past.length - 1]!,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future],
    };
  if (action.type === 'REDO' && state.future.length)
    return {
      present: state.future[0]!,
      past: [...state.past, state.present],
      future: state.future.slice(1),
    };
  return state;
}
const baseSpace = (label: string): SpaceDetails => ({
  label,
  widthFeet: 10,
  depthFeet: 10,
  spaceType: 'BOOTH',
  description: '',
  amenities: [],
  feeMinor: 0,
  currency: 'USD',
  preferredDirectoryId: null,
  managerNotes: '',
});
export function Layouts({
  data,
  run,
  canManage,
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const version = data.layoutVersions?.find((v) => v.id === selected);
  return (
    <>
      {canManage && (
        <div className="ops-toolbar">
          <button
            type="button"
            onClick={async () => {
              const v = (await run({
                action: 'CREATE_LAYOUT',
                data: { name: 'Untitled layout' },
              })) as LayoutVersion;
              if (v) setSelected(v.id);
            }}
          >
            Create layout
          </button>
        </div>
      )}
      <ul className="ops-record-list">
        {data.layouts?.map((l) => (
          <li key={l.id}>
            <h2>{l.name}</h2>
            {data.layoutVersions
              ?.filter((v) => v.layoutId === l.id)
              .map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                >
                  Version {v.versionNumber} · {v.status.toLowerCase()}
                </button>
              ))}
          </li>
        ))}
      </ul>
      {version && (
        <LayoutEditor
          key={`${version.id}:${version.revision}`}
          version={version}
          data={data}
          run={run}
          canManage={canManage}
        />
      )}
    </>
  );
}
function LayoutEditor({
  version,
  data,
  run,
  canManage,
}: {
  version: LayoutVersion;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const [history, dispatch] = useReducer(drawingHistory, {
      past: [],
      future: [],
      present: {
        definition: version.definition,
        spaces: Object.fromEntries(
          data.spaces
            ?.filter((s) => s.layoutVersionId === version.id)
            .map((s) => [s.elementId, s.details]) ?? [],
        ),
      },
    }),
    [selected, setSelected] = useState(''),
    [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true),
    [areaName, setAreaName] = useState(''),
    [area, setArea] = useState(version.definition.areas[0]?.id ?? ''),
    [copied, setCopied] = useState<{
      element: MapElement;
      space?: SpaceDetails;
    } | null>(null);
  const drawing = history.present,
    definition = drawing.definition,
    element = definition.elements.find((e) => e.id === selected),
    space = drawing.spaces[selected],
    editable = canManage && version.status === 'DRAFT';
  function update(value: Drawing) {
    dispatch({ type: 'EDIT', value });
  }
  function geometry(next: MapElement) {
    const spaces = { ...drawing.spaces };
    if (next.type === 'SPACE' && spaces[next.id])
      spaces[next.id] = {
        ...spaces[next.id]!,
        widthFeet: next.width / definition.pixelsPerFoot,
        depthFeet: next.height / definition.pixelsPerFoot,
      };
    update({
      definition: {
        ...definition,
        elements: definition.elements.map((e) => (e.id === next.id ? next : e)),
      },
      spaces,
    });
  }
  function booth(patch: Partial<SpaceDetails>) {
    if (!element || !space) return;
    const next = { ...space, ...patch };
    update({
      definition: {
        ...definition,
        elements: definition.elements.map((e) =>
          e.id === selected
            ? {
                ...e,
                text: next.label,
                width: next.widthFeet * definition.pixelsPerFoot,
                height: next.depthFeet * definition.pixelsPerFoot,
              }
            : e,
        ),
      },
      spaces: { ...drawing.spaces, [selected]: next },
    });
  }
  function add(
    type: MapElement['type'],
    source?: { element: MapElement; space?: SpaceDetails },
  ) {
    const id = crypto.randomUUID(),
      e: MapElement = source
        ? {
            ...source.element,
            id,
            x: source.element.x + 20,
            y: source.element.y + 20,
          }
        : {
            id,
            areaId: area,
            type,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            rotation: 0,
            zIndex: definition.elements.length,
            text:
              type === 'SPACE'
                ? `Booth ${definition.elements.filter((e) => e.type === 'SPACE').length + 1}`
                : type === 'TEXT'
                  ? 'Venue label'
                  : '',
            fill: type === 'SPACE' ? '#e0ebd9' : '#d4dccf',
          };
    update({
      definition: { ...definition, elements: [...definition.elements, e] },
      spaces:
        e.type === 'SPACE'
          ? {
              ...drawing.spaces,
              [id]: source?.space
                ? { ...source.space, label: source.space.label + ' copy' }
                : baseSpace(e.text),
            }
          : drawing.spaces,
    });
    setSelected(id);
  }
  const publicSpaces = Object.entries(drawing.spaces).map(([elementId, s]) => ({
    elementId,
    label: s.label,
    widthFeet: s.widthFeet,
    depthFeet: s.depthFeet,
    amenities: s.amenities,
    vendor: null,
  }));
  const save = () =>
    run({
      action: 'SAVE_LAYOUT',
      id: version.id,
      expectedRevision: version.revision,
      data: { ...drawing },
    });
  return (
    <section className="ops-editor" aria-label="Market layout editor">
      <h2>Layout version {version.versionNumber}</h2>
      <p>
        Drag elements to move them. Drag the blue corner to resize. The
        inspector supports exact keyboard entry. Drag the background to pan.
      </p>
      <div className="ops-toolbar">
        <button
          type="button"
          disabled={!editable || !history.past.length}
          onClick={() => dispatch({ type: 'UNDO' })}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!editable || !history.future.length}
          onClick={() => dispatch({ type: 'REDO' })}
        >
          Redo
        </button>
        <Check label="Show grid" checked={grid} onChange={setGrid} />
        <Check label="Snap to grid" checked={snap} onChange={setSnap} />
        {canManage && (
          <button
            type="button"
            onClick={() =>
              run({ action: 'CLONE_LAYOUT', id: version.id, data: {} })
            }
          >
            Create new draft version
          </button>
        )}
        {editable && (
          <>
            <button type="button" onClick={save}>
              Save layout
            </button>
            <button
              type="button"
              onClick={async () => {
                const saved = (await save()) as LayoutVersion;
                if (!saved) return;
                await run({
                  action: 'PUBLISH_LAYOUT',
                  id: saved.id,
                  expectedRevision: saved.revision,
                  data: {},
                });
              }}
            >
              Save and publish layout
            </button>
          </>
        )}
      </div>
      {editable && (
        <>
          <form
            className="ops-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              if (areaName) {
                const id = crypto.randomUUID();
                update({
                  ...drawing,
                  definition: {
                    ...definition,
                    areas: [...definition.areas, { id, name: areaName }],
                  },
                });
                setArea(id);
                setAreaName('');
              }
            }}
          >
            <Entry
              label="New area name"
              value={areaName}
              onChange={setAreaName}
            />
            <button>Add area</button>
          </form>
          <Control label="Area for new elements">
            {(id) => (
              <select
                id={id}
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                {definition.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </Control>
          <div className="ops-toolbar">
            {(
              [
                'SPACE',
                'RECTANGLE',
                'CIRCLE',
                'TRIANGLE',
                'LINE',
                'TEXT',
                'IMAGE',
              ] as const
            ).map((type) => (
              <button key={type} type="button" onClick={() => add(type)}>
                Add {type === 'SPACE' ? 'booth' : type.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="ops-toolbar">
            <button
              type="button"
              disabled={!element}
              onClick={() => element && setCopied({ element, space })}
            >
              Copy
            </button>
            <button
              type="button"
              disabled={!copied}
              onClick={() => copied && add(copied.element.type, copied)}
            >
              Paste
            </button>
            <button
              type="button"
              disabled={!element}
              onClick={() => element && add(element.type, { element, space })}
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled={!element}
              onClick={() => {
                const spaces = { ...drawing.spaces };
                delete spaces[selected];
                update({
                  definition: {
                    ...definition,
                    elements: definition.elements.filter(
                      (e) => e.id !== selected,
                    ),
                  },
                  spaces,
                });
                setSelected('');
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
      <div className="ops-map-columns">
        <MarketMap
          definition={definition}
          spaces={publicSpaces}
          editable={editable}
          selectedId={selected}
          onSelect={setSelected}
          onEdit={geometry}
          grid={grid}
          snap={snap}
          activeArea={area}
          onAreaChange={setArea}
        />
        {element && (
          <fieldset className="ops-inspector" disabled={!editable}>
            <legend>{space ? 'Booth inspector' : 'Element inspector'}</legend>
            <Entry
              label="Label"
              value={space?.label ?? element.text}
              onChange={(v) =>
                space ? booth({ label: v }) : geometry({ ...element, text: v })
              }
            />
            {(['x', 'y', 'rotation', 'zIndex'] as const).map((key) => (
              <Entry
                key={key}
                label={key === 'zIndex' ? 'Stack order' : key}
                type="number"
                value={element[key]}
                onChange={(v) => geometry({ ...element, [key]: Number(v) })}
              />
            ))}
            <Control label="Element area">
              {(id) => (
                <select
                  id={id}
                  value={element.areaId}
                  onChange={(e) =>
                    geometry({ ...element, areaId: e.target.value })
                  }
                >
                  {definition.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </Control>
            <Entry
              label="Fill color"
              type="color"
              value={element.fill}
              onChange={(v) => geometry({ ...element, fill: v })}
            />
            {space ? (
              <>
                <Entry
                  label="Width in feet"
                  type="number"
                  min={1}
                  max={1000}
                  step={0.1}
                  value={space.widthFeet}
                  onChange={(v) => booth({ widthFeet: Number(v) })}
                />
                <Entry
                  label="Depth in feet"
                  type="number"
                  min={1}
                  max={1000}
                  step={0.1}
                  value={space.depthFeet}
                  onChange={(v) => booth({ depthFeet: Number(v) })}
                />
                <Entry
                  label="Space type"
                  value={space.spaceType}
                  onChange={(v) => booth({ spaceType: v })}
                />
                <Entry
                  label="Description"
                  value={space.description}
                  onChange={(v) => booth({ description: v })}
                />
                <Entry
                  label="Default fee in minor units"
                  type="number"
                  min={0}
                  step={1}
                  value={space.feeMinor}
                  onChange={(v) => booth({ feeMinor: Number(v) })}
                />
                <Entry
                  label="Currency"
                  value={space.currency}
                  onChange={(v) => booth({ currency: v.toUpperCase() })}
                />
                <fieldset>
                  <legend>Physical amenities</legend>
                  {[
                    'ELECTRICITY',
                    'WATER',
                    'SHADE',
                    'COVERED',
                    'INDOOR',
                    'VEHICLE',
                    'FOOD_TRUCK',
                  ].map((a) => (
                    <Check
                      key={a}
                      label={a.toLowerCase().replaceAll('_', ' ')}
                      checked={space.amenities.includes(a)}
                      onChange={(v) =>
                        booth({
                          amenities: v
                            ? [...space.amenities, a]
                            : space.amenities.filter((x) => x !== a),
                        })
                      }
                    />
                  ))}
                </fieldset>
                <Control label="Preferred business suggestion">
                  {(id) => (
                    <select
                      id={id}
                      value={space.preferredDirectoryId ?? ''}
                      onChange={(e) =>
                        booth({
                          preferredDirectoryId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">No preference</option>
                      {data.directory?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.contact.businessName}
                        </option>
                      ))}
                    </select>
                  )}
                </Control>
                <Entry
                  label="Private manager notes"
                  value={space.managerNotes}
                  onChange={(v) => booth({ managerNotes: v })}
                />
              </>
            ) : (
              <>
                {(['width', 'height'] as const).map((key) => (
                  <Entry
                    key={key}
                    label={key}
                    type="number"
                    min={1}
                    value={element[key]}
                    onChange={(v) => geometry({ ...element, [key]: Number(v) })}
                  />
                ))}
                {element.type === 'IMAGE' && (
                  <Entry
                    label="Image or logo URL"
                    type="url"
                    value={element.imageUrl ?? ''}
                    onChange={(v) => geometry({ ...element, imageUrl: v })}
                  />
                )}
              </>
            )}
          </fieldset>
        )}
      </div>
    </section>
  );
}
