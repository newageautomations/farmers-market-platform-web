import { useState } from 'react';
import { AdminShell } from '../../../../../apps/admin/src/AdminShell';
import { Button } from '@market/ui';
import type { AdminContext, AdminScope } from '@market/admin-core';

/** Only the existing shell is mounted. Services and operational dashboards are absent. */
export function ShellPreview({ scope }: { scope: AdminScope }) {
  const [message, setMessage] = useState(
    'Synthetic shell. No services or operational content are mounted.',
  );
  const [context] = useState<AdminContext>(() => {
    window.history.replaceState(null, '', `/${scope.toLowerCase()}`);
    return {
      scope,
      source: 'fixture',
      name: `Synthetic ${scope.toLowerCase()} workspace`,
      permissions: ['SuperAdmin'],
      ...(scope === 'MARKET'
        ? {
            subject: { marketId: 'synthetic' },
            marketStatus: 'active' as const,
          }
        : {}),
      ...(scope === 'VENDOR' ? { subject: { vendorId: 'synthetic' } } : {}),
    };
  });
  return (
    <>
      <p role="status">{message}</p>
      <AdminShell
        context={context}
        onLogout={() =>
          setMessage(
            'Display-only sign out clicked. No account request was made.',
          )
        }
        controls={
          <Button
            className="secondary"
            onClick={() => setMessage('Display-only control clicked.')}
          >
            Local control
          </Button>
        }
      />
    </>
  );
}
