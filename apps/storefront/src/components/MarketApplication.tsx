import { useRef, useState, useSyncExternalStore } from 'react';
import type { PublicApplication } from '@market/api';
import { ApplicationFields } from '@market/ui';
import { formatMoney } from '@market/config';
const subscribe = () => () => {};
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
  const key = useRef(crypto.randomUUID());
  if (submitted)
    return (
      <div role="status">
        <h2>Application submitted</h2>
        <p>
          The Market will review your application and requested dates. No
          payment has been taken.
        </p>
      </div>
    );
  return (
    <form
      className="ops-application"
      data-ready={hydrated}
      aria-busy={pending}
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError('');
        try {
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
            }),
          });
          if (!response.ok) throw new Error();
          setSubmitted(true);
        } catch {
          setError(
            'The application could not be submitted. Check your answers and dates, then try again. If the application changed, refresh this page.',
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <p>
        Apply as a business without creating a platform Vendor account. No
        payment is collected when you apply.
      </p>
      <ApplicationFields
        definition={a.definition}
        answers={answers}
        onAnswer={(id, value) => setAnswers((v) => ({ ...v, [id]: value }))}
      />
      <fieldset className="ops-section">
        <legend>Requested Market dates</legend>
        {a.occurrences.map((o) => (
          <label className="ops-check" key={o.id}>
            <input
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
      </fieldset>
      <fieldset className="ops-section">
        <legend>Requested rentals and add-ons</legend>
        <p>
          These quantities apply to each requested date. The manager confirms
          accepted quantities for each occurrence. Requests do not reserve
          resources.
        </p>
        {a.rentals.map((r) => (
          <label key={r.id} className="ops-field">
            {r.name} · {formatMoney(r.priceMinor, r.currency)} each
            <input
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
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending || !hydrated}>
        {pending ? 'Submitting application' : 'Submit application'}
      </button>
    </form>
  );
}
