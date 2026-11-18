/** Meadow's decorative illustration names, drawn in Art.astro. */
export const meadowArt = [
  'bee',
  'honey',
  'tomato',
  'carrot',
  'sunflower',
  'hen',
  'cow',
  'strawberry',
  'egg',
  'bread',
  'cheese',
  'milk',
  'basket',
  'sprig',
] as const;
export type MeadowArtName = (typeof meadowArt)[number];

/** Soft sticker backgrounds, cycled so neighbouring tiles differ. */
export const meadowTints = ['honey', 'mint', 'blush', 'sky'] as const;
export type MeadowTint = (typeof meadowTints)[number];
export function meadowTint(index: number): MeadowTint {
  return meadowTints[index % meadowTints.length]!;
}

const categoryArt: readonly [RegExp, MeadowArtName][] = [
  [/honey|bee|syrup|jam|preserve/i, 'honey'],
  [/egg/i, 'egg'],
  [/dairy|milk|cream|yogurt|butter/i, 'milk'],
  [/cheese/i, 'cheese'],
  [/bread|bak|pastr|grain|flour/i, 'bread'],
  [/berr|fruit|orchard/i, 'strawberry'],
  [/tomato|salsa|sauce|ferment|pickle/i, 'tomato'],
  [/flower|plant|herb|garden|bouquet/i, 'sunflower'],
  [/poultry|chicken/i, 'hen'],
  [/meat|beef|pork|lamb/i, 'cow'],
  [/veg|produce|root|green/i, 'carrot'],
];
const fallbackArt: readonly MeadowArtName[] = [
  'basket',
  'carrot',
  'strawberry',
  'honey',
  'tomato',
  'bread',
];
/** A category without its own photograph gets the closest matching drawing. */
export function meadowCategoryArt(name: string, index: number): MeadowArtName {
  return (
    categoryArt.find(([pattern]) => pattern.test(name))?.[1] ??
    fallbackArt[index % fallbackArt.length]!
  );
}
