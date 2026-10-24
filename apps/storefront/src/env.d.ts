/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    editorPreview?: {
      config: import('@market/theme/storefront').StorefrontAppearance;
      path: string;
      scroll: number;
      id: string;
    };
    storefront?: import('@market/storefront-core').StorefrontContext;
    storefrontError?: import('@market/api').AppError;
    shopApiUrl?: string;
  }
}
