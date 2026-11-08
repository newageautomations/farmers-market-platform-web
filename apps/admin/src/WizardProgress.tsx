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
 * Animates the enclosing dialog's height between wizard stages. Call
 * `capture()` immediately before changing stage; the effect then eases from
 * the captured height to the new one (reduced motion jumps directly).
 */
export function useWizardDialogHeight(
  root: RefObject<HTMLElement | null>,
  stage: unknown,
) {
  const height = useRef<number | null>(null);
  useLayoutEffect(() => {
    const dialog = root.current?.closest('dialog');
    if (!dialog) return;
    const target = dialog.getBoundingClientRect().height;
    const previous = height.current;
    height.current = target;
    if (previous == null) return;
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches;
    const animation =
      previous !== target && !reduced
        ? dialog.animate(
            [{ height: `${previous}px` }, { height: `${target}px` }],
            { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' },
          )
        : undefined;
    const previousOverflow = dialog.style.overflow;
    dialog.style.overflow = 'hidden';
    const release = window.setTimeout(() => {
      dialog.style.overflow = previousOverflow;
    }, 450);
    return () => {
      window.clearTimeout(release);
      dialog.style.overflow = previousOverflow;
      animation?.cancel();
    };
  }, [root, stage]);
  return () => {
    height.current =
      root.current?.closest('dialog')?.getBoundingClientRect().height ?? null;
  };
}
