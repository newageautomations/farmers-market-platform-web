import ImageBanner from './ImageBanner.astro';
import ImageGallery from './ImageGallery.astro';
import FeatureGrid from './FeatureGrid.astro';
import ProductShowcase from './ProductShowcase.astro';
import CategoryShowcase from './CategoryShowcase.astro';
import Text from './Text.astro';
import ImageWithText from './ImageWithText.astro';
import CtaBanner from './CtaBanner.astro';
import type { websiteSectionManifest } from '@market/theme/storefront';

/** Harvest visual adapters, selected by the canonical registry. */
export const websiteSectionRenderers = {
  'harvest-image-banner': ImageBanner,
  'harvest-image-gallery': ImageGallery,
  'harvest-feature-grid': FeatureGrid,
  'harvest-product-showcase': ProductShowcase,
  'harvest-category-showcase': CategoryShowcase,
  'harvest-text': Text,
  'harvest-image-with-text': ImageWithText,
  'harvest-cta-banner': CtaBanner,
} satisfies Record<
  (typeof websiteSectionManifest)[keyof typeof websiteSectionManifest]['renderers']['harvest'],
  typeof Text
>;
