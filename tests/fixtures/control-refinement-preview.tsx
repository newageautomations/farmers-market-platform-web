import { createRoot } from 'react-dom/client';
import { useState, type CSSProperties } from 'react';
import {
  Button,
  buttonClassName,
  DataTable,
  Dialog,
  Field,
  IconButton,
  Input,
  SearchableMultiSelect,
  SelectField,
} from '@market/ui';
import { platformTheme, themeVariables } from '@market/theme';
import '@market/ui/styles.css';

// Browser-only composition of production controls, without business controllers.
function Preview() {
  const [open, setOpen] = useState(false);
  return (
    <main
      className="admin-dashboard"
      style={
        {
          ...themeVariables({ ...platformTheme, secondary: '#702080' }),
          padding: '1rem',
          minHeight: '100vh',
        } as CSSProperties
      }
    >
      <h1>Shared controls</h1>
      <div style={{ maxWidth: '20rem' }}>
        <Button>Primary action</Button>
        <Button variant="secondary">Secondary action</Button>
        <Button variant="tertiary">Tertiary action</Button>
        <Button disabled>Unavailable action</Button>
        <Button size="compact">Compact action</Button>
        <a href="/market/vendors" className={buttonClassName()}>
          Action link
        </a>
        <IconButton icon="refresh" label="Refresh preview" />
        <SelectField label="Long selection">
          <option>{'An especially long selection label '.repeat(8)}</option>
        </SelectField>
        <SearchableMultiSelect
          label="Multiple choices"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
        />
        <Field id="outside-check" label="Standard checkbox">
          <input id="outside-check" type="checkbox" />
        </Field>
        <Button onClick={() => setOpen(true)}>Edit insurance</Button>
        <DataTable
          label="Records"
          headings={['Name', 'Status']}
          recordDetails={{ status: 1 }}
        >
          <tr key="a">
            <td>Example record</td>
            <td>Active</td>
          </tr>
        </DataTable>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit insurance"
        actions={<Button>Save</Button>}
      >
        <Field
          id="insurance"
          label="Policy"
          info="This explanation remains next to its control, above the modal, without changing the form layout."
        >
          <Input id="insurance" />
        </Field>
      </Dialog>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
