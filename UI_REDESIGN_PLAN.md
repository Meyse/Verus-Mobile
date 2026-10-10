# Wallet UI redesign and consistency plan

This is the maintained checklist for completing the remaining GenericRequest,
Send, Convert, Receive, and VerusID design work. Use it to resume a scoped task
without repeating the entire investigation.

## Current position

- Created: 2026-09-10.
- Last updated: 2026-10-09.
- Status: SH-1, RX-1, and ID-1 complete for their scoped local deliveries. The
  scoped ID-1 delivery is committed as `33865cab` and locally integrated into
  `codex/integrate-generic-request-upstream`; its rendered/native QA and the
  single independent high-risk review are done. GR-1 and GR-2 implementation is
  present; their remaining native runtime QA is tracked below. Global QA-1 stays
  open across workstreams.
- Source-analysis baseline: `fecfbce4e5eba42e238a9960f30e7cd049ed08ba` on
  `codex/integrate-generic-request-upstream`.
- Evidence: source and fixture behavior checks, the data-lab Mobile contract suite,
  isolated iOS/Android native previews, and Android build/entry checks.
  Authenticated wallet delivery remains open; see the GR-1/GR-2 log entries.
- Current focus: **GR-3** on `codex/gr3-request-matrix`. Phase 2 is done: the
  user agreed the bug list and Phase 3 scope, and the agreed functional fixes
  (GR3-B6, B3, B2, R1) are verified on the iOS simulator, uncommitted. GR3-B4
  waits by user choice. Compact screenshots are deferred, and the
  physical-iPhone run remains. Phase 3 redesign is next. GR-3 covers the
  GR-1/GR-2 runtime follow-up.
- Previous focus: **ID-1 complete and locally integrated**, committed as
  `33865cab` on `codex/id1-redesign` and integrated into
  `codex/integrate-generic-request-upstream`. RX-1 remains complete with the
  user-requested system amount keypad, 196 native gallery captures, 32 passing
  focused behavior checks, and ready high-risk and design reviews. The next
  scoped implementation is the remaining TX-1 work when authorized. Broader
  authenticated/runtime and accessibility follow-up remains explicitly tracked
  under QA-1.
- Authority: creating this plan authorized documentation only. Later user
  instructions determine which work to execute. Unchecked boxes do not authorize
  starting the entire backlog. Existing authorization carries across sessions.

## Overview

| Workstream | Outcome | Status | Dependency |
| --- | --- | --- | --- |
| GR-1 | Credential and data-signing reviews use current request patterns | Ready for verification | Existing request-review primitives |
| GR-2 | Remaining request flows report delivery status accurately | Ready for verification | Coordinate with GR-1; can be implemented separately |
| GR-3 | Every GenericRequest type has runtime evidence; remaining request surfaces use the current design | In progress | GR-1, GR-2; deeplink-sim and provisioning webhook |
| SH-1 | Selection and information sheets share the approved presentation | Done | Existing canonical sheets; supports TX-1, RX-1, ID-1 |
| TX-1 | Current Send/Convert wizard uses shared layout and sheets | Sheet tasks delivered through SH-1; remaining work not started | SH-1 for sheet migration |
| RX-1 | Receive choices are clear and payment requests have proper steps | Done | SH-1 for sheet migration |
| ID-1 | VerusID linking, details, and status surfaces are consistent | Done | SH-1 where a shared sheet is needed |
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
“Response not sent”. (GR-3.12 removed this exception and the legacy screen on
2026-10-10.) Dedicated invoice results and inline Identity Update retain
their distinct transaction/update facts. The shared delivery path caches a
prepared signed/encrypted response per request/response pair for retry, rechecks
authentication expiry, and reports POST, redirect, and no-response outcomes
separately. Failure exit does not mark the saved request complete.

**Acceptance:** No broad “Success” state implies a response was delivered before
delivery occurs. Retry does not repeat already completed signing/payment work.
Remaining legacy completion callers are documented, with deliberate exceptions.

## GR-3 — GenericRequest runtime matrix and remaining request redesign

**Finding (2026-10-09, source only):** Mobile accepts nine GenericRequest
detail types. Most review screens use the current design. No authenticated
end-to-end run covers all types. The legacy `GenericRequestComplete` screen still
ends invoice and wallet-backup flows. `WalletBackupRequestInfo` still uses legacy
colors and Paper controls. The “Open in another app” pill in
`GenericRequestHome` uses legacy colors and absolute positioning. Rejected
requests show only an alert.

**Scope decisions (user, 2026-10-09):**

- Exclude DeFi. That is conversion and cross-chain invoice payment. Test invoices
  with native VRSCTEST only. The protocol has no separate DeFi detail type.
- Do not redesign, generate, or test the deprecated LoginConsent v1 and VerusPay
  invoice v1 links. Leave them as they are.
- Test wallet backup and the QR scan path on a physical iPhone with an NFC tag.
- Android gets one smoke pass per type in Phase 4, not the full matrix.
- Add new request generators to deeplink-sim on a separate branch.

**Request inventory (source verdict, 2026-10-09):**

| Detail type | Screen | Design state | Test request source |
| --- | --- | --- | --- |
| Authentication | `AuthenticationRequestInfo` | Current (exemplar) | deeplink-sim |
| Authentication + provision identity | `ProvisionIdentityBottomSheet` | Current | `verus-fake-provisioning-webhook` |
| App encryption | `AppEncryptionRequestInfo` | Current (exemplar) | New deeplink-sim generator |
| Identity update | `IdentityUpdateRequestInfo` and its steps | Current (exemplar); content step keeps Paper rows | deeplink-sim fixture setup; new variants |
| User data (credential) | `UserDataRequestInfo` | Current (GR-1) | deeplink-sim data lab |
| Data packet | `DataPacketRequestInfo` | Current (GR-1) | deeplink-sim data lab |
| VerusPay invoice | `InvoiceInfo`, invoice form/review/result | Current; ends on legacy completion | deeplink-sim invoice lab |
| Spendable key (gift card claim) | `SpendableKeyRequestInfo` | Current | Mobile Gift Card service |
| Create wallet backup (NFC only) | `WalletBackupRequestInfo` | Partial; ends on legacy completion | Physical iPhone and NFC tag |

Mixed requests are in scope: authentication with credential, data packet,
invoice, app encryption, or provisioning; credential and data packet in both
orders.

**Test bench:** The local VRSCTEST `verusd` (RPC port 18843) signs requests as
`TestBob.antafri@`. deeplink-sim runs from the `deeplink-sim-deps-update`
worktree. The provisioning webhook runs from `verus-fake-provisioning-webhook`.
Links open with `xcrun simctl openurl` on simulators that hold only the Verus
Mobile debug build. Use only disposable VRSCTEST profiles and identities.

Phase 0 — test bench:

- [x] **GR-3.1** Create the task branch `codex/gr3-request-matrix` from
  `codex/sync` and record this workstream.
- [x] **GR-3.2** Prepare clean normal and compact iOS simulators that hold only
  the Verus Mobile debug build, so no other app claims `verus://` links.
- [x] **GR-3.3** Create a fresh disposable VRSCTEST profile. Enable experimental
  GenericRequests and development HTTP callbacks.
- [x] **GR-3.4** Give the profile a VerusID through the provisioning webhook and
  fund it with a small VRSCTEST amount. Record this as the provisioning run.
  Deviation: Testnet rejects every sub-ID registration ("DeFi functions
  temporarily disabled"), and the app fails after the provisioning POST (bug
  GR3-B1). By user choice, the daemon test ID `liveqa09482856.antafri@` got the
  test wallet's R-address as a second primary address and its shielded address
  as private address. The app linked it through automatic discovery in a
  sign-in request. The provisioning row stays Blocked in the matrix.
- [x] **GR-3.5** Add the missing deeplink-sim generators: app encryption,
  authentication with app encryption, identity-update variants, and negative
  cases (wrong network, expired, bad signature, unknown detail, experimental
  setting off, over-length link).
- [x] **GR-3.6** Confirm that `xcrun simctl openurl` delivers a harness link to
  the debug build and reaches the review screen.

Phase 1 — test run (report only; fix only bugs that block the matrix):

- [x] **GR-3.7** Run each type and mixed request: approve, decline, and Back.
  Run each delivery mode: POST, fail once, fail always, redirect, and no callback.
  Record the observed screen, verified callback, and confirmed transaction as
  separate facts.
  Done on the iPhone 17 Pro simulator, except wallet backup (GR-3.9). All five
  delivery modes ran on authentication + app encryption; identity update ran
  POST and fail once; the other types ran POST. Two matrix-blocking bugs were
  fixed (GR3-B1 provisioning session, GR3-B5 identity content lookup). Four
  bugs stay open for triage (GR3-B2, B3, B4, B6).
- [ ] **GR-3.8** Capture light/dark and normal/compact screenshots of every
  review, processing, result, and error state.
  Light and dark at normal size are captured. Compact is deferred (user,
  2026-10-10): the compact simulator has no profile yet.
- [ ] **GR-3.9** Run wallet backup and the QR scan path on the physical iPhone.
- [ ] **GR-3.10** Write the local report and gallery. Give each row Works,
  Broken, or Blocked with the reason.
  Draft: local `gr3-matrix.local.md` and `docs/qa/gr3/gallery.html`. It becomes
  final after GR-3.8 and GR-3.9.

Phase 2 — triage:

- [x] **GR-3.11** Agree the bug list and redesign scope with the user. Fix
  functional bugs first. Reproduce each bug before its fix.
  Root causes (2026-10-10, local `gr3-matrix.local.md`): B6 is a missing
  `detachInactiveScreens={false}` on the invoice and identity-safety modal
  navigator, so every touch reaches JS twice. B3 is the app-encryption screen's
  own loading sheet colliding with the delivery sheet. B2 is a missing
  `resetDeeplinkData()` after provisioning. B4 is a primitives library Buffer
  defect under Hermes. P1 follows upstream behavior.
  Agreed (user, 2026-10-10): fix B6, B3, B2 and R1 now; leave B4 for later
  (harness workaround stays); all four Phase 3 groups are in scope. Done: each
  bug was reproduced, fixed, and rerun with real taps (see the evidence log).
  P1 stays an upstream question.

Phase 3 — remaining redesign (one scoped delivery each):

- [ ] **GR-3.12** Move invoice and wallet backup from `GenericRequestComplete` to
  the centralized delivery path. Keep the payment result separate from response
  delivery. This replaces the GR-2 exception for these two callers.
  Implemented 2026-10-10: after the last detail, a response with
  details always goes through the delivery sheet; an empty response with no
  detail asking for the sheet finishes without one, because invoices and wallet
  backups add nothing to send and their own screens show the outcome. A detail
  that asks for delivery (for example missing credentials) keeps the “Request
  complete” notice. The legacy screen, its route, and its styles are removed.
  Invoice-only verified on the simulator; wallet backup (no NFC on the
  simulator) and the skipped-backup passthrough are verified by source only and
  wait for the physical iPhone (GR-3.9). The wallet-backup screen still shows
  no “backup written” result; add it in GR-3.13.
- [ ] **GR-3.13** Migrate `WalletBackupRequestInfo` to the semantic theme and
  shared controls. Verify it on the physical iPhone with NFC.
- [ ] **GR-3.14** Fix the small leftovers: the “Open in another app” pill, the
  `InvoicePaymentConfiguration` fallback root, and the Identity Update content
  step Paper rows. Added (user, 2026-10-10): the empty band under “View request
  details” on every review (GR3-D8), the “1 hours” expiry copy (GR3-D9), and the
  “Secure POST” label on plain HTTP destinations (GR3-D6).
- [ ] **GR-3.15** Replace rejection alerts with a request error state that gives
  recovery guidance (GR3-D1). In scope by user choice, 2026-10-10.
- [ ] **GR-3.18** Identity Update high-risk steps: show the address that gains
  control, the current and new authorities, and full names without mid-token
  breaks (GR3-D10, GR3-D2). Add the destination and fee to the gift-card claim
  review. Added by the user, 2026-10-10.
- [ ] **GR-3.19** Mixed requests: tell the user when a second step follows the
  sign-in review (GR3-D11). Added by the user, 2026-10-10.

Phase 4 — regression:

- [ ] **GR-3.16** Rerun the matrix on the final branch. Run one Android smoke
  pass per type.
- [ ] **GR-3.17** Close GR-1.9, GR-1.10, and GR-2.6 where the evidence supports
  it. Refresh `docs/genericrequest-types-and-chains.html`. Complete the relevant
  QA-1 checks.

**Acceptance:** Every in-scope type and mixed request has a recorded runtime
result with its proof level. No in-scope flow ends on the legacy completion
screen. All in-scope request surfaces belong to the current review family in
light and dark mode. Shared changes leave the excluded and deprecated flow
code untouched.

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

- [x] **ID-1.1** Trace automatic linking, manual fallback, and request-resume paths
  separately. Automatic discovery already uses the newer component; retain it.
- [x] **ID-1.2** Bring manual input, review, loading, error, and result into the
  current linking experience. Preserve network/ownership checks and the ability
  to inspect the resolved identity before completing any required confirmation.
- [x] **ID-1.3** Migrate pending-status and unlink sheets through SH-1. Make the
  useful refresh/retry action prominent and removal secondary where appropriate.
  Keep unlink distinct from on-chain revocation, deletion, or recovery.
- [x] **ID-1.4** Use `onClosed` for manual-modal handoff, pending selection cleanup,
  and any navigation that requires the sheet to finish closing. Retain error
  contents until dismissal ends and block conflicting actions while processing.
- [x] **ID-1.5** Refine the detail hierarchy: identity name, status, and network
  first; understandable authority/control information; secondary technical data
  progressively disclosed. Preserve important warnings and complete identifiers.
- [x] **ID-1.6** Replace copy-alert interactions in the touched details path with
  `CopyAction`. Account for other users of `VerusIdObjectData` before shared edits.
- [x] **ID-1.7** Remove the unconditional “No attestations linked” assertion unless
  backed by an actual result. Prefer omitting the unsupported section; adding a
  new attestation-loading feature is a separate scope decision.
- [x] **ID-1.8** Use stable loading treatment and readable retry guidance for
  linked-list/detail failures. Ensure a refresh failure is visible even when old
  identity data remains on screen; do not expose raw RPC errors as the main copy.
- [x] **ID-1.9** Consolidate the informational sheet where practical, remove
  repeated copy, use “VerusID” consistently, and label icon-only controls for
  accessibility. Preserve state-aware scrolling and overflow cues.
- [x] **ID-1.10** Verify no identities, several identities, long names, discovery
  empty/error, manual link validation, pending/failed status, details loading/error,
  copy feedback, and unlink cancellation. Verify security-sensitive mutations only
  in the authorized disposable Testnet setup.
- [x] **ID-1.11** Complete relevant QA-1 checks and record delivery evidence.

**Implementation (verified and review-ready; committed as `33865cab` and
locally integrated):** manual entry, validation, identity resolution, the
resolved-identity review, the linking loading state, and the actionable failure
now live inside the shared
`LinkExistingVerusIdSheet` instead of the legacy SendModal link flow. The manual
step reuses the compact-form composition from `AddressBookEditSheet`
(`AppTextInput` plus `SafeBottomActionStack`) and the review reuses
`InfoSheetSection` with the section builder exported from
`DeepLinkVerusIdDetailsSheet`, so both the signed-in VerusID service and the
GenericRequest identity picker share one experience. Resolution stays read-only:
automatic discovery still queries `getIdentitiesWithAddress` with the stored
Redux VRPC R-address, and manual resolution calls `getIdentity` on the sheet's own
chain and matches the result against the wallet's stored VRPC addresses for the
ownership check, so no seed, private key, or signing material is requested.
Active-status, network/system, duplicate-link, and primary-address ownership
checks run in the sheet and remain enforced by the existing parent link paths.
The linked result is the refreshed list entry or request selection that the
existing parent flow already performs, so automatic and manual linking end in the
same place instead of adding a second result surface.
The signed-in service links under a captured session scope and re-asserts it
after each awaited step, so a late completion from another account cannot mark a
link or close a newer sheet.

Pending status and unlink confirmation are now floating shared sheets driven by
`useSheetDismissal`: refresh/retry is primary, removal/unlink is
secondary/destructive, every control disables while processing, cleanup and
selection clearing happen in `onClosed`, request-resume navigation waits for the
status sheet to close, and `goBack` waits for the unlink sheet to close. The
unlink copy states that it only removes the local wallet association and does not
revoke, delete, recover, or change the VerusID on-chain. The signed-in details
screen consumes a new `presentation="signedInDetails"` variant of
`VerusIdObjectData`: the name is the screen title, status/network/identifiers lead
the rows, warnings and authority/control information follow, identity content and
the private address start collapsed, copy uses inline `CopyAction`, refresh
failure stays visible above stale-but-useful data, and the unsupported
“No attestations linked” section is gone. The informational sheet now composes
the shared `InfoSheet` (measured overflow cue included) with one definition line
instead of duplicating the “What is VerusID?” heading.

**Correction (session-bound linking and resumption, follow-up):** the first
candidate passed rendered-source review but failed independent high-risk review,
so the following corrections are part of the committed `33865cab` delivery. The
shared `LinkExistingVerusIdSheet` now captures a real wallet session scope
(account hash plus login epoch) for both automatic discovery and manual lookup,
re-checks it after every await and immediately before it hands a candidate to a
parent, invalidates discovery/resolution/review when the scope changes, and
carries immutable origin metadata on every candidate. The three parents
(`AuthenticationRequestInfo`, `AppEncryptionRequestInfo`,
`SignedInVerusIdService`) revalidate that the candidate's chosen primary
R-address belongs to the currently scoped account's VRPC address array for the
candidate chain in addition to the identity's own primary-address list, so a
candidate resolved for one account can never link into another even when both
share the same first R-address. `processVerusId` gained a backward-compatible
optional guard that is checked after the pending-request storage await and
immediately before every dispatch and navigation; the signed-in service supplies
the captured session plus a synchronous operation token, and both the retry and
READY-row resume paths are single-flight so a stale completion cannot dispatch,
navigate, reopen a fallback sheet, clear a newer operation, or attach an error to
a newer session. The unlink confirmation's queued `goBack` now re-checks the
immutable originating session and route/focus ownership at execution time (the
unlink token is deliberately not used, because `onClosed` bumps it first). A
pending-status sheet that becomes READY now closes so the READY row's guarded
Link action takes over, with truthful "Ready to link" copy if it renders before
closing. The remaining legacy Authentication manual fallback now routes into the
shared manual step with the request network and a prefilled FQN, and the touched
consumers no longer open the legacy SendModal link UI. `IdentityPickerSheet`'s
nested Back transition guards on the synchronous `linkBusyRef` instead of the
React `linkBusy` state so a same-frame Back cannot leave the link step.

**Correction (final lifecycle defects, follow-up):** the same independent
high-risk reviewer rechecked the corrected candidate, closed five findings, and
returned two reproduced P2 lifecycle defects, now corrected. First, the unlink
confirmation's delayed callback validated against `renderedSessionScopeRef`
(rewritten on every render), so after an account/session change the old callback
could validate against the new session and call `goBack`. The callback now
carries the immutable `requestContext.sessionScope` captured when the unlink
started, alongside the unchanged mounted, focused-route, and route-key checks;
the unlink token is still deliberately unused because `onClosed` bumps it first.
Second, the READY-resume single-flight flag was cleared only by the old
promise's `finally`, so an unresolved run left the component rejecting every
later READY action. `createVerusIdResumeOwner` in `verusIdFlowGuards.js` now
binds the in-flight flag and token to the owning session scope: an account-hash
or session-epoch change invalidates the old token and releases the gate
synchronously, while a stale `catch`/`finally` cannot reopen a fallback, attach
an error, navigate, or clear a newer run's gate. Both defects are covered by the
real queued-callback and handler behavior with deferred promises, each confirmed
to fail when its fix is reverted by mutation.

**Final verification (iOS fixture, rendered and native):** the committed final
candidate `33865cab` was compiled into a task-owned iOS release fixture bundle
from the actual candidate (26 assets) and exercised with synthetic disposable
VRSCTEST states on a normal 402x874 simulator and a compact iPhone SE, in light
and dark. Covered:
no identities, several identities, long names, discovery loading/empty/error, the
always-reachable manual fallback, manual validation/lookup/resolved review/
failure, processing single-flight with blocked dismissal/Back, pending
error/progress/READY actions, details loading/error/long values, separate
accessible `CopyAction` nodes with copied feedback, unlink cancellation/failure,
and the rebuilt final details spot check. Native QA found a manual-row clipping,
corrected before the final capture. The same and only independent Astra
high-risk reviewer returned READY with all original and follow-up findings
closed, against a complete before/after state guard (1,702 files, no exclusions,
identical). Parent-owned visual QA applied the canonical SH-1/onboarding
patterns at normal/compact and light/dark; because the user required exactly one
independent reviewer, no second design-adviser reviewer was added, and the
single reviewer explicitly applied `max-product-design-taste` while reviewing
the final renders. Proof limits: fixture data and API are synthetic and cannot
sign, spend, move funds, expose a real key, or prove live RPC or
authenticated-wallet behavior, and callback or session authentication is not
transaction or settlement proof; native proof is iOS only. Android runtime, full
VoiceOver/TalkBack, exhaustive text scaling/reduced motion, and authenticated
disposable-wallet mutation remain explicitly unverified follow-up, not implied
passes. Node was 22.18.0 because the requested 22.23.2 was unavailable; checks
used the canonical sibling `node_modules`, and no source depends on it.

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
| 2026-10-10 | GR-3.12 legacy completion removed | `codex/gr3-request-matrix` after `b09f9622`: `genericRequestCompletionFlow.js`, `GenericRequestHome.js`, `DeepLinkStackScreens.js`, `styles/index.js`; deleted `GenericRequestComplete.js` and its styles; updated completion test and checks | iPhone 17 Pro simulator, fresh launch with the new bundle, real taps. Baseline first: auth + invoice already used the delivery sheet after the send modal closed (Response sent, harness received; no refused presentation in the iOS log). After the change: invoice-only payment txid `5bf7884ce618c857a50b14b82c810e8956138ea6d2159049ca5589d07d08ffe6` (mempool), Payment submitted → Done → Wallet with no legacy screen, deeplink cleared. Regression: missing credentials still shows “Request complete / No response was sent”; auth + app encryption POST verified by the harness. Checks: completion Jest suite 9/9 and node check 11 cases pass; parse, `check:design`, `check:safe-areas --changed` pass. `check-generic-request-delivery.js` still fails to load on an existing missing module; its legacy-screen assertions are removed. `genericResponseNetwork.unit.test.js` cannot run (stale `react-native` mock) and still expects the removed route; separate task suggested. | Wallet backup and skipped-backup completion on the physical iPhone (GR-3.9); “backup written” result in GR-3.13. |
| 2026-10-10 | GR-3 Phase 2 functional fixes | `codex/gr3-request-matrix`, uncommitted: `SendModal.render.js`, `AppEncryptionRequestInfo.js` + styles, `AuthenticationRequestInfo.js`, `responseDeliverySecurity.js` | iPhone 17 Pro simulator, VRSCTEST, fresh app launch with the fixed bundle (confirmed in the served bundle), real taps only. GR3-B6: invoice modal now has one `RCTTouchHandler` (lldb) and each touch reaches JS once; Payment details, Done and Send work; payment txid `198d753515400cc59f9bede57fa79ac5232e901941ebcd29bb8488f2e44b5254` (daemon mempool, then balance 4.9684); invoice-only still ends on legacy completion (GR-3.12). Revoke modal (same branch) opened with a throwaway authority: one touch handler, single touch events, back press works; nothing submitted. Recover shares the branch; not run. GR3-B3: auth + app encryption, all five delivery modes, harness-verified: POST (1 verified attempt), fail once (Try again, attempt 2), fail always (Try again fails, Leave without sending returns to Wallet), redirect (Browser opened sheet, Done), no callback (Request complete sheet, no callback). Error sheet also checked in dark mode. The new “Preparing response” button state is too short to capture. GR3-B2: reproduced (stale provisioning request on the next link), then fixed: deeplink ID is null after provisioning and the next link opens its own request. GR3-R1: HTTP response POSTs now need `__DEV__` and the env flag; existing unit tests pass. Checks: Babel parse of changed files, `responseDeliverySecurity` and `genericRequestCompletionFlow` suites pass; `genericRequestDelivery` suite fails to load (store import chain, `constants.js:159`, not touched); `check:design` and `check:safe-areas --changed` pass. New notes: a JS reload crashes the debug app while shielded sync runs (`VerusLightClient` sends on the old bridge; GR3-E2); `react-native-tab-view` 3.5.2 logs a dev “key prop spread” error in the send modal. | Phase 3 (GR-3.12 to GR-3.15, GR-3.18, GR-3.19). Android smoke for B6 in Phase 4. Commit when the user asks. |
| 2026-10-10 | GR-3 Phase 2 triage (root causes) | `codex/gr3-request-matrix`, no new code changes | GR3-B6 reproduced on the iPhone 17 Pro simulator with a fresh invoice: a JS hook logged each touch twice inside the invoice send modal and once on the main screen, and lldb showed two `RCTTouchHandler`s in one view chain (modal root and `RNSScreenView`). Cause: the invoice and identity-safety `Root.Navigator` lacks `detachInactiveScreens={false}`, which upstream `ac501c65` added to the other modal navigators. GR3-B3 cause from source and the Phase 1 log: `AppEncryptionRequestInfo` keeps its loading sheet open while the delivery sheet presents. GR3-B2 and GR3-B4 causes confirmed in source. GR3-D12 is an alert rendered under native modals, not the B3 race. GR3-P1 matches upstream behavior. Fixes not yet applied or run. | User agreement on the bug list and scope (GR-3.11); then the functional fixes, each reproduced first. Revoke/Recover identity likely share B6 (not yet run). |
| 2026-10-09 | GR-3 Phase 1 matrix (iOS normal size) | `codex/gr3-request-matrix`, uncommitted fixes in `ProvisionIdentityBottomSheet.js` and `getIdentityContent.js`; deeplink-sim harness fixes uncommitted on `codex/gr3-generators` | iPhone 17 Pro simulator, VRSCTEST. Harness-verified callbacks: authentication + app encryption (all five delivery modes), data packet, credential (matching, partial; missing correctly sends none), both credential/data-packet orders, authentication + data packet, + credential, + invoice. Confirmed VRSCTEST transactions: three identity updates, two invoice payments, gift card fund and spendable-key claim. All six negative cases rejected with no callback. Dark mode renders correctly. Fixed and verified: GR3-B1 (provisioning sheet session context), GR3-B5 (identity content lookup rejected testnet names). Open: GR3-B2 stale deeplink after provisioning, GR3-B3 delivery sheet not presented under the detail screen's processing sheet (stuck dim screen on failure and no-callback), GR3-B4 long FQN request IDs crash parsing under Hermes, GR3-B6 invoice send modal ignores presses. Protocol question GR3-P1 (authentication response request ID). Details: local `gr3-matrix.local.md`, `docs/qa/gr3/phase1/`. | Compact screenshots (needs simulator access approval), physical-iPhone wallet backup and QR scan (GR-3.9), then GR-3.11 triage. |
| 2026-10-09 | GR-3 Phase 0 test bench | `codex/gr3-request-matrix` from `d4e1dbd1`; generators uncommitted on deeplink-sim `codex/gr3-generators` | Fresh iOS debug build from this checkout runs on two clean simulators (iPhone 17 Pro, iPhone SE). A disposable VRSCTEST profile exists with experimental requests on and 5 VRSCTEST funding. The app's key for `v2api.verustest.net` returns HTTP 401, so the profile uses the in-app Custom RPC override `https://api.verustest.net` (GR3-B0). A provisioning link opened with `simctl openurl` reaches the redesigned authentication review. deeplink-sim now generates app-encryption, identity-update, and negative requests (typecheck, 155 tests). Findings and screenshots: local `gr3-matrix.local.md` and `docs/qa/gr3/`. | Phase 0 done. The test VerusID is the reused daemon ID `liveqa09482856.antafri@` (update txid `48a95967…`), linked by discovery. Provisioning stays Blocked (Testnet DeFi outage, GR3-B1). Next: Phase 1 matrix. |
| 2026-10-09 | Upstream sync review fixes | Commit on `codex/sync` after merge `c615aabc` | The review found two dropped upstream warnings. Gift Card detail now shows an "Unfunded gift card" notice before an empty card is shared. It reuses the existing shared-notice block, and the card back keeps one short line. The Identity Update content step restores upstream's caveat that a removal can affect values added in the same update. It shows only for mixed content-map changes and uses the card inset. The legacy convert confirmation suite loads again with one `InvoicePaymentReview` mock. A mutation of the uncertain-broadcast guard fails 3 of its 15 cases. Design (30 sources), safe-area (3 files), no-undef lint, `git diff --check`, and 7 related suites (120 tests) pass. Synthetic iOS fixture captures on the real overview and content step cover unfunded, funded, and shared-empty cards and mixed and private-only content, in light and dark at compact and normal sizes. Captures are local in `docs/qa/merge-review-fixes/screenshots`. | Committed locally; no push. The other review findings remain open: confirm-step state fallback, inline lock explanation, wizard funding-error guide action, share after funding, the Android Media3 pin, and the glog privacy bundle. Android runtime and authenticated journeys remain unverified. |
| 2026-10-09 | Upstream sync with redesign preservation | `codex/sync`, based on `ccc0c256`, merges `dev-asf-parent` through `7d74cd6a` | Updated the four pinned Verus libraries together and integrated RN 0.77.3. Kept local layouts, shared primitives, themes, storage queues, and session guards. Adapted identity state/threshold review, content semantics, gift-card first-funding rules, and uncertain-broadcast protection to the redesign. Both native builds and both production JS bundles pass. Design (30 sources), targeted safe-area (5 files), parser (119 files), and focused flow checks pass. Six corrected/boundary suites pass 96 tests. The APK passes 16 KB ELF/ZIP checks for 34 libraries. Inspected 32 real-component iOS fixture captures across light/dark and normal/compact, plus actual production welcome in both themes. Corrected compact truncation of the new identity status labels. [Local receipt](docs/qa/upstream-sync/qa.local.md); [capture gallery](docs/qa/upstream-sync/gallery.local.html). | Ten imported UI suites are blocked by legacy native/theme mocks; no full-suite pass. Fixture captures do not prove authenticated journeys. Android runtime, live signing/transfers, existing-profile migration, NFC, and full accessibility remain unverified. Earlier GR/TX/RX/ID follow-ups and global QA checkboxes retain their recorded scope. No push. |
| 2026-09-12 | ID-1 final acceptance (scoped local delivery) | Committed as `33865cab` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; verified and review-ready, locally integrated into `codex/integrate-generic-request-upstream` | Final verification of the ID-1 candidate. The parent independently ran 10 focused ID-1 suites (63 tests), `git diff --check`, Babel parse for all 9 changed production JS files, design contract (30 canonical sources), safe-area (9 files), search-field (15 files), identity-authority funding (PASS), and GenericRequest completion flow (9 cases). A task-owned iOS release fixture bundle compiled from the actual candidate (26 assets), and synthetic disposable VRSCTEST states were exercised on a normal 402x874 simulator and a compact iPhone SE with light/dark captures, covering no identities, several identities, long names, discovery loading/empty/error, the always-reachable manual fallback, manual validation/lookup/resolved review/failure, processing single-flight with blocked dismissal/Back, pending error/progress/READY actions, details loading/error/long values, separate accessible `CopyAction` nodes and copied feedback, unlink cancellation/failure (unlink remains a local association change only), and the rebuilt final details spot check. Native QA found a manual-row clipping, corrected before the final capture. The same and only independent Astra high-risk reviewer returned READY with all original and follow-up findings closed; the complete before/after state guard was 1,702 files, no exclusions, identical. Parent-owned visual QA applied the canonical SH-1/onboarding patterns at normal/compact and light/dark; because the user required exactly one independent reviewer, no second design-adviser reviewer was added, and the single reviewer explicitly applied `max-product-design-taste` while reviewing the final renders. Proof limits: fixture data and API are synthetic and cannot sign, spend, move funds, expose a real key, or prove live RPC or authenticated-wallet behavior, and callback or session authentication is not transaction or settlement proof; native proof is iOS only. Android runtime, full VoiceOver/TalkBack, exhaustive text scaling/reduced motion, and authenticated disposable-wallet mutation remain explicitly unverified follow-up, not implied passes. Node was 22.18.0 because the requested 22.23.2 was unavailable; checks used the canonical sibling `node_modules`, and no source depends on it. | ID-1.10–1.11 complete for the scoped local delivery. ID-1 is verified and review-ready, committed as `33865cab` and locally integrated into `codex/integrate-generic-request-upstream`; `origin/codex/integrate-generic-request-upstream` remains behind until a separately authorized push. Global QA-1 stays open for the other workstreams. |
| 2026-09-12 | ID-1 final lifecycle corrections (two P2 defects) | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | Corrects the two reproduced P2 lifecycle defects from the same independent high-risk reviewer (five earlier findings already closed). (1) The unlink confirmation's delayed `goBack` callback now passes the immutable `requestContext.sessionScope` captured when the unlink started instead of the per-render `renderedSessionScopeRef`, keeping the mounted/focused-route/route-key checks. (2) `SignedInVerusIdService` now owns its READY-resume single-flight flag through the new `createVerusIdResumeOwner` guard (`verusIdFlowGuards.js`), which binds the in-flight flag/token to the session scope and releases the gate synchronously on an account-hash or session-epoch change, so an unresolved run cannot lock later READY actions; stale `catch`/`finally` stay inert. New focused regression coverage exercises the real queued callback and handler with deferred promises (`SignedInVerusIdLifecycle` 4, plus `verusIdFlowGuards` resume-owner cases now 15) and each defect was separately reverted by mutation to confirm the tests fail. The 10 focused ID-1 suites pass (63 tests). Babel parse (5 files), `git diff --check`, design contract (30 canonical sources), `check-safe-areas --changed` (9 files), `check-search-fields --changed` (15 files), `check-generic-request-completion-flow` (9 cases), and `check-identity-authority-funding` pass. HEAD unchanged at `a607faf6`; dependencies resolved through a temporary `NODE_PATH` to the sibling checkout (no source change depends on it). | ID-1.10–1.11 stay open for the parent: rendered light/dark normal/compact empty/error/keyboard/processing captures, the independent design-adviser pass, and the same reviewer's re-closure of these two corrections before acceptance and commit. |
| 2026-09-12 | ID-1 high-risk review corrections | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | Correction of the six blocking findings from the single independent high-risk review. New `src/utils/verusid/verusIdFlowGuards.js` holds the shared, tested decisions: candidate origin capture/match, pending-status-sheet dismissal, and the delayed-unlink navigation guard. `LinkExistingVerusIdSheet` binds discovery and manual lookup to the account hash plus login epoch, checks the scope after every await and before linking, and stamps immutable origin metadata on each candidate; `AuthenticationRequestInfo`, `AppEncryptionRequestInfo`, and `SignedInVerusIdService` revalidate the candidate's primary R-address against the current account's VRPC addresses and reject a stale origin. `processVerusId` now takes a backward-compatible optional guard checked after the storage await and before every dispatch/navigation; the signed-in service supplies the captured session plus a synchronous operation token, and retry/READY resume are single-flight with no stale dispatch, navigation, fallback reopen, state clearing, or cross-session error. The queued unlink `goBack` re-checks the originating session and focused route at execution time. A status sheet that becomes READY closes instead of showing false `In progress` copy. The Authentication passthrough fallback and the touched manual routes use the shared manual sheet with a prefilled FQN; no touched ID-1 path opens the legacy SendModal link UI. `IdentityPickerSheet` Back now guards on the synchronous `linkBusyRef`. Focused Jest suites added: `verusIdFlowGuards` (12), `processVerusIdResumeGuard` (4), `id1LinkFailureRouting` (2), and `IdentityPickerSheet` (3, including the ref-guard case confirmed to fail against the prior state-based Back guard). The four new suites plus 11 relevant existing suites pass (15 suites / 79 tests); Babel parse for the changed/new JS files, `git diff --check`, design contract (30 canonical sources), `check-safe-areas` (6 files), `check-search-fields --changed` (14 files), `check-generic-request-completion-flow` (9 cases), and `check-identity-authority-funding` pass. | ID-1.10–1.11 remain open: no rendered or native capture exists for the corrected manual/review/pending/unlink/details states, and the parent must re-run the independent high-risk and design reviews on this corrected candidate before acceptance and commit. This pass added no simulator/fixture files. Verification used a temporary `node_modules` symlink to the sibling checkout because this worktree has no installed dependencies and the sandboxed pnpm store is not writable; no source change depends on it. |
| 2026-09-12 | ID-1 correction adoption and verification pass | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | The prior correction candidate was inspected as untrusted work and re-verified against all six blockers; no production source needed changing, only the focused suites were tightened. `verusIdFlowGuards` (12) exhaustively covers stale origin/epoch rejection and the shared-first-address switch, READY/removed status-sheet dismissal, and the four delayed-unlink navigation rejections. `processVerusIdResumeGuard` (6) now also fails if the guard is not re-checked between each `dispatch`/storage await and the navigation, after the pre-navigation guard was confirmed present and then re-confirmed by mutation. `IdentityPickerSheet` (3) covers origin metadata on the discovered candidate, the same-frame Back block, and the blocked backdrop/system close, each proven to fail when its guard is removed. `id1LinkFailureRouting` (2) stays a structural source assertion that the touched consumers do not open the legacy SendModal link UI. Focused correction suites plus the existing ID-1 session/provisioning/notification suites: 10 suites / 62 tests. `git diff --check`, Babel parse on all 14 changed/new JS files, design contract (30 canonical sources), `check-safe-areas` (9 files), `check-search-fields --changed` (14 files), `check-generic-request-completion-flow` (9 cases), and `check-identity-authority-funding` pass. HEAD unchanged at `a607faf6`; dependencies were resolved through a temporary `NODE_PATH` to the sibling checkout (no source change depends on it). | ID-1.10–1.11 stay open for the parent: rendered and native light/dark normal/compact captures, the independent high-risk behavior re-review, and the design-adviser pass on this corrected candidate before acceptance and commit. |
| 2026-09-12 | ID-1 VerusID linking, details, and status implementation | Uncommitted local delivery over `a607faf6` on `codex/id1-redesign` in worktree `/private/tmp/verus-mobile-id1-01a09345`; the parent owns the commit and the rendered/native QA | Manual entry, validation, resolution, review, linking, and failure now live in the shared `LinkExistingVerusIdSheet`, so the touched consumers never open the legacy SendModal link flow; identity resolution is read-only and never requests seeds. Pending status and unlink confirmation are floating shared sheets with refresh/retry primary, removal/unlink secondary, controls disabled while processing, `onClosed` cleanup and navigation, and local-only unlink copy. Signed-in details leads with the name, status, network, and identifiers, keeps warnings and full values, collapses technical sections, uses inline `CopyAction`, and drops the unsupported “No attestations linked” section. `git diff --check` clean; design contract (30 canonical sources), `check-safe-areas` for the 5 changed files, Babel parse (5 changed files), relative-import resolution, `check-generic-request-completion-flow` (9 cases) and `check-identity-authority-funding` pass. | ID-1.10–1.11 remain open: no rendered or native capture exists for the new manual/review/pending/unlink/details states, and no independent design or behavior review has run on this candidate. `corepack pnpm` could not execute in this worktree (no installed `node_modules`), so the check scripts were run directly with `node`. Next: the parent captures iOS/Android light/dark normal/compact states and runs the required reviews before accepting. |
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

- ID-1 is complete and locally integrated. The implementation and its
  high-risk review corrections (including the two final P2 lifecycle defects)
  are committed as `33865cab` on `codex/id1-redesign` and locally integrated
  into `codex/integrate-generic-request-upstream`; the matching origin branch
  remains behind until a separately authorized push. ID-1.10–1.11 are complete:
  rendered light/dark normal/compact empty/error/keyboard/processing states were
  captured on iOS fixtures, and the single independent high-risk reviewer
  (which also applied `max-product-design-taste` while reviewing the final
  renders) returned READY with all findings closed. Android, authenticated
  real-wallet, and full accessibility proof remain explicitly open, not
  implied.
- Last completed action: ID-1 finalization — the parent ran the focused ID-1
  checks, captured and verified the iOS fixture states, and obtained the single
  independent high-risk READY, then committed the verified candidate as
  `33865cab` and locally integrated it into
  `codex/integrate-generic-request-upstream`. RX-1 remains an accepted local
  delivery with the native system amount keypad, 196 native screenshots, 32
  passing focused checks, and ready independent high-risk/design reviews.
  RX-1.1–1.9 are
  complete for the scoped disposable-fixture delivery. The gallery and exact
  commit receipt are in `docs/rx1-qa-20260911`; no push or publication is part of
  this delivery.
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
  task owns the remaining Send/Convert work. ID-1 retains its explicit proof
  limits: iOS-only native evidence, with Android runtime, authenticated
  real-wallet, signing/funds, live RPC, and full accessibility proof still open.
