# PRD: Valu-Parity Signed-In Experience for Verus Mobile

**Status:** Approved implementation baseline

**Last updated:** 2026-07-13

**Product:** Verus Mobile

**Scope:** Signed-in application experience only

## 1. Summary

Verus Mobile will adopt the information hierarchy, visual clarity, and core signed-in journeys of Valu Mobile's `codex/newsend3` redesign while preserving Verus-specific wallet behavior, branding, security, native capabilities, and product constraints.

The result should feel like the Valu signed-in redesign expressed as Verus Mobile—not like Valu branding copied into Verus, and not like a thin reskin over incompatible behavior.

The redesigned bottom navigation will provide:

1. Wallet
2. Services
3. Identity
4. Settings
5. Scan

When the user is in Wallet, two persistent actions will appear above the bottom navigation:

- Receive on the left
- Send or convert on the right

The same actions will be visible in an individual asset's detail experience. Conversion will be part of the send journey rather than a separate bottom-navigation destination.

## 2. Background

Valu Mobile contains a substantially redesigned signed-in experience covering its wallet portfolio, asset detail, transfers, receive requests, Services, VerusID, Settings, and Scan. Verus Mobile retains an older signed-in drawer, sortable widget home, legacy Personal tab, and mixed old/new screens.

Research established that visual and journey parity is feasible, but direct code parity is not:

- Verus Card and channel behavior is more complex and must remain authoritative.
- Verus PBaaS, mapped currency, export, preconversion, Scan, deeplink, NFC, and Gift Card behavior must survive the redesign.
- Valu Buy/Sell requires unavailable Valu-specific backend, provider, legal, and account capabilities.
- Valu is light-only and contains unfinished paths; it is a design reference, not a transplantable release branch.

## 3. Product objective

Create a coherent, modern signed-in Verus Mobile experience with Valu journey parity while making Verus-specific capabilities easier to discover and safer to use.

The redesign must let users:

- Understand their portfolio quickly.
- Open an asset and retain explicit Card/network context.
- Receive, send, or convert without navigating through unrelated menus.
- Find and manage VerusIDs in a dedicated Identity destination.
- Discover optional Services, including Gift Cards and Address Book.
- Reach Settings directly from bottom navigation.
- Scan every currently supported Verus request without regression.
- Use the entire signed-in experience in Light, Dark, or System appearance.

## 4. Goals

### 4.1 Experience goals

- Match Valu's signed-in information hierarchy and overall journey structure.
- Replace the signed-in drawer with clear bottom navigation.
- Make portfolio value, assets, Card counts, balances, and relevant status scannable.
- Make Receive and Send or convert consistently visible at Wallet and asset level.
- Treat Identity as VerusID, not as legacy personal information.
- Keep Services focused on real Verus capabilities.
- Integrate Gift Cards into Services without changing their security model.
- Preserve a calm, Verus-branded visual language in light and dark appearances.

### 4.2 Technical-product goals

- Preserve existing Redux, Saga, Card, channel, deeplink, and native-capability contracts unless a milestone explicitly replaces one.
- Keep active Asset and active Card explicit across all wallet actions.
- Preserve existing external route and deeplink behavior.
- Make the redesigned shell reversible during rollout.
- Centralize new user-facing copy so localization can be added later without restructuring screens.

## 5. Non-goals

The initial project will not:

- Port Valu branding, Valu promotional cards, Valu Social, payment-provider artwork, or Valu-specific assets.
- Implement or advertise Buy/Sell.
- Add a new fiat provider or modify the legacy Wyre backend.
- Add a standalone Convert bottom tab.
- Redesign Gift Card cryptography, claim authority, persistence, funding, redemption, QR, or NFC behavior.
- Delete legacy Personal data from storage.
- Add localization or translated copy.
- Redesign signed-out onboarding/login unless a shared theme or navigation dependency requires a narrow compatibility change.
- Replace Verus wallet reducers, Sagas, channel handlers, or deeplink protocol behavior merely to match Valu code structure.

## 6. Source and target baselines

### 6.1 Design reference

- Repository: `/Users/maxtheyse/dev/valu-mobile`
- Reference: `codex/newsend3`
- Researched commit: `562031df12594f82bb0fc902280773592e88ad2d`

Valu is authoritative for target journey shape and visual intent only. Confirmed placeholders, broken routes, hard-coded light colors, branded assets, and backend-specific behavior are not requirements.

### 6.2 Verus implementation baseline

- Repository: `/Users/maxtheyse/dev/Verus-Mobile`
- Current branch during PRD creation: `codex/redesign-pnpm`
- Current HEAD during PRD creation: `73a5600b357576ec019e8eefeeadcb8e9c48d4cf`
- Spendable-key/deeplink baseline commit: `620b0939f1b4264b2649449aea6413a09bba519b`

Implementation begins from the committed baseline above. At kickoff:

1. Create a dedicated implementation branch from the PRD commit.
2. Re-run a narrow route, dependency, and Gift Card/spendable-key delta review.
3. Keep the spendable-key review and saved-claim replay behavior intact throughout the signed-in migration.

The spendable-key commit and the PRD commit together form the complete behavioral and product baseline.

## 7. Resolved product decisions

| Topic | Decision |
|---|---|
| Overall direction | Valu signed-in journey and visual parity, adapted to Verus |
| Bottom navigation | Wallet, Services, Identity, Settings, Scan |
| Wallet actions | Receive left; Send or convert right |
| Conversion | Part of the send journey; no standalone bottom tab |
| Identity | Means VerusID |
| Personal Profile | Removed from signed-in navigation |
| Settings | Remains a bottom-navigation destination |
| Buy/Sell | Omitted from the initial release |
| Wyre | Existing legacy control and disclosure remain under Settings; do not promote it |
| Address Book | Included |
| Promotional cards | Excluded |
| Gift Cards | Located under Services |
| Gift Card security | Preserve current behavior until dedicated testing and product review |
| Appearance | Explicit Light, Dark, and System setting |
| Localization | Deferred; new copy must be localization-ready |
| Assets | No Valu-branded assets in Verus |

## 8. Information architecture

### 8.1 Signed-in shell

```text
Signed in
├── Wallet
│   ├── Portfolio
│   ├── Manage assets
│   ├── Receive
│   ├── Send or convert
│   └── Asset detail
│       ├── Overview and transactions
│       ├── Card selection and status
│       ├── Receive
│       └── Send or convert
├── Services
│   ├── Gift Cards
│   │   ├── Intro
│   │   ├── Overview and status
│   │   ├── Create
│   │   ├── Fund
│   │   └── Share, redeem, or cancel
│   ├── Address Book
│   ├── VerusID-related service setup where still required
│   └── Other supported Verus services
├── Identity
│   ├── Linked VerusIDs
│   ├── Pending and actionable VerusIDs
│   ├── Link VerusID
│   ├── VerusID detail
│   └── Attestations
├── Settings
│   ├── Profile and security
│   ├── Wallet settings
│   ├── Appearance
│   ├── Coin and Card settings
│   ├── Address blocklist
│   ├── VRPC overrides
│   ├── NFC backup
│   ├── Legacy Wyre control
│   └── App information
└── Scan
    ├── Payment and address QR
    ├── VerusPay invoice
    ├── GenericRequest
    ├── VerusID request
    ├── Identity update
    └── Other currently supported deeplinks
```

Root-level request-review, secure loading, and external deeplink routes remain outside the tab hierarchy where required.

### 8.2 Removed navigation concepts

- The signed-in drawer is removed from the redesigned shell.
- Personal is removed as a bottom destination.
- Personal Profile is not relabeled as Identity.
- Convert is not a bottom destination.
- Buy/Sell is not shown.

## 9. Functional requirements

### FR-1: Bottom navigation

- The signed-in application must display exactly five destinations: Wallet, Services, Identity, Settings, and Scan.
- Each destination must preserve its own navigation history when switching tabs, except where security or current root-request behavior requires a reset.
- Existing supported deeplinks must continue to reach their current request-review flows.
- The old drawer must remain available behind the rollout seam until the new shell passes acceptance.

### FR-2: Wallet portfolio

- Wallet must show total portfolio value using the user's display currency.
- The balance-privacy state must apply consistently to portfolio and asset values.
- Enabled assets must appear in a stable, scannable list.
- Funded assets must sort ahead of unfunded assets.
- Assets without a fiat rate must be represented as price unavailable, not as zero value.
- Each row must be able to communicate:
  - asset name and ticker;
  - crypto balance;
  - fiat value when available;
  - number of Cards when more than one exists;
  - relevant pending, sync, PBaaS, mapped, bridge, or network status.
- Pull to refresh must preserve current balance, rate, info, and relevant service refresh behavior.
- Manage assets must retain browse, PBaaS currency, ERC-20, and supported removal/configuration behavior.
- Valu promotional cards must not appear.

### FR-3: Wallet action area

- A normal-flow, safe-area-aware action area must appear above bottom navigation while Wallet is active.
- Receive must be the left action.
- Send or convert must be the right action.
- The action area must not cover portfolio content at any supported screen size.
- Buttons must adapt to compact width and large text without fixed-width clipping.
- The same two actions must appear on an individual asset detail screen.

### FR-4: Asset and Card detail

- Opening an asset must preserve the currently selected Card where valid.
- When no valid Card is selected, the user must choose one or receive an explicit default consistent with current behavior.
- Card selection must expose Card name, network/system, balance, status, and compatible actions.
- The UI must not offer an action unsupported by the selected Card's capabilities.
- Transactions must remain visible and must open a working detail surface.
- Receive and Send or convert must pass explicit Asset and Card identity.
- Switching Cards must not silently change the meaning of a pending action.

### FR-5: Receive

- Receive must allow the user to select an Asset and, where required, a Card/address.
- Address records must be labeled and copyable.
- Technical identifiers must use the shared CopyAction behavior on redesigned surfaces.
- Existing address, VerusID, invoice, payment-request, PBaaS network, QR, share, and save capabilities must be preserved where supported.
- Network/system mismatches must be explained before the user shares an incorrect request.
- Empty, loading, unsupported, and error states must be explicit.

### FR-6: Send or convert

- Send or convert must open one coherent transfer journey.
- The journey must start with an explicit source Asset and Card when launched from asset detail.
- When launched from Wallet, it must allow source selection.
- The user must be able to select a normal send destination or a compatible conversion destination.
- Conversion options must be capability-driven; unsupported Cards must not show them.
- Existing PBaaS conversion, cross-chain export, mapped currency, preconversion, advanced route, and risk-disclosure behavior must be preserved.
- Confirmation must identify source Card/network, destination, amount, fees, route, and irreversible effects.
- Success and partial-failure states must expose transaction identifiers and next actions.
- The unfinished standalone `Convert` screen is not the implementation baseline.

### FR-7: Services

- Services must use the redesigned Valu-style landing hierarchy with Verus content.
- Services must list only capabilities that actually work or are explicitly enabled.
- Gift Cards must be a prominent Service.
- Address Book must be available from Services and from relevant recipient-selection journeys.
- Valu Social, Valu Proof of Personhood promotions, Valu service cards, and generic stay-tuned cards must not appear.
- Disabled and legacy services must not be promoted as primary capabilities.

### FR-8: Gift Cards

- Existing Gift Card creation, optional claim password, storage, funding, status refresh, QR, copy, NFC, redemption, and cancel-by-redemption behavior must remain unchanged unless a separate reviewed requirement changes it.
- The redesign may change presentation, safe-area handling, accessibility, copy structure, and theme usage.
- The redesign must preserve current warnings concerning spendable secrets and password loss.
- Gift Card state must remain account-scoped and protected by the current storage model.
- Gift Cards must not be described as an ordinary Transfer.
- A Wallet promotional card for Gift Cards is not required.

### FR-9: Identity

- The Identity tab must represent VerusID only.
- It must support linked, ready-to-link, needs-attention, in-progress, loading, empty, and error states.
- It must support link, link-and-login where applicable, retry, refresh, remove, unlink, and detail journeys consistent with current supported behavior.
- VerusID detail must show live identity information and stored attestations.
- The non-functional “Create free VerusID” placeholder from Valu must not be ported as an active action.
- Any future creation action must remain absent until backed by a real flow.
- Legacy Personal Profile routes must not be reachable from the signed-in tab UI.
- Existing stored Personal data must not be deleted by this project.

### FR-10: Settings

- Settings must be directly accessible from bottom navigation.
- Existing profile/security, wallet, app-information, seed, password, delete-profile, blocklist, VRPC, coin, and NFC-backup capabilities must remain reachable.
- Settings must add Appearance with:
  - System;
  - Light;
  - Dark.
- System must follow the operating-system appearance.
- The selection must persist per the existing settings persistence model.
- Legacy Wyre enablement and unsupported/deprecated disclosure must remain accessible under Settings.
- Wyre must not be presented as the initial redesign's Buy/Sell solution.

### FR-11: Scan

- Scan must preserve every request type currently accepted by Verus Mobile.
- Camera permission denied, blocked, unavailable-hardware, processing, malformed-code, unsupported-code, and success states must be explicit.
- Scanning must preserve active Asset/Card selection rules for payments.
- Root deeplink/request-review routing must remain compatible with cold and warm app launches.
- Gift Card and NFC/deeplink claim flows must not regress.

### FR-12: Address Book

- Users must be able to list, search, add, edit, and remove address records where supported by the adopted Address Book scope.
- Recipient selection must be able to open Address Book without losing transfer state.
- An address record must distinguish label, address, Asset/network compatibility, and optional VerusID information where available.
- Selection must be validated against the current transfer context before confirmation.

### FR-13: Appearance and theme

- All new signed-in screens must use semantic theme roles rather than raw Valu color values.
- Verus blue remains the primary action color.
- Inter remains the application typeface.
- Light and Dark must be purpose-designed pairs, not automatic color inversion.
- React Navigation, Paper, sheets, modals, status bars, system bars, and custom surfaces must resolve from the same appearance selection.
- Coin/network brand colors may be used only where they identify that coin or network and retain accessible contrast.
- Valu cyan gradients must not become the default Verus primary action.

### FR-14: Localization readiness

- Initial release copy will be English only.
- New signed-in copy must be accessed through one central copy catalog or equivalent interface.
- Screen modules must not each invent duplicated versions of common labels, statuses, errors, and actions.
- Layouts must not assume English labels remain short.
- Introducing a translation runtime or translating legacy screens is out of scope.

## 10. State and architecture constraints

### 10.1 Interfaces that must remain authoritative

- Active Asset and active application/section state
- All Cards and active Card per Asset
- Card `api_channels`
- Card compatible actions
- Channel-keyed ledger balances, info, transactions, rates, and conversion data
- Service enablement and account-scoped encrypted service data
- VerusID linked and pending state
- Global send modal and request-review behavior where still in use
- Deeplink Redux/Saga processing and root routing
- Gift Card and spendable-key utilities
- NFC and camera native capabilities

### 10.2 Required migration seam

The old and redesigned signed-in shells must be selectable through one temporary rollout flag or equivalent single seam. The flag must not fork wallet business logic.

Presentation can vary across the seam; reducers, Sagas, channel handlers, and security-sensitive utility behavior should remain shared.

### 10.3 Route compatibility

- Preserve current external request and deeplink route names until a dedicated compatibility migration exists.
- Avoid resets that discard an in-progress transfer, request review, or Gift Card claim.
- Define static route inventories for the old and new shells.
- Any intentionally removed route must have either no remaining caller or an explicit redirect.

## 11. Experience-state requirements

Every redesigned data surface must define:

- initial loading;
- refresh loading;
- empty;
- partial data;
- unavailable capability;
- recoverable error;
- non-recoverable error;
- offline or network failure where relevant;
- privacy-hidden state;
- success;
- pending or submitted state.

Use the shared SkeletonLoader for predictable content loading. Do not combine skeletons and spinners for the same content. Signing, encryption, broadcasting, provisioning, and other process states must use stable progress/status presentation rather than content skeletons.

## 12. Security and privacy requirements

- Never expose private keys, seeds, Gift Card mnemonics, or decrypted spendable-key material in logs or ordinary UI state.
- Preserve wallet unlock and request-review gates around signing and private-key operations.
- Balance privacy must apply before values are rendered to accessible labels or screenshots.
- Copy and QR actions containing technical or spendable information must be explicit user actions.
- Gift Card claim links must retain current warnings and handling during this migration.
- External URLs must identify the destination and require existing confirmation where applicable.
- The redesign must not imply that application resume locking is stronger than the implemented behavior.

## 13. Accessibility and layout requirements

- Use `react-native-safe-area-context` for redesigned edge protection.
- Prefer normal-flow safe footers and `SafeBottomActionStack` for bottom actions.
- Do not copy Valu's fixed 160-point dual-button widths or heuristic footer spacers.
- Interactive controls require correct roles, labels, states, and minimum touch targets.
- Privacy, pending, selected, disabled, error, and success states must not rely on color alone.
- Support screen-reader reading order and actionable-control order.
- Respect reduced-motion expectations for decorative and progress animation.
- Do not introduce new dependencies on globally disabled font scaling; layouts must still be checked with large text and longer synthetic labels.
- Required visual matrix:
  - iPhone SE-sized viewport;
  - modern iPhone with home indicator;
  - compact Android API 35;
  - Android gesture navigation;
  - Android three-button navigation;
  - keyboard-open forms and sheets;
  - Light and Dark appearance.

## 14. Asset requirements

- Use existing Verus, VerusID, coin, network, and generic target-owned assets where possible.
- Do not copy Valu logos, app icons, social artwork, Proof of Personhood promotional artwork, payment-provider marks, or `vUSDC` promotional assets.
- New generic artwork must have documented provenance and usage rights.
- Source Sans Pro does not need to be copied; Verus uses Inter.

## 15. Delivery plan

### Milestone 0: Baseline and product contract

- Commit or intentionally remove the current dirty target work.
- Record the implementation baseline SHA.
- Freeze the navigation inventory and supported capability matrix.
- Confirm final bottom-tab icons and labels.

**Exit gate:** agreed baseline, no unresolved overlap with spendable-key or Gift Card work.

### Milestone 1: Application theme

- Generalize the existing semantic Light/Dark theme for signed-in use.
- Add persisted System/Light/Dark selection.
- Connect Navigation and Paper to the same appearance.
- Establish shared signed-in primitives and copy catalog.

**Exit gate:** representative screens and sheets pass the Light/Dark/compact matrix without changing signed-out behavior.

### Milestone 2: Signed-in shell

- Add the new bottom-navigation shell.
- Add Settings and Identity stacks.
- Retain the old shell behind the rollback seam.
- Verify deep-link entry and back behavior.

**Exit gate:** all five destinations open, preserve tab history, and do not break root request review.

### Milestone 3: Wallet portfolio

- Implement the redesigned header, privacy affordance, flat asset list, states, and Manage Assets flow.
- Preserve existing totals and Card-aware selectors.
- Add the safe Receive and Send or convert action area.

**Exit gate:** old/new balance parity over representative multi-Card wallets and compact-device visual approval.

### Milestone 4: Asset detail and Receive

- Implement redesigned asset/Card detail.
- Preserve transaction, status, address, and receive-request behavior.
- Replace broken/unregistered transaction-detail navigation with an intentional route or modal.

**Exit gate:** transparent, private, VRPC/PBaaS, ETH/ERC-20, mapped, and multi-Card scenarios pass.

### Milestone 5: Send or convert

- Build the coherent source/target/amount/recipient/confirm/result journey.
- Adapt useful Valu presentation patterns without adopting Valu backend assumptions.
- Preserve existing PBaaS and advanced-send implementations behind the journey interface.

**Exit gate:** normal send, conversion, export, preconversion, partial failure, and unsupported-Card scenarios pass.

### Milestone 6: Identity, Services, Address Book, and Gift Cards

- Build the VerusID-only Identity destination.
- Redesign Services with Gift Cards and Address Book.
- Adapt Gift Card presentation without changing its security behavior.

**Exit gate:** linked/pending identity states, Address Book recipient return, and complete Gift Card lifecycle pass.

### Milestone 7: Settings and Scan

- Move all supported Settings routes into the Settings tab.
- Preserve legacy Wyre control.
- Apply redesigned Scan chrome and permission/error states without replacing its request parser.

**Exit gate:** Settings reachability, appearance persistence, QR matrix, cold/warm deeplinks, and NFC claims pass.

### Milestone 8: Hardening and rollout

- Accessibility review
- Safe-area checks
- Performance profiling
- Light/Dark screenshot review
- Low-end Android testing
- Release-candidate regression pass
- Remove the old shell only after acceptance

## 16. Verification requirements

Each milestone must run the narrowest applicable checks:

- JavaScript parser or bundle check
- `corepack pnpm check:safe-areas <changed files>`
- Static route inventory
- Relevant focused utility or contract checks
- Manual simulator/device visual verification

Release-candidate regression coverage must include:

- Portfolio totals and missing-rate behavior
- Card selection and compatible-action filtering
- Send, receive, conversion, PBaaS export, and preconversion
- Transaction detail
- VerusID linked and pending flows
- Address Book selection and return
- Settings and profile lock
- Scan permissions and supported QR types
- Cold/warm deeplinks
- NFC backup
- Gift Card create, password, fund, status, QR, link, NFC, redeem, and cancel
- System/Light/Dark persistence

Broad Jest or lint failures unrelated to the change must be reported separately rather than silently treated as redesign failures.

## 17. Success criteria

The initial redesign is successful when:

- Users can navigate the complete signed-in experience without the drawer.
- Wallet, Services, Identity, Settings, and Scan match the agreed Valu journey hierarchy.
- Receive and Send or convert are immediately discoverable in Wallet and asset detail.
- No Personal Profile destination appears in signed-in navigation.
- No Buy/Sell action is presented.
- Gift Cards remain under Services and retain current security behavior.
- Address Book is usable from Services and transfer recipient selection.
- Every currently supported Card/channel action still uses the correct implementation.
- Existing QR, deeplink, NFC, and request-review flows continue to work.
- Every redesigned route works in System, Light, and Dark appearance.
- Compact-device, safe-area, and accessibility gates pass.
- No Valu branding or unapproved Valu/provider assets ship in Verus.
- The old shell can be removed without losing a supported route or behavior.

## 18. Deferred decisions and follow-up projects

These do not block the initial PRD but must remain explicit:

- Future Buy/Sell provider, jurisdictions, assets, backend, compliance, and ownership
- Whether legacy Wyre should eventually be removed completely
- Dedicated Gift Card threat-model and disclosure redesign after hands-on testing
- Future VerusID creation flow
- Localization framework and first supported languages
- Whether legacy Personal data should eventually be exported, migrated, or deleted
- Whether Address Book becomes encrypted/synced beyond its initial adopted behavior
- Product analytics, if any, subject to Verus privacy expectations

## 19. Open implementation details

The following should be resolved during Milestone 0 or the relevant design milestone:

- Exact tab icon family and active/inactive treatment
- Whether Scan uses a normal tab item or visually prominent center treatment
- Exact Wallet action labels: `Receive` and `Send or convert` are the current product requirement
- Exact ordering and grouping within Services and Settings
- Appearance default for existing users without a saved choice; recommended default is System
- Whether legacy Personal routes remain internally reachable for data recovery even though they are removed from normal navigation
- Final implementation baseline commit after current dirty work is committed

## 20. Reference map

### Valu reference areas

- `src/containers/RootStack/HomeTabScreens/HomeTabScreens.js`
- `src/containers/Home`
- `src/containers/Assets`
- `src/containers/Transfer`
- `src/containers/SendWizard`
- `src/containers/Identity/Home`
- `src/containers/Identity/VerusIdDetails`
- `src/containers/Services/ServicesOverview`
- `src/containers/Settings`
- `src/containers/VerusPay`

### Verus authoritative behavior areas

- `src/containers/Home`
- `src/containers/Coin`
- `src/containers/RootStack`
- `src/containers/Services`
- `src/containers/Settings`
- `src/containers/VerusPay`
- `src/utils/defaultSubWallets.js`
- `src/utils/subwallet`
- `src/utils/ledger`
- `src/reducers/ledger.js`
- `src/sagas/channels`
- `src/sagas/deeplink.js`
- `src/utils/giftCard`
- `src/utils/spendableKey`
- `src/utils/walletBackup`
- `src/theme/onboarding`
- `DESIGN.md`
- `docs/ui-safe-areas.md`
- `docs/ui-copy-actions.md`
- `docs/ui-skeleton-loading.md`
