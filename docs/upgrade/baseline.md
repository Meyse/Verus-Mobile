# Baseline (phase 0): React Native 0.77.3, legacy architecture

This is the reference for the upgrade. A defect listed here exists before the upgrade. It is not an upgrade defect.

## What was tested

- App code: `main` at `cbed3c66` (upstream `77cb5978` "update name" merged). The device builds ran from
  `claude/rn-upgrade` at `a00a5480`, which differs from `cbed3c66` only in `AGENTS.md`, `.gitignore`,
  `docs/upgrade/` and `scripts/upgrade/`.
- iOS bundle id: `com.arkeytyp.valumobile.app`. Android application id: `com.valumobile`.
- JS app name: `valumobile` in `app.json`, `AppDelegate.mm` and `MainActivity.getMainComponentName()` (they agree).
- Architecture: legacy (`newArchEnabled=false`, `RCT_NEW_ARCH_ENABLED=0`, `fabric_enabled => false`).
  The S02 probe reports `bridgeless=false fabric=false turboModuleProxy=false` on iOS.
- Toolchain (Mac): Xcode 27.2 (27B52), macOS 26.7.1, Node 22.23.2, pnpm 12.6.0, CocoaPods 1.16.2.
- Checklist: [smoke-checklist.md](smoke-checklist.md).
- Screenshots and logs (outside git): `~/.cache/valu-wallet-upgrade/baseline/ios/`,
  `~/.cache/valu-wallet-upgrade/logs/`. Android screenshots stay on the Game PC (path in the Android section).

## Build

| Platform | Result | Notes |
|---|---|---|
| iOS Debug, simulator | Builds with Xcode 27.2 | Needs `LANG=en_US.UTF-8` for `pod install` (CocoaPods fails on an ASCII locale). Needs an `ios/main.jsbundle` file to exist (see B4). No source change needed for Xcode 27.2. |
| Android Debug | See the Android section | Built on the Game PC. |

## iOS results

Simulator "Valu Upgrade QA", iPhone 17 Pro, iOS 26.5, slim. Profiles: `ValuBaseIOS` (created, S03-S06) and
`ValuImportIOS` (imported from the same seed, S23). Wallet names and addresses are in the local file
`docs/upgrade/qa-wallets.local.md`.

| ID | Result | Notes | Screenshot |
|---|---|---|---|
| S01 | PASS | Welcome screen. Yellow box with require-cycle warnings only. | `S01-start.png` |
| S02 | PASS | All modules present: RNKeychainManager 13, VerusLightClient 28, TcpSockets 8, UdpSockets 8, RNRandomBytes 3, RNOS 3, NfcManager 44, CameraView 16, CameraDevices 5, RNIapIos 17. `VerusKeepAwake` MISSING (B3). | `S02-probe.txt` |
| S03 | PASS | | — |
| S04 | PASS | | `S04-password.png` |
| S05 | PASS | "Testnet profile set". | `S05-testnet.png` |
| S06 | PASS | 24-word seed, verify 3 words, "Profile created!", Home opens. | `S06-created-unlock.png` |
| S07 | PASS | Verus Testnet 0.0000 VRSCTEST and 4 other testnet assets. | `S07-home.png` |
| S08 | PASS | | `S08-services.png` |
| S09 | PASS | | `S09-identity.png` |
| S10 | PASS | | `S10-settings.png` |
| S11 | PASS | Camera permission prompt, then "No camera hardware detected" (simulator). | `S11-scan.png` |
| S12 | PASS | Address and QR shown. Address copied and validated by the daemon. | `S12-receive.png` |
| S13 | PASS | 0.5 VRSCTEST from the daemon shows on Home. | `S13-funded-home.png` |
| S14 | FAIL (B5) | "Send / convert" from the coin screen and from Transfer both show a red box and then a blank app. The Confirm screen was reached through the S16 invoice instead (0.01 VRSCTEST, fee 0.0001). | `S14-redbox-selecttarget.png`, `S14-confirm-invoice-path.png` |
| S15 | PASS (invoice path) | Sent 0.01 VRSCTEST by paying the S16 invoice. txid `61d130ddcd9ca8311e893e30b22503ba06ed02bc309118c3e61ef8401deecece`; the daemon sees it. Balance after: 0.4899. | `S15-result.png` |
| S16 | PASS | iOS asks "Open in Valu Wallet?", then the VerusPay invoice shows 0.01 VRSCTEST to the daemon address. | `S16-deeplink.png` |
| S17 | PASS | Profile settings and Wallet settings open and go back. | `S17-profile-security.png`, `S17-wallet-settings.png` |
| S18 | PASS | "Face ID authentication enabled". | `S18-biometric-enabled.png` |
| S19 | PASS | Unlock screen lists the profile with "Unlock with Face ID". See B6 for a failure when a Services screen is open. | `S19-locked.png` |
| S20 | PASS | Same balance (0.5 at that time). | `S20-unlocked-password.png` |
| S21 | PASS | "Unlock with Face ID" opens Home. The simulator showed no Face ID sheet. | `S21-unlocked-faceid.png` |
| S22 | PASS | Relaunch, profile listed, password unlock, same balance. | `S22-relaunch-unlocked.png` |
| S23 | PASS | Import by "Enter key/seed": same address `RCSWMu…2sYaA`, balance 0.4899. | `S23-imported-home.png` |
| S24 | PASS | "Import using NFC" → "Scan NFC backup" → "NFC is not supported on this device." (plus a dev console-error overlay). | `S24-nfc-scan.png` |
| S25 | N/A | The Proof of Personhood purchase step comes after VerusID registration. The IAP module is present (S02). | `S25-pop.png` |
| S26 | PASS with known errors | JS errors seen: B5, B6, "No Verus bridge delegator for network sepolia", "NFC is not supported", 2 React key warnings. No native-module or TurboModule error. | `logs/js-console-baseline-ios.log` |

State left for the migration check: both profiles exist, `ValuBaseIOS` is preselected on the unlock screen with
Face ID on, balance 0.4899 VRSCTEST. The simulator is shut down with its data.

## Android results

Game PC (Windows), task `rn-upgrade-v7k2`, slot s2, emulator `QA2_Pixel_9_API_36` (Pixel 9, Android 16).
Same code as iOS. Profiles: `QA Baseline One` (created, S03-S06, biometric off) and `QA Import Two` (imported
from the same seed, S23). Names and addresses are in the local file `docs/upgrade/qa-wallets.local.md`.
Screenshots stay on the PC: `%USERPROFILE%\.cache\valu-wallet-upgrade\baseline\android\`.

Build notes:

- The pnpm scripts need Git Bash as the script shell on Windows.
- `android/keystores/debug.keystore` is git-ignored and missing from a fresh clone, and the README does not say
  how to make it. The PC generated one with `keytool` and keeps a copy at
  `%USERPROFILE%\.cache\valu-wallet-upgrade\debug.keystore`. Later builds must use this copy, so that
  `install -r` keeps the app data.

| ID | Result | Notes |
|---|---|---|
| S01 | PASS | Welcome screen. |
| S02 | PASS | All modules present, including `RNIapModule` 15, `VerusBiometricEnrollment` 5 and `VerusKeepAwake` 3. `RNIapIos` missing (iOS only, expected). |
| S03-S12 | PASS | |
| S13 | N/A | Not funded during the run. The Mac funded the address with 0.5 VRSCTEST afterwards for the migration check (txid `ce52a4a2b08f6474ca5bb9461925425c6e109c25b39c11e714640304279c22dc`). |
| S14 | FAIL (B5) | Same red box as iOS. |
| S15 | N/A | No funds during the run. |
| S16 | PASS | |
| S17 | PASS | |
| S18 | BLOCKED | The emulator keystore is `SECURE_SOFTWARE`. `env/main.android.json` sets `BIOMETRIC_SECURITY_THRESHOLD: SECURE_HARDWARE`, so the app does not offer biometrics. Not a defect. |
| S19, S20 | PASS | |
| S21 | BLOCKED | Same reason as S18. |
| S22-S24 | PASS | |
| S25 | N/A | Same reason as iOS. |
| S26 | PASS with known errors | Same known errors as iOS. |

Cosmetic, seen on Android only: the test-tube (testnet) button and the "VerusPay invoice" title sit under the
status bar.

## Jest

`corepack pnpm test --ci` (30 minute limit), 62 s:

| | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Suites | 196 | 165 | 29 | 2 |
| Tests | 2751 | 2580 | 103 | 68 |

Failing suites at baseline (failed tests in brackets):

- Unit, fail on assertions: `giftCard` (1), `biometricMigration` (5), `keychain` (8), `dataRequestValidators` (2),
  `CoinData` (3), `profileCreationSubmission` (2), `deeplinkCloseState` (1), `authDataStorage` (2).
- Unit, fail to run: `genericRequestCompletionLifecycle` (`fqnToAddress` is not a function),
  `genericResponseNetwork` (reading `Mixin` of undefined), `homeSessionTransitions` (reading `select`),
  `electrumPost` (reading `request`), `androidBiometricPromptPolicy` (reads the old path
  `android/.../com/verusmobile/VerusBiometricEnrollmentModule.java`), `overviewRefresh` (reading `get`),
  `startupRecovery` (cannot find `./TwentyFourWordIcon`).
- Live network (`src/utils/__tests__/int`, `api`): `getUnspent`, `getMerkle`, `getTransactions`, `getTransaction`,
  `getBlockInfo` (fail to run), `getBalances` (1), `getServerVersion` (1), `getBlockHeight` (1),
  `getCompositeBalances` (3), `getCompositeTransactions` (3), `getCompositeInfo` (2), `getCompositeFiatPrices` (1),
  `dlight/initialization` (1), `coinpaprika` (66).

Raw results: `~/.cache/valu-wallet-upgrade/logs/jest-baseline.json`.

## Lint

`corepack pnpm lint` does not run at baseline (B1). There are no lint totals.

## Defects found at baseline

| ID | Defect | Evidence |
|---|---|---|
| B1 | ESLint crashes before it lints: `Failed to load plugin 'import' … Package subpath './lib/util/glob-util' is not defined by "exports" in node_modules/eslint/package.json`. `eslint-plugin-import` 2.20.2 does not work with `eslint` 8.19.0. | `logs/lint-baseline.log` |
| B2 | The committed `ios/Podfile.lock` did not list `react-native-video`, `RNIap` and `RNInAppBrowser`. `pod install` adds them. Fixed in commit `a0323091` (lockfile only). | `logs/pod-install-baseline.log` |
| B3 | `ios/verusMobile.xcodeproj/project.pbxproj` lists `VerusKeepAwake.h/.m` in the group by IDs `4EAA0002…`/`4EAA0003…` that have no file reference, and build file `4EAA0001…` has no `fileRef`. The module is not compiled on iOS, so `NativeModules.VerusKeepAwake` is missing (S02). `pod install` drops the broken IDs. | S02 probe |
| B4 | The Xcode target copies `ios/main.jsbundle` in every configuration. A clean Debug build fails with "The file “main.jsbundle” couldn’t be opened" until that file exists (`touch ios/main.jsbundle` or `pnpm bundle-ios`; the file is git-ignored). | `logs/ios-build-baseline.log` (first attempt) |
| B5 | Send / convert shows a red box "Render Error: Property 'e' doesn't exist" at `SendWizardSelectTarget.js:274`, then a blank app. Cause: the bridge-fee fetch throws "No Verus bridge delegator for network sepolia" for the testnet profile, and the `catch (e)` value is read later inside the `setBridgeFeeInfo` updater callback, which Hermes does not resolve. Kill and relaunch is the only way out. | `S14-redbox-selecttarget.png` |
| B6 | "Lock profile" while Services → Proof of Personhood is in the navigation stack shows a red box "TypeError: Cannot read property 'seeds' of null" in `<Service />`, and the sign-out does not finish (Home stays unlocked). | `S19-redbox-lock-with-service-open.png` |
| B7 | 29 Jest suites fail at baseline (list above). | `logs/jest-baseline.json` |
