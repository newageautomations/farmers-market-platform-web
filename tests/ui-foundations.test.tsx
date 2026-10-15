import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Button,
  buttonClassName,
  Card,
  Field,
  Input,
  SelectField,
} from '@market/ui';
import {
  Choice,
  SelectField as MarketSelectField,
} from '../apps/admin/src/market/common';
import {
  AnimatedDisclosure,
  SearchSelect,
} from '../apps/admin/src/market/presentation';
import { useState } from 'react';

describe('BTN-01 native behavior', () => {
  it('keeps the safe default, explicit submit identity and FormData', async () => {
    const user = userEvent.setup();
    const submitted = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement;
          submitted(new FormData(event.currentTarget, submitter), submitter);
        }}
      >
        <input name="q" defaultValue="tomatoes" />
        <Button>Local action</Button>
        <Button type="submit" name="intent" value="search">
          Search
        </Button>
        <Button type="submit" disabled name="intent" value="disabled">
          Disabled
        </Button>
        <Button type="submit" loading name="intent" value="loading">
          Working
        </Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Local action' }));
    expect(submitted).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    await user.click(screen.getByRole('button', { name: 'Working' }));
    expect(submitted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Working' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(submitted).toHaveBeenCalledOnce();
    const [data, submitter] = submitted.mock.calls[0]!;
    expect(Object.fromEntries(data)).toEqual({
      q: 'tomatoes',
      intent: 'search',
    });
    expect(submitter).toBe(screen.getByRole('button', { name: 'Search' }));
  });

  it('preserves required validation and keyboard activation', async () => {
    const user = userEvent.setup();
    const submitted = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted();
        }}
      >
        <input name="email" type="email" required aria-label="Email" />
        <Button type="submit">Sign in</Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(submitted).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.test' },
    });
    screen.getByRole('button', { name: 'Sign in' }).focus();
    await user.keyboard('{Enter}');
    expect(submitted).toHaveBeenCalledOnce();
  });

  it('retains real navigation links and backward compatible variants', () => {
    render(
      <>
        <a
          href="/products?q=pears"
          className={buttonClassName({ variant: 'secondary' })}
        >
          Products
        </a>
        <Button className="secondary">Legacy alternate</Button>
        <Button variant="destructive">Archive</Button>
        <Button variant="secondary" size="compact" iconOnly aria-label="Close">
          ×
        </Button>
      </>,
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/products?q=pears',
    );
    expect(screen.getByRole('link')).not.toHaveAttribute('role');
    expect(
      screen.getByRole('button', { name: 'Legacy alternate' }),
    ).toHaveClass('secondary');
    expect(screen.getByRole('button', { name: 'Archive' })).toHaveClass(
      'button-destructive',
    );
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass(
      'button-icon',
      'button-compact',
    );
  });
});

describe('CRD-02 semantics and retained CRD-04 disclosure', () => {
  it('preserves semantic native attributes and fieldset disabling', () => {
    render(
      <>
        <Card as="article" aria-label="Article">
          <p>Content</p>
        </Card>
        <Card as="section" aria-label="Section">
          <p>Section content</p>
        </Card>
        <ul>
          <Card as="li" spacing="contained">
            List item
          </Card>
        </ul>
        <Card as="fieldset" disabled surface="embedded">
          <legend>Disabled card</legend>
          <Input aria-label="Locked field" />
        </Card>
        <Card padding="none" data-testid="flush">
          Media
        </Card>
      </>,
    );
    expect(screen.getByRole('article', { name: 'Article' }).tagName).toBe(
      'ARTICLE',
    );
    expect(screen.getByRole('region', { name: 'Section' }).tagName).toBe(
      'SECTION',
    );
    expect(screen.getByRole('listitem')).toHaveClass('ui-card-contained');
    expect(screen.getByLabelText('Locked field')).toBeDisabled();
    expect(screen.getByTestId('flush')).toHaveClass('ui-card-flush');
  });

  it('keeps separate saved-layout actions, lazy mount, inertness and keyboard expansion', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <AnimatedDisclosure
        title="Saved layouts"
        className="saved-layouts-card"
        action={<Button onClick={action}>Create layout</Button>}
      >
        <p>Saved content</p>
      </AnimatedDisclosure>,
    );
    const toggle = screen.getByRole('button', { name: 'Saved layouts' });
    expect(toggle).toHaveClass('ui-button', 'button-disclosure');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(screen.queryByText('Saved content')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create layout' }));
    expect(action).toHaveBeenCalledOnce();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const content = document.getElementById(
      toggle.getAttribute('aria-controls')!,
    )!;
    expect(content).not.toHaveAttribute('inert');
    expect(screen.getByText('Saved content')).toBeInTheDocument();
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveAttribute('inert');
    expect(screen.getByText('Saved content')).toBeInTheDocument();
  });
});

describe('SEL-03 ordinary selects and retained specialists', () => {
  it('preserves optional/required defaults, errors, native values and FormData', () => {
    render(
      <form aria-label="Selection form">
        <SelectField label="Optional" name="optional" defaultValue="">
          <option value="">None</option>
          <option value="api-id">Business</option>
        </SelectField>
        <MarketSelectField label="Required" name="required">
          <option value="">Choose</option>
          <option value="12">Market</option>
        </MarketSelectField>
        <MarketSelectField
          label="Optional market"
          name="market"
          required={false}
        >
          <option value="">None</option>
        </MarketSelectField>
        <SelectField
          label="Invalid"
          name="invalid"
          error="Choose a real value"
          aria-describedby="hint"
        >
          <option value="bad">Bad</option>
        </SelectField>
        <p id="hint">Existing hint</p>
      </form>,
    );
    const optional = screen.getByLabelText('Optional') as HTMLSelectElement;
    expect(optional.checkValidity()).toBe(true);
    expect(
      (screen.getByLabelText('Required') as HTMLSelectElement).checkValidity(),
    ).toBe(false);
    expect(screen.getByLabelText('Optional market')).not.toBeRequired();
    expect(screen.getByLabelText('Invalid')).toHaveAccessibleDescription(
      'Existing hint Choose a real value',
    );
    fireEvent.change(optional, { target: { value: 'api-id' } });
    expect(new FormData(optional.form!).get('optional')).toBe('api-id');
  });

  it('keeps controlled selection and the SEL-02 feature-owned status colors/values', () => {
    function Controlled() {
      const [value, setValue] = useState('A');
      return (
        <SelectField
          label="Controlled select"
          name="value"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="A">First</option>
          <option value="B">Second</option>
        </SelectField>
      );
    }
    render(
      <>
        <Controlled />
        <Choice
          name="status"
          label="Status"
          value="ACTIVE"
          choices={['ACTIVE', 'SUSPENDED']}
        />
      </>,
    );
    fireEvent.change(screen.getByLabelText('Controlled select'), {
      target: { value: 'B' },
    });
    expect(screen.getByLabelText('Controlled select')).toHaveValue('B');
    const status = screen.getByLabelText('Status');
    expect(status).toHaveClass('market-status-success');
    expect(status).not.toHaveClass('ui-select');
    fireEvent.change(status, { target: { value: 'SUSPENDED' } });
    expect(status).toHaveValue('SUSPENDED');
    expect(status).toHaveClass('market-status-danger');
  });

  it('excludes the SEL-07 instruction from options and preserves filtering, keyboard selection, Escape and clear', async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    function Businesses() {
      const [value, setValue] = useState('');
      return (
        <SearchSelect
          label="Business"
          value={value}
          placeholder="Choose a business"
          allowClear
          onChange={(next) => {
            setValue(next);
            changed(next);
          }}
          options={[
            { value: '11', label: 'Apple farm' },
            { value: '22', label: 'Berry farm' },
          ]}
        />
      );
    }
    render(<Businesses />);
    const input = screen.getByRole('combobox');
    const chevron = input.nextElementSibling!;
    expect(chevron.tagName.toLowerCase()).toBe('svg');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    expect(chevron).toHaveAttribute('fill', 'none');
    expect(chevron.querySelector('path')).toHaveAttribute('d', 'm4 6 4 4 4-4');
    await user.click(input);
    expect(
      screen.queryByRole('option', { name: 'Choose a business' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.keyboard('{ArrowDown}');
    const active = document.getElementById(
      input.getAttribute('aria-activedescendant')!,
    );
    expect(active).toHaveTextContent('Apple farm');
    expect(active).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{Enter}');
    expect(changed).toHaveBeenLastCalledWith('11');
    await user.clear(input);
    await user.type(input, 'Berry');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Apple farm');
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(changed).toHaveBeenLastCalledWith('');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
  });

  it('does not commit a custom option inside a disabled native fieldset', () => {
    const change = vi.fn();
    const { rerender } = render(
      <fieldset>
        <SearchSelect
          label="Business"
          value=""
          placeholder="Choose"
          onChange={change}
          options={[{ value: '11', label: 'Farm' }]}
        />
      </fieldset>,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    rerender(
      <fieldset disabled>
        <SearchSelect
          label="Business"
          value=""
          placeholder="Choose"
          onChange={change}
          options={[{ value: '11', label: 'Farm' }]}
        />
      </fieldset>,
    );
    fireEvent.click(screen.getByRole('option', { name: 'Farm' }));
    expect(change).not.toHaveBeenCalled();
  });
});

describe('INP-02 preserves INP-01 behavior', () => {
  it('keeps native limits, required validation, autofill, errors and serialization', () => {
    render(
      <form aria-label="Profile">
        <Field id="email" label="Email" error="Enter a valid email">
          <Input
            id="email"
            name="email"
            required
            autoComplete="email"
            aria-invalid
            aria-describedby="email-error"
          />
        </Field>
        <Input
          aria-label="Reference"
          name="reference"
          minLength={2}
          maxLength={9}
          pattern="[A-Z]+"
          defaultValue="ABC"
        />
        <Input
          type="checkbox"
          name="consent"
          defaultChecked
          aria-label="Consent"
        />
      </form>,
    );
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email.type).toBe('email');
    expect(email.maxLength).toBe(254);
    expect(email.checkValidity()).toBe(false);
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toHaveAccessibleDescription('Enter a valid email');
    const reference = screen.getByLabelText('Reference') as HTMLInputElement;
    expect(reference.minLength).toBe(2);
    expect(reference.maxLength).toBe(9);
    expect(reference.pattern).toBe('[A-Z]+');
    expect(new FormData(email.form!).get('reference')).toBe('ABC');
    expect(screen.getByLabelText('Consent')).not.toHaveClass('ui-input');
  });

  it('retains both controlled state and uncontrolled defaults', async () => {
    const user = userEvent.setup();
    function Fields() {
      const [value, setValue] = useState('Initial');
      return (
        <>
          <Input
            aria-label="Controlled"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Input aria-label="Uncontrolled" defaultValue="Default" />
        </>
      );
    }
    render(<Fields />);
    await user.clear(screen.getByLabelText('Controlled'));
    await user.type(screen.getByLabelText('Controlled'), 'Changed');
    await user.type(screen.getByLabelText('Uncontrolled'), ' plus');
    expect(screen.getByLabelText('Controlled')).toHaveValue('Changed');
    expect(screen.getByLabelText('Uncontrolled')).toHaveValue('Default plus');
  });

  it('retains the actual six-digit OTP controller for paste, navigation and aggregation', async () => {
    render(
      <form data-otp-form>
        <input type="hidden" name="code" defaultValue="" />
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            data-otp-digit
            aria-label={`Digit ${index + 1}`}
            name={`digit${index + 1}`}
            pattern="[0-9]"
            required
            maxLength={index === 0 ? 6 : 1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
          />
        ))}
      </form>,
    );
    const controller = '../apps/storefront/src/lib/phone-verification';
    await import(controller);
    const first = screen.getByLabelText('Digit 1') as HTMLInputElement;
    fireEvent.paste(first, { clipboardData: { getData: () => '123 456' } });
    expect(new FormData(first.form!).get('code')).toBe('123456');
    expect(screen.getByLabelText('Digit 6')).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText('Digit 6'), { key: 'ArrowLeft' });
    expect(screen.getByLabelText('Digit 5')).toHaveFocus();
    fireEvent.input(screen.getByLabelText('Digit 5'), {
      target: { value: '' },
    });
    fireEvent.keyDown(screen.getByLabelText('Digit 5'), { key: 'Backspace' });
    expect(screen.getByLabelText('Digit 4')).toHaveFocus();
    fireEvent.input(first, { target: { value: '7' } });
    expect(screen.getByLabelText('Digit 2')).toHaveFocus();
    expect(new FormData(first.form!).get('code')).toBe('72346');
    expect(first).toHaveAttribute('autocomplete', 'one-time-code');
    expect(first.form!.checkValidity()).toBe(false);
  });
});
