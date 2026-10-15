import { buttonClassName } from '@market/ui/presentation';
import { Button, Card, Select, Input } from '@market/ui';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PublicApplication, ApplicationApplicant } from '@market/api';
import { ApplicationFields } from '@market/ui';
import { formatMoney, platformName } from '@market/config';
const subscribe = () => () => {};
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
}: {
  application: PublicApplication;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({}),
    [dates, setDates] = useState<number[]>([]),
    [rentals, setRentals] = useState<Record<number, number>>(
      Object.fromEntries(a.rentals.map((r) => [r.id, r.defaultQuantity])),
    ),
    [pending, setPending] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [error, setError] = useState('');
  const key = useRef<string | null>(null);
  const submitting = useRef(false);
  const [accountChoice, setAccountChoice] = useState<'YES' | 'NO' | ''>('');
  const [applicant, setApplicant] = useState<ApplicationApplicant | null>(null);
  const [vendorChoice, setVendorChoice] = useState('');
  const [identityLoading, setIdentityLoading] = useState(true);
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
        if (!profile.vendors.length) setVendorChoice('account-only');
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
                saved.progress.vendorChoice === 'account-only' ||
                profile.vendors.some(
                  (v) => String(v.id) === saved.progress.vendorChoice,
                )
              )
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
  }, [a.slug, a.versionId]);
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
        '/account/login?returnTo=' +
          encodeURIComponent(window.location.pathname),
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
        {accountChoice === 'NO' && !applicant && invitation && (
          <section aria-label="Optional free account invitation">
            <h2 className="ui-section-title-consumer">
              Claim your free {platformName} account
            </h2>
            <p>
              Future free accounts are planned to make repeat applications
              easier with saved business information, reusable documents, and
              Market updates.
            </p>
            <p>
              Free account signup is coming. Your application is already
              submitted.
            </p>
            <a
              className={buttonClassName({
                variant: 'primary',
                className: 'button',
              })}
              href="/account/signup"
            >
              Claim My Free Account
            </a>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setInvitation(false)}
            >
              Maybe Later
            </Button>
          </section>
        )}
      </div>
    );
  return (
    <form
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
          if (
            !accountChoice ||
            (accountChoice === 'YES' && (!applicant || !vendorChoice))
          )
            throw new Error();
          key.current ??= submissionKey();
          const response = await fetch('/api/market-application', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              slug: a.slug,
              versionId: a.versionId,
              answers,
              occurrenceIds: dates,
              rentals: a.rentals.map((r) => ({
                optionId: r.id,
                quantity: rentals[r.id] ?? 0,
              })),
              idempotencyKey: key.current,
              accountAnswer: accountChoice,
              vendorId:
                accountChoice === 'YES' && vendorChoice !== 'account-only'
                  ? Number(vendorChoice)
                  : null,
            }),
          });
          if (!response.ok) throw new Error();
          setSubmitted(true);
        } catch {
          setError(
            'The application could not be submitted. Check your answers and dates, then try again. If the application changed, refresh this page.',
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
              checked={accountChoice === value}
              onChange={() => {
                setAccountChoice(value);
                if (value === 'NO') setVendorChoice('');
                else if (!applicant?.vendors.length)
                  setVendorChoice('account-only');
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
                Signed in as {applicant.profile.email}. Your business authority
                is checked again when you submit.
              </p>
              {applicant.vendors.length ? (
                <label className="ops-field">
                  Business for this application
                  <Select
                    required
                    value={vendorChoice}
                    onChange={(e) => setVendorChoice(e.target.value)}
                  >
                    <option value="">Choose or confirm a business</option>
                    <option value="account-only">
                      Apply with my account only
                    </option>
                    {applicant.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : (
                <p>
                  Your account has no Vendor business you can apply for. You can
                  use your personal contact details.
                </p>
              )}
              <Button variant="secondary" type="button" onClick={autofill}>
                Fill empty fields from my account
              </Button>
            </>
          ) : (
            <>
              <p>
                Sign in to use your account and return to this application with
                your progress.
              </p>
              <Button
                variant="secondary"
                type="button"
                onClick={() => void signIn()}
              >
                Sign in to my platform account
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
        Apply as a business without creating a platform Vendor account. No
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
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      <Button
        variant="primary"
        type="submit"
        disabled={
          pending ||
          !hydrated ||
          (accountChoice === 'YES' && (!applicant || !vendorChoice))
        }
      >
        {pending ? 'Submitting application' : 'Submit application'}
      </Button>
    </form>
  );
}
