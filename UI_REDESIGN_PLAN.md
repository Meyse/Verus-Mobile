# Wallet UI redesign and consistency plan

This is the maintained checklist for completing the remaining GenericRequest,
Send, Convert, Receive, and VerusID design work. Use it to resume a scoped task
without repeating the entire investigation.

## Current position

- Created: 2026-09-10.
- Last updated: 2026-09-12.
- Status: SH-1 and RX-1 complete for their scoped local deliveries. GR-1 and
  GR-2 implementation is present; their remaining native runtime QA is tracked
  below.
- Source-analysis baseline: `fecfbce4e5eba42e238a9960f30e7cd049ed08ba` on
  `codex/integrate-generic-request-upstream`.
- Evidence: source and fixture behavior checks, the data-lab Mobile contract suite,
  isolated iOS/Android native previews, and Android build/entry checks.
  Authenticated wallet delivery remains open; see the GR-1/GR-2 log entries.
- Current focus: **RX-1 complete** with the user-requested system amount
  keypad, 196 native gallery captures, 32 passing focused behavior checks, and
  ready high-risk and design reviews. The next scoped implementation is the
  remaining TX-1 work when authorized. Broader authenticated/runtime and
  accessibility follow-up remains explicitly tracked under QA-1.
- Authority: creating this plan authorized documentation only. Later user
  instructions determine which work to execute. Unchecked boxes do not authorize
  starting the entire backlog. Existing authorization carries across sessions.

## Overview

| Workstream | Outcome | Status | Dependency |
| --- | --- | --- | --- |
| GR-1 | Credential and data-signing reviews use current request patterns | Ready for verification | Existing request-review primitives |
| GR-2 | Remaining request flows report delivery status accurately | Ready for verification | Coordinate with GR-1; can be implemented separately |
| SH-1 | Selection and information sheets share the approved presentation | Done | Existing canonical sheets; supports TX-1, RX-1, ID-1 |
| TX-1 | Current Send/Convert wizard uses shared layout and sheets | Sheet tasks delivered through SH-1; remaining work not started | SH-1 for sheet migration |
| RX-1 | Receive choices are clear and payment requests have proper steps | Done | SH-1 for sheet migration |
| ID-1 | VerusID linking, details, and status surfaces are consistent | Not started | SH-1 where a shared sheet is needed |
| QA-1 | Completed scope has recorded visual, behavioral, and review evidence | Relevant SH-1 checks complete; GR-1/GR-2 runtime evidence remains open | Applies to each delivered workstream |

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

- [x] **GR-1.1** Trace the current handler, validator, credential lookup, response
  builder, and screen props. Record supported data types and restrictions before
  changing presentation. Do not infer a general credential manager from this UI.
- [x] **GR-1.2** State the small design contract using authentication/app-encryption
  review as the exemplar: requester, requested action, responding VerusID,
  inspectable details, and the next required action.
- [x] **GR-1.3** Migrate both screens to semantic colors, shared typography,
  request-review composition, `AppButton`, and `SafeBottomActionStack`.
- [x] **GR-1.4** Show understandable credential names and the data being shared.
  Put secondary scope/encoding metadata behind a details affordance; keep exact
  values inspectable without turning the main page into a JSON dump.
- [x] **GR-1.5** Separate readable statements/data from hashes, bytes, and descriptor
  metadata in Data Packet review. Represent unknown or uninterpretable content
  honestly; never summarize arbitrary signatures as harmless authentication.
- [x] **GR-1.6** Preserve per-credential and per-statement/data-item consent. Reset
  consent when the reviewed payload or responding identity changes. Do not
  remove required acknowledgements merely to reduce copy.
- [x] **GR-1.7** Distinguish locked, loading, no matching credentials, partially
  available credentials, lookup failure, and required-signer-unavailable states.
  Do not report “no credentials” before a lookup has completed successfully.
- [x] **GR-1.8** Give each state an accurate action label and recovery path. Make
  clear when continuing returns only some requested credentials or none.
- [ ] **GR-1.9** Verify consent gates, scope/signer/network restrictions, encrypted
  responses, signed-out entry, and mixed-detail requests using disposable data.
- [ ] **GR-1.10** Complete relevant QA-1 checks and record delivery evidence.

**Implemented design contract (2026-09-10):** Authentication and app-encryption
review are the exemplars. Both screens reuse semantic theme/typography,
`DeepLinkRequestSourceCard`, request details and identity picker sheets,
`AppButton`, `SafeBottomActionStack`, `CopyAction`, and `SkeletonLoader`.
Credential values and readable signed data stay on the main review; exact
keys, hashes, bytes, scope, and descriptor data are inspectable in sheets.
Per-item checkboxes deliberately remain. Compact pages opt into the existing
sheet scroll cue so content below the requester remains discoverable.
The shared details-sheet body shrinks within the modal's height constraint so
Done remains inside its rounded boundary. Signing errors remain visible above
the primary action in the normal-flow footer, outside the scrolling review.

**Protocol coverage:** User Data supports scoped, encrypted full-credential
responses only; missing keys produce partial or empty contributions. A lookup
or decryption error is a retryable error, never an empty result. Data Packet
supports the handler's messages, descriptors, and statements; opaque bytes
remain explicitly unreadable. Validator, experimental gate, network, required
signer, and encryption restrictions remain authoritative. Native fixture
rendering substitutes wallet storage and signing; GR-1.9 remains open for an
authenticated disposable-wallet mixed request and callback walkthrough.

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

- [x] **GR-2.1** Inventory remaining callers of legacy completion and determine
  which can use existing centralized delivery. Include mixed-detail ordering and
  requests with no response content or no callback destination.
- [x] **GR-2.2** Route applicable credential/data-signing completion through the
  existing delivery mechanism. Avoid adding a second delivery implementation or
  changing the timing of user consent implicitly.
- [x] **GR-2.3** Make visible states accurately describe response preparation,
  sending, sent, redirect handoff, and failed delivery. Preserve any separate
  transaction-result facts; do not imply final settlement from a sent response.
- [x] **GR-2.4** Preserve duplicate-submission protection, retry behavior, the
  guarded exit after failure, and saved-request completion timing. Translate
  technical failures into clear guidance without claiming delivery succeeded.
- [x] **GR-2.5** Verify POST success/failure/retry, redirect handoff, no-callback,
  mixed-detail requests, and repeated button taps using controlled fixtures.
  Record which result was observed and which remains unverified.
- [ ] **GR-2.6** Complete relevant QA-1 checks and record delivery evidence.

**Completion inventory (2026-09-10):** Credential and Data Packet now opt into
centralized delivery. Authentication, app-encryption, and spendable-key flows
already do so. Mixed requests retain the existing accumulated completion policy.
`WalletBackupRequestInfo` and the older `InvoicePaymentConfiguration` retain
legacy completion; its pre-delivery copy now says “Ready to finish” and
“Response not sent”. Dedicated invoice results and inline Identity Update retain
their distinct transaction/update facts. The shared delivery path caches a
prepared signed/encrypted response per request/response pair for retry, rechecks
authentication expiry, and reports POST, redirect, and no-response outcomes
separately. Failure exit does not mark the saved request complete.

**Acceptance:** No broad “Success” state implies a response was delivered before
delivery occurs. Retry does not repeat already completed signing/payment work.
Remaining legacy completion callers are documented, with deliberate exceptions.

## SH-1 — Consistent sheet presentation and dismissal

**Finding:** Many transfer and VerusID sheets use the shared shell but explicitly
set `floating={false}` and duplicate their headers, rows, actions, and overflow
handling. Some clear visible content or navigate before the shell finishes closing.

- [x] **SH-1.1** Inventory active consumers in TX-1, RX-1, and ID-1. Classify each
  as selection, information, compact form, blocking processing, or a full task.
  Record intentional exceptions rather than applying one height to everything.
- [x] **SH-1.2** Compare the running identity selector and transfer card picker
  with proposed consumers at matching size/theme. Use DESIGN.md as authority.
- [x] **SH-1.3** Reuse or minimally extract a shared selection composition from
  the approved pattern. Preserve transfer-specific balance, network, route, and
  address information; do not force it into identity-specific data structures.
- [x] **SH-1.4** Reuse the information scaffold for fee and supported-chain details.
  If its DeepLink location obstructs reuse, extract the smallest shared component
  while preserving existing wrappers and behavior.
- [x] **SH-1.5** Standardize floating geometry, semantic selected states, titles,
  action rows, keyboard handling, measured overflow cues, and quiet Done actions
  where appropriate. Preserve explicit exit controls for blocking/nested tasks.
- [x] **SH-1.6** Separate visibility changes from destructive cleanup. Keep
  selected content mounted through closing; use `onClosed` for cleanup/navigation
  that must wait. Check rapid reopen and reduced-motion behavior.
- [x] **SH-1.7** Migrate with a real consumer and verify existing canonical
  consumers immediately. Do not create a broad unused sheet framework.
- [x] **SH-1.8** Complete relevant QA-1 checks and record migrated consumers and
  deliberate exceptions in the evidence log.

**SH-1 inventory and design contract (2026-09-11):**

| Active surface | Classification | SH-1 disposition |
| --- | --- | --- |
| Send/Convert source Card, destination network, route | Selection | Migrated to `SelectionSheet` and semantic selected rows; existing eligibility, balance and route data preserved |
| Send saved addresses and self addresses | Searchable selection / selection | Migrated; address/network filtering preserved; exact address remains available; Address Book navigation deferred until closed |
| Send confirmation fee breakdown | Information | Migrated to `InfoSheet` with unchanged fee data and preflight explanation |
| Receive Card and address choice | Selection | Migrated; Card and address choices are named separately; selection applied after closing |
| Receive supported chains | Information | Migrated to `InfoSheet`, section rows, measured overflow and quiet Done |
| VerusID chooser and Coin Card picker | Specialized selection exemplars | Retain canonical composition; regression checked alongside migrated sheets |
| Address Book edit and manual identity link | Compact form / nested form | Retain existing dedicated keyboard and save/link handling; broader migration belongs to TX-1 / ID-1 |
| Receive payment-request amount/subject/settings/result | Full task | Migrated by RX-1.5 to a full-screen stepped task (`ReceivePaymentRequestFlow`) with `ProgressHeader`, `FadedScrollView` and `SafeBottomActionStack`; the 90% attached sheet is removed |
| VerusID discovery/linking | Nested searchable task | Retain canonical floating 76% sheet and existing post-close manual-link handoff |
| VerusID explanation FAQ | Information with disclosure | Existing floating sheet retained; FAQ consolidation and copy remain ID-1.9 |
| VerusID pending status and unlink confirmation | Action/status and destructive confirmation | Keep explicit guarded exit and action behavior; lifecycle/presentation migration stays with ID-1.3 |
| GenericRequest delivery and Identity Update processing | Blocking processing / stepped task | Preserve existing completion, consent and transaction semantics |

The shared selection composition follows the running identity selector's floating
shell, 18-point row radius, 16-point row inset, 4-point row spacing and semantic
success selection. `SelectionRow` uses a 56-point minimum and grows for balances,
network/route details, complete addresses, and text scaling. Titles use the shared
20/26 role; task rows use the canonical 62-point minimum. The searchable
saved-address sheet fills the 76% shell to keep loading, empty,
error and loaded states stable. With the Android keyboard open, it uses 90% of
the remaining height and moves the management action into the scroll content so
one complete address remains legible; Android uses native modal resizing. The
fade gives way to the native scroll indicator below a 128-point viewport. Other short
choices retain their intrinsic height. The information scaffold
and rows moved to `InfoSheet` / `InfoSheetSection`, retaining the DeepLink exports
as compatibility wrappers. `SheetScrollView` supplies the existing measured fade
and chevron to both families. Simple sheets dismiss by outside tap/system back;
information sheets also have the quiet 56-point Done action.

Visibility is separate from pending source/target/Card content. `useSheetDismissal`
queues one choice or navigation callback for `onClosed`, cancels it on a rapid
reopen, and dismisses the keyboard. Existing shell animation and reduced-motion
behavior remain authoritative. No signing, preflight, transaction, invoice, or
identity-management capability is changed.

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
- [x] **TX-1.3** Migrate source Card, destination network, and route sheets through
  SH-1. Preserve eligibility, selected values, balances, and route distinctions.
- [x] **TX-1.4** Migrate Address Book and self-address sheets. Retain search,
  network filtering, validation, and clear raw-address presentation.
- [x] **TX-1.5** Move fee breakdown to the shared information pattern. Keep fees,
  conversion estimates, and any uncertainty understandable and accurately labeled.
- [ ] **TX-1.6** Defer selection-triggered navigation and Address Book handoff
  until sheet closure completes. Verify back navigation retains valid form data.
  SH-1 implements the post-close callbacks; authenticated wizard back-navigation
  verification remains open in TX-1.
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

- [x] **RX-1.1** Trace Wallet/Asset entry, Card selection, address selection,
  supported-chain information, and payment-request generation separately.
- [x] **RX-1.2** Rename the Card selector’s misleading “Choose address” title to
  “Choose a card”. Keep network context visible and show a current selection when
  the invoking flow has one. Preserve the Card-to-address/channel relationship.
- [x] **RX-1.3** Remove duplicate address-selection headings and migrate Card,
  address, and supported-chain sheets through SH-1.
- [x] **RX-1.4** Use consistent identifier typography and shared copy feedback.
  Verify the full copied address and displayed QR belong to the selected Card
  and network; keep address distinctions required by the current channel.
- [x] **RX-1.5** Convert the amount/subject/settings/result payment-request flow
  into a full-screen stepped task with `ProgressHeader` and safe bottom actions.
  Inspect the current field rules before deciding which optional steps can be
  combined. Document any justified alternative before implementing it.
- [x] **RX-1.6** Add proper back navigation that preserves valid inputs. Make
  cancellation/re-entry deliberate; do not reset visible content mid-dismissal.
- [x] **RX-1.7** Preserve request amount, currency, subject, settings, QR encoding,
  and share semantics. Request creation must not be described as receiving money.
- [x] **RX-1.8** Verify empty/loading/error states, one/multiple Cards, applicable
  address types/networks, optional fields, keyboard layouts, back/cancel/reopen,
  generated request decoding, and result display with disposable fixtures.
- [x] **RX-1.9** Complete relevant QA-1 checks and record delivery evidence.

**Implemented design contract and data trace (2026-09-11):** Entry is Wallet →
`ReceiveAssetsList`, or Asset detail → `ReceiveAssetDetails` with
`{coinId, subWalletId}` from `SignedInCoinDetail`. `receiveCardsForCoin` filters
Cards by `WALLET_APP_RECEIVE` and an address channel; `getExplicitAddressRecords`
reads `activeAccount.keys[coinObj.id][card.api_channels[API_GET_ADDRESSES]].addresses`
with labels from `card.address_info`; the Card therefore owns the channel, the
channel owns the address list, and the copied address and receive QR are the same
selected record. Card network copy uses `getSubWalletNetworkLabel`. Supported
chains remain informational (`getSupportedNetworks`). Payment requests stay
separate in `generateReceiveInvoice`.

The design contract follows the canonical Gift Card stepped task: `ProgressHeader`,
20-point horizontal / 24-point top / 28-point bottom insets,
`theme.typography.headlineMd` (28/36) step title with a 22-point title-block gap,
one primary `SafeBottomActionStack` action per step, `FadedScrollView` content and
header back. RX-1.5 replaced the 90% attached payment-request sheet with
`ReceivePaymentRequestFlow`: conversion-eligible Cards use amount → optional
subject → conversion settings → result, non-conversion Cards keep amount → result
with the v0 QR and camera-roll save. Subject and settings stay separate steps.
RX-1.4 uses the established platform monospace convention for raw addresses
(`Menlo` on iOS, `monospace` on Android) while human VerusID names keep normal
type, and the details screen offers accurate loading/empty/error states with a
safe exit instead of an empty Card chooser. RX-1.6 keeps step inputs across back,
intercepts system back and removal gestures through `beforeRemove` to match the
header back, invalidates in-flight generation on cancel/unmount/context change,
single-flights creation and QR saving, and binds the result QR, amount, share
message and save source to the generated snapshot. A pending generation is never
a dead end: the header back and an explicit `Cancel` action both invalidate the
generation before leaving, and every QR save completion is bound to the request
and save operation that started it. RX-1.7 preserves the invoice contract,
including the subject being share-message only and not encoded in the modern
VerusPay invoice, and replaces raw RPC/file errors with concise recovery
guidance. No wallet permission, share or save is invoked automatically.

The amount step uses a normal editable `AppTextInput` driven by the system
`decimal-pad` keypad — the same native input and keyboard mechanism as the
slippage field — instead of the custom on-screen numeric keypad, which is
removed. The field keeps the currency beside it, the fiat estimate and the
fiat/coin switch, autofocuses on entry, and preserves the previous plain-decimal
input contract (digits and one locale decimal separator, 18-character ceiling) so
a paste such as `1e5` or `0x10` cannot validate into an unintended invoice. The
rest of the step machine, single-flight generation, save binding, cancel and
back handling are unchanged.

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
| 2026-09-12 | RX-1 accepted local delivery | Task-owned delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; exact commit in the local QA receipt | Full-screen request flow with the system decimal amount keypad, native subject/slippage fields, safe footer, preserved invoice/share contracts, and operation-bound cancel/save behavior. 32/32 independent focused checks pass; design (30 canonical sources), safe-area, parser, both native preview bundles and production iOS bundle pass. 196 native gallery captures include 120 static Receive/canonical states plus request, keyboard, error, cancellation, save, copy/selection and scrolled states across iOS/Android normal/compact and light/dark. Native copied change address matches the full fixture value; native QR images decode; QR save succeeds on both platforms. Same high-risk reviewer and design adviser are READY with no unresolved findings; full source guards identical (2,970 files, six generated/cache exclusions). [Screenshot gallery](docs/rx1-qa-20260911/index.html); [QA and commit receipt](docs/rx1-qa-20260911/qa.local.md) | RX-1.8–1.9 complete for disposable-fixture delivery. No personal/mainnet wallet, live RPC, signing, funds movement or settlement proof. Full VoiceOver/TalkBack, exhaustive text scaling and native reduced-motion settings remain QA-1 follow-up; sampled native and shared-source evidence are recorded. |
| 2026-09-11 | RX-1 Receive and payment-request implementation + correction passes | Uncommitted local delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; the parent commits after acceptance | Full-screen stepped payment-request task, platform monospace addresses, accurate Card/address states, `beforeRemove` parity with header back, stale-completion invalidation and single-flight create/QR-save guards. Corrections after an independent high-risk review: operation-bound QR save completion (a late save cannot mark a newer request saved, attach its failure or clear a newer guard) and a real cancel path while generation is pending (header back and `Cancel` invalidate generation identity before leaving; no stranded loading). Preview fixtures now use distinct per-Card address channels and real system i-addresses, and the harness gives details/wizard a real previous route with an optional chrome-free launch state. 27 focused non-Jest behaviour checks pass, including the real-StackRouter route-removal checks, the deferred-per-save CameraRoll checks, the actual preview fixture dataset and the actual preview invoice stub driving the real encoder/decoder; design check (30 canonical sources), safe-area, Babel parse (5 files) and production iOS bundle (46 assets) pass; both preview bundles compile and the production bundle contains no fixture references. The independent high-risk reviewer passed that candidate with no findings. [Local RX-1 QA](docs/rx1-qa-20260911/qa.local.md); [preview harness](docs/rx1-qa-20260911/index.js) | Superseded by the 2026-09-12 native-QA corrections below. RX-1.8–1.9 stay open. |
| 2026-09-12 | RX-1 native-QA corrections (third pass) | Uncommitted local delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; the parent commits after acceptance | Two production corrections taken from actual native screenshots: the absent-address row is now a wrapping body sentence with no copy affordance, while real addresses keep identifier typography and the copy control; and the payment-request flow reserves Android keyboard space (`KeyboardAvoidingView` `height` under the manifest's `adjustPan`) so the subject and slippage footers stay reachable, with iOS keeping `padding`. Fixture-only repairs: the preview store now processes `PUSH_MODAL`/`REMOVE_MODAL` through the production modal reducer and seeds `state.modal.stack`, so sheets no longer crash the native modal chain; the list loading scenario now uses the real pre-Card-directory loading contract instead of rendering an empty list; and two new scenarios mount the **real** `GiftCardFund` screen (fund and create modes) with an exact synthetic Card, a real funding coin/VRPC source address/ledger balance, and an origin-scoped inert service-storage stub that cannot read a password or keychain entry. 30 focused non-Jest checks pass, including three new guards each verified to fail against the pre-fix code; design check (30 canonical sources), safe-area checks (3 changed, 8 Transfer), Babel parse (10 files), preview iOS/Android bundles and the production iOS bundle (46 assets, 0 fixture references) pass. [Local RX-1 QA](docs/rx1-qa-20260911/qa.local.md) | RX-1.8–1.9 remain open. Native proof is partial: the parent captured iOS normal and iPhone SE compact surfaces plus Android amount/subject/settings/result and decoded each result QR (one QR per result, 158 characters), but the sheet scenarios and the canonical Gift Card comparison have not been captured on a device yet, and no independent review verdict exists for this corrected candidate. Next: parent re-captures the corrected matrix, compares against the real Gift Card screen, then runs the same report-only reviews and commits. |
| 2026-09-12 | RX-1 native amount keypad (fourth pass) | Uncommitted local delivery over `19a5ede5` on `codex/integrate-generic-request-upstream`; the parent commits after acceptance | User-requested amount change: the custom on-screen `NumericKeypad` is removed from `ReceivePaymentRequestFlow` and replaced by the shared editable `AppTextInput` with `keyboardType="decimal-pad"`/`inputMode="decimal"`, the same native input and keyboard mechanism as the slippage field and canonical `GiftCardFund`. The amount autofocuses on entry and on return, keeps the currency beside the field, the fiat estimate and the fiat/coin switch, and adds `maxLength` plus a plain-decimal guard (`isPlainAmountInput`/`getAmountInputError`) so a pasted `1e5`/`0x10` cannot validate. Amount, currency, switch, estimate, validation and step semantics are unchanged, as are single-flight generation, save binding, cancel and back handling. 32 focused non-Jest checks pass (two new: the plain-decimal guard and the native field shape/paste guard); design check (30 canonical sources), safe-area check (2 changed files), Babel parse (2 files), preview iOS (25 assets) and Android (27 assets) bundles and the production iOS bundle (46 assets, 0 fixture references) pass. [Local RX-1 QA](docs/rx1-qa-20260911/qa.local.md) | RX-1.8–1.9 remain open. Parent still owns the final native amount captures (iOS normal/SE-compact, Android normal, light/dark), the sheet/canonical comparisons, the independent high-risk and design reviews, and the commit. No native evidence was captured in this pass. |
| 2026-09-11 | SH-1 shared selection and information sheets | Local delivery over `51672964` on `codex/integrate-generic-request-upstream`; exact commit in the local QA report | Nine migrated sheets; canonical identity/Card/request-details regression evidence. 133 native gallery entries plus seven before captures cover iOS/Android, light/dark, normal/compact and focused loading/error/keyboard/overflow states. Design, safe-area, parser, focused dismissal/selection checks and production iOS bundle pass. Independent design and behavior reviews are ready, with unchanged repository guards. [Screenshot gallery](docs/sh1-qa-20260911/index.html); [QA report](docs/sh1-qa-20260911/qa.local.md) | SH-1 complete. Screenshots use actual components with synthetic Testnet data. Authenticated wallet journeys and full VoiceOver/TalkBack traversal remain with the owning TX-1/RX-1/ID-1 and QA-1 tasks. Next scoped implementation: remaining TX-1 work when authorized. |
| 2026-09-10 | GR-1 Android QA and layout corrections | Task-owned candidate over `4decf026` | Android native build/entry and 41 fixture screenshots recorded. Corrected tall details-sheet overflow and kept signing errors beside the action. Native iOS/Android light/dark, normal/compact layout and consent/failure checks pass; design, safe-area, parser and iOS bundle checks pass. [Android QA](docs/gr12-android-qa-20260910/qa.local.md); [correction evidence](docs/gr12-ui-fix-20260910/qa.local.md) | Authenticated wallet signing/callbacks and remaining accessibility evidence remain open. The original overflow reproduced on Android; the normal iOS baseline already fit. |
| 2026-09-10 | GR-1 / GR-2 local implementation | Task-owned candidate over `75592c0f` on `codex/integrate-generic-request-upstream` | Shared themed credential/Data Packet review; explicit consent; cached completion retry; authoritative session/lifecycle/expiry guards before signing. Design/safe-area/parser/iOS bundle, focused non-Jest state/delivery checks, and harness contract checks pass. iOS fixture render/interaction evidence and independent review records: [local QA report](gr12-qa.local.md) | GR-1.9–1.10 and GR-2.6 remain open for authenticated native callbacks/mixed-order walkthrough, Android, and remaining accessibility evidence. No mainnet wallet accessed. |
| 2026-09-10 | Initial analysis | `fecfbce4` | Source/routing review; design check passed for 27 canonical sources; no authenticated visual walkthrough | Plan created; implementation tasks remain unchecked |

Append one row per coherent delivery. Link safe local QA notes or durable evidence
where appropriate, and distinguish worktree verification from integration into
the target branch. Never check an item solely because a design image or source
patch exists.

### Resume note

- Last completed action: RX-1 accepted local delivery with the native system
  amount keypad, 196 native screenshots, 32 passing focused checks, and ready
  independent high-risk/design reviews. RX-1.1–1.9 are complete for the scoped
  disposable-fixture delivery. The gallery and exact commit receipt are in
  `docs/rx1-qa-20260911`; no push or publication is part of this delivery.
- Next action: resume remaining TX-1 work when authorized. TX-1.6 retains
  authenticated back-navigation walkthroughs. Global QA-1 retains broader
  authenticated/runtime and accessibility proof beyond RX-1's sampled native
  and source verification; see the RX-1 QA report for exact limits.
- Earlier GR-1/GR-2 runtime follow-up remains open: GR-1.9–1.10, GR-2.6,
  authenticated mixed-detail delivery on both platforms, and remaining
  accessibility checks. Local delivery and reviewer evidence are in the linked
  GR reports.
- Previously recorded GR runtime gap: the normal simulator has competing preview-app deeplink handlers;
  the compact simulator reaches the actual Testnet unlock sheet but its selected
  disposable profile could not be unlocked with the available setup. Isolated
  native fixtures verify rendering and interaction, not wallet signing or live
  callback delivery. No personal/mainnet wallet was unlocked.
- Owners: the GR-1/GR-2 follow-up task retains its runtime gaps; the next TX-1
  task owns the remaining Send/Convert work. ID-1 retains its listed
  exceptions and unfinished tasks.
