import { useEffect, useState } from 'react';
import {
  safeError,
  type ProductCategoryNode,
  type StorefrontAppearanceApi,
} from '@market/api';
import {
  Button,
  Checkbox,
  ErrorState,
  Field,
  SelectField,
  Spinner,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type { StorefrontAppearance } from '@market/theme/storefront';
import { CategoryImageField } from './vendor/categories';

type Settings = NonNullable<StorefrontAppearance['categoryPresentation']>;
/** Feature composition: the image picker cannot edit canonical sibling order or navigation visibility. */
export function StorefrontCategoriesEditor({
  api,
  value = {},
  onChange,
  themeId,
  busy = false,
}: {
  api: StorefrontAppearanceApi;
  value?: Settings;
  onChange: (value: Settings) => void;
  themeId: string;
  busy?: boolean;
}) {
  const [nodes, setNodes] = useState<ProductCategoryNode[]>();
  const [error, setError] = useState<ReturnType<typeof safeError>>();
  const [selected, setSelected] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (api.hierarchy)
      void api
        .hierarchy()
        .then((rows) => {
          if (active) {
            setNodes(rows);
            setError(undefined);
          }
        })
        .catch((e) => {
          if (active) setError(safeError(e));
        });
    return () => {
      active = false;
    };
  }, [api, retry]);
  if (!api.hierarchy) return null;
  const flatten = (
    rows: ProductCategoryNode[],
    prefix: string[] = [],
  ): Array<ProductCategoryNode & { path: string }> =>
    rows
      .filter((n) => n.active)
      .flatMap((n) => [
        { ...n, path: [...prefix, n.name].join(' / ') },
        ...flatten(n.children, [...prefix, n.name]),
      ]);
  const all = flatten(nodes ?? []);
  const category = all.find((n) => n.id === selected) ?? all[0];
  const settings = category
    ? (value[category.id] ?? {
        position: all
          .filter((n) => n.parentId === category.parentId)
          .findIndex((n) => n.id === category.id),
        visible: true,
        imageAssetId: null,
        image: '',
      })
    : undefined;
  const siblings = all
    .filter((n) => n.parentId === category?.parentId)
    .sort(
      (a, b) =>
        (value[a.id]?.position ??
          all.filter((n) => n.parentId === a.parentId).indexOf(a)) -
          (value[b.id]?.position ??
            all.filter((n) => n.parentId === b.parentId).indexOf(b)) ||
        all.indexOf(a) - all.indexOf(b),
    );
  const index = siblings.findIndex((n) => n.id === category?.id);
  const patch = (next: Partial<Settings[string]>) => {
    if (category && settings)
      onChange({ ...value, [category.id]: { ...settings, ...next } });
  };
  const move = (delta: number) => {
    const ordered = [...siblings];
    [ordered[index], ordered[index + delta]] = [
      ordered[index + delta]!,
      ordered[index]!,
    ];
    const next = { ...value };
    ordered.forEach((n, position) => {
      next[n.id] = {
        visible: true,
        imageAssetId: null,
        image: '',
        ...value[n.id],
        position,
      };
    });
    onChange(next);
  };
  return (
    <details className={disclosureClassName('dropdown')}>
      <summary>Category presentation</summary>
      <div className="ui-disclosure-content">
        <p>
          Order, visibility and images apply to this website. Hidden and empty
          categories stay available here. Hiding navigation never unpublishes
          products.
        </p>
        {error && (
          <>
            <ErrorState error={error} />
            <Button
              variant="secondary"
              onClick={() => {
                setNodes(undefined);
                setError(undefined);
                setRetry((n) => n + 1);
              }}
            >
              Retry categories
            </Button>
          </>
        )}
        {!nodes && !error && <Spinner />}
        {category && settings && (
          <fieldset disabled={busy}>
            <SelectField
              id="storefront-category-presentation"
              label="Category"
              value={category.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {all.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.path}
                  {value[n.id]?.visible === false ? ' (hidden)' : ''}
                </option>
              ))}
            </SelectField>
            <Field id="storefront-category-visible" label="Show in navigation">
              <Checkbox
                id="storefront-category-visible"
                checked={settings.visible}
                onChange={(e) => patch({ visible: e.target.checked })}
              />
            </Field>
            {category.parentId &&
              value[category.parentId]?.visible === false && (
                <p role="status">
                  The parent is hidden. Restore it to show this category.
                </p>
              )}
            <div className="ui-control-row">
              <Button
                variant="secondary"
                disabled={index <= 0}
                onClick={() => move(-1)}
              >
                Move earlier
              </Button>
              <Button
                variant="secondary"
                disabled={index >= siblings.length - 1}
                onClick={() => move(1)}
              >
                Move later
              </Button>
              <Button
                variant="tertiary"
                onClick={() => {
                  const next = { ...value };
                  all
                    .filter((n) => n.parentId === category.parentId)
                    .forEach((n, position) => {
                      if (next[n.id]) next[n.id] = { ...next[n.id]!, position };
                    });
                  onChange(next);
                }}
              >
                Reset sibling order
              </Button>
            </div>
            <p>{siblings.map((n) => n.name).join(' / ')}</p>
            {api.media && (
              <CategoryImageField
                key={category.id}
                api={api.media}
                themeId={themeId}
                value={settings.imageAssetId}
                preview={settings.image}
                presentation="library"
                label={`${category.name} image`}
                onImageChange={(image) =>
                  patch({
                    imageAssetId: image?.id ?? null,
                    image: image?.preview ?? '',
                  })
                }
              />
            )}
          </fieldset>
        )}
      </div>
    </details>
  );
}
