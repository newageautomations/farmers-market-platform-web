import { useState } from 'react';
import { Button, Card } from '@market/ui';
export function ClaimApplication({
  id,
  vendorId,
  channel,
  vendorOrigin,
}: {
  id: number;
  vendorId: number;
  channel: string;
  vendorOrigin: string;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  return (
    <Card>
      <p>
        Link the application you just submitted to your authorized Vendor
        business. This does not create business ownership or market membership.
      </p>
      {error && <p role="alert">{error}</p>}
      <Button
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError('');
          void fetch('/api/applicant-applications', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'CLAIM', input: { id, vendorId } }),
          })
            .then(async (r) => {
              if (!r.ok) throw new Error();
              window.location.assign(
                `${vendorOrigin}/vendor/applications/${id}?channel=${encodeURIComponent(channel)}&account=1`,
              );
            })
            .catch(() => {
              setError(
                'This application could not be linked. Use the same browser and market where you submitted it within 48 hours. If it is already linked, check Applications. Contact the market for help.',
              );
              setPending(false);
            });
        }}
      >
        {pending ? 'Linking application' : 'Track this application'}
      </Button>
    </Card>
  );
}
