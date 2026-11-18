import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { uploadDocumentFile } from './document-upload';
import type { CategoryImage } from './vendor-categories';

/** The current Market's or Vendor's own profile picture (never storefront content). */
export interface BusinessProfileImage {
  assetId: string;
  url: string;
}
/** Profile picture URLs of active businesses, keyed by Market or Vendor id. */
export interface BusinessProfileImages {
  markets: Record<string, string>;
  vendors: Record<string, string>;
}

export function createBusinessProfileImageApi(
  options: TransportOptions & { channelToken: string },
) {
  const run = transport('admin', options);
  const own = parse(
    'query OwnBusinessProfileImage { ownBusinessProfileImage }',
  ) as TypedDocumentNode<
    { ownBusinessProfileImage: BusinessProfileImage | null },
    Record<string, never>
  >;
  const library = parse(
    'query OwnBusinessProfileImageLibrary($skip: Int) { ownBusinessProfileImageLibrary(skip: $skip) }',
  ) as TypedDocumentNode<
    { ownBusinessProfileImageLibrary: CategoryImage[] },
    { skip?: number }
  >;
  const set = parse(
    'mutation SetOwnBusinessProfileImage($assetId: ID) { setOwnBusinessProfileImage(assetId: $assetId) }',
  ) as TypedDocumentNode<
    { setOwnBusinessProfileImage: BusinessProfileImage | null },
    { assetId: string | null }
  >;
  const lookup = parse(
    'query BusinessProfileImages($marketIds: [ID!], $vendorIds: [ID!]) { businessProfileImages(marketIds: $marketIds, vendorIds: $vendorIds) }',
  ) as TypedDocumentNode<
    { businessProfileImages: BusinessProfileImages },
    { marketIds?: string[]; vendorIds?: string[] }
  >;
  return {
    own: () =>
      run({ api: 'admin', document: own }, {}).then(
        (r) => r.ownBusinessProfileImage,
      ),
    /** The image library dialog's "My Images": this business channel's own images. */
    images: (skip = 0) =>
      run({ api: 'admin', document: library }, { skip }).then(
        (r) => r.ownBusinessProfileImageLibrary,
      ),
    upload: (file: File) =>
      uploadDocumentFile(
        options,
        parse(
          'mutation UploadOwnBusinessProfileImage($input: JSON!, $file: Upload!) { uploadOwnBusinessProfileImage(input: $input, file: $file) }',
        ),
        'uploadOwnBusinessProfileImage',
        file,
        {},
      ) as Promise<CategoryImage>,
    set: (assetId: string | null) =>
      run({ api: 'admin', document: set }, { assetId }).then(
        (r) => r.setOwnBusinessProfileImage,
      ),
    lookup: (ids: { marketIds?: string[]; vendorIds?: string[] }) =>
      run({ api: 'admin', document: lookup }, ids).then(
        (r) => r.businessProfileImages,
      ),
  };
}
export type BusinessProfileImageApi = ReturnType<
  typeof createBusinessProfileImageApi
>;
