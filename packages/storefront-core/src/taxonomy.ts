import { AppError } from '@market/api';
import type {
  StorefrontCategory,
  StorefrontTaxonomy,
  StorefrontClassification,
} from '@market/api';

export type CategoryPresentation = Record<
  string,
  {
    position: number;
    visible: boolean;
    imageAssetId: string | null;
    image: string;
  }
>;

/** Sort siblings only. Unknown/new categories follow the explicit sibling order canonically. */
export function presentedCategories(
  categories: readonly StorefrontCategory[],
  settings: CategoryPresentation = {},
  includeHidden = false,
) {
  const visit = (parentId: string | null): StorefrontCategory[] =>
    categories
      .filter(
        (c) =>
          c.parentId === parentId &&
          (includeHidden || (c.count > 0 && settings[c.id]?.visible !== false)),
      )
      .sort(
        (a, b) =>
          (settings[a.id]?.position ?? a.position) -
            (settings[b.id]?.position ?? b.position) ||
          a.position - b.position ||
          a.code.localeCompare(b.code),
      )
      .flatMap((c) => [c, ...visit(c.id)]);
  return visit(null);
}

export function taxonomyFilters(search: URLSearchParams) {
  const ids = (name: string) => {
    const values = [...new Set(search.getAll(name))];
    if (
      values.length > 20 ||
      values.some(
        (id) => !/^[1-9][0-9]{0,9}$/.test(id) || Number(id) > 2147483647,
      )
    )
      throw new AppError('validation', 'INVALID_TAXONOMY_FILTER');
    return values;
  };
  return { categoryIds: ids('category'), tagIds: ids('tag') };
}

export function taxonomyNavigation(
  taxonomy: StorefrontTaxonomy,
  settings?: CategoryPresentation,
) {
  return presentedCategories(taxonomy.categories, settings).map((c) => ({
    ...c,
    name: `${c.pathNames.join(' / ')} (${c.count})`,
    image: settings?.[c.id]?.image ?? '',
  }));
}

/** Restrict a full catalog projection using the existing bounded preorder-availability read, never a result page. */
export function availableTaxonomy(
  taxonomy: StorefrontTaxonomy,
  products: readonly StorefrontClassification[],
  available: Set<string>,
): StorefrontTaxonomy {
  const eligible = products.filter((p) => available.has(p.productId));
  return {
    categories: taxonomy.categories.map((category) => ({
      ...category,
      count: new Set(
        eligible
          .filter((p) => p.categoryIds.map(String).includes(category.id))
          .map((p) => p.productId),
      ).size,
    })),
    tags: taxonomy.tags
      .map((tag) => ({
        ...tag,
        count: new Set(
          eligible
            .filter((p) => p.tagIds.map(String).includes(tag.id))
            .map((p) => p.productId),
        ).size,
      }))
      .filter((tag) => tag.count > 0),
  };
}
