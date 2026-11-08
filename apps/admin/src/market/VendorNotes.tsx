import { useId, useState } from 'react';
import { safeError, type AppError, type OperationsCommand } from '@market/api';
import { Dialog, ErrorState, Field, Textarea } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';

/** The only manager edit for a platform Vendor: private notes. */
export function VendorNotesDialog({
  open,
  vendorId,
  name,
  notes,
  revision,
  run,
  onClose,
  onSaved,
}: {
  open: boolean;
  vendorId: number;
  name: string;
  notes: string;
  /** The saved note's revision; omitted when no note exists yet. */
  revision?: number;
  run: (command: OperationsCommand) => Promise<unknown>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [value, setValue] = useState(notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError>();
  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      await run({
        action: 'SAVE_VENDOR_NOTES',
        expectedRevision: revision,
        data: { vendorId, notes: value },
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(safeError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      title="Private notes"
      description={`${name} manages its own business details. Notes are visible only to your market team.`}
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <FarmstandButton variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </FarmstandButton>
          <FarmstandButton loading={busy} onClick={save}>
            Save notes
          </FarmstandButton>
        </>
      }
    >
      <div className="vendor-notes-dialog farmstand-controls">
        <Field id={id} label="Private manager notes">
          <Textarea
            id={id}
            rows={6}
            maxLength={5000}
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        {error && <ErrorState error={error} />}
      </div>
    </Dialog>
  );
}
