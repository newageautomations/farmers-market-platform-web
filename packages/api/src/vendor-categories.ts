import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { uploadDocumentFile } from './document-upload';
export interface VendorCategory {
  id: string;
  name: string;
  imageAssetId: string | null;
  image: string | null;
  productIds: string[];
  productCount: number;
}
export interface CategoryImage {
  id: string;
  name: string;
  preview: string;
  source?: string;
  placement?: string;
}
export interface CategoryInput {
  id?: string;
  name: string;
  imageAssetId?: string | null;
  productIds?: string[];
}
export function createVendorCategoryApi(
  options: TransportOptions & { channelToken: string },
) {
  const run = transport('admin', options);
  const list = parse(
    'query OwnVendorCategories { ownVendorCategories }',
  ) as TypedDocumentNode<
    { ownVendorCategories: VendorCategory[] },
    Record<string, never>
  >;
  const images = parse(
    'query OwnVendorCategoryAssets($skip: Int) { ownVendorCategoryAssets(skip: $skip) }',
  ) as TypedDocumentNode<
    { ownVendorCategoryAssets: CategoryImage[] },
    { skip?: number }
  >;
  const save = parse(
    'mutation SaveOwnVendorCategory($input: JSON!) { saveOwnVendorCategory(input: $input) }',
  ) as TypedDocumentNode<
    { saveOwnVendorCategory: VendorCategory },
    { input: CategoryInput }
  >;
  const remove = parse(
    'mutation DeleteOwnVendorCategory($id: ID!) { deleteOwnVendorCategory(id: $id) }',
  ) as TypedDocumentNode<{ deleteOwnVendorCategory: boolean }, { id: string }>;
  return {
    list: () =>
      run({ api: 'admin', document: list }, {}).then(
        (r) => r.ownVendorCategories,
      ),
    images: (skip = 0) =>
      run({ api: 'admin', document: images }, { skip }).then(
        (r) => r.ownVendorCategoryAssets,
      ),
    save: (input: CategoryInput) =>
      run({ api: 'admin', document: save }, { input }).then(
        (r) => r.saveOwnVendorCategory,
      ),
    remove: (id: string) =>
      run({ api: 'admin', document: remove }, { id }).then(
        (r) => r.deleteOwnVendorCategory,
      ),
    upload: (file: File) =>
      uploadDocumentFile(
        options,
        parse(
          'mutation UploadOwnVendorCategoryImage($input: JSON!, $file: Upload!) { uploadOwnVendorCategoryImage(input: $input, file: $file) }',
        ),
        'uploadOwnVendorCategoryImage',
        file,
        {},
      ) as Promise<CategoryImage>,
  };
}
export type VendorCategoryApi = ReturnType<typeof createVendorCategoryApi>;
