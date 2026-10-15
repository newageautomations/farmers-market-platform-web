import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { SignupPasswords } from '../apps/storefront/src/components/SignupPasswords';
import { validPassword, passwordSymbols } from '@market/ui';

describe('password-first signup', () => {
  it('rejects each missing requirement, controls, Unicode whitespace and passwords beyond the native bcrypt bound', () => {
    for (const password of [
      'Short1!',
      'lowercase-password1!',
      'Uppercase-password!',
      'Uppercase1234567',
      'Uppercase1234!\n',
      'Uppercase1234!\u200b',
      'Uppercase1234! ',
      'A1!' + 'a'.repeat(70),
    ])
      expect(validPassword(password)).toBe(false);
    expect(validPassword('A1!' + 'a'.repeat(69))).toBe(true);
    for (const symbol of passwordSymbols)
      expect(validPassword('Uppercase1234' + symbol)).toBe(true);
  });
  it('keeps password policies identical on client and server', () => {
    const normalized = (path: string) =>
      ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          removeComments: true,
        },
      }).outputText;
    expect(normalized('packages/ui/src/password-policy.ts')).toBe(
      normalized(
        '../farmers-market-platform/src/plugins/platform-identity/password-policy.ts',
      ),
    );
  });
  it('requires confirmation, rejects mismatch and supports both visibility toggles', async () => {
    render(
      <form>
        <SignupPasswords />
      </form>,
    );
    const password = screen.getByLabelText('Password') as HTMLInputElement,
      confirm = screen.getByLabelText('Confirm password') as HTMLInputElement;
    expect(confirm.required).toBe(true);
    fireEvent.change(password, { target: { value: 'Uppercase1234!' } });
    fireEvent.change(confirm, { target: { value: 'Uppercase1234?' } });
    await waitFor(() =>
      expect(confirm.validationMessage).toBe('Passwords do not match'),
    );
    fireEvent.change(confirm, { target: { value: 'Uppercase1234!' } });
    expect(confirm.checkValidity()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Show confirmed password' }),
    );
    expect(password.type).toBe('text');
    expect(confirm.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password.type).toBe('password');
  });
  it('clears controlled password state immediately after the request values are captured', () => {
    const { container } = render(
      <form>
        <SignupPasswords />
      </form>,
    );
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Uppercase1234!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Uppercase1234!' },
    });
    fireEvent(container.querySelector('form')!, new Event('account:submitted'));
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Confirm password')).toHaveValue('');
  });
});
