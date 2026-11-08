import { useCallback, useId, useState } from 'react';
import type {
  ComplianceCatalog,
  ComplianceData,
  DocumentsApi,
} from '@market/api';
import { Alert, Badge, EmptyState, SelectField } from '@market/ui';
import { FarmstandButton as Button, FarmstandIcon } from '@market/ui/farmstand';
import { ReadState, useRead } from '../vendor/common';
import { SettingsPanel } from '../settings/SettingsPanel';
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
    <div className="documents-view">
      <ReadState {...state} retry={state.refresh} />
      {state.data && (
        <>
          <SettingsPanel
            icon="book-open"
            title="Verified guidance"
            description="Editable suggestions help you configure your Market. Review applicability and customize each requirement before activating it."
          >
            <Alert severity="neutral">
              {state.data.limitation} Templates do not establish legal
              obligations or guarantee compliance.
            </Alert>
            <div className="documents-filters">
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
            </div>
            {!state.data.guidance.some(
              (g) => g.jurisdiction === jurisdiction,
            ) && (
              <EmptyState title="No verified guidance selected">
                No legal requirements are inferred from your location. Coverage
                is limited to the listed jurisdictions. Consult your relevant
                issuing authority for other locations.
              </EmptyState>
            )}
            <div className="documents-grid">
              {state.data.guidance
                .filter((g) => g.jurisdiction === jurisdiction)
                .map((g) => (
                  <article key={g.id} className="documents-tile">
                    <header>
                      <span className="markets-stat-icon" aria-hidden>
                        <FarmstandIcon name="shield-check" />
                      </span>
                      <div>
                        <h3>{g.topic}</h3>
                        <p>{g.jurisdiction}</p>
                      </div>
                    </header>
                    <p>{g.summary}</p>
                    <p className="documents-note">
                      <a href={g.sourceUrl} target="_blank" rel="noreferrer">
                        {g.sourceName}
                      </a>{' '}
                      · Verified {g.verifiedOn}
                    </p>
                    <p className="documents-note">{g.limitations}</p>
                    <footer>
                      <Button
                        variant="secondary"
                        size="compact"
                        disabled={!canWrite}
                        onClick={() => setCategory(g.category)}
                      >
                        Customize suggested requirement
                      </Button>
                    </footer>
                  </article>
                ))}
            </div>
          </SettingsPanel>
          <SettingsPanel
            icon="file-text"
            title="Document templates"
            description="Starting points for common participation documents."
          >
            <div className="documents-grid">
              {state.data.documentTemplates.map((t) => (
                <article key={t.category} className="documents-tile">
                  <header>
                    <span className="markets-stat-icon" aria-hidden>
                      <FarmstandIcon name="file-text" />
                    </span>
                    <div>
                      <h3>{t.title}</h3>
                      <p>{t.applicability}</p>
                    </div>
                  </header>
                  <p>{t.description}</p>
                  <p className="documents-note">{t.purpose}</p>
                  <footer>
                    <Badge tone={t.expirationRelevant ? 'warning' : 'neutral'}>
                      {t.expirationRelevant
                        ? 'An expiration date is commonly relevant.'
                        : 'Confirm whether expiration applies.'}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="compact"
                      disabled={!canWrite}
                      onClick={() => setCategory(t.category)}
                    >
                      Customize requirement
                    </Button>
                  </footer>
                </article>
              ))}
            </div>
          </SettingsPanel>
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
    </div>
  );
}
