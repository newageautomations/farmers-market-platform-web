import { useState } from 'react';
import {
  UtilityIcon,
  Button,
  Select,
  Input,
  assetCategories,
  assetUrl,
  mapAssets,
  type MapAsset,
} from '@market/ui';
import { Control } from './common';
import {
  LayoutImagePicker,
  type LayoutMedia,
  type LayoutPhoto,
} from './LayoutImagePicker';
import '../../vendor/image-library.css';

// Feature composition: the existing primitives do not supply a categorized map
// illustration browser. Buttons, native selects and panel presentation are reused.
export function LayoutAssets({
  insert,
  disabled,
  arrangements,
  media,
  insertPhoto,
}: {
  insert: (asset: MapAsset) => void;
  disabled: boolean;
  arrangements?: () => void;
  media?: LayoutMedia;
  insertPhoto?: (photo: LayoutPhoto) => void;
}) {
  const [category, setCategory] = useState('All'),
    [search, setSearch] = useState(''),
    [inserted, setInserted] = useState('');
  const assets = mapAssets.filter(
    (asset) =>
      (category === 'All' || asset.category === category) &&
      `${asset.name} ${asset.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <div className="designer-asset-browser">
      <section className="designer-asset-section" aria-label="Your images">
        <h3>Your images</h3>
        {media && insertPhoto ? (
          <>
            <p>
              Upload a PNG or JPEG, or reuse one from your Market image library,
              such as a logo, site plan or sponsor banner.
            </p>
            <LayoutImagePicker
              media={media}
              label="Upload or choose image"
              onPick={insertPhoto}
            >
              {(open, busy) => (
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  aria-haspopup="dialog"
                  disabled={disabled || busy}
                  onClick={open}
                >
                  <UtilityIcon name="image" />
                  Upload or choose image
                </Button>
              )}
            </LayoutImagePicker>
          </>
        ) : (
          <p>
            Uploads and the image library require website management access.
            You can still add an Image and paste its URL in the inspector.
          </p>
        )}
      </section>
      <h3>Illustrations</h3>
      <Control label="Search assets">
        {(id) => (
          <Input
            id={id}
            type="search"
            value={search}
            placeholder="Trees, seating, parking…"
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
      </Control>
      <Control label="Asset category">
        {(id) => (
          <Select
            id={id}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>All</option>
            {assetCategories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
        )}
      </Control>
      {arrangements && (
        <Button
          variant="secondary"
          size="compact"
          type="button"
          onClick={arrangements}
        >
          Premade arrangements
        </Button>
      )}
      <p role="status">
        {assets.length} assets{inserted ? ` · Added ${inserted}` : ''}
      </p>
      <div className="image-library-grid image-library-stock designer-asset-grid">
        {assets.map((asset) => (
          <Button
            key={asset.id}
            variant="secondary"
            className="image-library-option button-selection-fill"
            type="button"
            disabled={disabled}
            aria-pressed={inserted === asset.name}
            onClick={() => {
              insert(asset);
              setInserted(asset.name);
            }}
          >
            <img
              src={assetUrl(asset.id)}
              alt=""
              width={72}
              height={72}
              loading="lazy"
            />
            <span>{asset.name}</span>
          </Button>
        ))}
      </div>
      {!assets.length && (
        <p>No assets match. Try another search or category.</p>
      )}
      <p>
        Illustrations are decorative. Use Booth for an assignable physical
        space.
      </p>
    </div>
  );
}
