import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PhoneInput, Input, Textarea } from '@market/ui';
import { readFileSync } from 'node:fs';
function Form({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <form>
      <PhoneInput
        label="Contact phone"
        name="phone"
        value={value}
        onChange={setValue}
      />
      <output>{value}</output>
    </form>
  );
}
describe('shared phone input', () => {
  it('defaults to US, selector is left of national field, typing formats and emits E.164', async () => {
    const user = userEvent.setup();
    render(<Form />);
    const country = screen.getByRole('combobox'),
      national = screen.getByLabelText('Contact phone');
    expect(country).toHaveValue('+1');
    expect(
      country.compareDocumentPosition(national) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.type(national, '2105550123');
    expect(national).toHaveValue('(210) 555-0123');
    expect(screen.getByRole('status')).toHaveTextContent('+12105550123');
    expect((national as HTMLInputElement).checkValidity()).toBe(true);
    expect(screen.queryByText(/Include a complete national number/)).toBeNull();
    expect(document.querySelector('input[name="phone"]')).toHaveValue(
      '+12105550123',
    );
  });
  it('formats pasted international E.164 and preserves its country on editing', async () => {
    render(<Form initial="+442079460018" />);
    expect(screen.getByRole('combobox')).toHaveValue('+44');
    expect(screen.getByLabelText('Contact phone')).toHaveValue('020 7946 0018');
    fireEvent.change(screen.getByLabelText('Contact phone'), {
      target: { value: '+12105550123' },
    });
    expect(screen.getByRole('combobox')).toHaveValue('+1');
    expect(screen.getByLabelText('Contact phone')).toHaveValue(
      '(210) 555-0123',
    );
  });
  it('rejects incomplete, overlong, and wrong-country numbers without truncating', async () => {
    render(<Form />);
    const input = screen.getByLabelText('Contact phone') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '21055' } });
    await waitFor(() => expect(input.checkValidity()).toBe(false));
    fireEvent.change(input, { target: { value: '2105550123123456789' } });
    expect(input.value.replace(/\D/g, '')).toBe('21055');
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: '210a5550123' } });
    expect(input.value).not.toContain('a');
    expect(screen.getByRole('status')).not.toHaveTextContent('a');
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: '2105550123' } });
    expect(input.checkValidity()).toBe(true);
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'United Kingdom +44' }));
    expect(input.checkValidity()).toBe(false);
  });
  it('allows optional blank and requires a number when required', () => {
    const { rerender } = render(<PhoneInput label="Phone" />);
    const input = screen.getByLabelText('Phone') as HTMLInputElement;
    expect(input.checkValidity()).toBe(true);
    rerender(<PhoneInput label="Phone" required />);
    expect(input.checkValidity()).toBe(false);
  });
  it('preserves Canada and Australia parsing and rejects misplaced country prefixes', () => {
    render(<Form />);
    const input = screen.getByLabelText('Contact phone') as HTMLInputElement;
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Canada +1' }));
    fireEvent.change(input, { target: { value: '4165550160' } });
    expect(input).toHaveValue('(416) 555-0160');
    expect(input.checkValidity()).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('+14165550160');
    fireEvent.change(input, { target: { value: '416++5550160' } });
    expect(input).not.toHaveValue('416++5550160');
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: '+61412345678' } });
    expect(screen.getByRole('combobox')).toHaveValue('+61');
    expect(input).toHaveValue('0412 345 678');
    expect(input.checkValidity()).toBe(true);
  });
  it('backspace removes digits and permits replacing a middle selection', async () => {
    const user = userEvent.setup();
    render(<Form initial="+12105550123" />);
    const input = screen.getByLabelText('Contact phone') as HTMLInputElement;
    await user.click(input);
    await user.keyboard('{End}{Backspace}');
    expect(input.value.replace(/\D/g, '')).toBe('210555012');
    await user.clear(input);
    await user.type(input, '2105550123');
    input.setSelectionRange(6, 9);
    await user.keyboard('777');
    expect(input.value.replace(/\D/g, '')).toBe('2107770123');
  });
});
describe('field contracts', () => {
  it('limits email, personal names, password and multiline input', () => {
    render(
      <>
        <Input name="email" aria-label="Email" />
        <Input name="firstName" aria-label="Name" />
        <Input type="password" aria-label="Password" />
        <Textarea aria-label="Description" />
      </>,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Email')).toHaveAttribute('maxlength', '254');
    expect(screen.getByLabelText('Name')).toHaveAttribute('maxlength', '100');
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'maxlength',
      '1024',
    );
    expect(screen.getByLabelText('Description')).toHaveAttribute(
      'maxlength',
      '5000',
    );
  });
  it('keeps frontend and backend semantic limits identical', () => {
    const source = readFileSync(
      '../farmers-market-platform/src/plugins/platform-identity/input-validation.ts',
      'utf8',
    );
    const frontend = readFileSync(
      'packages/ui/src/input-validation.ts',
      'utf8',
    );
    expect(
      source
        .match(/export const fieldLimits = ([\s\S]*?) as const/)?.[1]
        ?.replace(/,\s*}/g, '}')
        .replace(/[\s"']/g, ''),
    ).toEqual(
      frontend
        .match(/export const fieldLimits = ([\s\S]*?) as const/)?.[1]
        ?.replace(/,\s*}/g, '}')
        .replace(/[\s"']/g, ''),
    );
  });
});
