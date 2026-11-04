import type { ReactNode } from 'react';
import './workspace-menu.css';

/** Shared segmented workspace navigation, first used by vendor Loyalty. */
export function WorkspaceMenu<T extends string>({
  label,
  items,
  value,
  onChange,
  className = '',
}: {
  label: string;
  items: Array<{ value: T; label: string; href: string; icon: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <nav className={`workspace-menu ${className}`} aria-label={label}>
      {items.map((item) => (
        <a
          key={item.value}
          href={item.href}
          aria-current={value === item.value ? 'page' : undefined}
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onChange(item.value);
            }
          }}
        >
          {item.icon}
          {item.label}
        </a>
      ))}
    </nav>
  );
}
