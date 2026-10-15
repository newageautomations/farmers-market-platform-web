import { useState } from 'react';
import {
  Button,
  Dialog,
  Drawer,
  Field,
  Input,
  Select,
  Spinner,
} from '@market/ui';
import {
  Choice as MarketChoice,
  SelectField,
} from '../../../../../apps/admin/src/market/common';
import { Choice as ManagementChoice } from '../../../../../apps/admin/src/management/common';
import { Control } from '../../../../../apps/admin/src/market/phase14/common';
import {
  AnimatedDisclosure,
  MarketDialog,
  SearchSelect,
  StatusBadge,
} from '../../../../../apps/admin/src/market/presentation';
import { SignupPasswords } from '../../../../../apps/storefront/src/components/SignupPasswords';
import type { DisplayState } from '../../candidates';

const options = [
  { value: 'synthetic-a', label: 'Synthetic Orchard' },
  { value: 'synthetic-b', label: 'Synthetic Garden' },
];
export function InteractiveSample({
  id,
  state,
  variant,
}: {
  id: string;
  state: DisplayState;
  variant: string;
}) {
  const [value, setValue] = useState(
    state === 'selected' ? 'synthetic-b' : 'synthetic-a',
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(state === 'loading' || state === 'disabled');
  const [veto, setVeto] = useState(false);
  // React owns the option children so SSR selects the real value. No island is needed for this native control.
  if (id === 'SEL-01')
    return (
      <Field
        id="synthetic-select"
        label="Business"
        error={state === 'error' ? 'Simulated caller error' : undefined}
      >
        <Select
          id="synthetic-select"
          defaultValue={state === 'selected' ? 'b' : 'a'}
          disabled={state === 'disabled' || state === 'loading'}
          aria-invalid={state === 'error' || undefined}
          aria-describedby={
            state === 'error' ? 'synthetic-select-error' : undefined
          }
        >
          <option value="a">Synthetic Orchard</option>
          <option value="b">Synthetic Garden</option>
        </Select>
      </Field>
    );
  if (id === 'BTN-05') return <SignupPasswords />;
  if (id === 'SEL-02')
    return (
      <MarketChoice
        label="Status"
        name="status"
        value={state === 'selected' ? 'APPROVED' : 'PENDING'}
        choices={['PENDING', 'APPROVED', 'DECLINED']}
      />
    );
  if (id === 'SEL-03')
    return (
      <SelectField name="synthetic-choice" label="Business">
        <option value="">Choose a business</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    );
  if (id === 'SEL-04')
    return (
      <ManagementChoice
        name="synthetic-choice"
        label="Business"
        value={value}
        onChange={setValue}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </ManagementChoice>
    );
  if (id === 'SEL-05')
    return (
      <Control label="Business">
        {(controlId) => (
          <select
            id={controlId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Control>
    );
  if (id === 'SEL-07')
    return (
      <SearchSelect
        label="Business"
        placeholder="Choose a business"
        value={value}
        onChange={setValue}
        options={options}
        disabled={state === 'disabled' || state === 'loading'}
      />
    );
  if (id === 'CRD-04')
    return (
      <AnimatedDisclosure
        title="Saved layouts"
        className="saved-layouts-card"
        defaultOpen
      >
        <div className="layout-card-grid">
          <article className="layout-card" aria-label="Synthetic layout">
            <div className="layout-card-preview" aria-hidden="true" inert>
              <p>Canvas preview omitted</p>
            </div>
            <div className="layout-card-info">
              <span className="layout-card-name">Synthetic layout</span>
              <StatusBadge>Draft</StatusBadge>
            </div>
            <div className="layout-card-actions">
              <Button>Edit layout</Button>
              <Button className="secondary">Copy Layout</Button>
            </div>
          </article>
        </div>
      </AnimatedDisclosure>
    );
  if (id.startsWith('DLG-')) {
    const Overlay =
      id === 'DLG-02' ? MarketDialog : variant === 'drawer' ? Drawer : Dialog;
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open {id}</Button>
        {id === 'DLG-02' && (
          <label className="field">
            <span>Local close veto</span>
            <input
              type="checkbox"
              checked={veto}
              onChange={(e) => setVeto(e.target.checked)}
            />
          </label>
        )}
        <Overlay
          open={open}
          onClose={() => setOpen(false)}
          title={`Synthetic ${id}`}
          busy={busy}
          focusTitle={variant === 'title-focus'}
          {...(id === 'DLG-02' ? { beforeClose: () => !veto } : {})}
        >
          <p>This is a synthetic display. Nothing is saved.</p>
          <label className="field" htmlFor="dialog-note">
            Note
            <Input id="dialog-note" name="note" defaultValue="Synthetic note" />
          </label>
          {busy && (
            <>
              <Spinner label="Simulated waiting state" />
              <Button className="secondary" onClick={() => setBusy(false)}>
                End simulated wait
              </Button>
            </>
          )}
          {state === 'error' && (
            <p role="alert">
              Simulated caller error, not an overlay error variant.
            </p>
          )}
          {veto && (
            <Button onClick={() => setVeto(false)}>
              Release local close veto
            </Button>
          )}
          <p>
            Use Tab, Shift+Tab, Escape and Close to compare native focus
            behavior.
          </p>
        </Overlay>
      </>
    );
  }
  return (
    <Select
      aria-label="Synthetic choice"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
