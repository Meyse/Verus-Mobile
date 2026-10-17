# Wallet UI redesign and consistency plan

This is the maintained checklist for completing the remaining GenericRequest,
Send, Convert, Receive, and VerusID design work. Use it to resume a scoped task
without repeating the entire investigation.

## Current position

- Created: 2026-09-10.
- Last updated: 2026-10-17.
- Scoped history follow-up: A-16/I-20 on `claude/fix-history-conversions`
  from `a1e758fd`. VRPC grouping, pending time, conversion labels, and recipient
  metadata have source/RPC fixture checks. I-21 stays open: the C6 press callback
  and detail data work in the source fixture, but no native touch check ran.
- Scoped correctness follow-up: A-15/A-20 conversion estimates on
  `claude/fix-conversion-estimates` from `f22b7ab9` are ready for device QA.
  Numeric RPC serialization and daemon-only Amount estimates have local fixture
  and read-only private Testnet RPC evidence. TX-1 runtime boxes stay open.
- Scoped TX-1 follow-up: A-21/A-22 on `claude/fix-eth-export-recipient`.
  Ethereum export detection and the received-asset label are fixed. Source,
  option-matrix, and private-chain unsigned-build checks pass. Native QA stays
  with the parent task; this work does not close TX-1.8 or TX-1.9.
- Status: SH-1, RX-1, and ID-1 complete for their scoped local deliveries. The
  scoped ID-1 delivery is committed as `33865cab` and locally integrated into
  `codex/integrate-generic-request-upstream`; its rendered/native QA and the
  single independent high-risk review are done. GR-1 and GR-2 are complete:
  the GR-3 runtime matrix closed GR-1.9, GR-1.10, and GR-2.6 on 2026-10-10.
  Global QA-1 stays open across workstreams.
- Source-analysis baseline: `fecfbce4e5eba42e238a9960f30e7cd049ed08ba` on
  `codex/integrate-generic-request-upstream`.
- Evidence: source and fixture behavior checks, the data-lab Mobile contract suite,
  isolated iOS/Android native previews, and Android build/entry checks.
  Authenticated wallet delivery is now verified on iOS and in an Android smoke
  pass; see the GR-3 log entries.
- Current scoped fix (user, 2026-10-17): **A-19**, prevent Back from a successful
  Send/Convert from exposing a live submit action. Implementation and source
  checks are complete on `claude/fix-send-success-back`; orchestrator device QA
  is next. The remaining TX-1 redesign work stays open.
- Earlier focus (user, 2026-10-15): **SV-1**, the Services tiles and the
  fixed gift card screen. `claude/sv1-prep` added the DESIGN.md patterns, the
  `AcknowledgeSheet` `dismissLabel`, and the SV-1 brief. Track A (Services) and
  Track B (gift card) ran in two parallel sessions and are both merged into
  `redesign`. The Android run and a daemon claim followed. SV-1.15 and
  SV-1.16 are fixed; SV-1.17 is decided (no code change). See the SV-1 log
  rows.
- Earlier focus: **GR-3** on `codex/gr3-request-matrix`. Phase 2 is done: the
  user agreed the bug list and Phase 3 scope, and the agreed functional fixes
  (GR3-B6, B3, B2, R1) are verified on the iOS simulator. GR3-B4
  waits by user choice. Compact screenshots are deferred, and the
  physical-iPhone run remains. Phase 3 is implemented (GR-3.12 to GR-3.15,
  GR-3.18, GR-3.19). Phase 4: GR-3.16 ran (iOS rerun and Android smoke) and
  waits only on wallet backup (GR-3.9); GR-3.17 closed the GR-1/GR-2 runtime
  follow-up. GR3-B8 is recorded for later.
- Next focus (user, 2026-10-11): **NFC-1** on `codex/nfc-1-claim-from-card`.
  NFC-1.1–1.7 and the NFC tap screen (NFC-1.9–1.11) are done on the simulator,
  in one commit with NFC-1 (user). Next, one physical-iPhone session runs
  GR-3.9 and NFC-1.8 together.
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
| NFC-1 | A gift card on an NFC card can be claimed signed in and signed out | In progress | GR-3.13 claim flow; physical iPhone (with GR-3.9) |
| SH-1 | Selection and information sheets share the approved presentation | Done | Existing canonical sheets; supports TX-1, RX-1, ID-1 |
| TX-1 | Current Send/Convert wizard uses shared layout and sheets | Sheet tasks delivered through SH-1; remaining work not started | SH-1 for sheet migration |
| RX-1 | Receive choices are clear and payment requests have proper steps | Done | SH-1 for sheet migration |
| ID-1 | VerusID linking, details, and status surfaces are consistent | Done | SH-1 where a shared sheet is needed |
| SV-1 | The Services root uses tiles; the gift card screen uses the fixed card | Done on iOS; Android tested, SV-1.15–1.17 closed; NFC write open | DESIGN.md "Services home" and "Gift card detail"; `AcknowledgeSheet` `dismissLabel` |
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
- [x] **GR-1.9** Verify consent gates, scope/signer/network restrictions, encrypted
  responses, signed-out entry, and mixed-detail requests using disposable data.
  Done 2026-10-10 in GR-3 on VRSCTEST with real taps (GR-3.7, GR-3.16,
  GR-3.17): “Sign data” stays disabled until every item is checked (iOS and
  Android); matching, partial, and missing credential scopes; a required
  signer the wallet does not control shows “Required VerusID unavailable”
  with Switch wallet and sends nothing, and its own ID proceeds; wrong-network
  requests are rejected; credential responses arrive encrypted (harness);
  signed-out entry opens “Unlock wallet to review”, then the review after
  Face ID, and the signed response is verified; credential/data-packet in
  both orders and sign-in + credentials or data packet are verified. Consent
  reset on an identity change is covered by the GR-1 state checks only (the
  test wallet has one eligible VerusID).
- [x] **GR-1.10** Complete relevant QA-1 checks and record delivery evidence.
  Done 2026-10-10 with the GR-3.17 QA-1 record in the evidence log. Recorded
  follow-ups: full VoiceOver/TalkBack walkthrough, reduced motion, and the
  app-wide text-scaling decision.

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
- [x] **GR-2.6** Complete relevant QA-1 checks and record delivery evidence.
  Done 2026-10-10: real delivery on iOS for POST, fail once, fail always,
  redirect, and no callback (sign-in + app encryption), data packet fail
  always with Leave without sending, credentials with no response, and an
  identity update retry that redelivered the same txid; Android POST. QA-1
  record in the GR-3.17 evidence row.

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
  Implemented 2026-10-10. Request-review composition from
  `AppEncryptionRequestInfo` (title, subtitle, 56-point primary and Cancel);
  options use `SettingsProfileSummary`, `SettingsSwitchRow`, and a
  `SettingsRow` that opens a `SelectionSheet` for brute-force resistance;
  semantic strength colors; the shared `requestWalletUnlock`; no hero icons,
  Paper checkboxes, Paper menu, or filled wallet card. New “Backup written”
  result before the request continues (Done, or Continue when a claim
  follows); Settings no longer adds its own alert. Settings mode no longer
  adds the status-bar inset under its header, the keyboard offset includes the
  header, and the password fields use the onboarding autofill settings. NFC
  write logic, session guards, and completion markers are unchanged. Simulator
  evidence covers every state except a real NFC write (stubbed); the physical
  iPhone run (GR-3.9) is still required.
- [x] **GR-3.14** Fix the small leftovers: the “Open in another app” pill, the
  `InvoicePaymentConfiguration` fallback root, and the Identity Update content
  step Paper rows. Added (user, 2026-10-10): the empty band under “View request
  details” on every review (GR3-D8), the “1 hours” expiry copy (GR3-D9), and the
  “Secure POST” label on plain HTTP destinations (GR3-D6).
  Implemented 2026-10-10, commit `0c75f191`. “Open in another app” is a quiet text
  action in normal flow above the review (no absolute pill, no fixed 100-point
  offset, semantic colors); a nested safe-area provider stops the review from
  adding the status-bar inset again; the chooser is the shared
  `SelectionSheet`, and a failed handoff shows recovery guidance instead of
  the raw link. The unreachable `InvoicePaymentConfiguration` route and its
  legacy fallback root are removed (the invoice review renders it inline).
  The Identity Update private-information rows no longer use Paper `List` and
  `Divider`; one item no longer repeats the group title, and the private
  address uses monospace. D8: the data reviews no longer stack the source-card
  margin, a section margin, and item padding (about 110 to about 42 points);
  on short reviews the remaining space is free space above the footer. D9:
  `blocksToTime` uses whole seconds, correct singular units, and leaves out
  zero units (“1 hour”, “1 hour 1 minute”). D6: one shared delivery label —
  “Secure POST” only for HTTPS, “POST over HTTP” otherwise — in sign-in, app
  encryption, and the data-review details.
- [x] **GR-3.15** Replace rejection alerts with a request error state that gives
  recovery guidance (GR3-D1). In scope by user choice, 2026-10-10.
  Implemented 2026-10-10, commit `39dabf36`. A rejected GenericRequest stays on the
  opening screen, which turns into an error state: one title, one recovery
  sentence, and Close; Try again only when a retry can help (network failure
  or an unknown error). No icon, no step list, no raw error text. The same
  state covers detail-handler failures in `GenericRequestHome`, and a failed
  detail now stops the loop instead of running on to the next detail.
  `genericRequestRejection.js` maps coded errors (wrong network, request not
  valid, signer not verified, expired, unsupported detail, experimental off,
  delegated-signer wallet) and axios transport texts to the copy. Links that
  fail before a request screen exists (too long, unreadable) keep an alert, but
  with translated copy. The shared Paper alert backdrop was opaque black
  because the theme dropped `scrimOpacity`; it now dims the screen. Deprecated
  LoginConsent v1 and VerusPay invoice v1 keep their alerts.
- [x] **GR-3.18** Identity Update high-risk steps: show the address that gains
  control, the current and new authorities, and full names without mid-token
  breaks (GR3-D10, GR3-D2). Add the destination and fee to the gift-card claim
  review. Added by the user, 2026-10-10.
  Implemented 2026-10-10, commit `50727421`. The high-risk step now shows each
  change in full on the step itself: a primary-address change lists the
  removed and added addresses in monospace, and a recovery or revocation change
  shows the current and the new authority, with the new one emphasized. The
  rows keep View for the technical details; the acknowledgement sheet shows each
  name with its i-address. A content key with no known name reads "Unnamed key"
  with its full i-address instead of a four-and-four abbreviation. Long VerusID
  names wrap after a dot instead of inside a name part (`withNameBreaks`, display
  only) in "Updating identity", the provisioning name preview, and the
  provisioning review. The gift-card claim review shows "To" (wallet name and
  receiving address) and "Network fee"; the claim plan now keeps the fee that
  was already subtracted from the shown balance.
- [x] **GR-3.19** Mixed requests: tell the user when a second step follows the
  sign-in review (GR3-D11). Added by the user, 2026-10-10.
  Implemented 2026-10-10, commit `8270ae32`. When another review follows sign-in,
  the sign-in primary action names it instead of signing in: “Continue to sign
  data”, “Continue to share credentials”, “Continue to pay invoice”, “Continue
  to VerusID changes”, “Continue to wallet backup”, or “Continue to claim
  funds”. Nothing is sent until the last step, so “Sign in with VerusID”
  stays only when sign-in finishes the request (sign-in only, or sign-in with
  provisioning, which the sign-in step handles). `genericRequestNextStep.js`
  finds the next detail that opens its own review, in processing order, and
  skips a wallet backup that the passthrough flag skips. The label appears
  after a VerusID is selected; before that the action stays “Choose VerusID”.
  No step counter or progress bar: DESIGN.md does not allow a “Step 2 of 4”
  eyebrow, and the next screen's title matches the action that opened it.

Phase 4 — regression:

- [ ] **GR-3.16** Rerun the matrix on the final branch. Run one Android smoke
  pass per type.
  Run 2026-10-10 on `8270ae32` plus two fixes (commit `dd3a476f`). iOS: every
  in-scope type and mixed request passed again with real taps, including all
  five delivery modes on sign-in + app encryption, fail-once identity update
  with one transaction, both credential/data-packet orders, sign-in + invoice,
  the six rejected-request cases, and the gift-card claim. Android: one smoke
  pass per type on a new disposable profile (app encryption, sign-in + data
  packet, identity update, credentials, rejected requests, provisioning,
  invoice, gift-card claim). Fixed during the run: the gift-card claiming
  state pushed its text to the screen bottom (same `AnimatedActivityIndicatorBox`
  defect as GR-3.13), and the Android identity picker threw on a null
  `accessibilityState` (GR3-B9). New finding GR3-B8: two equal payments to the
  same address inside one block window reuse the first payment's inputs, so
  the second is a byte-identical rebroadcast that the app reports as
  submitted. Gaps: credential matching and provisioning registration (testnet
  sub-ID registration blocked, GR3-E1); wallet backup (no NFC, GR-3.9);
  compact size (deferred). GR-3.14, GR-3.15, GR-3.18, and GR-3.19 are checked
  on this rerun; GR-3.12, GR-3.13, and this item wait for GR-3.9.
- [x] **GR-3.17** Close GR-1.9, GR-1.10, and GR-2.6 where the evidence supports
  it. Refresh `docs/genericrequest-types-and-chains.html`. Complete the relevant
  QA-1 checks.
  Done 2026-10-10. GR-1.9, GR-1.10, and GR-2.6 are closed (see each item). The
  missing runtime checks ran first: required signer (unavailable and own),
  signed-out data-packet entry, request-details sheet close and reopen, and
  Android hardware Back and accessibility labels. The local protocol map
  (`docs/` is ignored by Git) now shows nine supported details, the unsigned
  order rules, the shared delivery path, the error state, the runtime
  evidence per type, and the open items; it renders at desktop and phone
  width in light and dark. Global QA-1 stays open (TX-1 and other workstreams).

Recorded for later (user, 2026-10-10; outside the request redesign):

- **GR3-B8** Two payments with the same amount and destination inside one
  block window do not both happen. The second send selects the inputs that
  the first, still unconfirmed payment already spent, so it signs a
  byte-identical transaction. The server returns the first txid without an
  error, and the app shows “Payment submitted” for the second invoice.
  Reproduced three times on iOS (invoice only, 0.01 VRSCTEST to one address);
  a debugger counter showed an identical signed transaction; the mempool held
  one transaction each time. Source: `getSpendableUtxos`
  (`src/utils/api/channels/vrpc/requests/getAddressUtxos.js`) reads only
  `getaddressutxos`, which does not remove inputs spent in the mempool. Not
  run: two payments with different outputs (expected to conflict and fail
  instead). Needs its own task on send input selection; reproduce in a
  failing test first.
- **GR3-D15** (P3) Android hardware Back on a request review returns to
  Wallet and sends nothing, but skips the screen's Cancel handler, so
  `deeplink.id` stays set (Cancel clears it). Reopening the same link works;
  no visible effect seen.
- **Text scaling** (app-wide, QA-1.3): `src/utils/applyGlobalTypography.js`
  sets `allowFontScaling = false` for every `Text` and `TextInput`, so the
  system text size has no effect (checked at the largest iOS size). This is a
  product decision outside GR, not a GR regression.

**Acceptance:** Every in-scope type and mixed request has a recorded runtime
result with its proof level. No in-scope flow ends on the legacy completion
screen. All in-scope request surfaces belong to the current review family in
light and dark mode. Shared changes leave the excluded and deprecated flow
code untouched.

## NFC-1 — Claim from an NFC card

**Finding (2026-10-11, source; GR3-B10):** The app cannot read a Verus NFC
card. Upstream has two signed-out entries that call `readDeeplinkFromNfc`:
“Initialize from NFC” on the first-run screen and “Read deeplink from NFC” in
the signed-out menu. The signed-out redesign removed both (`62c9b54d`,
`5720414d`, 2026-06-08). No record shows that this was intended. iOS does not
open `verus://` links from tags (background tag reading supports only universal
links and system schemes), so an iPhone has no other path. Effects: a gift card
on an NFC card cannot be claimed with Verus Mobile alone, and the “Claim this
card” choice in `WalletBackupRequestInfo` (it needs `passthrough.fromNfc`) never
appears. Upstream never had a signed-in entry.

Related finding (source): onboarding “Scan QR code” (`CreateProfile`
`handleScan`) uses any scanned text as the imported seed, without a review
step. A gift-card QR scanned there becomes the new wallet's seed.

**Decisions (user, 2026-10-11):**

- Use the label “Claim from NFC card” in all three places.
- Signed out, no wallets: a row in the “Get started” sheet.
- Signed out, with wallets: a row in Login → Other options.
- Signed in: a button on Home → Scan.
- Hide the entries on devices without NFC.
- Include the onboarding QR fix.
- Build NFC-1 first. Then one physical-iPhone session covers GR-3.9 and NFC-1.
- Added (user, 2026-10-11): put the NFC tap screen from the “NFC Tap Moments”
  page (the simple version) into every NFC read and write, in the same commit
  as NFC-1. A card with other content (a wallet backup, no Verus link) shows one
  line and one action in the same screen, not an alert (proposed in the
  integration report; the user continued without a change).

**Design contract:** Scope is the two signed-out sheets, the Scan screen's
bottom button, the shared read action and its messages, the global
`LoadingModal` (the read status surface), and the onboarding QR result.
Exemplars are the existing rows of each sheet (`SignedOutActionRow` in the start
sheet, the Other options rows) and the scanner's safe bottom button slot as
`SendWizardRecipient` uses it. Shared primitives: `BottomSheetModal`,
`createSignedOutSheetStyles`, `AppButton`, `readDeeplinkFromNfc`. States: entry
shown or hidden by NFC support; reading (iOS system sheet, Android status with
Cancel); cancelled; failed; wallet-backup card; card without a Verus link;
success into the request flow. Deviation: `LoadingModal` gets semantic theme
colors so that it follows dark mode. It also serves the onboarding and
wallet-backup wallet setup. The NFC tap screen (NFC-1.9) replaced
`LoadingModal` as the read status surface.

**Tap screen design contract (NFC-1.9–1.11):** Scope is the status screen of
all four NFC operations: claim read (the three entries), wallet backup write
(Settings and request), wallet backup read (restore), and gift card write.
Exemplar: the simple version on the “NFC Tap Moments” page (one contactless
symbol, one line, help only after a failure; symbol at the top on iPhone and
in the middle on Android). Shared primitives: new `NfcTapView` (and
`NfcTapModal` / `NfcTapHost` for full-screen use), `AppButton` at 56 points
with the request-review secondary style, `SafeBottomActionStack`, theme roles
`titleSheet` and `bodySm`, one new token `primaryBackground` (existing values
`#EEF2F8` and `rgba(49, 101, 212, 0.24)`). States: preparing (backup only),
waiting, active, release (Android), done, failed, notice; light and dark;
normal and compact; reduced motion. Deviations: no Cancel while a backup is
prepared, because the encryption blocks the JS thread and a Cancel could not
respond; failures name the cause where the app knows it (“No card found”,
“Card moved too soon”, “NFC is off”), not only “Card moved too soon”.

Tasks:

- [x] **NFC-1.1** Record GR3-B10 and this plan.
- [x] **NFC-1.2** Shared read action: plain prompts and messages; no alert
  after a user cancel; a wallet-backup card leads to “Restore from NFC backup”
  when signed out and gets an explanation when signed in; an NFC support check
  for the entries; theme colors for `LoadingModal`.
  Done 2026-10-11. `readDeeplinkUriFromNfc` uses plain wording and returns
  codes for a user cancel (`NFC_READ_CANCELLED`, no alert) and a card without
  a Verus link (`NFC_NO_VERUS_LINK`, “Nothing to claim”); other failures show
  “Card not read”. `isNfcSupported` plus `useNfcSupported` hide the entries.
  `LoadingModal` uses the sheet color, `titleSheet`, and `AppButton`; it was
  white in dark mode before, also in onboarding wallet setup. Found and fixed
  during QA: a read that ended while the status modal still slid in left the
  native modal on screen above the next alert (Redux said closed). The status
  modal now stays at least 500 ms; this also covers a card already at the phone.
  NFC-1.9 replaced the status modal and the alerts with the tap screen; it keeps
  the 500 ms minimum, and a result no longer closes one modal to open another.
- [x] **NFC-1.3** “Get started” row (signed out, no wallets).
  The row shows only when no claim is in progress (`resumePendingDeeplinkId`).
- [x] **NFC-1.4** Other options row (signed out, with wallets). First row.
- [x] **NFC-1.5** Scan button (signed in). Uses the scanner's bottom button
  slot; the no-camera view shows it too. Address-only scanners and callers
  with their own button are unchanged.
- [x] **NFC-1.6** Onboarding QR: a scanned `verus://` link opens as a request,
  not as a seed. Setup closes first, so Cancel returns to Welcome.
- [x] **NFC-1.7** Simulator evidence: the rows and the button in light and dark,
  normal and compact (NFC support stubbed for capture only); the request flow
  from a simulated read; parser, design, and safe-area checks; the existing NFC
  read tests.
- [ ] **NFC-1.8** Physical iPhone with a card, in the GR-3.9 session: each entry
  reads a funded gift card; signed in, “Claim to existing wallet”; signed out
  with wallets, “Claim this card”; no wallets, create a wallet, back it up to
  the card, then claim; cancel; wrong card. Android: emulator UI only (no NFC
  hardware). Tap screen on the phone: the iOS scan sheet text per step, the
  success and error close of the sheet, the haptics, the timing of the check,
  and that the app's security cover does not hide the tap screen while the
  sheet is open.
- [x] **NFC-1.9** NFC tap screen. `walletBackupNfc.js` runs every card
  operation through one runner that reports a phase (waiting, active, done,
  release) and gives errors codes (cancelled, NFC off, timeout, card moved,
  no Verus link, no wallet backup). It sets the iOS scan sheet text (“Hold
  still.”, “Done.”, “Backup written.”) and closes the sheet with an error text
  on a failure. Card checks, overwrite guards, and the Android release hold are
  unchanged. `NfcTapView` draws the symbol (Animated plus SVG, native driver
  for the loops): waves pulse while waiting, a ring turns while active, a green
  check with one ripple when done, a red mark with a shake on failure, an
  orange mark for a notice. Haptics: light on card found (Android), success,
  error, warning. Reduced motion stops the loops, the shake, and the ripple.
  The security cover is not shown while an NFC session is open (iOS makes the
  app inactive under the scan sheet; to confirm on the phone).
- [x] **NFC-1.10** The tap screen in all four operations. Claim read: an
  app-wide host (`state.nfcTap`) replaces the status modal and the alerts;
  results offer Try again, Restore wallet, or Close in the same screen.
  Wallet backup: preparing, the card steps, and the result with its protection
  text and Done or Continue in one view; a failure offers Try again (keeps the
  confirmed options) and Cancel. Restore: the card steps, then the password
  step or the import. Gift card: the card steps, then “Gift card written” with
  Done instead of the system “Success” alert; Cancel after a failure rolls the
  share back without an alert. A user cancel ends without a message everywhere.
- [x] **NFC-1.11** Simulator evidence with an in-app fake NFC chip (installed
  through the debugger, no app code); see the evidence log.

Recorded for later (found in NFC-1 QA; existing claim-flow behavior):

- **GR3-D16** After “Claim submitted” → Done, the delivery step adds a
  “Request complete / No response was sent to the requester” sheet. A gift
  card has no requester, so the second confirmation is noise. Source: the
  claim's Done calls `completeWithDelivery` / `next(..., {autoDeliverOnComplete:
  true})` (since `33eb5624`).
- **GR3-D17** Reading a card whose claim is still unconfirmed shows “Pending
  claim transaction / Retry when your connection is available”. The broadcast
  worked (the transaction was in the mempool), so the connection hint is wrong.
  Seen again in the tap screen QA after “Backup written” → Continue on the
  same, already claimed test link.

Recorded for later (found in the tap screen QA; existing behavior):

- **NFC-D1** Android keeps the card session open for 5 seconds after a success
  (`NFC_POST_WRITE_ANDROID_HOLD_MS`, so that the phone does not read the card
  again). The check therefore stays 5 seconds before the claim or restore
  screen opens. Option: open the next screen during the hold.
- **NFC-D2** Back from the restore setup step returns to the NFC step, which
  starts a new read by itself (`autoStart` on mount). On iPhone the scan sheet
  opens again.
- **NFC-D3** After the signed-out unlock in a wallet-backup request, the
  request starts again and shows “Claim this card” a second time.
- **NFC-D4** The restore start screen (“Import using NFC”, Paper button) is
  legacy UI; only its scan states use the tap screen.

**Acceptance:** From each of the three entries, a funded gift card on an NFC
card opens the claim flow on a physical iPhone, and the funds arrive. Cancel
and wrong-card cases show no technical text. Devices without NFC show no entry.

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
- [x] **TX-1.A19** Clear prepared wizard steps after broadcast. Block a later
  submit with the existing context result and a synchronous success latch.
  Route Success hardware Back through Done (reset to Wallet home, unchanged);
  header Close keeps the shared exit to the opener. Keep the existing disabled inner swipe and hidden result back arrow.
- [ ] **TX-1.A19-QA** Orchestrator: verify Success exits on Android and iOS,
  including Back/swipe, Close, Done, and normal entry for a new send. Include
  direct send, conversion, and cross-chain paths when available.

- [x] **TX-1.A21** Classify Ethereum export systems from the currency
  definition's `nativecurrencyid.type` with `DEST_ETH`. Keep explicit `ethdest`
  routes and the existing recipient, self-address, and preflight paths.
- [x] **TX-1.A22** Use the asset portion of an unknown currency's qualified
  name for its fallback ticker. The MKR.vETH network rows now say "Receive as MKR".
- [x] **TX-1.HISTORY** Preserve VRPC spend metadata and mempool timestamps.
  Group by transaction ID and prefer confirmed data on snapshot overlap. Label
  a single decoded conversion with its target currency in the existing row and
  detail Type slots. Retain the actual conversion recipient and stable VRPC row
  keys. Preserve net balance amounts and same-transaction import aggregation.
- [ ] **TX-1.HISTORY-QA** Orchestrator: check pending/confirmed history and detail
  opening, including I-21, in light/dark and normal/compact layouts. The local
  fixture does not reproduce the native C6 tap failure. The extra safe-area
  check flags the existing legacy modal `SafeAreaView` import on both the base
  and candidate; this copy-only change retains the modal shell.

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

## SV-1 — Services tiles and the fixed gift card screen

**Authority:** [DESIGN.md](DESIGN.md) sections "Services home", "Gift card
detail", "Confirmation", and the status badge rule. The user approved them on
2026-10-15. The mockups illustrate the rules; DESIGN.md wins when they differ.

**Mockups:** the artifact
`https://claude.ai/artifact/Fix3WydeV2fp1wkKw3RrXM` (private to the owner;
read it with the Artifact tool's `read` action) and the local copy
`docs/qa/sv1/mockup.html` in the main checkout (ignored by Git). Use the top
two sections: "Services tab" and "Gift card screen". "Earlier options" are
rejected options.

**Decisions (user, 2026-10-15):**

- The Services root uses the two-column tile grid. A tile shows no pending
  count and no dot.
- The gift card detail uses the fixed card (no flip).
- Status uses the tinted badge with no dot. Ready uses the success pair,
  Pending the warning pair, and Not funded, Shared, and Claimed the neutral
  pair. Today the list shows Redeemed in red; that changes to neutral.
- Visible text says "Claimed" instead of "Redeemed" and "Claim completed".
  Internal names stay: `GIFT_CARD_DISPLAY_STATUS_REDEEMED` and
  `status.state === 'redeemed'` do not change.
- A new display status, Shared, applies after the link left the wallet
  (`hasGiftCardBeenShared`). Precedence: Claimed, then Pending, then Shared,
  then Ready, then Not funded.
- List filters: All, Ready, Pending, Not funded, Shared, Claimed. The list
  summary drops its "Shared ·" prefix, because the badge says it.
- The first share of an unshared card (Share, QR code, or NFC) opens
  `AcknowledgeSheet` with `confirmLabel="Share"` and `dismissLabel="Not now"`.
  This replaces the permanent "Unfunded gift card" and "Shared from this
  wallet" notices. A shared card shares again without the sheet.
- The card shows a pending amount dimmed. Pending funding records store
  transaction IDs, systems, and VerusIDs; they may not store amounts. Trace
  `addGiftCardPendingFunding` and the `broadcastGiftCardFunding` results first.
  If no amount is recorded, show the pending VerusID names or "No contents
  yet", and keep the Pending badge. Never invent an amount.

**Preserve:** the share-attempt record and rollback in `runShareAction`, the
pending-funding share guard, single-use funding after a share or funding
attempt, cancel and remove checks, the NFC tap host, refresh, and the existing
`GiftCardOptionsSheet` cancel flow. These are behavior, not layout.

**Track A — Services tiles.** Own branch from `redesign`. Expected files:
`src/containers/Services/SignedInServicesHome.js`, `src/copy/signedIn.js`, and
a style module if the tile is reusable. Do not touch gift card files.

- [x] **SV-1.1** Replace the image rows with the tile grid from DESIGN.md
  "Services home". Remove the folded 3D image imports. Keep the navigation
  targets and the address count loading.
- [x] **SV-1.2** Tile lines: Gift cards shows its card count ("3 cards",
  "1 card"). Read the count from the gift card service data the way
  `GiftCardServiceOverview` loads it; trace the storage, do not guess. With no
  cards it shows "Send funds or IDs". Address book shows "{n} saved", or "Save
  addresses" when empty.
- [x] **SV-1.3** Icons: Lucide `Gift` and `BookUser` at 24 points
  (`lucide-react-native` is installed and used by the sheets).
- [x] **SV-1.4** Delete `services-gift-card-folded.png` and
  `services-address-book-folded.png` only if nothing else imports them.
- [x] **SV-1.5** Verify on the iOS simulators `Verus GR3 QA` and
  `Verus GR3 Compact` (iPhone SE), light and dark, with zero and several cards
  and addresses, and at a large text size. Run `check:design`,
  `check:safe-areas` on the changed files, and a Babel parse.

**Track B — Gift card screen.** Own branch from `redesign`. Expected files:
`GiftCardServiceOverview.js` (detail, list badge, filters, summary), a new
fixed card component, `GiftCardFlipCard.js` (delete when unused),
`src/utils/giftCard/giftCardPresentation.js` and its unit test, and a shared
status badge. Do not touch `SignedInServicesHome.js`.

- [x] **SV-1.6** Presentation: add the Shared display status, the "Claimed"
  label, and the card texts "No contents yet" and "Empty". Update the expected
  wording in `giftCardPresentation.unit.test.js`. This is a spec change from
  this decision list; record it in the log.
- [x] **SV-1.7** Move `GiftCardStatusBadge` to a shared status badge with a
  card variant that uses the dark-mode pairs. Use it in the list and on the
  card. Update the DESIGN.md "Status label" row.
- [x] **SV-1.8** Build the fixed card from the `GiftCardFlipCard` material and
  shape: name and badge on top, contents at the bottom, no flip, swipe hint,
  "VERUS GIFT CARD" label, or issued date. Delete `GiftCardFlipCard.js` when
  nothing imports it.
- [x] **SV-1.9** Rebuild the detail screen from DESIGN.md "Gift card detail":
  header with back, refresh, and ⋯; the card; the Share, QR code, and NFC
  tiles; the fact rows; the pending transaction row; the Not funded footer.
  Remove the notice boxes, the Contents and Funding addresses sections, and the
  "Gift card options" button. "Fund from another wallet" keeps its route
  (`openFunding(card, {startExternal: true})`).
- [x] **SV-1.10** Share confirmation: the first share of an unshared card goes
  through `AcknowledgeSheet` (`dismissLabel="Not now"`), then the existing
  `runShareAction` with `shareNative`, `navigateToQr`, or `shareNfc`. Start the
  share after `onAcknowledged`, so the sheet has finished closing.
- [x] **SV-1.11** ⋯ options: keep `GiftCardOptionsSheet` and its actions. Add
  "Share before funding" for a not-funded card, through the same confirmation.
- [x] **SV-1.12** List: badge colors, the six filters, and the summary without
  the "Shared ·" prefix.
- [x] **SV-1.13** Verify the five states with real taps on VRSCTEST, light and
  dark, normal and compact: Not funded (a new card), Pending (right after
  funding), Ready (after confirmation), Shared (share by QR code), and Claimed
  (claim from a second disposable profile or with deeplink-sim). Check the
  confirmation's Share, Not now, and outside tap. Run `check:design`,
  `check:safe-areas`, a Babel parse, and the gift card unit suites.
- [x] **SV-1.14** Run one independent, report-only review of the Track B diff
  against DESIGN.md, the mockup, and the preserved behavior. Resolve blocking
  findings before the merge.

Android follow-ups from the 2026-10-15 Android run (see its log row):

- [x] **SV-1.15** Pending "Funding transaction" row on Android: the ID wraps to
  a second line that is cut off, with no ellipsis. The `Text` combines
  `numberOfLines={1}`, `ellipsizeMode="middle"` and `selectable`; Android does
  not ellipsize selectable text. Show one line with a middle ellipsis on both
  platforms (`CopyAction` already copies the full ID).
- [x] **SV-1.16** Android hardware Back on the gift card detail closes the whole
  Gift cards screen and returns to the Services root. The detail is local state
  (`selectedCardId`) on the list screen, with no `BackHandler`. Back from the
  detail must return to the list, as the on-screen back arrow does. Older than
  SV-1.
- [x] **SV-1.17** On Android, React Native `Share.share` never reports a
  dismissal, so opening the system share sheet marks the card Shared even when
  nothing was sent, and the next share skips the confirmation. Decision (user,
  2026-10-15): keep this behavior, because the link may have left through Copy.
  No code change. Recorded in DESIGN.md "Gift card detail" (Sharing).

**Acceptance:** Each fact appears once on the gift card screen. Sharing is
visible without a gesture and asks once before the key leaves the wallet. The
Services root grows by one tile per service with no new artwork. Status uses
the badge without dots everywhere SV-1 touches. Preserved behavior still works.

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
| 2026-10-17 | A-16/I-20 VRPC history correctness; I-21 investigation | `claude/fix-history-conversions` from `a1e758fd`; VRPC updates, transaction standardization, Overview, and transaction detail Type | Design contract: retain the existing history row and detail slots, controls, and styles; correct conversion text and destination data only. Read-only private Testnet RPC supplies four requested transactions and the combined import. One-off Node checks execute source parsing and press/detail callbacks: 11 regression cases fail on the baseline; all 16 cases pass after the fix. The combined arrival is two outputs in one import transaction, so its aggregation remains. Babel parse (four files), `check:design` (30 canonical sources), and diff whitespace checks pass. | I-21 is unresolved: the C6 press callback and detail data pass on both versions. Stable VRPC keys and immutable sorting remove list identity/state defects but do not prove a native tap fix. Orchestrator owns pending/confirmed, light/dark, normal/compact native QA. No Metro, devices, signing, broadcast, merge, or push actions. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | A-19: successful Send/Convert cannot return to live Confirm | `claude/fix-send-success-back` from `f22b7ab9`: `SendWizardConfirm.js`, `SendWizardSuccess.js`, `SendWizardNavigator.js`, new `wizardNavigation.js` | React Navigation native 6.0.13 / stack 6.3.4. Shared submit resets the inner stack to Success only. A synchronous latch and the existing context `txResult` block further submit calls and disable the hold button. Success hardware Back consumes the event and runs Done (unchanged: reset to Wallet home). Header Close keeps the shared exit to the opener. The result back arrow stays absent; the inner swipe stays disabled. Temporary non-Jest checks run the source submit callback with mocked send boundaries and the installed StackRouter: four regression cases fail before the fix; six cases pass after it, including definite-failure retry and ambiguous-broadcast blocking. Babel parse (four source files), `check:design` (30 canonical sources), `check:safe-areas --changed`, and `git diff --check` pass. | Source and synthetic navigation evidence only. No Metro, device, emulator, or simulator work. Orchestrator owns native Back/swipe, new-send, conversion, and cross-chain QA. Broader TX-1 remains open. |
| 2026-10-17 | TX-1 correctness: A-15/A-20 conversion estimates | `claude/fix-conversion-estimates` from `f22b7ab9`: `estimateConversion.js`, `SendWizardAmount.js`, `SelectionSheets.js` | Shared RPC helper sends a JSON number, rejects nonfinite or lossy decimal conversion, omits absent `via`/`preconvert`, and retains `preconvert: false`. Amount estimates and best-route choice use only daemon outputs. Failed routes retain selection with the existing error wording; existing skeleton, error, row, theme, and layout styles remain. One-off non-Jest React/RPC fixtures reproduce the old vETH fallback (8.550589563), then check daemon output, partial/all failures, failed-route selection, amount-change cancellation, and 8-decimal serialization. Read-only curl through the installed client serializer: four required routes succeed with names and `preconvert: false`, names with `preconvert` omitted, and currency IDs with `preconvert: false`. Outputs: 0.99973259 USD, 0.99974158 VRSC-USD, 0.00000596 vETH, 0.99926542 VRSCTEST. String control returns -32601. Full responses: untracked `conversion-estimates-qa.local.md`. Babel parse (3 files), design (30 canonical sources), safe-area (2 files), Send wizard option matrix, and diff whitespace checks pass. Review/preflight calculations are unchanged. | Orchestrator owns device QA: success, loading, unavailable estimate, failed-route selection, amount edit/retry, and Back, in light/dark and normal/compact layouts. No Metro, device, signing, broadcast, mainnet, merge, or push actions in this implementation task. TX-1.8/TX-1.9 remain open. |
| 2026-10-17 | TX-1 A-21/A-22: Ethereum export recipient and received-asset label | `claude/fix-eth-export-recipient` from `f22b7ab9`; `wizardUtils.js` and the existing non-Jest option check | Design contract: retain `SelectionSheet` / `SelectionRow`, layout, and dismissal behavior; correct route classification and asset text only. The option matrix reproduced both defects before their fixes, then passed with private/mainnet vETH definitions, renamed Ethereum systems, non-Ethereum systems, and MKR network labels. Live private/mainnet `getcurrency vETH` both report proof protocol 3 and native destination type 9 (`DEST_ETH`). Executed source callbacks accept a valid Ethereum recipient, reject Verus destinations, select ETH/ERC20 self addresses, and build `DEST_ETH`. Existing intent context and validator accept the private-chain zero-amount fee quote and 0.05 unsigned candidate from `sendcurrency` with `returntx=true`: zero inputs, one output, Ethereum recipient. Babel parse and `check:design` pass. | Parent QA owns native recipient, sheet, Back/retry, and success-state checks. No devices, Metro, signing, broadcast, mainnet build, merge, or push in this task. |
| 2026-10-15 | SV-1 second buttons use `secondary` | `claude/sv1-secondary-buttons` from `redesign` (`dbd78021`): `AcknowledgeSheet.js` (the `dismissLabel` button is `variant="secondary"`, 10 points below the primary), `GiftCardServiceOverview.js` (the funding footer's "Fund from another wallet" is `variant="secondary"`, stack gap 10), `DESIGN.md` (a core rule for second buttons; Confirmation; Gift card detail Actions) | The user saw that SV-1 drew "Not now" and "Fund from another wallet" as text buttons, while the app uses the filled `secondary` button for a second action (41 uses, for example `AddressBookEditSheet` "Cancel" with gap 10 and GenericRequest "Leave without sending"; `text` has 12, mostly third-level links such as "Other options"). The SV-1 mockup and DESIGN.md had set `text`. Real taps, Metro from the worktree: `Verus GR3 QA` (`GR3 Test 2`, Testnet, Face ID) and `Verus GR3 Compact` (`SE QA`, Testnet, disposable password). Funding footer ("NFC2 tap test"; new unfunded card "SV1 button QA" on the SE) and share confirmation ("SV1 txid iOS" Share tile; Share before funding on the SE), light and dark, both sizes: the second button is filled (light `#EEF2F8` with a blue label, dark `surfaceMuted` with a white label), about 10 points below the primary, and nothing overlaps on the SE. Not now closes the sheet and the card stays unshared. Checks: `check:design` (30 sources), `check:safe-areas` (2 files), Babel parse, `git diff --check`. Evidence: `docs/qa/sv1-secondary-buttons/` (ignored). | Not run: Android (same component and variant; no platform code). Older screens that still use `text` for a back-out ("Cancel" in `WalletBackupRequestInfo` and one in `SpendableKeyRequestInfo`, the `LoadingModal` cancel) are unchanged. |
| 2026-10-15 | SV-1.15 and SV-1.16: Android txid row and hardware Back on the gift card detail | `claude/sv1-android-back-txid` from `redesign` (`a02f1c10`): `GiftCardServiceOverview.js` only. SV-1.15: the pending txid `Text` drops `selectable` (Android does not ellipsize selectable text; `CopyAction` copies the full ID). SV-1.16: a `useFocusEffect` adds a `BackHandler` listener only while the detail shows and the screen has focus; it calls `setSelectedCardId(null)`, as the arrow does, and returns `true`. | Metro from this worktree; installed debug build `com.verusmobile`; real taps through adb, Testnet, VRSCTEST, disposable password. `Small_360x640` (`AND Small`): hardware Back on the detail → list; Back on the list → Services; detail → QR code → Back → detail → Back → list; a fast double Back from QR → list (before the fix the second Back left the screen, which likely explains the one-off Services-root result); the edge back gesture (gesture navigation) on the detail → list and on the list → Services; Back with the ⋯ sheet open closes only the sheet; the on-screen arrows still work. Card "SV1 txid fix" funded 0.01 (`be520138…`): Pending row shows one monospace line with a middle ellipsis, 17 dp high (light). `Pixel_8_API_35` (`SV1QA`): Back and the edge gesture on the detail → list; list Back → Services; card "SV1 txid P8" funded 0.01 (`26f7f18f…`, 2 confirmations on `api.verustest.net`): one line with a middle ellipsis in dark and light, copy shows the check; the share confirmation closes on Back; after Share the QR screen → Back → detail, a fast double Back → list, two edge gestures → detail → list; with the detail open, Back on the Wallet tab sends the app to the launcher, as it does without the detail. iOS `Verus GR3 QA` (`GR3 Test 2`, Face ID): card "SV1 txid iOS" funded 0.01 (`d4484267…`); the Pending row is still one line with a middle ellipsis (dark). Checks: `check:design` (30 sources), `check:safe-areas` (1 file), Babel parse, `git diff --check`. Evidence: `docs/qa/sv1-android-fixes/` in the worktree `.claude/worktrees/eager-napier-b85de5` (ignored; no QR code). | SV-1.17 was decided in a separate change (keep the behavior). Not changed: on 360×640 the QR screen content is taller than the viewport, so the scroll view clips the QR frame at the top of "Save to photos"; after a scroll the frame and the warning show above the button. The button covers nothing; a fix needs a design choice (a smaller QR on compact heights or a scroll cue). Not run: the txid row in dark on the small AVD and in light on iOS; clipboard content (the copy check was seen). Test cards left: `AND Small` holds "SV1 txid fix" (Ready, not shared), `SV1QA` holds "SV1 txid P8" (Shared, 0.01 still on it), and `GR3 Test 2` holds "SV1 txid iOS" (funded, not shared). |
| 2026-10-15 | SV-1 Android run and a claim by the local VRSCTEST daemon | `redesign` at `3db8f25b` (no source change), Metro from the worktree `claude/sv1-android-qa`, installed debug build `com.verusmobile` | Real taps on the Pixel_8_API_35 emulator (profile `SV1QA`, imported from the designated disposable seed with Testnet selected) and the `Small_360x640` AVD (360×640 dp, profile `AND Small`), Testnet, VRSCTEST, disposable password, Custom RPC `https://api.verustest.net`. Services: tiles 179×140 dp (Pixel 8) and 154×140 dp (small), 20 dp inset, 12 dp gaps, equal columns, captions "Send funds or IDs", "Save addresses", "1 card", "2 cards"; light and dark; both tiles open. Gift card "SV1 Android QA": Not funded (footer, no tiles, ⋯ rows) → Share before funding sheet → funded 0.01 in the app (`96b35453…`) → Pending → Ready (76 dp tiles) → the confirmation closes on Not now, hardware Back and an outside tap → Share → Android sheet → Copy → Shared; a second share skips the sheet. NFC tile on the emulator: "NFC is not supported on this device." Claim by the daemon: the card QR was decoded on the Mac (Vision); the key derived from it gives the funded address (matches the funding output and `getaddressutxos`); the daemon signed a sweep with the key on stdin: `8de181f2…`, 0.0099 to daemon address `RBAn5W…nfTBZC` (`ismine` true). While unconfirmed the card stayed Shared with 0.01; at 1 confirmation it showed Claimed, "Empty", Claimed by `RBAn5W…nfTBZC` (copy gives the full address) and Claimed; the list shows the Claimed badge and filter. External funding: card "SV1 Android ext" funded by daemon `sendtoaddress` 0.02 (`1c86ee5b…`) stayed "Not funded" until confirmed, then went straight to Ready; daemon claim `86201936…` → Claimed by `RVx5aS…DYEfoT`. Small AVD: Not funded, Pending, Ready, Shared, ⋯ sheet, confirmation with Not now, light and dark (`a1d1945f…` funds "SV1 Small QA", left Shared). Filter row: a tap on the left part of "All" after scrolling selects it. `font_scale` 1.3 changes nothing in the app. All transactions checked on the daemon. Evidence: `docs/qa/sv1-android/` (ignored; no QR images). | Open: SV-1.15 (txid row clipped on Android), SV-1.16 (hardware Back from the detail leaves the list), SV-1.17 (Android share sheet always counts as Shared; decision). Seen, not changed: on 360×640 the last fact row sits under the bottom scroll fade at rest (readable after a scroll); the QR screen's "Save to photos" button overlaps the bottom of the QR frame (the code stays whole). Not run: NFC write, a share target other than Copy, password-protected cards, non-native contents, Cancel and Remove, the QR screen in dark. |
| 2026-10-15 | Gift card fixes from SV-1 Track B QA | `claude/gift-card-fund-comma-and-fade-taps` from `redesign` (`1a439685`): `GiftCardFund.js` (amount `onChangeText` runs `sanitizeNumericInput`, the helper Receive already uses, so a comma becomes a dot before validation and before the outputs are built), `ScrollEdgeFade.js` (the `Svg` now sits in a `View` that has `pointerEvents="none"`, the position and the size) | Real taps on `Verus GR3 QA` (`GR3 Test 2`, Testnet, Face ID), Metro from this worktree. Comma: before the fix "0,01" stayed as typed and "Review gift card" stayed disabled; after it the field shows "0.01", the button is enabled and the review step lists VRSCTEST 0.01 (not funded; no transaction sent). Filter row: before the fix a tap at x=24 and x=28 on "All" did nothing ("Ready" stayed selected), also with no scroll, so the invisible left fade (opacity 0) catches the touch; x=60 worked. After the fix a tap at x=24 selects "All", the row still scrolls, the left fade still shows, and a tap on "Pending" under the fade (x=26) selects it. Checks: `check:design` (30 sources), `check:safe-areas` (2 files), Babel parse. | Not run: Android; a vertical `FadedScrollView` with overflow after the change (only the gift card list, which did not overflow, and the fund step were seen); a real comma-locale keyboard (the simulator keypad showed a comma key and the typed comma reached the field). The root cause for the swallowed touch is inferred from the before/after taps, not from a view-hierarchy dump. |
| 2026-10-15 | SV-1 Track B: fixed gift card screen (SV-1.6–1.14) | `claude/sv1-gift-card-detail-7ab6e6` from `redesign` (`87566047`): `GiftCardServiceOverview.js`, new `GiftCardFixedCard.js`, new `src/components/StatusBadge.js` and `statusBadge.styles.js` (exported from `src/styles/index.js`), `GiftCardQrScreen.js`, `giftCardPresentation.js` and its unit test, `giftCard.js` (one message), `DESIGN.md`; `GiftCardFlipCard.js` deleted | Spec change (SV-1.6): the presentation unit test now expects "Claimed", "Shared", "No contents yet" and "Empty" instead of "Redeemed", "Ready to fund" and "Claim completed"; internal `redeemed` names kept. Pending amounts come only from the outputs that `addGiftCardPendingFunding` stores from the pending broadcast; a record without outputs shows its VerusIDs or "No contents yet". Real taps on `Verus GR3 QA` (`GR3 Test 2`, Testnet, Face ID) and `Verus GR3 Compact` (`SE QA`, Testnet, disposable password), Metro from this worktree. Card "SV1 detail QA": Not funded (light) → ⋯ with "Share before funding" → confirmation with the empty-card text; Not now, outside tap and Share each checked (Share opened the system sheet; dismissing it rolled the attempt back, card stayed Not funded) → funded 0.01 VRSCTEST (`96ae4b21…`) → Pending with the dimmed recorded amount, the funding transaction row and copy (light, dark) → Ready (dark) → QR code → funded-card confirmation → Share → Shared (dark) → ⋯ Cancel gift card → existing cancel sheet → claim `918e3b70…` → Claimed with Claimed by (copy verified on the clipboard), Claimed and Created (light, dark). SE card with a long name: Not funded with footer, Fund from another wallet opens the external step, funded 0.01, Ready, confirmation, QR, Shared (light, dark). List: neutral Shared and Claimed badges, summaries without "Shared ·", Shared and Claimed filters (dark). A shared card skips the sheet. Fixed during QA: the QR screen showed "Gift card unavailable" on a first share (it read storage before the share was saved; it now waits while the share is reserved); the funding footer vanished during a share attempt; the card shadow was clipped at the top. Independent review (SV-1.14, report only): nothing blocking; fixed visible "Redeemed" wording, a hidden pending addition on a funded card, plural wording and dead code. Checks: `check:design` (30 sources), `check:safe-areas` (8 files), Babel parse, `git diff --check`, `giftCardPresentation` and `giftCard` unit suites (53 tests), an ESLint undefined/unused pass. Evidence: `docs/qa/sv1-track-b/` (ignored). | Not run: NFC write (no NFC on the simulator), Android, large text size, the native Share sheet completing a real send, Claimed reached through a second profile (this run cancelled the card back to its own wallet). Seen, not changed: the fund amount field rejects a comma decimal from the iOS keypad ("0,01"); the left fade of the filter row swallows taps on the left part of "All" after scrolling. Decisions: a Not funded card shows no share tiles ("Share before funding" in ⋯ uses the system share after the sheet); the card-variant neutral badge uses the mockup's light tint; a shared card that is still empty keeps the funding footer. |
| 2026-10-15 | SV-1 Track A: Services tiles (SV-1.1–1.5) | `claude/sv1-services-tiles-1b8f39` from `redesign` (`87566047`): `SignedInServicesHome.js`, `signedIn.js` (purpose lines replace the two descriptions); deleted `services-gift-card-folded.png` and `services-address-book-folded.png` (nothing else imported them) | iOS simulators `Verus GR3 QA` (402 pt) and `Verus GR3 Compact` (iPhone SE), Metro from the worktree, real taps, Testnet. The tile is local to the Services root, so its styles stay in the screen. The gift card count reads `requestServiceStoredData(GIFT_CARD_SERVICE_ID)` through `normalizeGiftCardServiceData`, as `GiftCardService` does; both counts load on focus. `GR3 Test 2`: dark and light, "3 cards" (the list holds 3 cards); the address line went "Save addresses" → "1 saved" → "2 saved" → "1 saved" → "Save addresses" as test records were added and removed, each on return to the tab. SE: a new disposable Testnet profile `SV1 Tiles QA`, dark and light with no cards and no addresses ("Send funds or IDs", "Save addresses"), then "1 card" after one unfunded card was saved through "Fund from another wallet". Measured tiles: 175×140 (402 pt) and 161×140 (SE); the mockup gives 170.5×140 at 393 pt. Both tiles open their screens. At the largest accessibility text size nothing changes, because `applyGlobalTypography.js` turns off font scaling. Checks: `check:design` (30 sources), `check:safe-areas` on `SignedInServicesHome.js`, a Babel parse (2 files), `git diff --check`. ESLint does not start in this checkout (`eslint-plugin-import` cannot load; environment). Evidence: `docs/qa/sv1-track-a/` (ignored). | Icons use the Lucide default stroke (2), as the sheet action rows do; the mockup draws 1.8. The user kept 2 (2026-10-15). Not run: Android, VoiceOver (labels from source, for example "Gift cards. 3 cards"), the loading state (the line stays empty until the first load ends; too fast to capture), and the load-error path (falls back to the purpose line; source only). The SE keeps `SV1 Tiles QA` with one unfunded card. |
| 2026-10-15 | SV-1 preparation | `claude/sv1-prep` from `redesign` (`c817c795`): `DESIGN.md`, `AcknowledgeSheet.js`, this plan | The user chose the Services tiles and the fixed gift card from HTML mockups (artifact and `docs/qa/sv1/mockup.html`), then corrected the copy button, the sheet action rows, the status dot, and the missing "Not now". DESIGN.md now has the status badge rule, the Confirmation sheet rule, the "Services home" and "Gift card detail" patterns, and four pattern-map rows. `AcknowledgeSheet` takes an optional `dismissLabel` that renders an `AppButton` with `variant="text"`; without it the sheet is unchanged. Checks: `check:design` (30 sources), `check:safe-areas` on `AcknowledgeSheet.js`, a Babel parse, `git diff --check`. | The dismiss button is not rendered yet; Track B renders it on the simulator (SV-1.13). Next: Track A (SV-1.1–1.5) and Track B (SV-1.6–1.14) in parallel. If both merges touch this log, keep both rows. |
| 2026-10-12 | O7 completion feedback | `claude/request-completion-feedback` from `redesign` (`9ea5133d`), merged into `redesign`: `NeutralCheckMark.js` (new), `GenericRequestHome.js`, `DESIGN.md`, one mock line in `genericResponseNetwork.unit.test.js` (the test mocks each component that `GenericRequestHome` imports) | iPhone SE, Metro, real taps, deeplink-sim, screen video frames. The first-pass O7 finding was wrong: a POST sign in shows “Preparing response”, “Sending response” and “Response sent” (the check animates, then holds about a second) before it returns to the wallet. The first-pass screenshots caught only the wallet. Changed: the “Request complete” (no response sent) and “Browser opened” sheets use a neutral mark instead of the green check, because they confirm no delivery. Verified in dark and light mode; the POST sheet keeps the green check. `check:design`, `check:safe-areas`, parse, and the three nearby unit suites pass. The full jest run has 25 failing suites; the ones I read fail on the `react-native-svg` and native-module setup, and the `lucide-react-native` import in `HighRiskStep.js` predates my work. | Not changed: a POST success closes by itself after 0.9 s while the other two wait for Done; the identity-update sheet is a near copy of this sheet; app encryption, data and credential flows share this code path but were not re-recorded; Android not re-run. |
| 2026-10-12 | Small-device follow-up: compact titles, gift-card acknowledgement sheet, unlock and payment fixes | `claude/small-device-followup` from `redesign` (`7148dfc3`), merged into `redesign`: `RequestTitle.js` and `AcknowledgeSheet.js` (new), `BottomSheetModal.js`, `UnlockWalletSheet.js`, `SendModal.render.js`, `GenericRequestHome.js`, `GiftCardServiceIntroSlider.js`, nine request screens and five style files | `Verus GR3 Compact` (iPhone SE), the `Small_360x640` AVD (720×1280 px), Metro, real taps, VRSCTEST daemon, deeplink-sim. Verified: compact titles (26/32) on both devices; sign in, app encryption, identity-update review and high-risk titles fit on one line; gift-card acknowledgement sheet on both; the sync-failed alert shows over the unlock sheet on Android and “No” finishes the unlock; the unlock sheet with the keyboard fits on Android and SE; the payment review no longer adds the status bar inset twice on Android; a failed delivery shows the host on its own line. Checks: `check:design`, `check:safe-areas --changed`, parse, three existing unit suites (8 tests). | Not changed: O5 and O6 are dev-only (the LogBox warning comes from `react-native-tab-view` 3.5.2 under React 18.3; the “Refreshing…” banner is the Fast Refresh indicator); O7 completion feedback needs a design decision; the O8 chevron did not reproduce (the chip is not pressable on data reviews); long VerusID names still truncate. Not run: dark mode on SE, Android payment send, text scaling. |
| 2026-10-12 | Small-device GenericRequest run (iPhone SE and 360×640 dp Android) | `claude/small-device-gr-qa` from `redesign` (`565da5d5`), merged into `redesign`: `BottomSheetModal.js`, `PasswordCheck.js`, `ProvisionIdentityBottomSheet.js`, `AuthenticationRequestInfo.js`, `AppEncryptionRequestInfo.js`, `InvoiceInfo.js`, `InvoicePaymentReview.js`, `InvoicePaymentResult.js`, `SpendableKeyRequestInfo.js` | `Verus GR3 Compact` (iPhone SE, iOS 26.5), a Pixel 8 AVD at 720×1280 px (size override) and a real 720×1280 AVD, Metro, real taps, VRSCTEST daemon, deeplink-sim and the provisioning webhook. Harness-verified: sign in, + app encryption, data packet, + data packet, credential variants, identity update (content add, tx confirmed), invoice (paid 0.01), five delivery modes, six rejections. High-risk updates, claim with no funds, wallet backup and provisioning reviewed only. Fixed: Android tall sheets ran off the screen (identity-update acknowledgement button unreachable; `BottomSheetModal` max height), provisioning and password sheets hid Continue behind the keyboard, five reviews had no scroll cue, a claim ended with a false “No response was sent” sheet. Design, safe-area, parse and completion-flow checks pass. | Open: unlock hangs when the sync-failed alert opens under the unlock sheet (Android), identity-update review and payment review clipping (Android), dev warning toast over Send, “Refreshing…” banner over the title, inconsistent completion feedback. Not run: NFC, funded claim, gift-card creation, registration, Android payments. Local report: `docs/qa/small-device/report.local.md` and `gallery.local.html` (ignored). |
| 2026-10-11 | NFC-1 tap screen (NFC-1.9–1.11) | `codex/nfc-1-claim-from-card`, same commit as NFC-1.1–1.7: `walletBackupNfc.js` (phase runner, error codes, iOS sheet text, session flag), new `nfcTapText.js`, new `components/NfcTap/` (`NfcTapSymbol`, `NfcTapView`, `NfcTapModal`, `NfcTapHost`), new `nfcTap.styles.js`, new `useReduceMotion.js`, `nfcTap` reducer and dispatchers, `VerusMobile.js` (host, security cover), `deeplinkNfc.js`, `WalletBackupRequestInfo.js` and its styles, `ImportNfc.js`, `GiftCardShareController.js`, `GiftCardShareSheet.js`, `GiftCardServiceOverview.js`, `tokens.js` (`primaryBackground`); `deeplinkNfcSubmission.unit.test.js` ported to the tap screen | iOS simulators `Verus GR3 QA` (402 pt) and `Verus GR3 Compact` (iPhone SE), Metro, real taps. NFC came from a fake chip patched into the running debug app through the debugger (`NfcManager` methods replaced in memory; no app code; gone after the app stopped). The fake recorded the iOS sheet calls. Claim read signed out: waiting (“Hold the card here”, waves up), active (“Hold still”, ring), done (check) → “Claim this card” opened by itself; sheet “Hold still.” → “Done.”. Card moved → “Card moved too soon” with Try again and Cancel; sheet error “Card moved too soon.”; Try again → waiting. Wallet-backup card signed out → “Wallet backup found” with Restore wallet; from Login → Other options it closed and opened the restore step, which started its own read. Signed in → “Wallet backup found” with Close only. Restore: no backup (notice), no card (failed), sheet Cancel (back to start, no text), a fresh unencrypted throwaway backup → “Backup found” → “Personalize your wallet” (stopped there; no wallet created). Backup from Settings (GR3 Test 2, encrypted): preparing with grey ring during the multi-minute encryption (JS thread busy, ring kept turning), waiting, active, “Backup written” with the wallet-password text, Done → Security & recovery. Unencrypted: card moved → failed → Try again → written with the no-password text. Request mode (dark, from “Back up first”): failed → Try again went straight to the read after the fix (first run asked the no-password question again) → “Backup written” with Continue → GR3-D17 screen, cancelled. Gift card write (new unfunded draft “NFC2 tap test”): waiting, card moved → failed, Try again → “Gift card written” with Done → card shows “Shared from this wallet”. Light and dark at 402 pt; compact dark (no card found, notice with two actions). Normal-size “Get started” has three rows on the simulator: the NFC support check runs before the fake loads. Fixed during QA: repeated no-password question on Try again; a program error (TypeError) showed its raw text, now the general hint; known card results no longer log as errors. Checks: Babel parse (32 files), `check:design`, `check:safe-areas --changed` (22 files), `git diff --check`; Jest: NFC read (4, ported) and NFC module (33) pass. `nfcImportSubmission` and `walletBackupRequestSession` fail to load before and after (incomplete `react-native` mock). Evidence: `docs/qa/nfc2/` (ignored). | NFC-1.8 on the physical iPhone: real card, real iOS sheet, haptics, timing, security cover. Android not run (5-second hold, centered layout, Cancel button, translucent status bar). NFC-D1–D4 recorded. |
| 2026-10-11 | NFC-1 claim from an NFC card (NFC-1.1–1.7) | `codex/nfc-1-claim-from-card` from `redesign` (`74706a68`), uncommitted: `deeplinkNfc.js`, `walletBackupNfc.js`, new `useNfcSupported.js`, `LoadingModal.js`, `OnboardingStartSheet.js`, `LandingScreen.js`, `OtherOptionsSheet.js`, `Login.js`, `VerusPay.js`, `CreateProfile.js`; test mock in `deeplinkNfcSubmission.unit.test.js` | iOS simulators (`Verus GR3 QA`, `Verus GR3 Compact` iPhone SE), Metro, real taps. The simulator has no NFC, so a temporary, uncommitted stub made `isNfcSupported` true and returned a chosen card result; the stub is removed and no QA code remains. Card link: an unsigned VRSCTEST wallet-backup + spendable-key request with a new throwaway key (address derived with the app's own key code), funded 0.01 (`5b8090f3…`). Signed out with wallets: Other options → “Claim from NFC card” → status modal → “Claim this card” (first time this choice is reachable) → Claim to existing wallet → 0.0099 found after one confirmation → unlock GR3 Test 2 → claim `d6a1b0a8…` (mempool, spends the funding) → balance 5.0289 → 5.0388. Signed in: Scan → button → “Claim this card”; reopening the claimed card showed GR3-D17. No wallets (compact): “Get started” has four rows; Import and Back keep them; the read opens “Create wallet” for the card. Onboarding Scan QR code with the card link (scanner `onScan` called through the debugger; no simulator camera) opens the same request; Cancel returns to Welcome. Messages: wallet-backup card signed in (explanation) and signed out (Continue opens the NFC restore step); “Nothing to claim”; “Card not read”; cancel shows nothing. Light and dark: Other options, status modal, claim choice, Scan button, Get started (compact). The stuck-modal race was reproduced at 0 ms and gone after the fix. A JS reload while signed in closed the debug app once (fits GR3-E2; no crash report). Checks: Babel parse (11 files), `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: NFC read and NFC backup suites, 37 tests pass. `profileCreationSubmission` and `walletBackupRequestSession` fail to load before and after (no VisionCamera mock; missing `StyleSheet` mock). Evidence: `docs/qa/nfc1/` (ignored). | NFC-1.8 on the physical iPhone with a card (GR-3.9 session): real NFC reads from all three entries, the Scan button over the live camera, the iOS NFC sheet and cancel. Normal-size “Get started” not captured (the normal simulator has wallets). Android not run. GR3-D16 and GR3-D17 recorded for later. |
| 2026-10-10 | GR-3.17 GR-1/GR-2 closure and QA-1 record | `codex/gr3-request-matrix` at `dd3a476f`; local `docs/genericrequest-types-and-chains.html` (ignored) | Runtime gap checks first (iOS `Verus GR3 QA`, profile `GR3 Test 2`; Android emulator, profile `GR3 Android`): credential request with a required signer the wallet does not control showed “Required VerusID unavailable” with Switch wallet and sent nothing; with its own ID it proceeded; the request-details sheet showed the full required ID and closed and reopened; a data-packet request opened while locked showed “Unlock wallet to review”, unlocked with Face ID from the request, kept every item unchecked with “Sign data” disabled, and after consent the harness verified 4 signatures; the iOS picker opened and showed the selected state after the GR3-B9 fix; Android hardware Back on a review returned to Wallet and sent nothing (GR3-D15: request state not cleared). QA-1 for GR-1/GR-2/GR-3: QA-1.1 contracts, commits, and touched paths are in the GR rows above. QA-1.2 light and dark at normal size on the real app; compact from the GR-1 fixtures and GR-3.13; GR-3 compact deferred by the user. QA-1.3 labels and enabled states from the Android accessibility tree (every control labelled, “Sign data” disabled until consent; each checkbox row also exposes an inner unlabelled disabled node, possible duplicate announcement, not confirmed); sheet close/reopen; Android hardware Back; safe areas and scroll cues in screenshots; text scaling has no effect app-wide; reduced motion and full VoiceOver/TalkBack not run. QA-1.4 design, safe-area, parser, and focused Jest checks pass for every GR-3 commit. QA-1.5 GR-1/GR-2 independent design and signing reviews READY (GR-1/GR-2 report); GR-3 changes have no separate independent review. QA-1.6 shared changes rechecked on sign-in, identity update, invoice, and claim in GR-3.16. QA-1.7 screens, callbacks, and transactions recorded separately. QA-1.8 open items have owners: GR3-B8 task, GR-3.9 user device, GR3-B4 and P1 deferred, GR3-D12 and D15 recorded. Protocol map refreshed: nine supported details, unsigned order rules, delivery path, error state, runtime evidence per type, open items; renders at desktop and 375 px width without page overflow, light and dark tokens. | Full VoiceOver/TalkBack walkthrough, reduced motion, and the text-scaling decision stay as QA-1 follow-ups. GR-3 has no separate independent review. GR-3.12, GR-3.13, and GR-3.16 wait for GR-3.9. |
| 2026-10-10 | GR-3.16 matrix rerun and Android smoke | `codex/gr3-request-matrix` at `8270ae32`, fixes in commit `dd3a476f`: `SpendableKeyRequestInfo.js` (claiming spinner) and `IdentityPickerSheet.js` (boolean `accessibilityState`) | iOS `Verus GR3 QA`, profile `GR3 Test 2`, cold launch, real taps. Harness-verified: sign-in + app encryption in POST, fail once (attempt 2), fail always (Leave without sending), redirect (Safari verified, Browser opened sheet), no callback (Request complete); identity update content add `12eecb53…` and content replace with fail once `d33d60ce…` (one transaction, same txid redelivered), both confirmed; high-risk authorities cancelled with no callback; data packet POST and fail always; credential missing; both credential/data-packet orders; sign-in + credentials and sign-in + invoice (`4c74bb97…`) with the GR-3.19 labels; invoice only `2f6e9187…`; six rejected-request cases with no callbacks; provisioning accepted by the webhook, then the expected failure notice (GR3-E1). Claiming state held with a QA-only debugger hold (removed): before/after in light and dark, claim `cfdafdc8…`. Android `Pixel_8_API_35`, debug APK, new disposable profile `GR3 Android`: app encryption POST, sign-in + data packet (“Continue to sign data”), identity update `b2b03cdb…`, credential missing, wrong network and over-length, provisioning accepted, invoice `eeede94a…`, gift-card claim `3e55575c…` with the fixed claiming state in light and dark. GR3-B9 reproduced on Android before the fix and gone after it. GR3-B8 reproduced three times on iOS; a debugger counter showed an identical signed transaction returned as success. Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: identity picker and spendable key suites, 38 tests pass. | GR3-B8 triage (outside the redesign). Credential matching and provisioning registration need GR3-E1 cleared. Wallet backup on the physical iPhone (GR-3.9). Compact deferred. Android: GR3-D12 also hits the unlock sheet after a sync failure. |
| 2026-10-10 | GR-3.19 mixed-request next step | `codex/gr3-request-matrix`, commit `8270ae32`: new `genericRequestNextStep.js`; `GenericRequestHome.js`, `AuthenticationRequestInfo.js` | iPhone 17 Pro simulator, VRSCTEST, profile `GR3 Test 2`, real taps. Before: auth + data packet showed “Sign in with VerusID”, then “Sign data” with no hint. After: the same request showed “Continue to sign data” once a VerusID was selected; it opened “Sign data”; signing all four items delivered one response (harness: authentication verified, 4 signatures, 1 attempt) and the app returned to Wallet. Auth + credential: “Continue to share credentials” (about 231 of about 295 points available on iPhone SE, so no truncation) opened “Share credentials” (light and dark); cancelled. Auth + provisioning (local webhook): the label stays “Sign in with VerusID”; cancelled, nothing submitted. Cancel at step 2 sent nothing (harness `waiting`, 0 attempts). A node script on the real helper with real VDXF keys covers 15 mixes (each type, provisioning, skipped backup, auth last, already processed). Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: completion and link-failure suites, 11 tests pass. | Invoice, Identity Update, wallet backup and claim labels verified by script only. Compact size not run. |
| 2026-10-10 | GR-3.18 high-risk steps, names, claim review | `codex/gr3-request-matrix`, commit `50727421`: `HighRiskStep.js` + `highRiskStep.styles.js`, `VerusIdContentChangeCard.js` + `verusIdObjectData.styles.js`, `IdentityUpdateRequestInfo.js`, `ProvisionIdentityBottomSheet.js`, `fullyqualifiedname.js`, `SpendableKeyRequestInfo.js` + `spendableKeyRequestInfo.styles.js`, `spendableKey.js` | iPhone 17 Pro simulator, VRSCTEST, new disposable profile `GR3 Test 2` (Face ID), real taps, light and dark. Before/after with deeplink-sim high-risk requests on `liveqa09482856.antafri@` (all cancelled, nothing approved): authorities step shows current and new recovery and revocation IDs in full (was `TestBob....SCTEST@` only); shared-control step shows the added address `RSRGXw62…` (was “Added”); acknowledgement sheet shows names with i-addresses; clear-content cards read “Unnamed key” with the full i-address (was `iDdo...GC45`); “Updating identity” wraps after a dot. Provisioning (local webhook, not submitted; request stayed `qr_generated`): the name preview and the review row wrap after a dot. Gift-card claim: card funded from the daemon with 0.05 VRSCTEST (txid `d7e1b9ca1a0c0b6830c43e65f079cb90bed75dc872cb3499cf34db90585e3562`); the review showed To `GR3 Test 2` / `RXW9b6Pg…` and Network fee 0.0001 VRSCTEST; claim txid `4dacbc0b869dea3b2b2f81bdcb66d76569a25196b87e8f1ca44992c2b8cedb35` pays 0.0499 to `RXW9b6Pg…` with a 0.0001 fee (daemon). Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: 6 related suites, 59 tests pass. | Compact size not run. Loss-of-control and multi-address primary changes use the same rows but were not rendered. The identity picker and the “Request from” card still cut long names with an ellipsis (shared components, out of scope). |
| 2026-10-10 | GR-3.15 request error state | `codex/gr3-request-matrix`, commit `39dabf36`: new `genericRequestRejection.js`; `GenericRequestLoading.js`, `DeepLink.js`, `GenericRequestHome.js`, `sagas/deeplink.js`, `AppThemeProvider.js`; error codes in `requestAccounts.js`, `experimentalDeeplinks.js`, `envelopeValidator.js`, `identityUpdateRequestDetailsHandler.js`, `verusPayInvoiceDetailsValidator.js` | iPhone 17 Pro simulator, VRSCTEST, real taps, light and dark. Signed in: wrong-network-flag “Wrong network”, wrong-network-system “Request not valid”, expired-auth “Request expired”, bad-signature “Cannot verify signer”, unknown-detail “Unsupported request”; Close returned to Wallet each time. Signed out: wrong-network-flag “Request not valid”, Close returned to the signed-out home. Over-length: translated alert, and the backdrop now dims the Wallet (light) and the signed-out home (dark). Network failure injected through the Hermes debugger (QA-only switch on the RPC client, removed, app relaunched): signer lookup failure shows “Network unavailable” with Try again; Try again with the failure still on made one new lookup and showed the error again; with the failure off it opened the sign-in review. Identity Update content lookup failure (content-add request, signed out) showed the error from `GenericRequestHome`; Try again opened “Review VerusID changes”; Close returned to the signed-out home with the deeplink cleared. No request was approved. Checks: Babel parse, `check:design`, `check:safe-areas --changed`, `git diff --check`; Jest: 10 related suites, 55 tests pass; a node script on the real translator covers every mapping. | Experimental-off and delegated-signer copy verified by script only. Compact size not run (deferred). The GR3 Test profile password was lost when the machine crashed (it lived only in `/tmp`), so the signed-in checks after the crash ran signed out. |
| 2026-10-10 | GR-3.14 review leftovers | `codex/gr3-request-matrix`, commit `0c75f191`: `GenericRequestHome.js`, `DeepLinkStackScreens.js`, `InvoicePaymentConfiguration.js`, `ContentStep.js` + `verusIdObjectData.styles.js`, `DataRequestReview.js` + `dataRequestInfo.styles.js`, `math.js`, `genericRequestDelivery.js`, sign-in and app-encryption reviews; network test stubs updated; deeplink-sim `high-risk-private-address` variant on `codex/gr3-generators` (uncommitted) | iPhone 17 Pro simulator, real taps, light and dark. Other-app action and sheet rendered with a temporary, uncommitted “Valu installed” stub (removed): action above the review, review starts under it, footer keeps its bottom inset, sheet in both themes, failed handoff shows “Cannot open Valu Mobile”. Without the stub the review is unchanged. D6: app encryption with HTTP POST shows “POST over HTTP” (review and data details sheet); sign-in with an HTTPS callback shows “Secure POST”; the HTTP request was approved and the harness verified the response (1 attempt). D8: data packet “Statement 1” starts about 42 points under “View request details” (was about 110). D9: identity update “Expires 1 hour”, invoice “About 1 hour”; a node script on the real `blocksToTime` covers 0–100000 blocks, other block times, and invalid input. Content step: private-address change (fresh harness address with no spending key; request cancelled) shows the address once, in monospace. Invoice inline payment options still render. Checks: Babel parse, `check:design`, `check:safe-areas --changed`, Jest: Identity Update (1 test), network (4), and completion (9) suites pass; harness typecheck and 155 tests pass. | Credential review shares the D8 component but was not run. |
| 2026-10-10 | GR-3.13 wallet backup redesign | `codex/gr3-request-matrix` after `ee604685`: `WalletBackupRequestInfo.js`, new `walletBackupRequestInfo.styles.js`, `styles/index.js`, `NfcBackup.js`, `DeepLinkReviewScrollView.js` (keyboard props passed through), `walletBackupNfc.js` (one prompt string) | iPhone 17 Pro and compact simulators, real taps, light and dark. Settings path: options, custom password with keyboard and strength hint, brute-force sheet (Medium to High applied after close), no-password confirmation, and the “Backup not written” alert (simulator has no NFC). Request path from an unsigned VRSCTEST wallet-backup link: signed-out unlock step, create-wallet form, shared unlock sheet (“Wallet backup”, testnet wallet only), options. “Claim this card” choice from the same link with a fresh unfunded spendable key, dispatched with `fromNfc: true` (simulated NFC read). With a temporary, uncommitted NFC write stub (removed; served bundle checked): processing state, “Backup written” with Done (request) or Continue (claim follows), Done finished the request on Wallet with the deeplink cleared (GR-3.12 path), Continue opened the claim step, Settings Done returned to Security & recovery with no alert, and a repeated request skipped the backup (completion marker). Compact: no-wallet create form and keyboard. Fixed during the run: spinner wrapper pushed processing text to the screen edge (`AnimatedActivityIndicatorBox` has `flex: 1`); double status-bar inset under the Settings header; footer partly under the keyboard in Settings; iOS strong-password suggestion left an unseen value in field state (now the onboarding `oneTimeCode` settings). Checks: Babel parse, `check:design`, `check:safe-areas --changed` pass; ESLint cannot load (plugin path error, environment). `walletBackupRequestSession.unit.test.js` already failed to load (mock lacks `StyleSheet`) and pins old copy and the old immediate `next`. A full JS reload while signed in crashed the debug app once (GR3-E2). | Real NFC write, write failure, and card checks on the physical iPhone (GR-3.9). Repair the session test for the result step. `SpendableKeyRequestInfo` uses the same spinner wrapper in its claiming state (likely same defect, not run). |
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

- Branches: `redesign` is the integration branch. It started on 2026-10-10 at
  `8a80f4d6`, the tip of `codex/gr3-request-matrix`, which contains all earlier
  redesign branches. Start each new task branch from `redesign`. Merge it back
  with `git merge --no-ff` after its checks pass and this plan is current.
- NFC-1 (2026-10-11) restores reading a Verus NFC card in three places and
  adds the NFC tap screen to every NFC read and write (one commit). The GR-3.9
  phone session waits for it, so one session covers both.
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
- GR-1/GR-2 runtime follow-up is closed (GR-3.17, 2026-10-10). Recorded
  accessibility follow-ups remain: full VoiceOver/TalkBack walkthrough, reduced
  motion, and the app-wide text-scaling decision.
- Previously recorded GR runtime gap: the normal simulator has competing preview-app deeplink handlers;
  the compact simulator reaches the actual Testnet unlock sheet but its selected
  disposable profile could not be unlocked with the available setup. Isolated
  native fixtures verify rendering and interaction, not wallet signing or live
  callback delivery. No personal/mainnet wallet was unlocked.
- Owners: the GR-1/GR-2 follow-up task retains its runtime gaps; the next TX-1
  task owns the remaining Send/Convert work. ID-1 retains its explicit proof
  limits: iOS-only native evidence, with Android runtime, authenticated
  real-wallet, signing/funds, live RPC, and full accessibility proof still open.
