# React Native upgrade: summary

Branch `claude/rn-upgrade`, compared with `main`. For the details of each phase, read [baseline.md](baseline.md),
[phase-1.md](phase-1.md), [phase-2.md](phase-2.md), [phase-3.md](phase-3.md) and [phase-4.md](phase-4.md).

## What changed and why

- **New Architecture on (phase 1).** React Native 0.82 and newer have no legacy architecture. The app now runs
  bridgeless with Fabric and TurboModules. Legacy native modules run through the interop layer.
- **React Native 0.77.3 → 0.81.6 → 0.88.1, React 18.3.1 → 19.3.1 (phases 2 and 4).** 0.88 is the current release.
  It supports Xcode 27 and the UIScene lifecycle, Android SDK 37 and Gradle 9.
- **React Navigation 6 → 7 (phase 3).** Version 7 is the current major version. The app keeps the JS stack and
  the JS bottom tabs. Two patches keep the v6 header height and tab bar layout, so the screens look the same.
- **No product or UI change.** The key, credential and purchase modules keep their versions: `react-native-keychain`
  8.1.3, `react-native-verus` 0.6.10, `react-native-randombytes` 3.6.1, `react-native-tcp` 4.0.0,
  `react-native-udp` 4.1.5, `react-native-iap` 12.15.5.

## Versions

| Package or tool | `main` | Branch |
|---|---|---|
| `react-native` | 0.77.3 | 0.88.1 |
| `react` | 18.3.1 | 19.3.1 |
| Architecture | legacy (bridge) | New Architecture, bridgeless |
| `@react-navigation/native` / `stack` / `bottom-tabs` / `material-top-tabs` / `elements` | 6.0.13 / 6.3.4 / 6.6.1 / 6.3.0 / 1.3.17 | 7.5.2 / 7.12.2 / 7.22.0 / 7.8.2 / 2.9.46 |
| `@react-navigation/compat`, `drawer`, `material-bottom-tabs` | 5.3.20, 6.5.0, 6.2.4 | removed (not used) |
| `react-native-tab-view` | 3.5.2 | 4.3.5 |
| `react-native-reanimated` (+ `react-native-worklets`) | 3.17.5 | 4.8.0 (+ 0.14.0) |
| `react-native-gesture-handler` | 2.25.0 | 2.33.1 |
| `react-native-screens` | 4.9.2 | 4.30.1 |
| `react-native-safe-area-context` | 5.3.0 | 5.11.1 |
| `react-native-paper` | 5.12.5 | 5.15.5 |
| `react-native-svg` | 15.12.1 | 15.16.1 |
| `@react-native-async-storage/async-storage` | 2.1.2 | 2.2.0 |
| `@react-native-community/datetimepicker` | 8.2.0 | 8.4.7 |
| `lottie-react-native` | 7.2.4 | 7.5.1 |
| `react-native-vision-camera` | 4.6.4 | 4.7.3 |
| `react-native-pager-view` | 6.7.1 | 6.9.1 |
| `@react-native-community/cli` | 15.0.1 | 20.2.0 |
| Gradle / Android Gradle Plugin / Kotlin | 8.10.2 / 8.7.2 / 2.0.21 | 9.4.1 / 9.2.1 / 2.2.0 |
| compileSdk / targetSdk / minSdk | 36 / 36 / 24 | 37 / 36 / 24 |
| NDK | 27.0.12077973 | 27.1.12297006 |
| iOS React Native core | built from source | prebuilt frameworks (0.88 default) |

## Fixes, with commits

| Commit | Fix |
|---|---|
| `a0323091` | `ios/Podfile.lock` listed three native modules too few (B2). |
| `564114b6` | New Architecture on at 0.77.3 (`newArchEnabled`, `RCT_NEW_ARCH_ENABLED`, `fabric_enabled`). |
| `d4192233` | Text inputs lost focus under Fabric (a focus shadow moved the input to a new native parent). |
| `5d58afc0` | The native-module probe (S02) used a bridge-only check. |
| `ad6a9b41` | Android `MainApplication` gets a `ReactHost` for bridgeless mode. |
| `65b329ac` | `VerusLightClient` did not load on Android under the New Architecture (`react-native-verus` load patch, P1-3). |
| `d3ecd9c0` | React Native 0.81.6 and React 19.1.4. |
| `7db9b34a` | React 19 ignores `Text.defaultProps`; a `react-native` patch keeps font scaling off. |
| `28f60c32` | iOS launch crash: `SceneDelegate` forwarded a method that `RCTAppDelegate` no longer has. |
| `5caeaa76` | `react-native-iap` 12.15.5 did not compile on 0.81 (Kotlin `currentActivity`, compile patch). |
| `1619eedf` | `isHermesEnabled` type in `MainApplication` (Android). |
| `67cd75b3` | Seed-step Back and Next buttons wrapped on 0.81. |
| `1e08b367` | Four identity test suites adapted to the React 19 test renderer. |
| `fcde8e60`, `810e5bb8`, `cfbf964f`, `c3237164` | React Navigation 7: compat `NavigationActions.back()` replaced, v6 `navigate` behaviour kept, renamed options, theme fonts. |
| `10a265e5` | React Navigation 6 header height and tab bar layout kept (`@react-navigation/elements` patch and tab options). |
| `46fd2b73` | `react-native-os` and `react-native-image-picker` compile against the prebuilt iOS core. |
| `89271440` | React Native 0.88.1, React 19.3.1, Gradle 9, AGP 9, Kotlin 2.2, SDK 37, 0.88 `MainApplication`. |
| `7e50e3e3` | APIs removed in 0.85–0.87: `absoluteFillObject`, `StatusBar` `translucent` / `backgroundColor`. |
| `334809b2` | Android Gradle 9 configuration of `react-native-os`, `react-native-tcp` and AsyncStorage (KSP version). |
| `dfd82364` | AsyncStorage's Room 2.4.2 compiler failed under KSP2: `ksp.useKSP2=false` keeps KSP1, so the stored database code does not change. |
| `7196331a` | Paper 5.15 `TextInput` red box ("fontWeight of undefined") on the MD2 theme: theme moved to `src/globals/paperTheme.js`, with empty MD2 font entries (no font change). |
| `77c6c9bc` | iOS links opened while the app runs did nothing on 0.88: `SceneDelegate` uses the `RCTLinkingManager` scene methods. |
| `3422f152` | The install fails when a patch in `patches/` is not applied (`scripts/check-patches.js`). |
| `9931e56b`, `5828fccb`, `de5b8e28`, `5deba266` | Review fixes: S02 probe exit code, `Gemfile.lock` dependencies, README versions, tab bar overrides only for labels under icons. |

Each patch is a file in `patches/`, applied by `patch-package` at install.

## What was tested, and how

Each phase ran on an iOS simulator (this Mac, Xcode 27.2, iOS 26.5 runtime) and on two Android 16 emulators
(Pixel 9 size and a 360×640 dp phone, on a separate PC), with testnet (VRSCTEST) profiles only.

- **Migration (each phase).** A profile created by the `main` build was kept on the device. Each new build was
  installed over it (Android `install -r` with the same key). Then: the profile is listed, unlocks with its
  password (and Face ID on iOS), shows the same address and balance, and pays a VerusPay invoice. Final phase 4
  payments: iOS `473d980f…8a64`, Android `4b54720c…b187`.
- **Smoke checks S01–S26** ([smoke-checklist.md](smoke-checklist.md)): native-module probe, profile create and
  import, receive, send, invoice, lock and unlock, biometrics, settings, services, NFC, logs.
- **Navigation checks N01–N26** (phase 3 and 4): onboarding Back steps, the tab and stack routes that the
  React Navigation 7 audit changed, deep links (warm and cold), modals and top tabs, and the header and tab bar
  geometry, compared with the phase 2 build by pixel and layout bounds.
- **Release builds (phase 4).** iOS simulator Release and an Android Release APK signed with the debug key: each
  starts without Metro, unlocks the migrated profile and shows Home. Nothing was sent from a Release build.
- **Jest.** Compared after each phase with the baseline. The same 29 suites fail as on `main` (B7); one new suite
  (`paperTheme.unit.test.js`) passes. Final: 2588 passed, 103 failed, 68 skipped.
- **Review.** Codex (`gpt-6.2-astra`) reviewed the full diff; see [phase-4.md](phase-4.md#review).

## What was not tested

- A physical iPhone or Android phone. A device Release build with the real Valu signing key and App Store /
  Play Store builds.
- Mainnet profiles and real funds.
- Android 14 or older (the status-bar code for those versions is checked by source only), and tablets.
- In-app purchases (`react-native-iap`: probe only), NFC hardware, the camera on iOS (no simulator camera), image
  picker, in-app browser, video, camera roll, date picker.
- Biometric unlock on Android (no enrolled biometrics on the emulator; S18/S21 blocked as at baseline).
- N19/N20 (testnet server error, as before the upgrade) and the Convert form beyond its first step.
- ESLint (B1).

## Baseline defects not touched

These defects were already on `main` before the upgrade ([baseline.md](baseline.md)). The upgrade does not fix
them on purpose.

| Id | Defect |
|---|---|
| B1 | ESLint does not run: `eslint-plugin-import` 2.20.2 does not work with `eslint` 8.19.0. |
| B3 | `VerusKeepAwake` is not compiled on iOS (broken Xcode project IDs). `pod install` now drops the broken IDs; the module is still not added to the iOS target. |
| B4 | The iOS target copies `ios/main.jsbundle` in every configuration. A clean build fails until that file exists. |
| B5 | Send / convert on a testnet profile shows a red box ("Property 'e' doesn't exist", `SendWizardSelectTarget.js`) and then a blank app. It did not show in the phase 4 runs; the cause was not checked, so do not count it as fixed. |
| B6 | "Lock profile" with Services → Proof of Personhood open shows a red box (`seeds` of null) and does not sign out. |
| B7 | 29 Jest suites fail at baseline. The same 29 fail at the end. |

B2 (incomplete `Podfile.lock`) is fixed in `a0323091`.

## Open items

Details and recommendations are in [phase-4.md](phase-4.md#open-items) and [phase-3.md](phase-3.md#open-items).

1. 15 native modules, among them all key and funds modules, still use the legacy interop layer. React Native
   will remove that layer in a future release. Each move is a version change.
2. Core `SafeAreaView` (83 files) is deprecated. A move to `react-native-safe-area-context` is a UI change.
3. AsyncStorage keeps Room 2.4.2 under KSP1. A later Room needs an in-place upgrade test with stored profiles.
4. AGP 10 removes the Gradle opt-outs and the legacy variant API in `android/app/build.gradle`.
5. Send → Saved addresses → Manage after a fresh start leaves Address book with no way back (most likely the same
   in React Navigation 6).
6. Camera session red box after the Scan tab and an invoice link (Android, seen in phases 2–4).
7. "Invalid address format" on Convert → Send to self (Android; not compared, because B5 blocked the path
   before).
8. Paper components never used the Source Sans Pro font config; applying it is a redesign decision.
9. The v6 header and tab bar geometry patches can go if the redesign takes the React Navigation 7 defaults.

## How to build

- **Toolchain.** Node 22 (0.88 needs `^22.13`, `^24.3` or `>=26`), pnpm 12.6.0 through Corepack, Xcode 27.2,
  CocoaPods 1.16.2, JDK 17, Android SDK 37 with Build-Tools 37.0.0 and NDK 27.1.12297006.
- **Install.** `corepack pnpm install --frozen-lockfile`. Check that `patch-package` lists every file in
  `patches/` with a tick. If a patch file changed, delete that package from `node_modules` and install again
  ([android-build.md](android-build.md)).
- **iOS.** `cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`. CocoaPods fails with an ASCII locale.
- **`ios/main.jsbundle` (B4).** The file is git-ignored but the Xcode target copies it. For a Debug build,
  `touch ios/main.jsbundle` is enough. For a Release build, make the real bundle first with
  `corepack pnpm bundle-ios`; an empty file gives an app that does not start.
- **Android keystore.** The Debug build signs with `android/keystores/debug.keystore`, which is git-ignored. The
  Release build signs with the key in `keystore.properties` (or the `MYAPP_RELEASE_*` CI variables); without it,
  the Release APK is unsigned. The upgrade's Release check used the debug key. Make it once per machine ([android-build.md](android-build.md)) and keep a copy. Always
  install over an existing app with the same key: a different key forces an uninstall, and an uninstall deletes
  every stored profile.
- **Windows.** Set Git Bash as the pnpm script shell before `pnpm install`.
