import { WebsiteInspectorContent } from './WebsiteEditorContext';
import {
  Badge,
  Button,
  Checkbox,
  Field,
  Input,
  PhoneInput,
  SelectField,
  Textarea,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import { WebsiteRailList } from './WebsiteRailList';
import {
  defaultContact,
  contactEntryTypes,
  contactDetails,
  contactFormFields,
  contactFieldLimit,
  contactFieldOptionLimit,
  contactRequiredFieldTypes,
  contactTextAdvice,
  contactValueAdvice,
  type ContactConfig,
  type ContactFormField,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
const fieldTypeLabels: Record<ContactFormField['type'], string> = {
  name: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
  subject: 'Subject',
  message: 'Message',
  text: 'Short answer',
  textarea: 'Long answer',
  select: 'Dropdown',
};
const customFieldTypes = ['text', 'textarea', 'select'] as const;
const sections = {
  'contact-settings': 'Contact page',
  'contact-intro': 'Introduction',
  'contact-information': 'Public contact information',
  'contact-form': 'Contact form',
  'contact-cta': 'Closing invitation',
} as const;
export function ContactEditor({
  onlyClosing = false,
  hideClosing = false,
  sectionHero = false,
  value = defaultContact,
  selected,
  collapsed,
  choose,
  collapse,
  onChange,
  busy,
  formAvailable = true,
  editableForm = false,
}: {
  /** Market websites have no contact inbox, so they show contact information only. */
  formAvailable?: boolean;
  /** Market themes with an inquiry form: managers add, remove and reorder its fields. */
  editableForm?: boolean;
  value?: ContactConfig;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  choose: (id: StorefrontEditorSection) => void;
  collapse: () => void;
  onChange: (v: ContactConfig) => void;
  sectionHero?: boolean;
  onlyClosing?: boolean;
  hideClosing?: boolean;
  busy: boolean;
}) {
  const patch = (v: Partial<ContactConfig>) => onChange({ ...value, ...v });
  const details = contactDetails(value);
  // Nudge only when every public detail is blank.
  const informationEmpty = !contactEntryTypes.some((type) =>
    details[type].trim(),
  );
  const formFields = contactFormFields(value);
  const setFields = (fields: ContactFormField[]) => patch({ form: { fields } });
  const selectedField =
    !collapsed && selected.startsWith('contact-field:')
      ? formFields.find((f) => `contact-field:${f.id}` === selected)
      : undefined;
  const updateField = (id: string, next: Partial<ContactFormField>) =>
    setFields(formFields.map((f) => (f.id === id ? { ...f, ...next } : f)));
  const essential = (field: ContactFormField) =>
    (contactRequiredFieldTypes as readonly string[]).includes(field.type);
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
      {Object.entries(sections)
        .filter(([key]) =>
          onlyClosing
            ? key === 'contact-cta'
            : !hideClosing || key !== 'contact-cta',
        )
        .filter(
          ([key]) =>
            !sectionHero ||
            !['contact-intro', 'contact-settings'].includes(key),
        )
        .filter(([key]) => formAvailable || key !== 'contact-form')
        .map(([key, label]) => {
          const id = key as keyof typeof sections;
          const open =
            !collapsed &&
            (selected === id ||
              (id === 'contact-form' && editableForm && !!selectedField));
          return (
            <details
              key={id}
              className={disclosureClassName('visual-editor-group')}
              data-expandable={
                (id === 'contact-form' && editableForm) || undefined
              }
              open={open}
            >
              <summary
                role="button"
                aria-expanded={open}
                onClick={(e) => {
                  e.preventDefault();
                  if (open) collapse();
                  else choose(id);
                }}
              >
                {label}
                {id === 'contact-information' && informationEmpty && (
                  <Badge tone="warning" className="contact-editor-needed">
                    Add details
                  </Badge>
                )}
              </summary>
              {id === 'contact-form' && editableForm && open && (
                <WebsiteRailList
                  items={formFields}
                  label="Form fields"
                  noun="field"
                  itemAttribute="data-contact-field"
                  itemLabel={(f) =>
                    `${f.label}${f.required ? '' : ' (optional)'}`
                  }
                  selectedId={selectedField?.id}
                  busy={busy}
                  onSelect={(f) => choose(`contact-field:${f.id}`)}
                  onReorder={setFields}
                  addLabel="Add Field"
                  addDisabled={formFields.length >= contactFieldLimit}
                  onAdd={() => {
                    const id = `field-${crypto.randomUUID().slice(0, 8)}`;
                    setFields([
                      ...formFields,
                      {
                        id,
                        type: 'text',
                        label: 'New question',
                        required: false,
                      },
                    ]);
                    choose(`contact-field:${id}`);
                  }}
                />
              )}
              {open && (
                <WebsiteInspectorContent>
                  {id === 'contact-settings' && (
                    <>{field('title', 'Page title', 160)}</>
                  )}
                  {id === 'contact-intro' && (
                    <>
                      {field('heading', 'Heading', 160)}
                      {field('description', 'Description', 600, true)}
                    </>
                  )}
                  {id === 'contact-form' && !editableForm && (
                    <p className="website-inspector-empty">
                      No settings for this section.
                    </p>
                  )}
                  {id === 'contact-form' && editableForm && !selectedField && (
                    <p className="website-inspector-empty">
                      Messages sent through this form arrive in your
                      notifications. Select a field to edit it, drag fields to
                      reorder them, or add your own questions. Name, email and
                      message are always included.
                    </p>
                  )}
                  {id === 'contact-form' &&
                    editableForm &&
                    selectedField &&
                    (() => {
                      const f = selectedField;
                      const optionsField =
                        f.type === 'select' || f.type === 'subject';
                      return (
                        <>
                          <Field
                            id={`contact-field-label-${f.id}`}
                            label="Label"
                          >
                            <Input
                              id={`contact-field-label-${f.id}`}
                              maxLength={80}
                              value={f.label}
                              onChange={(e) =>
                                updateField(f.id, { label: e.target.value })
                              }
                            />
                          </Field>
                          {(customFieldTypes as readonly string[]).includes(
                            f.type,
                          ) ? (
                            <SelectField
                              id={`contact-field-type-${f.id}`}
                              label="Answer type"
                              value={f.type}
                              onChange={(e) => {
                                const type = e.target
                                  .value as ContactFormField['type'];
                                updateField(f.id, {
                                  type,
                                  options:
                                    type === 'select'
                                      ? (f.options ?? ['Option 1'])
                                      : undefined,
                                });
                              }}
                            >
                              {customFieldTypes.map((type) => (
                                <option key={type} value={type}>
                                  {fieldTypeLabels[type]}
                                </option>
                              ))}
                            </SelectField>
                          ) : (
                            <p className="website-inspector-empty">
                              {fieldTypeLabels[f.type]} field
                            </p>
                          )}
                          {optionsField && (
                            <Field
                              id={`contact-field-options-${f.id}`}
                              label="Choices (one per line)"
                              error={
                                (f.options?.length ?? 0) >
                                contactFieldOptionLimit
                                  ? `Use up to ${contactFieldOptionLimit} choices.`
                                  : !f.options?.length
                                    ? 'Add at least one choice.'
                                    : undefined
                              }
                            >
                              <Textarea
                                id={`contact-field-options-${f.id}`}
                                rows={5}
                                value={(f.options ?? []).join('\n')}
                                onChange={(e) =>
                                  updateField(f.id, {
                                    options: e.target.value
                                      .split('\n')
                                      .map((line) => line.slice(0, 80))
                                      .filter(
                                        (line, index, all) =>
                                          line.trim() ||
                                          index === all.length - 1,
                                      ),
                                  })
                                }
                                onBlur={() =>
                                  updateField(f.id, {
                                    options: (f.options ?? [])
                                      .map((line) => line.trim())
                                      .filter(Boolean),
                                  })
                                }
                              />
                            </Field>
                          )}
                          <label
                            className="story-page-toggle"
                            htmlFor={`contact-field-required-${f.id}`}
                          >
                            <Checkbox
                              id={`contact-field-required-${f.id}`}
                              role="switch"
                              className="sr-only"
                              aria-label="Required"
                              checked={f.required}
                              disabled={essential(f)}
                              onChange={(e) =>
                                updateField(f.id, {
                                  required: e.target.checked,
                                })
                              }
                            />
                            <span
                              className="story-switch-track"
                              aria-hidden="true"
                            />
                            <span>Required</span>
                          </label>
                          {essential(f) ? (
                            <p className="website-inspector-empty">
                              This field is always included so you can reply.
                            </p>
                          ) : (
                            <div className="ui-actions">
                              <Button
                                variant="destructive-outline"
                                onClick={() => {
                                  setFields(
                                    formFields.filter((x) => x.id !== f.id),
                                  );
                                  choose('contact-form');
                                }}
                              >
                                Remove field
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  {id === 'contact-information' && (
                    <>
                      {informationEmpty && (
                        <p className="website-inspector-empty">
                          Add at least one way for visitors to reach you. Only
                          the details you fill in are shown.
                        </p>
                      )}
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
                    </>
                  )}
                </WebsiteInspectorContent>
              )}
            </details>
          );
        })}
    </fieldset>
  );
}
