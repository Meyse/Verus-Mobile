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
- Say each fact once. A result, error, or status screen states its outcome in
  the title only. Do not repeat it in a description, section label, count
  line, or notice title.
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
- On iOS every text field takes its keyboard appearance from the in-app theme
  through `src/utils/applyThemedKeyboard.js`. Do not set `keyboardAppearance`
  per field. Android keyboards keep their own or the system setting.
- On iOS the app windows take their appearance from the in-app theme
  (`src/theme/app/AppThemeProvider.js`), so native controls such as switches
  match it. Before this, an off switch on the light theme with a dark phone was
  almost invisible. Do not give a native control colours only to fix contrast.
- Respect safe areas and keyboard changes. Bottom actions stay in normal flow
  through `src/components/SafeBottomActionStack.js`. The footer has no divider
  line above its buttons (owner, 2026-10-26).
- Go back with the arrow button: `OnboardingBackButton`, a 24-point
  `arrow-left` in a 44-point target. `createRedesignedHeaderOptions` puts it in
  every redesigned stack header. Never show the iOS "‹ Back" chevron and title
  (owner, 2026-10-24); `corepack pnpm check:design` fails on `headerBackTitle`.
- Wrap a form with bottom actions in `src/components/KeyboardAvoidingForm.js`
  so the actions stay above the keyboard on both platforms. Android pans the
  window (`adjustPan`), so a plain `KeyboardAvoidingView` there does nothing.
  While the keyboard shows, drop the bottom inset as the onboarding steps do.
- On iOS 26 `src/utils/applyNativeSwitchSize.js` draws every switch at 51 x
  22.7 points, scaled from the native 63 x 28, so it keeps its earlier width.
  The owner found the native size too large (2026-10-21). Give a switch slot a
  minimum width, not a fixed 51 or 52 points.
- Use monospace only for raw technical identifiers such as addresses, hashes,
  transaction IDs, and public keys.
- Show a status as the tinted status badge: a pill with a semantic background
  and colored text, as `src/components/StatusBadge.js` draws it. Do not put a
  colored dot beside status text.
- A second button under a primary action uses `AppButton` with
  `variant="secondary"` (the filled tint), 10 points below the primary, as in
  `src/containers/Services/AddressBook/AddressBookEditSheet.js`. This includes
  back-out actions such as "Cancel" and "Not now". Use `variant="text"` only
  for a third, low-emphasis link, such as "Other options" on the login screen.

## Voice

Copy never says "we", "our", or "us". The wallet is software; no company stands
behind it. Prefer impersonal wording: "The best price is selected" and "Fees
are shown before you confirm". Use "The wallet" only when the software acts.

## Button sizes

On a window of 667 points or less, primary, secondary and tonal buttons are 44
points high (a tonal button is the secondary action on a dark surface, so it
follows the same rule); the wizard footer's top padding is 8 points. Normal
windows retain the 56-point default and 16-point wizard footer top padding.
Bottom spacing stays the same. `AppButton` and `GradientButton` resolve this rule
centrally through `useButtonHeight`, including explicit action heights. Text
buttons keep their size.

## Imagery

The owner chose one picture system on 2026-10-24 (option A of the imagery
review). Each kind of picture has one job:

- **Line glyph.** Every still picture is a Lucide glyph with a 1.8 stroke in a
  theme color. An icon-led step uses `src/components/StepGlyph.js`: 72 points
  in `textPrimary`, 24 points above the large title. An empty or failed list
  uses `src/components/EmptyState.js`: 64 points in `textSubtle`, then a
  `titleSheet` title, an optional line and one action. The glyph names the
  service with its Services tile icon (`Gift`, `BookUser`) or the VerusID `@`
  (`AtSign`). A failed list shows `CircleAlert` and only says what failed.
- **Live status symbol.** An operation that waits for the user or a device,
  such as the NFC tap (`NfcTapSymbol`), shows a symbol on a disc. It moves only
  when the real state changes.
- **The app's own objects.** Progress or a celebration of a real event uses
  real components: the wallet icon, coin logos and the gift card material
  (wallet setup, claiming funds, the ready card). Draw a wallet icon only with
  `WalletAvatar`, or with `WalletAvatarEmoji` when it has no circle. Both move
  the emoji down on iOS, where a plain emoji text sits high in its circle, and
  give it an opaque color, because Android fades a plain emoji text.

The blurred wave video stays on the landing and login screens as brand
atmosphere. Do not add raster illustrations, 3D renders, stock animations or a
`MaterialCommunityIcons` glyph at picture size. The grey 3D empty-state renders
were removed for this rule, because a shaded raster cannot follow the theme.

## Canonical pattern map

| Need | Source of truth | Required starting point |
| --- | --- | --- |
| Theme, spacing, shapes, typography | `src/theme/onboarding/tokens.js`, `TYPOGRAPHY.md` | Consume the existing semantic roles. |
| Signed-out onboarding step | `src/styles/components/signedOutFlow.styles.js`, `src/containers/Onboard/CreateProfile/CreateProfile.js` | Reuse the signed-out flow styles and compact-device rules. |
| Full-screen stepped task | `src/components/ProgressHeader.js`, `src/containers/SendWizard/components/SendWizardHeader.js`, [Stepped tasks](#stepped-tasks) below | Reuse the shared header title treatment and safe-action composition. |
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
| VerusID list and page | [VerusID page](#verusid-page) below, with `src/containers/Services/ServiceComponents/VerusIdService/VerusIdCard.js` | Use the light card. Funds come last; a fund opens its asset screen. |
| App alert | `src/components/Alert.js` through `createAlert`, with the `AcknowledgeSheet` measurements, and [App alerts](#app-alerts) below | Prefer the screen itself. Never use a Paper `Dialog` or a native `Alert.alert` in redesigned UI. |
| Empty or failed list | `src/components/EmptyState.js` and [Imagery](#imagery) | Use it for every list without items or with a load error. Do not draw a local picture, title and button. |
| Icon-led step | `src/components/StepGlyph.js`, as `src/containers/Onboard/CreateProfile/Forms/UseBiometrics.js` uses it | Lead the step with `StepGlyph`. Do not size or color a step icon locally. |
| Status label | `src/components/StatusBadge.js` | Reuse the tinted badge with a `success`, `warning`, `danger`, or `neutral` tone. On the gift card material, pass `variant="card"`. |
| Transaction result | `src/components/TransactionResult.js`, as `src/containers/SendWizard/SendWizardSuccess.js` uses it, and [Transaction result](#transaction-result) below | Use it for every screen after the wallet sends transactions. It has no section label and no count line. |
| Sheet action rows | `src/components/SignedOutActionRow.js`, `GiftCardOptionRow` in `src/containers/Services/ServiceComponents/GiftCardService/GiftCardOptionsSheet.js`, `src/styles/components/signedOutSheet.styles.js` | Use the unfilled 62-point rows with the dimmed icon, semibold label, and chevron. Do not draw filled option rows. |
| Compact form BottomSheet | `src/containers/Services/AddressBook/AddressBookEditSheet.js` | Reuse its title, input, keyboard, and bottom-action layout. |
| Settings | `src/containers/Settings/components/SettingsScaffold.js` | Compose with `SettingsScreen`, `SettingsTitle`, `SettingsSection`, and `SettingsRow`. |
| Ambiguous vertical overflow | `SettingsScreen` in `src/containers/Settings/components/SettingsScaffold.js`; `DeepLinkRequestSheetScaffold` for request sheets | Show the existing bottom fade and centered chevron only while more content remains below. |
| Search, copy, loading | `src/components/AppSearchField.js`, `src/components/AppSearchLauncher.js`, `src/components/CopyAction.js`, `src/components/SkeletonLoader.js` | Never hand-roll an equivalent local control. |
| QR scanner | `src/components/BarcodeReader/BarcodeReader.js`, `src/components/BarcodeReader/ScannerScreen.js`, [Camera scanner](#camera-scanner) below | Reuse the camera window. Do not draw a full-screen camera or a local permission page. |

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

Every "Choose a card" names a card as Receive does: its type ("Transparent",
"Private") with a transparent card's short address as a monospace subtitle, or
its VerusID name. Group titles name the network.

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

The Send/Convert network sheet ("Choose a network") groups its rows with
`SelectionGroup`. "Same network" holds the asset's own network and is always
first; "Other networks" holds the rest in route order. Row titles are the plain
network name and subtitles read "Receive as <ticker>". Do not add a "Default"
badge or repeat "network" in a row. The owner approved this on 2026-10-18.

### Information

Use `DeepLinkRequestDetailsSheet` for read-only request information. Its
`DeepLinkRequestSheetScaffold` wrapper reuses `src/components/InfoSheet.js`; use
`InfoSheet` and `InfoSheetSection` directly for other informational sheets.
The information scaffold provides the 78% maximum height, 20-point sheet title,
sectioned label/value rows,
overflow cue, and a 56-point quiet Done action (44 points on small windows).
Keep the title literal and the
content concise. Do not add an illustration, hero icon, or eyebrow.

Both information and selection sheets use `src/components/SheetScrollView.js`
for measured overflow cues. Below a 128-point scroll viewport, use the native
scroll indicator instead of a fade that would obscure the visible content.

### Confirmation

Use `AcknowledgeSheet` before an action that cannot be undone, such as sharing
a gift card key. It shows a 21/27 title, one short message in the 16/24 body
role, and one primary `AppButton` at the shared button height. When the user may back out, pass
`dismissLabel` (for example "Not now"). The sheet then shows an `AppButton`
with `variant="secondary"` 10 points under the primary action. Do not rely on
an outside tap as the only visible way out: users do not reliably know they can
tap outside a sheet. A warning that the user must accept, such as the seed warning, keeps the
single button.

### App alerts

The owner chose the sheet look on 2026-10-22 (gap 4, option A).
`createAlert` keeps its API and opens `src/components/Alert.js`: the
acknowledgement sheet, embedded in the root portal. Open native sheets step
aside while it shows, and a sheet that was closing stays closed.

Use an alert only when the screen cannot show the outcome: a failure after the
user left the context, or a confirmation before an action that cannot be undone.
Otherwise show it where it happens:

- A field error uses `AppTextInput` `errorText`. A wrong password uses
  `PasswordCheck` `errorMessage`; the sheet stays open.
- A setting that does not save uses the `SettingsRow` `error` line ("Not saved.
  Try again."), and the control keeps its old value.
- A request that cannot continue disables its action and says why.
- Success needs nothing when the screen already shows it: a row value, a closed
  screen, the `CopyAction` check.

Buttons: the action is the primary button and names the action ("Delete wallet",
"Change and sign out", "Turn on"). The way out is "Not now" with
`style: 'cancel'`. A one-button alert uses "Close". Outside tap and Android back
run the way out unless the alert sets `cancelable: false`.

Copy: a specific title, never "Error". At most two short sentences. No raw
error, RPC or library text; log it instead.

Settings pickers: a list choice uses `SelectionSheet`. A one-value edit uses
`src/containers/Settings/components/SettingsFieldSheet.js`, the
`AddressBookEditSheet` layout with its error under the field.

### Wallet unlock

`src/containers/Login/components/UnlockWalletSheet.js` unlocks a wallet on the
login screen and for requests (`WalletUnlockCoordinator`).

- A wallet with Face ID or Touch ID opens on "Unlocking your wallet"
  (`WalletUnlockLoadingContent`). The loader stays while the biometric prompt
  runs and the wallet opens. The password form never shows behind the prompt
  (owner, 2026-10-25).
- The password form shows only when biometrics fail, are cancelled or are not
  available. The field then takes focus.
- "Use Face ID" on the form switches the sheet back to the loader. When the
  phone has no biometrics, the form and keyboard stay and the error shows under
  the field.
- When the user cancels the prompt after "Use Face ID", the line under the
  field reads "Face ID was cancelled." (the phone's biometry name). Other
  failures keep "Biometric unlock is unavailable. Enter your password to
  continue." A cancel of the automatic prompt shows no line (owner,
  2026-10-25).
- The row shows the phone's own biometry icon and name through
  `BiometricAffordanceIcon`, the icon on the wallet card: `ScanFace` for Face
  ID, `FingerprintPattern` for Touch ID and fingerprint. Never a fixed
  fingerprint.

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

Stepped tasks show a short step title in the header bar, centered
between back and close, in `theme.typography.titleSheet`. Do not show a large
step title below the header. The owner approved this pattern for Send/Convert
on 2026-10-17, and for wallet setup, wallet import and the gift card fund flow
on 2026-10-23.

- Keep a header title to about 18 characters, so that it fits on one line at
  360dp. The setup titles live in `src/containers/Onboard/setupStepTitles.js`
  ("Personalize wallet", "Create password", "Back up wallet", "Recovery phrase",
  "Verify phrase", "Import phrase", "Review phrase", "Import wallet").
- A screen led by an icon with one choice keeps its large title, and the header
  shows no title: biometrics ("Use Face ID"), the shielded address, NFC import
  and the Z recovery secret intro (owner, 2026-10-23). Each one, and Decrypt
  spendable key, leads with `StepGlyph` in the signed-out step layout
  ([Imagery](#imagery)).
- Form steps start 24 points under the header on every window: signed-out steps
  add `afterHeaderTitle` from `createSignedOutFlowStyles(theme)`. Icon-led
  screens keep the normal 54-point and compact 20-point step top.
- One icon action that belongs to the step, such as the password info button,
  goes in the right slot of `ProgressHeader` (`rightAction`).
- Say each thing once. A context line keeps only what the title does not say
  ("Write down words 1–8 of 24"). A field placeholder does not repeat its label.

The recovery phrase check ("Verify phrase", `SeedWords`) uses word chips. The
owner approved it on 2026-10-23 (option A of the mockup).

- Ask 3 words, one from each third of the phrase. Each word shows 4 chips in a
  2 x 2 grid: the right word and 3 other words from the same third, in random
  places. A blind guess passes 1 time in 64.
- Do not show right or wrong for one tap. The check judges after the user picks
  all 3 words and taps the button. A result per tap lets anyone pass without a
  written phrase.
- A wrong answer shows "Does not match." under each wrong word and locks the
  chips. "Show words again" returns to words 1–8. Each visit to the check asks
  new words with new chips.
- A picked chip has a blue border, not the green selection with a check mark:
  green reads as a correct answer before the check runs.

For a signed-in task wizard:

- Match the `ProgressHeader` title treatment. Send/Convert uses
  `SendWizardHeader` for back, close, the title, and progress below that row.
- 20-point horizontal content inset, 24-point top inset, and 28-point bottom
  inset. Send/Convert retains its existing 16-point horizontal inset and uses
  the 24-point top inset on normal and compact devices.
- No eyebrow. Keep helper copy only when it adds information.
- One primary bottom action through `SafeBottomActionStack`; back navigation
  stays in the header.
- Stable loading, error, review, processing, and result states within the same
  flow structure.

Send/Convert also shows a context band directly under the header on Amount and
Recipient. The owner approved it on 2026-10-17 (option C of the review mockup).
It reminds the user what moves and where, in one line, without a second title.

- `WizardContextBand` draws it through the `context` slot of `SendWizardHeader`,
  on the shared band in `src/components/HeaderContextBand.js`.
  `getWizardContextSummary` in `wizardUtils.js` decides what it shows.
- Full-bleed `surfaceMuted` band, 32-point minimum height, 16-point inset. Asset
  names use `labelSm`, connector words and the chain name use `caption`. Logos are
  `AssetCoinLogo` at 16 points.
- Left: the source asset and, for a conversion, an arrow and the target asset.
  Right: "on" and the chain, only for a conversion to another chain.
- A Send or Convert from the VerusID page starts on Select asset with only that
  VerusID's assets. There the band reads "From <VerusID name>", with the name in
  normal type.
- Send shows the source asset alone. On Recipient, a Send to another chain adds an
  arrow and the chain. Amount does not, because its Network row is right below.
- Drop `[ERC20]` from asset names. The logo badge says it. Hide the target's badge
  when the chain is named on the right.
- When the line is too long, the chain name shortens first, then the asset names.
- No band on Confirm or Success. They already show the whole route.

Send/Convert Amount pins one receive line above Continue. The owner approved
option A2 on 2026-10-19: a receive amount and a percent chip that opens
"Price and route".

- `WizardFormLayout` keeps its `pinned` slot outside the scroll area, with a
  hairline on top. `AmountEstimate` shows only "You receive", the chip when it
  applies, and "≈ <amount> <ticker>". Loading uses one skeleton line. Empty and
  invalid amounts pin nothing. There is no Market price, money, suggestion,
  unit price, Via, or Ethereum fee row on Amount.
- For a conversion or Ethereum export, show the chip when impact is at least
  0.1%, more than one basket is available, or an Ethereum network fee needs a
  quote or has a result. The label is "x.x% less", "<0.1% less" below 0.1%, or
  "Details" when impact is unknown. Use a neutral `StatusBadge` below 1%,
  warning from 1%, and danger from 5%, with a small chevron in a button.
- When the chip shows, omit the receive logo. The amount shrinks to fit on one
  line. The chip can wrap below the label when space is too tight, including
  long amounts at 360dp. Compact top spacing and the fiat-price unit-chip rule
  stay in place. The amount, unit chip, and "Available / MAX" remain scrollable.
- "Price and route" uses `BottomSheetModal` directly with the shared
  information-sheet styles in `src/styles/components/infoSheet.styles.js` and
  `titleSheet`. The shell keeps its 24-point radius and 78% maximum height.
  The owner chose variation A on 2026-10-19.
  Deliberate spacing deviations: 12-point top padding, a 32-point title block
  with a 6-point gap, 16-point bottom padding, and 12 points above Done.
- When there is a choice, basket rows come directly under the title, best
  first. There is no explanatory sentence and no Price or Route section title.
  Reuse compact `SelectionRow`: 48-point rows with a 4-point gap, instead of
  the canonical 56-point minimum. This is an owner-approved deviation; tap
  targets remain at least 44 points. Show the basket name, estimated receive
  amount or "Estimate unavailable.", a success "Best price" or neutral
  "x% less" pill, and the selected green check or unselected chevron.
- Follow the baskets with single-line, non-tappable fact rows: Market price,
  Your price, and Difference. Labels sit left and values right, with hairline
  dividers. Their 40-point height is an owner-approved deviation from stacked
  information rows. Hide absent data. With one basket, omit the basket list
  and show "Route" after the price facts only when the route has a `via`.
  Preserve the full route name, including "Bridge.vETH". An Ethereum export
  adds Network fee last, with a skeleton while loading or "Fee unavailable."
- Only the basket list scrolls, in one shrinking `SheetScrollView`. It keeps
  the established measured bottom fade and centered chevron while more content
  remains below; short viewports use the established native indicator. Fitting
  lists show no cue. Facts, suggestion, and Done stay fixed below the list.
- From 1% impact, show a verified smaller-amount suggestion when its measured
  impact is lower. Warning levels aim to halve the current impact; danger
  levels keep the 3% target. The unfilled suggestion action is 52 points high,
  an owner-approved deviation from 62. Show the measured percent. Choices apply
  after closing through `useSheetDismissal`; Android then refocuses Amount.
- Done uses `AppButton variant="secondary"` without a local height. It follows
  the shared small-device rule: 44 points on windows of 667 points or less,
  56 points on larger windows.

Send/Convert Confirm and Sent follow these rules (owner feedback, 2026-10-19):

- The Sent step has no header: no progress bar, no close button, no divider. Done
  leaves. Sent shows the pay and receive amounts and the transaction ID. It shows no
  "To" row and no "Arrives" row; the user saw both on Confirm.
- Confirm shows the recipient once, in full, in the "To" row. The pay and receive nodes
  carry only the amounts ("You pay", "You receive"). Confirm has no "More details" row.
- Confirm does not show the "centrally controlled currency" notice (owner decision).
- Confirm shows its warnings and errors above "Hold to confirm & send", outside the
  scroll area (`above` slot of `WizardFooter`). The fact list scrolls and shows the
  bottom fade (`FadedScrollView`) while rows remain below.
- While the wallet prepares the transaction, Confirm draws the review as it will look
  (`ConfirmPreparing`). What the user chose is real. The receive amount, price, fees and
  timing are skeletons. The button reads "Preparing…" and stays disabled. There is no
  separate loading screen and no loading text.
- The connector between the pay and receive nodes shows the unit price only. The route
  is behind the Price impact row, which opens "Price and route" with the price facts
  and the route (owner, 2026-10-22, so that Send and invoice Confirm match). The row
  shows "Details" when the impact is unknown and the route has a basket.
- A long receive label ("RSRG…LLck receives") wraps to a second line; it never runs
  into the amount.
- A currency name keeps its full form where it names the currency. A Bridge is
  "Bridge.vETH", never "Bridge".
- The unit chip under the amount shows only when the paid asset has a fiat price.

Network fee choice (owner approved variation A on 2026-10-20): plain ETH,
ERC-20 and BTC sends use a two-line "Network fee" `FlatRow` with the fee,
speed and optional fee-currency fiat value. It opens the canonical `SelectionSheet`
with Slow, Normal, Fast and Custom fee. The nested custom form uses `AppTextInput`,
an in-sheet Back action, a fee summary and one "Use this fee" action, with the
Address Book keyboard layout. Custom fees above twice Fast's effective gas price
or sat/vB rate show a warning without blocking "Use this fee".
Fee changes keep the review visible and skeleton
its fee and arrival time until preflight completes. Bridge, conversion and Verus
sends keep "Fees ›" and "Fee breakdown".

### Send/Convert Amount, Recipient, Confirm and Sent

The owner approved these on 2026-10-18 (round 2 of the HTML mockups: Amount
option C "say it in money", Recipient option A, Confirm and Sent option B).
They stay flat: hairline rows, no cards, no capital-letter labels.

- **Amount, conversions and Ethereum exports.** Follow the A2 pinned receive
  line and "Price and route" sheet rules above. They replace the earlier flat
  estimate, Market price, money, suggestion, and Via rows on Amount. The system
  still picks the basket with the most output. Name a basket by what it holds
  (for example "VRSC-KMD-GOLD").
- **Price impact** is how far this conversion's price is below the market price.
  The market price is the output per unit of a small sample trade (worth about
  one display-currency unit) on the same route, fetched once per route. Levels:
  under 0.1% adds no chip by itself; 0.1% to 1% uses neutral, 1% to 5%
  warning, and 5% and up danger. The chip always says the percent. The sheet
  shows the money and percent in Difference, with danger text from 5%, primary
  text from 1%, and secondary text below 1%. Under 0.1%, Difference shows
  "<0.1% less". From 1% impact, a verified
  "Use <N> <SRC> instead | x.x% less" action appears in the sheet while a warning
  or danger suggestion exists. Show the measured impact, never the one the
  suggestion formula aimed for. Say the money in what
  the user receives: the display currency when the ledger holds a
  price for the asset the user pays with ("$204.44 less"), otherwise the
  received asset ("0.0681 ETH less"). Never use a minus sign and never count
  the loss in the asset the user pays when there is no price.
- **Recipient.** The address field is followed by flat 62-point rows ("Saved
  addresses | N ›", "Send to self | N ›") with hairlines. No cards, no icons and
  no helper line under the field. A send from the private card to a private
  address adds "Memo | Optional ›" as the first row (see Private card sends).
- **Confirm.** A pay node ("You pay", or "You send" for a plain send), a vertical
  connector with the price, and a receive node ("<recipient> receives")
  for conversions. Nodes use a 40-point logo, a 14-point label and a bold 20-point
  amount; fiat captions appear only when the ledger holds a price. Then a flat
  list: "To" (full address in monospace) unless a short name is already in the
  receive node, "Destination network" for cross-chain, "Price impact ›" (the money
  when 1% or more, then the "x.x% less" badge; it opens "Price and route"), "Fees ›", "Arrives", and "More
  details ›", which opens the "Transaction details" `InfoSheet` (To, Destination
  network, Route when a basket is used, From, Balance after). Fees and addresses wrap and never truncate. The footer stays
  Hold to confirm.
- **Sent.** The header has no title and no back. The small animated check sits
  beside the 28/36 title. Then the same nodes ("You paid", "<recipient>
  receives"), flat rows ("To" when needed, "Destination" for a bridge,
  "Arrives", "Transaction ID" with `CopyAction`), one caption, and Done.

### Private card sends

The owner approved this on 2026-10-22 (memo option A of the private-send
mockup, sync option 1, and the Confirm notice). It restores what the old send
screen did for the private (z) card.

- Recipient accepts a private address (`zs…`) and "name@:private" only when
  the private card sends; another card shows "Only the Private card can send to
  a private address." A scanned private address offers only the private card.
- The memo is a "Memo" row, first in the Recipient rows, shown only for a
  private send to a private address. It opens the compact form sheet of Request
  amount's Note (`MemoSheet` on `ReceiveRequestSheet`): one multiline
  `AppTextInput`, the line "Only the recipient can read it.", and Done. Near the
  512-byte limit the line counts what is left; over it, an error keeps the sheet
  open. Confirm shows the memo once, as a "Memo" row under "To". A scanned
  request's note becomes the memo when it can travel in one.
- While the private card syncs, its coin card shows a `StatusBadge`
  (`variant="card"`) "Syncing x%" in place of the fiat line, Send is off, and
  "Choose a card" shows the card dimmed with "Syncing x%" and no chevron.
- Amount uses the private card's confirmed balance, as its preflight does.
  Funds that still confirm add one caption under Available: "<amount> <ticker>
  can be sent in about 10 minutes."
- From the private card to a transparent address, Confirm shows one notice
  above Hold: "This address is transparent. The amount and the recipient will
  be public on the blockchain."

### Pre-conversions

The owner chose variation A (inside Convert) with variation C's wallet screens
on 2026-10-23 (pre-conversion mockups). A pre-conversion sends funds to a
currency before its start block. Everyone gets the price that the launch sets.
All launch types use these screens.

- Convert to lists a pre-launch currency in its own "Pre-launch" section, after
  Popular conversions. The row adds one caption: "Launches in 6 days". The
  countdown is coarse (minutes, hours, days, "about N months", "about N
  years"). It reads "Pre-launch" while the block height is unknown.
- A pre-conversion goes to the source card's own address. Recipient is skipped,
  and the progress bar counts one step less. A failed launch refunds the same
  address: the daemon refunds a transfer to its destination.
- Amount pins "You receive" with the target logo and "Price set at launch". It
  shows no estimate, no chip and no "Price and route".
- Confirm shows "You pay", the connector "Price set at launch", and "You
  receive" with the ticker in the place of the amount. Rows: To (the address,
  with "Refunds also go here." under it), Destination network for a PBaaS chain
  launch, "Needed to launch" when the currency sets a minimum, Fees, and
  "Arrives" ("At launch, 25 Oct 2028"). "Needed to launch" shows the minimum
  only, because the wallet cannot read the total so far. There is no Price
  impact row. One notice shows above Hold: "This can’t be cancelled. If
  <currency> does not launch, the <paid asset> comes back minus fees."
- Sent reads "Pre-conversion sent" with the same nodes, an "Arrives" row and the
  Transaction ID, and no caption. The "Arrives" row is a deliberate exception
  to the Sent rule: the arrival at launch is the new fact.
- After a pre-conversion the wallet adds the currency, as after a conversion.
  Its Home row shows "<amount> <ticker> pre-converted" and a neutral
  `StatusBadge` "Launches in …" in the place of the fiat value. Hidden
  balances blur the pre-converted line.
- The asset screen of a pre-launch currency shows the asset line without cards
  and without the card picker. Then a neutral "Pre-launch" badge and flat rows:
  "You pre-converted" (only for two or more pre-conversions), "Launches" ("In
  about 2 years, 25 Oct 2028"), "Needed to launch" and "Details ›". Then one
  history row per pre-conversion: "Pre-conversion" with a warning badge,
  "Pending" or "Waiting for launch". It opens the Transaction sheet ("You
  pre-converted").
- "Details" opens the "Launch details" `InfoSheet`: Currency ID (copy), Launch
  block, Holds (each reserve with its weight), Supply at launch, and Maximum
  when there is one. A reserve that is not a wallet asset takes the daemon's
  name.
- The bottom action is "Pre-convert" (primary), or "Pre-convert more"
  (secondary) after a pre-conversion. It opens Convert at Amount with the
  currency chosen and the chain's own coin as the source when it is funded.
- The wallet reads pre-conversions from the blockchain
  (`src/utils/preconversion/`): reserve transfers with `preconvert` from the
  wallet's addresses to a pre-launch currency, with a wallet address as the
  destination. They show on every device and after a restore.

When a repeated stepped layout cannot use the existing composition, extract or
extend a shared primitive instead of making another local near-copy.

The gift card fund flow
(`src/containers/Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund.js`)
uses `ProgressHeader` with the step title: "Create gift card", "Build the
gift", "Review" and "Another wallet". Processing and the result keep their
centered title, so their header has none. After the first step, the card name
shows in a `HeaderContextBand` under the header (owner chose option A on
2026-10-23): a 16-point `gift-outline` icon in `textSecondary` and the name in
`labelSm`, with the 20-point gift card inset.

## Lists, forms, and settings

Address Book and Gift Cards establish the service-manager pattern:
`ServiceManagerHeader`, a direct page title, optional functional add action,
filters only when they help, and a clear list or empty state. Do not wrap the
whole list or sections in generic page cards.

Gift Cards opens on its list; there is no intro screen (owner, 2026-10-24).
Without cards, `EmptyState` shows the `Gift` glyph, "No gift cards yet" in
`titleSheet`, one line ("Share funds or a VerusID as a link, QR code, or NFC
card.") and "Create gift card". The first create, from that button or +, opens
`AcknowledgeSheet` "Treat gift cards as secrets" with "I understand" and "Not
now". It shows once per wallet; the share confirmation repeats the warning when
the risk starts.

The gift card list rows follow option C of the list mockup (owner,
2026-10-26):

- A card that is not claimed is a 68-point row: the 24-point `gift-outline`
  icon in `textSecondary` with no tile, 14 points from the text, then the name,
  the contents line in 13/18 `textSecondary`, the `StatusBadge` and the
  chevron. A Not funded row shows only the name, because its badge already says
  that the card is empty.
- Claimed cards follow the other cards under one "Claimed" title in `labelSm`
  and `textSecondary`. A claimed row is one 52-point line: `gift-open-outline`
  in `textSubtle`, the name in `textSecondary`, the chevron, and no badge.
- The Claimed filter shows the claimed rows without the title, because the
  selected filter already says it. Dividers start at the text, 38 points in.

Asset list rows take the wallet (Home) row sizes: the "Receive assets" list,
Select asset in Send and Convert, and Convert to (owner, 2026-10-24).

- A 38-point `AssetCoinLogo`, 16 points from the text, with 12 points of
  vertical padding. A row with two lines is 68 points high.
- The name in `titleRow`. On its right, the fiat value in 16/20 semibold, or
  "N/A" in 13/18 `textSubtle`.
- The second line 2 points under the name in `bodySm` and `textSecondary`: the
  amount, or "Launches in …" in Convert to.
- Convert to groups its rows under titles in capital letters ("POPULAR
  CONVERSIONS", "PRE-LAUNCH", "MORE CONVERSIONS"): `labelSm` in `textSecondary`
  with 0.5 tracking. The owner kept the capitals and asked for this smaller
  size on 2026-10-24.
- These three lists, and Manage assets, show `AppSearchField` only when the
  whole list has 7 or more items (`APP_SEARCH_MIN_ITEMS`; owner, 2026-10-24).
  Up to 6 rows fit on the smallest phones without scrolling. Count the list
  before the search, so the field does not disappear while the user types.
  Without the field, the first row or group title starts 24 points under the
  header. The Add asset list keeps its field: it searches the whole catalogue
  and takes a pasted identifier.
- The same rule applies to these sheets and screens (owner, 2026-10-24):
  "Choose a card" (its All / Addresses / VerusIDs chips and its chain chips
  hide with the field), Link VerusID (the list of VerusIDs found for the wallet
  address; the field stays hidden while the lookup runs, and "Enter VerusID
  manually" stays), Saved addresses in Send (the recipient step passes in the
  count of addresses that fit the send, so the field does not pop in when the
  sheet finishes loading), Choose currencies for a gift card, the Address book
  screen (its search and network filter) and Pay with for burn invoices. The
  identity picker for revoke and recover already uses 7. The display currency
  sheet always has 33 items and always shows its field.
- When the controls hide, because the count drops below 7, the screen clears the
  search text and sets each filter back to its default (All). The controls then
  return in their default state. While they are hidden, the list uses an empty
  query and the default filter.
- Without the field, the content keeps no space for it: no fixed chrome height,
  no reserved field height and no padding. A sheet sizes its list from the
  chrome that shows. The list starts where the sheet's own title-to-list gap puts
  it. A sheet that filled 76% of the screen for the field (Saved addresses)
  fits its content instead.
- "Choose a card" and Choose currencies for a gift card show no count line
  under the title, because the rows already show how many there are (owner,
  2026-10-25). A row shows its network only when the list has more than one
  network, and never when the network repeats the row's own name (a native
  coin such as VRSCTEST, "Verus Testnet"). A gift currency row shows its amount
  without the ticker, because the row title names it. A card row without the
  network line has one line and is 60 points high (72 with it).
- Below 7 items these two sheets grow past 76% when they must, up to 16 points
  under the top safe area, so every row shows without scrolling on an iPhone
  SE. With 7 or more items they keep 76% and the list scrolls.

Use `AddressBookEditSheet` for compact add/edit forms. Preserve its shared sheet
title, 20-point form inset, `AppTextInput`, keyboard-aware height, and
`SafeBottomActionStack` arrangement.

Manage assets removes an asset through the asset itself (owner chose option A
of the mockup on 2026-10-21):

- A tap on an asset row, outside its switch, opens `AssetDetailsSheet`: the
  Review asset header, then Balance, Network and Currency ID (or Contract
  address) as `ReviewRow`s, then one sheet action row, "Remove from wallet",
  drawn like "Remove from this device" in the gift card options sheet. The
  wallet's main coin (VRSC, or the Testnet override) has no sheet and is never
  removed.
- The sheet is an `InfoSheet` with the logo header in its `header` slot (owner,
  2026-10-23): the header stays at the top, the rows and "Remove from wallet"
  scroll, and Done stays fixed at the bottom on every window size.
- "Remove from wallet" opens `AcknowledgeSheet` ("Remove <name>?", "Remove",
  "Not now"). The message says that the balance stays on the blockchain; it
  hides the amount while balances are hidden. While the asset is removed, its
  row reads "Removing…".
- Removal works at any balance, because spam currencies can have one. A
  removed or ignored Verus currency stays out of automatic adding and "New
  assets found" until the user adds it again. Review asset for a found
  currency offers "Ignore" as the secondary action.
- Below 7 assets, the search field and the All / On Home / Hidden tabs are
  hidden, and "Your assets" starts 24 points under the header. The count
  includes "New assets found" and ignores the selected tab and the search text
  (owner, 2026-10-24). While the controls are hidden, the list shows every
  asset and the empty text never says "No matching assets" or "No hidden
  assets". When the controls hide, the search text clears and the tab goes
  back to All, so they return in their default state.

Settings work must compose `SettingsScaffold` rather than recreate its page,
section, row, divider, scrolling, safe-area, and footer behavior. Prefer plain
rows and dividers. Omit row icons unless they are necessary or already part of
the selected canonical setting pattern.

Recovery secrets (`src/containers/DisplaySeed`) show QR codes again (owner
request, 2026-10-22):

- A revealed recovery secret, and a revealed private or spending key under
  Advanced private keys, has a QR action left of its `CopyAction`. It matches
  CopyAction: a 44-point target with the Lucide `QrCode` icon at 18 points in
  `textSubtle`. Values of 1,000 characters or more get no QR action.
- The action opens `RecoverySecretQrSheet` on the acknowledgement sheet
  measurements: the title ("Primary recovery secret", "VRSCTEST private key"),
  the QR on Receive's white surface (216 points; 184 on windows of 667 points
  or less), the line "Anyone who scans this code can control the associated
  funds.", and Done.
- The sheet closes, and its value clears, whenever the screen hides the
  secrets: background, losing focus, or screen capture.
- The unlock's own Face ID or Touch ID sheet does not lock the screen, so
  "View recovery secrets" asks once. Leaving the app, another system sheet
  (such as Control Center) or screen capture still locks it.
- The screen title shows once, in the navigation header (or the signed-out
  header). The secret cards follow the warning notice without a section label.

## Asset screen balances

The owner chose option A of the pending-balance mockup on 2026-10-22. It applies
to `SignedInAssetHeader` and the asset screen's "Choose a card" sheet
(`CoinCardPickerSheet`).

- Every card and the asset total show the card's total, the number Home adds
  up: confirmed funds plus funds that still confirm. Read it with
  `getLedgerTotal`; do not show the confirmed balance on these screens.
- A card with funds that still confirm adds one line under the amount and its
  fiat value: "+0.05 VRSCTEST pending" for incoming funds, "−0.0042 BTC
  pending" for a send that waits (the net of all unconfirmed transactions, so a
  send includes its fee). The line uses the fiat line's style and blurs with
  hidden balances. `getLedgerPending` returns null when there is nothing
  pending; Ethereum and tokens never report pending funds.
- While the private card syncs, "Syncing x%" replaces the line.
- Send keeps its own rule: the private card sends only confirmed funds (see
  Private card sends).

## Bridged asset line

The owner chose variation C of the "mapped to" mockup on 2026-10-23. It
applies to `SignedInAssetHeader` only.

- A Verus currency whose original lives on Ethereum shows one line under the
  ticker: "Bridged from Ethereum ›", or "Bridged from Sepolia ›" on testnet. It
  uses `caption` in `textSecondary` with a 14-point `textSubtle` chevron. The
  text truncates and the chevron stays; the target is 44 points high.
- `getBridgedOrigin` in `src/utils/assets/bridgedOrigin.js` decides it from
  data: the currency is the Ethereum gateway (vETH, mapped to ETH), or its
  system is that gateway (DAI.vETH, vUSDC.vETH, tBTC.vETH and the other bridged
  tokens). VRSC and Bridge.vETH also carry `mapped_to`, but their original
  lives on Verus, so they show nothing. ETH, ERC-20 and other asset screens show
  nothing; there is no "Also on Verus" line. The line hides until the mapping
  resolves.
- Home, its rows and the card picker do not change.
- A tap opens `BridgedOriginSheet`, an `InfoSheet` titled as the line without
  the chevron. Rows, each only when its data exists: Original (the token name),
  Contract address with `CopyAction` for an ERC-20 original, and the "View in
  explorer" action row to the token on Etherscan or Sepolia Etherscan. vETH
  shows only Original. Rows do not repeat the network or the title.

## Transaction history row

The owner approved this row on 2026-10-19 (option A of the history mockup, task
TX-1.HISTORY-NEUTRAL in `UI_REDESIGN_PLAN.md`). It applies to the transaction list
on the Coin Overview, drawn by `FocusedTransactionRow` in
`src/containers/Coin/Overview/Overview.js`.

- Mark: a 32-point circle in `surfaceMuted` with a 16-point `textSecondary` arrow,
  down for incoming and up for outgoing. Every row uses the same gray. The mark
  has no color and no pending clock.
- Color: green stays on the amount of an incoming row. Nothing else in the row is
  colored.
- Pending: the `StatusBadge` with the warning tone and the label "Pending" takes
  the place of the date line.
- Title: the counterparty address. A receipt names the address of the card it
  arrived on: "My transparent address", "My private address", "My VerusID", or
  "My address" for other cards. Do not label a row as a conversion; the owner
  removed those labels on 2026-10-19.
- Keep the chevron, the amount, ticker and fiat value column, and the skeleton rows.

## Transaction details

A tap on a history row opens `TransactionDetailsSheet` in
`src/containers/Coin/Overview/TransactionDetailsSheet.js`. It replaced the legacy
`TxDetailsModal` on 2026-10-21 (gap 1 of the redesign gap audit) and follows the
Sent step. The owner approved it on 2026-10-21.

- `InfoSheet` with the literal title "Transaction", the date and time as the
  subtitle, and a `StatusBadge` on the title line (`headerAccessory`): success
  "Confirmed" or warning "Pending".
- Then the Sent step's `TransferNode`: the asset logo, a label ("You sent", "You
  received", "Interest", or the history row's fee label), and the amount with the
  fiat value when the ledger holds a price. The amount has no sign and no color,
  because the label gives the direction.
- Then `InfoSheetRow`s under a hairline, each only when its data exists: To (one
  address per line; `CopyAction` only for a single address), Network fee,
  Message, and Transaction ID (one line with a middle ellipsis). `copy` on the row
  adds `CopyAction`. Identifiers use 12/17 monospace, the Sent step's ID size, so a
  full R-address fits on one line on an iPhone SE.
- "View in explorer" is a sheet action row. It shows only when the coin has an
  explorer.
- Done closes the sheet, as in every information sheet.

## Transaction result

`src/components/TransactionResult.js` draws every screen after the wallet
sends one or more transactions. It is the Send flow's Sent step, extracted on
2026-10-23 after the claim result said "submitted" four times ("Claim
submitted", "The claim transaction was submitted.", "SUBMITTED TRANSACTIONS",
"1 transaction submitted.").

- No header. The animated check sits beside the 28/36 title only when every
  transaction was sent (`success`). A failure or a partial result shows the
  title alone. A `description` under the title is only for a fact the title
  does not state ("1 of 2 transactions was submitted. ...").
- Then the optional amount (`TransferNode` rows, or the claim's large amount),
  the optional fact rows (`FlatRow`, such as Destination), and the
  transactions. One transaction is a "Transaction ID" row with `CopyAction`.
  With two or more (`itemized`), each transaction is a block: its group (the
  chain, only when they differ), what it moved ("alice@ and funds"), then its
  "Transaction ID" row. An explorer link adds "View in explorer" as a sheet
  action row under the row.
- The caption says what happens next ("Sharing unlocks after it confirms."). A
  `warning` line asks the user to do something. The actions sit in the safe
  footer; the first is primary.
- The component has no prop for a section label or a count line, because the
  title and the rows already say both.

Users: Send, Convert, pre-conversions and invoice payments
(`SendWizardSuccess`), gift card funding (`GiftCardFund`) and the card claim
(`SpendableKeyRequestInfo`).

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
- Card: `GiftCardFixedCard.js`, with the earlier flip card's material, at the
  full content width. Its outline, amount and unit match the payment slip
  (owner, 2026-10-22): `src/utils/ticketOutline.js` draws 20-point corners and
  two round notches at half height, the amount is 44 points (38 on narrow or
  short windows) and the unit 20 points. The card does not flip. It has
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
- Shared on Android: Android does not report when the system share sheet is
  closed without a send. Opening the sheet therefore marks the card Shared,
  because the link may have left through Copy. Keep this (user decision,
  2026-10-15). On iOS a dismissed sheet leaves the card unshared.
- Facts: label/value rows with hairline dividers under the card, only for facts
  the card does not show: Shared, Claimed by, Claimed, Claim protection, and
  Created. Copyable values use `CopyAction`.
- Pending: one "Funding transaction" row with the transaction ID in monospace
  and `CopyAction`, and one line: "Sharing unlocks after it confirms."
- Actions: a bottom primary action appears only when the card is not funded
  ("Add contents", with "Fund from another wallet" as a secondary button). Less
  frequent actions stay in ⋯, drawn with the sheet action rows.
- Warnings appear in the share confirmation, not as permanent notice boxes.
- Wording: use "Claimed", not "Redeemed" or "Claim completed". Use "Shared" as
  the status after the link leaves the wallet.

## VerusID page

The owner approved "D revised" on 2026-10-22 (round 3 of the VerusID mockups).
It replaces the old fold-out details. The tab icon stays the VerusID @ mark; the
page itself shows no mark.

- List: one filled row per linked VerusID: `surfaceMuted`, 18-point radius,
  76-point minimum height, no border, no shadow. The name uses `titleRow`, with
  the first part in `textPrimary` and the parent and network in `textSecondary`.
  Under it, the asset count in `caption` ("2 assets", "No assets"). A
  `StatusBadge` shows only for Locked (warning) or Revoked (danger); Active is
  silent. A chevron ends the row. The title has no count pill.
- No linked VerusID: `EmptyState` with `AtSign`, "No VerusID linked", one line
  and "Link VerusID". The list header's ⓘ ("About VerusID") opens the
  explainer; the empty state has no second link to it.
- Header: the arrow back button, and ⋯ on the right. After the card scrolls
  away, the header shows the first part of the name. ⋯ opens a sheet with one
  action row, "Unlink VerusID" (danger), which opens the existing unlink
  confirmation.
- Card (`VerusIdCard.js`), at the content width: `surfaceMuted`, 24-point
  radius, no border, no shadow, no mark. The name in `headlineMd`
  (`headlineCompact` on windows of 667 points or less), in the two list colors,
  with `CopyAction` at the right of its first line; it copies the name. Under it
  the network, with the status badge on the same line. The card shows no
  i-address; Details has it (owner, 2026-10-22). This filled card is an approved
  exception to flat pages, for this page only.
- Under the card: Receive, Send and Convert as the asset screen's small icon
  buttons (`SignedInActionButtons` in `SignedInActionBar.js`), 12 points below
  the card, with no primary. Receive opens Receive on the VerusID's own network
  with its card. Send and Convert open the wizard on the asset when the VerusID
  holds one asset, and Select asset with only its assets when it holds several.
  Send and Convert are off when the VerusID is locked, revoked or empty; Convert
  is also off when conversions are disabled. Receive is off when it is revoked.
- Control: a `titleRow` section title, then the gift card fact rows. "Spend and
  sign" reads "Only you", "You and others", "Other addresses", "Locked" or
  "Revoked", with "N of M signatures" or the unlock time below. "Revoke and
  recover" reads "This VerusID" or the authority's name; different authorities
  get separate Revoke and Recover rows.
- Then two flat 62-point rows, as on Recipient: "Content | N entries ›" and
  "Details ›". Content without entries reads "None" and does not open.
- Content is an information sheet with one `InfoSheetRow` per decoded value:
  text, a link, an image size, a field count or a byte count. All encrypted
  values of one key form one row, "N values", with a neutral "Encrypted" badge.
  The wallet never decrypts them.
- Details is an information sheet: i-address (with `CopyAction`), Parent,
  Primary address(es), Private address and Last change (block). "View in explorer" shows only where the network has
  a VerusID explorer, so never on testnet.
- Funds come last: a `titleRow` title, then one Manage assets row per asset
  whose VerusID card holds a balance (40-point logo, `titleRow` name, `bodySm`
  amount, chevron). A tap opens that asset screen with the VerusID card
  selected; Back returns to the VerusID page. Skeleton rows show while balances
  load. "This VerusID holds no funds." shows when there are none. Hidden
  balances read "Balance hidden".

## Home notification card

The owner chose card A on 2026-10-22 (gap 5 mockups). A VerusID request
(`NotificationWidget.js`) shows one card under the Home balance.

- `surfaceMuted` fill, 18-point corners, no border. The name in semibold and the
  rest in regular, 16/22: "<name>@ is ready" or "<name>@ could not be created".
- One small `AppButton` (`compact`, 36 points, 12-point corners) on the page
  color, because the secondary tint disappears on the gray card. The label is
  the request's action ("Link VerusID", "Use") or "Try again".
- A close icon (20 points, `textSubtle`) in a 44-point target removes the card.
  No "×" letter and no filled circle.

### Ready card celebration

The owner chose celebration C on 2026-10-22 and removed its border after seeing
it in the app ("looks very AI"). A ready VerusID uses `VerusIdReadyCard.js`; a
failed request keeps the gray card.

- The ready card keeps the card A layout on its own soft blue-to-green tint
  (light `#DEE8FC` to `#E2F1E7`, dark `#21509A` to `#1C4E66`). It is card
  material like the gift card, not a theme token. No border, no traced outline.
  The close icon uses `textSecondary`, because `textSubtle` is too faint on the
  tint.
- The first time the card shows, it celebrates once (2.2 s): the tint blooms,
  the name rises into place, "is ready" fades up, and 12 confetti pieces fall
  behind the text. With Reduce Motion, the tint only fades in.
- The stored notification keeps `celebrated: true`, so a relaunch, a tab switch,
  or a later visit shows the still card.

### Connection card

The owner approved this card on 2026-10-26 (issue 4 of the first E2E night
run). `src/containers/Home/HomeWidgets/ConnectionNotice.js` shows it under the
Home balance, above the notification cards, while balances cannot update.

- It uses the card A look and its styles: `surfaceMuted`, 18-point corners and
  16/22 text with the first sentence in semibold. It has no close icon,
  because the card goes away by itself when balances update again.
- Offline: "**No internet connection.** Balances may be out of date." It has
  no button, because Home refreshes by itself when the connection returns.
- A balance update failed for an asset on Home (not the private card, not a
  service): "**Could not connect.** Balances may be out of date." with the
  compact "Try again" button.
- On the asset screen the total reads "—" while a transparent or VerusID card
  has no balance. A failed history with nothing saved uses `EmptyState`
  ("Unable to load transactions", "Try again").

## Secure task screen

`SecureLoading.js` covers tasks that must not be interrupted: Lock wallet, Clear
cache, keychain encryption, Delete wallet, and Reset password. The card claim
uses its `SecureLoadingView` while it broadcasts ("Claiming funds"). The owner chose
variation A on 2026-10-22; the claim's own picture is below.

- It follows the request loading screen (`GenericRequestLoading.js`): theme
  background, the `loading_7bars` loader, the task as a short title (24/31
  semibold, "Signing out", "Clearing cache", "Deleting wallet data"), and "Keep
  the app open." in 15/22 `textSecondary`. No header and no swipe back.
- After 15 seconds the line reads "This is taking longer than usual. Keep the
  app open." A failed task shows its error as the title without the loader.

### Claiming funds

The card claim replaces the loader with its own picture
(`ClaimingFundsView.js`, next to `SpendableKeyRequestInfo.js`). The owner chose
animation A on 2026-10-23.

- A 248 x 96 picture in the loader's place, with the same 26-point gap to the
  title: a small gift card on the left (92 x 58, the gift card material,
  `getTicketOutline` with 12-point corners and 6-point notches, an iOS shadow
  only) and the active wallet's icon on the right (`WalletAvatar`, 56 points).
  A wallet without an icon shows the `wallet-outline` glyph on a
  `surfaceMuted` disc.
- Every 1.8 s a coin slides out from under the card and arcs into the icon,
  which lifts a little as it takes it. The coin is the claimed currency's
  `AssetCoinLogo` at 28 points (the chain's own coin when the card holds
  several; the chain's coin when the currency has no logo). The card never
  empties, so nothing looks finished before the broadcast returns.
- When the broadcast returns, the line fades, the card dims to half, and the
  wallet setup check (24 points, a 3-point ring in the page color, a white
  check in light and a page-color check in dark) springs onto the icon. A coin
  in its last 0.5 s of flight lands first; an earlier one fades on its way.
  After 1.1 s the screen fades out and the result fades in. A failure shows
  its error at once, with no success motion.
- Reduce Motion: no coin, no lift and no spring. Three 5-point `primary` dots
  between the card and the icon fade in turn, and the check fades in.
  Reanimated skips an animation when the system asks for less motion, so these
  animations set `ReduceMotion.Never` and the screen decides what moves.
- `SecureLoadingView` takes `illustration`, `contentStyle` and `statusStyle`.
  With an illustration the line keeps room for two lines, so the slow message
  does not move the picture. Other tasks keep the 7-bar loader. No gradient
  borders, glow or traced outlines.

## Wallet setup screen

Creating or importing a wallet shows `WalletSetupOverlay.js`
(`src/components/WalletSetup/`). The owner chose variation E on 2026-10-22,
after two mockup rounds; it combines the wallet icon in a progress ring with
the coins that fly onto Home.

- The wallet icon (96 points) sits in a 128-point ring, over "Setting up
  <name>" ("Restoring <name>" for an import) in 24/31 semibold. Below are one
  48-point slot per starting coin (VRSC, BTC and ETH; VRSCTEST and GETH on
  testnet) and one 15/22 line that names the current step.
- Only real steps move it: a coin shows when its key is made, and the ring
  grows when a step ends (`createProfileFromSeed` reports them through
  `onStep` and waits until the screen has shown each one). The gaps between
  reveals (0.4 s before the first coin, 0.36 s between coins, 0.22 s between
  steps) only make each step visible.
- The end: a green check settles on the icon, the title reads "<name> is
  ready", and after 1.1 s the coins fly onto their rows on Home
  (`WalletSetupLogoSlot.js` lends the row logos as targets) while the rest of
  the screen fades. The slots follow Home's row order, so the coins fly
  straight down. No button and no pop-up.
- The coins leave only when two measurements of Home's rows, 150 ms apart,
  agree. During the flight the screen measures the rows again every 100 ms,
  and a coin bends toward its row if the row moved. The row logo fades in
  under the landed coin (150 ms), then the coin fades out.
- A Face ID or Touch ID sheet during setup does not show the app's privacy
  cover: the setup screen stays behind the sheet. The cover still shows when
  the app goes to the background.
- A failure stays on the screen: "<name> was not created", one line, and
  "Choose another name" or "Try again" with "Back".
- With Reduce Motion the screen only fades. When a saved request opens next,
  or Home has no rows to land on, the coins fade instead of flying.

## Receive and payment request

The owner approved variation A ("Calm address") for Receive and variation C's
paper slip for Request ready on 2026-10-20 (RX-2 in `UI_REDESIGN_PLAN.md`).

- The "Receive assets" list shows its title in the header bar, centered in
  `titleSheet` between the arrow back button and an empty right side, as Send's
  Select asset does (owner, 2026-10-24). There is no large title under the
  header.
- Receive has the arrow back button and no title or options icon. A
  40-point asset logo sits beside `headlineMd`. Under the name, show only the
  selected card type and its network. With several cards, that line opens
  "Choose a card" and has a 44-point touch target.
- Center the QR and address group in the remaining space; scroll when needed.
  The QR tile stays white in both themes, with 16-point padding, a 20-point
  radius, and a 216-point QR (184 on small screens; on windows of 640 points
  or less, a 160-point QR, 12-point padding and tighter spacing so the address
  field sits above the footer). Keep the existing filled address field, middle
  ellipsis, identifier type, and `CopyAction`. Do not group addresses into
  four-character blocks. VerusID names keep normal type. On Android the address
  text is not selectable, because a selectable Android text view ignores the
  middle ellipsis; `CopyAction` is the copy path.
- Show no supported-chain claim or repeated card/address metadata. The safe
  footer has Share address, then Request amount as a secondary action.
- "Choose a card" titles each card by type ("Transparent", "Private") or by
  its VerusID name, with a transparent card's short address as a monospace
  subtitle, so the chooser matches the context line.
- Request has one input step, then Request ready. Use `ProgressHeader` at 0.5
  and 1, the Send 40/48 amount field (it shrinks to 20 points to keep the
  amount and its unit on one line) and conversion chip, and `FlatRow` for
  Note and Conversions. These rows show only on conversion-eligible cards.
  The two compact form sheets follow `AddressBookEditSheet`; choices apply
  after dismissal. The note stays out of the modern invoice QR.
- Request ready uses `PaymentRequestSlip` at the full content width. The fixed
  `#F6F3EC` paper, light text colors, notched SVG outline (`ticketOutline`,
  shared with the gift card), dotted perforation,
  and `StatusBadge variant="paper"` are an approved material exception to flat
  pages. Use the VerusPay wordmark and conversion badge for modern invoices;
  other cards show the asset name and logo. The amount sizes itself to the slip
  width and the unit shrinks with it, so the number is never smaller than its
  ticker. The result step shows no bottom scroll fade: the cut card edge
  already shows that more is below, and a page-colored fade smears the paper
  in dark mode. The QR
  is 200 points (160 on compact windows), with a 14-point quiet zone. Under it,
  show the address in one monospace line with middle ellipsis, or the human
  VerusID name in normal type. Use an iOS shadow; no Android rectangle elevation.
- The result footer has Share for modern invoices, or Save QR to camera roll
  for other cards, then secondary Done. Back returns to the input with values
  kept. The result scrolls. Generation, share, save, and interruption behavior
  retain the existing operation guards and invoice contracts.

## Scanned payments and VerusPay invoices

The owner approved this on 2026-10-21 (mockup rounds on the Scan tab and
invoices). Every payment ends on the same Send Confirm, with Hold to confirm,
and the same Sent screen. Each path skips the steps that the QR code already
answers. The Scan tab (`src/containers/VerusPay/VerusPay.js`) opens Send with a
`scan` request; the recipient is fixed, so Recipient is skipped.

- A request with an amount opens Confirm when one card can pay. Back opens
  Amount with the amount filled in. A request note shows as a Note row.
- A request without an amount opens Amount. An address alone opens Select asset
  with only the assets whose network takes that kind of address. An R-address
  or i-address fits Verus assets only.
- The context band shows "to <short address>" on Amount and "To <address>" on
  Select asset, because Recipient is skipped.
- A request that names another network warns above Hold to confirm. An asset
  that is not in the wallet opens `AcknowledgeSheet` ("Add <name>?", "Not now");
  the payment then continues. A request for the other network type (mainnet or
  testnet) is never added. Codes the wallet cannot pay show "Can’t use this QR
  code" with "Scan again". There are no system alerts on this path.

A VerusPay invoice opens `InvoicePayFlow`
(`src/containers/DeepLink/InvoiceInfo/`): Pay with, Confirm and Sent, inside the
invoice screen so a generic request continues after the payment.

Every request link opens on the request loading screen
(`GenericRequestLoading.js`), with Cancel. An invoice link reads "Opening
invoice" with the steps Read invoice, Select network, Verify signer (signed
invoices only) and Prepare payment. Identity update links read "Opening
request" with the GenericRequest steps. v1 login links show the screen without
steps and keep their own screens and alerts (owner decision, 2026-10-21).

- Pay with shows the payer's side of the payment slip (`InvoiceSlip`): the
  VerusPay mark, the amount, and a stub. The owner chose the slip (option 2 of
  the Von Restorff variations) so that the request is the one thing that stands
  out. This extends the slip's material exception to the payer's side.
- A signed invoice has no badge: the stub reads "Request from" (13 points) above
  the VerusID name in 17-point semibold, the gift card's name size. A name shows
  only for a signed invoice, so it needs no "signed" line (owner, 2026-10-22).
  An unsigned invoice keeps the paper "Unsigned" badge, and its stub reads "To"
  above the full address in monospace.
- Under the slip, every way to pay with its cost: "Pay directly", then "Pay with
  conversion", one row per currency (owner, 2026-10-22). The wallet picks the
  cheapest basket; rows do not say "via". A conversion row shows Send's price
  impact chip (`ImpactChip`) with the same rule and tones as on Amount, but it
  reads "x.x% more", because the invoice fixes the amount and the user pays the
  difference. The chip opens `PriceRouteSheet` in pay mode: every basket with
  its cost, cheapest first ("Best price", "x% more"), then Market price, Your
  price and Difference; a choice changes the row. A basket that is the requested
  or the paying currency itself counts as "Direct". There is no "Use … instead"
  suggestion. A currency on several cards shows "<n> cards" and opens "Choose a
  card". The step is skipped when the invoice allows no conversion and one card
  can pay.
- Confirm adds "Request from" (signed invoices only), "From" (only after a card
  choice), "Expires" and "Invoice details". Its Price impact reads "x.x% more", and
  the money is what the user pays on top of the market price. It always pays through the
  currency-transfer path, so the invoice tag goes into the transaction, and it
  refuses a payment that the fee would shrink.
- Sent reads "Payment sent". Done closes the invoice or continues its request.
- Errors: "No way to pay this invoice" on Pay with; conversion options that do
  not load show an error with "Try again" while direct payment still works; the
  shortfall shows above a disabled Hold; expired, unreadable and wrong-network
  invoices end on a sheet with "Close". Burn invoices keep their old screens.

## Camera scanner

The owner chose variation B ("Camera window") on 2026-10-22, with the torch
button. Every QR scanner uses it: the Scan tab, Send's Recipient step, key and
seed import, VerusID recovery, and the claim password.

- The page stays. The camera is a rounded window (24-point radius, the sheet
  radius) inside the page, with the page inset on both sides (16 points in
  Send, 20 elsewhere). The window is a deliberate exception to flat pages.
- A flow keeps its own header: Send shows "Scan address" in
  `SendWizardHeader` with its progress and context band; other flows use
  `ScannerScreen` (`ProgressHeader` with Back and a short title). Back, and
  Android back, return to the step that opened the camera. There is no Cancel
  button. The Scan tab shows the `headlineMd` "Scan" title with the Services
  title spacing.
- Inside the window: a dimmed camera around a rounded 232-point frame with four
  corner marks. The torch button (44 points, bottom right) shows only on a
  device with a flash. After a read, the corner marks turn green and "Reading
  code…" shows at the bottom of the window. There is no spinner page.
- Problem states show inside the same window in `surfaceMuted`, as the NFC tap
  screen does: one symbol, a `titleSheet` title and one `bodySm` line. "Camera
  access is off" offers "Allow camera" while the system can still ask, and
  "Open Settings" after that. "No camera found" can add one hint and one
  secondary action, such as "Enter address". The system prompt shows over the
  dark window; no in-app permission page shows first.
- Actions sit under the window in `SafeBottomActionStack`, for example "Claim
  from NFC card" on the Scan tab.
- The camera runs only while its screen is focused and the app is active.

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

The card claim result follows the Send flow's Sent step and says each fact once
(owner approved the copy on 2026-10-23):

- `TransactionResult` draws it (2026-10-23): "Claim submitted" with the Sent
  step's animated check, and no subtitle, section label or count line. The
  title and the footer take the Sent step's measures (28/36 title; footer 24
  points from the bottom on small windows, 40 on normal ones), not the
  request screen's `RequestTitle` and 30-point footer.
- One transaction: the claimed amount in the review's amount style, a
  "Transaction ID" row with `CopyAction`, "View in explorer" as a sheet action
  row, and one caption: "The funds show in your wallet after the transaction
  confirms." A VerusID claim shows the VerusID note as the caption instead.
- Several transactions: one block each, with the chain name only when there
  are two or more chains, what it claims ("alice@ and funds"), the
  Transaction ID and the explorer.
- A partial failure reads "Claim not finished" with the real counts ("1 of 2
  transactions was submitted. The other is saved. Retry to submit it."), the
  submitted blocks, then Retry and Close. No red card; the raw error is logged.
- An error screen shows its title once. "Retry when your connection is
  available." shows only for a network error.

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
- Read every visible string in each state. Name the fact each one states.
  Remove repeats.
- Run `corepack pnpm check:design` and any targeted safe-area or parser checks.

When the same correction repeats in design review, encode the accepted fix in
the narrowest durable layer:

- Visual judgment or scope belongs in this file.
- Repeated spacing, typography, state, or interaction mechanics belong in a
  shared component, style module, or semantic token.
- A mechanical failure that can be detected reliably belongs in a check.

The repeated "submitted" on the claim result (2026-10-23) shows both layers. The
shared layer is `TransactionResult`, which offers no section label or count
line. The check is in `corepack pnpm check:design`: it fails when a section
label ("Submitted transactions") or a count line ("1 transaction submitted.")
repeats a status word of a title in the same source file.

Do not add a rule from one accidental output. Keep the correction only after it
is approved as reusable, then compare the next first attempt against the same
exemplar and states.
