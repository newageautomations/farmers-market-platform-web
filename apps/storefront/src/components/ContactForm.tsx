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
import {
  contactSubjects,
  type ContactFormField,
} from '@market/theme/storefront';
export function ContactForm({
  preview = false,
  initial,
  fields,
  recipient = 'vendor',
}: {
  preview?: boolean;
  /** Market websites: the manager's configured fields, in order. */
  fields?: readonly ContactFormField[];
  recipient?: 'vendor' | 'market';
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
  } = useContactForm({ preview, initial, configured: !!fields });
  const label = (field: ContactFormField) =>
    `${field.label} (${field.required ? 'required' : 'optional'})`;
  const configuredField = (field: ContactFormField) => {
    const id = `contact-${field.type === 'name' ? 'name' : field.type}`;
    switch (field.type) {
      case 'name':
        return (
          <Field key={field.id} id={id} label={label(field)} error={errors[id]}>
            <Input
              {...props(id)}
              name="fullName"
              required
              maxLength={100}
              autoComplete="name"
              defaultValue={
                initial ? `${initial.firstName} ${initial.lastName}`.trim() : ''
              }
            />
          </Field>
        );
      case 'email':
        return (
          <Field key={field.id} id={id} label={label(field)} error={errors[id]}>
            <Input
              {...props(id)}
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              defaultValue={initial?.emailAddress ?? ''}
            />
          </Field>
        );
      case 'phone':
        return (
          <PhoneInput
            key={field.id}
            id={id}
            name="phone"
            label={label(field)}
            required={field.required}
            value={phone}
            onChange={setPhone}
            validationMode="blur"
            showValidation={attempted}
          />
        );
      case 'subject':
        return (
          <SelectField
            key={field.id}
            id={id}
            name="subject"
            label={label(field)}
            required={field.required}
            data-configured="true"
            value={subject}
            error={errors[id]}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={(e) =>
              setErrors((v) => ({ ...v, [id]: contactFieldError(e.target) }))
            }
          >
            <option value="">Choose a subject</option>
            {field.options?.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
        );
      case 'message':
        return (
          <Field key={field.id} id={id} label={label(field)} error={errors[id]}>
            <Textarea
              {...props(id)}
              name="message"
              required
              maxLength={5000}
              rows={8}
            />
          </Field>
        );
      case 'select': {
        const custom = `contact-field-${field.id}`;
        return (
          <SelectField
            key={field.id}
            id={custom}
            name={`answer:${field.id}`}
            label={label(field)}
            required={field.required}
            data-configured="true"
            defaultValue=""
            error={errors[custom]}
            onBlur={(e) =>
              setErrors((v) => ({
                ...v,
                [custom]: contactFieldError(e.target),
              }))
            }
          >
            <option value="">Choose an option</option>
            {field.options?.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
        );
      }
      default: {
        const custom = `contact-field-${field.id}`;
        return (
          <Field
            key={field.id}
            id={custom}
            label={label(field)}
            error={errors[custom]}
          >
            {field.type === 'textarea' ? (
              <Textarea
                {...props(custom)}
                name={`answer:${field.id}`}
                required={field.required}
                maxLength={2000}
                rows={4}
              />
            ) : (
              <Input
                {...props(custom)}
                name={`answer:${field.id}`}
                required={field.required}
                maxLength={300}
              />
            )}
          </Field>
        );
      }
    }
  };
  if (sent)
    return (
      <div className="contact-success" role="status">
        <span className="contact-success-mark" aria-hidden="true">
          <UtilityIcon name="check" />
        </span>
        <h2>Thank you for getting in touch.</h2>
        <p>
          Your message has been received. The {recipient} can contact you using
          the details you provided.
        </p>
      </div>
    );
  return (
    <form noValidate aria-label={`Contact the ${recipient}`} onSubmit={submit}>
      <fieldset
        disabled={busy || preview}
        className={`contact-fields${fields ? ' contact-fields-configured' : ''}`}
      >
        {fields ? (
          fields.map((field) => (
            // Two columns on wide screens; long answers span both.
            <div
              key={field.id}
              className="contact-form-item"
              data-wide={
                field.type === 'message' || field.type === 'textarea'
                  ? ''
                  : undefined
              }
            >
              {configuredField(field)}
            </div>
          ))
        ) : (
          <>
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
                  initial
                    ? `${initial.firstName} ${initial.lastName}`.trim()
                    : ''
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
          </>
        )}
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
