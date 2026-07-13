# Signed-In Valu Visual Parity Checklist

**Acceptance state:** major Light-mode visual gate passed. Runtime and source-measurement evidence is recorded in `design-qa.md`; residual device/reference limitations are explicit there.

**Visual source of truth:** `/Users/maxtheyse/dev/valu-mobile` at `562031df12594f82bb0fc902280773592e88ad2d`.

**Allowed visual differences:** Verus typography, semantic Light/Dark/System colors, Verus-only capability copy, responsive shrinking for compact screens, and Verus domain assets. Preserve Verus Redux, Saga, Card, channel, security, deeplink, Gift Card, and native behavior.

**Excluded:** Buy/Sell, Valu branding, Valu Social, Proof-of-Personhood promotions, payment-provider art, and fake replacement behavior.

## Blocking comparison rules

- [x] Compare at the same target viewport. Because the Valu signed-in runtime could not be opened without importing private profile material, exact source/style measurements are the reference side of the combined boards.
- [x] Use combined boards for every major design-QA judgment; separate screenshots are supporting evidence only.
- [x] Fix every observed P0, P1, and P2 mismatch before visual acceptance.
- [x] Keep funded send/conversion QA paused until the major Light-mode parity captures pass.
- [x] Preserve geometry and hierarchy in Dark mode; substitute semantic theme colors only.
- [x] Keep bottom actions safe-area-aware and normal-flow even when matching Valu's visible fixed-action composition.

The detailed boxes below remain the traceable source contract. A box is checked only when that exact state was directly reproduced in this run; an unchecked edge state is not evidence of a known implementation defect. See `design-qa.md` for the screen-by-screen acceptance result and the states that could not safely or practically be reproduced.

## 1. Signed-in shell and bottom navigation

Valu source: `src/containers/RootStack/HomeTabScreens/HomeTabScreens.js`.

- [ ] Use the standard React Navigation bottom-tab navigator, not Material bottom tabs.
- [ ] Exact order: Wallet, Services, Identity, Settings, Scan.
- [ ] Icons: Feather `credit-card` 22, `compass` 22, VerusID at-mark 22, `settings` 22, `maximize` 24.
- [ ] Icons use a 2-point bottom margin.
- [ ] Labels are 12/500 with tint-only selection; no active pill, raised item, custom Scan control, or shifting animation.
- [ ] Light bar is the themed surface with a transparent top border; active tint is Verus primary and inactive tint is subtle text.
- [ ] Identity may show the source 8x8 actionable-status dot with a 1-point surface border.
- [ ] Tab state/history survives switching destinations.
- [ ] Old Personal and standalone Convert destinations remain absent.

## 2. Wallet home

Valu sources: `Home/Home.render.js`, `Home/HomeWidgets/TotalUniBalanceWidget.js`, `Assets/Assets.render.js`, `Home/HomeFAB/HomeFAB.js`.

- [ ] Header owns the screen chrome; no stack title.
- [ ] Header insets: 20 horizontal, 10 top, 8 bottom; add a hairline only after scrolling.
- [ ] Portfolio hero is an unframed row, not a raised card.
- [ ] Currency symbol is 20/600; amount is 40/700 with 44 line height; hidden value uses the same geometry.
- [ ] Eye and manage-assets plus are unframed 20-point icons aligned at the hero's upper right.
- [ ] Asset rows are flat: 16 horizontal/vertical padding, 38x38 logo, 16 logo gap, no card radius/elevation/dividers.
- [ ] Asset name 17/600; fiat total 16/600; crypto 16/500; unit rate 12/400 with a 6-point secondary-row gap.
- [ ] Funded sort, privacy masking, price-unavailable, mapped/PBaaS status, and pull-to-refresh remain honest to Verus state.
- [ ] Empty/loading/error treatment occupies the same list region and does not introduce generic dashboard cards or alerts.

## 3. Wallet actions above bottom navigation

Valu sources: `Home/HomeFAB/HomeFAB.js`, `components/GradientButton.js`; product labels are fixed by the PRD.

- [ ] Visible composition matches Valu: 48-point transparent-to-surface fade, opaque action backing, 10 top and 16 horizontal row padding.
- [ ] At the reference width, actions render as two 160x44, radius-22 pills with 16/700 labels and no elevation.
- [ ] Compact widths shrink both actions equally without clipping or changing order.
- [ ] Left action is `Receive`, using Valu's secondary treatment with themed muted/primary colors.
- [ ] Right action is `Send or convert`, using Valu's primary button treatment with Verus primary colors (no Valu cyan gradient).
- [ ] No Buy/Sell or promotional action appears.
- [ ] Actions do not cover content, the home indicator, or the bottom tab bar.

## 4. Asset detail and Card context

Valu sources: `Coin/CoinMenus.js`, `Coin/DynamicHeader.js`, `Coin/Overview/Overview.js`.

- [ ] Main five-tab bar remains mounted while viewing asset detail.
- [ ] Native header has no title/shadow; optional contract/Card actions retain their exact 22/24 sizing.
- [ ] In-screen identity block: 20 horizontal, 8 top, 6 bottom, 28 logo, 22-bold name, 14/500 ticker/total line.
- [ ] Card selector label is `Addresses` plus `n/total`, 13/600 with 20 horizontal padding.
- [ ] Card carousel: screen width minus 72, height 206, radius 18, 12 gap, 16x14 padding, snap-fast behavior.
- [ ] Card contains network watermark, 30/700 balance, 16/600 ticker, fiat/status, and a copyable address row separated by a translucent rule.
- [ ] Card sorting and momentum selection update the existing active-subwallet contract only after selection settles.
- [ ] Transactions remain the primary content under the Cards; no internal Overview/Transfer/Receive tab bar remains.
- [ ] Asset actions use the same fade/row geometry as Wallet, but both `Receive` and `Send / convert` use equal secondary pills.
- [ ] Unsupported, syncing, pending, connection-error, and no-transaction states match the Valu placement while using Verus copy/tokens.

## 5. Receive entry and journey

Valu sources: `Transfer/ReceiveAssetsList.js`, `ReceiveSubwalletSheet.js`, `ReceiveAssetDetails.js`.

- [ ] Wallet Receive opens the dedicated asset selector; asset-detail Receive skips directly with explicit Asset and Card.
- [ ] Asset selector uses a 28-bold heading, 48-high/radius-12 search, and the same flat 38-logo rows as Wallet.
- [ ] Multiple Cards open `Choose address`: max 70% sheet, network group headings, 12-radius muted Card rows, balance and chevron.
- [ ] Receive detail uses 20 horizontal padding, 32 logo, 28-bold asset name, 16/500 ticker, and centered 200 QR.
- [ ] Supported networks appear as the source overlapping-logo pill.
- [ ] Address uses a radius-12 muted row with a fixed copy-feedback lane; use shared `CopyAction` without changing geometry.
- [ ] VerusID and i-address remain separately labeled/copyable where supported.
- [ ] Payment-request entry is a 65-high/radius-16 bordered card.
- [ ] Payment request preserves Valu step order: amount/keypad, optional subject, conversion/slippage, QR result/share/save.
- [ ] Keypad, compact sizing, 220 QR result, and fixed Done/New-request action placement match the source.
- [ ] Fetching, no address, unsupported network, generation error, and empty search remain inline/dedicated states rather than native alerts where Valu supplies a surface.

## 6. Send-or-Convert wizard

Valu source: `src/containers/SendWizard`.

- [ ] One navigator/context owns Send and Convert; no legacy send modal or generic conversion chooser is presented.
- [ ] Step order is exact: source -> recipient receives -> amount/route -> recipient -> review/hold -> result.
- [ ] Asset-detail entry preselects source Asset/Card and begins at target selection without flashing source selection.
- [ ] Intermediate headers are blank, white/themed, shadowless, with native back and a 22-point top-right close.

### 6.1 Source

- [ ] 28-bold `Select asset to send or convert`, 52-high/radius-12 search, 38-logo flat rows.
- [ ] Only spendable funded sources appear; multiple Cards use the Valu `Select source` sheet.
- [ ] Empty state uses the exact balance-specific message and centered placement.

### 6.2 Send versus Convert target

- [ ] 28-bold `What should the recipient receive?` and identical search geometry.
- [ ] `SEND` section presents the same asset first; choosing it is a normal send.
- [ ] `POPULAR CONVERSIONS` and `MORE CONVERSIONS` preserve source row hierarchy and capability-driven availability.
- [ ] Network selection uses radius-14 option cards, 4-point accent, same-network badge, and inline fee insufficiency.
- [ ] Loading and no-option states occupy the source locations.

### 6.3 Amount and route

- [ ] Context sentence explains source/target network and Send versus Convert.
- [ ] Centered 40/700 amount input, fiat/crypto chip, available balance, and outlined MAX match source geometry.
- [ ] Conversion estimate uses a radius-16 hairline card and shared `SkeletonLoader` in the source-sized placeholders.
- [ ] Route sheet uses 12-radius cards, selected border/check, BEST state, estimated output, and empty copy.
- [ ] Fixed 52-high Continue action uses Verus primary treatment.

### 6.4 Recipient

- [ ] 28-bold heading/subtitle, 56-min/radius-12 multiline field, integrated 36-point Paste and QR hit areas.
- [ ] Inline validation, optional Address Book chip, saved-address and self cards match source hierarchy.
- [ ] Scanner takeover hides the stack header and preserves existing supported deeplink/QR behavior.

### 6.5 Review and hold confirmation

- [ ] 28-bold Confirm heading, amount block, optional conversion receive block, and details card match source composition.
- [ ] Recipient, network, route/time, fees, and source are explicit and Verus-authentic.
- [ ] Supporting explanations use source-shaped sheets, not generic alerts.
- [ ] Critical CTA requires the source 2.5-second hold with visible progress and haptic feedback.

### 6.6 Result

- [ ] Headerless screen starts 80 points from top with 90x90 success animation and centered 28-bold title.
- [ ] Radius-16 summary card contains source, optional output, recipient, network, ETA, and copyable txid.
- [ ] Done action uses 24 horizontal and 40 iOS bottom padding (adapted safely on other devices).

## 7. Services and Verus additions

Valu sources: `Services/ServicesOverview/ServicesOverview.render.js` and its service widgets.

- [ ] Local header is 20 horizontal, 12 top, 16 bottom with 28-bold title.
- [ ] Service column has 16-point padding/gaps.
- [ ] Each service entry is a full-width min-108 card with radius 16 and 20x24 padding; title 20/700 and subtitle 14/500.
- [ ] Gift Cards, Address Book, and VerusID setup use this exact card language.
- [ ] No generic Paper menu rows, promotional art, unavailable provider cards, or `coming soon` fillers.
- [ ] Optional unavailable services are omitted rather than represented by invented dashboard errors.

## 8. Gift Cards and Address Book

- [ ] Gift Cards entry uses the Services 108/radius-16 card and then preserves existing secure workflow behavior.
- [ ] Gift Card sheets/results are restyled only where needed to share the Valu/Verus screen grammar; secrets remain hidden.
- [ ] Address Book manager has 28-bold local title, 20-point plus, scroll hairline, source search/filter thresholds, and radius-12 muted rows.
- [ ] Address rows use 28 icon, 12 gap, 16/600 label, 14 address, and inline copy/check/edit/delete actions.
- [ ] Empty state uses the source illustration footprint, 20/700 title, 15/22 copy, and 240x44/radius-22 CTA using a Verus-safe asset/icon.
- [ ] Add/edit uses the source slide sheet, 52-high/radius-12 fields, Paste chip, and full-width primary action.

## 9. Identity / VerusID

Valu sources: `Identity/Home/IdentityHome.render.js`, `IdentityListItem.js`, `Identity/VerusIdDetails/VerusIdDetails.js`.

- [ ] Root header is 20 horizontal, 12 top, 16 bottom with 28-bold Identity plus info/add actions.
- [ ] Loading is centered plain copy at the same location; no invented card or mixed spinner/skeleton.
- [ ] Empty state preserves the 170x140 visual footprint, 32 gap, 20/700 title, 15/22 description, and 200x44/radius-22 actions using Verus assets/copy.
- [ ] Linked section uses 20 horizontal, 8 top, 16/700 title/count, 12 row gaps.
- [ ] Rows are min 76, radius 16, 14 padding, 1 border, restrained light elevation; identity name 18/700 and network pill 10/700.
- [ ] VerusID detail is a pushed full screen with native Back, browser/unlink actions, inline 28-bold title, attestations, refresh, and bottom fade.

## 10. Scan

Valu sources: `VerusPay/VerusPay.js`, `components/BarcodeReader/BarcodeReader.js`.

- [ ] Camera is full bleed on black with a 240x240 mask and centered 20-point prompt 24 below it.
- [ ] Processing uses the source centered 128-wide animation treatment.
- [ ] No-camera/permission state is full primary background with 104 white camera-off icon, centered 20 white copy, and text action.
- [ ] Existing GenericRequest, VerusPay, identity-update, and other deeplink routing remains unchanged behind this presentation.

## 11. Sheets, motion, loading, and compact behavior

- [ ] Sheets match Valu's visible slide behavior, centered title, close/back treatment, dim timing, list density, and 16-point top-corner geometry while using the shared themed sheet primitive.
- [ ] Stack pushes and tab changes use native/default React Navigation transitions; do not invent crossfades.
- [ ] `SkeletonLoader` replaces source-sized data placeholders only; process states retain fixed progress/loading treatment.
- [ ] Light is the primary Valu comparison. Dark keeps every measurement and swaps only semantic surface/text/border/scrim colors.
- [ ] Compact devices retain hierarchy and step order; controls shrink/reflow without clipping or being covered.

## 12. Required paired captures

- [ ] Wallet: populated, privacy hidden, empty/loading/error where reproducible.
- [ ] Bottom navigation: every selected destination plus at least one inactive comparison.
- [ ] Wallet actions and asset-detail actions.
- [ ] Asset detail with multiple Cards and transaction empty/populated states.
- [ ] Receive: asset list, Card sheet, QR/address, payment-request amount/result.
- [ ] Send: source, target same-asset, amount, recipient, review, result.
- [ ] Convert: alternate target, route sheet, estimate, review, result.
- [ ] Services, Gift Cards entry, Address Book list/empty/edit.
- [ ] Identity list/empty/detail.
- [ ] Scan normal/no-camera.
- [ ] Verus dark shell and compact-device structural checks after Light parity.
