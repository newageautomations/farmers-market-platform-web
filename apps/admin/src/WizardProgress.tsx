import { useLayoutEffect, useRef, type RefObject } from 'react';
import { UtilityIcon } from '@market/ui';
import './vendor/loyalty-reward-wizard.css';

/**
 * Step caption and numbered progress list, extracted from the loyalty reward
 * wizard so other multi-step dialogs share the same presentation. Callers
 * own the current step, validation and submission. Render inside an element
 * carrying the `reward-wizard` class, which supplies the border tokens.
 */
export function WizardProgress({
  steps,
  step,
  label,
}: {
  steps: readonly string[];
  step: number;
  label: string;
}) {
  return (
    <>
      <p className="reward-step-caption" role="status">
        Step {step + 1} of {steps.length} · {steps[step]}
      </p>
      <ol
        className="reward-progress"
        aria-label={label}
        style={{ ['--wizard-steps' as string]: steps.length }}
      >
        {steps.map((name, index) => (
          <li
            key={name}
            aria-current={index === step ? 'step' : undefined}
            data-complete={index < step}
          >
            <span className="reward-step-number" aria-hidden="true">
              {index < step ? <UtilityIcon name="check" /> : index + 1}
            </span>
            <span>{name}</span>
            {index < step && <span className="sr-only">Completed</span>}
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Animates the enclosing dialog's size between wizard stages. Call
 * `capture()` immediately before changing stage; the effect then eases from
 * the captured height (and width, when a stage changes the dialog's width) to
 * the new one (reduced motion jumps directly).
 */
export function useWizardDialogHeight(
  root: RefObject<HTMLElement | null>,
  stage: unknown,
) {
  const size = useRef<{ height: number; width: number } | null>(null);
  const measure = () => {
    const box = root.current
      ?.closest('dialog, [data-height-ease]')
      ?.getBoundingClientRect();
    return box ? { height: box.height, width: box.width } : null;
  };
  useLayoutEffect(() => {
    // Dialogs, or an inline container that opts in (a side panel).
    const dialog = root.current?.closest<HTMLElement>(
      'dialog, [data-height-ease]',
    );
    if (!dialog) return;
    const box = dialog.getBoundingClientRect();
    const target = { height: box.height, width: box.width };
    const previous = size.current;
    size.current = target;
    if (previous == null) return;
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches;
    const widthChanged = previous.width !== target.width;
    const frame = (s: { height: number; width: number }) => ({
      height: `${s.height}px`,
      ...(widthChanged ? { width: `${s.width}px` } : {}),
    });
    const animation =
      (previous.height !== target.height || widthChanged) && !reduced
        ? dialog.animate([frame(previous), frame(target)], {
            duration: 300,
            easing: 'cubic-bezier(.22,1,.36,1)',
          })
        : undefined;
    return () => {
      animation?.cancel();
    };
  }, [root, stage]);
  return () => {
    size.current = measure();
  };
}
