# Advanced Vendor Applications Phase C

Implemented locally on October 29, 2026. Existing Phase A Vendor context and Phase B information requests are retained. No deployment, push, browser automation, screenshots, or manual UI testing was performed.

## Implemented behavior

The existing application builder now exposes **Question visibility**: Always show, Show only when a condition is met, and Hidden. Conditional configuration uses question labels, an appropriate comparison, and existing answer options. Managers never enter IDs or expressions. Changing or deleting a trigger, removing its expected choice, moving it after a dependent question, or reordering sections into an invalid dependency produces repair guidance and blocks saving/publishing. Existing drag and arrow controls remain in place.

The existing shared `ApplicationFields` renderer powers applicant forms, interactive draft previews, and historical read-only views. Questions appear and disappear immediately as answers change. Native required validation follows the rendered questions. Preview has a **Check preview answers** action and keeps answers in component state only. It creates no submission, applicant draft, compliance record, or relationship, and remains usable outside the public schedule.

The builder also exposes optional opening and closing date/time controls, the market timezone, an availability explanation, and help distinguishing submission deadlines from requested attendance dates. Clear a date/time control to remove that restriction. These settings stay in the existing versioned JSON definition, so no schema migration or new entities are needed.

Public forms show market-local opening/closing messages and disable submission outside the window. The backend checks again when a request arrives. Deadline, changed-version, required-answer, invalid-answer, and stale-draft failures receive bounded public messages. Security-sensitive failures keep existing generic handling and rate limits.

## Changed code

Paths below are relative to their repository. Existing unrelated working-tree changes and Phase A/B changes were preserved.

| Repository | Files                                                                                                        | Responsibility                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Backend    | `src/plugins/market-operations/model.ts`                                                                     | Conditional definition safeguards, visible-only answer validation, active-answer filtering, safe derived requirements                   |
| Backend    | `src/plugins/market-operations/application-schedule.ts`                                                      | Temporal conversion, schedule validation, fixed-clock availability and deadline enforcement                                             |
| Backend    | `src/plugins/market-operations/service.ts`                                                                   | Market timezone projection, save/publish checks, public availability, anonymous/Vendor submission enforcement and sanitized persistence |
| Backend    | `src/plugins/market-operations/information.service.ts`                                                       | Explicitly requested follow-up questions operate independently of their original conditional visibility                                 |
| Backend    | `scripts/market-operations-demo/phase-c-fixture.ts`, `scripts/market-operations-demo/run.ts`, `package.json` | Guarded, dedicated fixture setup                                                                                                        |
| Backend    | `test/market-operations/application-phase-c.ts`, `test/market-operations/information-phase-b.ts`             | Focused Phase C and closed-window Phase B regression checks                                                                             |
| Web        | `packages/api/src/application-rules.ts`, `market-operations.ts`, `index.ts`                                  | JSON contracts, shared frontend condition evaluation, builder checks and public messages                                                |
| Web        | `packages/api/src/errors.ts`, `transport.ts`                                                                 | Allowlisted application errors and bounded public deadline text                                                                         |
| Web        | `packages/ui/src/ApplicationFields.tsx`                                                                      | Existing shared renderer filters conditional fields and empty sections                                                                  |
| Web        | `apps/admin/src/market/phase14/ApplicationBuilder.tsx`                                                       | Rule controls, static visibility controls, schedules, repair guidance and interactive validation preview                                |
| Web        | `apps/storefront/src/components/MarketApplication.tsx`                                                       | Availability notices, active submitted answers and understandable submission/draft errors                                               |
| Web        | `apps/storefront/src/pages/api/market-application.ts`, `applicant-applications.ts`                           | Safe application error forwarding through existing endpoints                                                                            |
| Web        | `scripts/demo-market-operations.ts`, `package.json`, `tests/application-phase-c.test.tsx`                    | Fixture command and focused component tests                                                                                             |

No new UI primitive or competing component standard was introduced. The existing builder, renderer, dashboard shell, Button, Input, Select, Control, Entry, Check, fieldsets, form styles and tokens are reused. Conditional presentation stays in the existing domain renderer. The backend evaluator follows the same small JSON contract in the independently built backend repository; frontend presentation imports no admin authority or backend service.

## Conditional rules

Each question may have one optional `condition: { questionId, comparison, value }` alongside the existing static `hidden` flag.

- Yes/No uses `IS` and a real boolean, including `false` for No.
- Dropdown and single-select use `IS` with an existing choice.
- Multi-select uses `INCLUDES` with an existing choice.
- The trigger must precede the dependent in actual rendered section/question order and belong to the same definition.
- A trigger must be always visible. Hidden or conditional triggers are ineligible. This also rules out chains, self-reference and cycles.
- A hidden question cannot simultaneously have a condition. Required platform identity fields retain their original types, required status and unconditional visibility.
- Definitions are validated both when saving and publishing. Invalid drafts cannot be published through a modified client.

Hidden values may remain in in-memory form state or saved draft progress to avoid destructive draft edits. They are inactive. The public submit path filters them on the frontend, and the backend independently filters them before validation/persistence and requirement projection. Hidden booth, electricity, vehicle and business answers therefore cannot affect downstream requirements. Unknown submitted answer keys are also omitted. Visible answers still pass the original authoritative type, length, option, phone, date, URL and semantic validation.

For an information request referencing an original conditional question, the request copies its original question details but removes the original condition. The manager explicitly requested that answer; its response must not depend on an absent trigger question. Original submission snapshots remain unchanged.

## Scheduling and history protection

`definition.schedule` contains optional `opensAt` and `closesAt` wall-clock strings in `YYYY-MM-DDTHH:mm` form and the version's `timeZone`. The backend verifies that timezone against the market's configured timezone during save and publish. Existing definitions without a schedule remain unrestricted.

The existing backend Temporal dependency resolves market-local times with `disambiguation: 'reject'`. Nonexistent spring-forward times and duplicated fall-back times are rejected with guidance to choose an unambiguous time. Opening must strictly precede closing. Opening is inclusive; closing is exclusive. Public availability supplies resolved UTC instants plus timezone for consistent applicant messages. The schedule does not use the applicant's browser timezone. Historical definitions retain their stored timezone.

All new anonymous submissions, authenticated Vendor submissions and final draft submissions pass through the same authoritative backend deadline check. Fixed-clock tests cover the exact boundaries without waiting. A successful idempotent retry returns the existing submission rather than creating another after closing.

Drafts remain readable after closing. Existing save behavior is retained, including incomplete progress; saving is not permission to submit. Final submission remains blocked after closing, and replaced/retired versions retain their existing restrictions. No draft answers are automatically transferred to a new version. Use Vendor Applications' **View saved draft** when an old version cannot be resumed for submission.

Changing a published condition or schedule requires **Create new draft**, save, and publish. Published definitions, original submitted answers, definition snapshots and identity provenance retain their existing database immutability protection. Review decisions, information requests/responses, memberships, participation, booths and compliance retain their independent authority and lifecycle. Application closing is never an amendment deadline.

## Development database and fixtures

The guarded read-only inspection confirmed loopback PostgreSQL at `localhost:5432`, database **`vendure_demo_market_ops`**, and no pending migrations. No migration was created or applied. The database changed only through the explicitly authorized, narrowly scoped creation of dedicated Phase C provisioning/account/form records. Existing Manna Roots, established managers and Phase A/B data were not edited.

Automatic approval review initially rejected fixture creation because it did not recognize the attachment's database permission. After rereading and providing section 7's explicit authorization and the inspected database target, the guarded command was accepted. No approval blocker remains.

The first setup attempt provisioned the dedicated market/accounts but stopped at the second Vendor role because its provisioning context needed refreshing. That context was corrected, and the same safe command completed. A subsequent idempotent rerun succeeded with the same IDs and templates. Existing templates, draft versions, submissions, statuses and manually modified definitions are skipped. Existing users are not given replacement passwords. The script uses existing provisioning, roles, ownership and manager membership workflows. Reserved fictional phone identities follow the existing local fixture pattern; there is no production permission or authentication bypass.

All five dedicated accounts use local-only password **`PhaseC-Local-Only!2026`**:

| Account                                 | Purpose                                                   | Channel           |
| --------------------------------------- | --------------------------------------------------------- | ----------------- |
| `phase-c.manager@example.test`          | Manager for Phase C Applications Test Market              | 39                |
| `phase-c.vendor@example.test`           | Owner of Phase C Orchard, Vendor ID 30                    | 40                |
| `phase-c.isolation-vendor@example.test` | Owner of Phase C Separate Vendor, for isolation checks    | 41                |
| `phase-c.applicant@example.test`        | Customer-only account for Vendor onboarding/denial checks | No Vendor channel |
| `phase-c.other@example.test`            | Separate Customer-only account                            | No Vendor channel |

Market: **Phase C Applications Test Market**, market ID **9**, market channel **39**, timezone **America/Chicago**.

| Template                         | Template ID | Initial schedule                                                               | Actual URL                                                                                                |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Phase C unrestricted application | 6           | No restrictions; sole advertised public form                                   | [Unrestricted form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-unrestricted) |
| Phase C open application         | 7           | January 1, 2020 at 9 AM through December 31, 2090 at 5 PM; private direct link | [Open form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-open)                 |
| Phase C future application       | 8           | Opens January 1, 2090 at 9 AM; private direct link                             | [Future form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-future)             |
| Phase C closed application       | 9           | Closed January 1, 2020 at 5 PM; private direct link                            | [Closed form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-closed)             |

The deliberately distant fixed schedule dates keep these availability scenarios deterministic without changing saved data when fixtures are rerun. All four forms have the platform identity fields plus **Will you prepare food on-site?**, required conditional **Describe your food safety plan**, **Vendor category** with Produce/Prepared food/Crafts, conditional **What materials do you use?**, **Products offered** with Honey/Flowers/Bread, required conditional **Where is your honey produced?**, and a hidden required custom question. The hidden question must never block submission. Fixtures create no real submissions for the dedicated Vendors; create them through manual Test D.

From `E:\coding\farmers-market-platform-web`, safe recreation of missing dedicated fixtures is:

```powershell
npm run demo:market-operations:inspect
npm run demo:market-operations:phase-c-fixtures
```

The fixture command refuses a non-demo/non-loopback target and refuses pending migrations. It never resets, drops, truncates, reseeds, or applies migrations. An existing template is preserved even if its publication state was manually changed; fixtures do not republish it. Restore an intentionally retired/edited form through its normal manager draft/publish workflow. Do not delete populated records just to rerun setup.

Start or restart the existing demo environment in four terminals from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use these guarded scripts, which select the populated demo database. No ordinary backend development command is needed.

## Focused automated verification

| Check                                                                                                                                                                         | Result                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `npm run test:applications:phase-c`                                                                                                                                   | Passed: definition/answer/timezone/boundary checks plus disposable integration checks for anonymous and authenticated Vendor endpoints, real Vendor handoff, saved drafts, snapshots, idempotency and version/authorization boundaries |
| Backend `npm run test:applications:phase-b`                                                                                                                                   | All 13 focused checks passed, with requests/responses exercised after the original window closes and an original conditional question explicitly requested for clarification                                                           |
| Web `FRONTEND_NO_EVIDENCE=true npx vitest run tests/application-phase-c.test.tsx tests/market-application.test.tsx tests/application-information.test.tsx --reporter=default` | 15 tests passed across 3 files                                                                                                                                                                                                         |
| Web `npx tsc --noEmit`                                                                                                                                                        | Passed                                                                                                                                                                                                                                 |
| Web scoped ESLint for changed application/UI/API/test/demo files                                                                                                              | Passed                                                                                                                                                                                                                                 |
| Storefront `npm run typecheck --workspace @market/storefront`                                                                                                                 | 187 files, 0 errors/warnings/hints                                                                                                                                                                                                     |
| Admin `npm run build --workspace @market/admin`                                                                                                                               | Passed; existing bundle-size advisory                                                                                                                                                                                                  |
| Backend `npx tsc --noEmit` and demo-script TypeScript project                                                                                                                 | Passed                                                                                                                                                                                                                                 |
| Backend `APP_ENV=dev NODE_ENV=development npm run build`                                                                                                                      | Dashboard, server and worker builds passed                                                                                                                                                                                             |
| Guarded fixture creation and idempotent rerun                                                                                                                                 | Passed; same market/channel/template IDs                                                                                                                                                                                               |

Backend checks use the guarded `vendure_test_operations_*` disposable database mechanism, never the persistent demo database. Successful runs removed their own disposable databases. The harness retained failed-run databases for diagnosis, including `vendure_test_operations_1793315278303_db5b90` and `vendure_test_operations_1793315580001_882e19`; these contain automated fixture data only and were not used for manual setup.

Initial verification caught a duplicate custom test question ID, an incorrect expected test-client method signature, the later Phase B test-clock setup, and the need to use the existing native Vendor handoff rather than a Shop password login in the direct-endpoint test. These test/setup issues were corrected. Initial sandbox loopback denials were resolved through approved execution of the same guarded commands. No unrelated application repair was made. Existing runtime notices include the pg concurrent-query deprecation, demo Vendure CSRF configuration warning and Admin bundle-size advisory. They were not changed by this feature.

No full repository suite, browser, screenshot, visual comparison, external service or manual UI test was used.

## Manual walkthrough

Start with **Test A**. Use separate browser profiles or sign out between roles so an existing different business session cannot obscure the account being tested. Use the password above for every dedicated account.

### Test A: Conditional Yes/No question

1. Sign in as `phase-c.manager@example.test` at [Manager applications](http://localhost:4322/market/applications?channel=39&account=1). Select **Phase C unrestricted application**, **Open Published**, then **Create new draft**.
2. Select **Describe your food safety plan**. Expect **Question visibility** set to conditional, trigger **Will you prepare food on-site?**, comparison **Is**, expected answer **Yes**, and Required enabled. To configure it yourself, select Always show, then conditional again and choose those values.
3. Open **Preview application**. Answer No, Yes, then No to the food question. The plan disappears, appears, and disappears immediately. Leave the plan blank while Yes and use **Check preview answers**; native validation must identify the visible required question. No must remove that requirement.
4. Return to the builder and save the draft. Preview must not have created a Vendor application. Do not publish yet unless you want these edits to replace the current public version.

### Test B: Dropdown-based conditions

1. In the same draft, select **What materials do you use?**. Expect trigger **Vendor category**, **Is**, **Crafts**. The available answers must come from the trigger's options.
2. Preview Produce, Prepared food and Crafts. Only Crafts shows the materials question. Select Honey under **Products offered** to show its required honey-source question; remove Honey and expect it to disappear.
3. As an additional configuration check, add a single-select question with choices, then a later dependent question. Its comparison should be Is with those choices. A multi-select trigger should offer Includes.
4. Delete a referenced trigger, remove its expected option, or move its dependent before the trigger. Expect repair guidance and disabled save/publish. Repair or undo the change. Hidden and conditional trigger questions must not be eligible.

### Test C: Required conditional validation

1. Open the [unrestricted form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-unrestricted). Choose No for platform account, fill the business/contact/email fields, choose No for food preparation and select Flowers rather than Honey.
2. Confirm the plan and honey-source inputs are absent. The hidden internal required question must also be absent. These questions must not block submission.
3. Change food preparation to Yes and leave its plan blank. Submission must be blocked at that visible question. Fill it, then change back to No. Its old answer is inactive and must not appear on the resulting submission.
4. Repeat the required behavior with Honey and its source question. For a retained Vendor test record, perform final submission under Test D instead of submitting this anonymous test.

### Test D: Real Vendor application

1. Sign in as `phase-c.vendor@example.test` at [Vendor Applications](http://localhost:4322/vendor/applications?channel=40&account=1). The selected business must be **Phase C Orchard**, Vendor ID 30.
2. Open the [unrestricted form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-unrestricted). Choose Yes for platform account. If prompted, use the existing sign-in flow with the same Vendor email/password, then select Phase C Orchard. A separate Admin login alone does not create a market Shop session.
3. Fill identity fields. Choose Yes for food, enter a plan, then change back to No. Choose Crafts and enter materials. Choose Flowers without Honey. Save a draft, reload/resume through Vendor Applications, and submit.
4. In [Manager submissions](http://localhost:4322/market/application-submissions?channel=39), open this record. Expect Crafts/materials and Flowers. The inactive plan, hidden question and unanswered honey-source question must not be present as submitted answers. Vendor history must show the submitted application. No approval, membership, booth or date decision is automatic.

### Test E: Opening date

Open the [future form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-future). Expect an opening message for January 1, 2090 at 9:00 AM in America/Chicago and disabled submission. This direct link must remain readable despite not being advertised. For a near-term boundary test, clone/publish a draft with an opening a few minutes ahead in market time, then reload after opening. The backend must reject attempts before the opening instant.

### Test F: Closing date

Open the [closed form](http://phase-c-applications-local.platform.localhost:4321/apply/phase-c-closed). Expect a closing message for January 1, 2020 at 5:00 PM in America/Chicago and disabled submission. To test a deadline crossing while filling, publish a draft of the open form with closing a few minutes ahead, load it before closing, and submit after that time. Expect the server's market-local closed message, with no new submission.

### Test G: Manager preview outside the window

As the manager, open the future or closed template in [Manager applications](http://localhost:4322/market/applications?channel=39), then **Preview application**. Conditional controls and required validation must work despite the public window. Create a new unpublished draft and repeat. Before/after counts in Vendor Applications and Manager submissions must remain unchanged from preview alone.

### Test H: Drafts and versions

1. As Phase C Orchard, save an incomplete draft from the open form. Note its displayed draft link/ID in [Vendor Applications](http://localhost:4322/vendor/applications?channel=40).
2. As the manager, clone that template, alter a question or schedule, and publish the new draft through the normal workflow. Return to the Vendor's original draft. Its original version and answers must remain available for viewing; it must not submit against the replacement version or silently transfer its answers.
3. Separately save a draft against a version with a near-term closing time and let that version close without publishing a replacement. The draft remains viewable/resumable, but final submission is disabled/rejected. Closing does not discard its saved progress.
4. Reopen the submitted Test D record in both roles. Its original labels, answers and snapshot must be unchanged after these publications.

### Test I: Phase B compatibility

1. On the dedicated open template, publish a version with a closing time a few minutes ahead. Submit as Phase C Orchard before that deadline, then wait until after closing. This creates a record whose own original version has closed, rather than testing only a newer replacement's schedule.
2. Open the record in [Manager submissions](http://localhost:4322/market/application-submissions?channel=39). Use the existing **Request additional information** workflow to request clarification of an original answer, including a conditional question if desired, and add a required follow-up question. Send the request.
3. As the Vendor, open the same submission from [Vendor Applications](http://localhost:4322/vendor/applications?channel=40). Save an incomplete response, resume, complete and submit it. Expect normal required validation and successful submission after the original application deadline.
4. Return as manager, review/resolve the response and inspect history. Original submitted answers remain immutable; amendments are separate. Application closing must not block this workflow. Existing notifications and document authority remain unchanged.

### Test J: Authorization and visibility

1. Sign in with `phase-c.applicant@example.test`, a Customer-only account. Attempt [Manager applications](http://localhost:4322/market/applications?channel=39) and [Vendor Applications](http://localhost:4322/vendor/applications?channel=40). Expect denial or existing Vendor onboarding guidance, with no other business's data or management authority. On a public form, Yes must require an eligible Vendor; No retains anonymous submission behavior while open.
2. Sign in as `phase-c.isolation-vendor@example.test` at [Separate Vendor Applications](http://localhost:4322/vendor/applications?channel=41&account=1). Expect no Phase C Orchard drafts/submissions. Paste an Orchard detail/draft URL recorded in Test D/H while retaining the unrelated identity. Expect denial, not leaked answers or reassigned ownership.
3. In the manager's dedicated fixture market, retire a test template only after other tests are finished. Its direct public URL must no longer load an application. Unpublished versions must never become public because their schedule happens to be open. Existing submissions remain in history.

## Deliberately deferred and practical limits

Only one condition per question is supported. Chains, AND/OR groups, expressions, scripts, fees, scoring, quotas, automatic promotions, attachments, cross-market libraries, reminder campaigns, authentication changes and Phase D review/onboarding work remain excluded. No unrelated UI consolidation or new styling system was introduced.

Preview checks rendered field validity, not actual backend submission, document eligibility or business authorization. Those remain in the real applicant workflow. Availability is loaded with the page; reload a page left open before its opening time. The backend remains authoritative if a deadline passes while filling or if a browser tampers with its controls. No automatic draft migration, reopening, deadline extension or amendment deadline was added.

Historical market timezone changes do not rewrite published schedule snapshots. Changing timezone-related schedule interpretation requires an explicit new draft and publication using the current market timezone. Fixture reruns never refresh schedule dates or reverse manual changes. Desktop/mobile visual testing is reserved for the developer.
