import { optionalFeature, type OptionalFeatureSlot } from '@market/admin-core';
import { AppError, type Entitlement } from '@market/api';
import { ErrorState } from '@market/ui';
import type { ReactNode } from 'react';
export function FeaturePanel({
  slot,
  featureCode,
  entitlements,
  children,
}: {
  slot: OptionalFeatureSlot;
  featureCode: string;
  entitlements?: readonly Entitlement[];
  children: ReactNode;
}) {
  const state = optionalFeature(entitlements, featureCode);
  if (state === 'denied')
    return <ErrorState error={new AppError('entitlement')} />;
  if (state === 'unknown')
    return <p>Availability for {slot} has not been loaded.</p>;
  return <>{children}</>;
}
