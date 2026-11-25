import { AsyncLocalStorage } from 'node:async_hooks';
import type { StorefrontContext } from './index';

// The hosted launcher resolves before Astro's static handler. SSR consumes the
// same request-local registry result, with no process-wide tenant cache.
export const hostedStorefrontRequest =
  new AsyncLocalStorage<StorefrontContext>();
