export interface InformationEntry {
  enabled: boolean;
  content: string;
}
export interface ProductInformation {
  descriptionEnabled: boolean;
  pickupEnabled: boolean;
  ingredients: InformationEntry;
  allergens: InformationEntry;
  storage: InformationEntry;
  pickup: InformationEntry;
  custom: (InformationEntry & { title: string })[];
}
export function emptyProductInformation(): ProductInformation {
  return {
    descriptionEnabled: true,
    pickupEnabled: true,
    ingredients: { enabled: true, content: '' },
    allergens: { enabled: true, content: '' },
    storage: { enabled: true, content: '' },
    pickup: { enabled: true, content: '' },
    custom: [],
  };
}
/** Persisted values are validated by the owned catalog command, never rendered as HTML. */
export function readProductInformation(
  raw?: string | null,
): ProductInformation {
  return raw
    ? (JSON.parse(raw) as ProductInformation)
    : emptyProductInformation();
}
