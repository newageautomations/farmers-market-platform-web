import ImageBanner from '../home/ImageBanner.astro';
import ImageGallery from '../home/ImageGallery.astro';
import FeatureGrid from '../home/FeatureGrid.astro';
import ProductShowcase from '../home/ProductShowcase.astro';
import CategoryShowcase from '../home/CategoryShowcase.astro';
import Text from './Text.astro';
import ImageWithText from './ImageWithText.astro';
import CtaBanner from './CtaBanner.astro';
import type { websiteSectionManifest } from '@market/theme/storefront';

/** Static, developer-owned adapters. No user-supplied components or dynamic imports. */
export const websiteSectionRenderers = {
  'farmhouse-image-banner': ImageBanner,
  'farmhouse-image-gallery': ImageGallery,
  'farmhouse-feature-grid': FeatureGrid,
  'farmhouse-product-showcase': ProductShowcase,
  'farmhouse-category-showcase': CategoryShowcase,

  'farmhouse-text': Text,
  'farmhouse-image-with-text': ImageWithText,
  'farmhouse-cta-banner': CtaBanner,
} satisfies Record<
  (typeof websiteSectionManifest)[keyof typeof websiteSectionManifest]['renderers']['modern-farmhouse'],
  typeof Text
>;
