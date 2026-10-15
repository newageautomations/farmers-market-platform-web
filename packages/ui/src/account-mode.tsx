import { Select } from './index';

export interface AccountModeChoice {
  value: string;
  label: string;
  href?: string;
}

/** Shared selector presentation. Callers supply verified choices and own authority. */
export function AccountModeSelect({
  id = 'account-mode',
  value,
  choices,
  onSelect,
}: {
  id?: string;
  value: string;
  choices: readonly AccountModeChoice[];
  onSelect?: (value: string) => void;
}) {
  return (
    <>
      <label htmlFor={id}>Account mode</label>
      <Select
        id={id}
        value={value}
        onChange={(event) => {
          const choice = choices.find(
            (item) => item.value === event.target.value,
          );
          if (!choice) return;
          if (onSelect) onSelect(choice.value);
          else if (choice.href) window.location.assign(choice.href);
        }}
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </Select>
    </>
  );
}
