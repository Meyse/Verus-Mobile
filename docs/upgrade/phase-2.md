# Phase 2: React Native 0.81.6 and React 19.1.4

Phase 2 moves React Native from 0.77.3 to 0.81.6 and React from 18.3.1 to 19.1.4. The New Architecture stays
on. React Navigation stays on 6. The references are [baseline.md](baseline.md) and [phase-1.md](phase-1.md).

## Commits

Branch `claude/rn-upgrade`:

| Commit | Change |
|---|---|
| `d3ecd9c0` | Version upgrade, Android and iOS template changes, Podfile module-map fix, Gemfile. |
| `7db9b34a` | React 19 font scaling: `patches/react-native+0.81.6.patch` and the `App.js` change. |
| `28f60c32` | iOS launch crash: `SceneDelegate.mm` forwards the coordinate-space call only when the app delegate has it. |
| `5caeaa76` | Android compile: new hunk in `patches/react-native-iap+12.15.5.patch` (`getCurrentActivity()`). |
| `1619eedf` | Android compile: `MainApplication.isHermesEnabled()` returns `boolean`. |
| `67cd75b3` | Seed-step button layout (P2-1 below): the Next button keeps `flex: 1`. JS only. |
| (this commit) | `phase-2.md`, `android-build.md`. |

## Versions

| Package | Before | After | Note |
|---|---|---|---|
| react | 18.3.1 | 19.1.4 | |
| react-native | 0.77.3 | 0.81.6 | |
| react-test-renderer | 18.3.1 | 19.1.4 | |
| @react-native/babel-preset, metro-config, eslint-config | 0.77.3 | 0.81.6 | |
| @react-native-community/cli (+ platform-android, platform-ios) | 15.0.1 | 20.0.0 | |
| react-native-reanimated | 3.17.5 | 3.19.5 | |
| react-native-screens | 4.9.2 | 4.24.0 | Newest 4.x with RN 0.81 support. It still works with React Navigation 6. |
| react-native-gesture-handler | 2.25.0 | 2.28.0 | Newest 2.x with RN 0.81 support. |
| react-native-safe-area-context | 5.3.0 | 5.6.2 | |
| react-native-pager-view | 6.7.1 | 6.9.1 | |
| react-native-vision-camera | 4.6.4 | 4.7.3 | |
| @react-native-async-storage/async-storage | 2.1.2 | 2.2.0 | |
| @react-native-community/datetimepicker | 8.2.0 | 8.4.7 | |
| react-native-svg | 15.12.1 | 15.12.1 | Already supports 0.81. |
| React Navigation (native, stack, tabs) | 6.x | 6.x | No change. |
| react-native-paper, react-redux | 5.12.5, 8.0.2 | no change | react-redux 8 declares a React ≤ 18 peer, so pnpm prints a peer warning. The device runs below use it with React 19. |
| react-native-keychain, react-native-verus, react-native-randombytes, react-native-tcp, react-native-udp, react-native-iap | pinned | no change | Key, credential and funds modules. No bump, no new patch. |
| Gradle / AGP / Kotlin | 8.10.2 / 8.7.2 / 2.0.21 | 8.14.3 / 8.11.0 / 2.1.20 | RN 0.81 template values. |
| Android NDK | 27.0.12077973 | no change | See the Android build result. |
| compile / target SDK | 36 / 36 | no change | |

## Breaking changes handled

1. **React 19 ignores `defaultProps` on function components.** In RN 0.81, `Text` and `TextInput` are function
   components. `App.js` turned font scaling off with `Text.defaultProps.allowFontScaling = false` (and the same for
   `TextInput`). Under React 19 these lines do nothing, so all text would scale with the system font size.
   `patches/react-native+0.81.6.patch` makes `allowFontScaling` default to `false` in both components, and
   `App.js` no longer sets `defaultProps`. A component can still pass `allowFontScaling={true}`. Behaviour is the
   same as at baseline.
2. **The other `propTypes` / `defaultProps` spots (7) need no change.** `NumberPad/lib` `Display`, `Input`
   (`static propTypes` and `static defaultProps`), `AvoidingView` and `NumberPad` (`static propTypes`) are class
   components: React 19 still applies `defaultProps` on classes, and only drops the `propTypes` check (a
   development warning). `SideMenu.propTypes` is the same check only. No app code uses string refs, legacy
   context, `createFactory` or `findNodeHandle`.
3. **Android `MainApplication`.** RN 0.81 removes the two-argument Java form of
   `DefaultReactHost.getDefaultReactHost`. The app passes `null` as the third argument (the JS runtime factory;
   `null` selects Hermes). `onCreate` calls the generated `ReactNativeApplicationEntryPoint.loadReactNative(this)`
   instead of `SoLoader.init` plus `DefaultNewArchitectureEntryPoint.load()`, as in the 0.81 template.
   `DefaultReactNativeHost` is Kotlin in 0.81 and declares `isHermesEnabled` as a non-null `Boolean` (Java
   `boolean`); the override returned the boxed `Boolean` from 0.77, and javac failed. Fix (`1619eedf`): return
   `boolean`, same value.
4. **Android build files.** Gradle 8.14.3, AGP 8.11.0, Kotlin 2.1.20. The async-storage "next" storage builds with
   KSP, so `AsyncStorage_kotlinVersion` and `AsyncStorage_next_kspVersion` follow Kotlin (2.1.20, 2.1.20-1.0.32).
   The JSC flavor coordinates move to `io.github.react-native-community:jsc-android` (Hermes is in use; this is
   template parity only). `edgeToEdgeEnabled=false` keeps Android 15 and earlier as before.
5. **iOS module map conflict.** The Podfile uses `use_modular_headers!`. In 0.81 the new `React-jsitooling` pod
   defines the `react_runtime` module from the `react/runtime` header directory, which `React-RuntimeCore` also
   uses. The second module map fails the build with "Redefinition of module 'react_runtime'".
   `React-RuntimeCore` now opts out of modular headers, the same way as `React-RuntimeApple` before.
6. **iOS `Podfile.lock`.** The RN third-party pods (`fast_float`, `RCT-Folly`, `fmt`, `glog`, `boost`,
   `DoubleConversion`, `SocketRocket`, `hermes-engine`) needed `pod update` for their 0.81 versions. `pod install`
   adds `RCTNewArchEnabled = true` to both `Info.plist` files; the change was made by hand to keep the files'
   order. The cosmetic `project.pbxproj` changes from `pod install` were not kept.
7. **Gemfile.** Ruby 3.4 removed `bigdecimal`, `logger`, `benchmark` and `mutex_m` from the standard library. The
   0.81 template lists them.
8. **`AppDelegate.mm`** needs no change. `RCTAppDelegate` still exists in 0.81 and builds with Xcode 27.2.
9. **iOS launch crash (`SceneDelegate.mm`).** The first phase 2 build crashed on every launch, before JS:
   `-[AppDelegate windowScene:didUpdateCoordinateSpace:interfaceOrientation:traitCollection:]: unrecognized
   selector`. The app's `SceneDelegate` (UIScene migration) forwarded that call to the app delegate, because 0.77's
   `RCTAppDelegate` posted its dimension-change notification there. 0.81's `RCTAppDelegate` has no such method;
   `RCTDeviceInfo` now observes the window frame itself. Fix (`28f60c32`): forward only when the delegate responds
   to the selector. The baseline profiles were not touched (the install over them worked; only the launch failed).
10. **`react-native-iap` 12.15.5 does not compile on Android (purchase module, version kept).**
    `RNIapModule.kt` read `currentActivity` as a Kotlin property. In 0.81, `ReactContextBaseJavaModule` is Kotlin
    and `getCurrentActivity()` is a protected function, so the property does not resolve
    (`:react-native-iap:compilePlayDebugKotlin`: "Unresolved reference 'currentActivity'"). Fix (`5caeaa76`): one
    hunk in the existing patch calls `getCurrentActivity()`, the same method. No bump, no behaviour change. This is
    the only module compile patch in phase 2.

## Build

| Platform | Result | Notes |
|---|---|---|
| iOS Debug, simulator | Builds (Xcode 27.2) | After fix 5. Same workarounds as baseline: `LANG=en_US.UTF-8` for `pod install`, B4 `main.jsbundle`. |
| Android Debug | Builds (Game PC, Gradle 8.14.3, AGP 8.11.0) | After fixes 3 and 10. NDK stays 27.0.12077973; the build gives no NDK warning. Debug keystore as in [android-build.md](android-build.md). |

## Profile migration

A profile created by the baseline build (0.77.3, legacy architecture) was opened by the phase 2 build installed
over it. On Android the baseline profiles were gone (the phase 1 S01 check uninstalled the app), so the baseline
build was installed again and the "QA Baseline One" seed was imported on it as "QA Baseline Restore"
(baseline build `a00a5480`, `bridgeless=false`, 0.4899 VRSCTEST). No profile created by an upgraded build was used.

| ID | iOS (`ValuBaseIOS`) | Android (`QA Baseline Restore`) |
|---|---|---|
| M1 | PASS. `simctl install` over the phase 1 app (same data container as baseline). All 4 earlier profiles are listed. | PASS. `adb install -r` over the baseline build, same keystore (`firstInstallTime` unchanged). The profile is listed. |
| M2 | PASS. Password unlock, address `RCSWMu…2sYaA`, balance 0.4798. | PASS. Password unlock, address `RMSZ4…Pj9bW`, balance 0.4899. |
| M3 | PASS. Face ID unlock after relaunch and after Lock. | N/A. Biometric is off (emulator keystore `SECURE_SOFTWARE`). |
| M4 | PASS. Invoice path, 0.01 VRSCTEST. txid `04b9e586aa52f12f03c951a5a28910dc84ce0d097127952b83250f6bee696dad`; the daemon received it. | PASS. Invoice path, 0.01 VRSCTEST. txid `0a679c15e0051e0b08fb07040b3eddd0d3d79e64ed9707dfcc4316ffd1e7c378`; the daemon received it. |

The first iOS phase 2 build (`7db9b34a`) crashed at launch (fix 9). The install over the old app had worked, and the
data was not touched; the fixed build opened it.

## Native modules

S02 probe on both platforms: `bridgeless=true fabric=true`. All modules are reached through the interop layer, as
in phase 1. No key, credential or funds module was bumped.

| Module | iOS | Android |
|---|---|---|
| `RNKeychainManager` (react-native-keychain 8.1.3) | Works (M2, M3, S18-S22) | Works (M2, S19-S20) |
| `VerusLightClient` (react-native-verus 0.6.10) | Present, `initialize` is a function. Same two interop warnings as phase 1. | Present, `initialize` is a function. No `ParsingException`. |
| `TcpSockets`, `UdpSockets` | Work (balance, M4) | Work (balance, M4) |
| `RNRandomBytes` | Works (S06) | Works (S06) |
| `NfcManager` | Works (S24) | Works (S24) |
| `CameraView`, `CameraDevices` (vision-camera 4.7.3) | Works (S11) | Live frame (S11), also after leaving and reopening Scan. One dev error in the first run, see P2-2. |
| `RNIapIos` / `RNIapModule` (react-native-iap 12.15.5) | Present | Present (after fix 10) |
| `VerusBiometricEnrollment` (app, Android) | — | Present |
| `VerusKeepAwake` (app) | Missing, as baseline (B3) | Present |

## iOS smoke results

Simulator "Valu Upgrade QA", iPhone 17 Pro, iOS 26.5, same simulator and data as phase 1. Build `28f60c32`.
New profiles: `ValuP2IOS` (created, biometric on) and `ValuP2ImportIOS` (imported from the same seed).
Screenshots and logs: `~/.cache/valu-wallet-upgrade/phase2/ios/`.

| ID | Result | Notes |
|---|---|---|
| S01 | Not run on a fresh install | The app starts to the unlock screen. A fresh install would delete the baseline profiles. |
| S02 | PASS | See Native modules. `S02-probe.txt`. |
| S03-S06 | PASS | Every field takes focus on the first tap (name, both passwords, 3 verify words). |
| S07-S10 | PASS | |
| S11 | PASS | Camera prompt, then "No camera hardware detected", as baseline. |
| S12 | PASS | The daemon validates the new address. |
| S13 | PASS | The migrated profile shows its funds (see M2, M4). |
| S14 | FAIL (B5) | Same red box as baseline. |
| S15 | PASS (invoice path) | See M4. |
| S16 | PASS | Invoice for 0.01 VRSCTEST to the daemon address; Cancel works. |
| S17 | PASS | Profile, Wallet and General settings; header Back and edge swipe. |
| S18 | PASS | Biometric on at creation; settings show "Disable Biometric Authentication". |
| S19-S21 | PASS | Lock, password unlock, Face ID unlock. |
| S22 | PASS | Relaunch, profile listed, Face ID auto-unlock, same balance. |
| S23 | PASS | "Import 24-word seed" gives the same address; all 24 words take focus. |
| S24 | PASS | "NFC is not supported on this device", as baseline. |
| S25 | N/A | Same as baseline. |
| S26 | PASS with known errors | Known: B5, "No Verus bridge delegator for network sepolia", "NFC is not supported", React key warnings, require cycles, the two `VerusLightClient` interop warnings, "JsonRpcProvider failed to detect network" (also in phase 1). New, warnings only: the `SafeAreaView` deprecation (8 times, from `Unlock.js`, which imports `SafeAreaView` from `react-native`), and a Metro note that `@noble/hashes/crypto.js` is not in that package's `exports` (Metro falls back to the file; the bundle builds). No Invariant Violation, TurboModule, defaultProps or propTypes error. `logs/js-console-phase2-ios.log`. |

Extra checks on iOS:

- System bars: Unlock, Home, Settings, Scan, Receive, invoice and Create Password have the same layout as phase 1.
  Nothing is under the status bar or the home indicator.
- Back: header Back and the edge swipe work on the coin screen, Receive, settings sub-screens, the invoice screen
  and the onboarding steps.
- Font scaling: at the largest accessibility text size the app text keeps its size, while the system Settings app
  scales. So fix 1 works. The size was set back after the check.

Observations (not counted as phase 2 defects):

- Address book, "Address" field: a fast automated 34-character fill lost 1-3 characters in 2 of 2 tries. With a
  80 ms delay between keys it was correct, and a fast 36-character fill of the "Name" field was correct 3 of 3
  times. There is no baseline result for this test. It can come from the automated typing speed. Check it again
  with paste and with manual typing. `B-addressbook-dropped-chars.png`.
- Unlock screen with the keyboard open: the "Unlock" button shows as a thin strip above the keyboard; the
  keyboard's return key unlocks. No baseline screenshot with the keyboard open exists, so it is not known whether
  this is new. `B-unlock-keyboard-up.png`.
- The "Yes" buttons of two Paper dialogs ("Enable biometric authentication?", "Make this a test profile?") are not
  in the accessibility tree. Not compared with baseline.

## Android smoke results

Game PC, slot s2. Normal phone `QA2_Pixel_9_API_36` (Pixel 9, Android 16) with the migrated baseline data; small
phone (360×640 dp, Android 16) with a fresh install. Build `1619eedf`. New profiles: `QA Phase2 Five` (created),
`QA Import Six` (imported from the same seed), `QA Small Seven` (small phone). Screenshots and logs stay on the PC:
`%USERPROFILE%\.cache\valu-wallet-upgrade\phase2\android\`.

| ID | Result | Notes |
|---|---|---|
| S01 | PASS | Small phone, fresh install: "Get started". |
| S02 | PASS | See Native modules. |
| S03, S04 | PASS | Fields take focus and text on the first tap. |
| S05 | PASS | The test-tube button sits in the status-bar area, as at baseline; see Android 16 checks. |
| S06 | PASS after fix P2-1 | Seed steps had the squeezed Back button (P2-1). |
| S07-S10 | PASS | |
| S11 | PASS | Live frame. See P2-2. |
| S12 | PASS | |
| S13 | PASS | Migrated profile shows 0.4899. |
| S14 | FAIL (B5) | Same red box as baseline. |
| S15 | PASS (invoice path) | See M4. Android shows an app chooser for the invoice link because another Verus wallet app is installed on the emulator. |
| S16 | PASS | |
| S17 | PASS | Profile & security, Wallet, App info, General settings, Custom RPC servers. |
| S18, S21 | BLOCKED | Emulator keystore `SECURE_SOFTWARE`, as baseline. |
| S19, S20, S22 | PASS | |
| S23 | PASS | Same address as the created profile. |
| S24 | PASS | "NFC not supported". |
| S25 | N/A | |
| S26 | PASS with known errors | Known: B5, "No Verus bridge delegator for network sepolia", "NFC is not supported", React key warnings, `NativeEventEmitter` warnings, JsonRpcProvider retries, require cycles, the `@noble/hashes` exports note, "Could not find generated setter" for the SafeAreaView managers. New: P2-2. No Invariant Violation, TurboModule error, `ParsingException`, defaultProps warning or native crash. |

## Android 16: edge-to-edge, predictive back, font scaling

Target SDK 36 was already in place at baseline, so Android 16 already drew the app edge-to-edge before the
upgrade. `edgeToEdgeEnabled=false` keeps Android 15 and earlier as before.

- Edge-to-edge, normal phone: no new content or control under the status bar or the navigation bar. The known
  baseline cases remain: the test-tube button, the "VerusPay invoice" title and the "Scan a QR code" title sit in
  the status-bar area. The test-tube button needs a tap below y≈140 dp (same as phase 1).
- Edge-to-edge, small phone (no baseline run on this phone size, so it is not known whether these are new):
  the wallet-intro screen has no bottom inset, and "I already have a wallet" is cut by the gesture bar (in test
  mode the title wraps and the button is off the screen); on the verify screen the third word field stays under
  the keyboard. Screenshots `small-S04-wallet-intro.png`, `small-S05-testnet-set.png`, `small-S06-verify-typed.png`.
- Predictive back: system Back and the back gesture work on all flows checked: coin screen, Receive, settings
  sub-screens, invoice screen, each onboarding step, bottom sheets (the sheet closes first), and Home (the app
  goes to the background and comes back unlocked, as at baseline).
- Font scaling: at `font_scale` 1.3 the unlock form and Home are the same as at 1.0 (fix 1 works on Android).

## Jest

`corepack pnpm test --ci` (React 19.1.4 test renderer), at `1619eedf`:

| | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Suites | 196 | 161 | 33 | 2 |
| Tests | 2751 | 2542 | 141 | 68 |
| Baseline | 196 suites / 2751 tests | 165 / 2580 | 29 / 103 | 2 / 68 |

The 29 baseline suites fail with the same counts as at baseline, except the live-network `coinpaprika` suite
(90 failed instead of 66, as in phase 1; the first phase 2 run had 66). Four suites (14 tests) fail newly. All four fail
because of the React 19 test renderer, not because of app code. The tests were not changed.

- `identityStateChangeDisplay` (6), `identitySignatureThreshold` (4), `identityUpdateReviewScreen` (2): the tests
  call `create()` outside `act()`. React 19.1's `react-test-renderer` has no synchronous legacy root, so the tree
  is empty when the test reads it ("Can't access .root on unmounted test renderer", or empty text). With a
  temporary setup file that only wraps `create` in `act` (not committed), the three suites pass (117 of 119 tests
  in the four suites).
- `identityRegistrationScreens` (2: "deletes a draft / completed from the home list only after confirmation"): the
  test mocks `useSelector` as a direct read of a mutable object, with no store subscription. The delete changes
  `busy` and `deletingJobId` and sets them back in the same `act`. React 19 batches these updates; the net state
  does not change, so React keeps the old output and the row stays. In the app, `react-redux` re-renders the
  screen when the store changes. The device checks cover deletes only indirectly (see smoke results).

A fix for these tests is a test change (wrap `create` in `act`; let the `useSelector` mock re-render). That is
outside phase 2. Raw results: `~/.cache/valu-wallet-upgrade/logs/jest-phase2-final.json`.

## Lint

Same as baseline: ESLint does not run (B1).

## Baseline defects

No baseline defect changed. B1 (ESLint does not run), B2 (fixed before), B3 (`VerusKeepAwake` missing on iOS), B4
(`main.jsbundle` for a clean iOS build), B5 (send/convert red box), B6 (not re-run; no change expected) and B7
(the 29 failing Jest suites) are as before. The upgrade did not force a fix for any of them.

## Defects found and fixed in phase 2

Fixes 9 and 10 above are build or launch failures. Two more defects were found on the devices:

**P2-1: seed-step buttons squeezed (iOS and Android).** On seed words 9-16, 17-24 and the verify screen, Back shrank
to "B…" and Next/Complete ran off the right edge. Cause, measured on the iOS simulator with a temporary copy of the
row: the Next button changes its style from `width: '100%'` (first step) to `flex: 1` (later steps). React Native
0.81 keeps the old width when one style update removes `width` and adds `flex` (the button kept 354 pt; a sibling
that changed from `width: 0` to `flex: 1` kept 0). Removing `width` alone resets correctly. 0.77 reset it in both
cases. Fix (`67cd75b3`): Next keeps `flex: 1` in both states; a single `flex: 1` child fills the row, so the first
step looks the same. Checked on iOS (`D1-fixed-seed-buttons.png`, `D1-fixed-step0-buttons.png`) and on both Android phones (Back left,
Next right on 9-16, 17-24 and verify; Next at full width on 1-8; same as baseline). No other app file
switches between `width` and `flex` in one style. The same React Native behaviour can still affect a future style
switch of this kind.

## Open items

**P2-2: camera error once on Android (not reproduced).** In the first Android run, the dev toast
"session/invalid-output-configuration: Failed to configure the Camera Session" showed after leaving the Scan tab.
vision-camera changed from 4.6.4 to 4.7.3 in this phase. A re-check (Scan, Home, Scan, three times, and a screen
lock on Scan) did not show the error, and the live frame came back each time. The app's `Camera` has no `onError`
prop, so vision-camera reports such an error with `console.error` (a dev toast only). Likelihood: low; impact: a
dev toast, the camera kept working. No change made.

Other open items (not caused by the upgrade, or not known):

- Small Android phone: wallet-intro bottom inset and the verify field under the keyboard (see Android 16 checks).
  No baseline run on this phone size.
- iOS observations in the iOS section (address-book typing speed, Unlock button with the keyboard open, Paper
  dialog buttons in the accessibility tree).
- `SafeAreaView` from `react-native` is deprecated in 0.81 (warning from `Unlock.js` and other screens). It still
  works. Moving to `react-native-safe-area-context` is a separate change.
- Four Jest suites need a test change for the React 19 test renderer (see Jest).
- Android, phase 1 item: `RustBackend.listTransparentReceivers` JNI symbol (light client), still unverified while
  the testnet lightwalletd certificate is expired.
- One `ReactNativeJS: Error: undefined` line in logcat while the Android screen was locked during the camera
  re-check. Not traced.
