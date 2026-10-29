const illustrations: Array<[RegExp, string]> = [
  [/honey|preserve|jam/i, 'Golden Honey Jar Illustration'],
  [/cheese/i, 'Golden Swiss Cheese Wedge and Cubes'],
  [/juice/i, 'Luminous Orange Juice Still Life'],
  [/leaf|greens|salad/i, 'Painterly Bunch of Leafy Greens'],
  [/vegetable|produce|carrot/i, 'Painterly Carrot with Lush Greens'],
  [/milk|dairy/i, 'Painterly Glass Milk Bottle'],
  [/matcha|tea/i, 'Painterly Matcha in a Ceramic Chawan'],
  [/peach|fruit/i, 'Painterly Peach with Leaf'],
  [/ramen|meal|prepared/i, 'Painterly Ramen Bowl with Chopsticks'],
  [/apple/i, 'Painterly Red Apple with Leaf'],
  [/tomato/i, 'Painterly Ripe Tomato Icon'],
  [/coffee|beverage|drink/i, 'Steaming Coffee Mug with Roasted Beans'],
  [/shirt|apparel|clothing/i, 'Cream White T-Shirt on Black'],
  [/kimchi|ferment|pickle/i, 'Glossy Kimchi Mason Jar'],
  [/soap|body|bath/i, 'Glossy Pink Soap with Suds'],
  [/cookie/i, 'Painterly Chocolate Chip Cookie'],
  [/macaron|sweet|dessert/i, 'Painterly Pink Macaron Cutout'],
  [/meat|steak|beef|protein/i, 'Painterly Raw Ribeye Steak Cut'],
  [/bread|bakery|baked/i, 'Rustic Golden Loaf with Sliced Bread'],
  [/egg/i, 'Warm Painterly Egg Carton Still Life'],
];

/** Explicit editor selections always take precedence over category defaults. */
export function categoryArt(name: string, selected?: string) {
  if (selected) return selected;
  const file = illustrations.find(([pattern]) => pattern.test(name))?.[1];
  return file
    ? `/assets/editorial-market/categories/${encodeURIComponent(file)}.png`
    : undefined;
}
