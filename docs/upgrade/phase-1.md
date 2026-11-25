# Phase 1: New Architecture at React Native 0.77.3

Phase 1 turns on the New Architecture (Fabric, TurboModules, bridgeless) with no React Native version change.
The reference is [baseline.md](baseline.md). A defect listed there is not a phase 1 defect.

## What changed

Branch `claude/rn-upgrade`:

| Commit | Change |
|---|---|
| `564114b6` | `newArchEnabled=true` (Android). `RCT_NEW_ARCH_ENABLED=1` and `fabric_enabled => true` (iOS Podfile). `ios/Podfile.lock` from `pod install`. `AGENTS.md` stack line. |
| `5d58afc0` | The S02 probe reads one method of each module (bridgeless interop modules have no enumerable keys). |
| `d4192233` | Fix P1-1 (below): `collapsable={false}` on 13 text-input containers in 12 files. JS only. |
| `ad6a9b41` | Fix P1-2 (below): `MainApplication.getReactHost()` for bridgeless Android. |

No native module was changed, bumped or replaced. The only native source change is `MainApplication.java`
(P1-2). The iOS build needed no source change (same workarounds as baseline: `LANG=en_US.UTF-8` for
`pod install`, B4 `main.jsbundle`).

## Profile migration (most important check)

| ID | iOS | Android |
|---|---|---|
| M1 | PASS. `simctl install` over the baseline app. `ValuBaseIOS` and `ValuImportIOS` are listed. | PASS (after P1-2 fix). `install -r` with the baseline keystore. Both baseline profiles listed. |
| M2 | PASS. Password unlock, same address `RCSWMu…2sYaA`, balance 0.4899. | PASS. Password unlock, address `RMSZ4…tPj9bW`, balance 0.5. |
| M3 | PASS. Face ID unlock (Face ID was on at baseline) opens Home. | N/A. Biometric was off on the baseline profile (emulator keystore is `SECURE_SOFTWARE`). |
| M4 | PASS. The baseline profile signed and sent 0.01 VRSCTEST by the invoice path. txid `23d2d775f7b0ef5d3dbc8c9fcb182c17befe4aceb36a74bcfac29aab39d1b984`; the daemon received it. | PASS. Invoice path, 0.01 VRSCTEST. txid `c3fc4b6c44162732fef8622e96e6adf4ea3173a8d4c819eaae781432ea6fb999`; the daemon received it. |

## Native modules

iOS probe (S02) with the New Architecture: `bridgeless=true fabric=true`. Each module is reached through the
legacy-module interop layer. None is a native TurboModule.

| Module | Use | iOS | Android |
|---|---|---|---|
| `RNKeychainManager` (react-native-keychain) | keys, password, biometrics | Works through interop (S18-S22, M2, M3) | Works through interop (S18-S22, M2) |
| `VerusLightClient` (react-native-verus) | shielded (Z) wallet, light-client sync, data encryption | Loads through interop; `start` is callable. Two interop warnings, see below. The smoke checks do not reach a shielded flow. | **Broken: MISSING (P1-3, open)** |
| `TcpSockets`, `UdpSockets` | electrum / network | Work through interop (balance and send) | Work through interop (balance and send) |
| `RNRandomBytes` | seed entropy | Works through interop (S06 new seed) | Works through interop (S06) |
| `NfcManager` | NFC backup import | Works through interop (S24 "not supported" on the simulator, as baseline) | Works through interop (S24) |
| `CameraView`, `CameraDevices` (vision-camera) | scanner | Works through interop (S11, as baseline) | Works through interop (S11 live frame) |
| `RNIapIos` / `RNIapModule` (react-native-iap) | Proof of Personhood purchase | Present with callable methods. Purchase flow not reachable (S25 N/A, as baseline). | Present with callable methods (`RNIapModule`) |
| `VerusBiometricEnrollment` (app, Android) | biometric enrollment check | — | Works through interop (S18, S21) |
| `VerusKeepAwake` (app) | keep screen on | Missing, same as baseline (B3) | Present with callable methods |

Interop warnings on iOS: "The objective-c `shieldFunds:…` / `deriveUnifiedSpendingKey:…` method signature
cannot be found" for `VerusLightClient`. Cause: `node_modules/react-native-verus/ios/VerusLightClient.m` declares
these two methods with `RCT_EXTERN_METHOD`, but the Swift class has no `@objc` method for them
(`shieldFunds` is commented out, `deriveUnifiedSpendingKey` is private). No app code calls them. This is dead code
in the module. The legacy bridge did not check it; the interop layer does. No action in phase 1.

## Defects found and fixed in phase 1

**P1-2: Android crashes on start (bridgeless).** With `newArchEnabled=true`, RN 0.77 starts Android in
bridgeless mode and asks the `Application` for a `ReactHost`. `MainApplication` had only a `ReactNativeHost`, so
`MainActivity` crashed on every launch with a null pointer in `ReactHost.createSurface` (first Android run, M1).
The installed baseline data was not touched. Fix (`ad6a9b41`): `getReactHost()` returns
`DefaultReactHost.getDefaultReactHost(getApplicationContext(), getReactNativeHost())`, as in the RN 0.77
template.

**P1-1: text fields lose focus at once (iOS, Fabric).** On the profile name screen a tap on the field showed no
keyboard, and a `focus()` call from JS did nothing. The seed-verify words had the same problem on some taps.
Cause, from the native view tree and a breakpoint on `resignFirstResponder`: the field's focus handler sets a
focused style with `shadowColor` on the container `View`. On Fabric a meaningful `shadowColor` makes the view a
stacking context (`ViewShadowNode::initialize`), so Fabric moves the `TextInput` into a new native parent. The
move unmounts the `UITextField`, and UIKit drops first responder. `Unlock.js` worked because its container always
has a `transform`.
Fix (`d4192233`): `collapsable={false}` on each container that gets a focused style. The container is then a
stacking context in both states, so the input does not move. The rendered UI does not change.
Checked on iOS: profile name (`P1-1-name-focus-fixed.png`) and import seed words take focus and text on the first
tap. The other 11 sites have the same structure and were not opened one by one.

## Open defect (needs a decision)

**P1-3: `VerusLightClient` is missing on Android under bridgeless.** The S02 probe on Android reports
`MISSING verus VerusLightClient`. The JS lookup throws
`TurboModuleInteropUtils$ParsingException … VerusLightClient.initialize(). Unsupported return class
kotlinx.coroutines.Job`. In `react-native-verus` 0.6.10,
`android/src/main/java/com/verusmobile/veruslightclient/VerusLightClientModule.kt` declares `initialize(...)`
with an expression body, `) = moduleScope.launch { … }`, so its return type is `Job`. The interop layer parses
every `@ReactMethod` when the module loads and rejects the whole module when one return type is not supported.
The other 22 methods return `Unit` (`getLatestNetworkHeight` uses `promise.wrap`, which returns `Unit`).
Effect on Android: every call to the module fails. This covers the light-client (`dlight`) channel (private
balance, private transactions, shielded send), shielded address derivation, and identity-data encryption
(`src/utils/crypto/encryptCredentials.js`). Transparent VRSCTEST balance, send and signing do not use it and work.
iOS is not affected: the module loads and `start` is callable.
Proposed fix (not applied, because this module handles keys and funds): change `initialize` to a block body,
`) { moduleScope.launch { … } }`, so it returns `Unit`. This changes no behaviour. It can go in the existing
`patches/react-native-verus+0.6.10.patch` or in the `react-native-verus` repository.

## iOS smoke results (New Architecture)

Simulator "Valu Upgrade QA", iPhone 17 Pro, iOS 26.5, same simulator and data as baseline. New profiles:
`ValuP1IOS` (created, biometric on) and `ValuP1ImportIOS` (imported from the same seed). Screenshots:
`~/.cache/valu-wallet-upgrade/phase1/ios/`.

| ID | Result | Notes |
|---|---|---|
| S01 | Not run on a fresh install | The app starts to the unlock screen with no red box. A fresh install would delete the baseline profiles, which later migration checks need. |
| S02 | PASS | See Native modules. `S02-probe-final.txt`. |
| S03 | PASS after fix P1-1 | Before the fix, the name field did not keep focus. |
| S04, S05 | PASS | |
| S06 | PASS after fix P1-1 | Seed verify needed several taps per field before the fix. |
| S07-S11 | PASS | Same as baseline. |
| S12 | PASS | Address `RX3Rm…yExaP`, the daemon validates it. |
| S13 | PASS | Funded balance 0.4899 shows on the migrated profile. |
| S14 | FAIL (B5) | Same red box as baseline. |
| S15 | PASS (invoice path) | See M4. |
| S16 | PASS | |
| S17 | PASS | |
| S18 | PASS | Enabled at profile creation; profile settings show "Disable Biometric Authentication". |
| S19-S21 | PASS | |
| S22 | PASS | Relaunch; profile listed; Face ID auto-unlock. |
| S23 | PASS | "Import 24-word seed" gives the same address `RX3Rm…yExaP`. |
| S24 | PASS | "NFC is not supported on this device" plus the dev console-error overlay, as baseline. |
| S25 | N/A | Same as baseline. |
| S26 | PASS with known errors | Same known errors as baseline, plus the two interop warnings above. No TurboModule or Invariant Violation error. `logs/js-console-phase1-ios.log`. |

## Android smoke results (New Architecture)

Game PC, slot s2, `QA2_Pixel_9_API_36` (Pixel 9, Android 16), build `ad6a9b41`, same debug keystore as baseline.
New profiles: `QA Phase1 Three` (created) and `QA Import Four` (imported from the same seed). Screenshots and
logs stay on the PC: `%USERPROFILE%\.cache\valu-wallet-upgrade\phase1\android\`.

| ID | Result | Notes |
|---|---|---|
| S01 | PASS | Run last, after uninstall and reinstall: "Get started" shows. This removed the baseline profiles from the emulator. |
| S02 | FAIL (P1-3) | All modules present except `VerusLightClient`. `RNIapIos` missing (iOS only, expected). |
| S03-S06 | PASS | All text fields take focus and text on the first tap. |
| S07-S10 | PASS | |
| S11 | PASS | Live camera frame (permission was already granted). |
| S12 | PASS | |
| S13 | PASS | Funded baseline profile shows 0.5. |
| S14 | FAIL (B5) | Same red box as baseline. |
| S15 | PASS | See M4. |
| S16 | PASS | |
| S17 | PASS | |
| S18 | PASS | With a local, reverted `BIOMETRIC_SECURITY_THRESHOLD: SECURE_SOFTWARE` change (baseline: BLOCKED). |
| S19, S20 | PASS | |
| S21 | PASS | Fingerprint unlock, same local change as S18. |
| S22 | PASS | |
| S23 | PASS | Same address as the created profile. |
| S24 | PASS | "NFC is not supported on this device." |
| S25 | N/A | |
| S26 | PASS with known errors | No crash, no Invariant Violation, no TurboModule error in logcat. New: the P1-3 parse error, and one more "key prop spread into JSX" warning from the tab bar `CellRenderer`. |

Text-field focus on Android: all fields used (profile name, passwords, seed-verify words, 24 import words,
address-book name and address) take focus on the first tap.

## Jest

`corepack pnpm test --ci` with the New Architecture flags (before `d4192233`):

| | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Suites | 196 | 165 | 29 | 2 |
| Tests | 2751 | 2556 | 127 | 68 |

The same 29 suites fail as at baseline. The only change is `coinpaprika` (live network): 90 failed tests instead
of 66. After `d4192233`, the tests related to the 12 changed files give the same result as baseline
(6 suites fail, all in the baseline list, with the same counts). Jest does not run native code, so the
architecture flags cannot change its result. Raw results: `~/.cache/valu-wallet-upgrade/logs/jest-phase1.json`.

## Lint

Same as baseline: ESLint does not run (B1).
