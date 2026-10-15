import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SectionHeader,
  Skeleton,
  Spinner,
  Table,
  TableBody,
  TableHead,
  Tabs,
} from '@market/ui';
import {
  AppError,
  type AnalyticsMetadata,
  type BoothInvoice,
  type MarketOperationsData,
} from '@market/api';
import {
  DataTable,
  ReadState as VendorReadState,
  TextField,
  Unavailable,
} from '../../../../../apps/admin/src/vendor/common';
import {
  Pager,
  Readiness,
  Choice,
} from '../../../../../apps/admin/src/management/common';
import {
  RangeForm,
  ReadState as MarketReadState,
} from '../../../../../apps/admin/src/market/common';
import {
  AnimatedDisclosure,
  StatusBadge,
} from '../../../../../apps/admin/src/market/presentation';
import { Metadata } from '../../../../../apps/admin/src/vendor/analytics';
import {
  Billing,
  Invoice,
} from '../../../../../apps/admin/src/market/phase14/Billing';
import { Control } from '../../../../../apps/admin/src/market/phase14/common';
import { Chevron } from '../../../../../apps/admin/src/NavigationIcon';
import type { DisplayState } from '../../candidates';

const title = 'Synthetic market overview';
const syntheticError = new AppError('unavailable');
const invoice: BoothInvoice = {
  id: 101,
  marketId: 1,
  revision: 1,
  assignmentId: 1,
  occurrenceId: 1,
  directoryId: 1,
  status: 'OPEN',
  currency: 'USD',
  totalMinor: 9000,
  paidMinor: 2000,
  dueAt: null,
  recipientSnapshot: {
    businessName: 'Synthetic Orchard',
    firstName: 'Synthetic',
    lastName: 'Vendor',
    email: '',
    phone: '',
    description: '',
    category: '',
  },
  lines: [
    {
      description: 'Synthetic booth rental',
      quantity: 1,
      unitMinor: 5000,
      lineMinor: 5000,
      currency: 'USD',
    },
    {
      description:
        'Synthetic covered corner space with electricity and an intentionally long description for responsive review',
      quantity: 2,
      unitMinor: 2000,
      lineMinor: 4000,
      currency: 'USD',
    },
  ],
};
const billing: MarketOperationsData = {
  marketId: 1,
  providerState: 'NOT_CONFIGURED',
  fundsFlowPolicy: 'NOT_CONFIGURED',
  occurrences: [],
  billingSummary: {
    paid: 12,
    open: 4,
    draft: 1,
    pastDue: 2,
    complimentary: 3,
    byCurrency: {
      USD: {
        expectedMinor: 150000,
        collectedMinor: 100000,
        waivedMinor: 10000,
        outstandingMinor: 40000,
      },
      CAD: {
        expectedMinor: 25000,
        collectedMinor: 15000,
        waivedMinor: 0,
        outstandingMinor: 10000,
      },
    },
  },
};
const metadata: AnalyticsMetadata = {
  projectionCode: 'synthetic',
  schemaVersion: 1,
  generationId: null,
  activeGenerationId: null,
  sourceAsOf: '2026-10-12T12:00:00Z',
  asOf: '2026-10-12T12:00:00Z',
  lastSuccessfulAt: null,
  lastReconciledAt: null,
  errorCode: null,
  status: 'ACTIVE',
  completeness: 'COMPLETE',
  technicalBucket: 'SYNTHETIC',
  marketFinancialPolicy: 'NOT_CONFIGURED',
};
const noCommand = async () => {
  throw new Error('Gallery commands are unavailable');
};
const rows = [
  { name: 'Synthetic Orchard', status: 'Active', count: 12 },
  {
    name: 'Synthetic Garden with an intentionally long business name for responsive table review',
    status: 'Pending',
    count: 3,
  },
];
const headings = ['Business', 'Status', 'Products'];
function TableRows() {
  return rows.map((row) => (
    <tr key={row.name}>
      <th scope="row">{row.name}</th>
      <td>{row.status}</td>
      <td>{row.count}</td>
    </tr>
  ));
}

/** Fixture callers reuse production exports; private patterns are explicitly partial. */
export function AdditionalSample({
  id,
  state,
}: {
  id: string;
  state: DisplayState;
}) {
  const [page, setPage] = useState(
    state === 'selected' ? 1 : state === 'disabled' ? 2 : 0,
  );
  const [panel, setPanel] = useState(
    state === 'selected' ? 'layers' : 'inspector',
  );
  const [choice, setChoice] = useState('synthetic-a');
  const [retried, setRetried] = useState(false);
  if (id === 'DDN-01')
    return (
      <Dropdown label="Synthetic disclosure">
        <p>Original native nested content.</p>
        <Dropdown label="Nested disclosure">
          <p>Synthetic nested content.</p>
        </Dropdown>
      </Dropdown>
    );
  if (id === 'DDN-02')
    return (
      <AnimatedDisclosure
        title="Synthetic disclosure"
        defaultOpen={state === 'expanded'}
      >
        <p>Original animated nested content.</p>
        <Button>Local child action</Button>
      </AnimatedDisclosure>
    );
  if (id === 'DDN-03')
    return (
      <details className="booth-list-item" open={state === 'expanded'}>
        <summary>
          <span>Synthetic Orchard</span>
          <span className="ops-vendor-booths">A1, A2</span>
          <Chevron />
        </summary>
        <div className="booth-list-details">
          <p>Partial nested content; AssignmentCard omitted.</p>
          <details>
            <summary>Nested invoice disclosure</summary>
            <p>Invoice controller omitted.</p>
          </details>
        </div>
      </details>
    );
  if (id === 'BDG-01')
    return (
      <>
        <p>
          <Badge>Active</Badge> <Badge>Pending</Badge>
        </p>
        <article className="card">
          <span className="badge">Scheduled</span>
          <p>Native badge in card context.</p>
        </article>
      </>
    );
  if (id === 'BDG-02')
    return (
      <>
        <div className="actions">
          {[
            'ACTIVE',
            'PENDING',
            'APPROVED',
            'DECLINED',
            'SCHEDULED',
            'UNAVAILABLE',
          ].map((s) => (
            <StatusBadge key={s}>{s}</StatusBadge>
          ))}
        </div>
        <DataTable
          label="Synthetic badge table context"
          headings={['Business', 'Status']}
        >
          <tr>
            <th scope="row">Synthetic Orchard</th>
            <td>
              <StatusBadge>APPROVED</StatusBadge>
            </td>
          </tr>
        </DataTable>
      </>
    );
  if (id === 'BDG-03')
    return (
      <div className="actions">
        {['available', 'assigned', 'paid'].map((s) => (
          <span key={s} className={`booth-state ${s}`}>
            {s === 'available'
              ? 'Available'
              : s === 'paid'
                ? 'Paid'
                : 'Assigned'}
          </span>
        ))}
      </div>
    );
  if (id === 'BDG-04')
    return (
      <Readiness
        items={['NOT_CONFIGURED', 'READY'].map((s) => ({
          code: 'sms',
          state: s,
          qualification: 'Synthetic qualification',
          detail: 'Synthetic readiness detail',
          asOf: '2026-10-12T12:00:00Z',
        }))}
      />
    );
  if (id === 'ALT-01')
    return (
      <>
        <Alert>
          Synthetic informational message. Alert has no severity prop.
        </Alert>
        <ErrorState error={syntheticError} />
      </>
    );
  if (id === 'ALT-02')
    return (
      <Unavailable>Synthetic optional capability is unavailable.</Unavailable>
    );
  if (id === 'ALT-04')
    return (
      <>
        {['ACTIVE', 'BUILDING', 'FAILED'].map((s) => (
          <Metadata key={s} metadata={{ ...metadata, status: s }} />
        ))}
      </>
    );
  if (id === 'EMP-01')
    return (
      <>
        <EmptyState title="No markets">
          <p>Synthetic empty collection.</p>
          <a href="#sample-note">Explore the local specimen</a>
        </EmptyState>
        <EmptyState title="No search results">
          <p>Try another synthetic search.</p>
        </EmptyState>
      </>
    );
  if (id === 'EMP-03')
    return (
      <>
        <p>No tenants match these filters.</p>
        <p>No upcoming occurrences are currently listed.</p>
      </>
    );
  if (id === 'LOD-01')
    return (
      <>
        <Spinner label="Synthetic loading state" />
        <div aria-busy="true">
          <Skeleton />
          <p role="status">Synthetic skeleton caller is loading.</p>
        </div>
      </>
    );
  if (id === 'LOD-02' || id === 'LOD-03') {
    const ReadState = id === 'LOD-02' ? VendorReadState : MarketReadState;
    return (
      <>
        <ReadState
          loading={state !== 'error' && !retried}
          error={state === 'error' && !retried ? syntheticError : undefined}
          retry={() => setRetried(true)}
        />
        {retried && (
          <p role="status">Local retry simulation completed. No request ran.</p>
        )}
      </>
    );
  }
  if (id === 'TBL-01')
    return (
      <Table aria-label="Synthetic businesses">
        <caption>Synthetic businesses</caption>
        <TableHead>
          <tr>
            {headings.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </TableHead>
        <TableBody>
          <TableRows />
        </TableBody>
      </Table>
    );
  if (id === 'TBL-02')
    return (
      <>
        <DataTable
          label="Synthetic businesses"
          headings={headings}
          sort={
            state === 'selected'
              ? { heading: 'Business', direction: 'ascending' }
              : undefined
          }
        >
          <TableRows />
        </DataTable>
        <DataTable label="Synthetic empty data" headings={headings}>
          {null}
        </DataTable>
      </>
    );
  if (id === 'TBL-03')
    return <Invoice invoice={invoice} run={noCommand} canManage={false} />;
  if (id === 'KPI-02')
    return (
      <dl
        className="ops-day-summary"
        aria-label="Occurrence summary"
        aria-live="polite"
      >
        <div>
          <dt>Expected vendors</dt>
          <dd>24</dd>
          <dd className="ops-day-summary-detail">20 assigned · 4 unassigned</dd>
        </div>
        <div>
          <dt>Checked in</dt>
          <dd>18</dd>
          <dd className="ops-day-summary-detail">6 awaiting arrival</dd>
        </div>
        <div>
          <dt>Attendance</dt>
          <dd className="ops-day-summary-detail">
            <span>18 attended</span>
            <span>2 no show</span>
          </dd>
        </div>
        <div>
          <dt>Accepted rentals</dt>
          <dd>32</dd>
          <dd className="ops-day-summary-detail">
            <span>Table: 24</span>
            <span>Chair: 8</span>
          </dd>
        </div>
        <div>
          <dt>Paid invoices</dt>
          <dd>12</dd>
          <dd className="ops-day-summary-detail">4 open · 2 past due</dd>
        </div>
      </dl>
    );
  if (id === 'KPI-03')
    return (
      <dl className="facts">
        {[
          ['Vendors', '1,240'],
          ['Markets', '128'],
          ['Active tenants', '1,300'],
          ['Suspended tenants', '68'],
        ].map(([label, count]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
    );
  if (id === 'KPI-04')
    return <Billing data={billing} run={noCommand} canManage={false} />;
  if (id === 'FIL-01')
    return (
      <div className="market-workspace">
        <RangeForm
          range={{ from: '2026-10-01', through: '2026-10-31' }}
          onChange={() => {}}
        />
      </div>
    );
  if (id === 'FIL-02')
    return (
      <>
        <div className="vendor-workspace">
          <form className="filter-bar">
            <TextField
              name="search"
              label="Search products"
              required={false}
              maxLength={200}
            />
            <Button type="submit">Search</Button>
          </form>
        </div>
        <div className="management-workspace">
          <form className="filter-bar">
            <TextField
              name="search"
              label="Business name or slug"
              required={false}
              maxLength={80}
            />
            <Choice name="kind" label="Tenant kind" required={false}>
              <option value="">All kinds</option>
              <option value="VENDOR">Vendor</option>
              <option value="MARKET">Market</option>
            </Choice>
            <Choice name="status" label="Tenant status" required={false}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Choice>
            <Button type="submit">Search tenants</Button>
          </form>
        </div>
      </>
    );
  if (id === 'FIL-04')
    return (
      <>
        <Control label="Stock for Market Date">
          {(controlId) => (
            <select
              id={controlId}
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
            >
              <option value="synthetic-a">Synthetic Saturday</option>
              <option value="synthetic-b">Synthetic Sunday</option>
            </select>
          )}
        </Control>
        <form className="ops-toolbar">
          <Control label="Approve directory business">
            {(controlId) => (
              <select id={controlId} required defaultValue="">
                <option value="">Choose business</option>
                <option value="synthetic">Synthetic Orchard</option>
              </select>
            )}
          </Control>
          <button type="submit">Approve occurrence</button>
        </form>
      </>
    );
  if (id === 'TAB-01')
    return (
      <Tabs
        items={[
          { label: 'Overview', content: <p>Synthetic overview panel.</p> },
          { label: 'Orders', content: <p>Synthetic orders panel.</p> },
          {
            label: 'Long synthetic view label',
            content: <p>Synthetic long-label panel.</p>,
          },
        ]}
      />
    );
  if (id === 'TAB-02')
    return (
      <div className="designer">
        <aside className="designer-sidebar" aria-label="Layout properties">
          <div className="designer-tabs">
            {['inspector', 'layers'].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={panel === value}
                onClick={() => setPanel(value)}
              >
                {value === 'inspector' ? 'Inspector' : 'Layers'}
              </button>
            ))}
          </div>
          <p data-simulated-panel>
            Simulated {panel} content. Original editor panel omitted.
          </p>
        </aside>
      </div>
    );
  if (id === 'TAB-03')
    return (
      <nav className="overview-links" aria-label="Billing catalog">
        {['Plans', 'Features', 'Metrics'].map((s) => (
          <a
            className="button secondary route-button"
            key={s}
            href="#sample-note"
          >
            {s}
          </a>
        ))}
      </nav>
    );
  if (id === 'PAG-02')
    return (
      <Pager
        skip={page * 20}
        total={45}
        setSkip={(skip) => setPage(skip / 20)}
      />
    );
  if (id === 'PAG-01' || id === 'PAG-03') {
    const pagination = (
      <Pagination
        label="Synthetic result pages"
        hasPrevious={page > 0}
        hasNext={page < 2}
        onPrevious={() => setPage(Math.max(0, page - 1))}
        onNext={() => setPage(Math.min(2, page + 1))}
      />
    );
    return id === 'PAG-03' ? (
      <div role="region" aria-label="Synthetic result pages">
        <p>
          45 records. Showing {page * 20 + 1} to {Math.min(page * 20 + 20, 45)}.
        </p>
        {pagination}
      </div>
    ) : (
      <>
        <p data-synthetic-page>Fixture caller page {page + 1} of 3.</p>
        {pagination}
      </>
    );
  }
  if (id === 'PGH-01')
    return (
      <PageHeader title={title}>
        <p>Synthetic description for heading comparison.</p>
        <Button>Local heading action</Button>
      </PageHeader>
    );
  if (id === 'SCH-01')
    return (
      <>
        <section>
          <SectionHeader title="Synthetic section" />
          <p>Synthetic section content.</p>
        </section>
        <section>
          <SectionHeader title="Synthetic section">
            <Button>Local section action</Button>
          </SectionHeader>
          <p>Synthetic section content.</p>
        </section>
      </>
    );
  if (id === 'SCH-03')
    return (
      <>
        <section className="dashboard-card">
          <h2>Synthetic section</h2>
          <p>Synthetic market section content.</p>
        </section>
        <article className="card">
          <h2>Synthetic section</h2>
          <p>Synthetic vendor section content.</p>
        </article>
      </>
    );
  throw new Error(`No React gallery specimen for ${id}`);
}
