import { useCallback, useId, useState } from 'react';
import type {
  ComplianceCatalog,
  ComplianceData,
  DocumentsApi,
} from '@market/api';
import { Alert, Button, Card, EmptyState, SelectField } from '@market/ui';
import { ReadState, useRead } from '../vendor/common';
import { RequirementDialog } from './DocumentsWorkspace';

export function ComplianceGuidance({
  api,
  data,
  canWrite,
  onChanged,
}: {
  api: DocumentsApi;
  data: ComplianceData;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [category, setCategory] = useState<string>(),
    [jurisdiction, setJurisdiction] = useState(''),
    id = useId();
  const read = useCallback(
    () => api.advanced<ComplianceCatalog>({ view: 'catalog' }),
    [api],
  );
  const state = useRead('compliance-guidance', read);
  return (
    <>
      <p>
        Editable suggestions help you configure your Market. Review
        applicability and customize each requirement before activating it.
      </p>
      <ReadState {...state} retry={state.refresh} />
      {state.data && (
        <>
          <Alert severity="neutral">
            {state.data.limitation} Templates do not establish legal obligations
            or guarantee compliance.
          </Alert>
          <SelectField
            id={id}
            label="Guidance jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            <option value="">Select a jurisdiction</option>
            {[...new Set(state.data.coverage)].map((j) => (
              <option key={j}>{j}</option>
            ))}
            <option value="unavailable">Other jurisdictions</option>
          </SelectField>
          {!state.data.guidance.some(
            (g) => g.jurisdiction === jurisdiction,
          ) && (
            <EmptyState title="No verified guidance selected">
              No legal requirements are inferred from your location. Coverage is
              limited to the listed jurisdictions. Consult your relevant issuing
              authority for other locations.
            </EmptyState>
          )}
          <div className="documents-grid">
            {state.data.guidance
              .filter((g) => g.jurisdiction === jurisdiction)
              .map((g) => (
                <Card key={g.id}>
                  <p>
                    {g.jurisdiction}: {g.topic}
                  </p>
                  <p>{g.summary}</p>
                  <p>
                    <a href={g.sourceUrl} target="_blank" rel="noreferrer">
                      {g.sourceName}
                    </a>{' '}
                    · Verified {g.verifiedOn}
                  </p>
                  <p>{g.limitations}</p>
                  <Button
                    variant="secondary"
                    disabled={!canWrite}
                    onClick={() => setCategory(g.category)}
                  >
                    Customize suggested requirement
                  </Button>
                </Card>
              ))}
          </div>
          <div className="documents-grid">
            {state.data.documentTemplates.map((t) => (
              <Card key={t.category}>
                <p>{t.title}</p>
                <p>{t.description}</p>
                <p>{t.applicability}</p>
                <p>{t.purpose}</p>
                <p>
                  {t.expirationRelevant
                    ? 'An expiration date is commonly relevant.'
                    : 'Confirm whether expiration applies.'}
                </p>
                <Button
                  variant="secondary"
                  disabled={!canWrite}
                  onClick={() => setCategory(t.category)}
                >
                  Customize requirement
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
      {category && (
        <RequirementDialog
          api={api}
          data={data}
          initialCategory={category}
          onClose={() => setCategory(undefined)}
          onSaved={() => {
            setCategory(undefined);
            onChanged();
          }}
        />
      )}
    </>
  );
}
