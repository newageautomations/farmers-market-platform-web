import { useEffect, useId, useRef, useState } from 'react';
import { Input } from './form-controls';
import { Button } from './index';

export function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  allowClear = false,
  clearLabel = 'Clear selection',
  selectedLabel,
  onSearch,
  loading = false,
  searchHint,
  id: suppliedId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  selectedLabel?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  searchHint?: string;
  id?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const choices = loading
    ? []
    : onSearch
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        );
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, id]);
  function select(next: string) {
    if (input.current?.matches(':disabled')) return;
    onChange(next);
    setOpen(false);
    setQuery('');
    onSearch?.('');
  }
  return (
    <div
      className="ops-field market-search-select ui-search-select"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setQuery('');
          onSearch?.('');
        }
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
          aria-controls={`${id}-options`}
          aria-autocomplete="list"
          aria-describedby={selectedLabel ? `${id}-selection` : undefined}
          aria-busy={loading}
          aria-activedescendant={
            open && choices[active] ? `${id}-${active}` : undefined
          }
          disabled={disabled}
          value={
            open
              ? query
              : (selectedLabel ??
                options.find((o) => o.value === value)?.label ??
                '')
          }
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch?.(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setQuery('');
              onSearch?.('');
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                choices.length
                  ? Math.max(
                      0,
                      Math.min(
                        choices.length - 1,
                        n + (e.key === 'ArrowDown' ? 1 : -1),
                      ),
                    )
                  : -1,
              );
            }
            if (e.key === 'Enter' && open) {
              e.preventDefault();
              if (choices[active]) select(choices[active]!.value);
            }
          }}
        />
        <svg
          className="decorative-chevron"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </div>
      {allowClear && value && (
        <Button
          variant="secondary"
          size="compact"
          disabled={disabled}
          onClick={() => {
            input.current?.focus();
            select('');
          }}
        >
          {clearLabel}
        </Button>
      )}
      {selectedLabel && (
        <span id={`${id}-selection`} className="sr-only">
          {options.find((o) => o.value === value)?.label}
        </span>
      )}
      <div
        id={`${id}-options`}
        role="listbox"
        aria-hidden={!open}
        aria-label={label}
        className={`market-select-options ${open ? 'is-open' : ''}`}
        inert={!open}
      >
        {choices.map((o, index) => (
          <div
            key={o.value}
            id={`${id}-${index}`}
            role="option"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(o.value);
              }
            }}
            aria-selected={value === o.value}
            className={active === index ? 'is-active' : ''}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(o.value)}
          >
            {o.label}
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
