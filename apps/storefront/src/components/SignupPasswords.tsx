import { useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  passwordChecks,
  passwordMaximum,
  validPassword,
} from '@market/ui';
import { inputClassName } from '@market/ui/presentation';

export function SignupPasswords() {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    confirmation = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false),
    [confirmVisible, setConfirmVisible] = useState(false);
  const checks = passwordChecks(password),
    mismatch = !!confirm && password !== confirm;
  useEffect(() => {
    input.current?.setCustomValidity(
      password && !validPassword(password)
        ? 'Use 12 to 72 characters with an uppercase letter, a number and a special character. Use keyboard characters without spaces.'
        : '',
    );
    confirmation.current?.setCustomValidity(
      mismatch ? 'Passwords do not match' : '',
    );
  }, [password, mismatch]);
  useEffect(() => {
    const form = input.current?.form;
    const clear = () => {
      setPassword('');
      setConfirm('');
      setVisible(false);
      setConfirmVisible(false);
    };
    form?.addEventListener('account:submitted', clear);
    return () => form?.removeEventListener('account:submitted', clear);
  }, []);
  return (
    <div className="signup-passwords">
      <label className="field" htmlFor={`${id}-password`}>
        Password
      </label>
      <div className="password-control ui-inline-controls">
        <input
          ref={input}
          className={inputClassName('password')}
          id={`${id}-password`}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={12}
          maxLength={passwordMaximum}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={`${id}-hint ${id}-rules`}
        />
        <Button
          type="button"
          variant="secondary"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
      </div>
      <p id={`${id}-hint`} className="field-help">
        Must be at least 12 characters and contain at least one uppercase
        letter, one number, and one special character.
      </p>
      <ul id={`${id}-rules`} className="password-checklist">
        {(
          [
            ['length', 'At least 12 characters'],
            ['uppercase', 'One uppercase letter'],
            ['number', 'One number'],
            ['symbol', 'One special character'],
          ] as const
        ).map(([key, text]) => (
          <li key={key} data-met={checks[key]}>
            <span aria-hidden="true">{checks[key] ? '✓' : '○'}</span> {text}
            <span className="sr-only">
              {checks[key] ? ': met' : ': needed'}
            </span>
          </li>
        ))}
      </ul>
      <label className="field" htmlFor={`${id}-confirm`}>
        Confirm password
      </label>
      <div className="password-control ui-inline-controls">
        <input
          ref={confirmation}
          className={inputClassName('password')}
          id={`${id}-confirm`}
          name="confirmPassword"
          type={confirmVisible ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={12}
          maxLength={passwordMaximum}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
          aria-describedby={`${id}-match`}
        />
        <Button
          type="button"
          variant="secondary"
          aria-label={
            confirmVisible
              ? 'Hide confirmed password'
              : 'Show confirmed password'
          }
          aria-pressed={confirmVisible}
          onClick={() => setConfirmVisible(!confirmVisible)}
        >
          {confirmVisible ? 'Hide' : 'Show'}
        </Button>
      </div>
      <p id={`${id}-match`} className="field-help" aria-live="polite">
        {mismatch ? 'Passwords do not match' : ''}
      </p>
    </div>
  );
}
