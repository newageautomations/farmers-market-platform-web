import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';

export interface StorefrontCategory {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  position: number;
  pathIds: string[];
  pathCodes: string[];
  pathNames: string[];
  count: number;
}
export interface StorefrontTag {
  id: string;
  code: string;
  name: string;
  group: string;
  claimStatus: 'SELLER_DECLARED';
  count: number;
}
export interface StorefrontTaxonomy {
  categories: StorefrontCategory[];
  tags: StorefrontTag[];
}
export interface StorefrontClassification {
  productId: string;
  primaryCategoryId: string | null;
  variantIds: number[];
  categoryIds: number[];
  tagIds: number[];
}
export interface VendorStorefrontTaxonomy {
  taxonomy: StorefrontTaxonomy;
  totalProducts: number;
  products: StorefrontClassification[];
}
export function createStorefrontTaxonomyApi(options: TransportOptions) {
  const execute = transport('shop', options);
  const document = parse(
    'query VendorStorefrontTaxonomy($categoryIds: [ID!], $tagIds: [ID!]) { vendorStorefrontTaxonomy(categoryIds: $categoryIds, tagIds: $tagIds) }',
  ) as TypedDocumentNode<
    { vendorStorefrontTaxonomy: VendorStorefrontTaxonomy },
    { categoryIds?: string[]; tagIds?: string[] }
  >;
  return async (filters: { categoryIds?: string[]; tagIds?: string[] } = {}) =>
    (await execute({ api: 'shop', document }, filters))
      .vendorStorefrontTaxonomy;
}
