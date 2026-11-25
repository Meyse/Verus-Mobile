# Phase 3: React Navigation 6 to 7

Phase 3 moves React Navigation from 6 to 7 and `react-native-tab-view` from 3 to 4. React Native stays on 0.81.6
and React on 19.1.4. The app keeps the JS stack (`@react-navigation/stack`) and the JS bottom tabs. There is no
native stack, no native tabs and no intended UI change. The references are [phase-2.md](phase-2.md) and
[smoke-checklist.md](smoke-checklist.md).

## Commits

Branch `claude/rn-upgrade`, on top of `1e08b367`:

| Commit | Change |
|---|---|
| `fcde8e60` | Remove `@react-navigation/compat`: `NavigationActions.back()` becomes `CommonActions.goBack()`. |
| `810e5bb8` | Version upgrade. Remove the drawer and material-bottom-tabs packages. Jest transforms the ESM-only v7 packages. |
| `cfbf964f` | Navigate audit fixes: keep the v6 result of each `navigate` call (see "Sites that needed a change"). |
| `c3237164` | Renamed options, `HeaderBackButton` import, uppercase top-tab labels. |
| `35fc59b1` | `phase-3.md` and the navigation checks in `smoke-checklist.md`. |
| `10a265e5` | Keep the v6 header and tab bar geometry (see "Geometry kept from v6"). |
| (this commit) | Device and Jest results; checklist wording for N05, N06, N13, N18. |

## Versions

| Package | Before | After | Peer requirements of the new version |
|---|---|---|---|
| @react-navigation/native | 6.0.13 | 7.5.2 | react >= 18.2.0, react-native any |
| @react-navigation/stack | 6.3.4 | 7.12.2 | native ^7.5.2, react-native-screens >= 4.0.0, gesture-handler >= 2.0.0, safe-area-context >= 4.0.0 |
| @react-navigation/bottom-tabs | ^6.6.1 | 7.22.0 | native ^7.5.2, react-native-screens >= 4.0.0, safe-area-context >= 4.0.0 |
| @react-navigation/material-top-tabs | 6.3.0 | 7.8.2 | native ^7.5.2, react-native-pager-view >= 6.0.0, safe-area-context >= 4.0.0 |
| @react-navigation/elements | 1.3.17 | 2.9.46 | native ^7.5.2; masked-view optional |
| react-native-tab-view | 3.5.2 | 4.3.5 | react-native-pager-view >= 6.0.0 |
| @react-navigation/core, routers (resolved) | 6.4.x, 6.1.8 | 7.25.0, 7.6.6 | |
| react-native-screens | 4.24.0 | no change | Satisfies >= 4.0.0. |
| react-native-gesture-handler, safe-area-context, pager-view | 2.28.0, 5.6.2, 6.9.1 | no change | |

`pnpm install` shows no peer warning for a navigation package. The new transitive packages are JS only:
`standard-navigation` 0.0.9, `use-latest-callback`, `sf-symbols-typescript`, `use-sync-external-store` 1.7.0
(react-redux keeps its own 1.2.0). The key, credential and funds modules (keychain, react-native-verus,
randombytes, tcp, udp, iap) did not change. All 8 patches in `patches/` apply.

### Removed packages

| Package | Version | Why it could go |
|---|---|---|
| @react-navigation/compat | 5.3.20 | A v5 bridge. 17 files imported it, 16 of them for `NavigationActions.back()`. With no argument, that call returns `CommonActions.goBack()`, so the change keeps the same target. `InvoicePaymentConfiguration.js` had only an unused import. `VerusPay.js` imported `CommonActions` from `@react-navigation/routers`; it now imports it from `@react-navigation/native`. |
| @react-navigation/drawer | 6.5.0 | No navigator uses it since the side menu was removed (2025-11-22). Two Jest files had a stale `jest.mock` line for it; the lines were removed. |
| @react-navigation/material-bottom-tabs | 6.2.4 | No module imports it. |

No source, test or config file imports a removed package (`git grep`, outside `docs/` and the lockfile).

### Jest config

The v7 packages ship only ES modules (`lib/module`). `transformIgnorePatterns` in `package.json` now also lets
Babel transform `@react-navigation/*` and `standard-navigation`.

### Native change

None expected. No new package has native code, so `pod install` and Gradle only re-link the same modules.

## Navigator tree

Signed in (the route names are the names in the source):

```
Root stack (RootStackScreens; one of the four first routes, plus DeepLink)
├─ SignedInStack → MainStack (stack)
│  ├─ Home → HomeTabs (bottom tabs)
│  │  ├─ WalletHome → WalletStack: Wallets, CoinMenus, Service, PersonalProfileStack, Notifications,
│  │  │                UsdcBridgeScreen/Progress, VerusToEvmScreen/Progress, EvmToFiatScreen/Progress
│  │  ├─ ServicesHome → ServicesStack: Services, Service, IdentityRegistration, IdentityManagement,
│  │  │                LinkIdentities, Wyre screens, GiftCardCreate, GiftCardFund, ViewAttestation,
│  │  │                ValuAttestation, ValuOnRampChooseSource, ValuAttestationAccept, ValuChooseIdentity,
│  │  │                AddressBook, GetSponsoredAttestation, Notifications
│  │  ├─ IdentityTab → IdentityStack: IdentityHome, VerusIdDetails, ViewAttestation, IdentityRegistration
│  │  ├─ SettingsHome → SettingsStack: SettingsMenus, ProfileSettings, WalletSettings, AppInfo, ... (no bell)
│  │  └─ VerusPay
│  ├─ AddCoin, CoinDetails, DisplaySeed, CoinMenus, ReceiveAssetsList, ReceiveAssetDetails, SettingsMenus,
│  │  ProfileInfo, ResetPwd, RecoverSeed, GeneralWalletSettings, AddressBlocklist, VrpcOverrides, NfcBackup,
│  │  CoinSettings, DeleteProfile, SecureLoading, ValuSocial
│  └─ SendWizard (stack): SelectSource, SelectTarget, Amount, Recipient, Confirm, Success
├─ SignedOutStack: Unlock, SignIn, RecoverSeed, DisplaySeed, DeleteProfile, SecureLoading,
│  CreateProfile, RevokeRecover (Slider, ImportWallet, IdentityForm),
│  RecoverSeeds (RecoverSeedsSelectAccount, DisplaySeed), ProvisioningDeeplinks
├─ SignedOutNoKeyStack: LandingScreen, WelcomeSlider, CreateProfile, SignIn
├─ LoadingStack
└─ DeepLink (stack): VerifyDeepLink, LoginRequestIdentity, AuthenticationRequestIdentity, LoginRequestComplete,
   GenericRequestComplete, InvoicePaymentConfiguration, PersonalSelectData, ProfileStackScreens,
   LoginReceiveAttestation, LoginShareAttestation, LoginSignDataRequest, ViewAttestation

CreateProfile (stack): ChooseName, CreatePassword, ConfirmPassword, UseBiometrics,
   CreateWallet (stack): WalletIntro, CreateSeed (SeedIntro, SeedWords),
                         ImportWallet (ImportIntro, ImportText, ScanQr, ImportSeed, ImportNfc)
IdentityRegistration (stack): Start, Create, CommitmentReview*, Progress*, Review*   (* getId = jobId)
IdentityManagement (stack): Modify, Transfer, UpdateReview, UpdateResult
```

Separate `NavigationContainer`s: `SendModal` (stack, then top tabs FORM / CONFIRM / RESULT) and
`VdxfUniValueModal` (stack, then top tabs). Both render through a react-native-paper `Portal` into the
`Portal.Host` next to the main container, so they are not nested in it. v7 needs no `NavigationIndependentTree`.
`ConvertCardModal` and `PartialSignDataModal` are not reachable (only dead code uses them).

The root stack sets `mode: 'modal'` in `screenOptions`. That option had no effect in v6 and has none in v7. No
change. The `LoginRequestInfo` and `InvoiceInfo` root screens are not used as routes; `VerifyDeepLink` renders
these components.

## What changed in v7 that matters to this app

1. **`navigate(name)` no longer goes back.** v6 went back to an existing route of that name in the stack, and
   closed the routes above it. v7 does that only for the focused route (it updates the params). For any other
   route it pushes a new copy. `navigate(name, params, {pop: true})` gives the v6 result. In a nested navigate,
   `pop: true` goes in the params (`{screen, params, pop: true}`); v7 passes it to the child navigator.
2. **`navigate(name)` no longer searches child navigators.** v6 tried the current navigator, then each parent,
   and then the mounted child navigators that it did not try yet. When a child navigator handled the action, v6
   moved the focus to it (it switched the tab and closed the routes above it in each parent stack). v7 tries the
   current navigator and the parents only. When no navigator has the route, nothing happens; a development
   build logs "The action 'NAVIGATE' ... was not handled by any navigator".
3. **Routes with `getId`.** v6 went back to the route with the same id. v7 moves that route to the top of the
   stack. `pop: true` gives the v6 result.
4. Unchanged for this app: `goBack` and its bubbling to the parent, `reset` (v7 no longer passes a reset to a
   child navigator, but every reset target here is in the same navigator or a parent), `replace`, `push`,
   `popToTop`, `setParams`, `getParent`.
5. In development, v7 freezes the navigation state (not the params). No app code changes a route or the state.

`navigationInChildEnabled` (on `NavigationContainer`) would bring back the v6 child search for every call.
It is not used: only 5 call sites need the search, and the prop is a temporary migration aid.

## Audit method and counts

Method:

1. Map the navigator tree from the source (above).
2. Find every call with `git grep` at `810e5bb8`, outside the tests.
3. For each call, find the navigator that owns the screen, the target, and the state the stack can be in when
   the call runs. Read the v6 and the v7 router and core code to compare the result.
4. Class (a): forward only, or the same result in v6 and v7. Class (b): the result can change.
5. Fix each (b) site so the v7 result is the v6 result. Add nothing beyond v6 behaviour.

| API | Calls | (a) | (b), changed | (b), not changed |
|---|---|---|---|---|
| `navigate(` | 206 | 172 | 33 | 1 |
| `CommonActions.reset` / `.reset(` | 31 / 6 | 37 | 0 | 0 |
| `goBack(` | 74 | 74 | 0 | 0 |
| `dispatch(CommonActions…)` | 23 | 23 | 0 | 0 |
| `replace(` / `push(` / `popToTop(` | 10 / 2 / 1 | 13 | 0 | 0 |
| `getParent(` / `setParams(` | 6 / 4 | 10 | 0 | 0 |
| `dangerouslyGetParent` | 1 | 1 (a fallback after `getParent`; never called) | 0 | 0 |
| linking config, `onReady`, `theme`, `independent` | 0 | | | |
| `NavigationContainer` | 4 (main, SendModal, VdxfUniValueModal, ConvertCardModal) | 4 | 0 | 0 |

The (a) class includes the 38 SendModal step navigates (a tab switch in the same top-tab navigator) and the
calls in dead code: the old `Identity/*` views, `SideMenu`, `Login`, `Assets`, the old Activity, Assets and
Convert stacks, `ManageCoin`, `PartialSignDataModal`, the Wyre `ManageWyreAccount` and `PersonalHome` targets
(no such route), `Overview` → `TxDetails` (no such route), and `createValuAttestationNavigationCallback`
(not called).

## Sites that needed a change

Line numbers are at `810e5bb8` (before the fix).

| File:line | Call | v6 result | v7 risk | Decision | Why |
|---|---|---|---|---|---|
| `Onboard/CreateProfile/Forms/ChooseName.js:71`, `CreatePassword.js:89,91`, `ConfirmPassword.js:37,39`, `UseBiometrics.js:23,26`; `CreateWallet/Forms/WalletIntro.js:82,148`; `CreateSeed/Forms/SeedIntro.js:139` | `navigate('CreatePassword')` and the other next steps | The form had the parent stack navigation. v6 found the step in the child CreateProfile, CreateWallet or CreateSeed stack. | Next does nothing. Onboarding stops at the first step. | Each screen passes its own stack navigation to the form (`CreateProfile.js`, `CreateWallet.js`, `CreateSeed.js`). | Same pattern as `ImportWallet`. The forms call only `navigate`, so Back is not affected. |
| `RevokeRecover/RevokeRecoverSlider.js:33`; `RevokeRecoverStackScreens.js:20` | `navigate('ImportWallet')`, `navigate('IdentityForm')` | Same as above (SignedOutStack navigation, child search). | Revoke/recover stops at the slider or after the import. | Slider gets the RevokeRecover stack navigation; the import completion uses it too. | The Slider "Skip" `goBack` still bubbles to the SignedOutStack and closes the flow, as in v6. |
| `Transfer/ReceiveAssetDetails.js:647` | `navigate('Home')` | Back to Home (closes Receive screens). | Pushes a second HomeTabs on MainStack. | `{pop: true}` | Restores the go-back. |
| `SendWizard/SendWizardSuccess.js:350` | `navigate('Home', {screen: 'WalletHome'})` (fallback after `reset`) | Back to Home, Wallet tab. | Pushes a second Home. | `{pop: true}` | Fallback only; the main path uses `reset`. |
| `UsdcBridge/UsdcBridgeProgressScreen.js:131`, `VerusToEvmProgressScreen.js:122`, `EvmToFiatProgressScreen.js:105` | `navigate('Wallets')` | Back to the Wallets screen. | Pushes a second Wallets on WalletStack. | `{pop: true}` | Restores the go-back. |
| `Coin/CoinMenus.js:260` | `navigate('Home', {screen: 'ServicesHome', initial: false})` | From MainStack: back to Home, Services tab. | Pushes a second Home. | `{pop: true}` | From WalletStack the result is the same with or without `pop`. |
| `IdentityRegistration/RegistrationScreens.js:640, 802` | `navigate('IdentityRegistrationStart')` ("Save for later", progress overview) | Back to the VerusID list. | Pushes a second list. | `{pop: true}` | Restores the go-back. |
| `ValuChooseIdentity/ValuChooseIdentity.js:87` | `navigate(returnScreen, {chosenIdentity, continueFlow})` | Back to ValuAttestation with the new params. | Pushes a second ValuAttestation. | `{pop: true}` | The flow reads the params on the old screen. |
| `ValuAttestation/ValuAttestation.js:239`; `GetSponsoredAttestation/GetSponsoredAttestation.js:182` | `parentNav.navigate('ServicesHome', {screen: 'Service', params})` | Back to the Service screen (attestations). | Pushes a second Service. | `pop: true` in the nested params | Restores the go-back. |
| `utils/pop/popNotificationHelper.js:206, 219` | `navigate('Home', {screen: 'ServicesHome', params: {screen: ...}})` | Service or GetSponsoredAttestation, existing route reused. | Pushes a copy. | `pop: true` at each level | Same as above. |
| `SignedInStackScreens.js:30`, `SignedOutStackScreens.js:37`, `SignedOutNoKeyStackScreens.js:26` | `navigate('DeepLink', {screen: 'VerifyDeepLink'})` | A new deeplink while one is open goes back to VerifyDeepLink. | Pushes a second VerifyDeepLink above the open request. | `pop: true` in the params and as option | Restores the go-back. The Jest test checks the resulting stack. |
| `utils/navigation/header.js:66` | `navigate('Notifications')` (bell) | Only the Wallet and Services stacks have Notifications. From the other screens with a bell (MainStack screens such as AddCoin, SendWizard, DeepLink ViewAttestation), v6 found it in a mounted tab stack. | The bell does nothing on those screens. | `navigateByPath` (new helper) through SignedInStack → Home → tab → Notifications. | See "navigateByPath". |
| `SignedInStackScreens.js:40` | `navigate('Service', {service: VALU, subScreen: 'ValuOffRampReview'})` (root navigation) | Found Service in a mounted tab stack. | The off-ramp review does not open. | `navigateByPath`, same path to Service. | Funds-adjacent flow; must open. |
| `AttestationService/AttestationService.js:93` | `navigate('ViewAttestation')` | In ServicesStack: forward. In WalletStack (no ViewAttestation): child search. | No-op in WalletStack. | `navigateByPath(['ServicesHome', 'ViewAttestation'])` | In ServicesStack the call is the same as before. |
| `SendWizard/SendWizardRecipient.js:338` | `navigate('ServicesHome', {screen: 'AddressBook'})` | Child search from SendWizard found the tab, closed SendWizard and opened AddressBook. | No-op. | `navigateByPath(['Home', 'ServicesHome', 'AddressBook'])` | Same result as v6. |
| `DeepLink/LoginRequestComplete/LoginRequestComplete.js:81` | `navigate('ServicesHome', {screen: fromService, params})` | Child search found the Services tab and closed DeepLink. `fromService` is a service ID, not a screen, so the nested part failed in v6 too. | No-op: the deeplink stays open. | `navigateByPath(['SignedInStack', 'Home', 'ServicesHome'], {screen: fromService, ...})` | Restores the v6 result, including the failed nested part (see open items). |

Not changed: `utils/identityRegistration/notifications.js:53` (`navigate('ServicesHome', {screen: 'IdentityRegistrationProgress', ...})`,
a `getId` route). Its only caller is `NotificationWidget`, and `Home.render.js:113` renders `<NotificationWidget />`
without a `navigation` prop. A tap throws a TypeError in v6 and in v7. This is a defect from before the upgrade
(see open items). `UsdcBridgeNotification` (`notification.js:142`) has the same caller and the same defect; its
target is in the same stack, so it is (a).

### navigateByPath

`src/utils/navigation/navigateByPath.js` takes the full route path, from an outer navigator to the screen. It finds
the deepest route on the path that the current navigator or a parent owns. Then it navigates through the rest
of the path, with `pop: true` at each level. Thus an existing route is reused, and the routes above it close, as
the v6 focus change did. When no navigator on the path is mounted (for example the bell while signed out), it
makes the original call, which does nothing, as in v6.

Tab choice (`getHomeTabFor`): Notifications and Service are in both the Wallet and the Services tab stacks. v6
used the most recently mounted of the two (Services after the user opened that tab once, else Wallet). The
helper uses the focused tab if it is Wallet or Services, else the Wallet tab. The result differs from v6 only
when the user is on another tab (or a MainStack screen above it) and opened the Services tab earlier: v6 opened
Notifications in the Services tab, the new code opens it in the Wallet tab. Both show the same screen.

## Renamed options and theme

| Old | New | Where |
|---|---|---|
| `headerBackTitleVisible: false` | `headerBackButtonDisplayMode: 'minimal'` | WalletStack (7), ServicesStack (2), ProfileStack, IdentityManagement, IdentityRegistration, Assets (dead) |
| `HeaderBackButton` from `@react-navigation/stack` | from `@react-navigation/elements` | `utils/navigation/customBack.js`. The default `displayMode` is the v6 default (title on iOS, arrow only on Android). |
| Top-tab label `textTransform: 'uppercase'` (v6 default) | Not a v7 default; set in `tabBarLabelStyle` | SendModal, VdxfUniValueModal, ConvertCardModal |

Options checked that need no change: `headerBackTitle`, `headerMode: 'screen'`, `gestureEnabled`,
`detachInactiveScreens`, `backBehavior`, `swipeEnabled`, `lazy`, `lazyPlaceholder`, `tabBarPressColor`,
`tabBarPressOpacity`, `tabBarStyle`, `tabBarLabelStyle`. `react-native-tab-view` is used directly only by
`ManageCoin` (dead); its `TabBar` `indicatorStyle` is still valid in 4.x.

Theme: the app passes no `theme` to any `NavigationContainer`. The v7 default theme includes the new `fonts`
key, so no theme change is needed. The header title style is the same as in v6.

### Geometry kept from v6

The iOS device check found three size changes from the v7 defaults. Phase 3 must not change the UI, so
`10a265e5` restores the v6 values:

| Change in v7 | v6 value kept by | Where |
|---|---|---|
| Stack header on iOS phones with a Dynamic Island: about 5.3 pt shorter (`getDefaultHeaderHeight` subtracts `5 + 1/PixelRatio` from the top inset). Header bottom on the iPhone 17 Pro: 106 → 100.5 pt. | `patches/@react-navigation+elements+2.9.46.patch`: 44 pt + top inset | All stack headers |
| Stack header on Android: 64 dp (v6: 56 dp). | Same patch: 56 dp on Android | All stack headers |
| Bottom tab bar: full bottom inset (v6: inset − 4 pt on iOS), icon and label aligned from the top of a padded tab (v6: label at the bottom, icon centred above it). Bar 4 pt taller, labels 5.3 pt higher. | `HomeTabScreens.js`: `tabBarStyle` height and `paddingBottom`, a `tabBarButton` with no padding and `justifyContent: 'flex-end'`, `tabBarIconStyle: { flex: 1 }` | Home tabs |

The app is portrait-only and phone-only (`TARGETED_DEVICE_FAMILY = 1`), so the side-label tab layout does not
occur. Top-tab label size: v7 uses 14 by default (v6 13). The three modals set `fontSize: 12`, so they do not
change.

Check on iOS (iPhone 17 Pro simulator, phase 3 JS with `10a265e5`): the tab bar area (y ≥ 760 pt) matches the
phase 2 screenshot with 0 differing pixels (before the fix: 22,794). The Gift Cards header ends at 106.0 pt
(phase 2: 106–107, 1x screenshot; before the fix: 101). Screenshots:
`~/.cache/valu-wallet-upgrade/phase3/ios/geom/`.

## Jest

`corepack pnpm test --ci` at `c3237164`:

| | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Suites | 197 | 166 | 29 | 2 |
| Tests | 2756 | 2585 | 103 | 68 |
| Phase 2 final | 196 suites / 2751 tests | 161 / 2542 | 33 / 141 | 2 / 68 |

- The 29 failing suites are the baseline suites (B7). Each fails with the same count as in phase 2, except the
  live-network `coinpaprika` suite (66 failed, phase 2 90; it changes from run to run).
- The four suites that failed newly in phase 2 now pass, after `1e08b367` adapted them to the React 19 test
  renderer.
- New suite: `navigateByPath.unit.test.js` (5 tests).
- Changed tests: `deeplinkParserLifecycle`, `identityRegistrationScreens` and `genericRequestCompletionLifecycle`
  pinned the exact `navigate` arguments. They now expect the added `pop` option. The assertions on the
  resulting stack did not change. The `genericRequestCompletionLifecycle` router mock now passes `pop` to the
  real v7 `StackRouter`, as React Navigation does; without `pop` the stack check fails
  (`['VerifyDeepLink', 'GenericRequestComplete', 'VerifyDeepLink']`). That suite still fails to load at baseline
  (`fqnToAddress is not a function`). `profileCreationSubmission` renders the changed onboarding screens; it
  fails as in phase 2 (no `SafeAreaProvider` in the test).

Raw results: `~/.cache/valu-wallet-upgrade/logs/jest-phase3.json`.

Final run at `10a265e5` (after the device checks): 197 suites, 29 failed (the same 29); tests 2561 passed,
127 failed, 68 skipped. The only change from the run above is `coinpaprika` (90 failed, as in phase 2; live
network). No new failing suite or test. Raw results: `~/.cache/valu-wallet-upgrade/logs/jest-phase3-geom.json`.

## Lint

Same as baseline: ESLint does not run (B1).

## iOS device results

iPhone 17 Pro simulator (iOS 26.5), the phase 2 Debug build (phase 3 changes no native code), JS served by Metro
from each checkout. Phase 2 JS (`cb6385cc`) ran first as the reference, then phase 3 JS (`35fc59b1`).
Result: **PASS**.

| Check | Phase 3 JS | Same as phase 2 JS |
|---|---|---|
| M1 profile list (incl. `ValuBaseIOS`) | PASS | yes |
| M2 password unlock, same address, balance 0.4596 | PASS | yes |
| M3 Face ID | PASS | yes |
| M4 testnet invoice payment | PASS, txid `a66a7ce2ea55bffe8c82afb1ade2e6f5ec611258840a451d137951b9a3f558e3` | yes (phase 2 JS paid `2e60bf61…`) |
| N01–N06, N08, N12–N18, N21–N26 | PASS | yes |
| N07 bell with the Services tab opened before | Notifications opens in the Wallet tab (phase 2: Services tab) | no: the documented `navigateByPath` tab rule |
| N09–N11 | BLOCKED by B5 (send red box) | yes, same block |
| N19–N20 | BLOCKED: testnet server error `getblock tip: Method not found` | yes, same block |
| S02–S26 | PASS (S14 is B5; S25 N/A on testnet) | yes |

Logs: no "was not handled by any navigator", no red box from navigation, and no React Navigation deprecation
warning. The v6 `TabBarItem` key warning is gone. The core `SafeAreaView` deprecation warning shows as in phase 2
(phase 4 item).

Small differences seen (not defects): on the profile-name step reached with Back, the keyboard shows with the
field focused (phase 2: not focused). The top-tab accessibility labels are now `Confirm` / `Result` (phase 2:
`CONFIRM, CONFIRM`); the visible text is uppercase in both.

Evidence: `~/.cache/valu-wallet-upgrade/phase3/ios/` (phase 2 references in `p2-ref/`), console log
`~/.cache/valu-wallet-upgrade/logs/js-console-phase3-ios.log`.

## Android device results

Game PC slot s2, Pixel 9 (Android 16) and the small phone (360 × 640 dp), the phase 2 Debug build `1619eedf`
(phase 3 changes no native code). Metro served phase 2 JS (`cb6385cc`) first, then phase 3 JS (`35fc59b1`), each
from its own checkout with all patches applied. Result: **PASS**.

| Check | Phase 3 JS | Same as phase 2 JS |
|---|---|---|
| M1 profile list ("QA Baseline Restore") | PASS | yes |
| M2 password unlock, same address `RMSZ4…Pj9bW`, balance 0.4697 (after the 0.0101 phase 2 N17 payment) | PASS | yes |
| M3 | N/A (no Face ID on the emulator) | — |
| M4 testnet invoice payment | PASS, txid `3a9c29ba562eb4ff83300b748a61ed359e235c0a29d5dd103791f0cfd8f771a7` | yes (phase 2 JS paid `851c7c7f…3bf9`) |
| N01–N05, N08, N12–N18, N21–N23, N25 | PASS | yes |
| N06, N07 | N/A: no bell on testnet profiles | yes |
| N09–N11, N19–N20 | BLOCKED (B5; testnet `getblock tip: Method not found`) | yes, same blocks |
| N24 tab bar / header | see below | — |
| N26 log check | clean | better: the v6 `TabBarItem` key warning is gone |
| S02–S26 | PASS (S13 N/A, S14 is B5, S18/S21 BLOCKED as known, S25 iOS only) | yes |
| Small phone: tab bar, onboarding Back steps | PASS | yes |

Before `10a265e5`, Android showed the two v7 sizes: the stack header title 8 dp lower (64 dp header) and the
tab-bar icon 2.7 dp lower; the back-arrow hit area grew from 30 to 48 dp. The Send / Convert top tabs were
identical. No new log line; the known lines (B5, `sepolia` bridge delegator, a unique-key warning in
`ConvertOrCrossChainSendConfirm`, non-serializable navigation params, `SafeAreaView` deprecation, require
cycles) show in both versions. A re-check of `10a265e5` on the same phones follows in this file.

Evidence (Game PC): `%USERPROFILE%\.cache\valu-wallet-upgrade\phase3\android\` (`p2-tabbar.png`,
`p3-tabbar.png`, `p3-N09-send.png`).

## Open items

Decisions for Max:

1. v7 header and tab bar sizes. Phase 3 keeps the v6 sizes (see "Geometry kept from v6"). If the redesign wants
   the v7 defaults, delete the `@react-navigation/elements` patch and the tab options in `HomeTabScreens.js`.
2. Tab choice of `navigateByPath` (see "navigateByPath"). Recommendation: keep the new rule. It does not depend
   on which tabs the user opened before.

Defects from before the upgrade (no change in this phase):

- `NotificationWidget` gets no `navigation` prop (`Home.render.js:113`). A tap on a registration or USDC bridge
  notification in the widget throws a TypeError.
- `LoginRequestComplete` passes a service ID as a screen name, so the return to a service opens the Services
  tab root, not the service.
- `WalletIntro` passes `initialScreen` to ImportWallet, but `CreateWallet.js` does not pass it on, so the import
  always opens on its intro.
- `utils/navigation/resetToScreen.js` calls `navigation.closeDrawer()` without a check. There is no drawer. No app module
  imports the helper (the screens use their own `resetToScreen` methods); only a test calls it.
