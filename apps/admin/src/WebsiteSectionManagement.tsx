import {
  WebsiteEditorContext,
  WebsiteInspectorContent,
} from './WebsiteEditorContext';
import {
  WebsiteBlockHierarchy,
  WebsiteBlockInspector,
} from './WebsiteBlockEditor';
import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  Dialog,
  IconButton,
  Checkbox,
  SelectField,
  UtilityIcon,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type { StorefrontAppearanceApi } from '@market/api';
import {
  availableWebsiteSections,
  createWebsiteSection,
  websiteSectionLimit,
  websiteSectionRegistry,
  moveWebsiteSection,
  reorderWebsiteSection,
  withWebsiteSectionContent,
  websiteSectionItems,
  websiteSectionHeading,
  type SectionTarget,
  type WebsiteSection,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import { websiteSectionEditors } from './WebsiteTextSectionEditor';

type SectionRow = { id: string; visible: boolean };
function isRepeatable(section: SectionRow): section is WebsiteSection {
  return 'type' in section;
}
export function useWebsiteSectionCategories(api: StorefrontAppearanceApi) {
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  useEffect(() => {
    let active = true;
    void api
      .hierarchy?.()
      .then((rows) => {
        if (active) {
          const flatten = (
            nodes: typeof rows,
            prefix: string[] = [],
          ): Array<{ id: string; name: string }> =>
            nodes
              .filter((n) => n.active)
              .flatMap((n) => [
                { id: n.id, name: [...prefix, n.name].join(' / ') },
                ...flatten(n.children, [...prefix, n.name]),
              ]);
          setCategories(flatten(rows));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);
  return categories;
}

/** Extracted Phase B management, composed from existing controls. Theme panels remain host-owned. */
export function WebsiteSectionManagement<T extends SectionRow>({
  sections,
  onChange,
  target,
  prefix,
  api,
  products,
  loadProducts,
  selected,
  choose,
  collapsed,
  collapse,
  busy,
  selectionId,
  nativeLabel,
  nativeActionLabel = nativeLabel,
  renderNative,
  renderNativeHierarchy,
  canHide = () => true,
  totalCount,
  addLabel = 'Add Section',
  allowAdd = true,
  categoryPresentation,
  onCategoryPresentationChange,
  hiddenCategoryIds,
  allowSection,
}: {
  sections: Array<T | WebsiteSection>;
  onChange: (sections: Array<T | WebsiteSection>) => void;
  target: SectionTarget;
  prefix: 'farmhouse' | 'editorial' | 'harvest' | `page:${string}`;
  api: StorefrontAppearanceApi;
  products: Array<{ id: string; name: string; slug?: string }>;
  loadProducts: () => void;
  selected?: string;
  choose?: (id: StorefrontEditorSection) => void;
  collapsed?: boolean;
  collapse?: () => void;
  busy: boolean;
  selectionId?: (
    section: T | WebsiteSection,
    list?: Array<T | WebsiteSection>,
  ) => StorefrontEditorSection;
  nativeLabel: (section: T) => string;
  nativeActionLabel?: (section: T) => string;
  renderNative: (section: T) => ReactNode;
  renderNativeHierarchy?: (section: T) => ReactNode;
  canHide?: (section: T | WebsiteSection) => boolean;
  totalCount?: number;
  addLabel?: string;
  allowAdd?: boolean;
  categoryPresentation?: import('@market/theme/storefront').StorefrontAppearance['categoryPresentation'];
  onCategoryPresentationChange?: (
    value: NonNullable<
      import('@market/theme/storefront').StorefrontAppearance['categoryPresentation']
    >,
  ) => void;
  hiddenCategoryIds?: readonly string[];
  /** Narrows the theme's addable types for an owner, e.g. no vendor showcases on market sites. */
  allowSection?: (type: string) => boolean;
}) {
  const workspace = useContext(WebsiteEditorContext);
  const categories = useWebsiteSectionCategories(api);
  const [deleting, setDeleting] = useState<string>();
  const [sectionPicker, setSectionPicker] = useState(false);
  const [sectionCategory, setSectionCategory] = useState('all');
  const [dragging, setDragging] = useState<string>();
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    placement: 'before' | 'after';
  }>();
  const [announcement, setAnnouncement] = useState('');
  const repeatableCount = totalCount ?? sections.filter(isRepeatable).length;
  const availableSections = availableWebsiteSections(target).filter(
    (definition) => !allowSection || allowSection(definition.type),
  );
  const sectionCategories = [
    ...new Set(availableSections.map((d) => d.category)),
  ];
  const activeCategory = sectionCategories.some((c) => c === sectionCategory)
    ? sectionCategory
    : 'all';
  const atLimit = (type: keyof typeof websiteSectionRegistry) =>
    repeatableCount >= websiteSectionLimit ||
    sections.filter((s) => isRepeatable(s) && s.type === type).length >=
      websiteSectionRegistry[type].maxInstances;
  const row = (
    id: StorefrontEditorSection,
    sectionKey: string,
    label: string,
    children: ReactNode,
    management?: ReactNode,
  ) => {
    const open = !collapsed && selected === id;
    const source = sections.find((s) => s.id === sectionKey);
    // Only rows that reveal blocks or items in the rail behave as dropdowns.
    const expandable =
      !!workspace &&
      !!source &&
      isRepeatable(source) &&
      (source.type === 'image-with-text' ||
        websiteSectionItems(source).length > 0);
    const disclosure = (
      <details
        key={id}
        className={disclosureClassName('dropdown')}
        open={open}
        data-selected={open || undefined}
        data-expandable={expandable || undefined}
        data-farmhouse-editor={prefix === 'farmhouse' ? sectionKey : undefined}
      >
        <summary
          role="button"
          aria-expanded={open}
          onClick={(event) => {
            event.preventDefault();
            if (open) collapse?.();
            else choose?.(id);
          }}
        >
          {label}
        </summary>
        {open && (
          <WebsiteInspectorContent>
            {management && workspace?.block?.sectionId !== sectionKey && (
              <fieldset
                className="farmhouse-section-management"
                disabled={busy}
              >
                {management}
              </fieldset>
            )}
            <fieldset disabled={busy}>{children}</fieldset>
          </WebsiteInspectorContent>
        )}
      </details>
    );
    if (!management) return disclosure;
    const sectionId = sectionKey;
    return (
      <div
        key={id}
        className="farmhouse-section-row"
        data-section-row={sectionId}
        data-drop={
          dropTarget?.id === sectionId ? dropTarget.placement : undefined
        }
        data-dragging={dragging === sectionId || undefined}
        onDragOver={(event) => {
          if (busy || !dragging || dragging === sectionId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          const rect = event.currentTarget.getBoundingClientRect();
          setDropTarget({
            id: sectionId,
            placement:
              event.clientY < rect.top + rect.height / 2 ? 'before' : 'after',
          });
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!busy && dragging && dropTarget?.id === sectionId) {
            const moved = reorderWebsiteSection(
              sections,
              dragging,
              sectionId,
              dropTarget.placement,
            );
            if (moved !== sections) {
              onChange(moved);
              setAnnouncement(`Moved ${label}.`);
            }
          }
          setDragging(undefined);
          setDropTarget(undefined);
        }}
      >
        <div className="farmhouse-section-heading">
          <IconButton
            icon="grip"
            label={`Drag to reorder: ${label}`}
            size="compact"
            disabled={busy}
            draggable={!busy}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', sectionId);
              setDragging(sectionId);
            }}
            onDragEnd={() => {
              setDragging(undefined);
              setDropTarget(undefined);
            }}
            onKeyDown={(event) => {
              if (busy || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              onChange(
                moveWebsiteSection(
                  sections,
                  sectionId,
                  event.key === 'ArrowUp' ? -1 : 1,
                ),
              );
              setAnnouncement(
                `Moved ${label} ${event.key === 'ArrowUp' ? 'up' : 'down'}.`,
              );
            }}
          />
          {disclosure}
        </div>
        {renderNativeHierarchy &&
          (() => {
            const s = sections.find((s) => s.id === sectionId);
            return s && !isRepeatable(s) ? (
              <div className="website-block-hierarchy">
                {renderNativeHierarchy(s as T)}
              </div>
            ) : null;
          })()}
        {open &&
          sections.find(
            (s) =>
              s.id === sectionId &&
              isRepeatable(s) &&
              s.type === 'image-with-text',
          ) &&
          (() => {
            const s = sections.find((s) => s.id === sectionId)!;
            return isRepeatable(s) && s.type === 'image-with-text' ? (
              <WebsiteBlockHierarchy
                value={s}
                busy={busy}
                onChange={(updated) =>
                  onChange(
                    sections.map((item) => (item.id === s.id ? updated : item)),
                  )
                }
              />
            ) : null;
          })()}
        {open &&
          workspace &&
          (() => {
            const parent = sections.find((s) => s.id === sectionId);
            if (!parent || !isRepeatable(parent)) return null;
            return (
              <div
                className="website-block-hierarchy"
                aria-label="Section items"
              >
                {websiteSectionItems(parent).map((item) => (
                  <div className="website-block-row" key={item.id}>
                    <Button
                      variant="tertiary"
                      size="compact"
                      disabled={busy}
                      aria-pressed={
                        workspace.block?.sectionId === parent.id &&
                        workspace.block.blockId === item.id
                      }
                      onClick={() => workspace.selectBlock(parent.id, item.id)}
                    >
                      {(parent.type === 'product-showcase'
                        ? products
                        : parent.type === 'category-showcase'
                          ? categories
                          : []
                      ).find((p) => p.id === item.id)?.name ?? item.label}
                    </Button>
                  </div>
                ))}
              </div>
            );
          })()}
        {!open && !workspace && (
          <fieldset className="farmhouse-section-management" disabled={busy}>
            {management}
          </fieldset>
        )}
      </div>
    );
  };
  return (
    <>
      {availableSections.length > 0 &&
        sections.map((s, index) => {
          const Editor = isRepeatable(s)
            ? websiteSectionEditors[websiteSectionRegistry[s.type].editor]
            : undefined;
          const label = `${isRepeatable(s) ? websiteSectionRegistry[s.type].label + (websiteSectionHeading(s) ? ': ' + websiteSectionHeading(s) : '') : nativeLabel(s as T)}${s.visible ? '' : ' (hidden)'}`;
          if (
            !isRepeatable(s) &&
            renderNativeHierarchy &&
            renderNativeHierarchy(s as T) !== null
          )
            return (
              <div
                key={s.id}
                className="farmhouse-section-row"
                data-section-row={s.id}
                data-drop={
                  dropTarget?.id === s.id ? dropTarget.placement : undefined
                }
                onDragOver={(event) => {
                  if (busy || !dragging || dragging === s.id) return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDropTarget({
                    id: s.id,
                    placement:
                      event.clientY < rect.top + rect.height / 2
                        ? 'before'
                        : 'after',
                  });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!busy && dragging && dropTarget?.id === s.id)
                    onChange(
                      reorderWebsiteSection(
                        sections,
                        dragging,
                        s.id,
                        dropTarget.placement,
                      ),
                    );
                  setDragging(undefined);
                  setDropTarget(undefined);
                }}
              >
                {renderNativeHierarchy(s as T)}
              </div>
            );
          return row(
            selectionId?.(s) ?? `${prefix}:${s.id}`,
            s.id,
            label,
            isRepeatable(s) &&
              s.type === 'image-with-text' &&
              workspace?.block?.sectionId === s.id ? (
              <WebsiteBlockInspector
                value={s}
                busy={busy}
                api={api}
                themeId={target.theme}
                categories={categories}
                products={products}
                loadProducts={loadProducts}
                onChange={(updated) =>
                  onChange(
                    sections.map((item) => (item.id === s.id ? updated : item)),
                  )
                }
              />
            ) : isRepeatable(s) && Editor ? (
              <Editor
                value={s}
                target={target}
                categoryPresentation={categoryPresentation}
                onCategoryPresentationChange={onCategoryPresentationChange}
                hiddenCategoryIds={hiddenCategoryIds}
                media={api.media}
                api={api}
                products={products}
                loadProducts={loadProducts}
                destinationControl={
                  (s.type === 'cta-banner' ||
                    s.type === 'image-banner' ||
                    (s.type === 'image-with-text' && !s.content.blocks)) && (
                    <WebsiteSectionDestination
                      categories={categories}
                      id={`${s.id}-destination`}
                      value={s.content.destination ?? '/about'}
                      products={products}
                      loadProducts={loadProducts}
                      onChange={(destination) =>
                        onChange(
                          sections.map((item) =>
                            item.id === s.id
                              ? withWebsiteSectionContent(s, { destination })
                              : item,
                          ),
                        )
                      }
                    />
                  )
                }
                onChange={(updated) =>
                  onChange(
                    sections.map((item) => (item.id === s.id ? updated : item)),
                  )
                }
              />
            ) : (
              renderNative(s as T)
            ),
            <>
              {canHide(s) && (
                <label
                  className="story-page-toggle"
                  htmlFor={s.id + '-visible'}
                >
                  <Checkbox
                    id={s.id + '-visible'}
                    role="switch"
                    className="sr-only"
                    aria-label={`Enable ${isRepeatable(s) ? websiteSectionHeading(s) || websiteSectionRegistry[s.type].label : nativeActionLabel(s as T)}`}
                    checked={s.visible}
                    onChange={(e) =>
                      onChange(
                        sections.map((item) =>
                          item.id === s.id
                            ? { ...item, visible: e.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  <span className="story-switch-track" aria-hidden="true" />
                  <span>{s.visible ? 'Enabled' : 'Disabled'}</span>
                </label>
              )}
              <div className="ui-actions">
                <IconButton
                  icon="arrow-up"
                  label={`Move up: ${isRepeatable(s) ? websiteSectionHeading(s) || websiteSectionRegistry[s.type].label : nativeActionLabel(s as T)}`}
                  size="compact"
                  disabled={index === 0}
                  onClick={() =>
                    onChange(moveWebsiteSection(sections, s.id, -1))
                  }
                ></IconButton>
                <IconButton
                  icon="arrow-down"
                  label={`Move down: ${isRepeatable(s) ? websiteSectionHeading(s) || websiteSectionRegistry[s.type].label : nativeActionLabel(s as T)}`}
                  size="compact"
                  disabled={index === sections.length - 1}
                  onClick={() =>
                    onChange(moveWebsiteSection(sections, s.id, 1))
                  }
                ></IconButton>
                {isRepeatable(s) && (
                  <>
                    <IconButton
                      icon="copy"
                      label={`Duplicate: ${websiteSectionHeading(s) || websiteSectionRegistry[s.type].label}`}
                      size="compact"
                      disabled={atLimit(s.type)}
                      onClick={() => {
                        const copy = {
                          ...structuredClone(s),
                          id: createWebsiteSection(
                            s.type,
                            s.type + '-' + crypto.randomUUID(),
                            target,
                          ).id,
                        };
                        const next = [...sections];
                        next.splice(index + 1, 0, copy);
                        onChange(next);
                        choose?.(
                          selectionId?.(copy, next) ?? `${prefix}:${copy.id}`,
                        );
                      }}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete section: ${websiteSectionHeading(s) || websiteSectionRegistry[s.type].label}`}
                      size="compact"
                      variant="destructive-outline"
                      onClick={() => setDeleting(s.id)}
                    />
                  </>
                )}
              </div>
            </>,
          );
        })}
      {allowAdd && availableSections.length > 0 && (
        <Button
          variant="secondary"
          disabled={busy || repeatableCount >= websiteSectionLimit}
          onClick={() => setSectionPicker(true)}
        >
          <UtilityIcon name="plus" /> {addLabel}
        </Button>
      )}
      <span className="sr-only" role="status">
        {announcement}
      </span>
      <Dialog
        open={sectionPicker && availableSections.length > 0}
        title="Add Section"
        onClose={() => setSectionPicker(false)}
        busy={busy}
      >
        <p>
          Build this page with photographs, stories and invitations. Choose a
          section to add it below the current list.
        </p>
        <SelectField
          id={`${prefix}-section-category`}
          label="Section category"
          value={activeCategory}
          onChange={(e) => setSectionCategory(e.target.value)}
        >
          <option value="all">All sections</option>
          {sectionCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectField>
        <div className="farmhouse-section-picker">
          {availableSections
            .filter(
              (d) => activeCategory === 'all' || d.category === activeCategory,
            )
            .map((definition) => (
              <Button
                key={definition.type}
                variant="secondary"
                className="farmhouse-section-option"
                disabled={busy || atLimit(definition.type)}
                onClick={() => {
                  if (busy || atLimit(definition.type)) return;
                  const section = definition.create(
                    `${definition.type}-${crypto.randomUUID()}`,
                    target,
                  );
                  onChange([...sections, section]);
                  choose?.(
                    selectionId?.(section, [...sections, section]) ??
                      `${prefix}:${section.id}`,
                  );
                  setSectionPicker(false);
                }}
              >
                <UtilityIcon name={definition.icon} />
                <span>
                  <strong>{definition.label}</strong>
                  <span>{definition.description}</span>
                </span>
              </Button>
            ))}
        </div>
        <p>
          {repeatableCount} of {websiteSectionLimit} additional sections used.
        </p>
      </Dialog>
      <Dialog
        open={!!deleting}
        title="Delete this section?"
        busy={busy}
        onClose={() => setDeleting(undefined)}
        actions={
          <Button
            variant="destructive-outline"
            disabled={busy}
            onClick={() => {
              onChange(
                sections.filter(
                  (section) =>
                    section.id !== deleting || !isRepeatable(section),
                ),
              );
              setDeleting(undefined);
              collapse?.();
            }}
          >
            Delete section
          </Button>
        }
      >
        <p>
          The section will be removed from this draft. Save and publish to
          update the live website.
        </p>
      </Dialog>
    </>
  );
}

export function WebsiteSectionDestination({
  categories,
  id,
  value,
  onChange,
  products,
  loadProducts,
  destinations,
  label = 'Link destination',
}: {
  destinations?: readonly (readonly [string, string])[];
  label?: string;
  categories: Array<{ id: string; name: string }>;
  id: string;
  value: string;
  onChange: (v: string) => void;
  products: Array<{ id: string; name: string; slug?: string }>;
  loadProducts: () => void;
}) {
  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      onFocus={loadProducts}
      onChange={(e) => onChange(e.target.value)}
    >
      {(
        destinations ?? [
          ['/', 'Homepage'],
          ['/products', 'Shop'],
          ['/about', 'Our story'],
          ['/find-us', 'Find us'],
          ['/contact', 'Contact'],
          ['/faq', 'FAQ'],
          ['/policies', 'Policies'],
        ]
      ).map(([path, label]) => (
        <option key={path} value={path}>
          {label}
        </option>
      ))}
      {products
        .filter((p) => p.slug)
        .map((p) => (
          <option key={p.id} value={'/products/' + encodeURIComponent(p.slug!)}>
            {p.name}
          </option>
        ))}
      {categories.map((category) => (
        <option
          key={'category-' + category.id}
          value={'/products?category=' + encodeURIComponent(category.id)}
        >
          {category.name} collection
        </option>
      ))}
      {value.includes('?category=') &&
        !categories.some(
          (c) => value === '/products?category=' + encodeURIComponent(c.id),
        ) && <option value={value}>Selected catalog category</option>}
    </SelectField>
  );
}
