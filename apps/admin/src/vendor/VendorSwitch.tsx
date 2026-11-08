import type { ComponentProps, ReactNode } from 'react';
import { Checkbox } from '@market/ui';
import './vendor-switch.css';

/**
 * Vendor switch presentation shared by the product editor and market pages.
 * A native checkbox with role="switch" keeps form and keyboard semantics.
 */
export function VendorSwitch({
  label,
  tone = 'danger',
  className = '',
  ...props
}: Omit<ComponentProps<typeof Checkbox>, 'role'> & {
  /** Visible text after the track. Omit and pass aria-label for table cells. */
  label?: ReactNode;
  /** Off-state color: danger for enabled/disabled records, neutral for optional features. */
  tone?: 'danger' | 'neutral';
}) {
  return (
    <label
      className={`product-enabled-switch${tone === 'neutral' ? ' product-enabled-switch-neutral' : ''} ${className}`.trim()}
    >
      <Checkbox {...props} role="switch" />
      <span className="product-enabled-track" aria-hidden="true" />
      {label !== undefined && <span>{label}</span>}
    </label>
  );
}
