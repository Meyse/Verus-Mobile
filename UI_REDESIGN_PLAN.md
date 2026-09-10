# Wallet UI redesign and consistency plan

This is the maintained checklist for completing the remaining GenericRequest,
Send, Convert, Receive, and VerusID design work. Use it to resume a scoped task
without repeating the entire investigation.

## Current position

- Created: 2026-09-10.
- Last updated: 2026-09-10.
- Status: planning complete; implementation has not started under this plan.
- Source-analysis baseline: `fecfbce4e5eba42e238a9960f30e7cd049ed08ba` on
  `codex/integrate-generic-request-upstream`.
- Evidence: current source and routing inspected; `corepack pnpm check:design`
  passed for 27 canonical sources. An authenticated simulator walkthrough was
  not completed. Visual and interaction findings need runtime confirmation.
- Current focus: none assigned. Recommended first implementation task: **GR-1**.
- Authority: creating this plan authorized documentation only. Later user
  instructions determine which work to execute. Unchecked boxes do not authorize
  starting the entire backlog. Existing authorization carries across sessions.

## Overview

| Workstream | Outcome | Status | Dependency |
| --- | --- | --- | --- |
| GR-1 | Credential and data-signing reviews use current request patterns | Not started | Existing request-review primitives |
| GR-2 | Remaining request flows report delivery status accurately | Not started | Coordinate with GR-1; can be implemented separately |
| SH-1 | Selection and information sheets share the approved presentation | Not started | Existing canonical sheets; supports TX-1, RX-1, ID-1 |
| TX-1 | Current Send/Convert wizard uses shared layout and sheets | Not started | SH-1 for sheet migration |
| RX-1 | Receive choices are clear and payment requests have proper steps | Not started | SH-1 for sheet migration |
| ID-1 | VerusID linking, details, and status surfaces are consistent | Not started | SH-1 where a shared sheet is needed |
| QA-1 | Completed scope has recorded visual, behavioral, and review evidence | Not started | Applies to each delivered workstream |

Recommended sequence: GR-1 and GR-2 together, SH-1 with its first real consumer,
TX-1, RX-1, then ID-1. Apply QA-1 to every delivery rather than saving all QA for
the end. Small correctness fixes, such as misleading status text, may be pulled
forward with their own relevant checks.

## How an AI should maintain this file

1. Read this file, [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md),
   [TYPOGRAPHY.md](TYPOGRAPHY.md), and the relevant terms in
   [CONTEXT.md](CONTEXT.md). Current user instructions and the design contract
   remain authoritative; this plan is a backlog, not a replacement design system.
2. Select the authorized workstream. Record its status and current focus above.
   Recheck its current routes, source, Git state, active writers, and applicable
   workspace guidance. Treat baseline paths as starting points, not frozen code.
3. Use `- [ ]` for unfinished tasks and `- [x]` for completed tasks. Retain the
   text and task IDs. Do not delete completed work or rely on strikethrough alone.
4. Check an implementation task when that specific change is implemented and
   inspected. Keep verification boxes open until their evidence exists. Mark the
   workstream **Done** only when its acceptance criteria and relevant QA pass.
5. Use status **In progress**, **Blocked**, **Ready for verification**, or **Done**
   as appropriate. Blocked items remain unchecked. Record the specific blocker
   and next action; elapsed time is not approval or completion.
6. If a task is already solved elsewhere, verify the current implementation and
   record the supporting commit/evidence before checking it. If superseded,
   annotate it and link its replacement; do not mark it implemented.
7. Update the evidence log, current focus, and last-updated date after each
   coherent delivery or handoff. Record one concrete next action. This file
   should remain useful without access to the original chat.
8. Follow current repository rules for checks, reviews, scoped commits, and
   external actions. Keep incidental QA notes in `*.local.md` files. Never place
   credentials, wallet payloads, personal addresses/balances, or sensitive
   screenshots in this tracked plan.

Example resume request: “Work on TX-1 in UI_REDESIGN_PLAN.md. Complete the
authorized local implementation, relevant verification, and checklist update.”

## Preserve these boundaries

- The baseline enables `ENABLE_SIGNED_IN_REDESIGN` on both platforms. Wallet and
  coin-detail Send/Convert actions use `SendWizard`; Receive uses the Transfer
  screens. Recheck before editing. Do not blanket-redesign legacy
  `Coin/SendCoin`, `Coin/ConvertCoin`, or `Coin/ReceiveCoin` just because they exist.
- Authentication and app-encryption reviews, the dedicated Identity Update
  sequence, and the current invoice/revoke/recover work are references or nearby
  consumers. Regressions caused by shared changes are in scope; broad redesigns
  of those flows are not automatically included.
- Preserve source Asset, Card/subwallet, API channel, destination network,
  conversion route, recipient, fees, validation, signing, and transaction state.
- Preserve experimental request gating, credential scope filtering, required
  response signer restrictions, encryption requirements, and per-item consent.
- A signature, response delivery, transaction submission, and transaction
  confirmation are different events. Visible status must identify the event
  that actually occurred. Callback success does not prove payment settlement.
- Invoice-constrained amount, destination, network, route eligibility, and
  completion behavior must survive shared transfer changes. Do not substitute
  an unconstrained generic Send flow for invoice payment.
- Confirm a disposable Testnet wallet and VRSCTEST before authenticated wallet
  QA. Follow the current repository credential rules. Do not use mainnet wallets.
- These tasks do not authorize dependency churn, a package-manager migration,
  broad state-management refactors, backend capability expansion, or publication.

## Shared design starting points

| Need | Reuse or inspect |
| --- | --- |
| Theme and typography | [tokens.js](src/theme/onboarding/tokens.js), [TYPOGRAPHY.md](TYPOGRAPHY.md) |
| Floating sheet shell and dismissal lifecycle | [BottomSheetModal](src/components/BottomSheetModal.js) |
| Selection sheet | [IdentityPickerSheet](src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js) |
| Transfer-specific card selection reference | [CoinCardPickerSheet](src/containers/Coin/CoinCardPickerSheet.js) |
| Information sheet | [DeepLinkRequestSheetScaffold](src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js), [DeepLinkRequestDetailsSheet](src/containers/DeepLink/components/RequestReview/DeepLinkRequestDetailsSheet.js) |
| Request review | [AuthenticationRequestInfo](src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js), [AppEncryptionRequestInfo](src/containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js) |
| Full-screen stepped task | [ProgressHeader](src/components/ProgressHeader.js), [GiftCardFund](src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js) |
| Bottom actions and compact forms | [SafeBottomActionStack](src/components/SafeBottomActionStack.js), [AddressBookEditSheet](src/containers/Services/AddressBook/AddressBookEditSheet.js) |
| Search, copy, loading | [AppSearchField](src/components/AppSearchField.js), [AppSearchLauncher](src/components/AppSearchLauncher.js), [CopyAction](src/components/CopyAction.js), [SkeletonLoader](src/components/SkeletonLoader.js) |

Use the approved floating geometry, title/row/action spacing, and semantic states
from these components and DESIGN.md. A `BottomSheetModal` import alone does not
establish consistency. Keep long tasks full-screen and short choices/details in
sheets. Avoid new generic cards, decorative icons, repeated headings, and local
near-copies of existing controls.

## GR-1 — Credential and data-signing review

**Finding:** `UserDataRequestInfo` displays “Credential Request”. It and
`DataPacketRequestInfo` share hard-coded light styles, card-heavy layouts, older
buttons, and dense technical payload displays. Their identity chooser already
uses the canonical sheet. Both request types are experimentally gated.

**Sources:**
[UserDataRequestInfo](src/containers/DeepLink/UserDataRequestInfo/UserDataRequestInfo.js),
[DataPacketRequestInfo](src/containers/DeepLink/DataPacketRequestInfo/DataPacketRequestInfo.js),
[dataRequestInfo.styles](src/styles/deeplink/dataRequestInfo.styles.js),
[experimentalDeeplinks](src/utils/deeplink/experimentalDeeplinks.js),
[userDataRequestValidator](src/utils/deeplink/validator/userDataRequestValidator.js),
[scopedCredentials](src/utils/deeplink/credentials/scopedCredentials.js).

- [ ] **GR-1.1** Trace the current handler, validator, credential lookup, response
  builder, and screen props. Record supported data types and restrictions before
  changing presentation. Do not infer a general credential manager from this UI.
- [ ] **GR-1.2** State the small design contract using authentication/app-encryption
  review as the exemplar: requester, requested action, responding VerusID,
  inspectable details, and the next required action.
- [ ] **GR-1.3** Migrate both screens to semantic colors, shared typography,
  request-review composition, `AppButton`, and `SafeBottomActionStack`.
- [ ] **GR-1.4** Show understandable credential names and the data being shared.
  Put secondary scope/encoding metadata behind a details affordance; keep exact
  values inspectable without turning the main page into a JSON dump.
- [ ] **GR-1.5** Separate readable statements/data from hashes, bytes, and descriptor
  metadata in Data Packet review. Represent unknown or uninterpretable content
  honestly; never summarize arbitrary signatures as harmless authentication.
- [ ] **GR-1.6** Preserve per-credential and per-statement/data-item consent. Reset
  consent when the reviewed payload or responding identity changes. Do not
  remove required acknowledgements merely to reduce copy.
- [ ] **GR-1.7** Distinguish locked, loading, no matching credentials, partially
  available credentials, lookup failure, and required-signer-unavailable states.
  Do not report “no credentials” before a lookup has completed successfully.
- [ ] **GR-1.8** Give each state an accurate action label and recovery path. Make
  clear when continuing returns only some requested credentials or none.
- [ ] **GR-1.9** Verify consent gates, scope/signer/network restrictions, encrypted
  responses, signed-out entry, and mixed-detail requests using disposable data.
- [ ] **GR-1.10** Complete relevant QA-1 checks and record delivery evidence.

**Acceptance:** Both request types belong to the current review family in light
and dark mode. Users can understand and inspect what will be sent/signed, which
identity responds, and what is missing. Existing protocol restrictions and
informed consent remain intact. Delivery completion is tracked under GR-2.

## GR-2 — Accurate request completion and response delivery

**Finding:** User Data and Data Packet currently call the default `next` path.
Without another detail opting into automatic delivery, they reach the legacy
`GenericRequestComplete` screen, which displays “Success” before pressing
“Complete” attempts delivery. Newer flows already have a delivery sheet.

**Sources:**
[GenericRequestHome](src/containers/DeepLink/GenericRequestHome/GenericRequestHome.js),
[genericRequestCompletionFlow](src/containers/DeepLink/GenericRequestHome/genericRequestCompletionFlow.js),
[GenericRequestComplete](src/containers/DeepLink/GenericRequestComplete/GenericRequestComplete.js),
[genericRequestDelivery](src/utils/deeplink/genericRequestDelivery.js).

- [ ] **GR-2.1** Inventory remaining callers of legacy completion and determine
  which can use existing centralized delivery. Include mixed-detail ordering and
  requests with no response content or no callback destination.
- [ ] **GR-2.2** Route applicable credential/data-signing completion through the
  existing delivery mechanism. Avoid adding a second delivery implementation or
  changing the timing of user consent implicitly.
- [ ] **GR-2.3** Make visible states accurately describe response preparation,
  sending, sent, redirect handoff, and failed delivery. Preserve any separate
  transaction-result facts; do not imply final settlement from a sent response.
- [ ] **GR-2.4** Preserve duplicate-submission protection, retry behavior, the
  guarded exit after failure, and saved-request completion timing. Translate
  technical failures into clear guidance without claiming delivery succeeded.
- [ ] **GR-2.5** Verify POST success/failure/retry, redirect handoff, no-callback,
  mixed-detail requests, and repeated button taps using controlled fixtures.
  Record which result was observed and which remains unverified.
- [ ] **GR-2.6** Complete relevant QA-1 checks and record delivery evidence.

**Acceptance:** No broad “Success” state implies a response was delivered before
delivery occurs. Retry does not repeat already completed signing/payment work.
Remaining legacy completion callers are documented, with deliberate exceptions.

## SH-1 — Consistent sheet presentation and dismissal

**Finding:** Many transfer and VerusID sheets use the shared shell but explicitly
set `floating={false}` and duplicate their headers, rows, actions, and overflow
handling. Some clear visible content or navigate before the shell finishes closing.

- [ ] **SH-1.1** Inventory active consumers in TX-1, RX-1, and ID-1. Classify each
  as selection, information, compact form, blocking processing, or a full task.
  Record intentional exceptions rather than applying one height to everything.
- [ ] **SH-1.2** Compare the running identity selector and transfer card picker
  with proposed consumers at matching size/theme. Use DESIGN.md as authority.
- [ ] **SH-1.3** Reuse or minimally extract a shared selection composition from
  the approved pattern. Preserve transfer-specific balance, network, route, and
  address information; do not force it into identity-specific data structures.
- [ ] **SH-1.4** Reuse the information scaffold for fee and supported-chain details.
  If its DeepLink location obstructs reuse, extract the smallest shared component
  while preserving existing wrappers and behavior.
- [ ] **SH-1.5** Standardize floating geometry, semantic selected states, titles,
  action rows, keyboard handling, measured overflow cues, and quiet Done actions
  where appropriate. Preserve explicit exit controls for blocking/nested tasks.
- [ ] **SH-1.6** Separate visibility changes from destructive cleanup. Keep
  selected content mounted through closing; use `onClosed` for cleanup/navigation
  that must wait. Check rapid reopen and reduced-motion behavior.
- [ ] **SH-1.7** Migrate with a real consumer and verify existing canonical
  consumers immediately. Do not create a broad unused sheet framework.
- [ ] **SH-1.8** Complete relevant QA-1 checks and record migrated consumers and
  deliberate exceptions in the evidence log.

**Acceptance:** Migrated sheets feel like the same component family and preserve
their task-specific information. No blank/reset flash or competing navigation
occurs during dismissal. Canonical consumers retain their existing behavior.

## TX-1 — Current Send and Convert wizard

**Sources:**
[SendWizardNavigator](src/containers/SendWizard/SendWizardNavigator.js),
[SendWizardHeader](src/containers/SendWizard/components/SendWizardHeader.js),
[WizardUI](src/containers/SendWizard/components/WizardUI.js),
[SelectionSheets](src/containers/SendWizard/components/SelectionSheets.js),
[AddressBookSheet](src/containers/SendWizard/components/AddressBookSheet.js),
[SelfAddressSheet](src/containers/SendWizard/components/SelfAddressSheet.js),
[SendWizardConfirm](src/containers/SendWizard/SendWizardConfirm.js),
[SendWizardContext](src/containers/SendWizard/SendWizardContext.js).

- [ ] **TX-1.1** Confirm entry from Wallet and Asset detail in Send and Convert
  modes, including preselected Asset/Card and unavailable source states.
- [ ] **TX-1.2** Adopt `ProgressHeader` and the approved signed-in wizard
  composition. Preserve correct progress when steps are skipped. Expose one
  clear exit on initial/result states; retain necessary back navigation elsewhere.
- [ ] **TX-1.3** Migrate source Card, destination network, and route sheets through
  SH-1. Preserve eligibility, selected values, balances, and route distinctions.
- [ ] **TX-1.4** Migrate Address Book and self-address sheets. Retain search,
  network filtering, validation, and clear raw-address presentation.
- [ ] **TX-1.5** Move fee breakdown to the shared information pattern. Keep fees,
  conversion estimates, and any uncertainty understandable and accurately labeled.
- [ ] **TX-1.6** Defer selection-triggered navigation and Address Book handoff
  until sheet closure completes. Verify back navigation retains valid form data.
- [ ] **TX-1.7** Align amount, recipient, confirmation, processing, error, and
  result layouts. Reuse existing search, copy, skeleton, and safe-action controls.
- [ ] **TX-1.8** Verify relevant direct send, conversion, cross-chain destination,
  no eligible route, insufficient funds, fee/preflight failure, processing, and
  result states. Preserve all Card/channel and transaction constraints.
- [ ] **TX-1.9** Complete relevant QA-1 checks and record delivery evidence.

**Acceptance:** The active wizard uses the current stepped-task and sheet
patterns without obscuring source/destination networks, route choice, fees, or
recipient. Existing transfer restrictions and state transitions still hold.

## RX-1 — Receive and payment-request creation

**Sources:**
[ReceiveAssetsList](src/containers/Transfer/ReceiveAssetsList.js),
[ReceiveSubwalletSheet](src/containers/Transfer/ReceiveSubwalletSheet.js),
[ReceiveAssetDetails](src/containers/Transfer/ReceiveAssetDetails.js),
[receive.styles](src/containers/Transfer/receive.styles.js).

- [ ] **RX-1.1** Trace Wallet/Asset entry, Card selection, address selection,
  supported-chain information, and payment-request generation separately.
- [ ] **RX-1.2** Rename the Card selector’s misleading “Choose address” title to
  “Choose a card”. Keep network context visible and show a current selection when
  the invoking flow has one. Preserve the Card-to-address/channel relationship.
- [ ] **RX-1.3** Remove duplicate address-selection headings and migrate Card,
  address, and supported-chain sheets through SH-1.
- [ ] **RX-1.4** Use consistent identifier typography and shared copy feedback.
  Verify the full copied address and displayed QR belong to the selected Card
  and network; keep address distinctions required by the current channel.
- [ ] **RX-1.5** Convert the amount/subject/settings/result payment-request flow
  into a full-screen stepped task with `ProgressHeader` and safe bottom actions.
  Inspect the current field rules before deciding which optional steps can be
  combined. Document any justified alternative before implementing it.
- [ ] **RX-1.6** Add proper back navigation that preserves valid inputs. Make
  cancellation/re-entry deliberate; do not reset visible content mid-dismissal.
- [ ] **RX-1.7** Preserve request amount, currency, subject, settings, QR encoding,
  and share semantics. Request creation must not be described as receiving money.
- [ ] **RX-1.8** Verify empty/loading/error states, one/multiple Cards, applicable
  address types/networks, optional fields, keyboard layouts, back/cancel/reopen,
  generated request decoding, and result display with disposable fixtures.
- [ ] **RX-1.9** Complete relevant QA-1 checks and record delivery evidence.

**Acceptance:** Users can distinguish choosing an Asset, a Card, and an address.
Simple choices use consistent sheets. Payment-request creation has understandable
steps, a working back path, and a result accurately tied to its generated data.

## ID-1 — VerusID linking, details, and status refinement

**Sources:**
[SignedInVerusIdService](src/containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdService.js),
[SignedInVerusIdDetails](src/containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails.js),
[VerusIdObjectData](src/components/VerusIdObjectData.js),
[LinkExistingVerusIdSheet](src/containers/DeepLink/components/VerusIdIdentityPickerSheet/LinkExistingVerusIdSheet.js),
[LinkIdentityForm](src/components/SendModal/LinkIdentity/LinkIdentityForm/LinkIdentityForm.render.js),
[DeepLinkVerusIdDetailsSheet](src/containers/DeepLink/components/RequestReview/DeepLinkVerusIdDetailsSheet.js).

- [ ] **ID-1.1** Trace automatic linking, manual fallback, and request-resume paths
  separately. Automatic discovery already uses the newer component; retain it.
- [ ] **ID-1.2** Bring manual input, review, loading, error, and result into the
  current linking experience. Preserve network/ownership checks and the ability
  to inspect the resolved identity before completing any required confirmation.
- [ ] **ID-1.3** Migrate pending-status and unlink sheets through SH-1. Make the
  useful refresh/retry action prominent and removal secondary where appropriate.
  Keep unlink distinct from on-chain revocation, deletion, or recovery.
- [ ] **ID-1.4** Use `onClosed` for manual-modal handoff, pending selection cleanup,
  and any navigation that requires the sheet to finish closing. Retain error
  contents until dismissal ends and block conflicting actions while processing.
- [ ] **ID-1.5** Refine the detail hierarchy: identity name, status, and network
  first; understandable authority/control information; secondary technical data
  progressively disclosed. Preserve important warnings and complete identifiers.
- [ ] **ID-1.6** Replace copy-alert interactions in the touched details path with
  `CopyAction`. Account for other users of `VerusIdObjectData` before shared edits.
- [ ] **ID-1.7** Remove the unconditional “No attestations linked” assertion unless
  backed by an actual result. Prefer omitting the unsupported section; adding a
  new attestation-loading feature is a separate scope decision.
- [ ] **ID-1.8** Use stable loading treatment and readable retry guidance for
  linked-list/detail failures. Ensure a refresh failure is visible even when old
  identity data remains on screen; do not expose raw RPC errors as the main copy.
- [ ] **ID-1.9** Consolidate the informational sheet where practical, remove
  repeated copy, use “VerusID” consistently, and label icon-only controls for
  accessibility. Preserve state-aware scrolling and overflow cues.
- [ ] **ID-1.10** Verify no identities, several identities, long names, discovery
  empty/error, manual link validation, pending/failed status, details loading/error,
  copy feedback, and unlink cancellation. Verify security-sensitive mutations only
  in the authorized disposable Testnet setup.
- [ ] **ID-1.11** Complete relevant QA-1 checks and record delivery evidence.

**Acceptance:** Automatic and manual paths form one coherent experience. Details
and status are concise and truthful. Copy feedback is unobtrusive. Unlinking is
understandable and remains distinct from changes to the identity on-chain.

## QA-1 — Completion criteria for each workstream

These criteria apply to each delivered scope. The overview’s QA-1 row becomes
Done only when all delivered workstreams have their applicable evidence. Until
then, record coverage per workstream in the log rather than claiming a global pass.

- [ ] **QA-1.1** Every completed workstream has a recorded design contract,
  implementation commit/candidate, touched paths, and acceptance outcome.
- [ ] **QA-1.2** Every redesigned surface has been compared with its canonical
  exemplar in light and dark mode at normal and compact sizes. Include relevant
  empty, selected, loading, error, keyboard, processing, and result states.
- [ ] **QA-1.3** Navigation, sheet dismissal/reopen, system back, reduced motion,
  safe areas, scrolling, labels/focus, and text scaling have applicable evidence.
  Do not infer accessibility compliance from screenshots alone.
- [ ] **QA-1.4** Relevant design, safe-area, parser/bundle, and behavior checks
  have passed or have precise documented limitations. Do not add new Jest tests
  unless the user explicitly asks; follow current repository validation guidance.
- [ ] **QA-1.5** Meaningful behavior changes have the required independent review,
  with reviewer selection based on actual changed risk. Resolve blocking findings
  and record the final candidate reviewed. Follow current AGENTS/skill procedures.
- [ ] **QA-1.6** Shared changes have checked affected existing consumers, especially
  authentication, Identity Update, invoice payment, and Card selection where used.
- [ ] **QA-1.7** Completion claims are supported by the right evidence: source,
  rendered UI, native behavior, response delivery, and transaction confirmation
  are recorded separately. Unverified platforms/states remain explicitly open.
- [ ] **QA-1.8** The final checklist and log reflect delivered Git state. Any
  known remaining issue has a task ID, clear next action, and owner or blocker.

Useful checks, selected for the actual change:

```sh
corepack pnpm check:design
corepack pnpm check:safe-areas <touched-ui-files>
git diff --check
```

The baseline design check protects 27 canonical sources. It does not scan every
screen for adoption and does not replace rendered QA. Add narrow mechanical
coverage only when a concrete recurring failure warrants it; do not turn this
plan into a repository-wide migration test project.

## Evidence and handoff log

| Date | Scope | Candidate / commit | Evidence and result | Remaining / next action |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Initial analysis | `fecfbce4` | Source/routing review; design check passed for 27 canonical sources; no authenticated visual walkthrough | Plan created; implementation tasks remain unchecked |

Append one row per coherent delivery. Link safe local QA notes or durable evidence
where appropriate, and distinguish worktree verification from integration into
the target branch. Never check an item solely because a design image or source
patch exists.

### Resume note

- Last completed action: source findings organized into this plan.
- Workstream in progress: none.
- Suggested next action: when implementation is authorized, start GR-1 and plan
  its GR-2 delivery integration using current authentication/app-encryption flows.
- Outstanding evidence gap: authenticated native walkthrough, both themes,
  normal/compact layouts, and applicable Android states have not been established
  by the initial analysis.
- Decisions/blockers: none blocking maintenance of this plan. Runtime prerequisites
  and specific design contracts must be established for the selected workstream.
