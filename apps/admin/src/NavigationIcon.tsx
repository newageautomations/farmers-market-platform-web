const paths: Record<string, string> = {
  overview: 'M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7',
  applications: 'M7 3h10v3h3v15H4V6h3m0-3v5h10V3M8 12h8m-8 4h5',
  occurrences: 'M5 5h14v16H5V5Zm3-3v6m8-6v6M5 10h14m-10 4h2m3 0h2m-7 4h2',
  vendors:
    'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m12-14a4 4 0 0 1 0 8m6 6v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  operations: 'M4 4h16v16H4V4Zm4 4h2m4 0h2m-8 4h2m4 0h2m-8 4h8',
  directory: 'M5 3h14v18H5V3Zm-2 4h4m-4 5h4m-4 5h4m4-10h4m-4 5h4m-4 5h4',
  rentals: 'M3 7 12 3l9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10m-5-16 9 4',
  layouts: 'M3 3h18v18H3V3Zm0 7h9m0-7v18m0-8h9',
  assignments: 'M3 3h8v8H3V3Zm10 10h8v8h-8v-8M3 17h6m-3-3v6m9-14 2 2 4-4',
  billing: 'M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm3 5h8m-8 4h8m-8 4h5',
  day: 'M12 3v2m0 14v2M3 12h2m14 0h2M6 6l1 1m10 10 1 1M6 18l1-1M17 7l1-1M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  analytics: 'M4 3v18h17M8 17v-5m5 5V8m5 9V5',
  settings:
    'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  products: 'M4 3h10l7 7-11 11-7-7V4Zm4 3h.01',
  inventory: 'M3 5h18v4H3V5Zm2 4v12h14V9m-10 4h6',
  orders: 'M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h4',
  integrations: 'M8 3v5m8-5v5M5 8h14v3a7 7 0 0 1-7 7v3m0-3a7 7 0 0 1-7-7V8',
  markets: 'M3 10h18l-2-6H5l-2 6Zm2 0v11h14V10m-10 11v-7h6v7',
};
export function NavigationIcon({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean);
  const name = segments[1] ?? 'overview';
  const key =
    name === 'application-submissions'
      ? 'applications'
      : name === 'booth-billing' || name === 'payments'
        ? 'billing'
        : name === 'customers' || name === 'tenants'
          ? 'vendors'
          : name;
  return (
    <svg
      className="navigation-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[key] ?? paths.operations} />
    </svg>
  );
}
export function Chevron() {
  return (
    <svg
      className="decorative-chevron"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
