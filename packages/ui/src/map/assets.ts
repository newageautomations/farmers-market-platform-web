/** Application-owned SVG artwork. No layout-supplied markup is ever interpolated. */
export const assetCategories = [
  'Landscaping',
  'Furniture and amenities',
  'Market infrastructure',
  'Transportation and accessibility',
] as const;
type Category = (typeof assetCategories)[number];
export interface MapAsset {
  id: string;
  name: string;
  category: Category;
  color: string;
  width: number;
  height: number;
  artwork: string;
}
const foliage =
  '<path d="M18 51C9 39 20 23 32 25C35 10 57 8 65 23C83 16 96 36 85 49C98 63 81 83 67 79C57 94 37 88 33 77C16 80 7 61 18 51Z" fill="currentColor"/><path d="M28 38C40 21 65 23 76 39M27 59C35 73 56 78 71 64" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="6"/><path d="M42 49 53 59 67 45M53 59V73" fill="none" stroke="#284c3b" stroke-opacity=".4" stroke-width="3"/>';
const bench =
  '<rect x="14" y="22" width="72" height="13" rx="4" fill="#596b5d"/><rect x="20" y="31" width="8" height="46" rx="3" fill="#596b5d"/><rect x="72" y="31" width="8" height="46" rx="3" fill="#596b5d"/><rect x="12" y="39" width="76" height="29" rx="4" fill="currentColor"/><path d="M17 48H83M17 58H83" stroke="#f8ecd5" stroke-opacity=".55" stroke-width="2"/>';
const table =
  '<path d="M28 17 72 83M72 17 28 83" stroke="#596b5d" stroke-width="7"/><rect x="13" y="19" width="13" height="62" rx="4" fill="currentColor"/><rect x="74" y="19" width="13" height="62" rx="4" fill="currentColor"/><rect x="32" y="12" width="36" height="76" rx="5" fill="currentColor"/><path d="M44 16V84M56 16V84M19 24V76M81 24V76" stroke="#fff2d8" stroke-opacity=".5" stroke-width="2"/>';
const vehicle =
  '<rect x="24" y="20" width="9" height="18" rx="3" fill="#394b4b"/><rect x="67" y="20" width="9" height="18" rx="3" fill="#394b4b"/><rect x="24" y="67" width="9" height="18" rx="3" fill="#394b4b"/><rect x="67" y="67" width="9" height="18" rx="3" fill="#394b4b"/><rect x="28" y="8" width="44" height="84" rx="13" fill="currentColor"/><path d="M34 30Q50 24 66 30L63 42H37ZM37 69H63L66 79Q50 84 34 79Z" fill="#d0e1de"/><rect x="37" y="45" width="26" height="21" rx="4" fill="#ffffff" fill-opacity=".18"/><path d="M32 17H39M61 17H68" stroke="#fff3c5" stroke-width="4"/>';
const parking =
  '<rect x="17" y="12" width="66" height="76" rx="9" fill="currentColor"/><rect x="23" y="18" width="54" height="64" rx="5" fill="none" stroke="#f5f4eb" stroke-width="2"/><path d="M40 72V29H55C74 29 74 53 55 53H41M41 35H54C64 35 64 47 54 47H41" fill="#f5f4eb" fill-rule="evenodd"/>';
function asset(
  id: string,
  name: string,
  category: Category,
  color: string,
  artwork: string,
  width = 100,
  height = 100,
): MapAsset {
  return { id, name, category, color, artwork, width, height };
}
export const mapAssets: readonly MapAsset[] = [
  asset('tree-oak', 'Oak tree', 'Landscaping', '#638b57', foliage),
  asset(
    'tree-maple',
    'Maple tree',
    'Landscaping',
    '#91a86c',
    '<path d="m50 9 10 13 18-2 3 18 12 12-12 12-3 18-18-2-10 13-10-13-18 2-3-18L7 50l12-12 3-18 18 2Z" fill="currentColor"/><path d="M50 24V78M27 39l23 15 24-15M30 66l20-12 20 12" stroke="#526b43" stroke-width="3" fill="none"/><path d="m39 29 11-5 11 5-11 11Z" fill="#fff" fill-opacity=".2"/>',
  ),
  asset(
    'tree-evergreen',
    'Evergreen tree',
    'Landscaping',
    '#426f5b',
    '<path d="m50 6 17 21-6 1 19 23-8 1 20 27-31-5-11 18-11-18-31 5 20-27-8-1 19-23-6-1Z" fill="currentColor"/><path d="m50 18-9 17 9-3 0 19-17 10 17-4v23" stroke="#d7e0bd" stroke-opacity=".4" stroke-width="3" fill="none"/>',
  ),
  asset(
    'shrub',
    'Shrub cluster',
    'Landscaping',
    '#7d9d5f',
    '<path d="M12 44C9 27 28 17 41 25C48 8 74 18 75 33C96 33 97 59 79 65C73 85 46 85 40 70C20 81 5 61 12 44Z" fill="currentColor"/><path d="M24 39q10-12 21 0m8-7q12-8 17 6M43 62q16 12 29-3" fill="none" stroke="#dce7b7" stroke-width="5" stroke-linecap="round"/>',
  ),
  asset(
    'flower-bed',
    'Flower bed',
    'Landscaping',
    '#a8b97a',
    '<rect x="9" y="22" width="82" height="56" rx="24" fill="#b39b7e"/><rect x="14" y="27" width="72" height="46" rx="20" fill="currentColor"/><path d="m23 42 9 15m17-18 4 24m16-23-8 18" stroke="#597e50" stroke-width="3"/>' +
      [
        [27, 40],
        [48, 45],
        [71, 43],
        [35, 61],
        [64, 61],
      ]
        .map(
          ([x, y], i) =>
            `<path d="M${x} ${y! - 7}c6-5 12 3 6 7 7 4 0 12-6 6-6 6-13-2-6-6-6-4 0-12 6-7Z" fill="${i % 2 ? '#e8bd82' : '#d39e9b'}"/><circle cx="${x}" cy="${y}" r="3" fill="#fbebc4"/>`,
        )
        .join(''),
  ),
  asset(
    'grass-patch',
    'Grass patch',
    'Landscaping',
    '#a6bd7b',
    '<path d="M12 36Q20 12 49 19T86 35Q101 53 80 76T29 81Q3 69 12 36Z" fill="currentColor"/><path d="m25 51 3-9 4 10m15 12 3-9 4 10m10-26 3-9 4 10m-31 0 3-9 4 10m24 26 3-9 4 10" fill="none" stroke="#708f53" stroke-width="2"/>',
  ),
  asset(
    'planter',
    'Raised planter',
    'Landscaping',
    '#7e9b64',
    '<rect x="15" y="15" width="70" height="70" rx="10" fill="#bc9879"/><rect x="22" y="22" width="56" height="56" rx="6" fill="#725b47"/><path d="M50 52C18 53 21 24 47 43 37 13 67 15 55 43 79 21 87 52 57 52 83 72 55 85 51 58 42 85 16 66 50 52Z" fill="currentColor"/><circle cx="51" cy="51" r="6" fill="#e8cf93"/>',
  ),
  asset(
    'picnic-table',
    'Picnic table',
    'Furniture and amenities',
    '#b9956f',
    table,
    80,
    100,
  ),
  asset('bench', 'Bench', 'Furniture and amenities', '#b9956f', bench, 110, 65),
  asset(
    'trash-bin',
    'Trash bin',
    'Furniture and amenities',
    '#657b70',
    '<rect x="24" y="17" width="52" height="69" rx="10" fill="currentColor"/><rect x="20" y="14" width="60" height="21" rx="7" fill="#425b50"/><rect x="30" y="20" width="40" height="8" rx="4" fill="#263c34"/><path d="M37 44V73M50 44V73M63 44V73" stroke="#c9d5c5" stroke-opacity=".5" stroke-width="3"/>',
    45,
    55,
  ),
  asset(
    'recycling-bin',
    'Recycling bin',
    'Furniture and amenities',
    '#5b8792',
    '<rect x="24" y="17" width="52" height="69" rx="10" fill="currentColor"/><rect x="20" y="14" width="60" height="21" rx="7" fill="#395e69"/><rect x="30" y="20" width="40" height="8" rx="4" fill="#294750"/><path d="m43 49 7-9 11 15m-3 16H41l-6-11m1-6 7-5m23 11-2 10" fill="none" stroke="#e1eee1" stroke-width="4" stroke-linejoin="round"/>',
    45,
    55,
  ),
  asset(
    'restroom',
    'Restrooms',
    'Furniture and amenities',
    '#839b94',
    '<rect x="11" y="16" width="78" height="68" rx="8" fill="currentColor"/><path d="M16 26H84M50 26V78" stroke="#e2e7db" stroke-width="3"/><rect x="22" y="38" width="17" height="27" rx="7" fill="#e2e7db"/><rect x="61" y="38" width="17" height="27" rx="7" fill="#e2e7db"/><path d="M19 75H38M62 75H81" stroke="#4c695f" stroke-width="4"/>',
    100,
    75,
  ),
  asset(
    'handwash',
    'Handwashing station',
    'Furniture and amenities',
    '#85abb0',
    '<rect x="22" y="13" width="56" height="75" rx="12" fill="currentColor"/><ellipse cx="50" cy="46" rx="20" ry="17" fill="#e6eee6"/><ellipse cx="50" cy="46" rx="14" ry="11" fill="#aac7c9"/><path d="M50 21v17m0-16h12" stroke="#4b7278" stroke-width="5" fill="none"/><circle cx="50" cy="49" r="3" fill="#4b7278"/><rect x="34" y="71" width="32" height="6" rx="3" fill="#4b7278"/>',
    50,
    65,
  ),
  asset(
    'water-fountain',
    'Water fountain',
    'Furniture and amenities',
    '#91b6b5',
    '<circle cx="50" cy="50" r="36" fill="#b8c1b6"/><circle cx="50" cy="50" r="29" fill="currentColor"/><circle cx="50" cy="50" r="21" fill="none" stroke="#dce9de" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="none" stroke="#dce9de" stroke-width="2"/><circle cx="50" cy="50" r="5" fill="#5b8489"/>',
    60,
    60,
  ),
  asset(
    'seating-area',
    'Seating area',
    'Furniture and amenities',
    '#bca17d',
    '<circle cx="50" cy="50" r="23" fill="currentColor"/><circle cx="50" cy="50" r="16" fill="none" stroke="#f5ead4" stroke-width="2"/><path d="M32 9Q50 0 68 9v12Q50 12 32 21ZM79 32Q98 50 79 68H67q17-18 0-36ZM32 79q18 9 36 0v12q-18 9-36 0ZM21 32Q2 50 21 68h12q-17-18 0-36Z" fill="#788b72"/>',
  ),
  asset(
    'tent',
    'Pop-up tent',
    'Market infrastructure',
    '#cbaa80',
    '<rect x="8" y="8" width="84" height="84" rx="4" fill="#5a6b5e"/><path d="M11 11H89V89H11Z" fill="currentColor"/><path d="m11 11 39 39L89 11ZM11 89l39-39 39 39Z" fill="#fff" fill-opacity=".24"/><path d="m11 11 39 39 39-39M11 89l39-39 39 39" fill="none" stroke="#f5e9d0" stroke-width="2"/><circle cx="50" cy="50" r="4" fill="#f5e9d0"/>',
    100,
    100,
  ),
  asset(
    'food-truck',
    'Food truck',
    'Market infrastructure',
    '#b98469',
    '<rect x="16" y="20" width="10" height="17" rx="3" fill="#394b4b"/><rect x="74" y="20" width="10" height="17" rx="3" fill="#394b4b"/><rect x="16" y="74" width="10" height="17" rx="3" fill="#394b4b"/><rect x="74" y="74" width="10" height="17" rx="3" fill="#394b4b"/><rect x="23" y="5" width="54" height="89" rx="7" fill="currentColor"/><rect x="29" y="13" width="42" height="16" rx="5" fill="#caddd7"/><rect x="29" y="35" width="42" height="50" rx="3" fill="#f2e6ce"/><rect x="36" y="43" width="28" height="12" rx="3" fill="#afbbb0"/><path d="M74 39h15v40H74" fill="#d9bb8a"/><path d="M79 41v36M85 41v36" stroke="#b98469" stroke-width="3"/>',
    85,
    150,
  ),
  asset(
    'trailer',
    'Trailer',
    'Market infrastructure',
    '#a7b8b2',
    '<path d="M41 83 50 96 59 83" fill="none" stroke="#5c7069" stroke-width="4"/><rect x="16" y="45" width="10" height="22" rx="3" fill="#394b4b"/><rect x="74" y="45" width="10" height="22" rx="3" fill="#394b4b"/><rect x="23" y="8" width="54" height="77" rx="8" fill="currentColor"/><rect x="30" y="16" width="40" height="60" rx="5" fill="#edf0e5"/><path d="M35 25H65M35 35H65M35 45H65" stroke="#cad3c8" stroke-width="3"/>',
    75,
    130,
  ),
  asset(
    'electric-hookup',
    'Electrical hookup',
    'Market infrastructure',
    '#d8b56f',
    '<rect x="23" y="14" width="54" height="72" rx="10" fill="currentColor"/><rect x="30" y="21" width="40" height="58" rx="6" fill="#f2e8cf"/><path d="M53 29 38 53h12l-5 18 19-27H52Z" fill="#a77e3b"/>',
    40,
    50,
  ),
  asset(
    'water-hookup',
    'Water hookup',
    'Market infrastructure',
    '#7eaaaf',
    '<rect x="23" y="14" width="54" height="72" rx="10" fill="currentColor"/><rect x="30" y="21" width="40" height="58" rx="6" fill="#e4eeea"/><path d="M50 30C46 39 36 48 36 57a14 14 0 0 0 28 0c0-9-10-18-14-27Z" fill="#6998a4"/>',
    40,
    50,
  ),
  asset(
    'fence',
    'Fence segment',
    'Market infrastructure',
    '#aa9277',
    '<path d="M7 37H93V63H7Z" fill="currentColor"/><path d="M10 43H90M10 57H90" stroke="#e6d7bc" stroke-width="3"/><rect x="7" y="29" width="10" height="42" rx="2" fill="#766b56"/><rect x="45" y="29" width="10" height="42" rx="2" fill="#766b56"/><rect x="83" y="29" width="10" height="42" rx="2" fill="#766b56"/>',
    140,
    25,
  ),
  asset(
    'barricade',
    'Barricade',
    'Market infrastructure',
    '#d2a36c',
    '<path d="M16 19V81M84 19V81" stroke="#5b6d65" stroke-width="9"/><rect x="7" y="32" width="86" height="36" rx="4" fill="currentColor"/><path d="m15 64 21-28m0 28 21-28m0 28 21-28" stroke="#fbf1d6" stroke-width="9"/>',
    110,
    35,
  ),
  asset(
    'entrance',
    'Entrance indicator',
    'Market infrastructure',
    '#638b72',
    '<path d="M18 72V20H82V72" fill="none" stroke="#657b70" stroke-width="8"/><path d="M40 83V52H28l22-25 22 25H60V83Z" fill="currentColor"/><path d="M43 40h14" stroke="#e6efdd" stroke-width="3"/>',
    70,
    80,
  ),
  asset(
    'exit',
    'Exit indicator',
    'Market infrastructure',
    '#aa896c',
    '<path d="M18 28V80H82V28" fill="none" stroke="#657b70" stroke-width="8"/><path d="M40 17V48H28l22 25 22-25H60V17Z" fill="currentColor"/><path d="M43 60h14" stroke="#f5e9d6" stroke-width="3"/>',
    70,
    80,
  ),
  asset(
    'car',
    'Car',
    'Transportation and accessibility',
    '#8fa8a6',
    vehicle,
    60,
    110,
  ),
  asset(
    'parking',
    'Parking',
    'Transportation and accessibility',
    '#6c8991',
    parking,
    65,
    75,
  ),
  asset(
    'accessible-parking',
    'Accessible parking',
    'Transportation and accessibility',
    '#688eac',
    '<rect x="12" y="9" width="76" height="82" rx="9" fill="currentColor"/><circle cx="48" cy="25" r="7" fill="#f6f2df"/><path d="m46 38 3 19H65L76 76M49 46H65M39 49a19 19 0 1 0 20 30" fill="none" stroke="#f6f2df" stroke-width="6" stroke-linecap="round"/>',
    65,
    75,
  ),
  asset(
    'bicycle-rack',
    'Bicycle rack',
    'Transportation and accessibility',
    '#718c86',
    '<rect x="12" y="20" width="76" height="60" rx="8" fill="#d4d8c8"/><path d="M24 28v43m17-43v43m18-43v43m17-43v43" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M24 31h52m-52 37h52" stroke="#a2b4a7" stroke-width="2"/>',
    100,
    55,
  ),
  asset(
    'direction-arrow',
    'Directional arrow',
    'Transportation and accessibility',
    '#839789',
    '<path d="M38 89V45H17L50 9l33 36H62V89Z" fill="currentColor"/><path d="M46 77V37H36L50 22l14 15H54v40Z" fill="#fff" fill-opacity=".25"/>',
    45,
    90,
  ),
  asset(
    'pedestrian-crossing',
    'Pedestrian crossing',
    'Transportation and accessibility',
    '#f4eedc',
    '<rect x="6" y="12" width="88" height="76" rx="3" fill="#828d88"/>' +
      [16, 31, 46, 61, 76]
        .map(
          (x) =>
            `<rect x="${x}" y="20" width="9" height="60" rx="1" fill="currentColor"/>`,
        )
        .join(''),
    110,
    75,
  ),
];
const byId = new Map(mapAssets.map((a) => [a.id, a]));
export const mapAsset = (id?: string) => (id ? byId.get(id) : undefined);
export function assetSvg(id: string, color?: string): string | undefined {
  const a = mapAsset(id);
  if (!a) return undefined;
  const tint = color && /^#[\da-f]{6}$/i.test(color) ? color : a.color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100" color="${tint}"><g stroke-linejoin="round" stroke-linecap="round">${a.artwork}</g></svg>`;
}
export function assetUrl(id: string, color?: string): string | undefined {
  const svg = assetSvg(id, color);
  return svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : undefined;
}
