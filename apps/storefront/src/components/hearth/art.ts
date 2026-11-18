/** Hearth's decorative illustration names, drawn in Art.astro. */
export const hearthArt = [
  'loaf',
  'sourdough',
  'croissant',
  'jam',
  'coffee',
  'wheat',
  'pie',
  'cookie',
  'basket',
  'cheese',
  'crate',
  'pin',
  'stamp',
] as const;
export type HearthArtName = (typeof hearthArt)[number];

const categoryArt: readonly [RegExp, HearthArtName][] = [
  [/coffee|tea|drink|beverage|cocoa|roast/i, 'coffee'],
  [/jam|jelly|preserve|honey|syrup|spread|butter|sauce|pickle|ferment/i, 'jam'],
  [/pie|cake|tart|dessert/i, 'pie'],
  [/cookie|snack|granola|candy|chocolate|treat/i, 'cookie'],
  [/pastr|croissant|sweet|donut|muffin|scone/i, 'croissant'],
  [/bread|bak|sourdough|loaf|bagel/i, 'loaf'],
  [/grain|flour|pasta|cereal|rice|oat/i, 'wheat'],
  [/cheese|dairy|milk|cream|yogurt|egg/i, 'cheese'],
  [/veg|produce|fruit|berr|meat|beef|pork|poultry|plant|flower|herb/i, 'crate'],
];
const fallbackArt: readonly HearthArtName[] = [
  'basket',
  'crate',
  'jam',
  'loaf',
  'coffee',
  'wheat',
];
/**
 * A category without its own photograph gets the closest matching drawing.
 * Markets also sell produce, meat and plants, which share the crate.
 */
export function hearthCategoryArt(name: string, index: number): HearthArtName {
  return (
    categoryArt.find(([pattern]) => pattern.test(name))?.[1] ??
    fallbackArt[index % fallbackArt.length]!
  );
}
