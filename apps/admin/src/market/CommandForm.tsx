import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AppError, safeError } from '@market/api';
import { Card, Alert, Button, ErrorState } from '@market/ui';
import type { ButtonVariant } from '@market/ui/presentation';
import { MarketDialog as Dialog } from './presentation';
export function CommandForm({
  title,
  run,
  onDone,
  children,
  confirm,
  submitLabel = 'Save',
  validate,
  onPendingChange,
  submitVariant = 'primary',
  embedded = false,
  secondaryAction,
}: {
  title: string;
  run: (data: FormData, operationKey: string) => Promise<unknown>;
  onDone: () => void;
  children: ReactNode;
  confirm?: string | ((data: FormData) => string | undefined);
  submitLabel?: string;
  validate?: (data: FormData) => void;
  onPendingChange?: (pending: boolean) => void;
  submitVariant?: ButtonVariant;
  embedded?: boolean;
  secondaryAction?: ReactNode;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<AppError | null>(null),
    [success, setSuccess] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [requiresRefresh, setRequiresRefresh] = useState(false),
    [candidate, setCandidate] = useState<FormData | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const busy = useRef(false),
    intent = useRef<string | null>(null);
  const formId = useId();
  async function execute(data: FormData) {
    if (busy.current || uncertain || requiresRefresh) return;
    busy.current = true;
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    setSuccess(false);
    intent.current ??= crypto.randomUUID();
    try {
      await run(data, intent.current);
      intent.current = null;
      setCandidate(null);
      setSuccess(true);
      onDone();
    } catch (e) {
      const safe = safeError(e);
      setError(safe);
      setCandidate(null);
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(safe.kind))
        setUncertain(true);
      else intent.current = null;
      if (safe.kind === 'conflict') setRequiresRefresh(true);
    } finally {
      busy.current = false;
      setPending(false);
      onPendingChange?.(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || uncertain || requiresRefresh) return;
    const data = new FormData(event.currentTarget);
    try {
      validate?.(data);
      const prompt = typeof confirm === 'function' ? confirm(data) : confirm;
      if (prompt) {
        setConfirmation(prompt);
        setCandidate(data);
      } else void execute(data);
    } catch (e) {
      setError(e instanceof AppError ? e : new AppError('validation'));
    }
  }
  return (
    <Card
      as="section"
      className="command-section"
      surface={embedded ? 'embedded' : 'card'}
    >
      <h2 className="ui-section-title-dashboard">{title}</h2>
      <form
        onSubmit={submit}
        aria-busy={pending}
        aria-describedby={error ? `${formId}-error` : undefined}
      >
        <fieldset disabled={pending || uncertain || requiresRefresh}>
          {children}
        </fieldset>
        <div
          className={
            secondaryAction ? 'ui-actions ui-modal-actions' : 'ui-actions'
          }
        >
          <Button
            type="submit"
            variant={submitVariant}
            disabled={pending || uncertain || requiresRefresh}
          >
            {pending ? 'Saving' : submitLabel}
          </Button>
          {secondaryAction}
        </div>
      </form>
      {error && (
        <div id={`${formId}-error`}>
          <ErrorState error={error} />
          <p>
            Check your entries. If someone else has changed this record, use the
            header refresh button to load the latest details.
          </p>
        </div>
      )}
      {uncertain && (
        <Alert severity="warning">
          We could not confirm whether your changes were saved. Use the header
          refresh button to check before trying again.
        </Alert>
      )}
      {success && <Alert severity="success">Changes saved.</Alert>}
      <Dialog
        open={candidate !== null}
        busy={pending}
        onClose={() => {
          if (!busy.current) setCandidate(null);
        }}
        title={`Confirm ${title.toLowerCase()}`}
        actions={
          <Button
            disabled={pending}
            onClick={() => {
              if (candidate) void execute(candidate);
            }}
          >
            {pending ? 'Saving' : 'Confirm change'}
          </Button>
        }
      >
        <p>{confirmation}</p>
      </Dialog>
    </Card>
  );
}
