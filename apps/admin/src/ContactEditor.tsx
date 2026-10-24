import { Checkbox, Field, Input, PhoneInput, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import {
  defaultContact,
  contactEntryTypes,
  contactDetails,
  contactTextAdvice,
  contactValueAdvice,
  type ContactConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
const sections = {
  'contact-settings': 'Contact page',
  'contact-intro': 'Introduction',
  'contact-information': 'Public contact information',
  'contact-form': 'Contact form',
  'contact-cta': 'Closing invitation',
} as const;
export function ContactEditor({
  value = defaultContact,
  selected,
  collapsed,
  choose,
  collapse,
  onChange,
  busy,
}: {
  value?: ContactConfig;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  choose: (id: StorefrontEditorSection) => void;
  collapse: () => void;
  onChange: (v: ContactConfig) => void;
  busy: boolean;
}) {
  const patch = (v: Partial<ContactConfig>) => onChange({ ...value, ...v });
  const details = contactDetails(value);
  const setDetail = (
    type: (typeof contactEntryTypes)[number],
    input: string,
  ) => {
    const next = { ...details, [type]: input };
    patch({
      entries: contactEntryTypes
        .filter((type) => next[type].trim())
        .map((type) => ({
          id: `contact-${type}`,
          type,
          value: next[type],
          visible: true,
        })),
    });
  };
  const field = (
    key:
      | 'title'
      | 'heading'
      | 'description'
      | 'informationHeading'
      | 'socialHeading',
    label: string,
    max: number,
    multiline = false,
  ) => (
    <Field
      id={`contact-editor-${key}`}
      label={label}
      error={contactTextAdvice(value[key], max, key !== 'description')}
    >
      {multiline ? (
        <Textarea
          id={`contact-editor-${key}`}
          aria-describedby={
            contactTextAdvice(value[key], max, key !== 'description')
              ? `contact-editor-${key}-error`
              : undefined
          }
          maxLength={-1}
          value={value[key]}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      ) : (
        <Input
          id={`contact-editor-${key}`}
          aria-describedby={
            contactTextAdvice(value[key], max, key !== 'description')
              ? `contact-editor-${key}-error`
              : undefined
          }
          maxLength={-1}
          value={value[key]}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      )}
    </Field>
  );
  return (
    <fieldset disabled={busy} className="contact-editor">
      {Object.entries(sections).map(([key, label]) => {
        const id = key as keyof typeof sections;
        return (
          <details
            key={id}
            className={disclosureClassName('visual-editor-group')}
            open={!collapsed && selected === id}
          >
            <summary
              role="button"
              aria-expanded={!collapsed && selected === id}
              onClick={(e) => {
                e.preventDefault();
                if (!collapsed && selected === id) collapse();
                else choose(id);
              }}
            >
              {label}
            </summary>
            {!collapsed && selected === id && (
              <div className="ui-disclosure-content">
                {id === 'contact-settings' && (
                  <>
                    <label>
                      <Checkbox
                        checked={value.enabled}
                        onChange={(e) => patch({ enabled: e.target.checked })}
                      />{' '}
                      Enable Contact page
                    </label>
                    {field('title', 'Page title', 160)}
                  </>
                )}
                {id === 'contact-intro' && (
                  <>
                    {field('heading', 'Heading', 160)}
                    {field('description', 'Description', 600, true)}
                  </>
                )}
                {id === 'contact-form' && (
                  <p>
                    The form requires a full name, email, subject and message.
                    Phone and order reference are optional. Customers contact
                    you through this form; you respond outside the platform.
                    Preview never sends a message.
                  </p>
                )}
                {id === 'contact-information' && (
                  <>
                    <p>
                      Leave a field blank to omit it from your public Contact
                      page. Only enter an address you want customers to see.
                    </p>
                    {contactEntryTypes.map((type) =>
                      type === 'phone' ? (
                        <PhoneInput
                          key={type}
                          id="contact-public-phone"
                          label="Phone"
                          value={details.phone}
                          onChange={(input) => setDetail('phone', input)}
                          validationMode="immediate"
                          advisory
                        />
                      ) : (
                        <Field
                          key={type}
                          id={`contact-public-${type}`}
                          error={contactValueAdvice(type, details[type])}
                          label={
                            {
                              email: 'Email',
                              address: 'Address',
                              facebook: 'Facebook',
                              instagram: 'Instagram',
                            }[type]
                          }
                        >
                          <Input
                            id={`contact-public-${type}`}
                            aria-describedby={
                              contactValueAdvice(type, details[type])
                                ? `contact-public-${type}-error`
                                : undefined
                            }
                            type={
                              type === 'email'
                                ? 'email'
                                : type === 'address'
                                  ? 'text'
                                  : 'url'
                            }
                            maxLength={-1}
                            value={details[type]}
                            onChange={(event) =>
                              setDetail(type, event.target.value)
                            }
                          />
                        </Field>
                      ),
                    )}
                  </>
                )}
                {id === 'contact-cta' && (
                  <>
                    {(['heading', 'text', 'label'] as const).map((key) => (
                      <Field
                        key={key}
                        id={`contact-cta-${key}`}
                        error={contactTextAdvice(
                          value.cta[key],
                          key === 'heading' ? 160 : key === 'text' ? 600 : 80,
                          key !== 'text',
                        )}
                        label={
                          {
                            heading: 'Heading',
                            text: 'Supporting text',
                            label: 'Button label',
                          }[key]
                        }
                      >
                        <Input
                          id={`contact-cta-${key}`}
                          aria-describedby={
                            contactTextAdvice(
                              value.cta[key],
                              key === 'heading'
                                ? 160
                                : key === 'text'
                                  ? 600
                                  : 80,
                              key !== 'text',
                            )
                              ? `contact-cta-${key}-error`
                              : undefined
                          }
                          maxLength={-1}
                          value={value.cta[key]}
                          onChange={(e) =>
                            patch({
                              cta: { ...value.cta, [key]: e.target.value },
                            })
                          }
                        />
                      </Field>
                    ))}
                    <p>
                      Links to your Find Us page. The invitation appears when
                      Find Us is enabled.
                    </p>
                  </>
                )}
              </div>
            )}
          </details>
        );
      })}
    </fieldset>
  );
}
