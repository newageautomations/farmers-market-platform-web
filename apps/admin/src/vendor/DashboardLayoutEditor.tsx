import type { ComponentProps } from 'react';
import type { VendorDashboardLayout } from '@market/api';
import { DashboardLayoutEditor as SharedEditor } from '@market/ui/dashboard-layout';
import {
  dashboardWidgets,
  defaultLayout,
  normalizeLayout,
} from './dashboard-layout';

/**
 * Vendor dashboard layout editor: the shared `@market/ui/dashboard-layout`
 * editor with the vendor widget registry. Urgent requests appear only when
 * something needs attention.
 */
export function DashboardLayoutEditor(
  props: Omit<
    ComponentProps<typeof SharedEditor<VendorDashboardLayout>>,
    'widgets' | 'defaultLayout' | 'normalize' | 'conditional'
  >,
) {
  return (
    <SharedEditor<VendorDashboardLayout>
      {...props}
      widgets={dashboardWidgets}
      defaultLayout={defaultLayout}
      normalize={normalizeLayout}
      conditional={['urgent']}
    />
  );
}
