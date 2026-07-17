# Settings UI overhaul parity matrix

This is the working behavior contract for the Settings redesign. The visual
source of truth is MagicPath `Settings Variation 3 — Compact Light`
(`lucky-shore-3973`, component `428521533342892032`). MagicPath supplies the
layout and visual language; the current native implementation remains the
source of truth for behavior.

Status values:

- `traced`: current behavior and implementation seam identified.
- `implemented`: redesigned presentation is wired to the same behavior.
- `verified`: targeted static or simulator evidence collected.
- `device-only`: final proof requires physical hardware.

## Top-level and appearance

| Surface | Behavior contract | Current source | Status |
| --- | --- | --- | --- |
| Settings home | Navigate to Profile and security, Wallet settings, Appearance, and App information without changing route names or params. | `SignedInSettingsHome.js`, `MainStackScreens.js` | verified |
| Lock wallet | Use the existing blocking `SecureLoading` sign-out behavior used by the signed-in drawer. | `SideMenu.js` | verified |
| Appearance | Persist System, Light, or Dark immediately; System follows the device; update Paper, navigation, screen, and status-bar colors. | `Appearance.js`, `AppThemeProvider.js`, `navigationTheme.js` | verified |

## Profile and security

| Surface | Behavior contract | Current source | Status |
| --- | --- | --- | --- |
| Current profile | Show the active profile ID and logged-in state. | `ProfileSettings.js` | verified |
| Test Profile Information | Show only when testnet overrides are present; retain the no-value/reset warning. | `ProfileSettings.js` | verified |
| Recover Seed warning | Keep the security warning before authentication. | `AlertManager`, `ProfileSettings.js` | verified |
| Recover Seed authentication | Keep manual password validation and existing-biometric retrieval through `PasswordCheck`. | `PasswordCheck.js`, `ProfileSettings.js` | verified |
| Seed display types | Preserve Primary, Secondary (Z-Address), Ethereum/ERC20, and Wyre entries. | `DisplaySeed.js` | verified |
| Seed QR states | Preserve the QR length guard and QR rendering per selected seed/derived value. | `DisplaySeed.js` | verified |
| Derived-key states | Preserve VRSC/BTC primary derivation, ETH derivation, Z spending-key conversion, fetching state, errors, and Show Seed reversal. | `DisplaySeed.js` | verified |
| Seed navigation | Preserve Back/Done, Home, delete-profile continuation, and `completeOnBack`. | `DisplaySeed.js` | verified |
| Change Password validation | Require current/new/confirm, reject same current/new and mismatched confirmation. | `ResetPwd.js` | verified |
| Change Password confirmation | Preserve final non-cancelable confirmation and logout disclosure. | `ResetPwd.js` | verified |
| Change Password side effects | Re-encrypt with `resetPwd`, remove stored biometric password, disable profile biometry, then use blocking `SecureLoading` sign-out. | `ResetPwd.js` | verified |
| Biometric visibility | Show when the profile already uses biometry or runtime hardware reports support. | `ProfileSettings.js`, `keychain.js` | verified |
| Biometric setup/disable | Preserve password gate, native credential store/remove, Redux `setBiometry`, and success/error alerts. | `ProfileSettings.js`, `biometrics.js` | verified |
| Seed corruption warnings | Preserve conditional visibility and `setHideSeedWarnings` semantics. | `ProfileSettings.js` | verified |
| Key derivation version | Preserve Legacy/Latest selection, address-change warning, persistence, and forced blocking sign-out. | `ProfileSettings.js` | verified |
| NFC entry warning | Preserve Z-seed exclusion, unencrypted-card warning, and non-cancelable proceed choice. | `ProfileSettings.js` | verified |
| NFC password/precheck | Preserve password gate and exact valid 24-word primary BIP39 requirement. | `ProfileSettings.js`, `WalletBackupRequestInfo.js` | verified |
| NFC configuration | Preserve profile/custom backup password, optional encryption, KDF iterations, validation, and unencrypted confirmation. | `WalletBackupRequestInfo.js` | verified |
| NFC progress and outcomes | Preserve preparing/encrypting/scanning/writing status, cancel/back, unavailable/invalid-card paths, cache, completion, and failure behavior. | `WalletBackupRequestInfo.js`, `NfcBackup.js` | verified; physical NFC device-only |
| Z visibility/state | Preserve `ENABLE_DLIGHT` visibility and disabled “Z Seed Setup Complete” state when `DLIGHT_PRIVATE` is already active. | `ProfileSettings.js`, `enabledChannels.js` | verified |
| Z reuse primary | Offer reuse only when the primary seed is an exact valid 24-word mnemonic. | `ProfileSettings.js` | verified |
| Z create | Generate a new 24-word seed, reveal it in pages, and require random-word verification. | `ZSeedSetupFlow.js`, onboarding `SeedWords.js` | verified |
| Z import | Preserve import of a mnemonic or extended Z spending key, including QR scanner. `parseDlightSeed` intentionally continues to accept valid BIP39 phrases of at least 12 words; redesigned copy says this while the create path remains 24 words. | `ZSeedSetupFlow.js`, `SetupSeedModal/ImportSeed.js`, `keys.js` | verified |
| Z final persistence | Preserve final `PasswordCheck`, encrypted `DLIGHT_PRIVATE` persistence, errors, cancel/back, and restart-and-login-required success message. Do not claim immediate activation because `activeAccount.seeds` is not updated in memory. | `ProfileSettings.js`, `addEncryptedKey` | verified |
| Wyre | Preserve mainnet-only/feature-flag visibility, current enabled state, enable/disable confirmations, and disabled-service persistence. | `ProfileSettings.js` | verified |
| Delete Profile validation | Require password and irreversible acknowledgement. | `DeleteProfile.js` | verified |
| Delete Profile execution | Preserve final non-cancelable confirmation, optional biometric credential removal, destructive `SecureLoading` reset, delete action, sign-out/error behavior. | `DeleteProfile.js` | verified |

## Wallet settings

| Surface | Behavior contract | Current source | Status |
| --- | --- | --- | --- |
| General Settings dirty state | Initialize from Redux, keep local edits, enable Confirm after changes, validate before persistence, and preserve Back/loading/success/error behavior. | `GeneralWalletSettings.js` | verified |
| Max. Display TXs | Preserve number modal and inclusive 10–100 validation. | `GeneralWalletSettings.js` | verified |
| Universal Display Currency | Preserve supported-currency selection and display name metadata. | `GeneralWalletSettings.js` | verified |
| Automatic Drag Detection | Preserve local toggle and `homeCardDragDetection` persistence. | `GeneralWalletSettings.js` | verified |
| VerusPay slippage | Preserve first-enable risk explanation and preference. | `GeneralWalletSettings.js` | verified |
| QR-scanner toggle | Preserve `enableSendCoinCameraToggle` semantics used by Send. | `GeneralWalletSettings.js`, `SendCoin.js` | verified |
| Experimental deeplinks | Preserve `enableExperimentalGenericRequests` gate used by deeplink routing. | `GeneralWalletSettings.js`, `DeepLink.js` | verified |
| Wallet startup order | Do not expose or persist a default profile. Preserve legacy default fields only as an invisible first-ordering fallback until genuine per-network last-opened activity exists. | `accountNetwork.js`, `Login.js` | verified |
| Minimum ETH gas price | Preserve optional integer Gwei override and default display. | `GeneralWalletSettings.js` | verified |
| Address blocklist type | Preserve source/manual selection and current persistence schema. | `AddressBlocklist.js` | verified |
| Address blocklist source | Preserve custom source URL editing and default URL fallback. | `AddressBlocklist.js`, `AddressBlocklist.render.js` | verified |
| Address blocklist entries | Preserve add/edit/remove actions, last-modified metadata, and persistence consumed by send blocking. | `AddressBlocklist.js`, `addressBlocklist.js` | verified |
| Custom RPC list | Preserve default/custom system rows, endpoint values, and descriptions. | `VrpcOverrides.js`, `VrpcOverrides.render.js` | verified |
| Custom RPC mutations | Preserve add/edit/reset actions, URL validation, loading, `getInfo` chain match, duplicates, errors, trust warning, and restart messaging. | `VrpcOverrides.js` | verified |
| Clear Cache | Preserve confirmation and blocking `SecureLoading` reset contract. | `WalletSettings.js`, cache actions | verified |
| Keychain encryption | Preserve confirmation copy and blocking encrypt/decrypt-all-storage migration. | `WalletSettings.js`, `secureStore.js` | verified |
| Dynamic Electrum rows | Preserve filtering by active coin `compatible_channels` and route data/title params. | `WalletSettings.js` | verified |
| Transaction verification | Preserve Low/Mid/High values, verification lock, descriptions, persistence, loading, and errors. | `CoinSettings.js` | verified |

## App information

| Surface | Behavior contract | Current source | Status |
| --- | --- | --- | --- |
| Build information | Preserve app version, platform, and platform version values. | `AppInfo.js`, `env/index` | verified |
| Privacy | Preserve `https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt` through `openUrl`. | `AppInfo.js` | verified |
| Licence | Preserve `https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE` through `openUrl`. | `AppInfo.js` | verified |
| Discord | Preserve `https://www.verus.io/discord` through `openUrl`. | `AppInfo.js` | verified |
| Reddit | Preserve `https://www.reddit.com/r/VerusCoin/` through `openUrl`. | `AppInfo.js` | verified |
| GitHub | Preserve `https://github.com/VerusCoin/` through `openUrl`. | `AppInfo.js` | verified |

## Evidence ledger

| Evidence | Result |
| --- | --- |
| Branch/base | `codex/settings-ui-overhaul` at `9d50e0e7` |
| MagicPath auth/project/component listing | authenticated; exact variation resolved without ambiguity |
| MagicPath preview | `/tmp/verus-settings-variation-3.png` |
| MagicPath read-only source context | `/tmp/verus-settings-magicpath-context` |
| Visual evidence | `/Users/maxtheyse/.codex/visualizations/2026/07/16/019f6c9e-e883-7093-bd2b-c5d69bebbaa5/settings-ui-overhaul/` |
| Simulator, light | Passed on `Settings UI QA Large`: Settings home, Profile and security, Recover Seed warning/password gate, Change Password, NFC warning/password gate, Delete Profile, Wallet settings, General, Blocklist, RPC, Electrum verification, Appearance, and App information. |
| Simulator, dark | Passed on `Settings UI QA Large`: Appearance changed immediately to Dark, status bar/navigation/surfaces updated, Settings home and App information inspected, then preference restored to System. |
| Simulator, iPhone SE | Passed on `Settings UI QA SE`: signed-in Settings home, long Profile and security surface, conditional Z-complete state, Recover Seed warning and empty password gate. Profile-login keyboard layout also inspected. |
| Static checks | Babel parse passed for all 23 modified/new JS files; `node scripts/check-safe-area.js --changed` passed for 21 modified files and the explicit two-file pass covered both new files; production iOS bundle passed (41 assets); `git diff --check` passed; focused Jest passed 8 suites/43 tests; Debug iOS simulator build passed. |
| Independent reviews | Visual parity, functionality/security, and maintainability reviews completed; high-signal findings were resolved before final verification. |
| Physical NFC | Device-only. Warning, password gate, exact-24-word precheck, configuration/progress/error state machine, and tests were verified; no card scan/write was attempted. |
| Physical biometric hardware | Device-only. Runtime visibility and native credential branches were reviewed and focused biometric/keychain tests passed; no physical Face ID/Touch ID enrollment was exercised. |
