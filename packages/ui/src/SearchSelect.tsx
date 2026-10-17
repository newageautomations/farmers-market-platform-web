import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Input } from './form-controls';
import { Button, Checkbox } from './index';

export type SearchOption = { value: string; label: string; disabled?: boolean };
type SharedProps = {
  label: string;
  options: readonly SearchOption[];
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  selectedLabel?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  searchHint?: string;
  id?: string;
  name?: string;
  required?: boolean;
};
export function SearchSelect(
  props: SharedProps & { value: string; onChange: (value: string) => void },
) {
  return (
    <SearchChoices
      {...props}
      values={props.value ? [props.value] : []}
      onSelection={(values) => props.onChange(values[0] ?? '')}
    />
  );
}
export function SearchableMultiSelect({
  value,
  defaultValue = [],
  onChange,
  ...props
}: SharedProps & {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
}) {
  const [local, setLocal] = useState<readonly string[]>(defaultValue);
  return (
    <SearchChoices
      {...props}
      multiple
      values={value ?? local}
      onSelection={(values) => {
        setLocal(values);
        onChange?.(values);
      }}
      onReset={() => {
        setLocal(defaultValue);
        onChange?.([...defaultValue]);
      }}
    />
  );
}
export function sortSearchOptions(
  options: readonly SearchOption[],
  selected: readonly string[],
) {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  const chosen = new Set(selected);
  return [...options].sort(
    (a, b) =>
      Number(chosen.has(b.value)) - Number(chosen.has(a.value)) ||
      collator.compare(a.label, b.label) ||
      a.value.localeCompare(b.value, 'en', { sensitivity: 'variant' }),
  );
}
function SearchChoices({
  label,
  values,
  onSelection,
  options,
  placeholder = 'Search options',
  disabled = false,
  allowClear = false,
  clearLabel = 'Clear selection',
  selectedLabel,
  onSearch,
  loading = false,
  searchHint,
  id: suppliedId,
  name,
  required,
  multiple = false,
  onReset,
}: SharedProps & {
  values: readonly string[];
  onSelection: (values: string[]) => void;
  multiple?: boolean;
  onReset?: () => void;
}) {
  const generatedId = useId(),
    id = suppliedId ?? generatedId;
  const [query, setQuery] = useState(''),
    [open, setOpen] = useState(false),
    [active, setActive] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const ordered = useMemo(
    () => (multiple ? sortSearchOptions(options, values) : options),
    [multiple, options, values],
  );
  const choices = loading
    ? []
    : onSearch
      ? ordered
      : ordered.filter((o) =>
          o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        );
  const enabled = choices.filter((o) => !o.disabled);
  const activeIndex = choices.findIndex((o) => o.value === active);
  const selection =
    selectedLabel ??
    options
      .filter((o) => values.includes(o.value))
      .map((o) => o.label)
      .join(', ');
  useEffect(() => {
    if (open && activeIndex >= 0)
      document
        .getElementById(id + '-' + activeIndex)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, id]);
  useEffect(() => {
    input.current?.setCustomValidity(
      required && !values.length ? 'Select at least one option.' : '',
    );
  }, [required, values]);
  useEffect(() => {
    const form = input.current?.form;
    function reset() {
      onReset?.();
      setQuery('');
      setOpen(false);
    }
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [onReset]);
  function close() {
    setOpen(false);
    setQuery('');
    onSearch?.('');
  }
  function select(option: SearchOption) {
    if (option.disabled || input.current?.matches(':disabled')) return;
    onSelection(
      multiple
        ? values.includes(option.value)
          ? values.filter((v) => v !== option.value)
          : [...values, option.value]
        : [option.value],
    );
    if (!multiple) close();
  }
  return (
    <div
      className="ops-field market-search-select ui-search-select"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="market-search-select-control">
        <Input
          ref={input}
          id={id}
          role="combobox"
          autoComplete="off"
          maxLength={200}
          aria-expanded={open}
          aria-controls={id + '-options'}
          aria-autocomplete="list"
          aria-required={required || undefined}
          aria-describedby={id + '-selection'}
          aria-busy={loading}
          aria-activedescendant={
            open && activeIndex >= 0 ? id + '-' + activeIndex : undefined
          }
          disabled={disabled}
          value={open ? query : selection}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setActive(undefined);
          }}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch?.(e.target.value);
            setOpen(true);
            setActive(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.preventDefault();
              e.stopPropagation();
              close();
            } else if (
              ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)
            ) {
              if (!open && (e.key === 'Home' || e.key === 'End')) return;
              e.preventDefault();
              setOpen(true);
              const current = enabled.findIndex((o) => o.value === active);
              const index =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? enabled.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          enabled.length - 1,
                          current + (e.key === 'ArrowDown' ? 1 : -1),
                        ),
                      );
              setActive(enabled[index]?.value);
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              const option =
                choices[activeIndex] ?? (query ? enabled[0] : undefined);
              if (option) select(option);
            }
          }}
        />
        <svg
          className="decorative-chevron"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </div>
      <span id={id + '-selection'} className="sr-only" aria-live="polite">
        {(selectedLabel
          ? options.find((option) => option.value === values[0])?.label
          : selection) || 'No selection'}
      </span>
      {name &&
        values.map((value) => (
          <input
            key={value}
            type="hidden"
            name={name}
            value={value}
            disabled={
              disabled || options.find((o) => o.value === value)?.disabled
            }
          />
        ))}
      {allowClear && values.length > 0 && (
        <Button
          variant="secondary"
          size="compact"
          disabled={disabled}
          onClick={() => {
            onSelection(
              values.filter(
                (v) => options.find((o) => o.value === v)?.disabled,
              ),
            );
            input.current?.focus();
          }}
        >
          {' '}
          {clearLabel}{' '}
        </Button>
      )}
      <div
        id={id + '-options'}
        role="listbox"
        aria-multiselectable={multiple || undefined}
        aria-hidden={!open}
        aria-label={label}
        className={'market-select-options ' + (open ? 'is-open' : '')}
        inert={!open}
      >
        {choices.map((option, index) => (
          <div
            key={option.value}
            id={id + '-' + index}
            role="option"
            tabIndex={-1}
            aria-selected={values.includes(option.value)}
            aria-disabled={option.disabled || undefined}
            className={
              (active === option.value ? 'is-active ' : '') +
              (multiple &&
              index > 0 &&
              values.includes(choices[index - 1]!.value) &&
              !values.includes(option.value)
                ? 'ui-selection-divider'
                : '')
            }
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(option)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(option);
              }
            }}
          >
            {multiple && (
              <Checkbox
                className="ui-option-check"
                checked={values.includes(option.value)}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                disabled={option.disabled}
              />
            )}
            {option.label}
          </div>
        ))}
        {loading ? (
          <p role="status">Searching…</p>
        ) : (
          !choices.length && <p role="status">No matches found</p>
        )}
        {!loading && searchHint && <p role="status">{searchHint}</p>}
      </div>
    </div>
  );
}
