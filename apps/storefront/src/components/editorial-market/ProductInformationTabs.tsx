import { Tabs } from '@market/ui';

export function ProductInformationTabs({
  description,
  fields,
}: {
  description: string;
  fields: readonly { label: string; content: string }[];
}) {
  const items = [
    { label: 'Description', content: description },
    ...fields
      .filter((field) => field.label.trim() && field.content.trim())
      .map((field) => ({ label: field.label, content: field.content })),
  ];

  return (
    <section
      className="em-product-information"
      aria-label="Product information"
      data-editor-section="information"
    >
      <Tabs
        items={items.map((item) => ({
          label: item.label,
          content: (
            <p className="em-product-information-copy">{item.content}</p>
          ),
        }))}
      />
    </section>
  );
}
