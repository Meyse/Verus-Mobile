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

## Canonical pattern map

| Need | Source of truth | Required starting point |
| --- | --- | --- |
| Theme, spacing, shapes, typography | `src/theme/onboarding/tokens.js`, `TYPOGRAPHY.md` | Consume the existing semantic roles. |
| Signed-out onboarding step | `src/styles/components/signedOutFlow.styles.js`, `src/containers/Onboard/CreateProfile/CreateProfile.js` | Reuse the signed-out flow styles and compact-device rules. |
| Full-screen stepped task | `src/components/ProgressHeader.js`, `src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js` | Reuse `ProgressHeader` and the Gift Card step/action composition. |
| Selection BottomSheet | `src/containers/DeepLink/components/VerusIdIdentityPickerSheet/IdentityPickerSheet.js` as opened by `src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js` | Reuse the component or match its choose, selected, provisioning, and link modes exactly. |
| Informational BottomSheet | `src/containers/DeepLink/components/RequestReview/DeepLinkRequestDetailsSheet.js` and `src/containers/DeepLink/components/RequestReview/DeepLinkRequestSheetScaffold.js` | Reuse the scaffold, section rows, scroll cue, and Done action. |
| BottomSheet shell | `src/components/BottomSheetModal.js`, `src/styles/components/signedOutSheet.styles.js` | Do not construct a new modal shell. |
| GenericRequest review | `src/containers/DeepLink/components/RequestReview`, `src/containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo.js`, `src/containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo.js` | Reuse the request-review primitives and hierarchy. |
| Multi-step identity update | `src/containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo.js`, `src/styles/deeplink/identityUpdateRequestInfo.styles.js` | Preserve the dedicated review, content, high-risk, and confirm/pay sequence. |
| Service list or manager | `src/components/ServiceManagerHeader.js`, `src/containers/Services/AddressBook/AddressBook.js`, `src/containers/Services/ServiceComponents/GiftCardService/GiftCardServiceOverview/GiftCardServiceOverview.js` | Reuse the shared header and established list rhythm. |
| Compact form BottomSheet | `src/containers/Services/AddressBook/AddressBookEditSheet.js` | Reuse its title, input, keyboard, and bottom-action layout. |
| Settings | `src/containers/Settings/components/SettingsScaffold.js` | Compose with `SettingsScreen`, `SettingsTitle`, `SettingsSection`, and `SettingsRow`. |
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

### Information

Use `DeepLinkRequestDetailsSheet` for read-only request information. It provides
the 78% maximum height, 20-point sheet title, sectioned label/value rows,
overflow cue, and a 56-point quiet Done action. Keep the title literal and the
content concise. Do not add an illustration, hero icon, or eyebrow.

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
