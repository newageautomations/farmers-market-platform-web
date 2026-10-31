import { EmptyState } from '@market/ui';
import { Button } from '@market/ui';
import { useState } from 'react';
import {
  type MarketOperationsData,
  type MarketOperationsApi,
  type OperationsCommand,
  type ApplicationVersion,
} from '@market/api';
import { ApplicationSubmissions } from './ApplicationSubmissions';
import { DataTable } from '../common';
import { StatusBadge, friendlyLabel } from '../presentation';

import { ApplicationBuilder } from './ApplicationBuilder';

export function Applications({
  api,
  data,
  run,
  canManage,
  canConfirmDates = false,
  canBilling = false,
  canRequestDocuments = false,
  view = 'templates',
}: {
  api?: MarketOperationsApi;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  canConfirmDates?: boolean;
  canBilling?: boolean;
  canRequestDocuments?: boolean;
  view?: 'templates' | 'submissions';
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const version = data.versions?.find((v) => v.id === selected);

  return (
    <div>
      {view === 'templates' ? (
        <>
          {canManage && (
            <div className="ops-toolbar">
              <Button
                variant="secondary"
                size="compact"
                type="button"
                onClick={async () => {
                  const row = (await run({
                    action: 'CREATE_APPLICATION',
                    data: { name: 'Untitled application' },
                  })) as ApplicationVersion;
                  if (row) setSelected(row.id);
                }}
              >
                Create application
              </Button>
            </div>
          )}
          {version ? (
            <>
              <Button
                variant="secondary"
                size="compact"
                type="button"
                onClick={() => setSelected(null)}
              >
                Back to applications
              </Button>
              <ApplicationBuilder
                key={`${version.id}:${version.revision}`}
                version={version}
                data={data}
                run={run}
                canManage={canManage}
                onSelect={setSelected}
              />
            </>
          ) : (
            <DataTable
              label="Applications"
              recordDetails={{ status: 2 }}
              headings={['Application', 'Visibility', 'Status', 'Edit']}
            >
              {data.templates?.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    {friendlyLabel(t.visibility)}
                    {t.advertised && <small>Advertised on storefront</small>}
                  </td>
                  <td>
                    {data.versions
                      ?.filter((v) => v.templateId === t.id)
                      .map((v) => (
                        <div key={v.id}>
                          <StatusBadge>{v.status}</StatusBadge>
                        </div>
                      ))}
                  </td>
                  <td>
                    <div className="ops-toolbar">
                      {data.versions
                        ?.filter((v) => v.templateId === t.id)
                        .map((v) => (
                          <Button
                            variant="secondary"
                            size="compact"
                            key={v.id}
                            type="button"
                            onClick={() => setSelected(v.id)}
                          >
                            Open {friendlyLabel(v.status)}
                          </Button>
                        ))}
                      {canManage && (
                        <Button
                          variant="destructive"
                          size="compact"
                          type="button"
                          onClick={() =>
                            run({
                              action: 'RETIRE_APPLICATION',
                              id: t.id,
                              expectedRevision: t.revision,
                              data: {},
                            })
                          }
                        >
                          Retire Application
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data.templates?.length && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No applications yet">
                      <p>No applications yet.</p>
                    </EmptyState>
                  </td>
                </tr>
              )}
            </DataTable>
          )}
        </>
      ) : api ? (
        <ApplicationSubmissions
          key={data.marketId}
          api={api}
          data={data}
          run={run}
          canManage={canManage}
          canConfirmDates={canConfirmDates}
          canBilling={canBilling}
          canRequestDocuments={canRequestDocuments}
        />
      ) : (
        <p>Application review connection is unavailable.</p>
      )}
    </div>
  );
}
