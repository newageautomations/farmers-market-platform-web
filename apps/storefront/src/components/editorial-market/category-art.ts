import { categoryIconDataUrl } from '@market/ui/category-icons';

/** Explicit editor selections take precedence; default art uses permanent category identity. */
export function categoryArt(code: string | undefined, selected?: string) {
  return selected || (code ? categoryIconDataUrl(code) : undefined);
}
