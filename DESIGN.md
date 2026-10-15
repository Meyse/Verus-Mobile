# Verus Mobile design contract

This is the mandatory visual contract for new or intentionally redesigned Verus
Mobile UI. It turns approved, shipped screens into repeatable agent guidance.
It is deliberately smaller than a complete design system: judgment lives here,
while exact mechanics stay in shared components, theme tokens, and canonical
source files.

## Scope

Apply this contract when a task creates a user-visible surface or intentionally
redesigns an existing one. Apply it only to the touched surface.

Untouched legacy UI is neither a design precedent nor an automatic migration
target. Maintenance that preserves an old screen's appearance may keep its
existing visual language until that screen is explicitly redesigned.

Before proposing or writing frontend code, the agent must:

1. Read this file in full.
2. Inspect the closest canonical exemplar below in both source and rendered UI.
3. State a small task design contract: scope, exemplar, shared primitives,
   required states, and any deliberate deviation.
4. Reuse the exemplar's component or shared primitive. If reuse is impossible,
   reproduce its measurements and behavior exactly before adding variation.

Do not average several existing screens into a new style. If a canonical
exemplar conflicts with a general rule below, preserve the exemplar for that
pattern. Change the canonical pattern first, with explicit design approval, and
then let later work inherit the revision.

## Authority

Resolve visual decisions in this order:

1. Explicit instructions for the current task.
2. The pattern-specific canonical exemplar and shared primitives named here.
3. The core rules in this file.
4. Existing redesigned UI that clearly belongs to the same pattern.

Legacy screens are behavioral references only unless this file names them as a
visual exemplar. External design systems and generated suggestions may provide
methods, never Verus Mobile's visual direction.

## Core rules

- Keep pages flat. Do not introduce generic cards to group ordinary content.
  Prefer whitespace, alignment, and hairline dividers. Filled rows are allowed
  only when the canonical selection or state pattern uses them; they are not a
  license for card-based page composition.
- Do not use eyebrow headings, small uppercase pre-titles, or redundant labels
  above the real title.
- Use as few words as the task safely permits. Prefer a direct title, concise
  labels, and one short explanation only when it prevents ambiguity.
- Do not add decorative icons. Icons are allowed only when the canonical
  component already uses them or when they perform a necessary navigation,
  status, copy, or domain-recognition job.
- Give each screen one primary action. Do not duplicate that decision in a
  footer, floating rail, and inline action at the same time.
- Use semantic roles from `src/theme/onboarding` and typography roles from that
  theme plus `TYPOGRAPHY.md`. Do not recreate approved font metrics or raw theme
  colors locally.
- Treat light and dark mode as one deliverable. State, hierarchy, legibility,
  and interaction must survive both.
- Respect safe areas and keyboard changes. Bottom actions stay in normal flow
  through `src/components/SafeBottomActionStack.js`.
- Use monospace only for raw technical identifiers such as addresses, hashes,
  transaction IDs, and public keys.
- Show a status as the tinted status badge: a pill with a semantic background
  and colored text, as `src/components/StatusBadge.js` draws it. Do not put a
  colored dot beside status text.

## Canonical pattern map

| Need | Source of truth | Required starting point |
| --- | --- | --- |
| Theme, spacing, shapes, typography | `src/theme/onboarding/tokens.js`, `TYPOGRAPHY.md` | Consume the existing semantic roles. |
| Signed-out onboarding step | `src/styles/components/signedOutFlow.styles.js`, `src/containers/Onboard/CreateProfile/CreateProfile.js` | Reuse the signed-out flow styles and compact-device rules. |
| Full-screen stepped task | `src/components/ProgressHeader.js`, `src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js` | Reuse `ProgressHeader` and the Gift Card step/action composition. |
| Selection BottomSheet | `src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js` as opened by `src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js` | Reuse the component or match its choose, selected, provisioning, and link modes exactly. |
| Informational BottomSheet | `src/containers/DeepLink/components/RequestReview/DeepLinkRequestDetailsSheet.js` and `src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js` | Reuse the scaffold, section rows, scroll cue, and Done action. |
| BottomSheet shell | `src/components/BottomSheetModal.js`, `src/styles/components/signedOutSheet.styles.js` | Do not construct a new modal shell. |
| Acknowledgement BottomSheet | `src/components/AcknowledgeSheet.js`, matching the seed warning sheet in `src/containers/CreateWallet/Forms/CreateSeed/Forms/SeedIntro.js` | Use it for a warning that the user must confirm. Pass `dismissLabel` when the user may back out. Do not use a native `Alert` for it. |
| GenericRequest screen title | `src/containers/DeepLink/components/RequestReview/RequestTitle.js` | Use it for review, result, and password titles. It applies `headlineLg`, and `headlineCompact` on small devices (window height 667 or less). |
| GenericRequest review | `src/containers/DeepLink/components/RequestReview`, `src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js`, `src/containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js` | Reuse the request-review primitives and hierarchy. |
| Multi-step identity update | `src/containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo.js`, `src/styles/deeplink/identityUpdateRequestInfo.styles.js` | Preserve the dedicated review, content, high-risk, and confirm/pay sequence. |
| Services home | `src/containers/Services/SignedInServicesHome.js` and [Services home](#services-home) below | Use the two-column tile grid. Do not add artwork or descriptions to used services. |
| Service list or manager | `src/components/ServiceManagerHeader.js`, `src/containers/Services/AddressBook/AddressBook.js`, `src/containers/Services/ServiceComponents/GiftCardService/GiftCardServiceOverview/GiftCardServiceOverview.js` | Reuse the shared header and established list rhythm. |
| Gift card detail | [Gift card detail](#gift-card-detail) below, with `src/containers/Services/ServiceComponents/GiftCardService/GiftCardFixedCard.js` | Use the fixed card. Say each fact once. |
| Status label | `src/components/StatusBadge.js` | Reuse the tinted badge with a `success`, `warning`, or `neutral` tone. On the gift card material, pass `variant="card"`. |
| Sheet action rows | `src/components/SignedOutActionRow.js`, `GiftCardOptionRow` in `src/containers/Services/ServiceComponents/GiftCardService/GiftCardOptionsSheet.js`, `src/styles/components/signedOutSheet.styles.js` | Use the unfilled 62-point rows with the dimmed icon, semibold label, and chevron. Do not draw filled option rows. |
| Compact form BottomSheet | `src/containers/Services/AddressBook/AddressBookEditSheet.js` | Reuse its title, input, keyboard, and bottom-action layout. |
| Settings | `src/containers/Settings/components/SettingsScaffold.js` | Compose with `SettingsScreen`, `SettingsTitle`, `SettingsSection`, and `SettingsRow`. |
| Ambiguous vertical overflow | `SettingsScreen` in `src/containers/Settings/components/SettingsScaffold.js`; `DeepLinkRequestSheetScaffold` for request sheets | Show the existing bottom fade and centered chevron only while more content remains below. |
| Search, copy, loading | `src/components/AppSearchField.js`, `src/components/AppSearchLauncher.js`, `src/components/CopyAction.js`, `src/components/SkeletonLoader.js` | Never hand-roll an equivalent local control. |

## BottomSheets

### Selection

The VerusID selector opened from GenericRequest authentication is the canonical
selection sheet. The authority is the running component, not every old
BottomSheet and not a similarly named stylesheet.

Its contract includes:

- `BottomSheetModal` as a floating surface with the shared scrim, animation,
  safe-area gap, 12-point edge margins, and 24-point radius.
- A 76% chooser maximum height and dynamically sized nested link mode.
- Shared sheet body spacing from `createSignedOutSheetStyles(theme)`.
- Existing identity rows at 56 points high, 18-point radius, 16-point
  horizontal padding, and 4-point vertical spacing.
- A 16-point semibold identity label. The selected state uses the semantic
  success background and checkmark; the unselected state uses `surfaceMuted`.
- Shared action rows at a 62-point minimum height.
- The existing request, provisioning, retry, linking, search, manual fallback,
  keyboard, reduced-motion, and in-sheet back-navigation behavior.

The functional icons and chevrons already present in this exact component are
part of the current canonical pattern. Do not add more decoration, but do not
silently remove these while copying the pattern. A future approved redesign of
the canonical component may change the rule for later sheets.

Do not use `src/styles/deeplink/identityPickerSheet.styles.js` as visual
precedent. It is a stale, unused style file rather than the running selector.

Simple transfer and Receive choices reuse `src/components/SelectionSheet.js`,
`SelectionRow`, and `SelectionGroup`. They retain the canonical 76% shell and
56-point minimum row height, 18-point radius, 16-point horizontal inset, and
4-point vertical spacing. Rows may grow to preserve balances, networks, routes,
or complete addresses. Titles use `theme.typography.titleSheet`. Use
`useSheetDismissal` to apply a choice or navigate after `onClosed`; keep the
caller's selected content separate from visibility until closing completes.
The saved-address chooser may use 90% of the available height while the
Android keyboard is open, with its management action scrolling after results.
Android uses native modal resizing; iOS retains keyboard avoidance. This keeps
a complete address choice readable on compact screens. Normal states remain at
76%. Nested identity linking and the searchable Coin Card picker retain their
specialized composition and behavior.

### Information

Use `DeepLinkRequestDetailsSheet` for read-only request information. Its
`DeepLinkRequestSheetScaffold` wrapper reuses `src/components/InfoSheet.js`; use
`InfoSheet` and `InfoSheetSection` directly for other informational sheets.
The information scaffold provides the 78% maximum height, 20-point sheet title,
sectioned label/value rows,
overflow cue, and a 56-point quiet Done action. Keep the title literal and the
content concise. Do not add an illustration, hero icon, or eyebrow.

Both information and selection sheets use `src/components/SheetScrollView.js`
for measured overflow cues. Below a 128-point scroll viewport, use the native
scroll indicator instead of a fade that would obscure the visible content.

### Confirmation

Use `AcknowledgeSheet` before an action that cannot be undone, such as sharing
a gift card key. It shows a 21/27 title, one short message in the 16/24 body
role, and one 56-point primary `AppButton`. When the user may back out, pass
`dismissLabel` (for example "Not now"). The sheet then shows an `AppButton`
with `variant="text"` under the primary action. Do not rely on an outside tap
as the only visible way out: users do not reliably know they can tap outside a
sheet. A warning that the user must accept, such as the seed warning, keeps the
single button.

### Shared behavior

- Do not wrap `BottomSheetModal` in another Paper `Portal`.
- Use `onClosed` for cleanup or navigation that must wait for the closing
  animation. Do not clear visible content during `onClose`.
- A simple sheet closes through outside tap or system back. Add explicit close
  chrome only when the task is blocking, destructive, or nested.
- Keep a loading or verification sheet's height stable while its internal state
  changes.

## Stepped tasks

Use the shared `ProgressHeader` for new full-screen stepped work. Onboarding and
Gift Card already share it; new flows must not invent dots, numbered circles,
an eyebrow such as "Step 2 of 4", or a different progress bar.

For signed-out setup, use `createSignedOutFlowStyles(theme)` directly: its
normal and compact padding, title metrics, width limit, keyboard clearance, and
footer spacing are one unit.

For a signed-in task wizard, start from the Gift Card flow's composition:

- `ProgressHeader` for back navigation and progress.
- 20-point horizontal content inset, 24-point top inset, and 28-point bottom
  inset.
- `theme.typography.headlineMd` for the step title (28/36) and 22-point space
  below the title block.
- One short title, no eyebrow, and helper copy only when necessary.
- One primary bottom action through `SafeBottomActionStack`; back navigation
  stays in the header.
- Stable loading, error, review, processing, and result states within the same
  flow structure.

When a repeated stepped layout cannot use the existing composition, extract or
extend a shared primitive instead of making another local near-copy.

Gift Card currently has a local 28/35 step-title declaration. That one-point
line-height drift is a known cleanup gap, not a reusable metric. New work must
use the shared 28/36 `headlineMd` role; do not silently alter the existing Gift
Card screen unless its task explicitly includes that cleanup.

## Lists, forms, and settings

Address Book and Gift Cards establish the service-manager pattern:
`ServiceManagerHeader`, a direct page title, optional functional add action,
filters only when they help, and a clear list or empty state. Do not wrap the
whole list or sections in generic page cards.

Use `AddressBookEditSheet` for compact add/edit forms. Preserve its shared sheet
title, 20-point form inset, `AppTextInput`, keyboard-aware height, and
`SafeBottomActionStack` arrangement.

Settings work must compose `SettingsScaffold` rather than recreate its page,
section, row, divider, scrolling, safe-area, and footer behavior. Prefer plain
rows and dividers. Omit row icons unless they are necessary or already part of
the selected canonical setting pattern.

## Services home

The user approved this pattern on 2026-10-15 (SV-1 in `UI_REDESIGN_PLAN.md`).
The Services tab root shows each service as a tile in a two-column grid. This is
an approved exception to "Keep pages flat". It applies to the Services root
only and does not permit cards on other pages.

- Title: `headlineMd` "Services" with the existing header spacing (20-point
  inset, 12-point top, 16-point bottom).
- Grid: 20-point screen inset, two equal columns, and a 12-point gap in both
  directions.
- Tile: `surfaceMuted` fill, 18-point radius, 16-point padding, and a minimum
  height of 140 points. No border and no shadow.
- Icon: one 24-point line icon at the top left, in `primary` (light) and
  `textPrimary` (dark). It identifies the service.
- Text at the bottom of the tile: the name in `titleRow`, then one line in the
  13/18 caption size and `textSecondary`.
- That line shows a count for a service in use ("3 cards", "4 saved"). For a
  service not in use, it says what the service does in two or three words
  ("Save addresses").
- Do not show artwork, long descriptions, status counts, pending counts,
  badges, or dots on a tile.
- A new service adds one tile: an icon, a name, a count rule, and a purpose
  line. It needs no new artwork.

## Gift card detail

The user approved this pattern on 2026-10-15 (SV-1 in `UI_REDESIGN_PLAN.md`).
The detail screen shows one fixed card and says each fact once.

- Header: back on the left, then refresh and the ⋯ options button on the right.
  There is no screen title, because the card shows the name.
- Card: `GiftCardFixedCard.js`, with the material and notched shape of the
  earlier flip card, at the full content width. The card does not flip. It has
  no swipe hint, no "VERUS GIFT CARD" label, and no issued date.
- On the card: the card name (17-point semibold) and the status badge on the
  top row. The first content item is large at the bottom ("25 VRSC"), and the
  other items follow on one line ("+ sam@"). An empty card shows "No contents
  yet". A claimed card shows "Empty". A pending amount is dimmed.
- Status: one badge on the card. Ready uses the success pair, Pending uses the
  warning pair, and Not funded, Shared, and Claimed use the neutral pair. The
  card material is dark, so the badge uses the dark-mode success and warning
  pairs in both appearances. Its neutral pair is a light tint of the card
  material, as in the approved mockup.
- Sharing: when sharing is possible, Share, QR code, and NFC sit under the card
  as three equal 76-point tiles (`surfaceMuted`, 18-point radius). These tiles
  are part of this approved pattern only. The first share of an unshared card
  opens the confirmation sheet with "Not now". A shared card shares again
  without the sheet. A card that is not funded shows no tiles; "Share before
  funding" in ⋯ opens the same sheet.
- Facts: label/value rows with hairline dividers under the card, only for facts
  the card does not show: Shared, Claimed by, Claimed, Claim protection, and
  Created. Copyable values use `CopyAction`.
- Pending: one "Funding transaction" row with the transaction ID in monospace
  and `CopyAction`, and one line: "Sharing unlocks after it confirms."
- Actions: a bottom primary action appears only when the card is not funded
  ("Add contents", with "Fund from another wallet" as a text button). Less
  frequent actions stay in ⋯, drawn with the sheet action rows.
- Warnings appear in the share confirmation, not as permanent notice boxes.
- Wording: use "Claimed", not "Redeemed" or "Claim completed". Use "Shared" as
  the status after the link leaves the wallet.

## Scroll affordances

When a vertically scrollable surface does not make its overflow apparent from
partially visible content, show the established non-interactive bottom fade with
a centered downward chevron. Derive its visibility from measured content and
viewport size: show it only while more content remains below, and hide it when
the surface is not scrollable or reaches the end.

Use the scroll cue already provided by `SettingsScreen` for settings-style
pages and `DeepLinkRequestSheetScaffold` for informational request sheets. Keep
the cue above the scroll content and below any fixed action footer, pass touches
through it, and hide it from accessibility. Do not leave the cue permanently
visible or use it as a button.

## Request-review hierarchy

GenericRequest surfaces should present:

1. Who is requesting or signing.
2. What the request asks the wallet to do.
3. Which wallet or VerusID will respond.
4. Technical details behind a clear details affordance.
5. One primary action for the next required step.

Identity Update is the canonical exception for a risky, multi-stage
GenericRequest. Preserve its separate review, content-change, high-risk, and
confirm/pay stages. Do not collapse that flow into the simpler authentication
or app-encryption review hierarchy.

A completion sheet shows the animated green check only when delivery or broadcast
is confirmed. For "No response was sent" and "Browser opened", use
`src/components/NeutralCheckMark.js`.

Do not expose raw RPC, daemon, or indexer errors. Translate them into short
recovery guidance and keep a safe fallback available.

## Verification and evolution

Every new or intentionally redesigned surface needs rendered evidence, not only
source inspection:

- Compare it with the named exemplar at the same viewport and state.
- Check light and dark mode.
- Check normal and compact/small-device layouts when the flow can reach both.
- Check relevant default, selected, loading, empty, error, keyboard, processing,
  and result states.
- Run `corepack pnpm check:design` and any targeted safe-area or parser checks.

When the same correction repeats in design review, encode the accepted fix in
the narrowest durable layer:

- Visual judgment or scope belongs in this file.
- Repeated spacing, typography, state, or interaction mechanics belong in a
  shared component, style module, or semantic token.
- A mechanical failure that can be detected reliably belongs in a check.

Do not add a rule from one accidental output. Keep the correction only after it
is approved as reusable, then compare the next first attempt against the same
exemplar and states.
