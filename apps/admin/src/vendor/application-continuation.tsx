import { useEffect, useState } from 'react';
import { ApplicationFields, Card, Spinner } from '@market/ui';
import type { ApplicantDraftDetail } from '@market/api';
import type { VendorService } from './service';
import { RouteLink } from './common';
export function VendorApplicationContinuation({
  service,
}: {
  service: VendorService;
}) {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (!service.applications) throw new Error();
        const result = await service.applications.command<{ callback: string }>(
          'CONTINUE',
          {
            vendorId: Number(service.vendorId),
            draftId: params.has('draft')
              ? Number(params.get('draft'))
              : undefined,
            origin: params.get('origin'),
            correlation: params.get('correlation'),
          },
        );
        const target = new URL(result.callback);
        if (
          target.origin !== params.get('origin') ||
          target.pathname !== '/auth/callback' ||
          !/^[A-Za-z0-9_-]{43}$/.test(target.searchParams.get('code') ?? '')
        )
          throw new Error();
        if (active) window.location.replace(target.toString());
      } catch {
        if (active)
          setError(
            'This draft is unavailable to the selected Vendor. Select its business in the account switcher, then resume it from Vendor Applications.',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [service]);
  return error ? (
    <Card>
      <p role="alert">{error}</p>
      <RouteLink to="/vendor/applications">Vendor Applications</RouteLink>
    </Card>
  ) : (
    <Spinner label="Opening your Vendor application" />
  );
}
export function VendorDraftPreview({
  service,
  id,
}: {
  service: VendorService;
  id: number;
}) {
  const [draft, setDraft] = useState<ApplicantDraftDetail | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void service.applications
      ?.read<ApplicantDraftDetail>({
        draftId: id,
        vendorId: Number(service.vendorId),
      })
      .then((value) => {
        if (active) setDraft(value);
      })
      .catch(() => {
        if (active)
          setError('This saved draft is unavailable to the selected Vendor.');
      });
    return () => {
      active = false;
    };
  }, [service, id]);
  return (
    <div className="applicant-applications">
      <RouteLink to="/vendor/applications">Vendor Applications</RouteLink>
      {error ? (
        <p role="alert">{error}</p>
      ) : draft ? (
        <>
          <Card>
            <p>
              {draft.name} at {draft.marketName}
            </p>
            <p>
              This form changed or was retired. Your saved answers are retained.
              Contact the market before starting another application.
            </p>
          </Card>
          <ApplicationFields
            definition={draft.definition}
            answers={draft.draft.progress.answers}
            readOnly
          />
        </>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
