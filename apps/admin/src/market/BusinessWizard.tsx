import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  safeError,
  type AppError,
  type ApplicantContact,
  type DirectoryEntry,
  type MarketMembershipStatus,
  type MarketOperationsData,
  type OperationsCommand,
} from '@market/api';
import {
  Alert,
  Card,
  ErrorState,
  Radio,
  SearchSelect,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandSelect,
} from '@market/ui/farmstand';
import { WizardProgress, useWizardDialogHeight } from '../WizardProgress';
import { Control, Entry } from './phase14/common';
import { go, useRead } from './common';

const empty: ApplicantContact = {
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  description: '',
  category: '',
};
const kinds = {
  platform: {
    label: 'Platform Vendor',
    icon: 'store',
    description:
      'The business already sells on the platform. It manages its own details; you manage its membership and keep private notes.',
  },
  external: {
    label: 'External business',
    icon: 'user-round',
    description:
      'The business has no platform account. You enter and maintain its contact details to reserve booths and track attendance.',
  },
} as const;
type Kind = keyof typeof kinds;

export interface PlatformVendorAccess {
  search: (
    search: string,
  ) => Promise<{
    readonly items: ReadonlyArray<{ readonly id: string; readonly name: string }>;
    readonly totalItems: number;
  }>;
  add: (vendorId: string, status: MarketMembershipStatus) => Promise<unknown>;
  /** Vendors that already have a membership at this market. */
  memberIds: ReadonlySet<string>;
}

/**
 * Adds a business (choosing a platform Vendor membership or an external
 * directory record) or edits an external record. Composes the reward wizard
 * presentation used by rentals and loyalty; no shared controller owns these
 * directory and membership commands.
 */
export function BusinessWizard({
  original,
  data,
  run,
  platform,
  onBusyChange,
  onClose,
}: {
  /** An external directory record to edit; omit to add a business. */
  original?: DirectoryEntry;
  data?: MarketOperationsData;
  /** Market operations commands; external records and notes need it. */
  run?: (command: OperationsCommand) => Promise<unknown>;
  /** Membership access; platform Vendors can be added only with it. */
  platform?: PlatformVendorAccess;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const adding = !original;
  const available: Kind[] = [
    ...(platform ? (['platform'] as const) : []),
    ...(run ? (['external'] as const) : []),
  ];
  const [kind, setKind] = useState<Kind>(
    original ? 'external' : (available[0] ?? 'external'),
  );
  const steps = !adding
    ? ['Business', 'Contact', 'Platform link', 'Review & save']
    : kind === 'platform'
      ? ['Business type', 'Find Vendor', 'Membership', 'Review & add']
      : ['Business type', 'Business', 'Contact', 'Review & add'];
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const [contact, setContact] = useState<ApplicantContact>(() => ({
    ...empty,
    ...original?.contact,
  }));
  const [notes, setNotes] = useState(original?.managerNotes ?? '');
  const [linkVendor, setLinkVendor] = useState('');
  const [reason, setReason] = useState('');
  const [vendor, setVendor] = useState<{ id: string; name: string } | null>(
    null,
  );
  // A Market cannot approve a Vendor that has not consented, so new
  // memberships always start pending; approval happens on the Vendor's page.
  const membership: MarketMembershipStatus = 'pending';
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ message: string; href?: string }>();
  const [uncertain, setUncertain] = useState(false);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState<AppError>();
  const captureHeight = useWizardDialogHeight(
    root,
    `${kind}:${step}:${busy}:${!!saved}`,
  );
  const previousStage = useRef(`${step}:${!!saved}`);
  useEffect(() => {
    const current = `${step}:${!!saved}`;
    if (previousStage.current !== current)
      heading.current?.focus({ preventScroll: true });
    previousStage.current = current;
  }, [step, saved]);
  const edit = (patch: Partial<ApplicantContact>) =>
    setContact((current) => ({ ...current, ...patch }));
  // Steps are named, so the external path is the same with or without the type step.
  const stage = steps[step]!;
  const last = step === steps.length - 1;
  const pendingLink = data?.linkRequests?.some(
    (r) => r.directoryId === original?.id && r.status === 'PENDING',
  );
  const linkName = data?.eligibleVendors?.find(
    (v) => String(v.id) === linkVendor,
  )?.name;

  function move(next: number) {
    captureHeight();
    setProblem('');
    setError(undefined);
    setStep(next);
  }
  function issue(): [string, string] | undefined {
    const at = (name: string) => steps.indexOf(name);
    if (kind === 'platform') {
      if (step >= at('Find Vendor') && at('Find Vendor') <= step && !vendor)
        return ['Find Vendor', 'Choose the platform Vendor to add.'];
      return undefined;
    }
    if (step >= at('Business') && !contact.businessName.trim())
      return ['Business', 'Enter the business name.'];
    if (step >= at('Contact')) {
      if (!contact.firstName.trim() || !contact.lastName.trim())
        return ['Contact', 'Enter the contact’s first and last name.'];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()))
        return ['Contact', 'Enter a valid contact email address.'];
    }
    return undefined;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || saved || uncertain) return;
    const found = issue();
    if (found) {
      const target = steps.indexOf(found[0]);
      if (target !== step) move(target);
      setProblem(found[1]);
      return;
    }
    setProblem('');
    if (!last) {
      move(step + 1);
      return;
    }
    locked.current = true;
    captureHeight();
    setBusy(true);
    onBusyChange(true);
    setError(undefined);
    try {
      setSaved(kind === 'platform' ? await addPlatform() : await saveExternal());
    } catch (cause) {
      const safe = safeError(cause);
      setError(safe);
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(safe.kind))
        setUncertain(true);
    } finally {
      captureHeight();
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function addPlatform() {
    const membershipRow = (await platform!.add(vendor!.id, membership)) as {
      id?: string;
    };
    const href = membershipRow?.id
      ? `/market/vendors/memberships/${membershipRow.id}`
      : undefined;
    if (notes.trim() && run)
      try {
        await run({
          action: 'SAVE_VENDOR_NOTES',
          data: { vendorId: Number(vendor!.id), notes },
        });
      } catch {
        return {
          href,
          message: `${vendor!.name} was added, but your private notes were not saved. Add them from the Vendor’s page.`,
        };
      }
    return {
      href,
      message: `${vendor!.name} is added as a pending member. Approve it from its Vendor page once it confirms. Its business details stay managed by the Vendor.`,
    };
  }
  async function saveExternal() {
    const entry = (await run!({
      action: 'SAVE_DIRECTORY',
      id: original?.id,
      expectedRevision: original?.revision,
      data: {
        contact: Object.fromEntries(
          Object.entries(contact).map(([k, v]) => [k, v.trim()]),
        ),
        managerNotes: notes,
      },
    })) as DirectoryEntry;
    if (linkVendor)
      try {
        await run!({
          action: 'REQUEST_VENDOR_LINK',
          id: entry.id,
          expectedRevision: entry.revision,
          data: { vendorId: Number(linkVendor), reason },
        });
        return {
          message: `${contact.businessName} is saved. ${linkName ?? 'The Vendor'} must confirm the link before it appears as a platform Vendor.`,
        };
      } catch (cause) {
        setError(safeError(cause));
        return {
          message: `${contact.businessName} is saved, but the link request was not sent. Edit the business to try again.`,
        };
      }
    return {
      message: adding
        ? `${contact.businessName} is in your Vendors list. You can reserve booths and track attendance for it now.`
        : `${contact.businessName} is updated.`,
    };
  }

  if (saved)
    return (
      <div className="reward-wizard reward-published" ref={root}>
        <div role="status" aria-live="polite">
          <span className="reward-published-check" aria-hidden="true">
            <UtilityIcon name="check" />
          </span>
          <h3 ref={heading} tabIndex={-1}>
            {adding ? 'Business added' : 'Business updated'}
          </h3>
          <p>{saved.message}</p>
          {error && <ErrorState error={error} />}
        </div>
        <div className="business-wizard-done">
          {saved.href && (
            <FarmstandLink
              href={saved.href}
              variant="secondary"
              onClick={(event) => {
                event.preventDefault();
                onClose();
                go(saved.href!);
              }}
            >
              Open Vendor page
              <FarmstandIcon name="arrow-right" />
            </FarmstandLink>
          )}
          <FarmstandButton onClick={onClose}>Done</FarmstandButton>
        </div>
      </div>
    );
  return (
    <div className="reward-wizard business-wizard" ref={root}>
      <WizardProgress steps={steps} step={step} label="Business progress" />
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy || uncertain} className="reward-wizard-fields">
          <div className="reward-stage" key={`${kind}:${step}`}>
            <div className="reward-stage-heading">
              <h3 ref={heading} tabIndex={-1}>
                {headings[stage]?.[0] ?? stage}
              </h3>
              <p>{headings[stage]?.[1]}</p>
            </div>
            {stage === 'Business type' && (
              <div
                className="reward-type-grid business-type-grid"
                role="radiogroup"
                aria-label="Business type"
              >
                {(Object.keys(kinds) as Kind[]).map((value) => (
                  <Card
                    key={value}
                    spacing="contained"
                    padding="none"
                    className="reward-type-choice"
                    data-selected={kind === value}
                  >
                    <label>
                      <Radio
                        name="business-kind"
                        aria-label={kinds[value].label}
                        checked={kind === value}
                        disabled={!available.includes(value)}
                        onChange={() => setKind(value)}
                      />
                      <span className="reward-type-check" aria-hidden="true">
                        <UtilityIcon name="check" />
                      </span>
                      <FarmstandIcon name={kinds[value].icon} />
                      <strong>{kinds[value].label}</strong>
                      <span>
                        {available.includes(value)
                          ? kinds[value].description
                          : 'You do not have permission to add this type of business.'}
                      </span>
                    </label>
                  </Card>
                ))}
              </div>
            )}
            {stage === 'Find Vendor' && platform && (
              <VendorSearch
                platform={platform}
                value={vendor}
                onChange={setVendor}
              />
            )}
            {stage === 'Membership' && (
              <div className="reward-identity-fields">
                <Alert severity="info">
                  {vendor?.name ?? 'The Vendor'} is added as a pending member.
                  It confirms the relationship from its own account, then you
                  can approve it from its Vendor page.
                </Alert>
                {run && (
                  <Entry
                    label="Private manager notes"
                    info="Only your market team can see these notes."
                    value={notes}
                    maxLength={5000}
                    onChange={setNotes}
                  />
                )}
              </div>
            )}
            {stage === 'Business' && (
              <div className="reward-identity-fields">
                <Entry
                  label="Business name"
                  value={contact.businessName}
                  required
                  maxLength={200}
                  onChange={(businessName) => edit({ businessName })}
                />
                <Entry
                  label="Category"
                  info="For example Produce, Bakery or Crafts."
                  value={contact.category}
                  maxLength={200}
                  onChange={(category) => edit({ category })}
                />
                <Entry
                  label="Description"
                  value={contact.description}
                  maxLength={5000}
                  onChange={(description) => edit({ description })}
                />
              </div>
            )}
            {stage === 'Contact' && (
              <>
                <div className="reward-rules-grid">
                  <Entry
                    label="First name"
                    value={contact.firstName}
                    required
                    maxLength={100}
                    onChange={(firstName) => edit({ firstName })}
                  />
                  <Entry
                    label="Last name"
                    value={contact.lastName}
                    required
                    maxLength={100}
                    onChange={(lastName) => edit({ lastName })}
                  />
                  <Entry
                    label="Email"
                    type="email"
                    value={contact.email}
                    required
                    maxLength={254}
                    onChange={(email) => edit({ email })}
                  />
                  <Entry
                    label="Phone"
                    type="tel"
                    value={contact.phone}
                    onChange={(phone) => edit({ phone })}
                  />
                </div>
                {adding && (
                  <div className="business-wizard-notes">
                    <Entry
                      label="Private manager notes"
                      info="Only your market team can see these notes."
                      value={notes}
                      maxLength={5000}
                      onChange={setNotes}
                    />
                  </div>
                )}
              </>
            )}
            {stage === 'Platform link' && (
              <div className="reward-identity-fields">
                {pendingLink && (
                  <Alert severity="warning">
                    A link request is already waiting for the Vendor to
                    confirm.
                  </Alert>
                )}
                <Control
                  label="Platform Vendor"
                  info="If this business has since joined the platform, request a link. An authorized owner of that Vendor must confirm it, after which its details become Vendor-managed."
                >
                  {(id) => (
                    <FarmstandSelect
                      id={id}
                      value={linkVendor}
                      onChange={(e) => setLinkVendor(e.target.value)}
                    >
                      <option value="">Don’t request a link</option>
                      {data?.eligibleVendors?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </FarmstandSelect>
                  )}
                </Control>
                {linkVendor && (
                  <Entry
                    label="Reason for the link request"
                    value={reason}
                    maxLength={2000}
                    onChange={setReason}
                  />
                )}
                <Entry
                  label="Private manager notes"
                  info="Only your market team can see these notes."
                  value={notes}
                  maxLength={5000}
                  onChange={setNotes}
                />
              </div>
            )}
            {last && (
              <Card className="business-review" spacing="contained">
                <div className="reward-review-identity">
                  <span className="reward-review-image">
                    <FarmstandIcon name={kinds[kind].icon} />
                  </span>
                  <div>
                    <h4>
                      {kind === 'platform'
                        ? vendor?.name
                        : contact.businessName}
                    </h4>
                    <p>
                      {kind === 'platform'
                        ? 'Platform Vendor · details managed by the Vendor'
                        : contact.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
                <dl className="reward-review-facts">
                  {(kind === 'platform'
                    ? [
                        ['Membership', 'Pending until you approve it'],
                        ['Private notes', notes.trim() || 'None'],
                      ]
                    : [
                        ['Category', contact.category || 'Not set'],
                        ['Contact', `${contact.firstName} ${contact.lastName}`],
                        ['Email', contact.email],
                        ['Phone', contact.phone || 'Not provided'],
                        ...(adding
                          ? []
                          : [
                              [
                                'Platform link',
                                linkName ? `Request link to ${linkName}` : 'None',
                              ],
                            ]),
                        ['Private notes', notes.trim() || 'None'],
                      ]
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </div>
          {problem && <Alert severity="error">{problem}</Alert>}
          {error && <ErrorState error={error} />}
          {uncertain && (
            <Alert severity="warning">
              The save could not be confirmed. Close this dialog and check the
              Vendors list before trying again.
            </Alert>
          )}
          <div className="reward-wizard-actions ui-actions ui-modal-actions">
            <FarmstandButton
              variant="secondary"
              disabled={step === 0 || busy || uncertain}
              onClick={() => move(step - 1)}
            >
              <FarmstandIcon name="arrow-right" />
              Back
            </FarmstandButton>
            <div>
              <FarmstandButton
                type="submit"
                loading={busy}
                disabled={busy || uncertain || !available.includes(kind)}
              >
                {last ? (
                  <>
                    <UtilityIcon name="check" />
                    {adding ? 'Add business' : 'Save changes'}
                  </>
                ) : (
                  <>
                    Next
                    <FarmstandIcon name="arrow-right" />
                  </>
                )}
              </FarmstandButton>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

const headings: Record<string, [string, string]> = {
  'Business type': [
    'What kind of business is it?',
    'Platform Vendors manage their own details. External businesses are kept by your market team.',
  ],
  'Find Vendor': [
    'Find the platform Vendor',
    'Search Vendor businesses on the platform. Vendors already at your market are not listed.',
  ],
  Membership: [
    'Set up the membership',
    'New platform Vendors start as pending members. Add private notes for your team if you like.',
  ],
  Business: [
    'Describe the business',
    'The name and category your team will see in the Vendors list.',
  ],
  Contact: [
    'Who should we contact?',
    'The person you work with at this business. Contact details are only visible to your market team.',
  ],
  'Platform link': [
    'Connect a platform account',
    'Optional. Link this record if the business now has a platform Vendor account.',
  ],
  'Review & add': [
    'Review the business',
    'Check the details before adding. Nothing is saved until you confirm.',
  ],
  'Review & save': [
    'Review your changes',
    'Check the details before saving. Nothing is saved until you confirm.',
  ],
};

function VendorSearch({
  platform,
  value,
  onChange,
}: {
  platform: PlatformVendorAccess;
  value: { id: string; name: string } | null;
  onChange: (value: { id: string; name: string } | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const read = useCallback(() => platform.search(search), [platform, search]);
  const results = useRead(`eligible-vendors:${search}`, read);
  const options = (results.data?.items ?? []).filter(
    (v) => !platform.memberIds.has(v.id),
  );
  return (
    <div className="reward-identity-fields">
      <SearchSelect
        label="Vendor business"
        placeholder="Search Vendor businesses"
        value={value?.id ?? ''}
        selectedLabel={value?.name}
        onSearch={setQuery}
        loading={results.loading || query !== search}
        allowClear
        onChange={(id) =>
          onChange(options.find((v) => v.id === id) ?? null)
        }
        options={options.map((v) => ({ value: v.id, label: v.name }))}
        searchHint={
          results.data && results.data.totalItems > results.data.items.length
            ? 'Type more of the business name to narrow these results.'
            : undefined
        }
      />
      {results.error && <ErrorState error={results.error} />}
      <p className="reward-field-help">
        Can’t find them? If the business has no platform account, go back and
        add it as an external business.
      </p>
    </div>
  );
}
