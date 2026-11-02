// Curated fictional retail inventory for the existing local businesses.
/* eslint-disable @typescript-eslint/no-require-imports -- Shared with the guarded CommonJS Vendure importer. */
// Amounts are USD cents. Customer-visible copy contains no fixture labels.
const assert = require('node:assert/strict');
const base = require('./testing-vendors.cjs');
const photos = require('./vendor-catalog-photos.cjs');
const categories = { ...base.categories, seafood: 'Fish & Seafood' };
const cold =
  'Keep refrigerated. Bring an insulated bag for pickup and follow the use-by date on the package.';
const dry = 'Store sealed in a cool, dry place away from direct sunlight.';
const baked =
  'Keep wrapped at room temperature for up to two days, or freeze for longer storage.';
const frozen =
  'Keep frozen until needed. Thaw in the refrigerator and cook before serving.';
const recipe = (
  name,
  price,
  unit,
  ingredients,
  description,
  category,
  image,
  allergens = 'No major allergens are included in the recipe. Ask about shared handling if you have an allergy.',
  storage = dry,
) => ({
  name,
  price,
  unit,
  ingredients,
  description,
  category,
  image,
  allergens,
  storage,
  stock: 36,
});
const pools = {};
pools.juice = [
  [
    'Green Garden Juice',
    850,
    'Cucumber, spinach, green apple, lemon',
    'A crisp green blend with mellow apple sweetness and a bright lemon finish.',
    'juice-green',
  ],
  [
    'Carrot Sunrise Juice',
    800,
    'Carrot, orange, lemon',
    'Sweet carrot juice balanced with freshly pressed citrus.',
    'juice-orange',
  ],
  [
    'Berry Beet Juice',
    900,
    'Beet, apple, strawberry, lemon',
    'Earthy beets and sweet berries make a smooth, ruby-colored juice.',
    'juice-beet',
  ],
  [
    'Ginger Citrus Shot',
    400,
    'Ginger, orange, lemon',
    'A small, sharp ginger shot rounded out with orange and lemon.',
    'juice-orange',
  ],
  [
    'Pineapple Mint Juice',
    850,
    'Pineapple, apple, fresh mint, lime',
    'Sweet pineapple with cooling mint and a clean lime finish.',
    'juice-orange',
  ],
  [
    'Watermelon Lime Juice',
    800,
    'Watermelon, lime',
    'A light watermelon juice with a splash of tart lime.',
    'juice-berry',
  ],
  [
    'Golden Turmeric Juice',
    900,
    'Pineapple, orange, carrot, turmeric, lemon',
    'Golden fruit and carrot juice with the earthy warmth of fresh turmeric.',
    'juice-orange',
  ],
  [
    'Celery Apple Juice',
    850,
    'Celery, green apple, cucumber, lemon',
    'Fresh celery and apple pressed into a balanced, savory-sweet juice.',
    'juice-green',
  ],
  [
    'Pear Ginger Juice',
    850,
    'Pear, apple, ginger, lemon',
    'Soft pear sweetness with a warming finish of fresh ginger.',
    'juice-orange',
  ],
  [
    'Strawberry Lemon Juice',
    850,
    'Strawberry, apple, lemon',
    'Ripe strawberry and lemon with apple for a naturally sweet finish.',
    'juice-berry',
  ],
  [
    'Cucumber Melon Juice',
    800,
    'Cucumber, honeydew melon, lime',
    'Mild honeydew and cucumber pressed together for a refreshing afternoon drink.',
    'juice-green',
  ],
  [
    'Tropical Mango Juice',
    900,
    'Mango, pineapple, orange, lime',
    'A full-bodied tropical blend of mango, pineapple and bright citrus.',
    'juice-orange',
  ],
  [
    'Beet Carrot Citrus Juice',
    900,
    'Beet, carrot, orange, lemon',
    'Sweet roots and citrus make a rounded juice with a deep red color.',
    'juice-beet',
  ],
  [
    'Turmeric Ginger Shot',
    450,
    'Turmeric, ginger, lemon, orange',
    'Fresh turmeric and ginger in a concentrated citrus shot.',
    'juice-orange',
  ],
  [
    'Orange Ginger Carrot Juice',
    850,
    'Orange, carrot, ginger, lemon',
    'Orange-led carrot juice with a peppery ginger finish.',
    'juice-orange',
  ],
  [
    'Pink Grapefruit Mint Juice',
    850,
    'Pink grapefruit, apple, fresh mint',
    'Tart grapefruit softened with apple and finished with fresh mint.',
    'juice-berry',
  ],
  [
    'Apple Lemon Press',
    800,
    'Apple, lemon',
    'A simple apple press with enough lemon to keep the finish bright.',
    'juice-orange',
  ],
  [
    'Kale Pineapple Juice',
    900,
    'Kale, pineapple, cucumber, lime',
    'Leafy kale and pineapple with cucumber for a clean, mellow finish.',
    'juice-green',
  ],
].map(([n, p, i, d, img]) =>
  recipe(
    n,
    p,
    /Shot/.test(n) ? '2 fl oz bottle' : '12 fl oz bottle',
    i,
    d,
    'drinks',
    img,
    undefined,
    cold,
  ),
);
pools.honey = [
  [
    'Wildflower Honey',
    1400,
    '12 oz jar',
    'Wildflower honey',
    'Floral honey with a rounded sweetness for toast, tea and baking.',
    'honey',
  ],
  [
    'Creamed Honey',
    1600,
    '8 oz jar',
    'Honey',
    'Smooth, finely crystallized honey with a soft, spreadable texture.',
    'honey-light',
  ],
  [
    'Cinnamon Honey',
    1600,
    '8 oz jar',
    'Honey, ground cinnamon',
    'Warm cinnamon stirred into honey for oatmeal and buttered toast.',
    'honey-lemon',
  ],
  [
    'Comb Honey',
    1800,
    '8 oz container',
    'Honeycomb',
    'Cut honeycomb with edible wax, ready to portion for a cheese board.',
    'honey-comb',
  ],
  [
    'Clover Honey',
    1400,
    '12 oz jar',
    'Clover honey',
    'A mild, light honey with gentle floral notes and a clean finish.',
    'honey-light',
  ],
  [
    'Mesquite Blossom Honey',
    1600,
    '12 oz jar',
    'Mesquite blossom honey',
    'Amber honey with a mellow sweetness that pairs well with strong tea.',
    'honey',
  ],
  [
    'Orange Blossom Honey',
    1600,
    '12 oz jar',
    'Orange blossom honey',
    'Light, fragrant honey with delicate citrus-flower notes.',
    'honey-lemon',
  ],
  [
    'Wildflower Honey Family Jar',
    2600,
    '24 oz jar',
    'Wildflower honey',
    'A pantry-size jar for everyday tea, breakfast and home baking.',
    'honey',
  ],
  [
    'Wildflower Honey Travel Jar',
    700,
    '4 oz jar',
    'Wildflower honey',
    'A small jar of floral honey for picnics, gifts and weekend trips.',
    'honey-light',
  ],
  [
    'Vanilla Bean Creamed Honey',
    1800,
    '8 oz jar',
    'Honey, vanilla bean',
    'Spreadable honey flecked with vanilla bean for scones and biscuits.',
    'honey-light',
  ],
  [
    'Cocoa Creamed Honey',
    1800,
    '8 oz jar',
    'Honey, unsweetened cocoa powder',
    'Rich cocoa blended into creamed honey for a spoonable chocolate spread.',
    'honey',
  ],
  [
    'Lemon Infused Honey',
    1700,
    '8 oz jar',
    'Honey, dried lemon zest',
    'Bright lemon zest gives this honey a fresh citrus aroma.',
    'honey-lemon',
  ],
  [
    'Ginger Infused Honey',
    1700,
    '8 oz jar',
    'Honey, dried ginger',
    'A gently warming honey for marinades, tea and roasted vegetables.',
    'honey-lemon',
  ],
  [
    'Chili Pepper Honey',
    1800,
    '8 oz jar',
    'Honey, dried chili pepper',
    'Sweet honey with a slow chili warmth for pizza and roasted chicken.',
    'honey',
  ],
  [
    'Lavender Infused Honey',
    1800,
    '8 oz jar',
    'Honey, culinary lavender',
    'Floral honey infused with lavender for yogurt and shortbread.',
    'honey-light',
  ],
  [
    'Maple Creamed Honey',
    1800,
    '8 oz jar',
    'Honey, maple sugar',
    'Spreadable honey blended with maple sugar for pancakes and warm biscuits.',
    'honey',
  ],
  [
    'Honey Tasting Trio',
    2400,
    'three 4 oz jars',
    'Wildflower honey, clover honey, orange blossom honey',
    'Three distinct honeys packed together for a side-by-side tasting.',
    'honey-comb',
  ],
  [
    'Cinnamon Vanilla Honey',
    1800,
    '8 oz jar',
    'Honey, cinnamon, vanilla bean',
    'Soft vanilla and cinnamon make a comforting finishing honey for breakfast.',
    'honey-lemon',
  ],
].map(([n, p, u, i, d, img]) => recipe(n, p, u, i, d, 'pantry', img));
function rows(category, image, storage, allergens, definitions) {
  return definitions.map(([name, price, unit, ingredients, description, img]) =>
    recipe(
      name,
      price,
      unit,
      ingredients,
      description,
      category,
      img ?? image,
      allergens,
      storage,
    ),
  );
}
pools.seafood = rows(
  'seafood',
  'seafood',
  frozen,
  'Contains fish or shellfish as identified in the ingredients. Prepared in a facility handling fish and shellfish.',
  [
    [
      'Large Gulf Shrimp',
      1800,
      '1 lb bag',
      'Raw shell-on shrimp',
      'Large shell-on shrimp for boiling, grilling and quick skillet dinners.',
      'shrimp',
    ],
    [
      'Peeled Gulf Shrimp',
      2200,
      '1 lb bag',
      'Raw peeled shrimp',
      'Peeled shrimp with tails removed, ready to season and cook.',
      'shrimp',
    ],
    [
      'Jumbo Gulf Shrimp',
      2400,
      '1 lb bag',
      'Raw shell-on jumbo shrimp',
      'Generous jumbo shrimp for skewers, broiling and special weekend meals.',
      'shrimp',
    ],
    [
      'Shrimp Boil Family Pack',
      4200,
      '3 lb bag',
      'Raw shell-on shrimp',
      'A family-size bag of shell-on shrimp for a seafood boil.',
      'shrimp',
    ],
    [
      'Garlic Chili Shrimp',
      2400,
      '1 lb tray',
      'Raw shrimp, olive oil, garlic, chili flakes, sea salt',
      'Peeled shrimp tossed with garlic and chili, ready for the skillet.',
      'shrimp-seasoned',
    ],
    [
      'Lemon Pepper Shrimp',
      2400,
      '1 lb tray',
      'Raw shrimp, olive oil, lemon zest, black pepper, sea salt',
      'Bright lemon and cracked pepper season these ready-to-cook shrimp.',
      'shrimp-seasoned',
    ],
    [
      'Red Snapper Fillets',
      2800,
      '1 lb vacuum pack',
      'Raw red snapper',
      'Firm white fillets with the skin on for pan-searing or baking.',
    ],
    [
      'Flounder Fillets',
      2400,
      '1 lb vacuum pack',
      'Raw flounder',
      'Delicate, mild fillets portioned for a light weeknight meal.',
    ],
    [
      'Black Drum Fillets',
      2200,
      '1 lb vacuum pack',
      'Raw black drum',
      'Mild white fish cut into boneless portions for baking or frying.',
    ],
    [
      'Redfish Fillets',
      2600,
      '1 lb vacuum pack',
      'Raw redfish',
      'Skin-on redfish portions for the grill or a cast-iron skillet.',
    ],
    [
      'Speckled Trout Fillets',
      2600,
      '1 lb vacuum pack',
      'Raw speckled trout',
      'Tender trout fillets with a mild flavor and delicate texture.',
    ],
    [
      'Sheepshead Fillets',
      2400,
      '1 lb vacuum pack',
      'Raw sheepshead',
      'Firm, flaky white fish portions for tacos, baking or pan-searing.',
    ],
    [
      'Fish Taco Portions',
      1800,
      '1 lb vacuum pack',
      'Raw white fish pieces',
      'Boneless white fish pieces cut to an even size for tacos.',
    ],
    [
      'Seafood Stock Bones',
      800,
      '2 lb bag',
      'Raw fish frames and bones',
      'Clean fish frames for making a flavorful broth; strain before serving.',
    ],
    [
      'Blue Crab Claw Meat',
      2400,
      '8 oz tub',
      'Cooked blue crab meat',
      'Picked claw meat for crab cakes, soups and warm dips.',
    ],
    [
      'Blue Crab Lump Meat',
      3400,
      '8 oz tub',
      'Cooked blue crab meat',
      'Large picked pieces for salads and crab cakes with minimal mixing.',
    ],
    [
      'Shucked Oysters',
      2400,
      '16 oz tub',
      'Raw oysters, oyster liquor',
      'Shucked oysters packed in their liquor for frying or baking.',
    ],
    [
      'Gulf Seafood Supper Pack',
      4800,
      '2 lb pack',
      'Raw shrimp, raw white fish fillets',
      'A one-pound pack each of shrimp and white fish for a mixed seafood supper.',
    ],
  ],
);
pools.produce = rows('produce', 'carrots', cold, undefined, [
  [
    'Seasonal Vegetable Box',
    2800,
    'one 8-item box',
    'Seasonal vegetables',
    'A kitchen-ready assortment of eight vegetables selected from the current harvest.',
    'carrots',
  ],
  [
    'Heirloom Tomatoes',
    650,
    '1 lb basket',
    'Heirloom tomatoes',
    'Mixed heirloom tomatoes selected for slicing, sandwiches and salads.',
    'tomatoes',
  ],
  [
    'Fresh Kale Bunch',
    400,
    'one 8 oz bunch',
    'Kale',
    'Tender kale leaves with sturdy stems for sautéing, soups and salads.',
    'kale',
  ],
  [
    'Mixed Salad Greens',
    650,
    '6 oz bag',
    'Mixed lettuce leaves',
    'A mix of tender lettuces packed for everyday side salads.',
    'lettuce',
  ],
  [
    'Rainbow Carrot Bunch',
    500,
    'one 1 lb bunch',
    'Carrots',
    'Colorful carrots with a crisp bite for roasting or eating raw.',
    'carrots',
  ],
  [
    'Garden Cucumbers',
    400,
    '1 lb bag',
    'Cucumbers',
    'Firm cucumbers with a clean crunch for salads and quick pickles.',
    'cucumber',
  ],
  [
    'Green Bell Peppers',
    450,
    '1 lb bag',
    'Green bell peppers',
    'Crisp green peppers for stuffing, fajitas and chopped salads.',
    'peppers',
  ],
  [
    'Red Beet Bunch',
    500,
    'one 1 lb bunch',
    'Red beets',
    'Earthy, sweet beets with skins on for roasting or boiling.',
    'beets',
  ],
  [
    'Yellow Storage Onions',
    400,
    '2 lb bag',
    'Yellow onions',
    'All-purpose onions with a firm texture for pantry cooking.',
    'onions',
  ],
  [
    'Red Potatoes',
    500,
    '2 lb bag',
    'Red potatoes',
    'Thin-skinned potatoes for roasting, boiling and potato salad.',
    'potatoes',
  ],
  [
    'Tender Zucchini',
    450,
    '1 lb bag',
    'Zucchini',
    'Small, tender summer squash for quick sautéing and grilling.',
    'zucchini',
  ],
  [
    'Breakfast Radishes',
    350,
    'one 8 oz bunch',
    'Radishes',
    'Crisp radishes with a peppery bite for salads and snack plates.',
    'radish',
  ],
  [
    'Fresh Green Beans',
    650,
    '1 lb bag',
    'Green beans',
    'Tender green beans ready to trim, steam or blister in a skillet.',
    'beans',
  ],
  [
    'Butter Lettuce Head',
    400,
    'one head',
    'Butter lettuce',
    'Soft, cupped leaves for delicate salads and lettuce wraps.',
    'lettuce',
  ],
  [
    'Swiss Chard Bundle',
    450,
    'one 10 oz bunch',
    'Swiss chard',
    'Tender greens with colorful stems that hold up well to a quick sauté.',
    'chard',
  ],
  [
    'Fresh Culinary Herb Bundle',
    400,
    'one 2 oz bunch',
    'Parsley, rosemary, thyme',
    'A fragrant herb bundle for roast vegetables, soups and marinades.',
    'herbs',
  ],
  [
    'Roasting Vegetable Bag',
    1200,
    '3 lb bag',
    'Carrots, potatoes, onions',
    'Three reliable roasting vegetables packed together for an easy side dish.',
    'carrots',
  ],
  [
    'Kitchen Greens Duo',
    1000,
    'two 6 oz bags',
    'Kale, mixed lettuce leaves',
    'One bag of cooking greens and one bag of salad leaves for the week.',
    'kale',
  ],
]);
pools.greens = rows('greens', 'microgreens', cold, undefined, [
  ...[
    'Sunflower',
    'Pea Shoot',
    'Spicy Radish',
    'Broccoli',
    'Red Cabbage',
    'Arugula',
    'Mustard',
    'Purple Kohlrabi',
    'Cilantro',
    'Basil',
    'Beet',
    'Kale',
    'Watercress',
    'Mizuna',
  ].map((flavor, i) => [
    `${flavor} Microgreens`,
    600 + (i % 3) * 50,
    '2 oz clamshell',
    `${flavor.replace('Spicy ', '')} microgreens`,
    `Fresh-cut ${flavor.toLowerCase()} greens with tender stems for salads, bowls and sandwich toppings.`,
  ]),
  [
    'Mild Microgreen Blend',
    750,
    '3 oz clamshell',
    'Sunflower microgreens, pea shoots, broccoli microgreens',
    'A mild, crunchy mix for sandwiches and everyday salads.',
  ],
  [
    'Peppery Microgreen Blend',
    750,
    '3 oz clamshell',
    'Radish microgreens, mustard microgreens, arugula microgreens',
    'A lively mix of tender greens with a peppery finish.',
  ],
  [
    'Chef Microgreen Mix',
    1200,
    '5 oz clamshell',
    'Pea shoots, sunflower microgreens, red cabbage microgreens',
    'A larger pack with contrasting leaf shapes and colors for finishing plates.',
  ],
  [
    'Pea Shoot Stir-Fry Pack',
    1000,
    '6 oz bag',
    'Pea shoots',
    'Long, tender shoots packed for a quick garlic sauté or stir-fry.',
  ],
]);
pools.tamales = rows(
  'prepared',
  'tamales',
  cold,
  'Contains corn. Fillings may contain milk, soy or egg as listed. Made in a kitchen handling wheat, milk, eggs, soy and nuts.',
  [
    [
      'Chicken Salsa Verde Tamales',
      1800,
      'six tamales',
      'Corn masa, chicken, tomatillo, chicken stock, vegetable oil, onion, garlic, cilantro, salt',
      'Tender chicken and tangy green salsa wrapped in soft corn masa.',
    ],
    [
      'Pork Chile Rojo Tamales',
      1800,
      'six tamales',
      'Corn masa, pork, red chile, pork stock, lard, garlic, cumin, salt',
      'Slow-cooked pork in red chile sauce inside a traditional masa shell.',
    ],
    [
      'Black Bean & Cheese Tamales',
      1700,
      'six tamales',
      'Corn masa, black beans, Monterey Jack cheese (milk), vegetable oil, onion, cumin, salt',
      'Seasoned black beans and melting cheese in a soft masa wrapper.',
    ],
    [
      'Sweet Cinnamon Tamales',
      1500,
      'six tamales',
      'Corn masa, milk, butter (milk), sugar, cinnamon, raisins, salt',
      'Lightly sweet masa with cinnamon and raisins for dessert or breakfast.',
    ],
    [
      'Jalapeño Cheese Tamales',
      1700,
      'six tamales',
      'Corn masa, Monterey Jack cheese (milk), jalapeño, vegetable oil, onion, salt',
      'Melted cheese and sliced jalapeño with a gentle, warming heat.',
    ],
    [
      'Beef Barbacoa Tamales',
      2000,
      'six tamales',
      'Corn masa, beef, beef stock, guajillo chile, vegetable oil, garlic, cumin, salt',
      'Rich shredded beef seasoned with guajillo chile and cumin.',
    ],
    [
      'Roasted Poblano Tamales',
      1800,
      'six tamales',
      'Corn masa, poblano peppers, Oaxaca cheese (milk), vegetable oil, onion, salt',
      'Roasted poblano strips and soft cheese give these tamales a smoky finish.',
    ],
    [
      'Mushroom Corn Tamales',
      1700,
      'six tamales',
      'Corn masa, mushrooms, sweet corn, vegetable stock, vegetable oil, onion, salt',
      'Savory mushrooms and sweet corn in a vegetable-based masa.',
    ],
    [
      'Spinach Cheese Tamales',
      1700,
      'six tamales',
      'Corn masa, spinach, Monterey Jack cheese (milk), vegetable oil, garlic, salt',
      'Leafy spinach, garlic and mild cheese folded into tender masa.',
    ],
    [
      'Chipotle Chicken Tamales',
      1900,
      'six tamales',
      'Corn masa, chicken, tomato, chipotle chile, chicken stock, vegetable oil, salt',
      'Shredded chicken with smoky chipotle and tomato sauce.',
    ],
    [
      'Green Chile Pork Tamales',
      1900,
      'six tamales',
      'Corn masa, pork, green chile, tomatillo, pork stock, lard, salt',
      'Tender pork with roasted green chile and tangy tomatillo.',
    ],
    [
      'Pineapple Sweet Tamales',
      1600,
      'six tamales',
      'Corn masa, pineapple, milk, butter (milk), sugar, cinnamon, salt',
      'Sweet pineapple pieces in a soft, gently spiced masa.',
    ],
    [
      'Chocolate Tamales',
      1700,
      'six tamales',
      'Corn masa, milk, butter (milk), cocoa powder, sugar, cinnamon, salt',
      'A rich cocoa masa with cinnamon and a lightly sweet finish.',
    ],
    [
      'Chicken Tamale Family Pack',
      3400,
      'twelve tamales',
      'Corn masa, chicken, tomatillo, chicken stock, vegetable oil, onion, garlic, salt',
      'A dozen green-salsa chicken tamales packed for a family meal.',
    ],
    [
      'Pork Tamale Family Pack',
      3400,
      'twelve tamales',
      'Corn masa, pork, red chile, pork stock, lard, garlic, cumin, salt',
      'A dozen red-chile pork tamales, ready to reheat and share.',
    ],
    [
      'Vegetarian Tamale Assortment',
      3300,
      'twelve tamales',
      'Corn masa, black beans, poblano, Monterey Jack cheese (milk), vegetable oil, salt',
      'Six bean-and-cheese and six poblano-and-cheese tamales.',
    ],
    [
      'Salsa Verde',
      700,
      '8 oz tub',
      'Tomatillo, onion, jalapeño, cilantro, lime juice, salt',
      'A bright green salsa with fresh cilantro and a medium chile warmth.',
      'pickled-mixed',
    ],
    [
      'Roasted Tomato Salsa',
      700,
      '8 oz tub',
      'Tomato, onion, garlic, serrano chile, lime juice, salt',
      'Roasted tomatoes and chiles blended into a savory table salsa.',
      'pickled-mixed',
    ],
  ],
);
pools.macarons = [
  ['Vanilla Bean', 'Vanilla bean', 1500],
  ['Raspberry', 'Raspberry jam', 1500],
  ['Pistachio', 'Pistachio paste', 1700],
  ['Salted Caramel', 'Caramel (sugar, cream, butter), sea salt', 1600],
  ['Lemon Curd', 'Lemon juice, lemon zest, egg yolk', 1600],
  ['Dark Chocolate', 'Dark chocolate (cocoa, sugar, cocoa butter)', 1600],
  ['Strawberry', 'Strawberry jam', 1500],
  ['Espresso', 'Espresso powder', 1600],
  ['Orange Blossom', 'Orange blossom water, orange zest', 1600],
  ['Coconut', 'Coconut flakes', 1600],
  ['Hazelnut Chocolate', 'Hazelnut paste, cocoa powder', 1700],
  ['Blueberry', 'Blueberry jam', 1600],
  ['Lavender Honey', 'Culinary lavender, honey', 1700],
  ['Matcha', 'Matcha green tea', 1700],
  ['Cookies & Cream', 'Cocoa biscuits (wheat, soy), cream cheese', 1700],
].map(([f, i, p], n) =>
  recipe(
    `${f} Macarons`,
    p,
    'box of six',
    `Almond flour, sugar, egg whites, butter (milk), cream (milk), ${i.toLowerCase()}`,
    `Crisp almond shells with a soft center and ${f.toLowerCase()} filling, packed in a six-piece box.`,
    'desserts',
    /Chocolate|Espresso/.test(f)
      ? 'macarons-chocolate'
      : n % 2
        ? 'macarons-pastel'
        : 'macarons',
    `Contains almonds, eggs and milk${/Pistachio/.test(f) ? ', pistachios' : ''}${/Hazelnut/.test(f) ? ', hazelnuts' : ''}${/Cookies/.test(f) ? ', wheat and soy' : ''}. Made in a kitchen handling other nuts.`,
    cold,
  ),
);
pools.macarons.push(
  ...rows(
    'desserts',
    'macarons',
    cold,
    'Contains almonds, eggs and milk. Assortments may include other nuts and wheat; ask for the current selection.',
    [
      [
        'Market Macaron Assortment',
        2800,
        'box of twelve',
        'Almond flour, sugar, egg whites, butter (milk), cream (milk), assorted fruit and nut fillings',
        'Twelve macarons in six rotating flavors for sharing or gifting.',
      ],
      [
        'Celebration Macaron Box',
        5200,
        'box of twenty-four',
        'Almond flour, sugar, egg whites, butter (milk), cream (milk), assorted fillings',
        'Two dozen colorful macarons arranged in a gift-ready box.',
      ],
      [
        'Chocolate Macaron Trio',
        1800,
        'box of six',
        'Almond flour, sugar, egg whites, butter (milk), cream (milk), cocoa, dark chocolate, espresso, hazelnuts',
        'Two each of dark chocolate, espresso and chocolate-hazelnut macarons.',
      ],
    ],
  ),
);
pools.poultry = rows(
  'poultry',
  'chicken',
  frozen,
  'No major allergens in plain cuts. Seasoned products list all added ingredients.',
  [
    [
      'Whole Pasture-Raised Chicken',
      2400,
      'one 4 lb chicken',
      'Raw chicken',
      'A whole bird, cleaned and packed for roasting or breaking down at home.',
    ],
    [
      'Boneless Chicken Breasts',
      1600,
      '1 lb pack',
      'Raw chicken breast',
      'Trimmed boneless breast portions for grilling, baking and quick skillet meals.',
      'chicken-breast',
    ],
    [
      'Chicken Thighs',
      1200,
      '1 lb pack',
      'Raw chicken thighs',
      'Bone-in, skin-on thighs that stay tender through roasting and braising.',
    ],
    [
      'Chicken Wings',
      1100,
      '1 lb pack',
      'Raw chicken wings',
      'Whole wings packed for the oven, grill or air fryer.',
    ],
    [
      'Chicken Drumsticks',
      1000,
      '1 lb pack',
      'Raw chicken drumsticks',
      'Skin-on drumsticks for roasted dinners and barbecue.',
    ],
    [
      'Chicken Leg Quarters',
      1400,
      '2 lb pack',
      'Raw chicken leg quarters',
      'Thigh-and-drumstick quarters with the skin on for slow roasting.',
    ],
    [
      'Boneless Chicken Thighs',
      1500,
      '1 lb pack',
      'Raw boneless chicken thighs',
      'Boneless dark-meat portions for stir-fries, skewers and curries.',
      'chicken-breast',
    ],
    [
      'Chicken Tenders',
      1700,
      '1 lb pack',
      'Raw chicken tenderloins',
      'Tender breast strips with an even size for breading or quick sautéing.',
      'chicken-breast',
    ],
    [
      'Ground Chicken',
      1300,
      '1 lb pack',
      'Raw ground chicken',
      'Unseasoned ground chicken for meatballs, burgers and dumplings.',
    ],
    [
      'Chicken Soup Bones',
      700,
      '2 lb bag',
      'Raw chicken frames and bones',
      'A stock-making pack with plenty of bones for a full-flavored broth.',
    ],
    [
      'Chicken Feet',
      700,
      '1 lb bag',
      'Raw chicken feet',
      'Cleaned chicken feet for adding body to homemade broth.',
    ],
    [
      'Chicken Liver',
      800,
      '1 lb pack',
      'Raw chicken liver',
      'Cleaned chicken livers for pâté or a quick pan-fry.',
    ],
    [
      'Chicken Gizzards',
      700,
      '1 lb pack',
      'Raw chicken gizzards',
      'Trimmed gizzards for slow braising or simmering.',
    ],
    [
      'Chicken Breakfast Sausage',
      1400,
      '1 lb pack',
      'Ground chicken, sea salt, sage, black pepper, maple sugar',
      'Loose breakfast sausage seasoned with sage and a touch of maple.',
    ],
    [
      'Lemon Herb Chicken Breasts',
      1900,
      '1 lb pack',
      'Raw chicken breast, olive oil, lemon zest, thyme, garlic, salt',
      'Breast portions seasoned with lemon and herbs, ready to cook.',
      'chicken-breast',
    ],
    [
      'Garlic Pepper Chicken Thighs',
      1700,
      '1 lb pack',
      'Raw chicken thighs, olive oil, garlic, black pepper, salt',
      'A simple garlic and pepper seasoning on tender chicken thighs.',
    ],
    [
      'Chicken Freezer Bundle',
      6400,
      '6 lb bundle',
      'Raw chicken breast, thighs, drumsticks',
      'Two pounds each of breast, thighs and drumsticks for a practical freezer restock.',
    ],
    [
      'Pasture Eggs',
      700,
      'one dozen',
      'Chicken eggs',
      'A dozen shell eggs packed by hand for baking and breakfast.',
      'eggs',
    ],
  ],
);
pools.crackers = rows(
  'bakery',
  'crackers',
  dry,
  'Contains wheat and milk. Chocolate products also contain soy; nut products contain the named nuts.',
  [
    [
      'Classic Honey Graham Crackers',
      800,
      '6 oz bag',
      'Whole wheat flour, wheat flour, butter (milk), honey, brown sugar, baking soda, salt',
      'Crisp honey grahams with a gently toasted whole-wheat finish.',
    ],
    [
      'Cinnamon Graham Crackers',
      850,
      '6 oz bag',
      'Whole wheat flour, butter (milk), honey, brown sugar, cinnamon, baking soda, salt',
      'Golden grahams finished with cinnamon sugar.',
    ],
    [
      'Chocolate-Dipped Grahams',
      1000,
      '6 oz bag',
      'Wheat flour, butter (milk), honey, brown sugar, dark chocolate (soy), salt',
      'Honey grahams dipped in dark chocolate for a crisp, rich snack.',
    ],
    [
      'Campfire S’mores Kit',
      1800,
      'kit for four',
      'Wheat flour, butter (milk), honey, chocolate (milk, soy), marshmallows (gelatin)',
      'Graham squares, chocolate and marshmallows packed for four fireside treats.',
    ],
    [
      'Vanilla Graham Squares',
      850,
      '6 oz bag',
      'Wheat flour, butter (milk), honey, vanilla, brown sugar, salt',
      'Small graham squares with a soft vanilla aroma.',
    ],
    [
      'Cocoa Graham Crackers',
      900,
      '6 oz bag',
      'Wheat flour, butter (milk), cocoa, honey, brown sugar, salt',
      'Deep cocoa grahams with a clean, crunchy finish.',
    ],
    [
      'Maple Graham Crackers',
      900,
      '6 oz bag',
      'Wheat flour, butter (milk), maple syrup, brown sugar, salt',
      'Maple-sweetened grahams baked until crisp at the edges.',
    ],
    [
      'Orange Zest Grahams',
      900,
      '6 oz bag',
      'Wheat flour, butter (milk), honey, orange zest, brown sugar, salt',
      'Crisp grahams brightened with orange zest.',
    ],
    [
      'Ginger Spice Grahams',
      900,
      '6 oz bag',
      'Wheat flour, butter (milk), honey, ginger, cinnamon, molasses, salt',
      'A warmly spiced graham with ginger and molasses.',
    ],
    [
      'Sea Salt Graham Bites',
      850,
      '5 oz bag',
      'Wheat flour, butter (milk), honey, brown sugar, sea salt',
      'Bite-size grahams with a light sprinkle of flaky salt.',
    ],
    [
      'Pecan Graham Bites',
      1000,
      '5 oz bag',
      'Wheat flour, butter (milk), pecans, honey, brown sugar, salt',
      'Small graham bites with toasted pecan pieces.',
    ],
    [
      'Coconut Graham Crackers',
      950,
      '6 oz bag',
      'Wheat flour, butter (milk), coconut, honey, brown sugar, salt',
      'Crisp honey grahams with shredded coconut.',
    ],
    [
      'Dark Chocolate Sea Salt Grahams',
      1100,
      '6 oz bag',
      'Wheat flour, butter (milk), honey, dark chocolate (soy), sea salt',
      'Dark-chocolate grahams finished with a little sea salt.',
    ],
    [
      'Milk Chocolate Grahams',
      1000,
      '6 oz bag',
      'Wheat flour, butter (milk), honey, milk chocolate (milk, soy), salt',
      'Golden grahams coated on one side with smooth milk chocolate.',
    ],
    [
      'Graham Cracker Crumbs',
      700,
      '8 oz bag',
      'Wheat flour, butter (milk), honey, brown sugar, salt',
      'Finely crushed grahams ready for pie crusts and dessert toppings.',
    ],
    [
      'Honey Graham Family Bag',
      1500,
      '12 oz bag',
      'Whole wheat flour, butter (milk), honey, brown sugar, baking soda, salt',
      'A larger bag of the classic honey grahams for lunchboxes and sharing.',
    ],
    [
      'Graham Tasting Trio',
      2200,
      'three 4 oz bags',
      'Wheat flour, butter (milk), honey, cinnamon, cocoa, brown sugar, salt',
      'Classic honey, cinnamon and cocoa grahams packed in three separate bags.',
    ],
    [
      'Chocolate Marshmallow Sandwiches',
      1200,
      'four sandwiches',
      'Wheat flour, butter (milk), honey, marshmallow (gelatin), chocolate (milk, soy)',
      'Graham sandwiches layered with marshmallow and chocolate.',
    ],
  ],
);
pools.pickles = rows('fermented', 'pickles', cold, undefined, [
  [
    'Garlic Dill Pickles',
    1000,
    '16 oz jar',
    'Cucumber, water, vinegar, garlic, dill, salt',
    'Crunchy cucumber spears with garlic and plenty of dill.',
  ],
  [
    'Spicy Pickle Spears',
    1100,
    '16 oz jar',
    'Cucumber, water, vinegar, jalapeño, garlic, dill, salt',
    'Dill pickle spears with a medium jalapeño heat.',
  ],
  [
    'Classic Sauerkraut',
    1000,
    '16 oz jar',
    'Green cabbage, salt',
    'Finely shredded cabbage fermented for a tangy, crisp bite.',
    'pickled-mixed',
  ],
  [
    'Pickled Market Vegetables',
    1100,
    '16 oz jar',
    'Carrot, cauliflower, cucumber, vinegar, water, garlic, salt',
    'A colorful mix of crunchy vegetables in a savory pickling brine.',
    'pickled-mixed',
  ],
  [
    'Bread & Butter Pickles',
    1000,
    '16 oz jar',
    'Cucumber, onion, vinegar, water, sugar, mustard seed, salt',
    'Sweet-tart cucumber slices with onion and mustard seed.',
  ],
  [
    'Extra Garlic Pickle Chips',
    1100,
    '16 oz jar',
    'Cucumber, water, vinegar, garlic, dill, salt',
    'Thin cucumber chips with a bold garlic flavor.',
  ],
  [
    'Hot Habanero Pickles',
    1200,
    '16 oz jar',
    'Cucumber, vinegar, water, habanero, garlic, salt',
    'A hot pickle with fruity habanero heat and a firm crunch.',
  ],
  [
    'Pickled Red Onions',
    900,
    '12 oz jar',
    'Red onion, vinegar, water, sugar, salt',
    'Bright, thin onion slices for tacos, sandwiches and grain bowls.',
    'pickled-mixed',
  ],
  [
    'Dilly Pickled Carrots',
    1000,
    '16 oz jar',
    'Carrot, vinegar, water, dill, garlic, salt',
    'Carrot sticks with a dill brine and a satisfying snap.',
    'pickled-mixed',
  ],
  [
    'Pickled Green Beans',
    1100,
    '16 oz jar',
    'Green beans, vinegar, water, garlic, dill, salt',
    'Crisp green beans pickled with garlic and dill.',
    'pickled-mixed',
  ],
  [
    'Pickled Jalapeño Rings',
    1000,
    '12 oz jar',
    'Jalapeño, carrot, vinegar, water, garlic, salt',
    'Sliced jalapeños and carrot rounds for a punchy taco topping.',
    'pickled-mixed',
  ],
  [
    'Pickled Cauliflower',
    1100,
    '16 oz jar',
    'Cauliflower, vinegar, water, turmeric, garlic, salt',
    'Cauliflower florets in a golden turmeric brine.',
    'pickled-mixed',
  ],
  [
    'Caraway Sauerkraut',
    1100,
    '16 oz jar',
    'Green cabbage, salt, caraway seed',
    'Tangy cabbage with the warm, aromatic flavor of caraway.',
    'pickled-mixed',
  ],
  [
    'Red Cabbage Kraut',
    1100,
    '16 oz jar',
    'Red cabbage, salt',
    'Ruby-colored fermented cabbage for sandwiches and grain bowls.',
    'pickled-mixed',
  ],
  [
    'Ginger Carrot Kraut',
    1200,
    '16 oz jar',
    'Green cabbage, carrot, ginger, salt',
    'A bright cabbage ferment with carrot sweetness and fresh ginger.',
    'pickled-mixed',
  ],
  [
    'Sweet Pickle Relish',
    900,
    '12 oz jar',
    'Cucumber, onion, vinegar, water, sugar, mustard seed, salt',
    'Finely chopped sweet pickles for burgers and potato salads.',
  ],
  [
    'Dill Pickle Snack Cups',
    600,
    '8 oz cup',
    'Cucumber, vinegar, water, dill, garlic, salt',
    'A ready-to-eat cup of chilled dill pickle chips.',
  ],
  [
    'Pickle Pantry Trio',
    2800,
    'three 12 oz jars',
    'Cucumber, carrot, red onion, vinegar, water, dill, garlic, sugar, salt',
    'Garlic dills, pickled carrots and red onions packed as a three-jar set.',
    'pickled-mixed',
  ],
]);
pools.kimchi = rows(
  'fermented',
  'kimchi',
  cold,
  'Contains fish unless explicitly marked plant-based. Some recipes contain soy or sesame as listed.',
  [
    [
      'Classic Napa Cabbage Kimchi',
      1200,
      '16 oz jar',
      'Napa cabbage, radish, gochugaru, garlic, ginger, fish sauce (anchovy), rice flour, salt',
      'Traditional red cabbage kimchi with garlic, ginger and a medium chile heat.',
    ],
    [
      'Vegan Napa Kimchi',
      1200,
      '16 oz jar',
      'Napa cabbage, radish, gochugaru, garlic, ginger, rice flour, salt',
      'A plant-based cabbage ferment with a savory vegetable seasoning.',
    ],
    [
      'Radish Kimchi',
      1100,
      '16 oz jar',
      'Korean radish, gochugaru, garlic, ginger, fish sauce (anchovy), salt',
      'Crunchy radish cubes with bright red chile and garlic.',
    ],
    [
      'Kimchi Fried Rice Kit',
      1400,
      'kit for two',
      'Cooked rice, napa kimchi (fish), soy sauce (soy, wheat), sesame oil, scallion',
      'Portioned rice and kimchi with sesame seasoning for a quick skillet dinner.',
    ],
    [
      'Extra Spicy Napa Kimchi',
      1300,
      '16 oz jar',
      'Napa cabbage, radish, gochugaru, fresh chili, garlic, ginger, fish sauce (anchovy), salt',
      'An assertive cabbage kimchi with an extra helping of chile.',
    ],
    [
      'Mild Napa Kimchi',
      1200,
      '16 oz jar',
      'Napa cabbage, radish, mild gochugaru, garlic, ginger, fish sauce (anchovy), salt',
      'A gentler cabbage kimchi with less chile and a rounded garlic flavor.',
    ],
    [
      'White Kimchi',
      1300,
      '16 oz jar',
      'Napa cabbage, Korean radish, pear, garlic, ginger, salt',
      'A plant-based, chile-free cabbage kimchi with pear and ginger.',
    ],
    [
      'Cucumber Kimchi',
      1200,
      '16 oz jar',
      'Cucumber, garlic chive, gochugaru, garlic, ginger, fish sauce (anchovy), salt',
      'Crisp cucumber pieces in a savory red-chile dressing.',
    ],
    [
      'Scallion Kimchi',
      1400,
      '12 oz jar',
      'Scallion, gochugaru, garlic, ginger, fish sauce (anchovy), rice flour, salt',
      'Long scallions coated in a lively garlic and chile seasoning.',
    ],
    [
      'Bok Choy Kimchi',
      1300,
      '16 oz jar',
      'Bok choy, radish, gochugaru, garlic, ginger, salt',
      'Plant-based bok choy kimchi with tender leaves and crunchy stems.',
    ],
    [
      'Carrot Radish Kimchi',
      1200,
      '16 oz jar',
      'Carrot, Korean radish, gochugaru, garlic, ginger, fish sauce (anchovy), salt',
      'A crunchy root-vegetable kimchi with a naturally sweet finish.',
    ],
    [
      'Garlic Chive Kimchi',
      1400,
      '12 oz jar',
      'Garlic chive, gochugaru, garlic, ginger, fish sauce (anchovy), rice flour, salt',
      'Tender garlic chives with a bold, savory red-chile coating.',
    ],
    [
      'Napa Kimchi Family Jar',
      2200,
      '32 oz jar',
      'Napa cabbage, radish, gochugaru, garlic, ginger, fish sauce (anchovy), rice flour, salt',
      'A larger jar of the classic cabbage kimchi for everyday meals.',
    ],
    [
      'Vegan Kimchi Family Jar',
      2200,
      '32 oz jar',
      'Napa cabbage, radish, gochugaru, garlic, ginger, rice flour, salt',
      'A family-size jar of the plant-based cabbage recipe.',
    ],
    [
      'Kimchi Pancake Kit',
      1600,
      'kit for two',
      'Wheat flour, napa kimchi (fish), scallion, rice flour, soy sauce (soy, wheat), sesame oil',
      'Kimchi, pancake mix and dipping sauce for two crisp skillet pancakes.',
    ],
    [
      'Kimchi Stew Starter',
      1500,
      '16 oz pouch',
      'Napa kimchi (fish), onion, garlic, gochugaru, vegetable stock, salt',
      'A tangy stew base ready for tofu, vegetables or your preferred protein.',
    ],
    [
      'Kimchi Tasting Set',
      2600,
      'three 8 oz jars',
      'Napa cabbage, Korean radish, cucumber, gochugaru, garlic, ginger, fish sauce (anchovy), salt',
      'A three-jar selection of classic napa, radish and cucumber kimchi.',
    ],
    [
      'Ginger Pear White Kimchi',
      1400,
      '16 oz jar',
      'Napa cabbage, pear, radish, ginger, garlic, salt',
      'Mild, plant-based white kimchi with extra pear and ginger.',
    ],
  ],
);
pools.bakery = rows(
  'bakery',
  'bread',
  baked,
  'Contains wheat. Recipes with butter, cream or cheese contain milk; enriched doughs contain eggs. Made in a kitchen handling nuts.',
  [
    [
      'Country Bread Loaf',
      1000,
      'one 800 g loaf',
      'Wheat flour, water, sourdough starter, sea salt',
      'A crusty everyday loaf with a soft, open crumb.',
    ],
    [
      'Rosemary Focaccia',
      900,
      'one 8-inch round',
      'Wheat flour, water, olive oil, rosemary, yeast, sea salt',
      'Olive-oil focaccia with rosemary and a light sprinkle of sea salt.',
      'focaccia',
    ],
    [
      'Classic Sourdough Boule',
      1200,
      'one 900 g loaf',
      'Wheat flour, water, sourdough starter, sea salt',
      'Slow-fermented sourdough with a crisp crust and a gently tangy crumb.',
    ],
    [
      'Whole Wheat Sourdough',
      1200,
      'one 900 g loaf',
      'Whole wheat flour, wheat flour, water, sourdough starter, sea salt',
      'A hearty whole-grain loaf with a rich, wheaty flavor.',
    ],
    [
      'Jalapeño Cheddar Sourdough',
      1400,
      'one 900 g loaf',
      'Wheat flour, water, sourdough starter, cheddar cheese (milk), jalapeño, sea salt',
      'A savory sourdough with pockets of cheddar and a gentle chile warmth.',
    ],
    [
      'Seeded Sandwich Loaf',
      1100,
      'one 750 g loaf',
      'Wheat flour, water, sunflower seed, flaxseed, sesame, yeast, olive oil, salt',
      'A soft sandwich loaf with a toasted seed crust.',
    ],
    [
      'Olive Country Loaf',
      1300,
      'one 800 g loaf',
      'Wheat flour, water, sourdough starter, green olives, black olives, sea salt',
      'A rustic loaf studded with briny olives.',
    ],
    [
      'Roasted Garlic Sourdough',
      1400,
      'one 900 g loaf',
      'Wheat flour, water, sourdough starter, roasted garlic, olive oil, sea salt',
      'A golden sourdough with sweet roasted garlic folded into the dough.',
    ],
    [
      'Cranberry Walnut Bread',
      1400,
      'one 800 g loaf',
      'Wheat flour, water, sourdough starter, dried cranberry, walnut, sea salt',
      'Chewy cranberries and toasted walnuts make a flavorful breakfast loaf.',
    ],
    [
      'French Baguette',
      600,
      'one 350 g baguette',
      'Wheat flour, water, yeast, sea salt',
      'A slender loaf with a crackly crust and tender center.',
    ],
    [
      'Dinner Rolls',
      800,
      'six rolls',
      'Wheat flour, milk, butter (milk), egg, sugar, yeast, salt',
      'Soft, lightly enriched rolls for weeknight dinners and holiday tables.',
    ],
    [
      'Cinnamon Swirl Loaf',
      1300,
      'one 750 g loaf',
      'Wheat flour, milk, egg, butter (milk), sugar, cinnamon, yeast, salt',
      'A tender loaf with a ribbon of cinnamon sugar in every slice.',
    ],
    [
      'Butter Croissants',
      1600,
      'four croissants',
      'Wheat flour, butter (milk), milk, sugar, yeast, egg, salt',
      'Flaky butter pastries with a golden shell and airy center.',
      'croissant',
    ],
    [
      'Chocolate Croissants',
      1800,
      'four pastries',
      'Wheat flour, butter (milk), milk, dark chocolate (soy), sugar, yeast, egg, salt',
      'Laminated butter pastries wrapped around a dark chocolate center.',
      'croissant',
    ],
    [
      'Blueberry Muffins',
      1200,
      'four muffins',
      'Wheat flour, blueberry, milk, butter (milk), egg, sugar, baking powder, salt',
      'Soft blueberry muffins with a tender crumb and lightly golden tops.',
      'muffin',
    ],
    [
      'Cinnamon Morning Buns',
      1600,
      'four buns',
      'Wheat flour, milk, butter (milk), egg, sugar, cinnamon, yeast, salt',
      'Soft spirals of enriched dough layered with cinnamon sugar.',
      'croissant',
    ],
    [
      'Stone-Ground Bread Flour',
      900,
      '2 lb bag',
      'Stone-ground wheat flour',
      'A bread-baking flour with a hearty wheat flavor.',
      'bread',
    ],
    [
      'Pizza Dough Balls',
      800,
      'two 12 oz dough balls',
      'Wheat flour, water, olive oil, yeast, sea salt',
      'Two chilled dough balls for an easy homemade pizza night.',
      'focaccia',
    ],
  ],
);
pools.cookies = rows(
  'desserts',
  'cookies',
  baked,
  'Contains wheat, milk and eggs. Nut recipes contain the named nuts; chocolate may contain soy.',
  [
    [
      'Chocolate Chip Cookies',
      1200,
      'six cookies',
      'Wheat flour, butter (milk), chocolate chips (soy), brown sugar, egg, vanilla, baking soda, salt',
      'Soft-centered cookies with crisp edges and plenty of chocolate chips.',
    ],
    [
      'Fudge Brownies',
      1400,
      'four brownies',
      'Butter (milk), sugar, dark chocolate (soy), egg, wheat flour, cocoa, salt',
      'Dense chocolate brownies with a thin, crackly top.',
      'brownies',
    ],
    [
      'Banana Bread',
      1200,
      'one 600 g loaf',
      'Banana, wheat flour, butter (milk), egg, brown sugar, baking soda, salt',
      'A moist banana loaf with a mellow brown-sugar sweetness.',
      'bread',
    ],
    [
      'Blueberry Muffins',
      1200,
      'four muffins',
      'Wheat flour, blueberry, butter (milk), milk, egg, sugar, baking powder, salt',
      'Tender muffins dotted with blueberries and finished with a light sugar top.',
      'muffin',
    ],
    [
      'Oatmeal Raisin Cookies',
      1200,
      'six cookies',
      'Wheat flour, oats, raisins, butter (milk), egg, brown sugar, cinnamon, salt',
      'Chewy oat cookies with plump raisins and cinnamon.',
    ],
    [
      'Peanut Butter Cookies',
      1200,
      'six cookies',
      'Wheat flour, peanut butter, butter (milk), egg, sugar, baking soda, salt',
      'Classic crisscross cookies with a rich peanut-butter flavor.',
    ],
    [
      'Double Chocolate Cookies',
      1400,
      'six cookies',
      'Wheat flour, cocoa, chocolate chips (soy), butter (milk), egg, sugar, salt',
      'Soft cocoa cookies loaded with dark chocolate pieces.',
    ],
    [
      'Lemon Sugar Cookies',
      1200,
      'six cookies',
      'Wheat flour, butter (milk), egg, sugar, lemon zest, lemon juice, salt',
      'Bright lemon cookies with a fine sugar coating.',
    ],
    [
      'Snickerdoodles',
      1200,
      'six cookies',
      'Wheat flour, butter (milk), egg, sugar, cinnamon, cream of tartar, salt',
      'Soft cinnamon-sugar cookies with the traditional lightly tangy finish.',
    ],
    [
      'Pecan Chocolate Cookies',
      1400,
      'six cookies',
      'Wheat flour, pecan, chocolate chips (soy), butter (milk), egg, brown sugar, salt',
      'Toasted pecans and chocolate in a buttery brown-sugar cookie.',
    ],
    [
      'Salted Caramel Brownies',
      1600,
      'four brownies',
      'Wheat flour, cocoa, dark chocolate (soy), butter (milk), cream (milk), egg, sugar, salt',
      'Fudgy brownies with a caramel swirl and a little flaky salt.',
      'brownies',
    ],
    [
      'Walnut Brownies',
      1600,
      'four brownies',
      'Wheat flour, cocoa, dark chocolate (soy), butter (milk), egg, walnut, sugar, salt',
      'Dense chocolate brownies with chopped walnuts throughout.',
      'brownies',
    ],
    [
      'Lemon Poppy Seed Loaf',
      1400,
      'one 600 g loaf',
      'Wheat flour, butter (milk), egg, sugar, lemon juice, lemon zest, poppy seed, salt',
      'A tender loaf with bright lemon flavor and a fine poppy-seed crumb.',
      'bread',
    ],
    [
      'Chocolate Banana Loaf',
      1400,
      'one 600 g loaf',
      'Banana, wheat flour, cocoa, chocolate chips (soy), butter (milk), egg, sugar, salt',
      'Banana bread with cocoa and scattered chocolate chips.',
      'bread',
    ],
    [
      'Orange Cranberry Muffins',
      1300,
      'four muffins',
      'Wheat flour, cranberry, orange zest, orange juice, butter (milk), milk, egg, sugar, salt',
      'A soft muffin with tart cranberries and fragrant orange zest.',
      'muffin',
    ],
    [
      'Morning Glory Muffins',
      1400,
      'four muffins',
      'Wheat flour, carrot, apple, raisin, walnut, egg, vegetable oil, sugar, cinnamon, salt',
      'Carrot-and-apple muffins with raisins, walnuts and warm spice.',
      'muffin',
    ],
    [
      'Cookie Share Box',
      2200,
      'twelve cookies',
      'Wheat flour, butter (milk), egg, sugar, chocolate (soy), oats, raisin, cinnamon, salt',
      'An assortment of chocolate chip, oatmeal raisin and snickerdoodle cookies.',
    ],
    [
      'Brownie Bite Box',
      1800,
      'twelve bite-size pieces',
      'Wheat flour, butter (milk), egg, cocoa, chocolate (soy), sugar, salt',
      'Small squares of rich fudge brownie, ready to share.',
      'brownies',
    ],
  ],
);
pools.catering = rows(
  'prepared',
  'cheese-board',
  cold,
  'Contains wheat and milk. Selected recipes contain eggs, sesame or nuts as listed.',
  [
    [
      'Rosemary Focaccia',
      900,
      'one 8-inch round',
      'Wheat flour, water, olive oil, rosemary, yeast, sea salt',
      'Soft olive-oil focaccia with rosemary and sea salt.',
      'focaccia',
    ],
    [
      'Country Bread Loaf',
      1000,
      'one 800 g loaf',
      'Wheat flour, water, sourdough starter, sea salt',
      'A golden country loaf for slicing, toasting and serving at the table.',
      'bread',
    ],
    [
      'Farmhouse Cheddar',
      1000,
      '8 oz wedge',
      'Pasteurized milk, cheese cultures, salt, enzymes',
      'A firm cheddar with a smooth texture and a balanced, savory finish.',
    ],
    [
      'Picnic Bread & Cheese Box',
      2200,
      'box for two',
      'Wheat bread, cheddar cheese (milk), grapes, crackers (wheat), honey',
      'Sliced bread, cheddar, fresh grapes and crackers packed for a market picnic.',
    ],
    [
      'Market Grazing Box',
      2800,
      'box for two',
      'Cheddar (milk), soft cheese (milk), crackers (wheat), grapes, olives, almonds',
      'A generous mix of cheese, fruit, olives and crackers for sharing.',
    ],
    [
      'Family Grazing Board',
      5400,
      'tray for four',
      'Cheddar (milk), soft cheese (milk), crackers (wheat), grapes, berries, olives, almonds',
      'A larger grazing tray with cheeses, fresh fruit and savory accompaniments.',
    ],
    [
      'Herb Cream Cheese Spread',
      800,
      '8 oz tub',
      'Cream cheese (milk), parsley, chive, dill, lemon juice, sea salt',
      'A soft cheese spread with fresh herbs and lemon.',
    ],
    [
      'Roasted Red Pepper Hummus',
      800,
      '8 oz tub',
      'Chickpea, red pepper, tahini (sesame), olive oil, lemon juice, garlic, salt',
      'Smooth chickpea hummus with sweet roasted pepper and tahini.',
    ],
    [
      'Lemon Herb Hummus',
      800,
      '8 oz tub',
      'Chickpea, tahini (sesame), lemon juice, olive oil, parsley, garlic, salt',
      'Bright lemon hummus with parsley and a mild garlic finish.',
    ],
    [
      'Seasonal Vegetable Platter',
      2400,
      'tray for four',
      'Carrot, cucumber, bell pepper, cherry tomato, hummus (sesame)',
      'Fresh-cut vegetables with a tub of hummus for dipping.',
      'carrots',
    ],
    [
      'Tomato Basil Sandwich Box',
      1500,
      'one sandwich and side',
      'Wheat bread, tomato, mozzarella (milk), basil, olive oil, sea salt, grapes',
      'Tomato, mozzarella and basil on country bread with a side of grapes.',
    ],
    [
      'Chicken Salad Sandwich Box',
      1700,
      'one sandwich and side',
      'Wheat bread, cooked chicken, mayonnaise (egg), celery, lemon, lettuce, grapes',
      'A chicken salad sandwich on soft bread, packed with fresh grapes.',
    ],
    [
      'Roasted Vegetable Focaccia Box',
      1600,
      'one sandwich and side',
      'Wheat focaccia, zucchini, pepper, onion, olive oil, hummus (sesame), grapes',
      'Roasted vegetables and hummus layered into rosemary focaccia.',
      'focaccia',
    ],
    [
      'Herbed Pasta Salad',
      900,
      '12 oz tub',
      'Wheat pasta, tomato, cucumber, olive oil, lemon juice, parsley, salt',
      'A chilled pasta salad tossed with vegetables and lemon-herb dressing.',
    ],
    [
      'Lemon Quinoa Salad',
      1000,
      '12 oz tub',
      'Quinoa, cucumber, parsley, tomato, chickpea, olive oil, lemon juice, salt',
      'A bright quinoa salad with chickpeas and chopped vegetables.',
    ],
    [
      'Breakfast Pastry Box',
      2600,
      'six pastries',
      'Wheat flour, butter (milk), milk, egg, sugar, yeast, chocolate (soy), salt',
      'A six-piece mix of butter and chocolate pastries for a shared breakfast.',
      'croissant',
    ],
    [
      'Olive & Herb Focaccia',
      1100,
      'one 8-inch round',
      'Wheat flour, water, olives, olive oil, rosemary, yeast, sea salt',
      'A tender focaccia topped with olives and fragrant rosemary.',
      'focaccia',
    ],
    [
      'Cheese & Preserve Pairing',
      1800,
      'one pairing box',
      'Cheddar (milk), strawberry preserves, wheat crackers',
      'A wedge of cheddar, a small jar of preserves and crisp crackers.',
    ],
  ],
);
pools.coffee = rows('drinks', 'coffee-beans', dry, undefined, [
  [
    'Last Watch House Blend',
    1800,
    '12 oz bag, whole bean',
    'Roasted coffee',
    'A balanced medium roast with cocoa, toasted nut and brown-sugar notes.',
  ],
  [
    'Midnight Dark Roast',
    1800,
    '12 oz bag, whole bean',
    'Roasted coffee',
    'A full-bodied dark roast with bittersweet cocoa and a smooth finish.',
  ],
  [
    'Cold Brew Concentrate',
    1400,
    '16 fl oz bottle',
    'Filtered water, coffee',
    'A smooth concentrate brewed cold; dilute one part concentrate with one part water or milk.',
    'coffee-cup',
  ],
  [
    'Freshly Brewed Coffee',
    400,
    '12 fl oz cup',
    'Filtered water, coffee',
    'A fresh cup of the house medium roast, served black.',
    'coffee-cup',
  ],
  [
    'Dawn Light Roast',
    1900,
    '12 oz bag, whole bean',
    'Roasted coffee',
    'A bright light roast with lively citrus and honeyed tasting notes.',
  ],
  [
    'Colombia Single Origin',
    2000,
    '12 oz bag, whole bean',
    'Roasted Colombian coffee',
    'A medium roast with caramel sweetness and a clean apple-like finish.',
  ],
  [
    'Guatemala Single Origin',
    2000,
    '12 oz bag, whole bean',
    'Roasted Guatemalan coffee',
    'A rounded roast with cocoa, orange peel and toasted-sugar notes.',
  ],
  [
    'Ethiopia Light Roast',
    2200,
    '12 oz bag, whole bean',
    'Roasted Ethiopian coffee',
    'A fragrant light roast with floral aromas and a berry-like finish.',
  ],
  [
    'Brazil Smooth Roast',
    1900,
    '12 oz bag, whole bean',
    'Roasted Brazilian coffee',
    'A low-key, nutty roast with chocolate notes for everyday brewing.',
  ],
  [
    'Decaf Evening Blend',
    2000,
    '12 oz bag, whole bean',
    'Decaffeinated roasted coffee',
    'A gentle decaf roast with cocoa and soft caramel notes.',
  ],
  [
    'Espresso Blend',
    2000,
    '12 oz bag, whole bean',
    'Roasted coffee',
    'A rich blend developed for espresso with a sweet, chocolate-led finish.',
  ],
  [
    'House Blend Ground Coffee',
    1800,
    '12 oz bag, medium grind',
    'Ground roasted coffee',
    'The house medium roast ground for drip brewers and pour-over cones.',
  ],
  [
    'Dark Roast Ground Coffee',
    1800,
    '12 oz bag, medium grind',
    'Ground roasted coffee',
    'A full-bodied dark roast ground for everyday filter brewing.',
  ],
  [
    'Decaf Ground Coffee',
    2000,
    '12 oz bag, medium grind',
    'Ground decaffeinated roasted coffee',
    'A medium-grind decaf for a mellow evening cup.',
  ],
  [
    'Cold Brew Bottle',
    600,
    '12 fl oz bottle',
    'Filtered water, coffee',
    'Ready-to-drink black cold brew with a smooth, mellow finish.',
    'coffee-cup',
  ],
  [
    'Coffee Tasting Flight',
    2400,
    'three 4 oz bags, whole bean',
    'Roasted coffee',
    'Small bags of light, medium and dark roast for comparing brew styles.',
  ],
  [
    'House Blend Family Bag',
    3600,
    '2 lb bag, whole bean',
    'Roasted coffee',
    'A larger bag of the balanced medium roast for a busy coffee kitchen.',
  ],
  [
    'Weekend Espresso Roast',
    2100,
    '12 oz bag, whole bean',
    'Roasted coffee',
    'A medium-dark espresso roast with a rounded body and lingering cocoa finish.',
  ],
]);
pools.cafe = rows(
  'bakery',
  'biscotti',
  dry,
  'Biscotti contain wheat, milk and eggs; almond or nut flavors contain the named nuts.',
  [
    [
      'Cafe Drip Coffee',
      400,
      '12 fl oz cup',
      'Filtered water, coffee',
      'A fresh cup of medium-roast coffee, brewed throughout the morning.',
      'coffee-cup',
    ],
    [
      'Iced Coffee',
      500,
      '16 fl oz cup',
      'Filtered water, coffee, ice',
      'Chilled black coffee poured over ice for a clean, refreshing cup.',
      'coffee-cup',
    ],
    [
      'Almond Biscotti',
      1000,
      'six biscotti',
      'Wheat flour, almond, sugar, butter (milk), egg, vanilla, salt',
      'Twice-baked almond cookies with a crisp texture made for dunking.',
    ],
    [
      'Chocolate Orange Biscotti',
      1100,
      'six biscotti',
      'Wheat flour, cocoa, dark chocolate (soy), orange zest, sugar, butter (milk), egg, salt',
      'Cocoa biscotti with fragrant orange zest and dark chocolate.',
    ],
    [
      'Vanilla Bean Biscotti',
      1000,
      'six biscotti',
      'Wheat flour, sugar, butter (milk), egg, vanilla bean, salt',
      'Crisp, delicately sweet biscotti with vanilla bean.',
    ],
    [
      'Pistachio Biscotti',
      1200,
      'six biscotti',
      'Wheat flour, pistachio, sugar, butter (milk), egg, vanilla, salt',
      'Nutty pistachio biscotti with a clean, buttery finish.',
    ],
    [
      'Cranberry Almond Biscotti',
      1100,
      'six biscotti',
      'Wheat flour, almond, dried cranberry, sugar, butter (milk), egg, salt',
      'Tart cranberry and toasted almonds in a crisp twice-baked cookie.',
    ],
    [
      'Espresso Chocolate Biscotti',
      1100,
      'six biscotti',
      'Wheat flour, espresso, chocolate (soy), sugar, butter (milk), egg, salt',
      'Coffee-scented biscotti with small chocolate pieces.',
    ],
    [
      'Lemon Poppy Seed Biscotti',
      1100,
      'six biscotti',
      'Wheat flour, lemon zest, poppy seed, sugar, butter (milk), egg, salt',
      'A bright lemon cookie with a delicate poppy-seed crunch.',
    ],
    [
      'Hazelnut Cocoa Biscotti',
      1200,
      'six biscotti',
      'Wheat flour, hazelnut, cocoa, sugar, butter (milk), egg, salt',
      'Rich cocoa biscotti with toasted hazelnuts throughout.',
    ],
    [
      'Cinnamon Pecan Biscotti',
      1200,
      'six biscotti',
      'Wheat flour, pecan, cinnamon, sugar, butter (milk), egg, salt',
      'A warmly spiced cookie with toasted pecan pieces.',
    ],
    [
      'Coconut Biscotti',
      1100,
      'six biscotti',
      'Wheat flour, coconut, sugar, butter (milk), egg, vanilla, salt',
      'Toasted coconut folded into a light, crisp biscotti dough.',
    ],
    [
      'Dark Chocolate Dipped Biscotti',
      1300,
      'six biscotti',
      'Wheat flour, almond, dark chocolate (soy), sugar, butter (milk), egg, salt',
      'Almond biscotti dipped in a smooth dark-chocolate coating.',
    ],
    [
      'Biscotti Tasting Box',
      2200,
      'twelve biscotti',
      'Wheat flour, almond, chocolate (soy), orange zest, butter (milk), egg, sugar, salt',
      'Four each of almond, chocolate orange and vanilla biscotti.',
    ],
    [
      'Coffee & Biscotti Pairing',
      1200,
      '12 fl oz coffee and four biscotti',
      'Filtered water, coffee, wheat flour, almond, sugar, butter (milk), egg, salt',
      'A fresh brewed coffee with four almond biscotti packed alongside.',
    ],
    [
      'Cafe House Beans',
      1800,
      '12 oz bag, whole bean',
      'Roasted coffee',
      'The café medium-roast blend with a balanced cocoa and caramel profile.',
      'coffee-beans',
    ],
    [
      'Bottled Cold Brew',
      600,
      '12 fl oz bottle',
      'Filtered water, coffee',
      'Ready-to-drink black coffee brewed slowly in cold water.',
      'coffee-cup',
    ],
    [
      'Orange Almond Biscotti',
      1200,
      'six biscotti',
      'Wheat flour, almond, orange zest, sugar, butter (milk), egg, salt',
      'Toasted almond biscotti brightened with fresh orange zest.',
    ],
  ],
);
pools.skin = rows(
  'skincare',
  'balm',
  dry,
  'For external use. Check the ingredient list for sensitivities; discontinue use if irritation occurs.',
  [
    [
      'Unscented Tallow Balm',
      2200,
      '2 oz glass jar',
      'Rendered beef tallow, jojoba oil, beeswax',
      'A simple, unscented balm that softens with the warmth of your hands.',
    ],
    [
      'Lavender Tallow Balm',
      2400,
      '2 oz glass jar',
      'Rendered beef tallow, jojoba oil, beeswax, lavender essential oil',
      'A rich daily balm with a light lavender scent.',
      'balm-herbal',
    ],
    [
      'Tallow Lip Balm',
      600,
      '0.15 oz tube',
      'Rendered beef tallow, beeswax, jojoba oil',
      'A smooth, unscented lip balm in a pocket-size tube.',
    ],
    [
      'Tallow Hand Salve',
      1800,
      '1 oz tin',
      'Rendered beef tallow, beeswax, olive oil',
      'A firm salve for hands that softens on contact with warm skin.',
    ],
    [
      'Whipped Tallow Body Butter',
      2800,
      '4 oz glass jar',
      'Rendered beef tallow, jojoba oil',
      'A light, whipped body butter with a short, unscented ingredient list.',
    ],
    [
      'Vanilla Tallow Balm',
      2400,
      '2 oz glass jar',
      'Rendered beef tallow, jojoba oil, beeswax, vanilla-infused jojoba oil',
      'A buttery balm with the soft aroma of vanilla.',
      'balm-herbal',
    ],
    [
      'Calendula Tallow Balm',
      2600,
      '2 oz glass jar',
      'Rendered beef tallow, calendula-infused olive oil, beeswax',
      'A smooth balm made with calendula-infused olive oil.',
      'balm-herbal',
    ],
    [
      'Chamomile Tallow Balm',
      2600,
      '2 oz glass jar',
      'Rendered beef tallow, chamomile-infused olive oil, beeswax',
      'An herbal balm with a mellow chamomile aroma.',
      'balm-herbal',
    ],
    [
      'Cedarwood Tallow Balm',
      2400,
      '2 oz glass jar',
      'Rendered beef tallow, jojoba oil, beeswax, cedarwood essential oil',
      'A rich skin balm with a warm, woody scent.',
    ],
    [
      'Citrus Tallow Body Balm',
      2400,
      '2 oz glass jar',
      'Rendered beef tallow, jojoba oil, beeswax, sweet orange essential oil',
      'A soft body balm with a bright sweet-orange aroma.',
      'balm-herbal',
    ],
    [
      'Unscented Travel Balm',
      1200,
      '0.5 oz tin',
      'Rendered beef tallow, jojoba oil, beeswax',
      'The everyday unscented balm in a compact travel tin.',
    ],
    [
      'Vanilla Lip Balm',
      650,
      '0.15 oz tube',
      'Rendered beef tallow, beeswax, vanilla-infused jojoba oil',
      'A pocket-size lip balm with a soft vanilla scent.',
    ],
    [
      'Peppermint Lip Balm',
      650,
      '0.15 oz tube',
      'Rendered beef tallow, beeswax, jojoba oil, peppermint essential oil',
      'A smooth lip balm with a light peppermint finish.',
    ],
    [
      'Tallow Cuticle Balm',
      1000,
      '0.5 oz tin',
      'Rendered beef tallow, jojoba oil, beeswax',
      'A firm balm designed to be worked into dry cuticles.',
    ],
    [
      'Gardeners Hand Balm',
      2000,
      '2 oz tin',
      'Rendered beef tallow, olive oil, beeswax, rosemary essential oil',
      'A substantial hand balm with an herbal rosemary scent.',
      'balm-herbal',
    ],
    [
      'Unscented Tallow Soap',
      900,
      '4 oz bar',
      'Saponified beef tallow, saponified coconut oil, water, glycerin',
      'A firm, unscented soap bar with a creamy lather.',
      'soap',
    ],
    [
      'Lavender Tallow Soap',
      1000,
      '4 oz bar',
      'Saponified beef tallow, saponified coconut oil, water, glycerin, lavender essential oil',
      'A simple tallow soap bar lightly scented with lavender.',
      'soap',
    ],
    [
      'Everyday Balm Gift Set',
      3600,
      'two 1 oz tins and one lip balm',
      'Rendered beef tallow, jojoba oil, beeswax, lavender essential oil',
      'Unscented and lavender balms paired with an unscented lip balm.',
      'balm-herbal',
    ],
  ],
);
pools.apparel = rows(
  'apparel',
  'shirt',
  'Machine wash cold with similar colors. Turn garments inside out, tumble dry low and avoid ironing decoration. Spot clean hats and bags.',
  'Materials are listed for each item.',
  [
    [
      'Faith Everyday T-Shirt',
      2800,
      'one adult medium tee',
      '100% cotton jersey',
      'A soft crewneck tee with a relaxed everyday fit and a small Faith collection label.',
    ],
    [
      'Grace Embroidered Hat',
      2600,
      'one adjustable cap',
      'Cotton twill, polyester embroidery thread, metal buckle',
      'A six-panel cap with a curved brim and small Grace embroidery.',
      'cap',
    ],
    [
      'Hope Crewneck Sweatshirt',
      4600,
      'one adult medium sweatshirt',
      '80% cotton, 20% polyester fleece',
      'A soft fleece crewneck with ribbed cuffs and a small Hope collection label.',
      'sweatshirt',
    ],
    [
      'Walk By Faith Hoodie',
      5400,
      'one adult medium hoodie',
      '80% cotton, 20% polyester fleece',
      'A cozy pullover with a front pouch pocket and a small collection label.',
      'sweatshirt',
    ],
    [
      'Everyday Cotton Tee, Sage',
      2800,
      'one adult medium tee',
      '100% cotton jersey',
      'A sage-green crewneck with a straight hem and relaxed shoulders.',
      'shirt-sage',
    ],
    [
      'Everyday Cotton Tee, Natural',
      2800,
      'one adult medium tee',
      '100% cotton jersey',
      'An undyed-look cotton tee with a soft hand and easy everyday fit.',
    ],
    [
      'Essential Pocket Tee',
      3000,
      'one adult medium tee',
      '100% cotton jersey',
      'A relaxed cotton tee finished with a chest patch pocket.',
    ],
    [
      'Long Sleeve Cotton Tee',
      3400,
      'one adult medium tee',
      '100% cotton jersey',
      'A breathable long-sleeve tee with ribbed cuffs and a crew neckline.',
    ],
    [
      'Heavyweight Cotton Tee',
      3400,
      'one adult medium tee',
      '100% heavyweight cotton jersey',
      'A substantial crewneck tee with a structured drape and straight hem.',
    ],
    [
      'Youth Everyday Tee',
      2200,
      'one youth medium tee',
      '100% cotton jersey',
      'A soft cotton tee cut for everyday play with a comfortable crew neckline.',
    ],
    [
      'Relaxed Weekend Crewneck',
      4800,
      'one adult medium sweatshirt',
      '80% cotton, 20% polyester fleece',
      'A roomy fleece sweatshirt with dropped shoulders and ribbed edges.',
      'sweatshirt',
    ],
    [
      'Lightweight Layering Crew',
      4200,
      'one adult medium sweatshirt',
      '100% cotton French terry',
      'An unbrushed terry crewneck for cool mornings and easy layering.',
      'sweatshirt',
    ],
    [
      'Classic Twill Cap',
      2400,
      'one adjustable cap',
      '100% cotton twill, metal buckle',
      'A low-profile cap with an adjustable back strap and stitched eyelets.',
      'cap',
    ],
    [
      'Everyday Trucker Cap',
      2600,
      'one adjustable cap',
      'Cotton front panels, polyester mesh, plastic snap closure',
      'A structured cap with a breathable mesh back and adjustable snap closure.',
      'cap',
    ],
    [
      'Market Canvas Tote',
      2400,
      'one 15 x 16 inch tote',
      '100% cotton canvas',
      'A sturdy everyday tote with long shoulder straps and boxed bottom corners.',
      'tote',
    ],
    [
      'Large Weekend Tote',
      3200,
      'one 18 x 16 inch tote',
      '100% cotton canvas',
      'A roomy canvas bag for market mornings and weekend essentials.',
      'tote',
    ],
    [
      'Cotton Drawstring Bag',
      1800,
      'one 14 x 16 inch bag',
      'Cotton canvas, cotton drawcord',
      'A lightweight drawstring bag for gym gear or everyday carry.',
      'tote',
    ],
    [
      'Everyday Tee Two-Pack',
      5000,
      'two adult medium tees',
      '100% cotton jersey',
      'One natural and one sage cotton tee packed together for easy everyday dressing.',
      'shirt-sage',
    ],
  ],
);
// Vendor-specific family selection, never inferred from a fixture key or account name.
const families = {
  1: 'seafood',
  2: 'honey',
  3: 'bakery',
  7: 'juice',
  8: 'catering',
  9: 'greens',
  10: 'tamales',
  11: 'macarons',
  12: 'poultry',
  13: 'crackers',
  14: 'coffee',
  15: 'pickles',
  16: 'honey',
  17: 'cookies',
  18: 'cafe',
  19: 'apparel',
  20: 'skin',
  21: 'produce',
  22: 'bakery',
  23: 'kimchi',
  26: 'farmstead',
  44: 'produce',
};
pools.farmstead = [
  recipe(
    'Seasonal Cooking Greens',
    550,
    '8 oz bunch',
    'Kale, chard',
    'A generous bunch of leafy cooking greens for soups and quick sautés.',
    'greens',
    'kale',
    undefined,
    cold,
  ),
  recipe(
    'Rustic Country Loaf',
    1000,
    'one 800 g loaf',
    'Wheat flour, water, sourdough starter, sea salt',
    'A crisp-crusted country loaf with a soft, open crumb.',
    'breads',
    'bread',
    'Contains wheat.',
    baked,
  ),
  recipe(
    'Meadow Honey',
    1400,
    '12 oz jar',
    'Wildflower honey',
    'Floral honey with a smooth sweetness for everyday tea and breakfast.',
    'pantry',
    'honey',
  ),
  recipe(
    'Baby Spinach Bag',
    650,
    '6 oz bag',
    'Baby spinach',
    'Tender spinach leaves for fresh salads or quick cooking.',
    'greens',
    'greens',
    undefined,
    cold,
  ),
  recipe(
    'Seeded Farmhouse Loaf',
    1200,
    'one 800 g loaf',
    'Wheat flour, water, sourdough starter, sunflower seed, sesame, sea salt',
    'A rustic loaf with sunflower and sesame seeds baked into the crust.',
    'breads',
    'bread',
    'Contains wheat and sesame.',
    baked,
  ),
  recipe(
    'Clover Honey, 8 oz',
    1000,
    '8 oz jar',
    'Clover honey',
    'Mild clover honey in a compact jar for the pantry or a picnic basket.',
    'pantry',
    'honey-light',
  ),
  ...pools.produce.filter((p) =>
    ['Swiss Chard Bundle', 'Fresh Culinary Herb Bundle'].includes(p.name),
  ),
  recipe(
    'Fresh Heirloom Carrots',
    500,
    'one 1 lb bunch',
    'Carrots',
    'Firm, sweet carrots with a colorful mix of roots for roasting and salads.',
    'produce',
    'carrots',
    undefined,
    cold,
  ),
  recipe(
    'Seasonal Salad Mix, 6 oz',
    650,
    '6 oz bag',
    'Mixed lettuce leaves',
    'Tender seasonal lettuces packed for quick everyday salads.',
    'greens',
    'lettuce',
    undefined,
    cold,
  ),
  {
    ...pools.bakery.find((p) => p.name === 'Classic Sourdough Boule'),
    name: 'Country Sourdough Boule',
  },
  pools.bakery.find((p) => p.name === 'Rosemary Focaccia'),
  {
    ...pools.honey.find((p) => p.name === 'Wildflower Honey'),
    name: 'Wildflower Honey, 12 oz',
  },
  recipe(
    'Strawberry Preserves, 8 oz',
    900,
    '8 oz jar',
    'Strawberries, cane sugar, lemon juice, fruit pectin',
    'A spoonable strawberry preserve with a fresh fruit flavor and a bright lemon finish.',
    'pantry',
    'preserves',
    undefined,
    'Store unopened in a cool, dry place. Refrigerate after opening.',
  ),
  ...pools.produce.filter((p) =>
    ['Heirloom Tomatoes', 'Breakfast Radishes'].includes(p.name),
  ),
  pools.bakery.find((p) => p.name === 'Olive Country Loaf'),
  recipe(
    'Farmhouse Pantry Pair',
    2400,
    'one 8 oz preserve jar and one 12 oz honey jar',
    'Strawberry, cane sugar, lemon juice, pectin, honey',
    'Strawberry preserves and wildflower honey packed together for breakfast and gifting.',
    'pantry',
    'preserves',
  ),
];
const rename = {
  'Taxable Product': 'Orange Ginger Carrot Juice',
  'Taxable Product Override': 'Pink Grapefruit Mint Juice',
  'Seasonal greens (design fixture)': 'Seasonal Cooking Greens',
  'Country loaf (design fixture)': 'Rustic Country Loaf',
  'Wildflower honey (design fixture)': 'Meadow Honey',
  'Shop sample greens': 'Baby Spinach Bag',
  'Shop sample loaf': 'Seeded Farmhouse Loaf',
  'Shop sample honey': 'Clover Honey, 8 oz',
};
function key(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function enrich(p, family) {
  const result = { ...p };
  if (/Flour/.test(result.name)) result.image = 'flour';
  if (/Salsa/.test(result.name) && !/Tamale/.test(result.name))
    result.image = 'salsa';
  if (/Hummus/.test(result.name)) result.image = 'hummus';
  if (/Pasta Salad/.test(result.name)) result.image = 'pasta';
  if (result.name === 'Farmhouse Cheddar') result.image = 'cheese';
  if (/Banana|Poppy Seed Loaf/.test(result.name)) result.image = 'sweet-loaf';
  if (/Cinnamon Morning|Cinnamon Swirl/.test(result.name))
    result.image = 'cinnamon-buns';
  if (/Lip Balm/.test(result.name)) result.image = 'lip-balm';
  if (/Honey Tasting/.test(result.name)) result.image = 'honey-trio';
  // Separate broad marketplace discovery from each vendor's editable category groups.
  const category = result.category;
  const names = {
    drinks: /Coffee|Roast|Blend|Espresso|Beans|Decaf/.test(result.name)
      ? 'Coffee'
      : 'Cold-Pressed Juice',
    pantry: /Honey/.test(result.name) ? 'Honey & Spreads' : 'Pantry',
    greens: /Microgreen|Shoot/.test(result.name)
      ? 'Microgreens'
      : 'Leafy Greens',
    produce: /Herb/.test(result.name) ? 'Fresh Herbs' : 'Fresh Vegetables',
    seafood: /Shrimp/.test(result.name)
      ? 'Shrimp'
      : /Crab|Oyster/.test(result.name)
        ? 'Shellfish'
        : 'Fish',
    poultry: /Egg/.test(result.name) ? 'Eggs' : 'Chicken',
    prepared:
      family === 'tamales'
        ? /Salsa/.test(result.name)
          ? 'Salsas'
          : 'Tamales'
        : /Sandwich|Box|Board|Platter|Pairing/.test(result.name)
          ? 'Meals & Grazing'
          : 'Prepared Foods',
    desserts: /Macaron/.test(result.name)
      ? 'Macarons'
      : /Brownie/.test(result.name)
        ? 'Brownies'
        : /Muffin/.test(result.name)
          ? 'Muffins'
          : /Loaf|Bread/.test(result.name)
            ? 'Sweet Loaves'
            : 'Cookies',
    fermented:
      family === 'kimchi'
        ? /Kit|Starter/.test(result.name)
          ? 'Meal Kits'
          : 'Kimchi'
        : /Kraut|Sauerkraut/.test(result.name)
          ? 'Fermented Vegetables'
          : 'Pickled Vegetables',
    skincare: /Soap/.test(result.name)
      ? 'Soap'
      : /Lip/.test(result.name)
        ? 'Lip Care'
        : 'Balms & Body Care',
    apparel: /Cap|Hat/.test(result.name)
      ? 'Hats'
      : /Bag|Tote/.test(result.name)
        ? 'Bags & Accessories'
        : /Sweatshirt|Crewneck|Hoodie|Layering Crew/.test(result.name)
          ? 'Sweatshirts'
          : 'T-Shirts',
    breads: 'Artisan Bread',
    bakery: /Flour/.test(result.name)
      ? 'Baking Pantry'
      : /Biscotti/.test(result.name)
        ? 'Biscotti'
        : /Cracker|Graham|S’more|Sandwiches/.test(result.name)
          ? 'Crackers & Treats'
          : /Croissant|Bun|Muffin/.test(result.name)
            ? 'Pastries'
            : 'Artisan Bread',
  };
  result.categoryName = names[category];
  result.globalCategories = [category];
  if (
    category === 'bakery' &&
    /Bread|Loaf|Boule|Sourdough|Baguette|Focaccia|Rolls|Dough|Flour/.test(
      result.name,
    )
  )
    result.globalCategories.push('breads');
  if (category === 'greens') result.globalCategories.push('produce');
  if (category === 'prepared' && /Cheddar|Cheese/.test(result.name))
    result.globalCategories.push('dairy');
  if (family === 'cafe' && /Coffee|Cold Brew|Beans|Pairing/.test(result.name)) {
    result.globalCategories = ['drinks'];
    result.categoryName = 'Coffee';
    result.allergens = /Pairing/.test(result.name)
      ? 'Contains wheat, almonds, milk and eggs.'
      : 'No major allergens are added. Optional milk is not included.';
  }
  if (family === 'poultry' && /Eggs/.test(result.name))
    result.allergens = 'Contains eggs.';
  if (family === 'seafood')
    result.allergens = /Shrimp|Crab/.test(result.name)
      ? 'Contains crustacean shellfish. Handled alongside fish and other shellfish.'
      : /Oyster/.test(result.name)
        ? 'Contains oysters (molluscan shellfish). Handled alongside fish and crustacean shellfish.'
        : 'Contains fish. Handled alongside shellfish.';
  if (family === 'kimchi' && /Vegan|White|Bok Choy/.test(result.name))
    result.allergens =
      'No fish or other major allergens are added. Prepared alongside fish, soy, wheat and sesame.';
  if (family === 'honey')
    result.storage =
      'Store tightly closed at room temperature. Natural crystallization is normal; gently warm the closed jar in lukewarm water if desired. Honey is not suitable for children under one year.';
  if (family === 'coffee' && /Brew/.test(result.name)) result.storage = cold;
  if (category !== 'apparel' && category !== 'skincare') {
    const ingredients = result.ingredients.toLowerCase();
    const allergens = [];
    for (const [name, pattern] of [
      ['wheat', /wheat/],
      [
        'milk',
        /\bmilk\b|cream cheese|cheddar|yogurt|mozzarella|monterey jack|oaxaca cheese/,
      ],
      ['eggs', /\begg(s| whites| yolk)?\b/],
      ['soy', /\bsoy\b/],
      ['sesame', /sesame|tahini/],
      ['peanuts', /peanut/],
      ['almonds', /almond/],
      ['walnuts', /walnut/],
      ['pecans', /pecan/],
      ['pistachios', /pistachio/],
      ['hazelnuts', /hazelnut/],
      [
        'fish',
        /\bfish\b|anchovy|snapper|flounder|trout|redfish|sheepshead|black drum/,
      ],
      ['crustacean shellfish', /shrimp|\bcrab\b/],
      ['oysters', /oyster/],
    ])
      if (pattern.test(ingredients)) allergens.push(name);
    result.allergens = allergens.length
      ? `Contains ${allergens.join(', ')}. Ask about shared preparation equipment if you have an allergy.`
      : 'No major allergens are added. Ask about shared preparation equipment if you have an allergy.';
  }
  result.productInformation = {
    descriptionEnabled: true,
    pickupEnabled: true,
    ingredients: {
      enabled: category !== 'apparel',
      content: category === 'apparel' ? '' : result.ingredients,
    },
    allergens: { enabled: true, content: result.allergens },
    storage: { enabled: true, content: result.storage },
    pickup: {
      enabled: true,
      content:
        'Collect from the vendor at the pickup location and time confirmed with your order. Bring an insulated bag for chilled or frozen items.',
    },
    custom: [
      { enabled: true, title: 'Package size', content: result.unit },
      ...(category === 'apparel'
        ? [
            {
              enabled: true,
              title: 'Materials & fit',
              content: result.ingredients + '. ' + result.unit + '.',
            },
          ]
        : []),
    ],
  };
  result.stock =
    category === 'apparel'
      ? 24
      : /Macaron|Tamale|Box|Platter/.test(result.name)
        ? 24
        : 36;
  assert(
    result.categoryName && photos.some((photo) => photo.key === result.image),
    'Missing category or photo: ' + result.name,
  );
  assert(Number.isInteger(result.price) && result.price > 0);
  return result;
}
function buildCatalog(audit) {
  return audit.vendors.map((v) => {
    const family = families[v.id];
    assert(family, 'Unknown vendor');
    const pool = pools[family];
    assert(pool.length >= 18);
    const current = audit.products.filter((p) => p.vendorId === v.id);
    assert(current.length <= 18, 'Unexpected catalog size');
    const selected = [];
    for (const product of current) {
      const name = rename[product.name] ?? product.name;
      const item = pool.find((p) => key(p.name) === key(name));
      assert(item, 'Missing curated definition for ' + v.name + ': ' + name);
      selected.push({
        ...enrich(item, family),
        existingId: product.id,
        existingVariants: product.variants ?? [],
        previousName: product.name,
        slug: product.slug,
      });
    }
    for (const item of pool) {
      if (selected.length === 18) break;
      if (!selected.some((p) => key(p.name) === key(item.name)))
        selected.push(enrich(item, family));
    }
    assert.equal(selected.length, 18);
    assert.equal(new Set(selected.map((p) => key(p.name))).size, 18);
    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      channelId: v.primaryChannelId,
      ownerId: v.members.find((m) => m.role === 'owner').userId,
      family,
      products: selected,
    };
  });
}
module.exports = { categories, buildCatalog };
