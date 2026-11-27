import type { ApplicationSubmission, RentalSnapshot } from '@market/api';
import { friendlyLabel } from '../presentation';

type Requirements = Pick<
  ApplicationSubmission['requirements'],
  'electricity' | 'vehicle' | 'foodTruck'
>;

/** Amenities a vendor asked for, plus those its rentals need. */
export function requiredAmenities(
  requirements: Requirements | undefined,
  rentals: readonly Pick<RentalSnapshot, 'quantity' | 'requiredAmenity'>[] = [],
): string[] {
  return [
    ...new Set([
      ...(requirements?.electricity ? ['ELECTRICITY'] : []),
      ...(requirements?.vehicle ? ['VEHICLE'] : []),
      ...(requirements?.foodTruck ? ['FOOD_TRUCK'] : []),
      ...rentals
        .filter((r) => r.quantity > 0 && r.requiredAmenity)
        .map((r) => r.requiredAmenity!),
    ]),
  ];
}

/** Required amenities the booth does not have (the backend checks the same). */
export function missingAmenities(
  required: readonly string[],
  boothAmenities: readonly string[],
) {
  return required.filter((a) => !boothAmenities.includes(a));
}

export const amenityText = (amenities: readonly string[]) =>
  amenities.map(friendlyLabel).join(', ');
