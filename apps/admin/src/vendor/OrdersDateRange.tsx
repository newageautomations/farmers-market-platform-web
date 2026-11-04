import { useId, useState } from 'react';
import { Button, Dialog, IconButton } from '@market/ui';
import { localOrderDate } from './orders-data';

type Range = { from: string; to: string };
const label = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    dateStyle: 'full',
  });

/** The occurrence picker only accepts scheduled market days, so this feature
 * composition uses shared Dialog and Button controls for arbitrary date ranges. */
export function OrdersDateRange({
  value,
  onClose,
  onApply,
  subject = 'orders',
  maxDays,
}: {
  value: Range;
  onClose: () => void;
  onApply: (range: Range) => void;
  subject?: string;
  maxDays?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Range>(value);
  const [step, setStep] = useState<'from' | 'to'>('from');
  const [month, setMonth] = useState(
    (value.from || localOrderDate(new Date())).slice(0, 7),
  );
  const [year, number] = month.split('-').map(Number);
  const first = new Date(year!, number! - 1, 1);
  const count = new Date(year!, number!, 0).getDate();
  const offset = first.getDay();
  const weeks = Math.ceil((offset + count) / 7);
  const move = (amount: number) =>
    setMonth(
      localOrderDate(new Date(year!, number! - 1 + amount, 1)).slice(0, 7),
    );
  function choose(day: string) {
    if (step === 'from') {
      setDraft({ from: day, to: '' });
      setStep('to');
    } else {
      setDraft({ from: draft.from, to: day });
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Custom date range"
      size="standard"
      className="orders-date-dialog"
      description={`Choose the from date, then the to date to filter ${subject}.${maxDays ? ` Select up to ${maxDays} days.` : ''}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!draft.from || !draft.to}
            onClick={() => onApply(draft)}
          >
            Apply date range
          </Button>
        </>
      }
    >
      <div className="orders-range-selection">
        <Button
          variant={step === 'from' ? undefined : 'secondary'}
          onClick={() => setStep('from')}
          aria-pressed={step === 'from'}
        >
          From: {draft.from ? label(draft.from) : 'Choose date'}
        </Button>
        <Button
          variant={step === 'to' ? undefined : 'secondary'}
          disabled={!draft.from}
          onClick={() => setStep('to')}
          aria-pressed={step === 'to'}
        >
          To: {draft.to ? label(draft.to) : 'Choose date'}
        </Button>
      </div>
      <p className="orders-range-instruction" role="status">
        {step === 'from'
          ? 'Select the from date.'
          : draft.to
            ? `Date range selected. Apply to filter ${subject}.`
            : 'Now select the to date.'}
      </p>
      <div className="orders-calendar-navigation">
        <IconButton
          icon="chevron-left"
          label="Previous month"
          onClick={() => move(-1)}
        />
        <span id={id} aria-live="polite">
          {first.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <IconButton
          icon="chevron-right"
          label="Next month"
          onClick={() => move(1)}
        />
      </div>
      <table className="orders-calendar" aria-labelledby={id}>
        <thead>
          <tr>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: weeks }, (_, week) => (
            <tr key={week}>
              {Array.from({ length: 7 }, (_, column) => {
                const day = week * 7 + column - offset + 1;
                const date = `${month}-${String(day).padStart(2, '0')}`;
                const selected = date === draft.from || date === draft.to;
                return (
                  <td
                    key={column}
                    data-in-range={
                      (draft.from &&
                        draft.to &&
                        day > 0 &&
                        day <= count &&
                        date > draft.from &&
                        date < draft.to) ||
                      undefined
                    }
                  >
                    {day > 0 && day <= count && (
                      <Button
                        variant={selected ? undefined : 'tertiary'}
                        size="compact"
                        aria-label={label(date)}
                        aria-pressed={selected}
                        aria-current={
                          date === localOrderDate(new Date())
                            ? 'date'
                            : undefined
                        }
                        disabled={
                          step === 'to' &&
                          (date < draft.from ||
                            (!!maxDays &&
                              Date.parse(date) - Date.parse(draft.from) >=
                                maxDays * 86400000))
                        }
                        onClick={() => choose(date)}
                      >
                        {day}
                      </Button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
