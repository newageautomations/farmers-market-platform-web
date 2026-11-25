declare const __ADMIN_API_URL__: string;
declare const __FIXTURE_MODE__: boolean;
declare const __STAGING_BUILD__: boolean;
/** Set only by the opt-in remote-demo admin dev server; null otherwise. */
declare const __REMOTE_DEMO__: {
  admin: string;
  vendure: string;
  storefrontPort: number;
} | null;
