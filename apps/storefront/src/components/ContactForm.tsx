import { useContactForm, contactFieldError } from '../lib/use-contact-form';
export { contactFieldError } from '../lib/use-contact-form';
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
  const {
    subject,
    setSubject,
    phone,
    setPhone,
    errors,
    setErrors,
    busy,
    sent,
    failure,
    attempted,
    props,
    submit,
  } = useContactForm({ preview, initial });
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
    <form noValidate aria-label="Contact the vendor" onSubmit={submit}>
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
