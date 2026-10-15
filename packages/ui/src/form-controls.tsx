import type { ComponentProps } from 'react';
import { inputContract } from './input-validation';
import { inputClassName } from './presentation';

export const Input = (props: ComponentProps<'input'>) => {
  const attributes = inputContract(props);
  return (
    <input
      {...attributes}
      className={inputClassName(attributes.type, attributes.className)}
    />
  );
};
export const Textarea = (props: ComponentProps<'textarea'>) => (
  <textarea
    maxLength={props.name === 'description' ? 10000 : 5000}
    {...props}
  />
);
