import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Checkbox, Dropdown } from '@market/ui';
import { FarmstandIcon } from '@market/ui/farmstand';
import type { FinanceMetric } from './charts';

const CLOSE_MS = 150;

/**
 * Multi-metric chooser presented exactly like a Farmstand select (trigger,
 * picker surface, option rows and open/close motion). Composes the shared
 * native Dropdown disclosure and Checkbox because the Farmstand select is
 * single-value and SearchableMultiSelect is a search combobox in another
 * control family.
 */
export function FinanceMetricSelect({
  value,
  options,
  onChange,
}: {
  value: readonly FinanceMetric[];
  options: ReadonlyArray<{ value: FinanceMetric; label: string }>;
  onChange: (value: FinanceMetric[]) => void;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false),
    [closing, setClosing] = useState(false);
  // Play the picker's fade-out before the native disclosure hides its content.
  const close = (focus = false) => {
    if (focus) root.current?.querySelector('summary')?.focus();
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    clearTimeout(timer.current);
    setClosing(true);
    timer.current = setTimeout(
      () => {
        setOpen(false);
        setClosing(false);
      },
      reduced ? 0 : CLOSE_MS,
    );
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open || closing) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  });
  function toggle(event: MouseEvent) {
    if (!(event.target as Element).closest('summary')) return;
    event.preventDefault();
    if (open && !closing) close();
    else {
      clearTimeout(timer.current);
      setClosing(false);
      setOpen(true);
    }
  }
  const summary =
    value.length === options.length
      ? 'All metrics'
      : value.length === 0
        ? 'No metrics'
        : value.length === 1
          ? options.find((o) => o.value === value[0])!.label
          : `${value.length} metrics`;
  return (
    <span ref={root} className="finance-metric-root" onClickCapture={toggle}>
      <Dropdown
        className={
          'finance-metric-select' + (closing ? ' finance-metric-closing' : '')
        }
        open={open}
        onToggle={(event) => {
          if (event.currentTarget.open !== open)
            setOpen(event.currentTarget.open);
        }}
        label={
          <>
            <FarmstandIcon name="chevron-down" />
            <span className="sr-only">Metrics shown: </span>
            <span className="finance-metric-value">{summary}</span>
          </>
        }
      >
        <fieldset className="finance-metric-options">
          <legend className="sr-only">Metrics shown on the graph</legend>
          {options.map((option) => (
            <label key={option.value}>
              <Checkbox
                checked={value.includes(option.value)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? options
                          .map((o) => o.value)
                          .filter(
                            (v) => v === option.value || value.includes(v),
                          )
                      : value.filter((v) => v !== option.value),
                  )
                }
              />
              <span
                className={`finance-series-key finance-series-${option.value}`}
              >
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>
      </Dropdown>
    </span>
  );
}
