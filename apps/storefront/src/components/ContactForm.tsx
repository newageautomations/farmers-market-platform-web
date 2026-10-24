import { useRef, useState, type ClipboardEvent } from 'react';
import {
  Button,
  Field,
  Input,
  Textarea,
  SelectField,
  PhoneInput,
  Alert,
  UtilityIcon,
} from '@market/ui';
import { contactSubjects } from '@market/theme/storefront';
import type { ContactSubmissionInput } from '@market/api';
export function contactFieldError(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
) {
  if (input.id === 'contact-phone') return input.validationMessage;
  if (
    'maxLength' in input &&
    input.maxLength > 0 &&
    input.value.length > input.maxLength
  )
    return 'This field is too long. Please shorten it.';
  if (input.required && !input.value.trim())
    return 'Please complete this field.';
  if (
    input instanceof HTMLInputElement &&
    input.type === 'email' &&
    input.validity.typeMismatch
  )
    return 'Enter a valid email address.';
  if (
    input.name === 'subject' &&
    !(contactSubjects as readonly string[]).includes(input.value)
  )
    return 'Choose a subject.';
  return '';
}
export function ContactForm({
  preview = false,
  initial,
}: {
  preview?: boolean;
  initial?: {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string | null;
  } | null;
}) {
  const [subject, setSubject] = useState(''),
    [phone, setPhone] = useState(initial?.phoneNumber ?? ''),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [failure, setFailure] = useState(''),
    [attempted, setAttempted] = useState(false);
  const lock = useRef(false),
    attempt = useRef<{ payload: string; key: string } | undefined>(undefined);
  function paste(e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const input = e.currentTarget,
      text = e.clipboardData.getData('text');
    if (
      input.maxLength > 0 &&
      input.value.length -
        (input.selectionEnd ?? 0) +
        (input.selectionStart ?? 0) +
        text.length >
        input.maxLength
    ) {
      e.preventDefault();
      setErrors((v) => ({
        ...v,
        [input.id]: `Your pasted text exceeds the ${input.maxLength} character limit. Shorten it and try again.`,
      }));
    }
  }
  const props = (id: string) => ({
    id,
    'aria-invalid': !!errors[id],
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setErrors((v) => ({ ...v, [id]: contactFieldError(e.target) })),
    onPaste: paste,
  });
  if (sent)
    return (
      <div className="contact-success" role="status">
        <span className="contact-success-mark" aria-hidden="true">
          <UtilityIcon name="check" />
        </span>
        <h2>Thank you for getting in touch.</h2>
        <p>
          Your message has been received. The vendor can contact you using the
          details you provided.
        </p>
      </div>
    );
  return (
    <form
      noValidate
      aria-label="Contact the vendor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preview || lock.current) return;
        const form = e.currentTarget;
        const fields = Array.from(
          form.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >('input:not([type=hidden]), textarea, select'),
        ).filter((i) => !i.disabled);
        const next = Object.fromEntries(
          fields.map((i) => [i.id, contactFieldError(i)]),
        );
        setAttempted(true);
        setErrors(next);
        const first = fields.find((i) => next[i.id]);
        if (first) {
          first.focus();
          return;
        }
        const data = new FormData(form),
          values = {
            fullName: String(data.get('fullName') ?? '').trim(),
            email: String(data.get('email') ?? '').trim(),
            phone,
            subject,
            message: String(data.get('message') ?? '').trim(),
            orderNumber:
              subject === 'Existing Order'
                ? String(data.get('orderNumber') ?? '').trim()
                : '',
          };
        const payload = JSON.stringify(values);
        if (!attempt.current || attempt.current.payload !== payload)
          attempt.current = { payload, key: crypto.randomUUID() };
        const input: ContactSubmissionInput = {
          ...values,
          idempotencyKey: attempt.current.key,
        };
        lock.current = true;
        setBusy(true);
        setFailure('');
        try {
          const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!response.ok || (await response.json()).accepted !== true)
            throw new Error();
          setSent(true);
        } catch {
          setFailure(
            'We could not accept your message. Check your details and try again. If you have sent several messages, please wait an hour before retrying.',
          );
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || preview} className="contact-fields">
        <Field
          id="contact-name"
          label="Full name (required)"
          error={errors['contact-name']}
        >
          <Input
            {...props('contact-name')}
            name="fullName"
            required
            maxLength={100}
            autoComplete="name"
            defaultValue={
              initial ? `${initial.firstName} ${initial.lastName}`.trim() : ''
            }
          />
        </Field>
        <Field
          id="contact-email"
          label="Email address (required)"
          error={errors['contact-email']}
        >
          <Input
            {...props('contact-email')}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            defaultValue={initial?.emailAddress ?? ''}
          />
        </Field>
        <PhoneInput
          id="contact-phone"
          name="phone"
          label="Phone number (optional)"
          value={phone}
          onChange={setPhone}
          validationMode="blur"
          showValidation={attempted}
        />
        <SelectField
          id="contact-subject"
          name="subject"
          label="Subject (required)"
          required
          value={subject}
          error={errors['contact-subject']}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={(e) =>
            setErrors((v) => ({
              ...v,
              'contact-subject': contactFieldError(e.target),
            }))
          }
        >
          <option value="">Choose a subject</option>
          {contactSubjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
        {subject === 'Existing Order' && (
          <Field
            id="contact-order"
            label="Order number (optional)"
            error={errors['contact-order']}
          >
            <Input
              {...props('contact-order')}
              name="orderNumber"
              maxLength={80}
              autoComplete="off"
            />
          </Field>
        )}
        <Field
          id="contact-message"
          label="Message (required)"
          error={errors['contact-message']}
        >
          <Textarea
            {...props('contact-message')}
            name="message"
            required
            maxLength={5000}
            rows={8}
          />
        </Field>
      </fieldset>
      {failure && <Alert severity="error">{failure}</Alert>}
      {preview && (
        <p>Preview only. Sending messages is disabled in the editor.</p>
      )}
      <Button type="submit" loading={busy} disabled={preview}>
        {busy ? 'Sending message…' : 'Send Message'}
      </Button>
    </form>
  );
}
