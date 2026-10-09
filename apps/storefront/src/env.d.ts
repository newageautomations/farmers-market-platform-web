/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    storefront?: import('@market/storefront-core').StorefrontContext;
    storefrontError?: import('@market/api').AppError;
    shopApiUrl?: string;
  }
}
