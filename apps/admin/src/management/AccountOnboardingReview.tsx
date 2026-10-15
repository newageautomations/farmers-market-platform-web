import { EmptyState } from '@market/ui';
import { Card, Select } from '@market/ui';
import { useCallback } from 'react';
import type { ManagementService } from './service';
import {
  CommandForm,
  ReadState,
  TextField,
  text,
  useRead,
} from '../vendor/common';

export function AccountOnboardingReview({
  service,
}: {
  service: ManagementService;
}) {
  const load = useCallback(() => service.roleOnboardingQueue(), [service]);
  const result = useRead('account-onboarding-review', load);
  return (
    <section aria-label="Role onboarding review">
      <p>
        Phone-verified accounts activate Vendor and Market access during signup.
        Manage completed account access here. Older pending submissions can also
        be completed by their account owner.
      </p>
      <ReadState {...result} retry={result.refresh} />
      {result.data?.length === 0 && (
        <EmptyState title="No onboarding requests">
          <p>No role onboarding requests.</p>
        </EmptyState>
      )}
      {result.data?.map((row) => (
        <Card as="article" key={row.id}>
          <p>
            <strong>{row.draft.name || 'Unsubmitted draft'}</strong> ·{' '}
            {row.role === 'VENDOR' ? 'Vendor' : 'Market Manager'} ·{' '}
            {row.state.toLowerCase().replaceAll('_', ' ')}
          </p>
          <p>
            Account {row.principalId}. {row.draft.contactName} ·{' '}
            {row.draft.email} · {row.draft.phone} · {row.draft.location}{' '}
            {row.draft.timezone}
          </p>
          {row.reviewNote && <p>Review note: {row.reviewNote}</p>}
          {row.evidenceReference && (
            <p>Completion evidence: {row.evidenceReference}</p>
          )}
          {['PENDING_REVIEW', 'COMPLETED', 'SUSPENDED'].includes(row.state) && (
            <CommandForm
              embedded
              title="Manage account access"
              submitLabel="Save access decision"
              onDone={result.refresh}
              run={async (data) => {
                await service.reviewRoleOnboarding({
                  id: String(row.id),
                  revision: row.revision,
                  decision: text(data, 'decision'),
                  slug: String(data.get('slug') ?? ''),
                  note: text(data, 'note'),
                });
              }}
            >
              <label className="field" htmlFor={`review-decision-${row.id}`}>
                Decision
              </label>
              <Select id={`review-decision-${row.id}`} name="decision">
                {row.state === 'PENDING_REVIEW' && (
                  <>
                    <option value="RETURN">Return for changes</option>
                    <option value="APPROVE">Approve and activate</option>
                  </>
                )}
                {row.state !== 'SUSPENDED' && (
                  <option value="SUSPEND">Suspend access</option>
                )}
                <option value="CLOSE">Close onboarding</option>
              </Select>
              {row.state === 'PENDING_REVIEW' && (
                <TextField
                  name="slug"
                  label="New business route slug (required for approval)"
                  required={false}
                  maxLength={120}
                />
              )}
              <TextField
                name="note"
                label="Review evidence or reason"
                maxLength={1000}
                required
              />
            </CommandForm>
          )}
        </Card>
      ))}
    </section>
  );
}
