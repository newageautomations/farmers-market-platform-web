import {
  AppError,
  type ProductCategoryNode,
  type ProductClassification,
  type ProductTag,
} from '@market/api';

export function categoryOptions(
  nodes: ProductCategoryNode[],
  path: string[] = [],
): { node: ProductCategoryNode; label: string; depth: number }[] {
  return nodes.flatMap((node) => {
    const names = [...path, node.name];
    return [
      { node, label: names.join(' → '), depth: path.length },
      ...categoryOptions(node.children, names),
    ];
  });
}

export function searchCategories(
  nodes: ProductCategoryNode[],
  search: string,
): ProductCategoryNode[] {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return nodes;
  return nodes.flatMap((node) => {
    if (node.name.toLocaleLowerCase().includes(term)) return [node];
    const children = searchCategories(node.children, term);
    return children.length ? [{ ...node, children }] : [];
  });
}

export function compatibleTags(
  selected: ProductTag[],
  applicable: ProductTag[],
) {
  const ids = new Set(applicable.map((tag) => tag.id));
  return selected.filter((tag) => ids.has(tag.id));
}

export function classificationInput(data: FormData) {
  if (data.has('classificationPending'))
    throw new AppError('validation', 'PRODUCT_CLASSIFICATION_PENDING');
  if (data.has('enabled') && !data.has('primaryCategoryValid'))
    throw new AppError('validation', 'PRODUCT_CATEGORY_REQUIRED');
  if (!data.has('classificationLoaded')) return {};
  const ids = data.getAll('primaryCategoryId');
  if (ids.length !== 1) throw new AppError('validation');
  return {
    primaryCategoryId: String(ids[0]) || null,
    tagIds: data.getAll('tagIds').map(String),
  };
}

export function catalogCategories(
  nodes: ProductCategoryNode[],
  classifications: Map<string, ProductClassification>,
) {
  return categoryOptions(nodes)
    .map((option) => ({
      ...option,
      id: option.node.id,
      name: option.label,
      productIds: [...classifications]
        .filter(([, value]) =>
          value.categoryPath.some((category) => category.id === option.node.id),
        )
        .map(([id]) => id),
    }))
    .filter((option) => option.productIds.length);
}
