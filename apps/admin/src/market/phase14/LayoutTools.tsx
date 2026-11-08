import {
  Input,
  Select,
  UtilityIcon,
  assetUrl,
  environmentPresets,
  mapAsset,
  type MapAsset,
  type MapTool,
} from '@market/ui';
import type { MapElement } from '@market/api';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Control } from './common';
import {
  LayoutImagePicker,
  type LayoutMedia,
  type LayoutPhoto,
} from './LayoutImagePicker';

export const objectIcons: Record<
  MapElement['type'],
  ComponentProps<typeof UtilityIcon>['name']
> = {
  SPACE: 'booth',
  RECTANGLE: 'square',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  LINE: 'path',
  TEXT: 'text',
  IMAGE: 'image',
};

export type BoothVariant = 'standard' | 'double';

interface Tile {
  key: string;
  label: string;
  /** Accessible name when it differs from the visible label. */
  name?: string;
  icon?: ComponentProps<typeof UtilityIcon>['name'];
  asset?: string;
  pressed?: boolean;
  disabled?: boolean;
  /** Opens the image library instead of running directly. */
  picker?: boolean;
  run: () => void;
}

// Utility markers reuse the application-owned asset artwork.
const utilityAssets = [
  ['entrance', 'Entrance'],
  ['exit', 'Exit'],
  ['restroom', 'Restroom'],
  ['parking', 'Parking'],
  ['food-truck', 'Food truck'],
  ['handwash', 'Handwash'],
  ['water-fountain', 'Water'],
  ['electric-hookup', 'Power'],
] as const;

// "Add Elements" palette of the layout editor drawer. Feature composition of
// shared Input/Select controls and editor tile buttons: no shared component
// offers a searchable, grouped insertion palette for map elements.
export function LayoutTools({
  tool,
  setTool,
  add,
  addBooth,
  addAsset,
  environment,
  setEnvironment,
  canEditPoints,
  openSmart,
  media,
  addPhoto,
}: {
  tool: MapTool;
  setTool: (tool: MapTool) => void;
  add: (type: MapElement['type']) => void;
  addBooth: (variant: BoothVariant) => void;
  addAsset: (asset: MapAsset) => void;
  environment: string;
  setEnvironment: (value: string) => void;
  canEditPoints: boolean;
  openSmart: (tool: string) => void;
  /** Market image library; without it Image inserts a URL-based frame. */
  media?: LayoutMedia;
  addPhoto?: (photo: LayoutPhoto) => void;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const groups: Array<{ title: string; tiles: Tile[]; extra?: ReactNode }> = [
    {
      title: 'Booths',
      tiles: [
        {
          key: 'booth',
          label: 'Booth',
          name: 'Add booth',
          icon: 'booth',
          run: () => addBooth('standard'),
        },
        {
          key: 'double',
          label: 'Double booth',
          name: 'Add double booth',
          icon: 'booth-double',
          run: () => addBooth('double'),
        },
        {
          key: 'row',
          label: 'Booth row',
          name: 'Smart booth row',
          icon: 'layers',
          run: () => openSmart('row'),
        },
      ],
    },
    {
      title: 'Layout',
      tiles: [
        {
          key: 'path',
          label: 'Aisle / path',
          name: 'Draw path',
          icon: 'path',
          pressed: tool === 'draw' && !environment,
          run: () => {
            setEnvironment('');
            setTool('draw');
          },
        },
        {
          key: 'points',
          label: 'Edit points',
          name: 'Edit path points',
          icon: 'cursor',
          pressed: tool === 'points',
          disabled: !canEditPoints,
          run: () => setTool(tool === 'points' ? 'select' : 'points'),
        },
        {
          key: 'line',
          label: 'Line',
          name: 'Add line',
          icon: 'line',
          run: () => add('LINE'),
        },
      ],
      extra: (
        <Control label="Environment drawing" className="designer-palette-field">
          {(id) => (
            <Select
              id={id}
              value={environment}
              onChange={(event) => {
                setEnvironment(event.target.value);
                setTool('draw');
              }}
            >
              <option value="">Custom path</option>
              <optgroup label="Walkways and roads">
                {environmentPresets
                  .filter((p) => !('closed' in p))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Landscape regions">
                {environmentPresets
                  .filter((p) => 'closed' in p)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            </Select>
          )}
        </Control>
      ),
    },
    {
      title: 'Shapes',
      tiles: (['RECTANGLE', 'CIRCLE', 'TRIANGLE'] as const).map((type) => ({
        key: type,
        label: type.charAt(0) + type.slice(1).toLowerCase(),
        name: `Add ${type.toLowerCase()}`,
        icon: objectIcons[type],
        run: () => add(type),
      })),
    },
    {
      title: 'Labels and media',
      tiles: [
        {
          key: 'text',
          label: 'Text',
          name: 'Add text',
          icon: 'text',
          run: () => add('TEXT'),
        },
        media && addPhoto
          ? {
              key: 'image',
              label: 'Image',
              name: 'Upload or choose image',
              icon: 'image',
              picker: true,
              run: () => undefined,
            }
          : {
              key: 'image',
              label: 'Image',
              name: 'Add image',
              icon: 'image',
              run: () => add('IMAGE'),
            },
        {
          key: 'legend',
          label: 'Legend',
          name: 'Automatic legend',
          icon: 'legend',
          run: () => openSmart('legend'),
        },
      ],
    },
    {
      title: 'Icons and utilities',
      tiles: utilityAssets.flatMap(([id, label]) => {
        const asset = mapAsset(id);
        return asset
          ? [
              {
                key: id,
                label,
                name: `Add ${asset.name.toLowerCase()}`,
                asset: id,
                run: () => addAsset(asset),
              },
            ]
          : [];
      }),
    },
    {
      title: 'Templates',
      tiles: [
        {
          key: 'arrangements',
          label: 'Arrangements',
          name: 'Premade arrangements',
          icon: 'grid',
          run: () => openSmart('arrangement'),
        },
        {
          key: 'style',
          label: 'Map style',
          name: 'Map style preset',
          icon: 'sparkle',
          run: () => openSmart('style'),
        },
      ],
    },
  ];
  const visible = groups
    .map((group) => ({
      ...group,
      tiles: group.tiles.filter((tile) =>
        `${tile.label} ${tile.name ?? ''} ${group.title}`
          .toLowerCase()
          .includes(query),
      ),
    }))
    .filter((group) => group.tiles.length || (!query && group.extra));
  return (
    <div className="designer-palette">
      <div className="designer-search">
        <UtilityIcon name="search" />
        <Input
          type="search"
          aria-label="Search elements"
          placeholder="Search elements…"
          value={search}
          maxLength={80}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {visible.map((group) => (
        <section
          key={group.title}
          className="designer-palette-group"
          aria-label={group.title}
        >
          <h3>{group.title}</h3>
          <div className="designer-tiles">
            {group.tiles.map((tile) => {
              const button = (run: () => void, busy = false) => (
                <button
                  key={tile.key}
                  type="button"
                  className="designer-tile"
                  aria-label={tile.name}
                  aria-pressed={tile.pressed}
                  aria-haspopup={tile.picker ? 'dialog' : undefined}
                  disabled={tile.disabled || busy}
                  onClick={run}
                >
                  {tile.asset ? (
                    <img
                      src={assetUrl(tile.asset)}
                      alt=""
                      width={30}
                      height={30}
                    />
                  ) : (
                    <UtilityIcon name={tile.icon!} />
                  )}
                  <span>{tile.label}</span>
                </button>
              );
              return tile.picker && media && addPhoto ? (
                <LayoutImagePicker
                  key={tile.key}
                  media={media}
                  label="Upload or choose image"
                  onPick={addPhoto}
                >
                  {(open, busy) => button(open, busy)}
                </LayoutImagePicker>
              ) : (
                button(tile.run)
              );
            })}
          </div>
          {!query && group.extra}
        </section>
      ))}
      {!visible.length && (
        <p className="designer-muted" role="status">
          No elements match “{search.trim()}”.
        </p>
      )}
    </div>
  );
}
