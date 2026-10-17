import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  createDashboardPreferencesApi,
  type DashboardPreferencesApi,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  SelectField,
  Spinner,
} from '@market/ui';
import {
  dashboardPaletteDefaults,
  dashboardPalettePresets,
  dashboardPaletteSchema,
  dashboardPaletteError,
  dashboardPaletteAdvice,
  dashboardTheme,
  platformTheme,
  themeVariables,
  type DashboardPalette,
} from '@market/theme';

const Appearance = createContext<{
  palette: DashboardPalette;
  defaults: DashboardPalette;
  loaded: boolean;
  error: string;
  available: boolean;
  retry: () => void;
  save: (p: DashboardPalette) => Promise<void>;
}>({
  palette: dashboardPaletteDefaults,
  defaults: dashboardPaletteDefaults,
  loaded: true,
  error: '',
  available: false,
  retry: () => {},
  save: async () => {},
});
export const useDashboardAppearance = () => useContext(Appearance);
export function DashboardAppearanceProvider({
  accountId,
  connection,
  api: suppliedApi,
  defaults = dashboardPaletteDefaults,
  children,
}: {
  accountId?: string;
  connection?: { endpoint: string; channelToken: string };
  api?: DashboardPreferencesApi;
  defaults?: DashboardPalette;
  children: ReactNode;
}) {
  const endpoint = connection?.endpoint,
    channelToken = connection?.channelToken;
  const api = useMemo(
    () =>
      suppliedApi ??
      (endpoint && accountId
        ? createDashboardPreferencesApi({ endpoint, channelToken })
        : undefined),
    [suppliedApi, endpoint, channelToken, accountId],
  );
  const [state, setState] = useState<{
    api?: DashboardPreferencesApi;
    account?: string;
    palette: DashboardPalette;
    loaded: boolean;
    error: string;
  }>({ palette: defaults, loaded: false, error: '' });
  const [generation, setGeneration] = useState(0);
  const current = state.api === api && state.account === accountId;
  const palette = current ? state.palette : defaults;
  useEffect(() => {
    let active = true;
    if (api)
      void api
        .read()
        .then((value) => {
          if (!active) return;
          if (
            value !== null &&
            value !== undefined &&
            dashboardPaletteError(value)
          )
            throw new Error('Invalid saved palette');
          setState({
            api,
            account: accountId,
            palette:
              value == null ? defaults : dashboardPaletteSchema.parse(value),
            loaded: true,
            error: '',
          });
        })
        .catch(() => {
          if (active)
            setState({
              api,
              account: accountId,
              palette: defaults,
              loaded: true,
              error:
                'Saved colors could not be loaded. Retry before changing them.',
            });
        });
    return () => {
      active = false;
    };
  }, [api, accountId, generation, defaults]);
  return (
    <Appearance.Provider
      value={{
        palette,
        defaults,
        loaded: !api || (current && state.loaded),
        error: current ? state.error : '',
        available: !!api,
        retry: () => setGeneration((n) => n + 1),
        save: async (p) => {
          if (!api || dashboardPaletteError(p))
            throw new Error('Invalid palette');
          await api.save(p);
          setState({
            api,
            account: accountId,
            palette: p,
            loaded: true,
            error: '',
          });
        },
      }}
    >
      {children}
    </Appearance.Provider>
  );
}
export function DashboardAppearanceSettings() {
  const appearance = useDashboardAppearance();
  if (!appearance.available)
    return (
      <Card>
        <p>Sign in to save your dashboard colors.</p>
      </Card>
    );
  if (!appearance.loaded) return <Spinner label="Loading dashboard colors" />;
  if (appearance.error)
    return (
      <Card>
        <Alert severity="error">{appearance.error}</Alert>
        <Button onClick={appearance.retry}>Retry</Button>
      </Card>
    );
  return (
    <PaletteEditor
      saved={appearance.palette}
      defaults={appearance.defaults}
      save={appearance.save}
    />
  );
}
function PaletteEditor({
  saved,
  defaults,
  save,
}: {
  saved: DashboardPalette;
  defaults: DashboardPalette;
  save: (p: DashboardPalette) => Promise<void>;
}) {
  const [draft, setDraft] = useState(saved),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false);
  const validation = dashboardPaletteError(draft);
  const advice = dashboardPaletteAdvice(draft);
  const preview = dashboardPaletteSchema.safeParse(draft);
  const presets = [
    { id: 'workspace', label: 'Workspace default', palette: defaults },
    ...dashboardPalettePresets,
  ];
  const selectedPreset =
    presets.find(({ palette }) =>
      Object.entries(palette).every(
        ([key, color]) =>
          draft[key as keyof DashboardPalette].toLowerCase() ===
          color.toLowerCase(),
      ),
    )?.id ?? 'custom';
  return (
    <Card as="section" aria-label="Dashboard colors">
      <p>
        Dashboard colors apply to your account across your admin workspaces.
        Choose a preset or adjust the colors below, then Save to apply. Contrast
        tips are optional and do not prevent saving your colors.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (validation || busy) return;
          setBusy(true);
          setMessage('');
          void save(draft)
            .then(() => {
              setFailed(false);
              setMessage('Dashboard colors saved.');
            })
            .catch(() => {
              setFailed(true);
              setMessage(
                'Colors could not be saved. Your saved palette is unchanged.',
              );
            })
            .finally(() => setBusy(false));
        }}
      >
        <fieldset disabled={busy}>
          <legend className="sr-only">Your dashboard colors</legend>
          <SelectField
            label="Theme preset"
            className="ui-palette-select"
            value={selectedPreset}
            onChange={(event) => {
              const preset = presets.find(
                ({ id }) => id === event.target.value,
              );
              if (!preset) return;
              setDraft({ ...preset.palette });
              setMessage(
                `${preset.label} previewed. Save to keep these colors.`,
              );
              setFailed(false);
            }}
          >
            {[
              {
                id: 'custom',
                label: 'Custom colors',
                palette: preview.success ? preview.data : saved,
              },
              ...presets,
            ].map(({ id, label, palette }) => (
              <option key={id} value={id} disabled={id === 'custom'}>
                <span className="ui-palette-option">
                  <span className="ui-palette-option-label">{label}</span>
                  <span className="ui-palette-swatches" aria-hidden="true">
                    {(
                      ['primary', 'secondary', 'background', 'surface'] as const
                    ).map((token) => (
                      <span
                        key={token}
                        className="ui-palette-swatch"
                        style={{ backgroundColor: palette[token] }}
                      />
                    ))}
                  </span>
                </span>
              </option>
            ))}
          </SelectField>
          <div className="ui-palette-fields">
            {Object.entries({
              primary: 'Primary',
              secondary: 'Secondary',
              background: 'Dashboard background',
              surface: 'Card background',
            }).map(([key, label]) => {
              const token = key as keyof DashboardPalette;
              return (
                <Field key={token} id={'palette-' + token} label={label}>
                  <div className="ui-palette-field">
                    <input
                      type="color"
                      aria-label={label + ' color picker'}
                      value={
                        /^#[0-9a-f]{6}$/i.test(draft[token])
                          ? draft[token]
                          : saved[token]
                      }
                      onChange={(e) => {
                        setDraft({ ...draft, [token]: e.target.value });
                        setMessage('');
                      }}
                    />
                    <Input
                      id={'palette-' + token}
                      value={draft[token]}
                      required
                      pattern="#[0-9a-fA-F]{6}"
                      maxLength={7}
                      aria-invalid={!!validation}
                      onChange={(e) => {
                        setDraft({ ...draft, [token]: e.target.value });
                        setMessage('');
                      }}
                    />
                  </div>
                </Field>
              );
            })}
          </div>
          {validation && <Alert severity="warning">{validation}</Alert>}
          {advice && <Alert severity="info">Tip: {advice}</Alert>}
          <div
            className="ui-palette-preview"
            aria-label="Dashboard color preview"
            style={
              themeVariables(
                dashboardTheme(
                  platformTheme,
                  preview.success ? preview.data : saved,
                ),
              ) as CSSProperties
            }
          >
            <Card spacing="contained">
              <p>Your dashboard preview</p>
              <p>Normal text on a card.</p>
              <div className="ui-actions">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="tertiary">Tertiary</Button>
                <Badge tone="success">Ready</Badge>
              </div>
            </Card>
          </div>
          <div className="ui-actions">
            <Button type="submit" loading={busy} disabled={!!validation}>
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(saved);
                setMessage('Changes discarded.');
                setFailed(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(defaults);
                setMessage('Default colors previewed. Save to keep them.');
                setFailed(false);
              }}
            >
              Restore defaults
            </Button>
          </div>
        </fieldset>
      </form>
      {message && (
        <Alert severity={failed ? 'error' : 'success'}>{message}</Alert>
      )}
    </Card>
  );
}
