import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { adminTheme, dashboardTheme, themeVariables } from '@market/theme';
import { useDashboardAppearance } from '../DashboardAppearance';
import {
  AppError,
  safeError,
  type ProductCategoryNode,
  type ProductClassification,
} from '@market/api';
import {
  Alert,
  CategoryIcon,
  Dialog,
  Field,
  Input,
  Radio,
  SearchableMultiSelect,
} from '@market/ui';
import { FarmstandButton as Button, FarmstandIcon } from '@market/ui/farmstand';
import { disclosureClassName } from '@market/ui/presentation';
import { ReadState, useRead } from './common';
import type { VendorService } from './service';
import {
  categoryOptions,
  compatibleTags,
  searchCategories,
} from './product-taxonomy';

const empty: ProductClassification = {
  primaryCategory: null,
  categoryPath: [],
  tags: [],
};

const tagGroupLabels: Record<string, string> = {
  growing_raising: 'Growing & Raising',
  growing_and_raising: 'Growing & Raising',
  dietary: 'Dietary',
  production: 'Production',
  attributes: 'Attributes',
};

/** Feature composition: the flat shared combobox cannot expand hierarchy branches. */
export function ProductClassificationFields({
  service,
  productId,
  readOnly = false,
}: {
  service: VendorService;
  productId?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const appearance = useDashboardAppearance();
  const read = useCallback(async () => {
    if (!service.taxonomy) throw new AppError('unavailable');
    const [nodes, classification] = await Promise.all([
      service.taxonomy.hierarchy(),
      productId
        ? service.taxonomy.classification(productId)
        : Promise.resolve(empty),
    ]);
    return { nodes, classification };
  }, [service, productId]);
  const query = useRead(
    `classification:${service.vendorId}:${productId ?? 'new'}`,
    read,
    true,
    { retainPreviousData: true },
  );
  const [value, setValue] = useState<ProductClassification | null>(null);
  const current = value ?? query.data?.classification ?? empty;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<ReturnType<
    typeof safeError
  > | null>(null);
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const categoryId = current.primaryCategory?.id ?? '';
  const readTags = useCallback(
    () =>
      categoryId && service.taxonomy
        ? service.taxonomy.tags(categoryId)
        : Promise.resolve([]),
    [service, categoryId],
  );
  const tags = useRead(`applicable-tags:${categoryId}`, readTags, !!query.data);
  const options = categoryOptions(query.data?.nodes ?? []);
  const valid = options.some(
    (option) =>
      option.node.id === categoryId &&
      option.node.assignable &&
      !option.node.children.length,
  );
  async function choose(nextId: string) {
    const request = ++sequence.current;
    setChanging(true);
    setChangeError(null);
    try {
      const applicable = nextId ? await service.taxonomy!.tags(nextId) : [];
      if (request !== sequence.current) return;
      const kept = compatibleTags(current.tags, applicable);
      const removed = current.tags.filter(
        (tag) => !kept.some((item) => item.id === tag.id),
      );
      const option = options.find((item) => item.node.id === nextId);
      const path: ProductCategoryNode[] = [];
      let node = option?.node;
      while (node) {
        path.unshift(node);
        node = options.find((item) => item.node.id === node?.parentId)?.node;
      }
      setValue({
        primaryCategory: option?.node ?? null,
        categoryPath: path,
        tags: kept,
      });
      setNotice(
        removed.length
          ? `Removed tags that do not apply to the new category: ${removed.map((tag) => tag.name).join(', ')}.`
          : '',
      );
      setOpen(false);
    } catch (error) {
      if (request === sequence.current) setChangeError(safeError(error));
    } finally {
      if (request === sequence.current) setChanging(false);
    }
  }
  function branches(nodes: ProductCategoryNode[], root = true) {
    return nodes.map((node) =>
      node.children.length ? (
        <details
          key={`${node.id}:${search}`}
          className={disclosureClassName('product-category-card')}
          open={
            search.trim() ||
            current.categoryPath.some((category) => category.id === node.id)
              ? true
              : undefined
          }
        >
          <summary>
            {root && <CategoryIcon code={node.code} />}
            <span>{node.name}</span>
          </summary>
          <div className="ui-disclosure-content stack">
            {branches(node.children, false)}
          </div>
        </details>
      ) : (
        <label key={node.id} className="product-category-radio">
          <Radio
            name={`${id}-category-choice`}
            value={node.id}
            checked={categoryId === node.id}
            disabled={!node.assignable || changing}
            onChange={() => void choose(node.id)}
          />
          {node.name}
        </label>
      ),
    );
  }
  return (
    <div className="stack">
      <ReadState {...query} retry={query.refresh} />
      {!readOnly && (
        <>
          {query.data && (
            <>
              <input type="hidden" name="classificationLoaded" value="true" />
              <input
                type="hidden"
                name="primaryCategoryId"
                value={categoryId}
              />
              {current.tags.map((tag) => (
                <input
                  key={tag.id}
                  type="hidden"
                  name="tagIds"
                  value={tag.id}
                />
              ))}
            </>
          )}
          {valid && (
            <input type="hidden" name="primaryCategoryValid" value="true" />
          )}
          {changing && (
            <input type="hidden" name="classificationPending" value="true" />
          )}
        </>
      )}
      <Field id={`${id}-category`} label="Primary category">
        <p>
          {query.data
            ? current.categoryPath.map((node) => node.name).join(' → ') ||
              'Uncategorized'
            : 'Classification unavailable'}
        </p>
        {!readOnly && (
          <Button
            id={`${id}-category`}
            aria-label="Choose category"
            type="button"
            variant="secondary"
            className="product-category-choice"
            disabled={!query.data || changing}
            onClick={() => setOpen(true)}
          >
            <FarmstandIcon name="plus-category" />
            {current.primaryCategory?.name ?? 'Choose category'}
            <FarmstandIcon name="chevron-right" />
          </Button>
        )}
      </Field>
      {!readOnly && (
        <p>
          Choose one leaf category before enabling a product. Drafts may be
          uncategorized.
        </p>
      )}
      {readOnly ? (
        <p>Tags: {current.tags.map((tag) => tag.name).join(', ') || 'None'}</p>
      ) : (
        <>
          <h3 className="product-tags-title">Product Tags</h3>
          {!productId && !valid && (
            <p>Cannot select tags until a category is chosen</p>
          )}
          <ReadState {...tags} retry={tags.refresh} />
          {[...new Set((tags.data ?? []).map((tag) => tag.group))].map(
            (group) => (
              <SearchableMultiSelect
                key={`${categoryId}:${group}`}
                label={
                  tagGroupLabels[
                    group.toLowerCase().replace(/[\s&-]+/g, '_')
                  ] ?? group.replaceAll('_', ' ')
                }
                options={(tags.data ?? [])
                  .filter((tag) => tag.group === group)
                  .map((tag) => ({ value: tag.id, label: tag.name }))}
                value={current.tags
                  .filter((tag) =>
                    (tags.data ?? []).some(
                      (item) => item.id === tag.id && item.group === group,
                    ),
                  )
                  .map((tag) => tag.id)}
                disabled={!valid || changing || tags.loading || !!tags.error}
                allowClear={false}
                onChange={(ids) =>
                  setValue({
                    ...current,
                    tags: [
                      ...current.tags.filter(
                        (tag) =>
                          !(tags.data ?? []).some(
                            (item) =>
                              item.id === tag.id && item.group === group,
                          ),
                      ),
                      ...(tags.data ?? []).filter((tag) =>
                        ids.includes(tag.id),
                      ),
                    ],
                  })
                }
              />
            ),
          )}
          <p>
            Selected tags:{' '}
            {current.tags.map((tag) => tag.name).join(', ') || 'None'}. Claims,
            including Certified Organic, are seller declared.
          </p>
        </>
      )}
      {notice && <Alert severity="info">{notice}</Alert>}
      {changeError && (
        <Alert severity="error">
          {changeError.message} Your category and tags have been preserved. Try
          selecting the category again.
        </Alert>
      )}
      {createPortal(
        <div
          style={
            themeVariables(
              dashboardTheme(
                adminTheme(service.context.branding),
                appearance.palette,
              ),
            ) as CSSProperties
          }
        >
          <Dialog
            open={open}
            title="Choose primary category"
            className="product-category-dialog"
            onClose={() => {
              if (!changing) setOpen(false);
            }}
            busy={changing}
          >
            <div className="stack">
              <Field id={`${id}-search`} label="Search categories">
                <Input
                  id={`${id}-search`}
                  maxLength={200}
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
              </Field>
              <fieldset disabled={changing}>
                <legend>Standard categories</legend>
                <div className="product-category-grid">
                  {branches(searchCategories(query.data?.nodes ?? [], search))}
                </div>
              </fieldset>
              {!searchCategories(query.data?.nodes ?? [], search).length && (
                <p>No matching categories.</p>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={changing}
                className="product-category-clear"
                onClick={() => void choose('')}
              >
                Clear category
              </Button>
              {changing && <p role="status">Checking applicable tags</p>}
              {changeError && (
                <Alert severity="error">
                  {changeError.message} Selection preserved. Try again.
                </Alert>
              )}
            </div>
          </Dialog>
        </div>,
        document.body,
      )}
    </div>
  );
}
