# Phase 4: React Native 0.81.6 to 0.88.1

Phase 4 moves React Native from 0.81.6 to 0.88.1 and React from 19.1.4 to 19.3.1, with the library versions that
0.88 needs. The app keeps the New Architecture (bridgeless, Fabric), Hermes, the JS stack and the JS bottom tabs.
There is no intended UI or behaviour change. The references are [phase-3.md](phase-3.md) and
[smoke-checklist.md](smoke-checklist.md).

## Commits

Branch `claude/rn-upgrade`, on top of `0d6ff881` (phase 3):

| Commit | Change |
|---|---|
| `46fd2b73` | Compile patches for the prebuilt iOS core: `react-native-os` (namespaced `RCTAssert.h`) and `react-native-image-picker` 5.7.0 (podspec, `@import`). |
| `89271440` | Version upgrade, Gradle 9 / AGP 9 / Kotlin 2.2 / SDK 37, 0.88 `MainApplication`, `pod install` for the prebuilt core. |
| `7e50e3e3` | Replace the APIs that 0.85–0.87 removed (`absoluteFillObject`, `StatusBar` `translucent` / `backgroundColor`). |
| `334809b2` | Android Gradle 9 configuration: `proguard-android-optimize.txt` in the `react-native-os` and `react-native-tcp` patches (AGP 9 rejects `proguard-android.txt`; both build with `minifyEnabled false`), AsyncStorage KSP 2.2.10-2.0.2 for Kotlin Gradle plugin 2.2.10. |
| `dfd82364` | `ksp.useKSP2=false`: AsyncStorage's Room 2.4.2 compiler fails under KSP2. |
| `7196331a` | Paper 5.15 `TextInput` red box on the MD2 theme (P4-2): theme in `src/globals/paperTheme.js`, with a test. |
| `77c6c9bc` | iOS warm-start links (P4-1): `SceneDelegate` uses the `RCTLinkingManager` scene methods. |
| `3422f152`, `9931e56b`, `5828fccb`, `de5b8e28`, `5deba266` | Review fixes (see "Review"). |
| (this commit) | `phase-4.md`, `summary.md`. |

## Versions

| Package | Phase 3 | Phase 4 |
|---|---|---|
| `react-native` | 0.81.6 | 0.88.1 |
| `react`, `react-test-renderer` | 19.1.4 | 19.3.1 |
| `@react-native/babel-preset`, `metro-config`, `eslint-config` | 0.81.6 | 0.88.1 |
| `@react-native/jest-preset` | — | 0.88.1 (the Jest preset moved out of `react-native` in 0.85) |
| `@react-native-community/cli` (+ platform-ios, platform-android) | 20.0.0 | 20.2.0 |
| `react-native-reanimated` | 3.19.5 | 4.8.0 |
| `react-native-worklets` | — | 0.14.0 (Babel plugin `react-native-worklets/plugin`) |
| `react-native-gesture-handler` | 2.28.0 | 2.33.1 (newest 2.x; 3.x not needed) |
| `react-native-screens` | 4.24.0 | 4.30.1 |
| `react-native-safe-area-context` | 5.6.2 | 5.11.1 |
| `react-native-paper` | 5.12.5 | 5.15.5 |
| `react-native-svg` | 15.12.1 | 15.16.1 |
| `lottie-react-native` (iOS pod `lottie-ios`) | 7.2.4 (4.5.0) | 7.5.1 (4.6.0) |
| Key, credential and purchase modules: `react-native-keychain` 8.1.3, `react-native-verus` 0.6.10, `react-native-randombytes` 3.6.1, `react-native-tcp` 4.0.0 (VerusCoin fork), `react-native-udp` 4.1.5, `react-native-iap` 12.15.5 | unchanged | unchanged |

Toolchain:

| | Phase 3 | Phase 4 |
|---|---|---|
| iOS | Xcode 27.2, React Native core built from source | Xcode 27.2, prebuilt React Native core (`React-Core-prebuilt`, `ReactNativeDependencies`, `hermesvm`) |
| Android Gradle / AGP / Kotlin | 8.14.3 / 8.11.0 / 2.1.20 | 9.4.1 / 9.2.1 / 2.2.0 |
| compileSdk / targetSdk / buildTools / NDK | 36 / 36 / — / 27.0.12077973 | 37 / 36 / 37.0.0 / 27.1.12297006 |
| Node | 22 (`^20.19.4` allowed) | 22 (0.88 needs `^22.13`, `^24.3` or `>=26`) |

## Decisions

- **0.88.1, not 0.87.1.** No blocking defect was found in a library at 0.88.1. 0.88 also adds the UIScene lifecycle
  support that iOS 27 apps built with Xcode 27 need; 0.87.x does not have it. (The app already has its own
  `SceneDelegate` since phase 1.)
- **gesture-handler 2.33.1.** It supports React Native 0.84 and newer. The app uses the gesture-handler API only
  through React Navigation and Paper, so 3.x was not needed.
- **Key and funds modules keep their versions.** None needed a code patch in this phase. `react-native-tcp` got
  one build-configuration change (`334809b2`: `proguard-android-optimize.txt`, because AGP 9 rejects
  `proguard-android.txt`; the library builds with `minifyEnabled false`, so the file is not used).
  `react-native-iap`, `react-native-tcp`, `react-native-randombytes` and `react-native-verus` keep their phase 1–2
  patches.
- **`react-native-image-picker` on iOS builds its legacy module.** Its 5.7.0 New Architecture podspec does not
  build against the prebuilt core, and its TurboModule path does not compile (`.m` files include the C++ spec
  header). The patched podspec depends on `React-Core` only; the module runs through the interop layer. Android
  builds its TurboModule as before. A later image-picker major (7.x or 8.x) would remove the patch; that is a
  version change and was not made.
- **`semver` pin.** The workspace forced every `semver` to 6.3.1 (a ReDoS fix). Reanimated 4 and React Native need
  semver 7. The pin is now `semver@<7`; the installed 7.x (7.8.6) has the same fix.
- **Prebuilt iOS core.** 0.88 installs the core as prebuilt frameworks by default. The explicit `glog` pod (from
  the 0.61 upgrade) conflicts with the prebuilt facade and is removed. `pod install` also drops the broken
  `VerusKeepAwake` IDs from the Xcode project (B3: the module was never compiled on iOS).
- **AsyncStorage keeps Room 2.4.2 (KSP1).** The app stores its profiles in AsyncStorage's Room database
  (`AsyncStorage_useNextStorage=true`). KSP 2.x runs KSP2 by default, and the Room 2.4.2 compiler fails under KSP2
  ("unexpected jvm signature V"). Phase 3 used KSP 1.0.32 (KSP1). `ksp.useKSP2=false` keeps KSP1, so the Room
  version and the generated database code do not change. A newer Room (2.7 or later supports KSP2) would remove
  this setting, but it changes the storage library, so it was not made here. KSP1 is deprecated and goes away in a
  later KSP release: an open item.
- **`edgeToEdgeEnabled` stays `false`.** The 0.88 template sets it to `true`. On Android 15 and 16 the app is
  edge-to-edge anyway (targetSdk 36). Turning it on would also make the navigation bar transparent on Android 14
  and older, which is a UI change.

## APIs removed in 0.82–0.87

| API | Removed in | Use in the app | Replacement |
|---|---|---|---|
| `InteractionManager` | 0.87 | none | — |
| `StatusBar` `backgroundColor` / `translucent` | 0.87 | `App.js` (Android: transparent, translucent status bar) | `MainActivity.keepTranslucentStatusBar()` applies the same window settings when edge-to-edge is off (Android 14 and older). `barStyle` stays in JS. |
| `Modal` `animated` | 0.87 | none (all `Modal`s use `animationType`) | — |
| Deep imports from `react-native/Libraries/*` | 0.87 (types; blocked in the strict API) | none in app code | — (the font-scaling patch edits `Libraries/Text/Text.js` and `Libraries/Components/TextInput/TextInput.js` inside `node_modules`, which is allowed) |
| Bare React header includes on iOS (`"RCTAssert.h"`) | 0.87 | `react-native-os` | `<React/RCTAssert.h>` (patch) |
| `SafeAreaView` from core | not removed in 0.88.1 (deprecated, warning only) | 83 files | Kept. See "SafeAreaView" below. |
| `StyleSheet.absoluteFillObject` | 0.85 | 5 Home widgets | `StyleSheet.absoluteFill` (the same plain object) |
| Boolean `keyboardShouldPersistTaps` | 0.87 | none | — |
| Reanimated 3 `useAnimatedGestureHandler`, `runOnJS` | Reanimated 4 | only `src/components/DragSort/*`, which no screen imports (dead code; only `dragSortLifecycle.unit.test.js` uses it, with a mock) | Not changed. A future use of `DragSort` needs the Gesture API and `scheduleOnRN`. |
| Legacy architecture, `ReactNativeHost` | 0.82 | `MainApplication.java` | `DefaultReactHost.getDefaultReactHost(context, packageList, …)` as in the 0.88 template |

### SafeAreaView

The core `SafeAreaView` and the `react-native-safe-area-context` one are not the same:

- Core (iOS): the padding is the view's own overlap with the unsafe area. A screen under a stack header gets no
  top padding. Style padding is replaced.
- `react-native-safe-area-context`: the padding is the provider's (screen) insets on the chosen edges, added to the
  style padding.
- Core (Android): a plain `View`.

A direct swap adds about 62 pt above every iOS screen under a header and adds padding on Android. Each of the 83
screens needs its own `edges` choice, which is a UI change outside this upgrade. 0.88.1 still exports the core
component (it logs a deprecation warning in development). This is an open item.

## Native module status at 0.88.1

"Native" means the module ships New Architecture code (a codegen TurboModule or Fabric component). "Interop"
means a legacy module or view manager that runs through the New Architecture interop layer. "Patched" lists the
files in `patches/`. Source: each package's `codegenConfig` and build files, and the build logs.

| Module | Version | iOS | Android | Patched | Tested by |
|---|---|---|---|---|---|
| `react-native` | 0.88.1 | native | native | yes (font scaling default) | all checks |
| `@react-native-async-storage/async-storage` | 2.2.0 | native | native | | M2 (stored profiles), S checks |
| `@react-native-camera-roll/camera-roll` | 5.0.4 | interop | interop | | not exercised |
| `@react-native-community/datetimepicker` | 8.4.7 | native | native | | not exercised |
| `@react-native-community/netinfo` | 11.4.1 | interop | interop | | indirectly (sync) |
| `lottie-react-native` | 7.5.1 | native (Fabric) | native (Fabric) | | screens with animations |
| `react-native-fs` | 2.18.0 | interop | interop | | indirectly (storage) |
| `react-native-gesture-handler` | 2.33.1 | native | native | | back gesture, sliders |
| `react-native-haptic-feedback` | 2.3.4 | native | native | | taps |
| `react-native-iap` | 12.15.5 | interop | interop | yes (Kotlin `currentActivity`) | S02 probe only |
| `react-native-image-picker` | 5.7.0 | interop | native | yes (iOS podspec) | not exercised |
| `react-native-inappbrowser-reborn` | 3.7.1 | interop | interop | | not exercised |
| `react-native-keychain` | 8.1.3 | interop | interop | | M2, M3 (password and biometric unlock) |
| `react-native-nfc-manager` | 3.17.2 (VerusCoin fork) | interop | interop | | S24 (no NFC on simulator/emulator) |
| `react-native-os` | 1.2.7 (VerusCoin fork) | interop | interop | yes | S02 probe |
| `react-native-permissions` | 4.1.5 | native | native | | S11 |
| `react-native-randombytes` | 3.6.1 | interop | interop | yes | profile creation (seed) |
| `react-native-reanimated` / `react-native-worklets` | 4.8.0 / 0.14.0 | native | native | | transitions, sliders |
| `react-native-safe-area-context` | 5.11.1 | native | native | | all screens |
| `react-native-screens` | 4.30.1 | native | native | | navigation checks |
| `react-native-svg` | 15.16.1 | native | native | | icons, QR codes |
| `react-native-tcp` | 4.0.0 (VerusCoin fork) | interop | interop | yes | electrum sync (M2 balance) |
| `react-native-udp` | 4.1.5 | interop | interop | | S02 probe |
| `react-native-vector-icons` | 10.3.0 | native | native | | icons |
| `react-native-verus` | 0.6.10 | interop | interop | yes | M2 (address), M4 (signing and send) |
| `react-native-video` | 6.19.3 | interop | interop | | not exercised |
| `react-native-vision-camera` | 4.7.3 | interop | interop | | S11 (Android camera) |
| `react-native-pager-view` | 6.9.1 | native (Fabric) | native (Fabric) | | top tabs |
| App: `VerusBiometricEnrollment` | — | — | interop | | M3 (Android) |
| App: `VerusKeepAwake` | — | not compiled (B3) | interop | | S02 probe |

**Still on the legacy interop layer:** camera-roll, netinfo, react-native-fs, react-native-iap,
react-native-image-picker (iOS), inappbrowser-reborn, react-native-keychain, react-native-nfc-manager,
react-native-os, react-native-randombytes, react-native-tcp, react-native-udp, react-native-verus,
react-native-video, react-native-vision-camera, and the two app modules. All key, credential and funds modules
(keychain, verus, randombytes, tcp, udp, iap) are in this list. React Native 0.88 adds the opt-in flags
`RCT_REMOVE_LEGACY_MODULE_INTEROP` and `RCT_REMOVE_LEGACY_COMPONENT_INTEROP` and says the interop layer will be
removed by default in a future release. These modules must move to the New Architecture (or be replaced) before
that.

## Jest

`corepack pnpm exec jest` at `7e50e3e3`, compared with phase 3 (`10a265e5`):

| | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Suites | 197 | 166 | 29 | 2 |
| Tests | 2756 | 2585 | 103 | 68 |
| Phase 3 | 197 / 2756 | 166 / 2561 | 29 / 127 | 2 / 68 |

Final run at `5deba266`: 198 suites (167 passed, 29 failed, 2 skipped); 2759 tests (2588 passed, 103 failed, 68
skipped). The one new suite is `src/globals/__tests__/paperTheme.unit.test.js` (3 tests, pass; it failed before
`7196331a`). The failing suites are the same 29 as at `7e50e3e3`; `coinpaprika` 66 failed in both. Raw results:
`~/.cache/valu-wallet-upgrade/logs/jest-phase4-head.json`.

At `7e50e3e3`, the same 29 suites fail (B7). The only count change is the live-network `coinpaprika` suite (66 failed here, 90 in
the last phase 3 run). No new failing suite or test. Raw results: `~/.cache/valu-wallet-upgrade/logs/jest-phase4.json`.

## Lint

Same as baseline: ESLint does not run (B1).

## iOS device results

Simulator "Valu Upgrade QA" (iOS 26.5 runtime), Debug build of `7e50e3e3`, Metro from this checkout. The phase 3
results are the reference. Evidence: `~/.cache/valu-wallet-upgrade/phase4/ios/`.

First run (`7e50e3e3`), result FAIL with three defects:

| Id | Defect | Cause | Fix |
|---|---|---|---|
| P4-1 | A link opened while the app runs (VerusPay invoice, login request) does nothing. Cold start works. | React Native 0.88 `RCTLinkingManager` `application:openURL:options:` and `application:continueUserActivity:` return `NO` and emit nothing in a scene app. `SceneDelegate.mm` called them. | `77c6c9bc`: `SceneDelegate` calls `scene:openURLContexts:` and `scene:continueUserActivity:`. |
| P4-2 | Red box "Cannot read property 'fontWeight' of undefined" (`TextInputOutlined.tsx:100`), then a blank app: onboarding password step, Add currency, VerusID "Choose your name", invoice → Send modal. | `configureFonts(fontConfig)` without `isV3: false` returns the MD3 font set, so the MD2 theme never had `fonts.regular`. Paper 5.12 spread the missing entry; Paper 5.15 reads `fonts.regular.fontWeight`. | `7196331a`: theme moved to `src/globals/paperTheme.js`; empty MD2 font entries keep the system font (no UI change). New test `paperTheme.unit.test.js` failed before the fix. |
| P4-3 | Send wizard → Saved addresses → Manage: the Services tab shows Address book as its only screen, with no back arrow. | `navigateByPath(['Home', 'ServicesHome', 'AddressBook'])` makes the same nested `navigate` as v6. If the Services tab stack is not mounted yet, React Navigation (6 and 7) makes the nested screen the only screen. | Not changed: most likely v6 behaviour (phase 3 could not reach it, B5). The Android run checks it. Open item. |

Results of the first run that do not depend on P4-1 and P4-2:

- Migration: M1 PASS (ValuBaseIOS listed). M2 PASS (same address RCSWM…2sYaA, balance 0.4495 = 0.4596 − 0.0101
  paid in phase 3). M3 PASS (Face ID). M4 BLOCKED by P4-1/P4-2; a 0.01 VRSCTEST send from the Send wizard with the
  migrated profile confirmed signing: txid `3f5f5929d5250a621b5fb9282425a14baba9320d1ae0ddccb8a38e4874e8e210`
  (daemon: spends from the ValuBaseIOS address, 0.4394 change).
- Navigation: N05, N07, N08, N16, N22–N26 PASS and the same as phase 3. N09 and N11 PASS (phase 3 was blocked by
  B5). N06 N/A.
- Smoke: S08–S10, S12, S14, S15, S17–S22, S24 PASS. S11 no camera on the simulator. S25 N/A. S02 probe not run
  (Metro inspector HTTP 401; the modules answered in the flows).
- Visual: Home tab bar (icon row 800.3–822.3 pt, label row 832.3–843.3 pt) and the Gift Cards header (title
  73.7–94 pt, bottom line 106–122 pt) are the same as phase 3.
- Animations and gestures: edge swipe-back, the Revoke/Recover slider, the Gift Cards pager, the Home carousel,
  the hold-to-confirm ring, sheets, the keyboard-avoiding sheet and the lock slide-out work.
- Log: the same as phase 3 (SafeAreaView deprecation, two require cycles, non-serializable navigation params,
  sepolia bridge delegator, NFC not supported), plus two new warnings from React Native 0.88: "ImageBackground is
  deprecated" and the shadow "(ADVICE) … cannot calculate shadow efficiently". The B5 red box did not show in this
  run (the sepolia error showed as a toast only).

Re-check (`77c6c9bc`, new Debug build), result PASS. Evidence: `~/.cache/valu-wallet-upgrade/phase4/ios/recheck/`.

- M4 PASS: the invoice opened by a warm-start link was paid with the migrated profile ValuBaseIOS. Txid
  `473d980f105ae1caa7804f711f8b5924d5b9027e86b85ae973d89f5d3f918a64` (daemon `listtransactions`: 0.01 to the QA payee).
- Links (P4-1 fixed): warm start signed in, warm start signed out (Cancel shows the unlock screen) and cold start
  each show the invoice.
- P4-2 fixed: onboarding (N01–N04, S03–S06), the invoice Send modal, Add currency, VerusID name and S23 import
  (same address as the created profile) PASS. Paper text fields show the system font, as in phase 3.
- N12 (modal and tabs seen), N13–N15, N17, N18, N21 PASS and the same as phase 3. N19/N20 not run (testnet
  server error in phase 3 too). Send modal top tabs: ENTER, CONFIRM, RESULT in uppercase, with the indicator.
- P4-3: after a fresh start without the Services tab, Manage shows Address book as the only Services screen (no
  back arrow). After the Services tab was opened once, Address book has a back arrow to the Services root.
- Log: the P4-2 TypeError is gone. One React "change in the order of Hooks" error for `HomeTabScreens` came from
  Fast Refresh: `5deba266` added a hook to that file while the app ran (log time 21:04:04 UTC, file changed
  22:04 local). It is not an app defect.

## Android build

Game PC, JDK 17, worktree at `77c6c9bc`, `-PreactNativeArchitectures=x86_64`. All 10 patches applied.

| Run | Commit | Result |
|---|---|---|
| 1 | `89271440` | Configuration failed: AGP 9 rejects `getDefaultProguardFile('proguard-android.txt')` in `react-native-os` (and `react-native-tcp`); KSP 2.2.0-2.0.2 too old for Kotlin Gradle plugin 2.2.10. Fixed in `334809b2`. |
| 2 | `334809b2` | `:react-native-async-storage_async-storage:kspDebugKotlin` failed: "unexpected jvm signature V" in the Room 2.4.2 compiler under KSP2. Fixed in `dfd82364` (KSP1). |
| 3 | `77c6c9bc` | Debug and Release build. Debug APK 104 MB, Release APK 77 MB. |

The Release build has no `keystore.properties` on the PC, so it was signed through the `MYAPP_RELEASE_*` CI
variables, pointed at the debug keystore. Both APKs have the same signer (certificate SHA-256 `07203683…361ab8`;
`115B7D33…FBD25208` is the SHA-256 of the keystore file). Android accepted `install -r` over the phase 2 build.

Warnings (no error):

- AGP 10 will remove `android.builtInKotlin=false`, `android.newDsl=false` and `android.enableJetifier`; the
  legacy variant API (`applicationVariants`, `testVariants`, `unitTestVariants` in `:app`, `libraryVariants` in
  `:lottie-react-native`) is obsolete.
- Kotlin deprecations in libraries: `MapBuilder`, `getEventDispatcherForReactTag`, `UIManagerModule`,
  `ReactFeatureFlags`, `onCatalystInstanceDestroy` (netinfo, tcp, udp), `TurboReactPackage` (AsyncStorage),
  `LayoutShadowNode` (safe-area), `RCTEventEmitter` (pager-view), react-native-iap `getCurrentActivity`,
  `enablePendingPurchases` and `queryPurchaseHistoryAsync`, verus `shieldFunds` / `sendToAddress`.
- `react-native-nfc-manager` still sets `package=` in its manifest (AGP 9 ignores it).

Full list on the PC: `%USERPROFILE%\.cache\valu-wallet-upgrade\phase4\android\warnings-all.txt`.

## Android device results

Slot s2 (normal phone 412×923 dp and small phone 360×640 dp, Android 16), Debug `77c6c9bc` installed with
`install -r` over the phase 2 build (first install time kept), Metro from the `77c6c9bc` worktree. Result PASS.
Evidence: `%USERPROFILE%\.cache\valu-wallet-upgrade\phase4\android\` on the PC.

- Migration with "QA Baseline Restore" (made by the baseline build): M1 PASS, M2 PASS (same address RMSZ4…Pj9bW,
  balance 0.4596), M3 N/A (no biometrics), M4 PASS: txid
  `4b54720c7e3fc0f1bf55caccf4b343cb5aeca9c83f5862c814dd66a2101fb187`. Warm-start and cold-start links show the
  invoice (cold start: before the unlock).
- S02 PASS: bridgeless, `VerusLightClient` with `initialize: function`, `RNIapModule` present.
- Navigation: N01–N05, N08, N12–N14, N16–N18, N21–N26 PASS and the same as phase 3. N09 and N11 PASS (phase 3
  blocked by B5). N06/N07 N/A (no bell on testnet). N19/N20 BLOCKED (testnet `getblock` error, as in phase 3).
  No "not handled by any navigator".
- Smoke: S02–S12, S14–S17, S19, S20, S22–S24 PASS. S13 N/A. S18/S21 BLOCKED (SECURE_SOFTWARE, as before). New
  profiles "QA Phase4 Ten" and "QA Import Eleven" (same address). No `fontWeight` red box.
- Edge-to-edge: no new overlap; status-bar icons dark on the light screens. Geometry is the same as the phase 3
  re-check (tab bar 2232–2424, icon top 2243, label 2317–2360, coin title top 331, back touch area 126 px).
- Paper text fields use the system font. Font scale 1.3: Home and the Add Address sheet are pixel-identical to 1.0.
- Gestures: pull-to-refresh, hold-to-confirm (fills and cancels on release), the Revoke/Recover pager, sheets.
- Small phone: tab bar as in phase 3; onboarding Back steps PASS; Back/Next fit on seed words 17–24.
- Android 14 or older: not checked (only API 35 and 36 images on the PC). `MainActivity.keepTranslucentStatusBar()`
  is checked by source only.

Findings:

| Id | Finding | Status |
|---|---|---|
| P4-3 | Manage after a fresh start: Address book is the only Services screen (same as iOS). System Back goes to the coin screen. | Open item, most likely v6 behaviour. |
| P4-4 | Camera: after the Scan tab, an invoice link shows the `session/invalid-output-configuration` red box; its toast covers Cancel and Continue. | Same error as P2-2 (phase 2) and the phase 3 re-check. Open item (`react-native-vision-camera`). |
| P4-5 | Convert VRSCTEST → DAI.vETH, Send to self: the Confirm step shows "Invalid address format" (`SendWizardConfirm.js:414`). | Not compared: this path ended in the B5 red box at baseline and in phase 3. The upgrade did not change that code. Open item. |
| — | The testnet tube button sits in the status-bar inset and does not take taps on the normal phone. | Known since baseline. |

New log lines (warnings, no crash): `new NativeEventEmitter() … addListener / removeListeners` (a legacy module,
probably tcp, udp or nfc-manager), `setLayoutAnimationEnabledExperimental is a no-op in the New Architecture`,
`ImageBackground is deprecated`, non-fatal `ReactNoCrashSoftException` for the `setPressed` / `hotspotUpdate`
view commands and `onWindowFocusChange`, a Reanimated warning about `REASharedTransitionBoundaryManager`, and a
CameraView event-name warning.

## Release builds

**iOS (simulator Release, `77c6c9bc`).** `corepack pnpm bundle-ios` made `ios/main.jsbundle` (26 MB, B4), then
`xcodebuild -configuration Release -sdk iphonesimulator` succeeded. The Release app was installed over the Debug
app. It started without Metro (no connection to 8081), listed ValuBaseIOS, unlocked it with the password and
showed Home with 0.4293 VRSCTEST. No crash report; the only `log show` errors were simulator network noise.
Nothing was sent from the Release build. Screenshots `71-release-profiles.png`, `72-release-home.png`.

**Android (Release APK, `77c6c9bc`, signed with the debug key).** Installed over the Debug app on the normal phone.
It started without Metro, listed and unlocked "QA Baseline Restore" and showed Home with 0.4394 VRSCTEST. No
FATAL EXCEPTION and no JS error (`logcat-normal-release-77.txt`). Nothing was sent from the Release build.

## Review

Codex (`gpt-6.2-astra`, reasoning effort high) reviewed `git diff main..77c6c9bc`. It found no change that deletes
a stored profile, changes a keychain service name or changes the Room schema. It compared AsyncStorage 2.1.2
and 2.2.0: the Room supplier, the Android module, the JS adapter and the iOS storage are byte-identical. All ten
patches passed a reverse-apply check. Application id, signing, ABI split and version codes are unchanged.

| # | Finding | Decision |
|---|---|---|
| 1 | `patch-package` 6.2.1 can skip a patch that does not apply and still exit 0, so a build can miss the `react-native-verus` patch. | Fixed in `3422f152`: `scripts/check-patches.js` runs after `patch-package` and fails the install. Tested with one patch reversed (exit 1) and all applied (exit 0). |
| 2 | With `hermesEnabled=false`, Gradle packages JSC but `MainApplication` passes no JS runtime factory, so React Native uses Hermes. | Rejected. The app sets `hermesEnabled=true` and has never shipped JSC. The 0.88 template has the same code. No speculative JSC support added. |
| 3 | `gemfile` lists four gems that `Gemfile.lock` does not list as dependencies; a frozen Bundler install rejects it. | Fixed in `5828fccb` (the specs were already locked; `bundle lock --print` gives the same file except the Bundler version line). |
| 4 | The S02 probe printed PRESENT for a module without its method and exited 0 when a key module was missing. | Fixed in `9931e56b`. It also sends the Origin header that Metro 0.87 needs (the iOS QA saw HTTP 401). Checked by syntax only; not run against a device. |
| 5 | README and AGENTS.md still named React Native 0.81.6, SDK 36, Build Tools 35, NDK 27.0, Gradle 8.10.2 and Node 20. | Fixed in `de5b8e28`. |
| 6 | `navigateByPath` opens Notifications in the Wallet tab where v6 used the Services tab, if Services was opened earlier and the user is on another tab. | Rejected: known and documented in phase-3.md ("navigateByPath", open item 2). Both show the same screen. |
| 7 | On a frame 768 dp or wider, React Navigation puts tab labels beside the icons, and the v6 overrides from `10a265e5` push the label to the edge. | Fixed in `5deba266`: the overrides apply only when labels sit under the icons. Phones are not changed. Not checked on a tablet. |

## Open items

1. **Legacy interop modules.** Keychain, verus, randombytes, tcp, udp, iap and the others listed under "Still on
   the legacy interop layer" must move to the New Architecture before React Native removes the interop layer.
   Several of them are pinned key or funds modules: each move is a version change for Valu to plan.
2. **SafeAreaView from core** (83 files). Deprecated, still exported in 0.88.1. Each screen needs its own `edges`
   choice for `react-native-safe-area-context`; that is a UI change.
3. **KSP1 for AsyncStorage's Room 2.4.2** (`ksp.useKSP2=false`). KSP1 goes away in a later KSP release. Then Room
   2.7 or later is needed; test it with an in-place upgrade of a stored profile.
4. **AGP 10.** `android.builtInKotlin=false`, `android.newDsl=false`, `android.enableJetifier` and the legacy
   variant API (`:app` versionCode override, `:lottie-react-native`) must go before AGP 10.
5. **`edgeToEdgeEnabled=false`.** Edge-to-edge is already on for Android 15 and 16. Turning it on for older
   versions makes the navigation bar transparent there (a UI change). `keepTranslucentStatusBar()` was not run on
   Android 14 or older.
6. **`RCTAppDelegate` is deprecated** in 0.88 (still works). The 0.88 template uses `RCTReactNativeFactory`.
7. **P4-3** Manage → Address book with no way back, after a fresh start. Recommendation: pass `initial: false` in
   the nested navigate, so the Services root stays under Address book (a behaviour change for Valu to approve).
8. **P4-4** camera session error after the Scan tab (also P2-2).
9. **P4-5** "Invalid address format" on Convert → Send to self (not compared with earlier phases).
10. **Paper fonts.** `configureFonts(fontConfig)` never applied Source Sans Pro to Paper components. Applying it
    (`configureFonts({config: fontConfig, isV3: false})`) is a UI change for the redesign to decide.
11. **`DragSort`** uses removed Reanimated 3 APIs; it is dead code.
12. **`react-native-image-picker` 5.7.0** builds its legacy module on iOS through a podspec patch. A newer major
    removes the patch.
13. From phase 3: tab choice of `navigateByPath` (phase-3.md, open item 2).
