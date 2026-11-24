import { useCallback, useId, useRef, useState, type FormEvent } from 'react';
import type { TestAccountProblem, TestAccountSummary } from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  Link,
  PhoneInput,
  passwordMaximum,
} from '@market/ui';
import type { ManagementService } from './service';
import { Choice, Pager } from './common';
import {
  DataTable,
  ReadState,
  TextField,
  date,
  text,
  useRead,
} from '../vendor/common';

const accountTypes = {
  customer: 'Customer',
  vendor: 'Vendor owner',
  market_manager: 'Market manager',
} as const;
const errors: Record<TestAccountProblem, string> = {
  NAME_INVALID: 'Enter a valid first and last name.',
  EMAIL_INVALID: 'Enter an email address ending in @fixtures.invalid.',
  EMAIL_IN_USE:
    'This email already belongs to an account. Enter a different email.',
  PHONE_INVALID: 'Enter a valid phone number with its country calling code.',
  PHONE_IN_USE:
    'This phone number already belongs to an account. Enter a different number or leave it blank.',
  PHONE_POOL_EXHAUSTED:
    'All fictional phone numbers are in use. Enter a unique test phone number.',
  PASSWORD_INVALID:
    'Use 11 to 72 characters, with an uppercase letter, a number, and a symbol. Spaces are unavailable.',
  PASSWORD_MISMATCH: 'The passwords must match.',
  WORKSPACE_INVALID:
    'Enter a valid workspace name for the selected account type.',
  WORKSPACE_IN_USE:
    'A workspace with this name or route already exists. Enter a different name.',
  BUSY: 'Another test account request is in progress. Try again in a moment.',
  CREATE_FAILED:
    'The account could not be created. Check the account list before trying again.',
};

type TestAccountsApi = Pick<
  ManagementService,
  'testAccounts' | 'createTestAccount'
>;

type Confirmation = {
  account: TestAccountSummary;
  destination: string;
  password: string;
};

function verification(account: TestAccountSummary) {
  if (account.emailVerified && account.phoneVerified)
    return 'Verified (simulated)';
  if (account.emailVerified) return 'Email verified';
  if (account.phoneVerified) return 'Phone verified';
  return 'Unverified';
}

export function PlatformTestAccounts({
  service,
}: {
  service: TestAccountsApi;
}) {
  const [skip, setSkip] = useState(0);
  const [open, setOpen] = useState(false);
  const read = useCallback(
    () => service.testAccounts(skip, 20),
    [service, skip],
  );
  const result = useRead(`platform-test-accounts:${skip}`, read);
  return (
    <>
      <div className="ui-control-row">
        <Button onClick={() => setOpen(true)}>Create Test Account</Button>
      </div>
      <ReadState {...result} retry={result.refresh} />
      {result.data &&
        (result.data.totalItems ? (
          <>
            <DataTable
              label="Test accounts"
              headings={[
                'Full name',
                'Email address',
                'Phone number',
                'Account type',
                'Workspace',
                'Verification status',
                'Created',
              ]}
              wide
            >
              {result.data.items.map((account) => (
                <tr key={account.id}>
                  <th scope="row">
                    {account.firstName} {account.lastName}
                  </th>
                  <td>{account.email}</td>
                  <td>{account.phone ?? 'Not provided'}</td>
                  <td>{accountTypes[account.type]}</td>
                  <td>{account.workspaceName ?? 'None'}</td>
                  <td>
                    <Badge
                      tone={
                        account.emailVerified && account.phoneVerified
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {verification(account)}
                    </Badge>
                  </td>
                  <td>{date(account.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
            <Pager
              skip={skip}
              total={result.data.totalItems}
              count={result.data.items.length}
              setSkip={setSkip}
            />
          </>
        ) : (
          <EmptyState title="No test accounts yet" />
        ))}
      {open && (
        <CreateTestAccount
          service={service}
          onClose={() => setOpen(false)}
          onCreated={() => {
            if (skip) setSkip(0);
            else result.refresh();
          }}
        />
      )}
    </>
  );
}

function CreateTestAccount({
  service,
  onClose,
  onCreated,
}: {
  service: TestAccountsApi;
  onClose: () => void;
  onCreated: () => void;
}) {
  const formId = useId();
  const [type, setType] = useState<TestAccountSummary['type']>('customer');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed'>();
  const focusConfirmation = useCallback(
    (node: HTMLParagraphElement | null) => node?.focus(),
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (password !== confirmPassword) {
      setError(errors.PASSWORD_MISMATCH);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const { account, destination, problem } = await service.createTestAccount(
        {
          type,
          firstName: text(form, 'firstName'),
          lastName: text(form, 'lastName'),
          email: text(form, 'email'),
          phone: text(form, 'phone') || null,
          password,
          confirmPassword,
          workspaceName:
            type === 'customer' ? null : text(form, 'workspaceName'),
        },
      );
      if (!account || !destination || problem) {
        setError(errors[problem ?? 'CREATE_FAILED']);
        return;
      }
      setConfirmation({ account, destination, password });
      onCreated();
    } catch {
      setError(
        'The account request could not be confirmed. Refresh the list before trying again.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function copyLoginDetails() {
    if (!confirmation) return;
    const { account, destination, password } = confirmation;
    try {
      await navigator.clipboard.writeText(
        [
          `Name: ${account.firstName} ${account.lastName}`,
          `Email: ${account.email}`,
          `Phone: ${account.phone ?? 'Not provided'}`,
          `Account type: ${accountTypes[account.type]}`,
          ...(account.workspaceName
            ? [`Workspace: ${account.workspaceName}`]
            : []),
          `Sign-in URL: ${destination}`,
          `Password: ${password}`,
        ].join('\n'),
      );
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <Dialog
      open
      title={confirmation ? 'Test account created' : 'Create Test Account'}
      onClose={onClose}
      busy={busy}
      size="standard"
      actions={
        confirmation ? (
          <>
            <Button onClick={onClose} variant="secondary">
              Done
            </Button>
            <Button onClick={() => void copyLoginDetails()}>
              Copy Login Details
            </Button>
          </>
        ) : (
          <Button form={formId} type="submit" disabled={busy}>
            {busy ? 'Creating account' : 'Create Test Account'}
          </Button>
        )
      }
    >
      {confirmation ? (
        <div className="form-grid">
          <p ref={focusConfirmation} tabIndex={-1}>
            Copy the login details before closing this confirmation.
          </p>
          <div>
            <p>
              <strong>
                {confirmation.account.firstName} {confirmation.account.lastName}
              </strong>
            </p>
            <p>{confirmation.account.email}</p>
            <p>{confirmation.account.phone}</p>
            <p>{accountTypes[confirmation.account.type]}</p>
            {confirmation.account.workspaceName && (
              <p>{confirmation.account.workspaceName}</p>
            )}
            <p>
              <Link href={confirmation.destination} target="_blank">
                Open sign-in
              </Link>
            </p>
          </div>
          {copyStatus === 'copied' && (
            <Alert severity="success">Login details copied.</Alert>
          )}
          {copyStatus === 'failed' && (
            <Alert severity="error" role="alert">
              Clipboard access failed. Try copying again.
            </Alert>
          )}
        </div>
      ) : (
        <form
          id={formId}
          onSubmit={(event) => void submit(event)}
          aria-busy={busy}
        >
          <fieldset className="form-grid" disabled={busy}>
            <Choice
              name="type"
              label="Account type"
              value={type}
              onChange={(value) => setType(value as TestAccountSummary['type'])}
            >
              {Object.entries(accountTypes).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </Choice>
            <TextField name="firstName" label="First name" maxLength={100} />
            <TextField name="lastName" label="Last name" maxLength={100} />
            <TextField
              name="email"
              label="Email address"
              type="email"
              maxLength={81}
              info="Use a fictional test address ending in @fixtures.invalid."
            />
            <PhoneInput
              name="phone"
              label="Phone number (optional)"
              validationMode="blur"
            />
            <p>Leave the phone number blank to assign a fictional number.</p>
            <Field
              id={`${formId}-password`}
              label="Password"
              info="Use 11 to 72 characters, with an uppercase letter, a number, and a symbol."
            >
              <Input
                id={`${formId}-password`}
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={11}
                maxLength={passwordMaximum}
                required
              />
            </Field>
            <Field id={`${formId}-confirm`} label="Confirm password">
              <Input
                id={`${formId}-confirm`}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={11}
                maxLength={passwordMaximum}
                required
              />
            </Field>
            {type !== 'customer' && (
              <div
                role="group"
                aria-label={
                  type === 'vendor' ? 'Vendor Workspace' : 'Market Workspace'
                }
              >
                <TextField
                  key={type}
                  name="workspaceName"
                  label={type === 'vendor' ? 'Business name' : 'Market name'}
                  maxLength={200}
                />
              </div>
            )}
          </fieldset>
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
        </form>
      )}
    </Dialog>
  );
}
