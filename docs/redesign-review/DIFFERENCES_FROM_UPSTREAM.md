# Differences from current upstream

This file lists every place where the pull request deliberately differs from, or replaces, recent upstream work on `ui-redesign`. Nothing here is a merge accident. Each row says what the PR does and why, in the row itself. Commit hashes after the sentence are references only.

- Base: `upstream/ui-redesign` at `525aa859`.
- State described: the PR after the first round of review fixes (2026-11-18). Code locations are checked at `redesign` `06be68bd` (PR head `4a6da007` plus those fixes). The PR keeps three values that differ from `redesign` on purpose: the mainnet VRSC server, the env values and the package versions. This file gives the PR value.
- Review IDs: `R` = review note, `I` = inline comment of the 2026-11-17 review. "Open" means the item waits for the owner's decision; the row then describes the current code.
- Logic details: [LOGIC_CHANGES.md](LOGIC_CHANGES.md). Review guide: [README.md](README.md).

## Decisions by the design owner

| Area | Upstream | This PR | Reason and consequence |
|---|---|---|---|
| Button styles | `8872ea1b` "Update button styles to be more consistent" (2026-10-17) changes `StandardButton`, `LargerButton` and about 35 legacy screens. | Merged with the fork side kept (`b923f537`). The 35 files show their older code; see [the list](#files-that-show-older-upstream-code). | The redesign has one button system (`AppButton`, `TextAction`), and the redesigned navigation does not mount the legacy screens. Two exceptions, not checked on a device: `LinkIdentityForm.render.js` can still open from the v1 login request screen, and the `TraditionalCryptoSend` steps can still open from older scan paths in `VerusPay.js`. They show the older button style. |
| Link VerusID page | `525aa859` adds a permanent "Link identity manually" button. | Manual entry shows only when the lookup fails and returns no rows ("Enter VerusID manually", `LinkIdentities.js:323`). Merge `5ab344b2`. | The page leads with the identities that the lookup finds. Consequence: after a successful lookup there is no manual entry, so an identity that the lookup does not return cannot be linked from this page. **Open (I1):** the reviewer asks for manual entry at all times, because the redesign must not lose a function. |
| Selected card after a card list rebuild | `c9d571d0` falls back to the matching card, else `MAIN_WALLET`, else the first card, and drops coins with no cards. | `coinMenus.js:18-37` keeps the matching card or sets `null`, and the card chooser shows. Coins with no cards keep a `null` key. New `userSelectedSubWallets`. | Owner decision: the wallet does not pick a replacement card by itself; the user picks it (`f02602cf`). The stale card object is never used, so upstream's safety goal holds. As upstream, the chooser opens only on a focused screen with a signed-in account and at least one card (`920fda51`). |
| VRPC servers | `6240d074` moves VRSC and VRSCTEST to the V2 servers. | Same as upstream since round 1: VRSCTEST always uses `v2api.verustest.net` (`CoinsList.js:106`), mainnet VRSC uses `v2api.verus.services`. | Review I2: the wallet must not switch to `api.verustest.net` by itself. The automatic V1 fallback for builds without a V2 key is removed, so such a build now fails visibly on testnet calls (`cef9092e`). |
| Versions and env values | - | Unchanged: app version, build number, `VRPC_API_APP_ID`, `ALLOW_HTTP_GENERIC_RESPONSE_POSTS`, the Android `CI=true` scripts, React Native 0.77.3. | The PR restores the upstream values (`01996b42`). Since round 1, `responseDeliverySecurity.js` is the same as upstream again: the flag alone decides whether a response may go to an `http://` URL, in debug and release builds. Review I3 needs release builds with the flag on for testing (`1f25a7fc`). |
| `ENABLE_SIGNED_IN_REDESIGN` | Not in upstream. | Removed from code and env files. The redesigned UI is the only path. Legacy screen files stay in the repository; nothing mounts them. | With the flag off, the VerusID registration, link and manage routes had no tab (`IdentityTab`), so the flag was not a working rollback (`da562817`). The owner chose to keep the legacy files in this PR; deleting them can be a separate change. |

## Upstream logic that the PR changes on purpose

Each row is an upstream commit from 2026-09-01 or later whose lines the PR changes. Verdicts: **Deliberate** (the PR replaces the behavior for a stated reason) or **Equivalent** (same result, different code).

| Upstream commit | File | Verdict | What the PR does | Why |
|---|---|---|---|---|
| `bad1b1cc` shared VRPC refresh coordinator | `src/actions/actions/wallet/dispatchers/vrpc/updates.js` | Deliberate | Keeps `vrpcRefresh` hooks. Adds mempool reads, uncached re-reads while the mempool is not empty, `pending = total - confirmed`, and one history row per txid. | Balance and mempool caches expire at different times, so right after a block one payment was counted twice (`7d351c14`). History showed a pending and a confirmed row for one transaction (`b3a1deb5`). **Open (R13):** balances include unconfirmed funds without a pending label. |
| `bad1b1cc` | `src/utils/vrpc/vrpcInterface.js` | Deliberate | Same shared-read and cache functions, plus a cache generation, `skipCache`, and cache expiry after `sendrawtransaction`. Without a send or `skipCache`, the path equals upstream. | Balances must show a wizard send at once, so a broadcast expires the address caches (`511ed476`). Funding reads skip the cache so that they do not pick an output that a pending transaction spends (`0aa3d050`). |
| `bad1b1cc` | `WalletUpdates.js` | Deliberate | Coordinator kept. Optional `channels` per update; partial reads do not mark the coin fresh; private wallet retry before an info refresh. | A visible screen refreshes its own cards without marking the others fresh (code comment; `c450cd71`). A failed private wallet retries on the info refresh, so unlock does not wait (`2a144900`). |
| `bad1b1cc` | `UpdateLedgerValue.js` | Deliberate | Same actions, same order, dispatched together one tick later. | Each result of one network answer redrew every Home row: about 4 s per result for 11 results on an Android emulator, debug build, not a phone (`ca743b2f`). Round 1 (I4) cut this further; see [network 6](LOGIC_CHANGES.md#network-and-refresh). |
| `8864e4f9` lifecycle refactor | `src/sagas/channels/vrpc.js` | Deliberate | Takes the upstream `createEndpointLifecycle` refactor; keeps the fork's `refreshVrpcDependentState` after channel init. | "Fix VRPC subwallet lifecycle refresh" (`51641012`): the card list and refresh restart once the channel exists. The exact fault is not recorded. |
| `8864e4f9` | `src/utils/navigation/resetToScreen.js` | Deliberate | Calls `closeDrawer()` only if it exists. | The redesigned shell has no drawer, so an unguarded call fails (`f1311422`). |
| `8864e4f9` NFC writer dedup | `src/utils/walletBackup/walletBackupNfc.js` | Deliberate | Keeps `createNdefWriter` and all overwrite guards; runs them through `runNfcSession` with phases and error codes. New "NFC is off" text. | Every NFC read and write shows one tap screen with a step per phase, so the runner reports the phase and coded errors. Card checks and overwrite guards are unchanged (`b7854f5a`). |
| `8056bfce` registration call pacing | `vrpcInterface.js` | Deliberate | Pacing intact; three lines only gain the cache generation argument. `vrpcRequestBatcher.js` and `vrpcRequestMany.js` are unchanged. | The cache generation stops a read that started before a send from writing an old value (`511ed476`). |
| `c9d571d0` VerusID management | `src/reducers/gui/coinMenus.js` | Deliberate | See the decision table above. | Owner decision: the user picks the new card; see the decision table (`f02602cf`). |
| `c9d571d0` | `src/utils/identityRegistration/notifications.js` | Deliberate | Home notice text and tone come from `registrationNoticeState`; action opens the VerusID tab; "Link VerusID" label. | Registration moved to the VerusID tab, so the Home notice shows the approved stage and problem text, celebrates a ready identity once and opens the shared Link sheet (`228d7477`). |
| `c9d571d0` | `src/utils/identityManagement/updateIdentity.js` | Deliberate | Same checks through `validateTransferRecipient` and `assertChangedAuthorities`. New: refuse this wallet's own addresses and wholly owned VerusIDs; `RECIPIENT_NOT_FOUND`; a read-only form check. | Transfer gives the VerusID a new owner, so an address of this wallet is refused before any build (error text in `recipient.js:23`; `5b0d6357`, `a56f6ba7`). The read-only check puts owner-check results under the New owner field (`2b2753c6`). |
| `c9d571d0` | `src/utils/spendableKey/reviewFees.js` | Deliberate | App alert sheet instead of `Alert.alert`; same consent rule. | The redesign shows alerts as the app sheet. Cancel or a dismissal still leaves the claim unapproved (`8c861716`). |
| `c9d571d0` | `src/utils/identityRegistration/registration.js` | Deliberate | Retry of unsigned builds; wait instead of throw on a tip mismatch (script mismatch still throws); `broadcastAt` saved before the send; fixed refusal text. | A new block between the tip read and the commitment read showed a false "not confirmed" error; the job now waits (`7b089908`). The first broadcast time is saved before the send so that a retry keeps the same signed bytes (`5b0d6357`). |
| `c9d571d0` | `identityUpdateRequestValidator.js` | Deliberate | Same conditions and thresholds; typed error codes. | The request screen can show one specific refusal, and the refusal does not offer a useless retry (`406c5cd0`). |
| `9ac1c509` identity registration | `src/actions/actions/services/dispatchers/verusid/verusid.js` | Deliberate | `deleteProvisionedIds(iAddress, chain, completed, requestContext)` with a shim for the old call; stores `completed_provisioning_requests`. | Reason not recorded beyond "Improve VerusID provisioning auth flow" (`377bfe31`). The list feeds [request 4](LOGIC_CHANGES.md#request-validation). |
| `9ac1c509` | `.../verusid/registration.js` | Deliberate | Background pass also checks payer funds for three job states and stores `registrationProblem`. | The Home notice and the registration screens read `registrationProblem` to show "insufficient funds" without opening the job (`noticeState.js`; "Fix New VerusID selection and foreground funds refresh", `59fbfecc`). |
| `9ac1c509` | `notifications.js`, `registration.js` | Deliberate | Stage logic replaced (see `c9d571d0` rows); `getBlock(..., true)`. | Same as the `c9d571d0` rows. The public testnet server refuses numeric `getblock` verbosity with -32601 (`ccc129ab`). |
| `95f56051` duplicate profile / NFC submissions | `src/actions/actions/deeplink/dispatchers/deeplinkNfc.js` | Deliberate | Single-read guard kept; the NFC tap screen replaces the loading modal and alerts. Round 1: Android sets up reader mode first. | The tap screen shows each NFC step (`b7854f5a`). R16: the Scan read failed on Android; it now prepares as the backup write does (`493b022b`). |
| `95f56051` | `src/utils/profile/createProfileFromSeed.js` | Deliberate | Same order; the catch logs a fixed text and calls `onBiometrySetupFailed()`. Duplicate check runs earlier. | A taken name fails before the slow key work (`bd7870e1`). The setup screen reports a biometrics failure itself (`657f1415`). Reason for the fixed log text: not recorded. |
| `6240d074` servers | `src/utils/CoinData/CoinsList.js` | Equivalent | VRSCTEST and mainnet VRSC servers are the upstream values since round 1. | The servers are the upstream values again; see the decision table (I2, `cef9092e`). |
| `78c27108` ERC-20 balance check | `src/utils/api/channels/erc20/requests/send.js` | Deliberate | `sendWithBalanceCheck` kept. With the wizard's fee choice, the transfer also sends `maxPriorityFeePerGas` and refuses a gas estimate above the confirmed limit. | The owner approved a network fee choice for plain sends (`16f16c83`). The signed fee must not exceed the fee that the user confirmed. |
| `a5a68d38` many-UTXO message | `src/utils/vrpc/fundRawTransactionError.js` | Deliberate | Same detection and guide URL; app alert sheet with "Not now". | The redesign shows helper prompts as the app sheet with an action and "Not now" (`8841961c`). |
| `a5a68d38` | `vrpcInterface.js` | Deliberate | `VerusIdInterface` clients get a 30 s timeout. The `fundRawTransaction` binding is kept. | Without a limit, Android keeps a request open for good when the connection drops (`35ef5d62`). |
| `7022a84e` app encryption flow | `src/utils/crypto/getKeyMaterial.js` | Deliberate | Upstream logic; only the missing-key message text differs ("Z recovery secret"). | The app calls the Z seed the "Z recovery secret" in all user text (`7794952b`). |
| `7022a84e` | `src/utils/deeplink/validator/envelopeValidator.js` | Deliberate | Upstream `assertSignedRequestAuthorization` runs unchanged; known messages map to typed errors; a structure check runs first on signed requests. Same accept/reject outcome. | A signed request must also pass the unsigned structure rule (`899a95fb`). Typed errors let the request screen show one specific refusal (`39dabf36`). |
| `f830aa1b` SDK update | `registration.js` | Deliberate | `getBlock(..., true)` and string heights; authority failures tagged with `field` and `code`. | The public testnet server refuses numeric verbosity with -32601 (`ccc129ab`). The tags let the New VerusID form mark the field that failed (`NewRegistrationFlow.js:240`). |
| `6e752f53` z-address for new identities | `updateIdentity.js` | Equivalent | Same `usesRecipientPrivateAddress` value, computed in `transferControls`. | Reason not recorded; the value is now computed with the other recipient checks (`ccc129ab`). |
| `1cfc7252` identity update UI | `src/utils/identityUpdate/contentReview.js` | Deliberate | Same escaped display text; copy returns the original value. | Copy must give the real value, not the escaped display text (`627a0c44`). |
| `74de23bb` CMM update UI | `identityUpdateRequestDetailsHandler.js` | Deliberate | Same condition and message; typed, non-retryable refusal. | Same reason as the validator row: one specific refusal, no useless retry (`406c5cd0`). |
| `90990bf8` data packet hashing | `src/utils/deeplink/dataPacket/signDataPacket.js` | Equivalent | Hash fix kept. Inputs are read before the key prompt; `signHash` gets the loaded identity instead of `undefined`. | The network reads finish before the key is requested, so nothing waits on the network between the last session check and the signature (code comment; `4decf026`). |
| `bf80c4aa` request network validation | `src/utils/deeplink/requestAccounts.js` | Equivalent | Same predicate through `accountIsTestnet`; typed error with the same text. | Typed errors let the request screen show one specific refusal (`39dabf36`). |

## Files that show older upstream code

Because of the `8872ea1b` decision, these files are equal to an older upstream version:

```
src/components/BankTransferDetailsModal/BankTransferDetailsModal.js
src/components/ConvertCardModal/ConvertCardModal.js
src/components/LargerButton.js
src/components/MissingInfoRedirect/MissingInfoRedirect.js
src/components/QRModal.js
src/components/SendModal/ConversionSend/ConversionSendConfirm/ConversionSendConfirm.render.js
src/components/SendModal/ConversionSend/ConversionSendForm/ConversionSendForm.render.js
src/components/SendModal/ConversionSend/ConversionSendResult/ConversionSendResult.render.js
src/components/SendModal/DepositSend/DepositSendConfirm/DepositSendConfirm.render.js
src/components/SendModal/DepositSend/DepositSendForm/DepositSendForm.render.js
src/components/SendModal/DepositSend/DepositSendResult/DepositSendResult.render.js
src/components/SendModal/LinkIdentity/LinkIdentityForm/LinkIdentityForm.render.js
src/components/SendModal/LinkIdentity/LinkIdentityResult/LinkIdentityResult.render.js
src/components/SendModal/ProvisionIdentity/ProvisionIdentityConfirm/ProvisionIdentityConfirm.render.js
src/components/SendModal/ProvisionIdentity/ProvisionIdentityForm/ProvisionIdentityForm.js
src/components/SendModal/ProvisionIdentity/ProvisionIdentityResult/ProvisionIdentityResult.render.js
src/components/SendModal/TraditionalCryptoSend/TraditionalCryptoSendConfirm/TraditionalCryptoSendConfirm.js
src/components/SendModal/TraditionalCryptoSend/TraditionalCryptoSendResult/TraditionalCryptoSendResult.js
src/components/SendModal/WithdrawSend/WithdrawSendConfirm/WithdrawSendConfirm.render.js
src/components/SendModal/WithdrawSend/WithdrawSendForm/WithdrawSendForm.render.js
src/components/SendModal/WithdrawSend/WithdrawSendResult/WithdrawSendResult.render.js
src/components/StandardButton.js
src/containers/Coin/SendCoin/SendCoin.js
src/containers/Convert/ConvertCard/ConvertCard.js
src/containers/Identity/AddIdentity/View.js
src/containers/Identity/Home/AttestationDetails/View.js
src/containers/Identity/Home/ScannedInformation/View.js
src/containers/Identity/Home/View.js
src/containers/Identity/PersonalInfo/ClaimDetails/View.js
src/containers/Identity/PersonalInfo/ClaimManager/View.js
src/containers/Identity/PersonalInfo/RequestAttestation/View.js
src/containers/Onboard/Welcome/WelcomeSlider.js
src/styles/deeplink/reviewStep.styles.js
src/styles/gradientbutton.styles.js
src/utils/__tests__/unit/walletBackupRequestSession.unit.test.js
```

The provision-identity steps render through the redesigned `ProvisionIdentityBottomSheet` (`SendModal.render.js:114`), so the old `ProvisionIdentityForm` is not shown there.

## Tests the PR changes

No upstream test file is deleted. Ten test files came with the redesign: `genericRequestCompletionFlow`, `genericRequestDelivery`, `giftCardPresentation`, `id1LinkFailureRouting`, `processVerusIdResumeGuard`, `verusIdFlowGuards` (in `src/utils/__tests__/unit`), plus `IdentityUpdateRequestInfo`, `IdentityPickerSheet` and `SignedInVerusIdLifecycle` next to their screens. Round 1 of the review fixes adds six: `privacyStorage`, `portfolioRecordSave` (in `src/utils/__tests__/unit`), plus `InvoiceInfoLegacySigned`, `VerusIdServiceRefresh`, `SettingsFieldSheetDraft` and `AddressBookEditSheetDraft` next to their screens. It also adds cases to `CoinData`, `currencyTransferIntent`, `responseDeliverySecurity`, `deeplinkNfcSubmission`, `walletBackupNfc` and `SignedInVerusIdLifecycle`. The fix notes record that each new case failed before its fix.

Shared setup (`cb73f287`, `fbb4e15a`):

- `debug/setupJest.js` mocks the icon, SVG, camera, permission, gesture-handler and safe-area native modules, and gives the Redux mock store `subscribe()` so `createAlert` works in tests.
- `package.json` adds `@react-navigation` to `transformIgnorePatterns` so its image assets load. This is the only Jest config change.
- `src/tests/helpers/mockReactNative.js` and `mockReactRedux.js` build a test's `react-native` and `react-redux` mocks from the real modules plus that test's overrides. Hand-written mocks that were too small for the redesigned screens now use them.

How the upstream suites were updated:

- Screen tests drive the redesigned screens. They find controls by role and visible text, and mock navigation, Reanimated, the app state and sheet modals at their boundaries. The behavior checks stay.
- Where the PR changes logic on purpose, the expectation follows the change and the commit names it. Examples: mempool reads in `vrpcRefresh` and `walletRefreshCoordinator` (`07452edb`, `db7bf214`); boolean `getblock` verbosity and the saved first broadcast time in `identityRegistration`, `identityRegistrationSdk`, `vrpcRegistrationBatching` and `identityDurableFunding` (`34a6f549`, `39268c3b`, `853c51c6`, `c5d17c6e`); `shareAttempt` in `giftCard` (`311d6ad9`); the mempool funding reads in `spendableKey` and `currencyTransferIntent` (`60757c5e`); the own-address refusal in `identityManagementUpdate` (`a56f6ba7`); the "NFC is off" and "Z recovery secret" text in `walletBackupNfc` and `getKeyMaterial` (`4b39d58b`).
- Where a test found upstream behavior that the redesign had lost, the product was fixed. Eight fixes came from this; see [README.md, section 5](README.md#fixes-found-by-the-upstream-tests).
- `walletBackupRequestSession` keeps the older button labels (`Write NFC Backup`), as part of the `8872ea1b` decision.
- `SignedInVerusIdLifecycle` (a suite that exists only here): its two tests of the "Link and login" resume gate are replaced by one test of the current "Link" action, because `63289e4b` removed the resume action from the VerusID tab (`7c7335ce`). The suite unmounts the tab after each test, because a timer of the mounted list failed tests in the next file (`aa1b067a`).

## Jest status

Full suite, same machine, `--maxWorkers=3`. Upstream ran on 2026-11-16. The PR branch ran three times on 2026-11-17, each time with the same result.

| Side | Suites | Failed suites | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|---|
| `upstream/ui-redesign` `525aa859` | 193 | 15 | 2773 | 2630 | 75 | 68 |
| PR branch `263473d8` | 202 | 16 | 2813 | 2642 | 103 | 68 |

Compared per test name, 25 tests pass on upstream and fail on the PR branch in each of the three runs.

**After round 1 (2026-11-18).** The unit suites ran once on `eed6316a` (the fixes merged), `--maxWorkers=3`, without the live-network folders `src/utils/__tests__/int` and `src/utils/__tests__/api`: 191 suites, 2678 tests, 2675 pass, 3 fail. The 3 failures are the 2 `identityRegistrationScreens` tests below and the 1 `giftCard` test that also fails on upstream. The full suite with the live-network tests did not run after round 1.

**2 tests in `identityRegistrationScreens`.** "waits for saved summaries before showing an empty registration list or enabling creation" and "keeps last known registrations visible but disables actions until their summaries reload". Both mount upstream's registration start screen (`IdentityRegistrationStart`) and test its loading states. The redesign replaced that screen with the VerusID tab, which has no summary wait, so the element is undefined. The other storage cases of that screen now mount the VerusID tab (`c76a2671`).

**23 tests in `api/coinpaprika.int.test.js`.** The file is identical on both sides. Each test calls the live CoinPaprika service with `fetch` and does not run app code; only the coin list comes from `CoinDirectory`. The service rate-limits. On upstream, 61 tests of the same file failed in the same run with the same error; on the PR branch, 87 failed.

### Upstream test names that the PR changes

63 upstream test names do not exist on the PR branch, in 17 suites. Each one is ported to a redesigned screen under a new name, renamed to the intended behavior, or removed with removed behavior.

| Tests | Suite | What happened and why |
|---|---|---|
| 19 | `identityRegistrationScreens` | Ported to the stepped New VerusID flow (Name, Referral, Check details, progress with slide payments) and the VerusID tab; engine-call checks kept. Cases for removed parts are deleted, because those parts are gone: dots in names, the Start list, referral memory per network, delete from the list, cost checkboxes, pull to refresh on the review, the Review options flow (`3bccb151`, `c380bd69`, `fe0170ba`, `91c3ed92`, `4e16cf62`, `c76a2671`). |
| 12 | `appEncryptionReviewSession` | Ported to the review with one approval button, because the "ready to send" and Continue step is gone. The two cases that only checked the removed daemon debug panel are removed. The default identity is the first by name, as the fork sorts linked identities by name (`8da5ed27`, `08bc4614`). |
| 5 | `identityActions` | Ported from the list chooser in `VerusIdServiceOverview` to the options sheet on the VerusID page, which replaced it. The Android dismissal case is removed with that chooser (`42983e67`, `2f197d5a`, `88da2b89`). |
| 3 | `walletBackupRequestSession` | The three in-screen profile creation tests are removed, because "Create a new wallet" now opens the wallet setup flow (`4f2ab084`). |
| 3 | `coinMenuWalletLifecycle` | The tab filter and its "No compatible cards found." alert are gone; those cases are removed (`33e10b4d`). |
| 3 | `subWalletLifecycle` | Renamed to the owner decision: they assert the `null` selection, a safe rate read, and that an explicit card choice stays after a rebuild (`f02602cf`). |
| 3 | `contentMultiMapRemoveUi` | Renamed: the UI says "active" instead of "current". |
| 2 | `genericRequestCompletionLifecycle` | Ported from the removed `GenericRequestComplete` screen to `createGenericResponseDelivery` and `GenericRequestHome`, which now run delivery (`32d295a0`, `e9819fc3`). |
| 2 | `genericResponseNetwork` | Renamed: a failed detail ends on the request error screen, and the approved response goes to the shared delivery (`adda36f6`). |
| 2 | `deepLinkDispatcherLifecycle` | Renamed: the wallet unlock sheet replaces the sign-in modal, and a refusal shows on the opening screen, not in an alert (`c9b58c07`). |
| 2 | `deeplinkNfcSubmission` | Renamed: the NFC tap screen has steps, not prompts. |
| 2 | `seedDetails` | Renamed: the UI says "recovery data" instead of "seed details". |
| 1 | `identityManagementScreens` | Renamed: a Transfer error shows above the footer, because on small phones it stayed below the visible area (`06a4f364`). |
| 1 | `identityLinkingScreen` | Renamed: the Link page returns by itself once the selected VerusIDs are saved (`a8d35959`). |
| 1 | `identityContentReviewScreen` | The case for missing content changes (`undefined`) moved to the parent screen test in `identitySignatureThreshold`, because only that parent can pass it (`17b11f67`). |
| 1 | `identityRegistrationNotifications` | The "Clear all" confirmation test is deleted with the removed tray (`db5e7916`). |
| 1 | `scopedCredentials` | Renamed to "refuses a partial set after an undecryptable stored entry", because the request must not show a shortened set (`e3f9a85a`; [keys 4](LOGIC_CHANGES.md#keys-signing-and-authentication)). |

### Failing tests that exist only on the PR branch

None in the unit suites. Three suites failed only here until 2026-11-17 and are repaired (`7c7335ce`):

| Suite | Cause | Repair |
|---|---|---|
| `processVerusIdResumeGuard` | The test expected `navigate('DeepLink')`. The app passes `{screen: 'VerifyDeepLink'}` too, as upstream does. | Expectation corrected. |
| `genericRequestDelivery` | The suite did not load: its `react-native` mock had no `Dimensions`, and the delivery module imports the store. | The test uses the shared `react-native` mock and a small store mock. |
| `SignedInVerusIdLifecycle` (VerusID service `__tests__`) | The icon mock lacked six icons. Two tests covered a resume action that `63289e4b` removed. | Icons added; the two tests are replaced by one test of the current action. |

Three more tests of `api/coinpaprika.int.test.js` have names that exist only here. They fail with the same rate-limit error as the rest of that file.

Other failures are the same on both sides: live network tests (`int/composite`, `int/electrum`, `int/dlight`, `api/coinpaprika`) and 1 test in `giftCard`. Five `int/electrum` suites do not load on either side.

All suite names are in `src/utils/__tests__/unit/` unless a path is given.
