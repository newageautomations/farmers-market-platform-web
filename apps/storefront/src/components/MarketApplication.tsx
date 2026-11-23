import { buttonClassName } from '@market/ui/presentation';
import {
  ApplicationAcknowledgement,
  ApplicationFlow,
  applicationFlowSteps,
  Button,
  LoadingSkeleton,
  Select,
  type ApplicationFlowStep,
} from '@market/ui';
import '@market/ui/application-flow.css';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type {
  PublicApplication,
  ApplicationApplicant,
  ApplicantDraftDetail,
} from '@market/api';
import {
  AppError,
  documentErrorMessages,
  activeApplicationAnswers,
  applicationAcknowledgementVersion,
  applicationAvailabilityMessage,
} from '@market/api';
import { platformName } from '@market/config';
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
  policiesHref,
}: {
  initialDraft?: ApplicantDraftDetail;
  initialVendorId?: number;
  vendorOrigin?: string;
  /** The Market's published policies page, linked from the acknowledgement. */
  policiesHref?: string;
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
  const [acknowledged, setAcknowledged] = useState(false);
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
          // One business: the account question is skipped and it applies.
          // No business: the applicant chooses onboarding or no account.
          setAccountChoice(
            selected ? 'YES' : profile.vendors.length ? 'YES' : '',
          );
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
              if (profile.vendors.length) setAccountChoice('YES');
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
  /** Saves the answers, then signs in, or creates an account with `signup`. */
  async function signIn(signup = false) {
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
        '/vendor/application-continue?slug=' +
          encodeURIComponent(a.slug) +
          (signup ? '&signup=1&context=vendor' : ''),
      );
    } catch {
      setError(
        'Sign-in is temporarily unavailable. Your current answers are still here. You can try again or choose No to apply without account association.',
      );
      setPending(false);
    }
  }
  async function submit() {
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
        acknowledgement: applicationAcknowledgementVersion,
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
              acknowledgement: applicationAcknowledgementVersion,
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
  }
  const selected = applicant?.vendors.find(
    (v) => String(v.id) === vendorChoice,
  );
  const dashboard = `${vendorOrigin}/vendor/applications?channel=${selected?.channelId ?? initialDraft?.vendor.channelId ?? ''}${initialDraft ? '' : '&account=1'}`;
  // A signed-in applicant with exactly one business (or a saved draft) skips
  // the account question; everyone else answers it first.
  const accountSkipped =
    !!initialDraft || (!!applicant && applicant.vendors.length === 1);
  const filled = useRef(false);
  useEffect(() => {
    // Fill empty answers from the account once its business is chosen.
    if (
      filled.current ||
      accountChoice !== 'YES' ||
      !applicant ||
      !vendorChoice
    )
      return;
    filled.current = true;
    autofill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountChoice, applicant, vendorChoice]);

  const accountStep: ApplicationFlowStep = {
    id: 'account',
    title: applicant ? 'Your business' : 'Your account',
    complete:
      accountChoice === 'NO' || (accountChoice === 'YES' && !!vendorChoice),
    hideNavigation: !applicant?.vendors.length,
    items: [
      accountChoice === 'NO'
        ? 'Continuing without an account'
        : selected
          ? selected.name
          : applicant
            ? 'Choose a business'
            : `${platformName} account`,
    ],
    content: () =>
      !applicant ? (
        <>
          <p className="application-flow-lead">
            Do you have an account with {platformName}?
          </p>
          <p className="application-flow-note">
            {a.documentRequirements?.some((r) => r.submission_blocking)
              ? 'This Market needs documents shared from a Vendor account before you submit. Sign in, or create an account; your answers are saved and you return here.'
              : 'Signing in saves drafts and lets you track this application. You can also apply without an account.'}
          </p>
          <div className="application-flow-choices">
            <Button
              variant="primary"
              disabled={pending || !hydrated}
              onClick={() => void signIn()}
            >
              Yes, log in
            </Button>
            {!!a.documentRequirements?.length && (
              <Button
                variant="secondary"
                disabled={pending || !hydrated}
                onClick={() => void signIn(true)}
              >
                Create an account
              </Button>
            )}
            <Button
              type="submit"
              variant="secondary"
              disabled={pending || !hydrated}
              onClick={() => {
                setAccountChoice('NO');
                setVendorChoice('');
              }}
            >
              No, continue without one
            </Button>
          </div>
        </>
      ) : !applicant.vendors.length ? (
        <>
          <p className="application-flow-lead">
            Signed in as {applicant.profile.email}.
          </p>
          <p className="application-flow-note">
            Your account has no Vendor business yet. Complete Vendor onboarding
            to save drafts and track applications, or continue without linking
            this application to your account.
          </p>
          <div className="application-flow-choices">
            <a
              className={buttonClassName({ variant: 'primary' })}
              href={`/vendor/application-continue?slug=${encodeURIComponent(a.slug)}`}
            >
              Complete Vendor onboarding
            </a>
            <Button
              type="submit"
              variant="secondary"
              disabled={pending || !hydrated}
              onClick={() => {
                setAccountChoice('NO');
                setVendorChoice('');
              }}
            >
              Continue without linking
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="application-flow-note">
            Signed in as {applicant.profile.email}. Your business authority is
            checked again when you submit.
          </p>
          <label className="ops-field">
            Which business is applying? (required)
            <Select
              required
              disabled={hasDraft}
              value={accountChoice === 'NO' ? '' : vendorChoice}
              onChange={(e) => {
                setAccountChoice(e.target.value ? 'YES' : '');
                setVendorChoice(e.target.value);
              }}
            >
              <option value="">Choose a business</option>
              {applicant.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </label>
        </>
      ),
  };
  const documents = a.documentRequirements?.length
    ? [
        {
          id: 'documents',
          title: 'Documents',
          complete: true,
          items: a.documentRequirements.map((r) => r.title),
          content: () => (
            <p className="application-flow-note">
              Share the documents this Market asks for. Requests marked as
              required before submitting must be shared first.
            </p>
          ),
          extra: () => (
            <ApplicationDocuments
              key={`${a.slug}:${accountChoice}:${vendorChoice}`}
              application={a}
              vendorId={
                accountChoice === 'YES' &&
                applicant?.vendors.some((v) => String(v.id) === vendorChoice)
                  ? Number(vendorChoice)
                  : null
              }
              onAccount={
                applicant ? undefined : (signup) => void signIn(signup)
              }
            />
          ),
        } satisfies ApplicationFlowStep,
      ]
    : [];
  const steps = applicationFlowSteps({
    application: a,
    answers,
    onAnswer: (id, value) => setAnswers((v) => ({ ...v, [id]: value })),
    dates,
    onDates: setDates,
    rentals,
    onRentals: setRentals,
    leading: accountSkipped ? [] : [accountStep],
    trailing: documents,
  });
  const linkedVendor = accountChoice === 'YES' && selected;

  if (identityLoading)
    return (
      <LoadingSkeleton variant="detail" rows={4} label="Loading application" />
    );
  return (
    <>
      {(hasDraft || selected) && !submitted && (
        <a
          className={buttonClassName({ variant: 'secondary' })}
          href={dashboard}
        >
          Return to Vendor Applications
        </a>
      )}
      {lastSaved && !submitted && (
        <p role="status">
          Last saved {new Date(lastSaved).toLocaleString()}. Changes after this
          time are not saved until you save again.
        </p>
      )}
      {availabilityMessage && !submitted && (
        <p className="alert ui-alert ui-alert-info" role="status">
          {availabilityMessage} Saved drafts remain viewable in Vendor
          Applications.
        </p>
      )}
      <ApplicationFlow
        title={
          linkedVendor ? (
            <>
              Applying as <strong>{linkedVendor.name}</strong>
            </>
          ) : undefined
        }
        steps={steps}
        disabled={!hydrated}
        pending={pending}
        submitDisabled={
          !!availabilityMessage ||
          (accountChoice === 'YES' && (!applicant || !vendorChoice))
        }
        onSubmit={() => void submit()}
        beforeSubmit={
          <ApplicationAcknowledgement
            platform={platformName}
            policiesHref={policiesHref}
            checked={acknowledged}
            onChange={setAcknowledged}
          />
        }
        actions={
          accountChoice === 'YES' &&
          !!applicant?.vendors.length && (
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
          )
        }
        notice={
          <>
            {error && (
              <p className="alert ui-alert ui-alert-error" role="alert">
                {error}
              </p>
            )}
          </>
        }
        done={
          submitted ? (
            <div role="status" className="application-flow-done-body">
              <h2 className="ui-section-title-consumer">
                Application submitted
              </h2>
              <p>
                The Market will review your application and requested dates. No
                payment has been taken.
              </p>
              {accountChoice === 'YES' && submissionId && (
                <a
                  className={buttonClassName({ variant: 'primary' })}
                  href={`${vendorOrigin}/vendor/applications/${submissionId}?channel=${selected?.channelId ?? initialDraft?.vendor.channelId ?? ''}${initialDraft ? '' : '&account=1'}`}
                >
                  View application
                </a>
              )}
              {accountChoice === 'NO' && invitation && submissionId && (
                <section aria-label="Track your application">
                  <p>
                    Create a Vendor account to track status and save drafts for
                    future applications. Your application is already submitted.
                  </p>
                  <div className="application-flow-choices">
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
          ) : undefined
        }
      />
    </>
  );
}
