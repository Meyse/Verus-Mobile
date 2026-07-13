# Signed-in Valu parity design QA

Reference: `/Users/maxtheyse/dev/valu-mobile` at `562031df12594f82bb0fc902280773592e88ad2d`

Viewport: `generic-request` iPhone 16 Pro simulator, `1206 x 2622` screenshot pixels.

## Acceptance method

Light mode establishes structural parity; Dark mode is checked separately as a Verus theme-token adaptation. The installed Valu build matches the researched commit, but its signed-in state could not be opened without importing private profile/seed material. To avoid handling or inventing a Valu profile, each combined board uses exact measurements and component composition taken from the concrete Valu render/style source on the left and the Verus runtime at the target viewport on the right. This is weaker than a live screenshot-to-screenshot pair and remains the principal visual-evidence limitation.

## Current gates

- [x] Wallet root and selected/unselected bottom navigation
- [x] Wallet Receive and Send or convert controls
- [x] Asset detail and Card carousel
- [x] Receive asset selection, Card selection, QR/address, and payment request
- [x] Send-or-Convert target choice, amount, recipient, review, hold, and result
- [x] Services, Gift Cards entry, and Address Book
- [x] Identity/VerusID
- [x] Scan permission/unavailable state; live camera remains a simulator limitation
- [x] Safe-area static check; no second compact simulator was run
- [x] Dark-mode shell pass outside Settings

## Iteration log

### Pass 0 — rejected baseline

- P0: Wallet used a raised portfolio card and generic list instead of Valu's unframed hero and flat asset rows.
- P0: Bottom navigation used a materially different treatment.
- P0: Wallet actions used generic icon buttons and wrong geometry.
- P0: Asset detail retained internal app tabs instead of Valu's Card-and-transactions composition.
- P0: Receive and Send/Convert retained legacy/generic surfaces instead of Valu's selector, sheet, and shared wizard.
- P1: Services, Address Book, Identity, and Scan did not consistently use the reference composition.
- Evidence: user simulator inspection and exact source/style audit.
- Result: failed.

### Pass 1 — literal Valu correction

- Replaced the rejected shell with the standard five-item Valu tab treatment and source-sized Wallet action pills.
- Rebuilt Wallet as an unframed portfolio hero with flat asset rows.
- Rebuilt asset detail around first-class Cards, transactions, and equal Receive / Send-or-convert actions while retaining Verus subwallet/channel selection.
- Replaced legacy/generic Receive and transfer surfaces with Valu-shaped asset selection, Card sheets, address/QR, payment-request sheets, and one shared Send-or-Convert wizard.
- Reworked Services, Address Book, Gift Cards entry, Identity/VerusID, and Scan fallback into the source screen grammar.
- Result: major Light-mode visual gate passed from combined source-measurement/runtime review.

## Screen-by-screen result

| Surface | Result | Evidence | Required-only differences |
| --- | --- | --- | --- |
| Wallet, bottom navigation, actions | Pass | `docs/qa/signed-in-valu-parity/wallet-comparison.png`, `wallet-funded-light.png` | Verus colors/type and no Buy/Sell |
| Asset detail and Card context | Pass | `docs/qa/signed-in-valu-parity/asset-comparison.png` | Verus Cards, PBaaS status, private/R-address channels |
| Receive and payment request | Pass | `docs/qa/signed-in-valu-parity/receive-journey-comparison.png` | Verus address types, supported-chain disclosure, QR/address evidence redacted |
| Send wizard | Pass | `docs/qa/signed-in-valu-parity/send-wizard-comparison.png` | Verus address validation, fees and channel-backed preflight |
| Convert wizard | Pass | `docs/qa/signed-in-valu-parity/convert-wizard-comparison.png` | Verus route names, estimate/fee data and supported testnet currencies |
| Services, Gift Cards, Address Book | Pass | `services-comparison.png`, `gift-cards-light.png`, `address-book-empty-light.png`, `address-book-editor-light.png` | Gift Cards and Address Book are Verus additions; unavailable provider cards omitted |
| Identity / VerusID | Pass | `identity-comparison.png`, `identity-dark.png` | Identity is VerusID; legacy Personal is absent |
| Scan | Conditional pass | `scan-unavailable-light.png` | Simulator has no usable camera; existing deeplink/scan routing remains behind the fallback |
| Dark shell | Pass | `dark-comparison.png`, `services-dark.png`, `identity-dark.png` | Semantic Verus theme substitution only |
| Compact devices | Static pass | safe-area checker over changed surfaces | No separate compact simulator runtime was available in this run |

## Runtime acceptance

- Fresh VRSCTEST-only profile created without exposing its seed or password.
- Minimal funding: `0.01 VRSCTEST`; funding transaction `73e5ec2117f27579c8c7484ae96964d6ad28a29049f5b6e51b93742fcdc64d1c`.
- Corrected Send wizard: `0.001 VRSCTEST` self-send reached the success screen; transaction ID is recorded in the completion report.
- Corrected Convert wizard: `0.001 VRSCTEST` to a supported testnet token route reached the success screen; transaction ID is recorded in the completion report.
- Result-screen Done navigation was rechecked after fixing a state-reset-before-navigation defect.
- The test profile, daemon, and destination provenance were revalidated as VRSCTEST before each externally consequential action.

## Residual limitations

- No live signed-in Valu screenshot pair: exact source/style measurements were used instead, as described above.
- Settings manual QA was intentionally excluded by the user.
- The iOS simulator cannot prove live camera behavior; permission/unavailable UI and existing routing were checked.
- No Android runtime was available. The Android debug APK build passed with the installed JDK 17 and Android SDK; interactive Android behavior remains unverified.
- Intermittent React Native Debug LogBox noise from an unrelated Ethereum fallback provider (`no runners?!`) can interrupt the first long-press gesture in Debug. Dismissing it and retrying produced both VRSCTEST transactions; the transfer path itself succeeded.

final result: visual gate and focused iOS/Android build checks passed; interactive Android, live-camera, compact-simulator, and manual Settings coverage remain the documented gaps
