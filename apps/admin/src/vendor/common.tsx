import { IconButton } from '@market/ui';
import { useFormProgress } from './useFormProgress';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type ComponentProps,
} from 'react';
import { AppError, safeError } from '@market/api';
import {
  Card,
  Alert,
  Button,
  buttonClassName,
  Dialog,
  ErrorState,
  Field,
  Input,
  Spinner,
} from '@market/ui';
export { DataTable } from '@market/ui';
import { formatDate } from '@market/config';

export function go(path: string) {
  if (
    !window.dispatchEvent(
      new Event('vendor:before-navigate', { cancelable: true }),
    )
  )
    return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  document.querySelector<HTMLElement>('#main')?.focus();
}
export function RouteLink({
  to,
  children,
  variant = 'button',
  current,
}: {
  to: string;
  children: ReactNode;
  variant?: 'button' | 'tab';
  current?: boolean;
}) {
  return (
    <a
      aria-current={current ? 'page' : undefined}
      className={
        variant === 'tab'
          ? 'ui-route-tab'
          : buttonClassName({
              variant: 'secondary',
              className: 'route-button',
            })
      }
      href={to}
      onClick={(e) => {
        if (
          e.button === 0 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          go(to);
        }
      }}
    >
      {children}
    </a>
  );
}
export function useRead<T>(
  key: string,
  read: () => Promise<T>,
  enabled = true,
  options: { retainPreviousData?: boolean } = {},
) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: AppError;
  }>({ key: '' });
  const [revision, setRevision] = useState(0);
  const requestKey = `${key}:${revision}`;
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    read()
      .then((data) => {
        if (current) setResult({ key: requestKey, data });
      })
      .catch((error) => {
        if (current) setResult({ key: requestKey, error: safeError(error) });
      });
    return () => {
      current = false;
    };
  }, [requestKey, read, enabled]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return {
    data:
      enabled && (result.key === requestKey || options.retainPreviousData)
        ? result.data
        : undefined,
    error: result.key === requestKey && enabled ? result.error : undefined,
    refresh,
    loading: enabled && result.key !== requestKey,
  };
}
export function ReadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: AppError;
  retry: () => void;
}) {
  return loading ? (
    <Spinner label="Loading current records" />
  ) : error ? (
    <>
      <ErrorState error={error} />
      <IconButton
        icon="refresh"
        label="Refresh records"
        className="secondary"
        onClick={retry}
      />
    </>
  ) : null;
}
export function Unavailable({ children }: { children: ReactNode }) {
  return (
    <div
      className="capability-note alert ui-alert ui-alert-neutral"
      role="status"
    >
      <p>{children}</p>
    </div>
  );
}
export function TextField({
  name,
  label,
  value,
  type = 'text',
  required = true,
  maxLength,
  info,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  maxLength?: number;
  info?: string;
}) {
  const id = useId();
  return (
    <Field id={id} label={label} info={info}>
      <Input
        id={id}
        name={name}
        defaultValue={value}
        pattern={name === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
        onInput={
          name === 'slug'
            ? (event) => {
                event.currentTarget.value = event.currentTarget.value
                  .toLowerCase()
                  .replace(/\s/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, 120);
              }
            : undefined
        }
        type={type === 'text' && name === 'quantity' ? 'number' : type}
        min={name === 'quantity' ? 1 : undefined}
        required={required}
        maxLength={maxLength}
      />
    </Field>
  );
}
export function integer(
  value: FormDataEntryValue | null,
  { signed = false, zero = false }: { signed?: boolean; zero?: boolean } = {},
) {
  const text = String(value ?? '');
  if (!(signed ? /^-?\d+$/ : /^\d+$/).test(text))
    throw new AppError('validation');
  const n = Number(text);
  if (
    !Number.isSafeInteger(n) ||
    n < (signed ? -2147483648 : zero ? 0 : 1) ||
    n > 2147483647 ||
    (!zero && n === 0)
  )
    throw new AppError('validation');
  return n;
}
export const text = (data: FormData, key: string) =>
  String(data.get(key) ?? '').trim();
export function date(value: string | null | undefined, timezone = 'UTC') {
  return value ? formatDate(value, timezone) : 'Not provided';
}

/** A submitted intent retains one idempotency key. No automatic mutation retry. */
export function CommandForm({
  title,
  run,
  onDone,
  children,
  confirm,
  submitLabel = 'Save',
  validate,
  onPendingChange,
  embedded = false,
  secondaryAction,
  header,
  className = '',
  submitClassName,
  submitVariant,
  submitSize,
  headerControls,
  hideTitle = false,
  id,
  protectChanges = false,
  disableUntilValid = false,
}: {
  title: string;
  run: (data: FormData, operationKey: string) => Promise<unknown>;
  onDone: () => void;
  children: ReactNode;
  confirm?: string | ((data: FormData) => string | undefined);
  submitLabel?: ReactNode;
  validate?: (data: FormData) => void;
  onPendingChange?: (pending: boolean) => void;
  embedded?: boolean;
  secondaryAction?: ReactNode | ((disabled: boolean) => ReactNode);
  header?: ReactNode;
  className?: string;
  submitClassName?: string;
  submitVariant?: ComponentProps<typeof Button>['variant'];
  submitSize?: ComponentProps<typeof Button>['size'];
  headerControls?: (disabled: boolean) => ReactNode;
  hideTitle?: boolean;
  id?: string;
  protectChanges?: boolean;
  disableUntilValid?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const progress = useFormProgress(
    form,
    protectChanges,
    disableUntilValid,
    validate,
  );
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
      progress.saved();
      onDone();
    } catch (e) {
      const safe = safeError(e);
      setError(safe);
      setCandidate(null);
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(safe.kind))
        setUncertain(true);
      else intent.current = null;
      if (['conflict', 'validation'].includes(safe.kind))
        setRequiresRefresh(true);
    } finally {
      busy.current = false;
      setPending(false);
      onPendingChange?.(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || uncertain || requiresRefresh) return;
    if (disableUntilValid && !event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    const data = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name)
      data.set(submitter.name, submitter.value);
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
  const disabled =
    pending ||
    uncertain ||
    requiresRefresh ||
    (disableUntilValid && !progress.valid);
  const secondary =
    typeof secondaryAction === 'function'
      ? secondaryAction(disabled)
      : secondaryAction;
  return (
    <Card
      as="section"
      className={`command-section ${className}`}
      surface={embedded ? 'embedded' : 'card'}
    >
      {!header && !hideTitle && (
        <h2 className="ui-section-title-dashboard">{title}</h2>
      )}
      <form
        ref={form}
        id={id}
        onSubmit={submit}
        aria-busy={pending}
        aria-describedby={error ? `${formId}-error` : undefined}
      >
        {header && (
          <div className="command-form-heading">
            {header}
            <div className="ui-actions">
              {headerControls?.(pending || uncertain || requiresRefresh)}
              <Button
                type="submit"
                className={submitClassName}
                variant={submitVariant}
                size={submitSize}
                disabled={disabled}
              >
                {pending ? 'Saving' : submitLabel}
              </Button>
              {secondary}
            </div>
          </div>
        )}
        <fieldset disabled={pending || uncertain || requiresRefresh}>
          {children}
        </fieldset>
        {!header && (
          <div
            className={
              secondaryAction ? 'ui-actions ui-modal-actions' : 'ui-actions'
            }
          >
            <Button
              type="submit"
              className={submitClassName}
              variant={submitVariant}
              size={submitSize}
              disabled={disabled}
            >
              {pending ? 'Saving' : submitLabel}
            </Button>
            {secondary}
          </div>
        )}
      </form>
      {error && (
        <div id={`${formId}-error`}>
          <ErrorState error={error} />
          <p>
            Review the form values. For version or stale-data errors, refresh
            current records before creating a new intent.
          </p>
        </div>
      )}
      {uncertain && (
        <Alert severity="warning">
          The command outcome is unconfirmed. Refresh current records before
          attempting another change. Do not repeat this intent automatically.
        </Alert>
      )}
      {error && (
        <Button
          className="secondary"
          onClick={() => {
            if (progress.confirmDiscard()) onDone();
          }}
        >
          Check current records
        </Button>
      )}
      {success && (
        <Alert severity="success">
          Backend command confirmed. Current records are being refreshed.
        </Alert>
      )}
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
