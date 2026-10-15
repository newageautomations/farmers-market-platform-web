import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { additionalCandidates } from './additional-candidates';

export const categories = {
  BTN: 'Buttons',
  INP: 'Text inputs',
  SEL: 'Select controls',
  CRD: 'Cards',
  DLG: 'Dialogs',
  DSH: 'Dashboard layout and navigation',
  DDN: 'Dropdowns and disclosures',
  BDG: 'Badges and status indicators',
  ALT: 'Alerts and notifications',
  EMP: 'Empty states',
  LOD: 'Loading indicators and skeletons',
  TBL: 'Tables and data tables',
  KPI: 'Statistics and KPI displays',
  FIL: 'Filtering controls and bars',
  TAB: 'Tabs and view selectors',
  PAG: 'Pagination',
  MOB: 'Mobile dashboard navigation',
  PGH: 'Page headings',
  SCH: 'Section headings',
} as const;
export type Category = keyof typeof categories;
export type Context = 'base' | 'admin' | 'storefront' | 'customer';
export const states = [
  'default',
  'disabled',
  'loading',
  'error',
  'selected',
  'expanded',
] as const;
export type DisplayState = (typeof states)[number];
export function stateDescription(id: string, state: DisplayState) {
  if (additionalCandidates[id]) {
    if (id === 'DDN-02' && state === 'expanded')
      return 'Actual defaultOpen prop opens AnimatedDisclosure. Toggle manually to inspect animation and inert content.';
    if (id === 'DDN-03' && state === 'expanded')
      return 'Native open attribute on the audited partial details markup. Toggle with Enter/Space.';
    if (id === 'DDN-01')
      return 'Imported Dropdown has no state props. Open its native summary manually; no disabled or animation behavior is invented.';
    if (id === 'TAB-01')
      return 'Imported Tabs starts on the first item. Select with pointer or ArrowLeft/Right/Home/End; no initial-selected or disabled prop exists.';
    if (id === 'TAB-02')
      return 'Partial original designer buttons; local panel state is explicitly simulated. Selected control starts on Layers. Native Tab/Enter/Space only.';
    if (id === 'PAG-01' || id === 'PAG-02' || id === 'PAG-03')
      return 'Actual Pagination/Pager callbacks with synthetic local caller state. Selected starts on the middle page, disabled on the final page; boundaries use original disabled controls. No request runs.';
    if (id === 'PAG-04' || id === 'PAG-05')
      return 'Partial native link markup. Selected shows middle-page links; disabled shows the final boundary by omitting Next. Links target local fragments only; navigation/query paging is not implemented.';
    if (id.startsWith('LOD-'))
      return state === 'error' && ['LOD-02', 'LOD-03'].includes(id)
        ? 'Actual ReadState receives a synthetic caller AppError; retry switches only local fixture display state.'
        : 'Synthetic caller-controlled loading presentation. No delayed request. Original static ring, skeleton or busy text retained.';
    if (id.startsWith('FIL-'))
      return 'Native fields/options are editable. All submissions are blocked by the existing capture guard and CSP. Filtering, RangeForm validation, paging and URL handlers are not exercised.';
    if (id === 'TBL-02' && state === 'selected')
      return 'Real aria-sort metadata supplied by the fixture. DataTable has no sorting controller; rows stay in the supplied order.';
    return 'This candidate has no intrinsic global state prop. Its documented variants remain visible; unsupported loading/error/selected/disabled states do not fabricate a new design. Hover/focus on real child controls stays native.';
  }
  if (state === 'default')
    return 'Existing default specimen. Hover and focus require real pointer/keyboard interaction.';
  if (/^(DSH|SID|HDR|MOB)-/.test(id))
    return 'Shells have no global disabled, loading, error or selected prop. Default shell retained. Current navigation, collapse and disclosure states are interactive.';
  if (id.startsWith('CRD-'))
    return id === 'CRD-05' && state === 'selected'
      ? 'Simulated display-only editing surface using the existing .editing class. Full question editor omitted.'
      : 'Card surfaces have no intrinsic state. Default surface retained; child actions inherit the fixture disabled fieldset for disabled/loading.';
  if (id.startsWith('DLG-'))
    return state === 'disabled' || state === 'loading'
      ? 'Real busy prop blocks Close/Escape. The fixture simulates waiting; no request runs. End simulated wait clears the prop.'
      : state === 'error'
        ? 'Simulated caller error inside the real dialog. The overlay has no error variant.'
        : 'Dialogs have no selected state. Default overlay retained.';
  if (state === 'disabled')
    return 'Native disabled prop or inherited disabled fixture fieldset. Wrappers without a disabled API retain their original behavior.';
  if (state === 'loading')
    return 'Simulated caller loading: disabled fieldset/props and button text. This candidate has no intrinsic loading API and no request runs.';
  if (state === 'error')
    return ['INP-01', 'INP-02', 'SEL-01', 'SEL-06'].includes(id)
      ? 'Simulated caller-supplied aria-invalid/feedback using native props and the existing Field where present. No validation request runs.'
      : id === 'BTN-05'
        ? 'Password mismatch is interactive: enter differing synthetic values to see actual validation feedback. No preset error prop exists.'
        : 'No intrinsic error variant. Default specimen retained; no error appearance is fabricated.';
  return ['SEL-01', 'SEL-02', 'SEL-04', 'SEL-05', 'SEL-06', 'SEL-07'].includes(
    id,
  )
    ? 'Actual native/controlled selected value. Change the synthetic option to compare selection behavior.'
    : id === 'SEL-03'
      ? 'SelectField has no preset selected-value prop. Choose an option manually to inspect native selection.'
      : id === 'BTN-05'
        ? 'Click Show/Hide to compare actual aria-pressed visibility state. No preset selected prop exists.'
        : 'No intrinsic selected variant. Default specimen retained. Text selection and hover/focus remain native interactions.';
}
export interface Candidate {
  id: string;
  name: string;
  source: string;
  scope: string;
  category: Category;
  context: Context;
  kind: string;
  limitation: string;
  route?: string;
  rendering?: 'imported' | 'partial' | 'evidence';
  css?: string;
}

const limitations: Record<string, string> = {
  'BTN-01':
    'Native props and secondary class. Loading is caller text/disabled; no built-in selected or error variant.',
  'BTN-02':
    'Actual .button class and native markup. Commerce controllers are excluded. Loading text is a display-only caller simulation.',
  'BTN-03':
    'Raw operations buttons under the real ops-workspace ancestor. No run/controller or business commands.',
  'BTN-04':
    'Plain native account button pattern. No account form, submission or account feedback controller.',
  'BTN-05':
    'Actual SignupPasswords visibility controls plus native resend-button markup. Reveal/mismatch work locally; resend countdown and verification requests are excluded.',
  'INP-01':
    'Actual Input and inputContract. Caller supplies Field, aria-invalid and error text. No intrinsic loading state.',
  'INP-02':
    'Astro native field markup with existing account constraints and CSS. Bypasses React inputContract; no account controller.',
  'INP-03':
    'Exact six-digit Astro markup and CSS. Phone-verification script is intentionally excluded because it sends account requests. Auto-advance, paste and resend are not demonstrated.',
  'SEL-01':
    'Actual native Select. Error feedback and busy state belong to callers.',
  'SEL-02':
    'Actual Market Choice including status tones. Disabled is inherited from a fixture fieldset; no disabled/error/loading prop.',
  'SEL-03':
    'Actual required Market SelectField. Disabled is inherited from a fixture fieldset; no direct state props.',
  'SEL-04':
    'Actual Management Choice with controlled synthetic values. Disabled is inherited from a fixture fieldset.',
  'SEL-05':
    'Actual Control with the existing native select pattern. Feature options are replaced with synthetic identifiers.',
  'SEL-06':
    'Astro native public select pattern. ProductPurchase, AccountModes and account/commerce controllers are not mounted.',
  'SEL-07':
    'Actual SearchSelect with synthetic local options. Arrow keys, Enter, Escape, filtering and selected option work. No async/error API.',
  'CRD-01':
    'Actual React Card and Astro native article.card counterpart. Surface itself has no interactive/state API.',
  'CRD-02':
    'Existing dashboard-card and command-section markup/classes. Feature data and command forms are excluded.',
  'CRD-03':
    'Existing ops-editor, ops-section and ops-inspector markup/classes. Surface state belongs to children.',
  'CRD-04':
    'Actual AnimatedDisclosure and layout-card surface. Canvas preview and layout actions cannot be isolated from the local feature; preview is explicitly omitted.',
  'CRD-05':
    'Surface classes can be inspected, including editing. Full question builder has local definition, drag, edit and run dependencies. Static display-only surface, not a working builder.',
  'DLG-01':
    'Actual Dialog/Drawer. Busy blocks Escape/Close; child locking is caller-owned. Title focus is a real prop. Loading/error children are synthetic display only.',
  'DLG-02':
    'Actual MarketDialog with busy and beforeClose veto. Always focuses title; focusTitle is not consumed. Native programmatic close callback gap is preserved.',
  'DSH-01':
    'Actual interactive AdminShell only, with synthetic context and no services. AdminApp, authentication and operational route contents are never mounted. Navigation changes local history only; logout is a local status message.',
  'DSH-02':
    'Actual Astro CustomerLayout and CustomerNavigation with synthetic name. Form submissions and document navigation are blocked. No customer data, account bridge or credentials.',
  'SID-01':
    'Actual sidebar inside the shell-only DSH-01 specimen; market collapse/inert and current navigation use original behavior.',
  'SID-02':
    'Actual Astro sidebar inside DSH-02, including original CustomerNavigation.',
  'HDR-01':
    'Actual topbar inside shell-only DSH-01. AccountModes and refresh services are excluded; controls slot contains a local Button.',
  'HDR-02':
    'Actual Astro topbar inside DSH-02. Original logout form is visible but sandbox and request guard prevent submission.',
  'HDR-03':
    'Evidence/route only. Designer header is local to LayoutEditor and depends on layout/version state and command closures. No editor is mounted or approximated.',
  'MOB-01':
    'Actual native mobile disclosure inside shell-only DSH-01. Inspect at 390, 600, 601, 767 and 768px.',
  'MOB-02':
    'Actual native mobile disclosure inside Astro DSH-02. Remains usable without JavaScript; navigation itself is blocked.',
};
const routes: Record<string, string> = {
  'BTN-05': '/account/signup and /account/verify',
  'INP-03': '/account/verify',
  'CRD-04': '/market/layouts',
  'CRD-05': '/market/applications',
  'HDR-03': '/market/layouts/:layoutId/edit',
};

/** Read identity/scope from the decision registry without changing its decisions. */
export function readCandidates(): Candidate[] {
  const registry = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../UI_COMPONENTS.md',
    ),
    'utf8',
  );
  return registry.split(/\r?\n/).flatMap((line) => {
    const cells = line.split('|').map((cell) => cell.trim());
    const id = cells[1] ?? '';
    const additional = additionalCandidates[id];
    if (!limitations[id] && !additional) return [];
    const prefix = id.split('-')[0]!;
    const category: Category = ['SID', 'HDR'].includes(prefix)
      ? 'DSH'
      : (prefix as Category);
    // Link targets preserve literal Astro [parameter] names; labels escape them.
    const source =
      cells[3]?.match(
        /\]\(E:\/coding\/farmers-market-platform-web\/([^)]+)\)/,
      )?.[1] ?? '';
    const scope = cells[4] ?? '';
    const context: Context =
      additional?.context ??
      (['BTN-02', 'BTN-04', 'BTN-05', 'INP-02', 'INP-03', 'SEL-06'].includes(id)
        ? 'storefront'
        : ['BTN-01', 'INP-01', 'SEL-01', 'CRD-01', 'DLG-01'].includes(id)
          ? 'base'
          : 'admin');
    return [
      {
        id,
        name: cells[2]!,
        source,
        scope,
        category,
        context,
        kind: scope.startsWith('Local pattern')
          ? 'Local markup pattern family'
          : scope.startsWith('Local')
            ? 'Local feature or shell region'
            : 'Reusable component or shared region',
        limitation: additional?.limitation ?? limitations[id]!,
        route: additional?.route ?? routes[id],
        rendering:
          additional?.rendering ?? (prefix === 'MOB' ? 'imported' : undefined),
        css: additional?.css,
      },
    ];
  });
}

/** Keep every original DSH comparison, including its existing MOB regions. */
export function candidatesForCategory(category: Category) {
  return readCandidates().filter(
    (candidate) =>
      candidate.category === category ||
      (category === 'DSH' && candidate.category === 'MOB'),
  );
}
