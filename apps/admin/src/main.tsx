import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import { AdminApp } from './AdminApp';
import { ErrorBoundary } from '@market/ui';
import { themeVariables, platformTheme } from '@market/theme';
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
          endpoint={__ADMIN_API_URL__}
          accountOrigin={__PLATFORM_ACCOUNT_ORIGIN__ || undefined}
          customerOrigin={__CUSTOMER_STOREFRONT_ORIGIN__ || undefined}
        />
      </ErrorBoundary>
    </StrictMode>,
  );
