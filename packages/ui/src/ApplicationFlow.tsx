import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  applicationQuestionVisible,
  type ApplicationDefinition,
  type PublicApplication,
} from '@market/api';
import { Button, Checkbox } from './index';
import { Input } from './form-controls';
import { ApplicationFields } from './ApplicationFields';

/**
 * Sectioned vendor application: a step list beside one section at a time.
 * Shared by the public storefront form and the Market's builder preview so the
 * preview shows exactly what vendors see. Submission, drafts and account
 * authority stay with the consumer; this only owns presentation and
 * step-by-step native validation.
 */
export interface ApplicationFlowStep {
  id: string;
  title: string;
  /** Short lines listed under the step in the side panel. */
  items?: string[];
  /** Whether the step's own answers are complete. */
  complete: boolean;
  /**
   * Steps that move on through their own controls hide Back/Next; their
   * `type="submit"` buttons advance to the next step.
   */
  hideNavigation?: boolean;
  content: () => ReactNode;
  /** Shown after the step's form, for content with its own controls. */
  extra?: () => ReactNode;
}

/** Questions listed under a step before the rest are summarized. */
const ITEM_LIMIT = 5;

type Source = Pick<PublicApplication, 'definition' | 'occurrences' | 'rentals'>;

const empty = (value: unknown) =>
  value == null ||
  value === '' ||
  (typeof value === 'string' && !value.trim()) ||
  (Array.isArray(value) && !value.length);

function visibleQuestions(
  definition: ApplicationDefinition,
  section: string,
  answers: Record<string, unknown>,
) {
  return definition.questions.filter(
    (q) => q.section === section && applicationQuestionVisible(q, answers),
  );
}

/** The section that shows rentals: the one asking about booth needs. */
export function rentalSection(definition: ApplicationDefinition) {
  return definition.questions.find((q) =>
    ['electricity', 'vehicle'].includes(q.semantic ?? ''),
  )?.section;
}

/** Integer minor units as currency (packages/ui does not depend on @market/config). */
function money(minor: number, currency: string) {
  const format = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(minor / 10 ** digits);
}

const dateFormat = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', options).format(new Date(value));

function MarketDates({
  occurrences,
  dates,
  onDates,
}: {
  occurrences: Source['occurrences'];
  dates: number[];
  onDates: (dates: number[]) => void;
}) {
  const id = useId();
  if (!occurrences.length)
    return (
      <p className="application-flow-note">
        No market dates are offered with this application. The Market shares
        dates during review.
      </p>
    );
  const all = occurrences.every((o) => dates.includes(o.id));
  return (
    <fieldset className="application-flow-dates">
      <legend className="sr-only">Market dates</legend>
      <div className="application-flow-dates-head">
        <p className="application-flow-note">
          Choose every date you would like to attend. The Market confirms dates
          when it reviews your application.
        </p>
        {occurrences.length > 1 && (
          <Button
            variant="tertiary"
            size="compact"
            onClick={() => onDates(all ? [] : occurrences.map((o) => o.id))}
          >
            {all ? 'Clear all' : 'Select all'}
          </Button>
        )}
      </div>
      <div className="application-flow-date-grid">
        {occurrences.map((o) => (
          <label
            key={o.id}
            className="application-flow-date"
            htmlFor={`${id}-${o.id}`}
          >
            <Input
              id={`${id}-${o.id}`}
              type="checkbox"
              checked={dates.includes(o.id)}
              onChange={(e) =>
                onDates(
                  e.target.checked
                    ? [...dates, o.id]
                    : dates.filter((value) => value !== o.id),
                )
              }
            />
            <span className="application-flow-date-tile" aria-hidden="true">
              <small>{dateFormat(o.startsAt, { month: 'short' })}</small>
              <strong>{dateFormat(o.startsAt, { day: 'numeric' })}</strong>
            </span>
            <span className="application-flow-date-text">
              <strong>
                {dateFormat(o.startsAt, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </strong>
              <small>
                {dateFormat(o.startsAt, { hour: 'numeric', minute: '2-digit' })}
                {o.endsAt &&
                  ` – ${dateFormat(o.endsAt, { hour: 'numeric', minute: '2-digit' })}`}
                {o.venue && ` · ${o.venue}`}
              </small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Rentals({
  rentals,
  quantities,
  onQuantities,
}: {
  rentals: Source['rentals'];
  quantities: Record<number, number>;
  onQuantities: (next: Record<number, number>) => void;
}) {
  const id = useId();
  return (
    <fieldset className="application-flow-rentals">
      <legend>Rentals and add-ons</legend>
      <p className="application-flow-note">
        Quantities apply to each requested date. The Market confirms what is
        available; requests do not reserve anything.
      </p>
      {rentals.map((r) => (
        <div key={r.id} className="application-flow-rental">
          <label htmlFor={`${id}-${r.id}`}>
            <strong>{r.name}</strong>
            <small>{money(r.priceMinor, r.currency)} each</small>
          </label>
          <Input
            id={`${id}-${r.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={r.maxQuantity}
            step={1}
            value={quantities[r.id] ?? 0}
            onChange={(e) =>
              onQuantities({
                ...quantities,
                [r.id]: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>
      ))}
    </fieldset>
  );
}

/**
 * Steps for an application: `leading` (the account question), market dates,
 * each definition section with visible questions, rentals with the booth needs
 * section (or on their own), then `trailing` (documents).
 */
export function applicationFlowSteps({
  application: a,
  answers,
  onAnswer,
  dates,
  onDates,
  rentals,
  onRentals,
  leading = [],
  trailing = [],
}: {
  application: Source;
  answers: Record<string, unknown>;
  onAnswer?: (id: string, value: unknown) => void;
  dates: number[];
  onDates: (dates: number[]) => void;
  rentals: Record<number, number>;
  onRentals: (next: Record<number, number>) => void;
  leading?: ApplicationFlowStep[];
  trailing?: ApplicationFlowStep[];
}): ApplicationFlowStep[] {
  const d = a.definition;
  const rentalsAt = a.rentals.length ? rentalSection(d) : undefined;
  const rentalNode = (
    <Rentals
      rentals={a.rentals}
      quantities={rentals}
      onQuantities={onRentals}
    />
  );
  const sections = d.sections
    .map((section) => ({
      section,
      questions: visibleQuestions(d, section, answers),
    }))
    .filter(
      ({ section, questions }) => questions.length || section === rentalsAt,
    );
  const rentalCount = a.rentals.filter((r) => (rentals[r.id] ?? 0) > 0).length;
  return [
    ...leading,
    {
      id: 'dates',
      title: 'Market dates',
      items: [
        a.occurrences.length
          ? dates.length
            ? `${dates.length} of ${a.occurrences.length} selected`
            : 'None selected yet'
          : 'Shared during review',
      ],
      // Dates are optional; the Market confirms them during review.
      complete: true,
      content: () => (
        <MarketDates
          occurrences={a.occurrences}
          dates={dates}
          onDates={onDates}
        />
      ),
    },
    ...sections.map(({ section, questions }): ApplicationFlowStep => ({
      id: `section:${section}`,
      title: section,
      items: [
        ...questions.filter((q) => q.type !== 'INFO').map((q) => q.label),
        ...(section === rentalsAt ? ['Rentals and add-ons'] : []),
      ],
      complete: questions.every(
        (q) => q.type === 'INFO' || !q.required || !empty(answers[q.id]),
      ),
      content: () => (
        <>
          <ApplicationFields
            definition={d}
            answers={answers}
            onAnswer={onAnswer}
            section={section}
          />
          {section === rentalsAt && rentalNode}
        </>
      ),
    })),
    ...(a.rentals.length && !rentalsAt
      ? [
          {
            id: 'rentals',
            title: 'Rentals and add-ons',
            items: [rentalCount ? `${rentalCount} requested` : 'Optional'],
            complete: true,
            content: () => rentalNode,
          },
        ]
      : []),
    ...trailing,
  ];
}

/**
 * The statement applicants accept before submitting. Its wording is versioned
 * by `applicationAcknowledgementVersion` (frontend and backend); change both
 * together whenever this text changes.
 */
export function ApplicationAcknowledgement({
  platform,
  policiesHref,
  checked,
  onChange,
}: {
  platform: string;
  policiesHref?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="application-flow-acknowledge">
      <Checkbox
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        I confirm that the information in this application is accurate and that
        I am authorized to apply on behalf of this business. I agree that this
        Market and {platform} may store and use my answers, documents and
        contact details to review this application and to contact me about it.
        {policiesHref && (
          <>
            {' '}
            Read the Market&apos;s{' '}
            <a href={policiesHref} target="_blank" rel="noopener">
              policies
            </a>
            .
          </>
        )}
      </span>
    </label>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ApplicationFlow({
  title,
  steps,
  animate = true,
  disabled = false,
  pending = false,
  submitLabel = 'Submit application',
  pendingLabel = 'Submitting application',
  submitDisabled = false,
  onSubmit,
  actions,
  notice,
  beforeSubmit,
  done,
  className = '',
}: {
  /** Heading above the steps, such as the application name. */
  title?: ReactNode;
  steps: ApplicationFlowStep[];
  /** Section transitions and the success check; off in the builder preview. */
  animate?: boolean;
  disabled?: boolean;
  pending?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  submitDisabled?: boolean;
  /** Called from the last step once its answers pass validation. */
  onSubmit: () => void;
  /** Extra controls beside Back/Next, such as Save draft. */
  actions?: ReactNode;
  /** Errors and status shown above the controls. */
  notice?: ReactNode;
  /**
   * Shown on the last step inside its form, before the submit button, so a
   * `required` acknowledgement is checked by native validation.
   */
  beforeSubmit?: ReactNode;
  /** Replaces the steps once the application is submitted. */
  done?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [index, setIndex] = useState(0);
  const [reached, setReached] = useState(0);
  const [passed, setPassed] = useState<ReadonlySet<string>>(() => new Set());
  // Unset until the applicant first moves, so the opening step does not animate.
  const [direction, setDirection] = useState<'forward' | 'back'>();
  // Steps can appear or disappear (the account step once sign-in is known);
  // keep the visible position within range.
  const current = Math.min(index, steps.length - 1);
  const step = steps[current]!;
  const last = current === steps.length - 1;
  // On phones the steps are one sideways row: slide it so the current step
  // sits in view, with the steps already done moving off to the left.
  useEffect(() => {
    const row = list.current;
    const item = row?.querySelector<HTMLElement>(
      done ? 'li:last-child' : 'li[data-current]',
    );
    if (!row || !item || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({
      left: Math.max(
        0,
        row.scrollLeft +
          item.getBoundingClientRect().left -
          row.getBoundingClientRect().left -
          16,
      ),
      behavior:
        animate &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'smooth'
          : 'auto',
    });
  }, [current, done, animate]);
  useEffect(() => {
    if (!direction) return;
    heading.current?.focus({ preventScroll: true });
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 0)
      root.current?.scrollIntoView({
        block: 'start',
        behavior: animate ? 'smooth' : 'auto',
      });
    // Only a step change moves focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  function go(target: number) {
    if (target === current || target < 0 || target >= steps.length) return;
    // Moving forward checks the current section first.
    if (target > current && !form.current?.reportValidity()) return;
    if (target > current)
      setPassed((all) => new Set(all).add(steps[current]!.id));
    setDirection(target > current ? 'forward' : 'back');
    setIndex(target);
    setReached((value) => Math.max(value, target));
  }
  const steady = useMemo(
    () => steps.map((s) => passed.has(s.id) && s.complete),
    [steps, passed],
  );

  return (
    <div
      ref={root}
      className={`application-flow ${className}`.trim()}
      data-animate={animate || undefined}
      data-done={done ? true : undefined}
    >
      <nav className="application-flow-nav" aria-label="Application sections">
        <p className="application-flow-count">
          {done ? 'Submitted' : `Step ${current + 1} of ${steps.length}`}
        </p>
        <ol ref={list}>
          {steps.map((s, i) => {
            const state =
              done || steady[i]
                ? 'complete'
                : i === current
                  ? 'current'
                  : 'upcoming';
            const reachable = !done && !disabled && i <= reached;
            const label = (
              <>
                <span className="application-flow-marker" aria-hidden="true">
                  {state === 'complete' && <CheckMark />}
                </span>
                <span className="application-flow-step-title">{s.title}</span>
                <span className="sr-only">
                  {state === 'complete'
                    ? ' (complete)'
                    : i === current
                      ? ''
                      : ' (not started)'}
                </span>
              </>
            );
            return (
              <li
                key={s.id}
                data-state={state}
                data-current={(!done && i === current) || undefined}
              >
                {reachable && i !== current ? (
                  <button
                    type="button"
                    className="application-flow-step"
                    onClick={() => go(i)}
                  >
                    {label}
                  </button>
                ) : (
                  <span
                    className="application-flow-step"
                    aria-current={!done && i === current ? 'step' : undefined}
                  >
                    {label}
                  </span>
                )}
                {!!s.items?.length && (
                  <ul className="application-flow-items">
                    {s.items.slice(0, ITEM_LIMIT).map((item, n) => (
                      <li key={`${item}-${n}`}>{item}</li>
                    ))}
                    {s.items.length > ITEM_LIMIT && (
                      <li>{s.items.length - ITEM_LIMIT} more</li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <div
          className="application-flow-progress"
          role="progressbar"
          aria-label="Application progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done ? steps.length : current + 1}
        >
          <span
            style={{
              width: `${((done ? steps.length : current + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </nav>
      <div className="application-flow-main">
        {title && <div className="application-flow-title">{title}</div>}
        {done ? (
          <div className="application-flow-panel application-flow-done">
            <span className="application-flow-check" aria-hidden="true">
              <CheckMark />
            </span>
            {done}
          </div>
        ) : (
          <section
            key={step.id}
            className="application-flow-panel"
            data-direction={direction}
            aria-labelledby={`${id}-title`}
          >
            <h2
              id={`${id}-title`}
              ref={heading}
              tabIndex={-1}
              className="application-flow-heading"
            >
              {step.title}
            </h2>
            {/* Only the step's own answers are in the form; extras such as
                document dialogs and the controls sit outside it, so their
                buttons and Enter never submit the application. */}
            <form
              ref={form}
              id={id}
              aria-busy={pending}
              aria-labelledby={`${id}-title`}
              onSubmit={(event) => {
                event.preventDefault();
                if (disabled || pending) return;
                if (!last) return go(current + 1);
                // A later answer can reveal a required question in a passed
                // section; return there instead of submitting.
                const incomplete = steps.findIndex(
                  (s, i) => i < current && !s.complete,
                );
                if (incomplete >= 0) return go(incomplete);
                setPassed((all) => new Set(all).add(step.id));
                onSubmit();
              }}
            >
              <fieldset
                className="application-flow-fields"
                disabled={disabled || pending}
              >
                {step.content()}
              </fieldset>
              {last && beforeSubmit && (
                <fieldset
                  className="application-flow-confirm"
                  disabled={disabled || pending}
                >
                  {beforeSubmit}
                </fieldset>
              )}
            </form>
            {step.extra?.()}
            {notice}
            {!step.hideNavigation && (
              <div className="application-flow-actions">
                {current > 0 ? (
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => go(current - 1)}
                  >
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                <div className="application-flow-actions-end">
                  {actions}
                  <Button
                    type="submit"
                    form={id}
                    variant="primary"
                    disabled={disabled || pending || (last && submitDisabled)}
                    loading={last && pending}
                  >
                    {last ? (pending ? pendingLabel : submitLabel) : 'Next'}
                  </Button>
                </div>
              </div>
            )}
            {step.hideNavigation && current > 0 && (
              <div className="application-flow-actions">
                <Button variant="secondary" onClick={() => go(current - 1)}>
                  Back
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
