import ImageBanner from '../home/ImageBanner.astro';
import ImageGallery from '../home/ImageGallery.astro';
import FeatureGrid from '../home/FeatureGrid.astro';
import ProductShowcase from '../home/ProductShowcase.astro';
import CategoryShowcase from '../home/CategoryShowcase.astro';
import Text from './Text.astro';
import ImageWithText from './ImageWithText.astro';
import CtaBanner from './CtaBanner.astro';
/** Static, theme-owned adapters selected by the shared manifest. */
export const websiteSectionRenderers = {
  'editorial-image-banner': ImageBanner,
  'editorial-image-gallery': ImageGallery,
  'editorial-feature-grid': FeatureGrid,
  'editorial-product-showcase': ProductShowcase,
  'editorial-category-showcase': CategoryShowcase,

  'editorial-text': Text,
  'editorial-image-with-text': ImageWithText,
  'editorial-cta-banner': CtaBanner,
} as const;
