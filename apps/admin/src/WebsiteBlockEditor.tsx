import { useContext, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  IconButton,
  Input,
  SelectField,
  Textarea,
  UtilityIcon,
} from '@market/ui';
import type { StorefrontAppearanceApi } from '@market/api';
import {
  createWebsiteBlock,
  editWebsiteBlocks,
  effectiveWebsiteBlocks,
  themePageStructure,
  websiteBlockManifest,
  type WebsiteBlock,
  type WebsiteBlockType,
  type WebsiteImageWithTextSection,
} from '@market/theme/storefront';
import { WebsiteEditorContext } from './WebsiteEditorContext';
import { CategoryImageField } from './vendor/categories';
import { WebsiteSectionDestination } from './WebsiteSectionManagement';
import { EditorRangeField } from './TextSizeControls';
import { WebsiteSectionSizingEditor } from './WebsiteSectionSizingEditor';
import { ImageShapeField } from './StorefrontAppearance';

type Props = {
  value: WebsiteImageWithTextSection;
  onChange: (value: WebsiteImageWithTextSection) => void;
  busy: boolean;
};

/** A feature hierarchy composed from shared controls. Images retain their theme-owned region. */
export function WebsiteBlockHierarchy({ value, onChange, busy }: Props) {
  const workspace = useContext(WebsiteEditorContext);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState<string>();
  const [drop, setDrop] = useState<{
    id: string;
    placement: 'before' | 'after';
  }>();
  const blocks = effectiveWebsiteBlocks(value);
  const atLimit = (type: WebsiteBlockType) =>
    blocks.filter((b) => b.type === type).length >=
    websiteBlockManifest[type].max;
  return (
    <div className="website-block-hierarchy" aria-label="Section blocks">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="website-block-row"
          data-drop={drop?.id === block.id ? drop.placement : undefined}
          onDragOver={(event) => {
            if (
              busy ||
              !dragging ||
              dragging === block.id ||
              block.type === 'image'
            )
              return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const rect = event.currentTarget.getBoundingClientRect();
            setDrop({
              id: block.id,
              placement:
                event.clientY < rect.top + rect.height / 2 ? 'before' : 'after',
            });
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!busy && dragging && drop?.id === block.id)
              onChange(
                editWebsiteBlocks(value, {
                  type: 'reorder',
                  id: dragging,
                  targetId: block.id,
                  placement: drop.placement,
                }),
              );
            setDragging(undefined);
            setDrop(undefined);
          }}
          data-selected={
            (workspace?.block?.sectionId === value.id &&
              workspace.block.blockId === block.id) ||
            undefined
          }
        >
          <IconButton
            icon="grip"
            label={`Move block: ${websiteBlockManifest[block.type].label}`}
            size="compact"
            disabled={busy || block.type === 'image'}
            draggable={!busy && block.type !== 'image'}
            onDragStart={(event) => {
              if (busy || block.type === 'image') return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', block.id);
              setDragging(block.id);
            }}
            onDragEnd={() => {
              setDragging(undefined);
              setDrop(undefined);
            }}
            onKeyDown={(e) => {
              if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
              e.preventDefault();
              onChange(
                editWebsiteBlocks(value, {
                  type: 'move',
                  id: block.id,
                  offset: e.key === 'ArrowUp' ? -1 : 1,
                }),
              );
            }}
          />
          <Button
            variant="tertiary"
            size="compact"
            aria-pressed={
              workspace?.block?.sectionId === value.id &&
              workspace.block.blockId === block.id
            }
            disabled={busy}
            onClick={() => workspace?.selectBlock(value.id, block.id)}
          >
            <UtilityIcon name={block.type === 'image' ? 'image' : 'text'} />
            <span>
              {websiteBlockManifest[block.type].label}
              {!block.visible ? ' (hidden)' : ''}
            </span>
          </Button>
        </div>
      ))}
      <Button
        variant="tertiary"
        size="compact"
        disabled={busy || blocks.length >= 8}
        onClick={() => setAdding(true)}
      >
        <UtilityIcon name="plus" /> Add Block
      </Button>
      <Dialog
        open={adding}
        title="Add block"
        busy={busy}
        onClose={() => setAdding(false)}
      >
        <div className="farmhouse-section-picker">
          {(Object.keys(websiteBlockManifest) as WebsiteBlockType[]).map(
            (type) => (
              <Button
                key={type}
                variant="secondary"
                disabled={busy || atLimit(type)}
                onClick={() => {
                  if (busy || atLimit(type)) return;
                  const block = createWebsiteBlock(
                    type,
                    `block-${crypto.randomUUID()}`,
                  );
                  onChange(editWebsiteBlocks(value, { type: 'add', block }));
                  workspace?.selectBlock(value.id, block.id);
                  setAdding(false);
                }}
              >
                {websiteBlockManifest[type].label}
              </Button>
            ),
          )}
        </div>
        <p>
          One heading and image, up to three paragraphs, two buttons and one
          introductory label. The image stays in its own column.
        </p>
      </Dialog>
    </div>
  );
}

export function WebsiteBlockInspector({
  value,
  onChange,
  busy,
  api,
  themeId,
  categories,
  products,
  loadProducts,
}: Props & {
  api: StorefrontAppearanceApi;
  themeId: string;
  categories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; slug?: string }>;
  loadProducts: () => void;
}) {
  const workspace = useContext(WebsiteEditorContext);
  const [deleting, setDeleting] = useState(false);
  const blocks = effectiveWebsiteBlocks(value);
  const block = blocks.find(
    (b) =>
      workspace?.block?.sectionId === value.id &&
      b.id === workspace.block.blockId,
  );
  if (!block) return null;
  const definition = websiteBlockManifest[block.type];
  const update = (next: WebsiteBlock) =>
    onChange(editWebsiteBlocks(value, { type: 'update', block: next }));
  const textBlocks = blocks.filter((b) => b.type !== 'image');
  const index = textBlocks.findIndex((b) => b.id === block.id);
  return (
    <fieldset disabled={busy} className="website-block-inspector">
      <Button
        variant="tertiary"
        size="compact"
        onClick={() => workspace?.selectBlock(value.id)}
      >
        Section settings
      </Button>
      <p>{definition.label}</p>
      {block.type === 'image' ? (
        <>
          {themePageStructure(workspace?.theme ?? themeId, workspace?.kind)
            .sectionImageShape &&
            value.presentation.imageSide !== 'background' && (
              <ImageShapeField
                id={`${value.id}-image-shape`}
                label="Image shape"
                includeNatural
                value={value.presentation.imageShape ?? 'dome'}
                onChange={(imageShape) =>
                  onChange({
                    ...value,
                    presentation: { ...value.presentation, imageShape },
                  })
                }
              />
            )}
          <WebsiteSectionSizingEditor
            value={value}
            onChange={(next) => onChange(next as WebsiteImageWithTextSection)}
            imageOnly
          />
          {api.media && (
            <CategoryImageField
              api={api.media}
              themeId={themeId}
              label="Photograph"
              presentation="library"
              value={block.content.assetId}
              preview={block.content.url}
              onImageChange={(image) =>
                update({
                  ...block,
                  content: {
                    ...block.content,
                    assetId: image?.id ?? null,
                    url: image?.preview ?? '',
                  },
                })
              }
            />
          )}
          <Field id={`${block.id}-alt`} label="Image alt text">
            <Input
              id={`${block.id}-alt`}
              value={block.content.alt}
              maxLength={200}
              onChange={(e) =>
                update({
                  ...block,
                  content: { ...block.content, alt: e.target.value },
                })
              }
            />
          </Field>
        </>
      ) : block.type === 'button' ? (
        <>
          <Field id={`${block.id}-label`} label="Button label">
            <Input
              id={`${block.id}-label`}
              value={block.content.label}
              maxLength={80}
              required
              onChange={(e) =>
                update({
                  ...block,
                  content: { ...block.content, label: e.target.value },
                })
              }
            />
          </Field>
          <WebsiteSectionDestination
            id={`${block.id}-destination`}
            value={block.content.destination}
            onChange={(destination) =>
              update({ ...block, content: { ...block.content, destination } })
            }
            categories={categories}
            products={products}
            loadProducts={loadProducts}
          />
          <SelectField
            id={`${block.id}-style`}
            label="Button style"
            value={block.presentation.style ?? 'primary'}
            onChange={(e) =>
              update({
                ...block,
                presentation: {
                  style: e.target.value as 'primary' | 'secondary',
                  ...('scale' in block.presentation
                    ? { scale: block.presentation.scale }
                    : {}),
                },
              })
            }
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </SelectField>
        </>
      ) : (
        <>
          <Field id={`${block.id}-text`} label={definition.label}>
            {block.type === 'paragraph' ? (
              <Textarea
                id={`${block.id}-text`}
                rows={5}
                maxLength={1200}
                value={block.content.text}
                onChange={(e) =>
                  update({ ...block, content: { text: e.target.value } })
                }
              />
            ) : (
              <Input
                id={`${block.id}-text`}
                maxLength={block.type === 'heading' ? 160 : 80}
                value={block.content.text}
                onChange={(e) =>
                  update({ ...block, content: { text: e.target.value } })
                }
              />
            )}
          </Field>
        </>
      )}
      {block.type !== 'image' && (
        <EditorRangeField
          id={`${block.id}-scale`}
          label={block.type === 'button' ? 'Button size' : 'Text size'}
          min={50}
          max={200}
          value={
            block.presentation.scale ??
            (block.type !== 'button' && block.presentation.size === 'large'
              ? 125
              : 100)
          }
          onChange={(scale) =>
            update({ ...block, presentation: { ...block.presentation, scale } })
          }
        />
      )}
      {definition.min === 0 && (
        <Field id={`${block.id}-visible`} label="Visible">
          <Checkbox
            id={`${block.id}-visible`}
            checked={block.visible}
            onChange={() =>
              onChange(
                editWebsiteBlocks(value, { type: 'toggle', id: block.id }),
              )
            }
          />
        </Field>
      )}
      <div className="ui-actions">
        {block.type !== 'image' && (
          <>
            <IconButton
              icon="arrow-up"
              label="Move block up"
              disabled={busy || index === 0}
              onClick={() =>
                onChange(
                  editWebsiteBlocks(value, {
                    type: 'move',
                    id: block.id,
                    offset: -1,
                  }),
                )
              }
            />
            <IconButton
              icon="arrow-down"
              label="Move block down"
              disabled={busy || index === textBlocks.length - 1}
              onClick={() =>
                onChange(
                  editWebsiteBlocks(value, {
                    type: 'move',
                    id: block.id,
                    offset: 1,
                  }),
                )
              }
            />
          </>
        )}
        {definition.max > 1 && (
          <IconButton
            icon="copy"
            label="Duplicate block"
            disabled={
              busy ||
              blocks.filter((b) => b.type === block.type).length >=
                definition.max
            }
            onClick={() => {
              const newId = `block-${crypto.randomUUID()}`;
              onChange(
                editWebsiteBlocks(value, {
                  type: 'duplicate',
                  id: block.id,
                  newId,
                }),
              );
              workspace?.selectBlock(value.id, newId);
            }}
          />
        )}
        {definition.min === 0 && (
          <IconButton
            icon="trash"
            label="Delete block"
            variant="destructive-outline"
            disabled={busy}
            onClick={() => setDeleting(true)}
          />
        )}
      </div>
      <Dialog
        open={deleting}
        title="Delete this block?"
        onClose={() => setDeleting(false)}
        busy={busy}
        actions={
          <Button
            variant="destructive-outline"
            disabled={busy}
            onClick={() => {
              onChange(
                editWebsiteBlocks(value, { type: 'delete', id: block.id }),
              );
              workspace?.selectBlock(value.id);
              setDeleting(false);
            }}
          >
            Delete block
          </Button>
        }
      >
        <p>
          The block will be removed from this draft. You can undo this change.
        </p>
      </Dialog>
    </fieldset>
  );
}
