import { useCallback, useId, useState, type SubmitEvent } from 'react';
import {
  safeError,
  type VendorMarketPickupApi,
  type VendorMarketPickupOption,
} from '@market/api';
import { Alert, Dialog, Field, Input, Textarea } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import { ReadState, useRead } from './common';

export function MarketPickupOptions({
  api,
  membershipId,
}: {
  api: VendorMarketPickupApi;
  membershipId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FarmstandButton
        variant="secondary"
        size="compact"
        onClick={() => setOpen(true)}
      >
        Pickup options
      </FarmstandButton>
      <Dialog
        open={open}
        size="standard"
        title="Pickup options"
        description="Pickup is included for your market preorders. Add other ways for customers to collect their orders at this market."
        onClose={() => setOpen(false)}
      >
        {open && <PickupOptionsForm api={api} membershipId={membershipId} />}
      </Dialog>
    </>
  );
}

function PickupOptionsForm({
  api,
  membershipId,
}: {
  api: VendorMarketPickupApi;
  membershipId: string;
}) {
  const id = useId();
  const read = useCallback(
    () => api.options(membershipId),
    [api, membershipId],
  );
  const query = useRead(`market-pickup:${membershipId}`, read);
  const [saved, setSaved] = useState<readonly VendorMarketPickupOption[]>();
  const options = saved ?? query.data;
  const [editing, setEditing] = useState<VendorMarketPickupOption>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(input: { name: string; instructions: string } | null) {
    setError('');
    setNotice('');
    setPending(true);
    try {
      setSaved(await api.save(membershipId, editing?.id ?? null, input));
      setEditing(undefined);
      setNotice(input ? 'Pickup option saved.' : 'Pickup option removed.');
      return true;
    } catch (error) {
      setError(safeError(error).message);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const instructions = String(data.get('instructions') ?? '').trim();
    if (!name) {
      setError('Enter a name for this pickup option.');
      return;
    }
    if (await save({ name, instructions })) form.reset();
  }

  return (
    <>
      <ReadState
        loading={query.loading}
        error={query.error}
        retry={query.refresh}
      />
      {options && (
        <>
          {options.length > 0 && (
            <ul aria-label="Additional pickup options">
              {options.map((option) => (
                <li key={option.id}>
                  <strong>{option.name}</strong>{' '}
                  <FarmstandButton
                    type="button"
                    variant="secondary"
                    aria-label={`Edit ${option.name}`}
                    disabled={pending}
                    onClick={() => {
                      setEditing(option);
                      setError('');
                      setNotice('');
                    }}
                  >
                    Edit
                  </FarmstandButton>
                </li>
              ))}
            </ul>
          )}
          <form key={editing?.id ?? 'add'} onSubmit={submit}>
            <Field id={`${id}-name`} label="Pickup name">
              <Input
                id={`${id}-name`}
                name="name"
                defaultValue={editing?.name}
                placeholder="Curbside pickup"
                required
                maxLength={80}
                disabled={pending}
              />
            </Field>
            <Field id={`${id}-instructions`} label="Customer instructions">
              <Textarea
                id={`${id}-instructions`}
                name="instructions"
                defaultValue={editing?.instructions}
                rows={3}
                maxLength={1000}
                disabled={pending}
              />
            </Field>
            {error && <Alert severity="error">{error}</Alert>}
            {notice && <p role="status">{notice}</p>}
            <div className="ui-actions">
              <FarmstandButton type="submit" disabled={pending}>
                {editing ? 'Save changes' : 'Add pickup option'}
              </FarmstandButton>
              {editing && (
                <>
                  <FarmstandButton
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setEditing(undefined)}
                  >
                    Cancel
                  </FarmstandButton>
                  <FarmstandButton
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void save(null)}
                  >
                    Remove option
                  </FarmstandButton>
                </>
              )}
            </div>
          </form>
        </>
      )}
    </>
  );
}
