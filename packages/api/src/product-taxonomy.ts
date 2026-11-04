import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';

export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  active: boolean;
  parentId: string | null;
}
export interface ProductCategoryNode extends ProductCategory {
  assignable: boolean;
  children: ProductCategoryNode[];
}
export interface ProductTag {
  id: string;
  name: string;
  group: string;
  claimStatus: 'SELLER_DECLARED';
}
export interface ProductClassification {
  primaryCategory: ProductCategory | null;
  categoryPath: ProductCategory[];
  tags: ProductTag[];
}

export function createProductTaxonomyApi(
  options: TransportOptions & { channelToken: string },
) {
  const run = transport('admin', options);
  const hierarchy = parse(
    'query ProductCategoryHierarchy { productCategoryHierarchy }',
  ) as TypedDocumentNode<
    { productCategoryHierarchy: ProductCategoryNode[] },
    Record<string, never>
  >;
  const tags = parse(
    'query ApplicableProductTags($categoryId: ID!) { applicableProductTags(categoryId: $categoryId) }',
  ) as TypedDocumentNode<
    { applicableProductTags: ProductTag[] },
    { categoryId: string }
  >;
  const classification = parse(
    'query OwnProductClassification($productId: ID!) { ownProductClassification(productId: $productId) }',
  ) as TypedDocumentNode<
    { ownProductClassification: ProductClassification },
    { productId: string }
  >;
  return {
    hierarchy: () =>
      run({ api: 'admin', document: hierarchy }, {}).then(
        (r) => r.productCategoryHierarchy,
      ),
    tags: (categoryId: string) =>
      run({ api: 'admin', document: tags }, { categoryId }).then(
        (r) => r.applicableProductTags,
      ),
    classification: (productId: string) =>
      run({ api: 'admin', document: classification }, { productId }).then(
        (r) => r.ownProductClassification,
      ),
  };
}
export type ProductTaxonomyApi = ReturnType<typeof createProductTaxonomyApi>;
