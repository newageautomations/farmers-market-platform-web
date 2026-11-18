import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import '@market/ui/farmstand.css';
import { AdminApp } from './AdminApp';
import { ErrorBoundary } from '@market/ui';
import { themeVariables, platformTheme } from '@market/theme';
import { installRemoteDemoLinks } from './remote-demo';
installRemoteDemoLinks();
for (const [key, value] of Object.entries(themeVariables(platformTheme)))
  document.documentElement.style.setProperty(key, value);
const root = createRoot(document.getElementById('root')!);
if (__FIXTURE_MODE__) {
  const { default: FixtureAdmin } = await import('./FixtureAdmin');
  root.render(
    <StrictMode>
      <FixtureAdmin />
    </StrictMode>,
  );
} else
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AdminApp
          /* Absolute locally; the remote demo's same-origin `/admin-api` resolves here. */
          endpoint={new URL(__ADMIN_API_URL__, window.location.origin).href}
          accountOrigin={__PLATFORM_ACCOUNT_ORIGIN__ || undefined}
          customerOrigin={__CUSTOMER_STOREFRONT_ORIGIN__ || undefined}
        />
      </ErrorBoundary>
    </StrictMode>,
  );
