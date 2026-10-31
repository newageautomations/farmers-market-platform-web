import { buttonClassName } from '@market/ui/presentation';
import { Button, Card, Select, Input } from '@market/ui';
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type {
  PublicApplication,
  ApplicationApplicant,
  ApplicantDraftDetail,
} from '@market/api';
import {
  AppError,
  documentErrorMessages,
  activeApplicationAnswers,
  applicationAvailabilityMessage,
} from '@market/api';
import { ApplicationFields } from '@market/ui';
import { formatMoney, platformName } from '@market/config';
import { ApplicationDocuments } from './ApplicationDocuments';
const subscribe = () => () => {};
class ApplicationResponseError extends Error {}
function submissionKey() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function MarketApplication({
  application: a,
  initialDraft,
  initialVendorId,
  vendorOrigin,
}: {
  initialDraft?: ApplicantDraftDetail;
  initialVendorId?: number;
  vendorOrigin?: string;
  application: PublicApplication;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const availabilityMessage = applicationAvailabilityMessage(a.availability);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
      initialDraft?.draft.progress.answers ?? {},
    ),
    [dates, setDates] = useState<number[]>(
      initialDraft?.draft.progress.occurrenceIds ?? [],
    ),
    [rentals, setRentals] = useState<Record<number, number>>(
      initialDraft
        ? Object.fromEntries(
            initialDraft.draft.progress.rentals.map((r) => [
              r.optionId,
              r.quantity,
            ]),
          )
        : Object.fromEntries(a.rentals.map((r) => [r.id, r.defaultQuantity])),
    ),
    [pending, setPending] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [error, setError] = useState('');
  const formId = useId();
  const key = useRef<string | null>(null);
  const submitting = useRef(false);
  const [accountChoice, setAccountChoice] = useState<'YES' | 'NO' | ''>(
    initialDraft || initialVendorId ? 'YES' : '',
  );
  const [applicant, setApplicant] = useState<ApplicationApplicant | null>(null);
  const [vendorChoice, setVendorChoice] = useState(
    String(initialDraft?.draft.vendorId ?? initialVendorId ?? ''),
  );
  const [identityLoading, setIdentityLoading] = useState(true);
  const draftRef = useRef(
    initialDraft
      ? { id: initialDraft.draft.id, revision: initialDraft.draft.revision }
      : null,
  );
  const [hasDraft, setHasDraft] = useState(!!initialDraft);
  const [lastSaved, setLastSaved] = useState(
    initialDraft?.draft.updatedAt ?? '',
  );
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [invitation, setInvitation] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/application-applicant', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const profile = (await response.json()) as ApplicationApplicant;
        if (!active) return;
        setApplicant(profile);
        if (!initialDraft) {
          const selected =
            profile.vendors.find((v) => v.id === initialVendorId) ??
            (profile.vendors.length === 1 ? profile.vendors[0] : undefined);
          setVendorChoice(selected ? String(selected.id) : '');
        }
        if (initialDraft) return;
        {
          const restored = await fetch('/api/application-progress', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'restore',
              path: window.location.pathname,
            }),
          });
          if (restored.status === 204) return;
          if (restored.ok) {
            const saved = (await restored.json()) as {
              path: string;
              progress: {
                slug: string;
                versionId: number;
                answers: Record<string, unknown>;
                dates: number[];
                rentals: Record<number, number>;
                key: string | null;
                vendorChoice: string;
              };
            };
            if (
              active &&
              saved.path === window.location.pathname &&
              saved.progress.slug === a.slug &&
              saved.progress.versionId === a.versionId
            ) {
              setAnswers(saved.progress.answers);
              setDates(saved.progress.dates);
              setRentals(saved.progress.rentals);
              key.current = saved.progress.key;
              setAccountChoice('YES');
              if (
                profile.vendors.some(
                  (v) => String(v.id) === saved.progress.vendorChoice,
                )
              )
                if (!initialVendorId)
                  setVendorChoice(saved.progress.vendorChoice);
            }
          } else if (active)
            setError(
              'Saved progress expired or belongs to another account. Please review this application again.',
            );
        }
      } catch {
        /* Anonymous submission remains available if account access is unavailable. */
      } finally {
        if (active) setIdentityLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [a.slug, a.versionId, initialDraft, initialVendorId]);
  function autofill() {
    if (!applicant) return;
    const vendor = applicant.vendors.find((v) => String(v.id) === vendorChoice);
    const source: Record<string, string | undefined> = {
      ...applicant.profile,
      businessName: vendor?.name,
    };
    setAnswers((current) => {
      const next = { ...current };
      for (const question of a.definition.questions) {
        if (
          question.semantic &&
          Object.hasOwn(source, question.semantic) &&
          source[question.semantic] &&
          (next[question.id] === undefined || next[question.id] === '')
        )
          next[question.id] = source[question.semantic];
      }
      return next;
    });
  }
  async function saveDraft() {
    if (!applicant || accountChoice !== 'YES' || !vendorChoice)
      throw new Error();
    key.current ??= submissionKey();
    const response = await fetch('/api/applicant-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'SAVE_DRAFT',
        input: {
          ...draftRef.current,
          marketId: a.marketId,
          slug: a.slug,
          versionId: a.versionId,
          clientKey: key.current,
          answers,
          occurrenceIds: dates,
          rentals: a.rentals.map((r) => ({
            optionId: r.id,
            quantity: rentals[r.id] ?? 0,
          })),
          vendorId: Number(vendorChoice),
        },
      }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new ApplicationResponseError(
        result.error ||
          'This draft could not be saved. Resume its latest copy from Vendor Applications.',
      );
    }
    const saved = (await response.json()) as {
      id: number;
      revision: number;
      updatedAt: string;
    };
    draftRef.current = { id: saved.id, revision: saved.revision };
    setLastSaved(saved.updatedAt);
    setHasDraft(true);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?draft=${saved.id}&vendor=${vendorChoice}`,
    );
    return saved;
  }
  async function signIn() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/application-progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          path: window.location.pathname,
          progress: {
            slug: a.slug,
            versionId: a.versionId,
            answers,
            dates,
            rentals,
            key: key.current,
            vendorChoice,
          },
        }),
      });
      if (!response.ok) throw new Error();
      window.location.assign(
        '/vendor/application-continue?slug=' + encodeURIComponent(a.slug),
      );
    } catch {
      setError(
        'Sign-in is temporarily unavailable. Your current answers are still here. You can try again or choose No to apply without account association.',
      );
      setPending(false);
    }
  }
  if (submitted)
    return (
      <div>
        <div role="status">
          <h2 className="ui-section-title-consumer">
            Application submitted successfully.
          </h2>
          <p>
            The Market will review your application and requested dates. No
            payment has been taken.
          </p>
        </div>
        {accountChoice === 'YES' && submissionId && (
          <a
            className={buttonClassName({ variant: 'primary' })}
            href={`${vendorOrigin}/vendor/applications/${submissionId}?channel=${applicant?.vendors.find((v) => String(v.id) === vendorChoice)?.channelId ?? initialDraft?.vendor.channelId ?? ''}${initialDraft ? '' : '&account=1'}`}
          >
            View application
          </a>
        )}
        {accountChoice === 'NO' && invitation && submissionId && (
          <section aria-label="Track your application">
            <p>
              Create a Vendor account to track status and save drafts for future
              applications. Your application is already submitted.
            </p>
            <div className="actions">
              <a
                className={buttonClassName({ variant: 'primary' })}
                href={`/vendor/application-continue?claim=${submissionId}`}
              >
                {applicant?.vendors.length
                  ? 'Track this application with my Vendor business'
                  : 'Create a Vendor account to track your application'}
              </a>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setInvitation(false)}
              >
                Finish without creating an account
              </Button>
            </div>
          </section>
        )}
      </div>
    );
  const selected = applicant?.vendors.find(
    (v) => String(v.id) === vendorChoice,
  );
  const dashboard = `${vendorOrigin}/vendor/applications?channel=${selected?.channelId ?? initialDraft?.vendor.channelId ?? ''}${initialDraft ? '' : '&account=1'}`;
  return (
    <>
      {(hasDraft || selected) && (
        <a
          className={buttonClassName({ variant: 'secondary' })}
          href={dashboard}
        >
          Return to Vendor Applications
        </a>
      )}
      {!applicant && (
        <p>
          Create a Vendor account to save drafts and track your applications
          across devices. You can still submit without an account.
        </p>
      )}
      {lastSaved && (
        <p role="status">
          Last saved {new Date(lastSaved).toLocaleString()}. Changes after this
          time are not saved until you save again.
        </p>
      )}
      <form
        id={formId}
        className="ops-application"
        data-ready={hydrated}
        aria-busy={pending}
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          setPending(true);
          setError('');
          try {
            if (availabilityMessage) {
              setError(availabilityMessage);
              return;
            }
            if (
              !accountChoice ||
              (accountChoice === 'YES' && (!applicant || !vendorChoice))
            )
              throw new Error();
            key.current ??= submissionKey();
            const payload = {
              slug: a.slug,
              versionId: a.versionId,
              answers: activeApplicationAnswers(a.definition, answers),
              occurrenceIds: dates,
              rentals: a.rentals.map((r) => ({
                optionId: r.id,
                quantity: rentals[r.id] ?? 0,
              })),
              idempotencyKey: key.current,
              accountAnswer: accountChoice,
              vendorId: accountChoice === 'YES' ? Number(vendorChoice) : null,
            };
            let response: Response;
            if (draftRef.current) {
              if (accountChoice !== 'YES') throw new Error();
              const saved = await saveDraft();
              response = await fetch('/api/applicant-applications', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  action: 'SUBMIT_DRAFT',
                  input: {
                    id: saved.id,
                    revision: saved.revision,
                    vendorId: Number(vendorChoice),
                  },
                }),
              });
            } else
              response = await fetch('/api/market-application', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });
            if (!response.ok) {
              const result = await response.json().catch(() => ({}));
              if (result.message || (draftRef.current && result.error)) {
                setError(result.message || result.error);
                return;
              }
              throw new AppError('validation', result.error);
            }
            const result = await response.json();
            setSubmissionId(result.submissionId);
            setSubmitted(true);
          } catch (failure) {
            setError(
              failure instanceof ApplicationResponseError
                ? failure.message
                : failure instanceof AppError &&
                    failure.code === 'APPLICATION_DOCUMENTS_REQUIRED'
                  ? documentErrorMessages.APPLICATION_DOCUMENTS_REQUIRED!
                  : 'The application could not be submitted. Check your answers and dates, then try again. If the application changed, refresh this page.',
            );
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        <Card
          as="fieldset"
          className="ops-section"
          disabled={pending || !hydrated}
        >
          <legend>Do you have an account with {platformName}?</legend>
          {(['YES', 'NO'] as const).map((value) => (
            <label className="ops-check" key={value}>
              <Input
                type="radio"
                name="platform-account"
                value={value}
                required
                disabled={hasDraft && value === 'NO'}
                checked={accountChoice === value}
                onChange={() => {
                  setAccountChoice(value);
                  if (value === 'NO') setVendorChoice('');
                  else if (applicant?.vendors.length === 1)
                    setVendorChoice(String(applicant.vendors[0]!.id));
                }}
              />
              {value === 'YES' ? 'Yes' : 'No'}
            </label>
          ))}
          {accountChoice === 'YES' &&
            (identityLoading ? (
              <p>Checking your account</p>
            ) : applicant ? (
              <>
                <p>
                  Signed in as {applicant.profile.email}. Your business
                  authority is checked again when you submit.
                </p>
                {applicant.vendors.length ? (
                  <label className="ops-field">
                    Business for this application
                    <Select
                      required
                      disabled={hasDraft}
                      value={vendorChoice}
                      onChange={(e) => setVendorChoice(e.target.value)}
                    >
                      <option value="">Choose or confirm a business</option>
                      {applicant.vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : (
                  <p>
                    Your account has no authorized Vendor business. You must
                    complete Vendor onboarding to manage applications. You may
                    still submit anonymously by choosing No.
                  </p>
                )}
                {!applicant.vendors.length && (
                  <a
                    className={buttonClassName({ variant: 'primary' })}
                    href={`/vendor/application-continue?slug=${a.slug}`}
                  >
                    Complete Vendor onboarding
                  </a>
                )}
                <Button variant="secondary" type="button" onClick={autofill}>
                  Fill empty fields from my account
                </Button>
              </>
            ) : (
              <>
                <p>
                  Sign in to use your account and return to this application
                  with your progress.
                </p>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => void signIn()}
                >
                  Sign in with my Vendor account
                </Button>
              </>
            ))}
          {accountChoice === 'NO' && applicant && (
            <p>
              This application will be submitted without linking it to your
              signed-in account or Vendor business.
            </p>
          )}
        </Card>
        <p>
          You can submit anonymously without a Vendor account. Saving drafts and
          managing applications requires an authorized Vendor business. No
          payment is collected when you apply.
        </p>
        <ApplicationFields
          definition={a.definition}
          answers={answers}
          onAnswer={(id, value) => setAnswers((v) => ({ ...v, [id]: value }))}
        />
        <Card as="fieldset" className="ops-section">
          <legend>Requested Market dates</legend>
          {a.occurrences.map((o) => (
            <label className="ops-check" key={o.id}>
              <Input
                type="checkbox"
                checked={dates.includes(o.id)}
                onChange={(e) =>
                  setDates((v) =>
                    e.target.checked
                      ? [...v, o.id]
                      : v.filter((id) => id !== o.id),
                  )
                }
              />
              {new Date(o.startsAt).toLocaleString()} · {o.venue}
            </label>
          ))}
        </Card>
        <Card as="fieldset" className="ops-section">
          <legend>Requested rentals and add-ons</legend>
          <p>
            These quantities apply to each requested date. The manager confirms
            accepted quantities for each occurrence. Requests do not reserve
            resources.
          </p>
          {a.rentals.map((r) => (
            <label key={r.id} className="ops-field">
              {r.name} · {formatMoney(r.priceMinor, r.currency)} each
              <Input
                type="number"
                min={0}
                max={r.maxQuantity}
                step={1}
                value={rentals[r.id] ?? 0}
                onChange={(e) =>
                  setRentals((v) => ({ ...v, [r.id]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </Card>
      </form>
      <ApplicationDocuments
        key={`${a.slug}:${accountChoice}:${vendorChoice}`}
        application={a}
        vendorId={
          accountChoice === 'YES' &&
          applicant?.vendors.some((v) => String(v.id) === vendorChoice)
            ? Number(vendorChoice)
            : null
        }
      />
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      {availabilityMessage && (
        <p className="alert ui-alert ui-alert-info" role="status">
          {availabilityMessage} Saved drafts remain viewable in Vendor
          Applications.
        </p>
      )}
      <div className="actions">
        {accountChoice === 'YES' && !!applicant?.vendors.length && (
          <Button
            variant="secondary"
            type="button"
            disabled={pending || !vendorChoice || !hydrated}
            onClick={() => {
              if (submitting.current) return;
              submitting.current = true;
              setPending(true);
              setError('');
              void saveDraft()
                .catch((failure) =>
                  setError(
                    failure instanceof ApplicationResponseError
                      ? failure.message
                      : 'Draft could not be saved. Your answers are still here. If the form changed, contact the market. If saved in another session, resume the latest draft from Applications.',
                  ),
                )
                .finally(() => {
                  submitting.current = false;
                  setPending(false);
                });
            }}
          >
            Save draft
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          form={formId}
          disabled={
            !!availabilityMessage ||
            pending ||
            !hydrated ||
            (accountChoice === 'YES' && (!applicant || !vendorChoice))
          }
        >
          {pending ? 'Submitting application' : 'Submit application'}
        </Button>
      </div>
    </>
  );
}
