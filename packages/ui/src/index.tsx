export { PhoneInput } from './PhoneInput';
export { SearchSelect } from './SearchSelect';
export { TimezoneField, usTimezones } from './TimezoneField';
export { fieldLimits, inputContract } from './input-validation';
export { Input, Textarea } from './form-controls';
import {
  Component,
  createElement,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { safeError, type ErrorKind } from '@market/api';
import {
  buttonClassName,
  cardClassName,
  selectClassName,
  statusBadgeClassName,
  alertClassName,
  disclosureClassName,
  sectionHeadingClassName,
  type StatusTone,
  type AlertSeverity,
  type HeadingLevel,
  type ButtonVariant,
  type ButtonSize,
} from './presentation';
export { buttonClassName } from './presentation';
export { DashboardFrame, DashboardMenu } from './dashboard';
export { AccountModeSelect, type AccountModeChoice } from './account-mode';
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    console.error(
      JSON.stringify({
        event: 'surface_failure',
        requestId: crypto.randomUUID(),
      }),
    );
  }
  render() {
    if (this.state.failed)
      return (
        <section className={alertClassName('error')} role="alert">
          <h1>This page is temporarily unavailable</h1>
          <p>Please reload to try again.</p>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </section>
      );
    return this.props.children;
  }
}
export function Button({
  className = '',
  variant,
  size,
  iconOnly,
  loading = false,
  disabled,
  ...props
}: ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading ? true : props['aria-busy']}
      className={buttonClassName({ variant, size, iconOnly, className })}
    />
  );
}
export function Link({
  href,
  children,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> & { href: string }) {
  const external = /^https?:\/\//.test(href);
  if (!external && !/^(\/(?!\/)|#)/.test(href)) throw new Error('Unsafe link');
  return (
    <a
      {...props}
      href={href}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}
export const Select = ({
  className,
  variant = 'ordinary',
  ...props
}: ComponentProps<'select'> & { variant?: 'ordinary' | 'status' }) => (
  <select {...props} className={selectClassName(className, variant)} />
);
export function SelectField({
  label,
  info,
  error,
  id,
  children,
  ...props
}: ComponentProps<typeof Select> & {
  label: ReactNode;
  info?: string;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field id={fieldId} label={label} info={info} error={error}>
      <Select
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={
          [props['aria-describedby'], error ? `${fieldId}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
      >
        {children}
      </Select>
    </Field>
  );
}
export const Checkbox = (props: Omit<ComponentProps<'input'>, 'type'>) => (
  <input {...props} type="checkbox" />
);
export const Radio = (props: Omit<ComponentProps<'input'>, 'type'>) => (
  <input {...props} type="radio" />
);
export function Field({
  id,
  label,
  error,
  children,
  info,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  children: ReactNode;
  info?: string;
}) {
  return (
    <div className="field">
      {info ? (
        <div className="field-title">
          <label htmlFor={id}>{label}</label>
          <InfoTip label={String(label)} text={info} />
        </div>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      {children}
      {error && <FormError id={`${id}-error`}>{error}</FormError>}
    </div>
  );
}
export function FormError({ children, ...props }: ComponentProps<'p'>) {
  return (
    <p {...props} className="form-error" role="alert">
      {children}
    </p>
  );
}
export function InfoTip({ text, label }: { text: string; label: string }) {
  const id = useId();
  return (
    <span className="info-tip">
      <button type="button" aria-label={`About ${label}`} aria-describedby={id}>
        i
      </button>
      <span id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}
export function Container({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`container ${className}`}>{children}</div>;
}
type CardElement = 'div' | 'article' | 'section' | 'li' | 'fieldset';
type CardProps<T extends CardElement> = {
  as?: T;
  spacing?: 'block' | 'contained';
  padding?: 'default' | 'none';
  surface?: 'card' | 'embedded';
} & ComponentProps<T>;
export function Card<T extends CardElement = 'div'>({
  as,
  children,
  className = '',
  spacing,
  padding,
  surface,
  ...props
}: CardProps<T>) {
  return createElement(
    as ?? 'div',
    {
      ...props,
      className: cardClassName({ className, spacing, padding, surface }),
    },
    children,
  );
}
export function Badge({
  children,
  tone,
  className = '',
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={`${tone ? statusBadgeClassName(tone) : 'badge'} ${className}`}
    >
      {children}
    </span>
  );
}
export function Alert({
  children,
  severity = 'info',
  className = '',
  ...props
}: ComponentProps<'div'> & { severity?: AlertSeverity }) {
  return (
    <div
      role="status"
      {...props}
      className={alertClassName(severity, className)}
    >
      {children}
    </div>
  );
}
export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {children}
    </header>
  );
}
export function SectionHeader({
  title,
  children,
  level = 2,
  variant = 'dashboard',
  id,
}: {
  title: ReactNode;
  children?: ReactNode;
  level?: HeadingLevel;
  variant?: 'dashboard' | 'consumer';
  id?: string;
}) {
  return (
    <header className={sectionHeadingClassName(variant)}>
      {createElement(`h${level}`, { id }, title)}
      {children}
    </header>
  );
}
export function Skeleton() {
  return <div className="skeleton" aria-hidden="true" />;
}
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <p className="progress" role="status">
      <span aria-hidden="true" className="spinner" />
      {label}
    </p>
  );
}
export function EmptyState({
  title,
  children,
  action,
  level = 3,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  level?: HeadingLevel;
}) {
  return (
    <div className="empty-state">
      {createElement(`h${level}`, {}, title)}
      {children}
      {action && <div className="ui-actions">{action}</div>}
    </div>
  );
}
const stateTitles: Record<ErrorKind, string> = {
  network: 'Connection interrupted',
  graphql: 'Request unavailable',
  authentication: 'Sign in required',
  forbidden: 'Access restricted',
  validation: 'Check your request',
  conflict: 'Refresh required',
  unavailable: 'Service unavailable',
  'not-found': 'Storefront not found',
  entitlement: 'Feature unavailable',
  unknown: 'Unable to continue',
};
export function ErrorState({ error }: { error: unknown }) {
  const safe = safeError(error);
  return (
    <section className={alertClassName('error', 'error-state')} role="alert">
      <h2>{stateTitles[safe.kind]}</h2>
      <p>{safe.message}</p>
    </section>
  );
}
export { Dialog, Drawer, type DialogProps } from './dialog';
export function Dropdown({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className={disclosureClassName('dropdown')}>
      <summary>{label}</summary>
      <div className="ui-disclosure-content">{children}</div>
    </details>
  );
}
export function Tabs({
  items,
}: {
  items: readonly { label: string; content: ReactNode; disabled?: boolean }[];
}) {
  const [selected, setSelected] = useState(() =>
      items.findIndex((item) => !item.disabled),
    ),
    id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div>
      <div role="tablist" className="ui-tabs" aria-label="Views">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.label}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={`${id}-tab-${index}`}
            role="tab"
            disabled={item.disabled}
            aria-selected={selected === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              const enabled = items
                .map((item, index) => (item.disabled ? -1 : index))
                .filter((index) => index >= 0);
              const position = enabled.indexOf(index);
              let next = index;
              if (event.key === 'ArrowRight')
                next = enabled[(position + 1) % enabled.length]!;
              else if (event.key === 'ArrowLeft')
                next =
                  enabled[(position + enabled.length - 1) % enabled.length]!;
              else if (event.key === 'Home') next = enabled[0]!;
              else if (event.key === 'End') next = enabled.at(-1)!;
              else return;
              event.preventDefault();
              setSelected(next);
              refs.current[next]?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.label}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          hidden={selected !== index}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
/* eslint-disable jsx-a11y-x/no-noninteractive-tabindex -- Scroll regions require keyboard focus; axe verifies this at mobile widths. */
export const Table = (props: ComponentProps<'table'>) => (
  <div
    className="table-scroll"
    tabIndex={0}
    role="region"
    aria-label={`${props['aria-label'] ?? 'Table'} scroll area`}
  >
    <table {...props} className={`ui-table ${props.className ?? ''}`} />
  </div>
);
/* eslint-enable jsx-a11y-x/no-noninteractive-tabindex */
export const TableHead = (props: ComponentProps<'thead'>) => (
  <thead {...props} />
);
export const TableBody = (props: ComponentProps<'tbody'>) => (
  <tbody {...props} />
);
/** TBL-02. Sorting remains feature-owned; this component only announces it. */
export function DataTable({
  headings,
  children,
  label,
  sort,
  wide = false,
}: {
  headings: readonly string[];
  children: ReactNode;
  label: string;
  sort?: { heading: string; direction: 'ascending' | 'descending' };
  wide?: boolean;
}) {
  return (
    <Table aria-label={label} className={wide ? 'ui-table-wide' : undefined}>
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          {headings.map((heading) => (
            <th
              scope="col"
              key={heading}
              aria-sort={sort?.heading === heading ? sort.direction : undefined}
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </Table>
  );
}
export function Pagination({
  label = 'Pagination',
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  summary,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: {
  label?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  summary?: ReactNode;
  previousLabel?: string;
  nextLabel?: string;
}) {
  return (
    <nav aria-label={label} className="actions ui-pagination">
      {summary && <p className="ui-pagination-summary">{summary}</p>}
      <Button variant="secondary" disabled={!hasPrevious} onClick={onPrevious}>
        {previousLabel}
      </Button>
      <Button disabled={!hasNext} onClick={onNext}>
        {nextLabel}
      </Button>
    </nav>
  );
}
export { MarketMap, boothTooltipPosition, type BoothStatus } from './MarketMap';
export { MapCanvas, type MapCanvasHandle, type MapTool } from './map/MapCanvas';
export * from './map/model';
export { ApplicationFields } from './ApplicationFields';

export {
  passwordChecks,
  validPassword,
  passwordMaximum,
  passwordSymbols,
} from './password-policy';
