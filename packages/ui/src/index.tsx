import {
  Component,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { safeError, type ErrorKind } from '@market/api';
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
        <section role="alert">
          <h1>This page is temporarily unavailable</h1>
          <p>Please reload to try again.</p>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </section>
      );
    return this.props.children;
  }
}
export function Button({ className = '', ...props }: ComponentProps<'button'>) {
  return <button type="button" {...props} className={`button ${className}`} />;
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
export const Input = (props: ComponentProps<'input'>) => <input {...props} />;
export const Textarea = (props: ComponentProps<'textarea'>) => (
  <textarea {...props} />
);
export const Select = (props: ComponentProps<'select'>) => (
  <select {...props} />
);
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
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="status">
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
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <h2>{title}</h2>
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
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children}
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
    <section className="error-state" role="alert">
      <h2>{stateTitles[safe.kind]}</h2>
      <p>{safe.message}</p>
    </section>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  drawer = false,
  busy = false,
  focusTitle = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  drawer?: boolean;
  busy?: boolean;
  focusTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleRef = useRef<HTMLHeadingElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      if (focusTitle) {
        titleRef.current?.focus({ preventScroll: true });
        dialog.scrollTop = 0;
      }
    } else if (!open && dialog?.open) dialog.close();
  }, [open, focusTitle]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      className={drawer ? 'drawer' : ''}
    >
      <h2 ref={titleRef} id={id} tabIndex={focusTitle ? -1 : undefined}>
        {title}
      </h2>
      {children}
      <Button disabled={busy} onClick={onClose}>
        Close
      </Button>
    </dialog>
  );
}
export function Drawer(props: Omit<ComponentProps<typeof Dialog>, 'drawer'>) {
  return <Dialog {...props} drawer />;
}
export function Dropdown({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="dropdown">
      <summary>{label}</summary>
      <div>{children}</div>
    </details>
  );
}
export function Tabs({
  items,
}: {
  items: readonly { label: string; content: ReactNode }[];
}) {
  const [selected, setSelected] = useState(0),
    id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div>
      <div role="tablist" aria-label="Views">
        {items.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={`${id}-tab-${index}`}
            role="tab"
            aria-selected={selected === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === 'ArrowRight') next = (index + 1) % items.length;
              else if (event.key === 'ArrowLeft')
                next = (index + items.length - 1) % items.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = items.length - 1;
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
    <table {...props} />
  </div>
);
/* eslint-enable jsx-a11y-x/no-noninteractive-tabindex */
export const TableHead = (props: ComponentProps<'thead'>) => (
  <thead {...props} />
);
export const TableBody = (props: ComponentProps<'tbody'>) => (
  <tbody {...props} />
);
export function Pagination({
  label = 'Pagination',
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  label?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav aria-label={label} className="actions">
      <Button disabled={!hasPrevious} onClick={onPrevious}>
        Previous
      </Button>
      <Button disabled={!hasNext} onClick={onNext}>
        Next
      </Button>
    </nav>
  );
}
export { MarketMap, boothTooltipPosition, type BoothStatus } from './MarketMap';
export { ApplicationFields } from './ApplicationFields';
