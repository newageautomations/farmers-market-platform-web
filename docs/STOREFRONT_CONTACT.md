# Storefront Contact

Implemented locally on October 24, 2026 across the web and backend repositories. No deployment, remote Git action, browser automation, screenshots, fixture population, or persistent database migration was performed. Existing Willow & Grain content and other demonstration data were preserved.

## Public page and editor

`/contact` uses the real Astro SiteLayout and Harvest header/footer at the normal storefront width. The introduction is text only. The desktop form/public-information split is approximately 62%/38%; it stacks below 760px. There is no outer page card. When all five public fields are blank, the information column disappears and the form expands. The existing compact ClosingInvitation links to `/find-us`, and is omitted when Find Us is disabled. Contact's invitation content is independent of About and Find Us.

Contact is initially disabled for existing storefronts. In the vendor visual editor, Preview page > Contact page exposes page title/enabled state, introduction, public contact information, explanatory form settings, and invitation text. Public contact information contains exactly five fixed controls: Email, Phone, Address, Facebook and Instagram. Nonempty values appear automatically; clearing a value omits it. There are no entry-type, add/remove or Show publicly controls. The phone retains the existing international country selector. Address is vendor-entered public text, with a recommended maximum of 500 characters, and never reads an account/profile address. Every populated storefront detail has a decorative icon from the shared UtilityIcon component beside its readable text.

The existing appearance entry JSON remains compatible without a database migration. The fixed controls select the first previously visible nonempty value of each supported type. Legacy hidden values remain private and do not automatically populate the new controls. Editing a fixed field writes one visible nonempty entry per populated type; blank fields produce no entry. Email, phone and social formatting guidance is advisory; safe public link generation remains enforced.

The existing validated appearance JSON, optimistic version checks, Undo/Redo, Save draft, Publish saved changes, authorized real-Astro preview, inspect selection, CSP, and origin/window checks remain authoritative. Every Contact edit triggers the existing structural SSR preview path. Preview controls are disabled and the submit handler refuses sending; the existing preview CSP blocks connections and the Astro API rejects a preview context. Required customer fields cannot be removed or reconfigured.

## Advisory Contact editor validation

Contact appearance fields now show recommended-length and formatting guidance beneath the field without blocking typing, preview, Save draft or Publish saved changes. Incomplete email, phone and social values and text beyond the former recommended limits remain intact. The international PhoneInput has an explicit editor-only advisory mode; all ordinary phone consumers retain their original strict behavior. Contact settings reduce disclosure gaps and field margins by 50%. Other temporarily invalid editor sections retain a previously renderable preview rather than losing the frame.

Contact appearance strings still have a 20,000-character per-value safety bound and the existing total configuration bound; structural/ownership checks, origin rules and preview capability checks remain. Public contact rendering only creates email, telephone or social links when their destination is safe and usable. Incomplete or unsafe values render as escaped plain text, so they do not break the page or become executable links. Backend Contact appearance validation matches this advisory behavior; customer inquiry validation remains strict. No migration or persistent database change is required for this refinement.

## Public contact presentation refinements

Public phone text uses the existing libphonenumber dependency and country conventions. North American numbers display as `+1 (415) 555-2671`; other countries retain their own international grouping. Stored numbers and telephone destinations are unchanged. Social contact text reads “Follow us on Facebook” or “Follow us on Instagram”; the complete label is linked to the safe configured destination. Raw social URLs are never used as visible labels. Incomplete or unsafe destinations retain the same label as non-clickable text.

Storefront input focus fills use a shared optional focus token derived from the selected theme primary/surface colors; ordinary dashboard defaults remain unchanged. Storefront textarea/select focus uses the same theme color and preserves forced-color support. Successful contact acceptance draws the shared check icon inside a themed circle and retains the thank-you announcement. Reduced-motion users receive the completed checkmark immediately. No existing success-feedback primitive supported this composition, so it extends UtilityIcon and the Contact success state without a new UI library or messaging behavior.

A read-only inspection of local `vendure_demo_market_ops` on October 24 found Willow & Grain's active vendor membership had no `ReadOwnCRM` grant. One inquiry and one accepted-event outbox record existed, with zero Contact inbox notifications. The Contact dashboard route/sidebar and notification projector are already implemented, but both require that grant. No permission, dashboard integration, worker, replay or notification change was made during these refinements, per the developer's request.

## Form and validation

Full name is required, trimmed, Unicode-compatible, and limited to 100 UTF-16 characters. Email is required and limited to 254 characters, using browser email semantics and the established backend email convention. Optional phone reuses PhoneInput's country selector, country-aware validation and E.164 normalization; the backend reuses canonicalPhone. Subject is required and fixed to General Question, Product Question, Existing Order, Market / Pickup Question, Wholesale / Business Inquiry, and Other. Message is required, multiline plain text, and limited to 5,000 characters. Optional order reference is limited to 80 characters and is available only for Existing Order. It never reads or authorizes an order.

Errors appear on blur or attempted submission, associate with inputs, and focus the first invalid field. Oversized pastes are refused with an explanation instead of silently truncated. Invalid values remain editable. No permanent counters or untouched-field warnings are shown. Existing signed-in customer profile details prefill the form through the current profile read; editing or submitting never updates that profile. Guests can submit without authentication. Success replaces the form with confirmation that the message was received, without claiming that the vendor read it.

## Storage, authorization and abuse controls

The public form posts JSON to the same-origin Astro `/api/contact` boundary. This requires an enabled published vendor Contact page, exact canonical Origin, JSON content type and a maximum 32,768-byte body. It derives the Shop channel from the host-resolved storefront. The BFF supplies origin and client address to its existing server-only Shop transport; the client's address is trusted by the backend only when the existing storefront bridge secret matches. A direct caller cannot select an arbitrary vendor in the input. Unrecognized input fields are rejected.

The Shop mutation validates every field again and verifies the active storefront/vendor/channel and origin hostname. It returns only `{ accepted: true }`. There is no public inquiry list, detail, read-state or search API. The Admin operations require authentication plus the current selected vendor's active membership and channel-scoped `ReadOwnCRM` grant through TenantAccessPolicy. Lists, details and read mutations all constrain both vendor and channel. Market-manager authority, foreign record IDs and notification URLs grant no access.

The new `storefront_contact_submission` table stores a UUID, vendor/channel/storefront foreign keys, supplied contact details, fixed subject, message, optional order reference, creation/read timestamps, idempotency key and input hash. The existing repository/transaction SQL adapter is used; no generalized messaging entity or new storage service is introduced. Lists return 20 summaries at a time, newest first, with details fetched only for the selected record.

Acceptance, retry detection, rate counters, inquiry persistence and durable event append share one database transaction under a per-storefront advisory lock. A unique `(storefront_id, idempotency_key)` constraint is the final retry guard. Reusing a key with different content is rejected. The form retains its key when retrying unchanged values after a failed or lost response, and uses a new key for changed values. A synchronous submission lock also prevents duplicate clicks.

Database-backed fixed-hour limits allow at most 10 new inquiries per client/storefront and 100 per storefront. An accepted retry does not consume quota. The existing Astro middleware adds its normal API abuse control. Rate-counter keys contain hashed client identifiers; bounded cleanup removes at most 100 counters older than one day per acceptance. Production needs the existing bridge secret and server-observed client-address contract configured correctly. Without that secret, the backend conservatively limits by its observed peer, which may be a shared BFF address. No CAPTCHA, external anti-spam service or new dependency was added.

All message rendering is escaped React text with preserved line breaks. No submitted HTML is executed. Email links encode the address so customer input cannot supply mail-handler query parameters. Clickable public social URLs require HTTPS, no credentials/port, and the exact supported platform hostname; other configured text remains non-clickable. Messages and contact details are not written to application logs or durable-event metadata.

## Dashboard and notification

`/vendor/contact-submissions` is a permanent vendor navigation entry for users with the existing CRM read grant. It uses AdminShell, the simplified DataTable record adapter, shared loading/error/empty states, Pagination, Badge and Dialog. Rows show sender and read/unread status, with full-row activation and a native keyboard trigger. Opening a row or authorized notification deep link loads the exact submission and marks it read. Mark unread/read updates the list without reloading the page. The dialog displays contact details, subject, full message, optional order reference and local date/time, plus copy/email/telephone conveniences. Clipboard failures leave selectable values visible. There is no reply composer or platform send action.

One authoritative `storefront.contact.accepted` outbox fact is appended only with successful persistence. InboxProjector uses that fact to create `vendor.contact.received`, with current verified-user membership and `ReadOwnCRM` checks. It uses existing durable consumption receipts, bounded fanout, semantic identity and per-user logical-key uniqueness. Replay and concurrent submission retries produce no duplicate visible notice for a recipient. One authorized recipient receives one notice; multiple independently authorized vendor recipients can each receive their own copy. Notifications contain sender name and fixed subject, never the message body, email or phone. The action allowlist points to `/vendor/contact-submissions?submission=UUID`; both inbox reads and inquiry reads reauthorize access. Read/unread operations append no event.

## Local files and component reuse

New web feature files:

- `apps/storefront/src/pages/contact.astro`, `pages/api/contact.ts`, `components/ContactForm.tsx`, and `styles/contact.css`.
- `apps/admin/src/ContactEditor.tsx` and `vendor/contact-submissions.tsx`.
- `packages/theme/src/contact.ts` and `packages/api/src/contact.ts`.
- `tests/storefront-contact.test.tsx` and `scripts/test-storefront-contact.ts`.

Existing files extended: theme/config exports and appearance types; Harvest header/footer; ClosingInvitation destination type; Shop request adapter; preview structural comparison/path/section registry; VisualStorefrontEditor; vendor service/routes/navigation/icon mapping; source schema extraction, schema snapshots/generated clients; and package scripts.

Backend additions: `src/plugins/platform-identity/contact-validation.ts`, `src/plugins/platform-notifications/contact.ts`, `src/migrations/1794200000000-StorefrontContact.ts`, and `test/farmers-market/storefront-contact.ts`. Existing appearance validation/public projection and notification plugin, registry, delivery policy, qualification metadata, projector and action allowlist were extended.

ContactForm, ContactEditor and the submission review page are domain compositions because existing Checkout, About/Find Us editors and inbox controllers do not implement this inquiry workflow. They reuse Field, Input, Textarea, SelectField, PhoneInput, Button, Alert, Checkbox, Dialog, DataTable record details, Pagination, Badge, existing disclosures and theme tokens. The Astro page remains SSR with only the form island hydrated. No new UI primitive, library, parallel style system or approval of a pending component category was introduced.

## Verification

- 31 focused web tests passed across Contact, shared phone input, visual editor, preview bridge and preview security. Contact coverage includes Unicode, validation timing/focus, invalid phone/email, length/paste behavior, optional order reference, guest retry/double-click handling, profile prefill, preview blocking, typed-link validation, fixed-field editing/clearing/history/save/publish, advisory formatting/length guidance, safe invalid-value rendering and strict-phone regression, deep-link modal, escaping and external actions.
- The HTTP-only Contact script passed against actual Astro and a bounded fake backend: shared shell/width, public details, empty column, disabled Find Us, profile prefill, body/origin checks, real unsaved Astro preview, disabled preview sending, draft/public isolation, BFF submission and disabled Contact.
- Guarded disposable PostgreSQL tests passed for actual migration/bootstrap, backend validation, phone normalization, draft/public and tenant isolation, concurrent retry, one transactional outbox event, replay deduplication, recipient/deep-link authorization, guest Shop/Admin read rejection, read/unread and rate limiting. Successful isolated databases were dropped by the existing guard. Two early failed disposable runs were retained by that guard for diagnosis; neither used the demo database.
- Web TypeScript/Astro checks passed with zero errors, warnings or hints. Backend typecheck and local storefront/admin/backend-dashboard/server/worker builds passed. Focused ESLint/Prettier and package-boundary checks passed. Shop/Admin schemas were extracted without database bootstrap and clients regenerated.
- A plain backend build without an explicit APP_ENV was refused by the existing environment guard; the supported synthetic local production build helper passed. Existing build chunk-size/framework warnings and a PostgreSQL client concurrent-query deprecation appeared. They did not fail qualification. No browser or visual verification was performed, as requested.

## Manual setup

The initial implementation read-only check verified `current_database() = vendure_demo_market_ops` on loopback address `::1`, with `1794200000000-StorefrontContact.ts` pending at that time. That migration creates the two Contact tables and their index without changing existing records. A later read-only check during the presentation refinements found the Contact table and one saved inquiry already present. This agent did not apply migrations or change that inquiry. No additional migration is needed for the presentation refinements.

When ready to prepare manual testing, run from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:migrate
```

This existing guarded command verifies the selected database and loopback server, applies pending migrations with synchronization disabled, and verifies completion. Do not use reset, seed, showcase or fixture commands. Start or restart each process in its own terminal from the same web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

## Manual checks

1. Open `http://localhost:4322`, sign in with the existing `homepage.vendor@example.test` account and select Willow & Grain Farmstead. Open `/vendor/storefront` and select Contact page in Preview page. Enable Contact; edit its title, introduction and invitation. Confirm Undo/Redo and inspect selection. Preview Send Message must remain disabled and create neither an inquiry nor a notification.
2. Open Public contact information. Enter Email, a valid international Phone using its country selector, a public Address, and HTTPS Facebook/Instagram URLs. Confirm there are only these five contact inputs and no add/remove or Show publicly controls. Clear Address and confirm it disappears in preview. Confirm Undo/Redo restores/clears its value. Save draft and check that the live page stays unchanged; then use Publish saved changes.
3. Open `http://homepage-vendor.localhost:4321/contact`. Confirm Harvest navigation/footer, the introduction, each populated public detail with its icon, and the compact Find Us invitation. Clear all five public fields and publish; the form must expand without an empty card. Disable Find Us and publish to confirm the invitation disappears, then restore the desired existing setting.
4. In a signed-out/private browser window, submit a clearly labeled manual test inquiry. Test Unicode name, invalid email and an invalid phone with its country selected. Blur fields to reveal errors. Try oversized pasted name/message text and an over-limit programmatic value; values must not be silently truncated. Leave phone empty for an accepted guest inquiry.
5. Choose Existing Order. Confirm Order number appears but is optional. Submit once with it blank and, if desired, a separately labeled inquiry with a reference. Switching subjects hides the field and excludes the reference from submission. A reference must never reveal order data.
6. In a signed-in storefront customer session, open Contact again, confirm available profile prefill, change the inquiry contact details and submit. Check account settings afterward to confirm the saved profile did not change. Double-clicking Send Message must produce only one accepted inquiry; retrying unchanged input after a failed response must reuse that inquiry.
7. Open `http://localhost:4322/vendor/contact-submissions` in the Willow & Grain context. Confirm newest-first rows, unread badges, loading/error/empty presentation and bounded pagination. Activate a row with mouse or keyboard. Confirm details and message line breaks, read status and immediate list refresh. Use Mark unread, close, then reopen to confirm read behavior.
8. Run the worker and allow its existing minute sweep and notification polling. Confirm one New contact submission notice per accepted inquiry for the authorized account. Read/unread toggles must create none. Open the notice and confirm the exact submission dialog, including when already on Contact Submissions. Repeat navigation without receiving another notice.
9. Test Copy email/phone, including denied clipboard permission, and the external email/telephone links. There must be no reply textarea, Send Reply button or platform outgoing message.
10. Use a different vendor or market-manager context and attempt the known submission deep link. The backend must deny details and read mutations. A guest must not be able to list or retrieve inquiries. Check narrow/mobile layouts manually for wrapping, usable phone selection, touch targets and the stacked invitation.

Focused commands:

```powershell
# From the web directory
$env:FRONTEND_NO_EVIDENCE = 'true'
npm run test:storefront:contact
npm run test:storefront:contact:http
npm run typecheck

# Backend guarded disposable tests
npm --prefix E:\coding\farmers-market-platform run test:storefront:contact
```

## Limits and deferred work

Contact submission detail/read arguments use GraphQL `String!` because these records have UUID identifiers outside Vendure's numeric entity ID strategy. Declaring them as `ID!` caused the global interceptor to replace UUIDs with `-1`, returning forbidden when opening a submission. The authenticated HTTP regression now covers detail reads and both read-state transitions, alongside the existing ownership and guest denials. This correction requires a backend restart, with no database migration.

The follow-up fixed-field editor and public icons are implemented. No Contact workflow is intentionally deferred. Replies, chat, threads, attachments, response hours, ticketing, automated customer responses and custom form builders remain outside scope. SMS and outgoing email are absent.

Automated submission retention/deletion has no established Contact-specific duration in the existing project. Inquiries are retained until an authorized platform privacy process removes them; a future approved retention policy must define timing and deletion of related notification history. No automatic purge or new vendor deletion control was invented. Rate limits are fixed-hour controls, not a general spam classifier. Manual visual/mobile interaction checks remain for the developer. Existing users need the current CRM read grant to review private inquiries; appearance editing continues to require the existing storefront owner authority.
