/** Developer-supplied SVG geometry plus matching original drawings for missing entries.
 * Permanent taxonomy codes are the identity; the review labels never drive lookup.
 * Supplied Lucide/Tabler paths, circles, rectangles and fills are retained as separate shapes.
 */
export type CategoryIconShape = {
  tag: 'path' | 'circle' | 'rect' | 'ellipse';
  attrs: {
    d?: string;
    cx?: string;
    cy?: string;
    r?: string;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
    rx?: string;
    ry?: string;
    fill?: string;
  };
};

export const categoryIconViewBox = '0 0 24 24';

function path(d: string): CategoryIconShape {
  return { tag: 'path', attrs: { d } };
}

export const categoryIconArtwork = {
  produce: [
    path('M10 15h4'),
    path(
      'M19.424 11.095a2.5 2.5 0 00.471-2.309 2 2 0 00.424-3.286 2 2 0 00-2.143-3.322 2 2 0 00-.676.502 2 2 0 00-3.287.424 2.5 2.5 0 00-3.189 2.06A3 3 0 0012 11l4-4',
    ),
    path(
      'M4 12.006A1 1 0 014.994 11H19a1 1 0 011 1v7a2 2 0 01-2 2H6a2 2 0 01-2-2z',
    ),
    path('M7 11a4 4 0 01-4-4V5a1 1 0 011-1h2a4 4 0 013.584 2.222'),
  ],
  'produce.vegetables': [
    path(
      'M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3',
    ),
    path('M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7'),
    path('m8 15-2.58-2.58'),
  ],
  'produce.fruits': [
    path(
      'M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z',
    ),
    path('M19.65 15.66A8 8 0 0 1 8.35 4.34'),
    path('m14 10-5.5 5.5'),
    path('M14 17.85V10H6.15'),
  ],
  'produce.herbs': [
    path(
      'M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20',
    ),
    path('M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13'),
  ],
  'produce.mushrooms': [
    path(
      'M20 11.1c0 -4.474 -3.582 -8.1 -8 -8.1s-8 3.626 -8 8.1a.9 .9 0 0 0 .9 .9h14.2a.9 .9 0 0 0 .9 -.9',
    ),
    path('M10 12v7a2 2 0 1 0 4 0v-7'),
  ],
  'produce.microgreens-sprouts': [
    path(
      'M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3',
    ),
    path('M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4'),
    path('M5 21h14'),
  ],
  'meat-poultry': [
    path('M3 3h13a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2z'),
    path('M13 14v6a2 2 0 0 0 4 0v-6M7 7h.01'),
  ],
  'meat-poultry.beef': [
    path(
      'M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3',
    ),
    path(
      'm18.5 6 1.754 3.5a6.48 6.48 0 0 1-1.854 8.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5',
    ),
    { tag: 'circle', attrs: { cx: '12.5', cy: '8.5', r: '2.5' } },
  ],
  'meat-poultry.pork': [
    path('M13.144 21.144A7.274 10.445 45 1 0 2.856 10.856'),
    path(
      'M13.144 21.144A7.274 4.365 45 0 0 2.856 10.856a7.274 4.365 45 0 0 10.288 10.288',
    ),
    path(
      'M16.565 10.435 18.6 8.4a2.501 2.501 0 1 0 1.65-4.65 2.5 2.5 0 1 0-4.66 1.66l-2.024 2.025',
    ),
    path('m8.5 16.5-1-1'),
  ],
  'meat-poultry.chicken': [
    path('M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23'),
    path(
      'm8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59',
    ),
  ],
  'meat-poultry.turkey': [
    path(
      'M14.8 16.2c-4.1 1.6-8.6.3-9.6-3.4C3.7 7.4 9.8 2 15.2 2.8c4.9.7 7.1 5.3 5.4 9.3a6.4 6.4 0 0 0-5.8 4.1Z',
    ),
    path(
      'm8.2 13.2-2.6 2.6a2.5 2.5 0 1 0-1.6 4.6 2.5 2.5 0 1 0 4.6-1.6l2.6-2.6M14 6c2.2 0 4 1.8 4 4',
    ),
  ],
  'meat-poultry.lamb-goat': [
    path(
      'M19.5 6.5c-2-4.5-8.7-5-11.2-.7C6.5 9 7.3 11.4 4.2 14a3 3 0 0 0 1.9 5.3c5.2 0 11-2.6 13.4-6.2a6.8 6.8 0 0 0 0-6.6Z',
    ),
    path(
      'm3.4 18 1.4 2A3 3 0 0 0 7.3 21c4.7 0 10.5-2.6 13.1-6.2A7 7 0 0 0 21 8',
    ),
    { tag: 'circle', attrs: { cx: '13.5', cy: '8.5', r: '2' } },
  ],
  'meat-poultry.other-meats': [
    path(
      'M19.2 5.6c-3.5-4.1-8.7-3.5-11 1.1-1.4 2.9-.9 4.5-4 6.8a3 3 0 0 0 1.7 5.4c4.8 0 10.9-2.1 13.5-5.8 1.9-2.6 2-5 .1-7.5Z',
    ),
    path(
      'm3.5 18 1.6 2.2A3 3 0 0 0 7.5 21c5 0 10.5-2.3 13-5.8a6 6 0 0 0 .4-6.2M10 10c0-4 6-4 6 0s-6 4-6 0Z',
    ),
  ],
  seafood: [
    path(
      'm17.586 11.414-5.93 5.93a1 1 0 0 1-8-8l3.137-3.137a.707.707 0 0 1 1.207.5V10',
    ),
    path('M20.414 8.586 22 7'),
    { tag: 'circle', attrs: { cx: '19', cy: '10', r: '2' } },
  ],
  'seafood.fish': [
    path(
      'M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z',
    ),
    path('M18 12v.5'),
    path('M16 17.93a9.77 9.77 0 0 1 0-11.86'),
    path(
      'M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33',
    ),
    path('M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4'),
    path(
      'm16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98',
    ),
  ],
  'seafood.shellfish': [
    path(
      'M10 2a3.28 3.28 0 003.227 1.798l6.17-.561A1 1 0 1119.614 8H8.5a6.44 6.44 0 00-5.63 9.75A6.5 6.5 0 008.5 21c1.38 0 2-.5 2.5-1',
    ),
    path('M10 8a8.5 8.5 0 000 8'),
    path('M11 22c-.5-.5-1.12-1-2.5-1a1 1 0 010-5H12a7 7 0 007-7V8'),
    path('M13 12h.01'),
    path('M8 16c-2 0-4.5-4-4-6'),
  ],
  'seafood.other-seafood': [
    path('M2 12q2.5 2 5 0t5 0 5 0 5 0'),
    path('M2 19q2.5 2 5 0t5 0 5 0 5 0'),
    path('M2 5q2.5 2 5 0t5 0 5 0 5 0'),
  ],
  'dairy-eggs': [
    path('M5 2h6M6 2v3L4 8v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8l-2-3V2M4 13h8'),
    path('M15 17c0-3 2-7 3.5-7S22 14 22 17a3.5 3.5 0 0 1-7 0Z'),
  ],
  'dairy-eggs.eggs': [
    { tag: 'circle', attrs: { cx: '11.5', cy: '12.5', r: '3.5' } },
    path(
      'M3 8c0-3.5 2.5-6 6.5-6 5 0 4.83 3 7.5 5s5 2 5 6c0 4.5-2.5 6.5-7 6.5-2.5 0-2.5 2.5-6 2.5s-7-2-7-5.5c0-3 1.5-3 1.5-5C3.5 10 3 9 3 8Z',
    ),
  ],
  'dairy-eggs.milk-cream': [
    path('M8 2h8'),
    path(
      'M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2',
    ),
    path('M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0'),
  ],
  'dairy-eggs.cheese': [
    path('M4.519 20.008l16.481 -.008v-3.5a2 2 0 1 1 0 -4v-3.5h-16.722'),
    path(
      'M21 9l-9.385 -4.992c-2.512 .12 -4.758 1.42 -6.327 3.425c-1.423 1.82 -2.288 4.221 -2.288 6.854c0 2.117 .56 4.085 1.519 5.721',
    ),
    path('M15 13v.01'),
    path('M8 13v.01'),
    path('M11 16v.01'),
  ],
  'dairy-eggs.yogurt-cultured-dairy': [
    path(
      'M3 8h13l-1.6 12a1 1 0 0 1-1 .9H5.6a1 1 0 0 1-1-.9ZM2 5h15v3H2M7 13h5M8 16h3M21 10v11',
    ),
    { tag: 'ellipse', attrs: { cx: '21', cy: '6', rx: '2', ry: '4' } },
  ],
  'dairy-eggs.butter-dairy-spreads': [
    path('M10 22v-8'),
    path('M2.336 8.89 10 14l11.715-7.029'),
    path(
      'M22 14a2 2 0 0 1-.971 1.715l-10 6a2 2 0 0 1-2.138-.05l-6-4A2 2 0 0 1 2 16v-6a2 2 0 0 1 .971-1.715l10-6a2 2 0 0 1 2.138.05l6 4A2 2 0 0 1 22 8z',
    ),
  ],
  'bread-baked-goods': [
    path('M10 11v5'),
    path('M14 11v5'),
    path(
      'M6 12.65c0-.457-.316-.844-.727-1.041A4 4 0 017.52 4.034a1.53 1.53 0 001.367-.547 4 4 0 016.225 0 1.53 1.53 0 001.367.547 4 4 0 012.248 7.575c-.411.197-.727.584-.727 1.04V19a2 2 0 01-2 2H8a2 2 0 01-2-2z',
    ),
    path('M6 16h12'),
  ],
  'bread-baked-goods.bread-rolls': [
    path(
      'M5.628 11.283l5.644 -5.637c2.665 -2.663 5.924 -3.747 8.663 -1.205l.188 .181a2.987 2.987 0 0 1 0 4.228l-11.287 11.274a3 3 0 0 1 -4.089 .135l-.143 -.135c-2.728 -2.724 -1.704 -6.117 1.024 -8.841',
    ),
    path('M9.5 7.5l1.5 3.5'),
    path('M6.5 10.5l1.5 3.5'),
    path('M12.5 4.5l1.5 3.5'),
  ],
  'bread-baked-goods.pastries': [
    path('M12 22v-9'),
    path('M14 4h1a3 3 0 013 3l-.004.125A4 4 0 0121 11v2'),
    path('m15.5 22 1.5-9'),
    path(
      'M21 13a1 1 0 01.919 1.394l-2.74 6.394A2 2 0 0117.34 22H6.659a2 2 0 01-1.838-1.212l-2.74-6.394A1 1 0 013 13z',
    ),
    path('M3 13v-2a4 4 0 013.003-3.875L6 7a3 3 0 013-3h1'),
    path('M8.5 22 7 13'),
    { tag: 'circle', attrs: { cx: '12', cy: '4', r: '2' } },
  ],
  'bread-baked-goods.cookies-bars': [
    path('M11 17h.01'),
    path(
      'M11.496 2c.324-.016.558.292.529.615a4 4 0 004.235 4.368.713.713 0 01.758.757 4 4 0 004.366 4.237c.323-.03.63.204.614.527a10 10 0 01-2.915 6.566A1 1 0 114.93 4.918 10 10 0 0111.496 2',
    ),
    path('M12 12h.01'),
    path('M16 16h.01'),
    path('M16 3h.01'),
    path('M21 4h.01'),
    path('M21 8h.01'),
    path('M7 14h.01'),
    path('M9 8h.01'),
  ],
  'bread-baked-goods.cakes-pies': [
    path('M16 13H3'),
    path('M16 17H3'),
    path(
      'm7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6',
    ),
    { tag: 'circle', attrs: { cx: '9', cy: '7', r: '2' } },
  ],
  'bread-baked-goods.savory-baked-goods': [
    path('M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487'),
    path('M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132'),
    path('M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42'),
    path('M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14'),
    path(
      'M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676',
    ),
  ],
  'pantry-preserves': [
    path('M6 7h12v3l2 3v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7l2-3ZM6 3h12v4H6'),
    path('M8 14h8v4H8M9 3v4M15 3v4'),
  ],
  'pantry-preserves.honey-syrups': [
    path(
      'M4 7h10v3l2 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7l2-3ZM4 4h10v3H4M19 13l3-9M18 3l4 1M17 6l4 1M16 9l4 1',
    ),
    path('m9 13-3 2v3l3 2 3-2v-3Z'),
  ],
  'pantry-preserves.jams-jellies': [
    path('M6 7v3l-2 3v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7l-2-3V7M5 3h14v4H5'),
    path('M12 14c-5-3-7 2 0 5 7-3 5-8 0-5ZM12 14v-3M10 11l2 1 2-1'),
  ],
  'pantry-preserves.pickles-fermented-foods': [
    path('M6 7v3l-2 3v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7l-2-3V7M5 3h14v4H5'),
    path(
      'M9 12c-3-1-5 6-2 7s5-6 2-7ZM16 12c-3-1-5 6-2 7s5-6 2-7M8 15h.01M15 16h.01',
    ),
  ],
  'pantry-preserves.sauces-condiments': [
    path('M9 3h6v5l3 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8l3-4ZM9 6h6M12 3V1'),
    path('M12 12c-1 2-3 3.4-3 5a3 3 0 0 0 6 0c0-1.6-2-3-3-5Z'),
  ],
  'pantry-preserves.oils-vinegars': [
    path('M10 2h4v6l4 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8l4-4ZM9 5h6M6 14h12'),
    path('M12 16c-3 3-1 4 0 4s3-1 0-4Z'),
  ],
  'pantry-preserves.spices-seasonings': [
    {
      tag: 'rect',
      attrs: { x: '6', y: '8', width: '12', height: '13', rx: '2' },
    },
    path(
      'M7 8V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3M10 5h.01M14 5h.01M10 13h.01M14 16h.01M10 18h.01',
    ),
  ],
  'pantry-preserves.grains-flour-beans': [
    path('M2 22 16 8'),
    path(
      'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    ),
    path(
      'M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    ),
    path(
      'M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    ),
    path('M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z'),
    path(
      'M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    ),
    path(
      'M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    ),
    path(
      'M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    ),
  ],
  'pantry-preserves.nuts-seeds': [
    path(
      'M9 3c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11ZM9 8v11M16 4c4-2 7 1 6 4-.5 2-3 3-2 6s-1 7-4 6M18 7l2 1M17 15l3-1',
    ),
  ],
  'pantry-preserves.dried-foods': [
    path('M5 3h14l-1 5 2 12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L6 8ZM6 8h12'),
    { tag: 'circle', attrs: { cx: '9', cy: '14', r: '2' } },
    path('M14 14c4-2 5 4 1 4-2 0-2-2-1-4Z'),
  ],
  'sweets-confections': [
    { tag: 'circle', attrs: { cx: '12', cy: '8', r: '6' } },
    path('M12 14v8M9 8a3 3 0 1 1 3 3 2 2 0 0 1-2-2'),
  ],
  'sweets-confections.chocolates': [
    path(
      'M6 14V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11M6 8h12M12 2v12M4 14h16l-2 8H6ZM4 14l8 4 8-4',
    ),
  ],
  'sweets-confections.candy-confections': [
    {
      tag: 'rect',
      attrs: { x: '7', y: '7', width: '10', height: '10', rx: '3' },
    },
    path('m7 9-5-3v12l5-3M17 9l5-3v12l-5-3M10 7l4 10'),
  ],
  'sweets-confections.frozen-treats': [
    path(
      'M7 12a4 4 0 0 1-2-7 4 4 0 0 1 7-2 4 4 0 0 1 7 2 4 4 0 0 1-2 7ZM7 12l5 10 5-10M9 16h6M11 12l4 6',
    ),
  ],
  'sweets-confections.other-sweets': [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } },
    path('m8 6 1 1M16 7l1 1M6 12h1M16 15l1 1M9 17v1'),
  ],
  'prepared-foods': [
    path('M3 17a9 9 0 0 1 18 0M2 17h20M3 21h18M12 8V4M10 4h4'),
  ],
  'prepared-foods.prepared-meals': [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '6' } },
    path(
      'M9 12a3 3 0 0 1 3-3M2 3v5a2 2 0 0 0 4 0V3M4 3v18M22 3c-3 2-3 6-3 9h3M22 3v18',
    ),
  ],
  'prepared-foods.soups-stews': [
    path(
      'M11.248 3c.273.1.808.53.747 1.36-.05.83-.938 1.2-.989 2.02-.06.78.333 1.24.727 1.62',
    ),
    path(
      'M16.252 3c.268.1.794.53.745 1.36-.06.83-.923 1.2-.993 2.02-.05.78.338 1.24.725 1.62',
    ),
    path('M19.5 12 22 6'),
    path(
      'M4 12a1 1 0 00-.99 1.133A9 9 0 0012 21a9 9 0 008.99-7.867A1 1 0 0020 12z',
    ),
    path(
      'M6.252 3c.268.1.794.53.745 1.36-.06.83-.923 1.2-.993 2.02-.05.78.338 1.24.735 1.62',
    ),
    path('M7 21h10'),
  ],
  'prepared-foods.dips-spreads': [
    path('M3 13h18a9 8 0 0 1-18 0ZM7 21h10M6 10c2-2 4 2 6 0M13 10l4-8 5 3-3 5'),
  ],
  'prepared-foods.frozen-meals': [
    {
      tag: 'rect',
      attrs: { x: '3', y: '12', width: '18', height: '9', rx: '2' },
    },
    path('M3 16h18M12 2v7M9 3l6 5M15 3 9 8M7 19h3M15 19h2'),
  ],
  'prepared-foods.ready-to-eat-snacks': [
    path('m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8'),
    path(
      'M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7',
    ),
    path('m2.1 21.8 6.4-6.3'),
    path('m19 5-7 7'),
  ],
  beverages: [path('M5 7h14l-2 14H7ZM4 7h16M13 7l2-5h5M6 12h12')],
  'beverages.coffee': [
    path('M10 2v2'),
    path('M14 2v2'),
    path(
      'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1',
    ),
    path('M6 2v2'),
  ],
  'beverages.tea': [
    path(
      'M3 9h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM17 10h1a4 4 0 0 1 0 8h-1M6 3v2M10 2v3M13 9v6l-2 2v2h4v-2l-2-2',
    ),
  ],
  'beverages.juices-cider': [
    path('M9 8h12l-2 13h-8ZM9 13h11M16 8l2-6h3'),
    path('M9 12a5 5 0 1 1 2-8M6 2v5L2 9M6 7l3-3'),
  ],
  'beverages.kombucha-fermented-drinks': [
    path('M9 2h6v4H9M10 6v4l-3 4v7h10v-7l-3-4V6M7 15h10'),
    { tag: 'circle', attrs: { cx: '10', cy: '18', r: '.5' } },
    path('M14 19h.01M12 12h.01'),
  ],
  'beverages.other-nonalcoholic-beverages': [
    {
      tag: 'rect',
      attrs: { x: '6', y: '3', width: '12', height: '19', rx: '3' },
    },
    path('M7 7h10M7 18h10M10 3V2h4v1'),
    { tag: 'circle', attrs: { cx: '10', cy: '11', r: '1' } },
    path('M14 14h.01'),
  ],
  'flowers-plants': [
    path(
      'M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1',
    ),
    { tag: 'circle', attrs: { cx: '12', cy: '8', r: '2' } },
    path('M12 10v12'),
    path('M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z'),
    path('M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z'),
  ],
  'flowers-plants.cut-flowers-bouquets': [
    path('M17 10h-1a4 4 0 1 1 4-4v.534'),
    path(
      'M17 6h1a4 4 0 0 1 1.42 7.74l-2.29.87a6 6 0 0 1-5.339-10.68l2.069-1.31',
    ),
    path(
      'M4.5 17c2.8-.5 4.4 0 5.5.8s1.8 2.2 2.3 3.7c-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2',
    ),
    path('M9.77 12C4 15 2 22 2 22'),
    { tag: 'circle', attrs: { cx: '17', cy: '8', r: '2' } },
  ],
  'flowers-plants.potted-plants': [
    path(
      'M14 8.536V6a4 4 0 014-4h1.5a.5.5 0 01.5.5V4a4 4 0 01-4 4 4 4 0 00-4 4 5 5 0 01-8-4 5 5 0 018 4c0 2 1 3 1 5',
    ),
    path('m18 17-1.085 3.58A2 2 0 0115 22H9.002a2 2 0 01-1.913-1.418L6 17'),
    path('M5 17h14'),
  ],
  'flowers-plants.vegetable-herb-starts': [
    path(
      'M3 16h18l-2 6H5ZM8 16v-6M8 12c-4 0-5-3-5-5 4 0 5 2 5 5ZM8 10c0-4 2-5 5-5 0 3-2 5-5 5M16 16V7M16 9c-3 0-4-2-4-4 3 0 4 1 4 4ZM16 7c0-4 2-5 5-5 0 3-2 5-5 5',
    ),
  ],
  'flowers-plants.seeds-bulbs': [
    {
      tag: 'rect',
      attrs: { x: '5', y: '2', width: '14', height: '20', rx: '2' },
    },
    path('M5 6h14M12 18c-7-4-3-7 0-9 3 2 7 5 0 9ZM12 13v6'),
  ],
  'flowers-plants.dried-flowers': [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } },
    path(
      'M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5',
    ),
    path('M12 7.5V9'),
    path('M7.5 12H9'),
    path('M16.5 12H15'),
    path('M12 16.5V15'),
    path('m8 8 1.88 1.88'),
    path('M14.12 9.88 16 8'),
    path('m8 16 1.88-1.88'),
    path('M14.12 14.12 16 16'),
  ],
  'bath-body': [
    path('M10 4 8 6'),
    path('M17 19v2'),
    path('M2 12h20'),
    path('M7 19v2'),
    path(
      'M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
    ),
  ],
  'bath-body.soaps': [
    path('M7.001 15.085A1.5 1.5 0 0 1 9 16.5'),
    { tag: 'circle', attrs: { cx: '18.5', cy: '8.5', r: '3.5' } },
    { tag: 'circle', attrs: { cx: '7.5', cy: '16.5', r: '5.5' } },
    { tag: 'circle', attrs: { cx: '7.5', cy: '4.5', r: '2.5' } },
  ],
  'bath-body.skincare': [
    path('M10.5 2v4'),
    path('M14 2H7a2 2 0 0 0-2 2'),
    path(
      'M19.29 14.76A6.67 6.67 0 0 1 17 11a6.6 6.6 0 0 1-2.29 3.76c-1.15.92-1.71 2.04-1.71 3.19 0 2.22 1.8 4.05 4 4.05s4-1.83 4-4.05c0-1.16-.57-2.26-1.71-3.19',
    ),
    path(
      'M9.607 21H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h7V7a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3',
    ),
  ],
  'bath-body.haircare': [
    path(
      'M4 7h8v14H4ZM6 7V3h4v4M4 12h8M7 16h2M17 3h4v18h-4ZM17 6h-3M17 10h-3M17 14h-3M17 18h-3',
    ),
  ],
  'bath-body.bath-products': [
    path('m4 4 2.5 2.5'),
    path('M13.5 6.5a4.95 4.95 0 0 0-7 7'),
    path('M15 5 5 15'),
    path('M14 17v.01'),
    path('M10 16v.01'),
    path('M13 13v.01'),
    path('M16 10v.01'),
    path('M11 20v.01'),
    path('M17 14v.01'),
    path('M20 11v.01'),
  ],
  'bath-body.fragrances-grooming': [
    path('M 5 22 H 11.072'),
    path('M15 5 C 23 4 23.328 12.676 20 14.536'),
    path('M15.802 10.308 C 14.776 9.465 14 8.496 14 7'),
    path('M2 2h.01'),
    path('M2 7h.01'),
    path('M5 4.5h.01'),
    path(
      'M8.127 22 A 8 8 0 0 1 4 15 3 3 0 0 1 4.879 12.879C 6.879 10.879 10 10 10 7',
    ),
    { tag: 'circle', attrs: { cx: '18', cy: '18', r: '4' } },
    {
      tag: 'rect',
      attrs: { x: '9', y: '2', width: '6', height: '5', rx: '1' },
    },
  ],
  'home-handmade': [
    path(
      'M8.62 13.8A2.25 2.25 0 1 1 12 10.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z',
    ),
    path(
      'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    ),
  ],
  'home-handmade.candles': [
    {
      tag: 'rect',
      attrs: { x: '6', y: '10', width: '12', height: '12', rx: '2' },
    },
    path('M6 14h12M12 10V8M12 8c-5-1-2-5 0-7 2 2 5 6 0 7Z'),
  ],
  'home-handmade.pottery-ceramics': [
    path('M10 2v5.632c0 .424-.272.795-.653.982A6 6 0 0 0 6 14c.006 4 3 7 5 8'),
    path('M10 5H8a2 2 0 0 0 0 4h.68'),
    path('M14 2v5.632c0 .424.272.795.652.982A6 6 0 0 1 18 14c0 4-3 7-5 8'),
    path('M14 5h2a2 2 0 0 1 0 4h-.68'),
    path('M18 22H6'),
    path('M9 2h6'),
  ],
  'home-handmade.woodwork-metalwork': [
    path('M12 18v4'),
    path('m17 18 1.956-11.468'),
    path('m3 8 7.82-5.615a2 2 0 0 1 2.36 0L21 8'),
    path('M4 18h16'),
    path('M7 18 5.044 6.532'),
    { tag: 'circle', attrs: { cx: '12', cy: '10', r: '2' } },
  ],
  'home-handmade.home-kitchen-goods': [
    path('M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2'),
    path('M7 2v20'),
    path('M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'),
  ],
  'home-handmade.art-stationery': [
    path(
      'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z',
    ),
    {
      tag: 'circle',
      attrs: { cx: '13.5', cy: '6.5', r: '.5', fill: 'currentColor' },
    },
    {
      tag: 'circle',
      attrs: { cx: '17.5', cy: '10.5', r: '.5', fill: 'currentColor' },
    },
    {
      tag: 'circle',
      attrs: { cx: '6.5', cy: '12.5', r: '.5', fill: 'currentColor' },
    },
    {
      tag: 'circle',
      attrs: { cx: '8.5', cy: '7.5', r: '.5', fill: 'currentColor' },
    },
  ],
  'home-handmade.other-handmade-goods': [
    path('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'),
    path(
      'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    ),
  ],
  'clothing-accessories': [
    path(
      'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z',
    ),
  ],
  'clothing-accessories.clothing': [
    path('M8 3a4 4 0 0 0 8 0l6 4-3 6-3-2v10H8V11l-3 2-3-6ZM8 18h8'),
  ],
  'clothing-accessories.jewelry': [
    path('M10.5 3 8 9l4 13 4-13-2.5-6'),
    path(
      'M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z',
    ),
    path('M2 9h20'),
  ],
  'clothing-accessories.bags-accessories': [
    path(
      'M2.048 18.566A2 2 0 0 0 4 21h16a2 2 0 0 0 1.952-2.434l-2-9A2 2 0 0 0 18 8H6a2 2 0 0 0-1.952 1.566z',
    ),
    path('M8 11V6a4 4 0 0 1 8 0v5'),
  ],
  'clothing-accessories.textiles': [
    path(
      'M4 3h16v16H4ZM4 7h16M8 3v16M16 3v16M4 15h16M6 19v3M10 19v3M14 19v3M18 19v3',
    ),
  ],
  'pet-products': [
    { tag: 'circle', attrs: { cx: '11', cy: '4', r: '2' } },
    { tag: 'circle', attrs: { cx: '18', cy: '8', r: '2' } },
    { tag: 'circle', attrs: { cx: '20', cy: '16', r: '2' } },
    path(
      'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z',
    ),
  ],
  'pet-products.pet-treats': [
    path(
      'M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z',
    ),
  ],
  'pet-products.pet-food': [
    path(
      'M5.364 3.848C4 6 3 9.652 3 12.652V19a2 2 0 002 2h14a2 2 0 002-2v-5c0-2.334-1.816-4.668-2.622-7.002',
    ),
    path(
      'M7 3h11.379a2 2 0 011.789 1.106l.723 1.447A1 1 0 0119.997 7h-8.525a2 2 0 01-1.789-1.106L8.79 4.105a2 2 0 10-3.579 1.789l2.261 4.522A5 5 0 018 12.652V21',
    ),
  ],
  'pet-products.pet-toys-accessories': [
    path('m10 10 4 4'),
    path('m13 7 4 4'),
    path(
      'M15.34 2.138A15 15 0 002.138 15.34c-.357 2.94.004 4.919.805 5.717.798.8 2.778 1.162 5.718.805A15 15 0 0021.862 8.661c.357-2.94-.004-4.92-.805-5.718-.798-.8-2.778-1.162-5.717-.805',
    ),
    path('M17 7 7 17'),
    path('m7 13 4 4'),
  ],
  'pet-products.pet-grooming': [
    path('M11.25 16.25h1.5L12 17z'),
    path('M16 14v.5'),
    path(
      'M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309',
    ),
    path('M8 14v.5'),
    path(
      'M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5',
    ),
  ],
  'farm-garden': [
    path(
      'm2 10 10-7 10 7M4 9v12h16V9M8 21V11h8v10M8 11l8 10M16 11 8 21M10 6h4',
    ),
  ],
  'farm-garden.soil-compost': [
    path(
      'M2 21c2-4 4-4 7-6 3-3 8-2 13 6ZM12 14V6M12 9c-5 0-6-3-6-6 5 0 6 2 6 6ZM12 7c0-4 3-5 7-5 0 3-3 5-7 5M7 19h.01M13 17h.01M17 19h.01',
    ),
  ],
  'farm-garden.gardening-supplies': [
    path(
      'M21.56 4.56a1.5 1.5 0 0 1 0 2.122l-.47.47a3 3 0 0 1-4.212-.03 3 3 0 0 1 0-4.243l.44-.44a1.5 1.5 0 0 1 2.121 0z',
    ),
    path(
      'M3 22a1 1 0 0 1-1-1v-3.586a1 1 0 0 1 .293-.707l3.355-3.355a1.205 1.205 0 0 1 1.704 0l3.296 3.296a1.205 1.205 0 0 1 0 1.704l-3.355 3.355a1 1 0 0 1-.707.293z',
    ),
    path('m9 15 7.879-7.878'),
  ],
  'farm-garden.farm-livestock-supplies': [
    path(
      'M3 8h18l-2 13H5ZM6 8V6a6 4 0 0 1 12 0v2M3 12h18M12 20v-5M12 18c-3 0-4-1-4-3 3 0 4 1 4 3ZM12 18c0-2 1-3 4-3 0 2-1 3-4 3',
    ),
  ],
  'farm-garden.other-garden-supplies': [
    path('M10.083 5.428 5.57 4.083a2 2 0 10.001 3.834l4.512-1.345'),
    path('M12 8v3'),
    path('m13.917 5.428 4.511-1.345a2 2 0 110 3.834l-4.51-1.345'),
    path('M18 17v-4.006'),
    path('M22 11v8'),
    path(
      'M22 12h-3a1 1 0 00-1 .994h-2.539a4 4 0 00-6.915-.012L7 13a5 5 0 00-5 5v1a1 1 0 001 1h2a1 1 0 001-1v-1a1 1 0 01.995-1l1.552.018a4 4 0 006.907 0L18 17a1 1 0 001 1h3',
    ),
    { tag: 'circle', attrs: { cx: '12', cy: '6', r: '2' } },
  ],
} satisfies Record<string, readonly CategoryIconShape[]>;

export type CategoryIconCode = keyof typeof categoryIconArtwork;

/** Unknown codes remain unillustrated instead of receiving a misleading fallback. */
export function categoryIconShapes(
  code: string,
): readonly CategoryIconShape[] | undefined {
  return Object.hasOwn(categoryIconArtwork, code)
    ? categoryIconArtwork[code as CategoryIconCode]
    : undefined;
}

/** Standalone SVG for image consumers and downloads, from trusted local shapes only. */
export function categoryIconSvg(code: string): string | undefined {
  const shapes = categoryIconShapes(code);
  if (!shapes) return undefined;
  const content = shapes
    .map(({ tag, attrs }) => {
      const attributes = Object.entries(attrs)
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ');
      return `<${tag} ${attributes}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${categoryIconViewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
}

export function categoryIconDataUrl(code: string): string | undefined {
  const svg = categoryIconSvg(code);
  return svg ? `data:image/svg+xml,${encodeURIComponent(svg)}` : undefined;
}
