/** Uses browser email semantics and the shared phone control's country-aware validity. */
export function checkoutFieldError(
  input: HTMLInputElement | HTMLTextAreaElement,
) {
  if (input.id === 'phoneNumber') return input.validationMessage;
  const value = input.value.trim();
  if (input.maxLength > 0 && input.value.length > input.maxLength)
    return 'This field is too long. Please shorten it.';
  if (input.required && !value)
    return `Enter your ${input.name === 'firstName' ? 'first name.' : input.name === 'lastName' ? 'last name.' : 'email address.'}`;
  if (input instanceof HTMLInputElement && input.type === 'email') {
    input.value = value;
    if (input.validity.typeMismatch) return 'Enter a valid email address.';
  }
  return '';
}
