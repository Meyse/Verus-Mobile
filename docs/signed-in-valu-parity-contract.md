# Signed-In Valu Parity Implementation Contract

## Baseline

- Implementation branch: `codex/signed-in-valu-parity`
- PRD baseline: `6d7acc540cf50bdf023991e64464b5becd137991`
- Spendable-key baseline: `620b0939f1b4264b2649449aea6413a09bba519b`
- Gift Card baseline: `73a5600b357576ec019e8eefeeadcb8e9c48d4cf`
- Valu journey reference: `562031df12594f82bb0fc902280773592e88ad2d`

The target checkout was clean at implementation kickoff. The Valu checkout is a
read-only design reference and is not an implementation dependency.

## Rollout seam

`ENABLE_SIGNED_IN_REDESIGN` selects the redesigned signed-in shell. The legacy
drawer shell remains available when the flag is false. Both shells use the same
Redux store, Sagas, channel handlers, active Asset/Card state, send modal,
deeplink processing, and security-sensitive utilities.

## Redesigned navigation

The normal signed-in tab order is fixed:

1. Wallet — `wallet-outline`
2. Services — `view-grid-outline`
3. Identity — `account-key-outline`
4. Settings — `cog-outline`
5. Scan — `line-scan`

Scan is a normal tab item. Personal Profile is not exposed by the redesigned
shell. Its routes and stored data remain untouched for recovery compatibility.
Convert is not a tab. Buy/Sell is not shown.

Root request-review routes remain outside the tabs:

- `DeepLink`
- `LoginRequestInfo`
- `InvoiceInfo`
- the existing routes nested below `DeepLinkStackScreens`

## Capability ownership

| Capability | Presentation owner | Behavioral authority |
| --- | --- | --- |
| Portfolio and assets | Redesigned Wallet | Existing coin, ledger, rate, widget, and subwallet state |
| Asset/Card detail | Redesigned asset surface | `CoinMenus`, Card compatibility, channel-keyed ledger data |
| Receive | Redesigned entry and chrome | Existing address, invoice, QR, share, PBaaS, and channel logic |
| Send or convert | Redesigned branch entry | Existing send modal, conversion/export/preconvert forms and disclosures |
| Services | Redesigned landing | Existing service enablement and account-scoped data |
| Gift Cards | Services presentation | Existing Gift Card, spendable-key, NFC, claim, and storage utilities |
| Identity | Redesigned VerusID destination | Existing linked VerusID service and identity/attestation state |
| Settings | Redesigned destination and Appearance | Existing settings persistence and legacy settings routes |
| Scan | Redesigned chrome | Existing VerusPay parser, camera, deeplink Redux/Saga, and root review routes |
| Address Book | New Services surface and recipient picker | Account-scoped local records with transfer-context validation |

## Invariants

- Active Asset and active Card are explicit before entering Asset actions.
- Card `api_channels`, `compatible_apps`, service activity, and channel-keyed
  ledger data continue to gate actions.
- Existing external route names and cold/warm deeplink handling do not change.
- Gift Card claim authority, password behavior, encrypted storage, QR/link/NFC,
  funding, redemption, and cancel-by-redemption behavior do not change.
- Balance privacy is applied before portfolio, Asset, and accessibility values
  are rendered.
- Missing fiat rates display as unavailable and never as a zero price.
- New signed-in copy comes from the shared signed-in copy catalog.
- New edge-aligned actions use safe-area-context and normal-flow footers.

## Verification gates

- Static old/new route inventory and parser/bundle checks
- Safe-area checker for every redesigned screen with bottom actions
- Spendable-key review checker
- iOS bundle and generic-request simulator build
- Light, Dark, and System shell checks outside manual Settings QA
- Wallet, Asset/Card, Receive, Send, supported testnet conversion, Services,
  Gift Cards, Address Book, Identity, Scan, and deeplink regression evidence
- Static Android platform review when an Android runtime is unavailable

