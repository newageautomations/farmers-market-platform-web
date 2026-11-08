import type { StockLibraryImage } from '../../vendor/categories';
/** Project equipment images, offered only by rental add/edit dialogs. */
export const rentalStockImages: readonly StockLibraryImage[] = [
  ['folding-table', 'Six-foot folding table'],
  ['folding-chair', 'Folding chair'],
  ['canopy-tent', '10 x 10 canopy tent'],
  ['canopy-weights-illustration', 'Canopy weight set'],
  ['tablecloth', 'Six-foot tablecloth'],
  ['extension-cord', 'Outdoor extension cord'],
  ['power-strip', 'Power strip'],
  ['handwashing-station', 'Portable handwashing station'],
  ['insulated-cooler', 'Insulated cooler'],
  ['display-rack', 'Tiered display rack'],
].map(([file, name]) => ({
  id: `equipment-${file}`,
  name: name!,
  preview: `/rental-stock/${file}.png`,
}));
