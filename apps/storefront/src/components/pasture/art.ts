/** Pasture's decorative illustration names, drawn in Art.astro. */
export const pastureArt = [
  'sprig',
  'leaf',
  'flower',
  'tree',
  'pine',
  'cloud',
  'sprout',
  'tomato',
  'carrot',
  'lettuce',
  'apple',
  'pepper',
  'egg',
  'jar',
  'loaf',
  'basket',
] as const;
export type PastureArtName = (typeof pastureArt)[number];

const categoryArt: readonly [RegExp, PastureArtName][] = [
  [/tomato/i, 'tomato'],
  [/veg|produce|salad|green|lettuce/i, 'lettuce'],
  [/carrot|root|potato|onion|garlic/i, 'carrot'],
  [/pepper|chil|spice|hot/i, 'pepper'],
  [/fruit|berr|apple|peach|orchard|citrus|melon/i, 'apple'],
  [/egg|dairy|milk|cheese|cream|yogurt|meat|beef|pork|poultry|chicken/i, 'egg'],
  [/bread|bak|pastr|cake|pie|cookie|dessert|sweet/i, 'loaf'],
  [/jam|jelly|preserve|honey|syrup|sauce|pickle|ferment|pantry|spread/i, 'jar'],
  [/plant|flower|herb|seed|garden|nursery|sprout|microgreen/i, 'sprout'],
];
const fallbackArt: readonly PastureArtName[] = [
  'basket',
  'tomato',
  'lettuce',
  'carrot',
  'apple',
  'jar',
];
/**
 * A category without its own photograph gets the closest matching drawing,
 * or the next drawing of a fixed set.
 */
export function pastureCategoryArt(
  name: string,
  index: number,
): PastureArtName {
  return (
    categoryArt.find(([pattern]) => pattern.test(name))?.[1] ??
    fallbackArt[index % fallbackArt.length]!
  );
}
