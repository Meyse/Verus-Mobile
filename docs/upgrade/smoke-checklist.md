# Upgrade smoke checklist

Use this checklist after each upgrade phase, on one iOS simulator and one Android emulator.
Run the checks in order: later checks use the profile from earlier checks.
Use VRSCTEST only. Never use a mainnet profile or real funds.

## Rules

- Build a Debug app and run Metro from the same checkout.
- Keep screenshots outside git, in `~/.cache/valu-wallet-upgrade/<phase>/<platform>/`.
  Name each screenshot after its check ID, for example `S07-home.png`.
- Record the result of each check as `PASS`, `FAIL` (with what you saw), `N/A` (with why), or `BLOCKED`.
- A red box, a yellow box with a native-module error, or a crash is a `FAIL`, also when the flow continues.
- Record wallet names and addresses in `docs/upgrade/qa-wallets.local.md`.
  That file can hold disposable testnet seeds. Never commit it.

## Module key

| Key | Native module |
|---|---|
| keychain | `react-native-keychain` 8.1.3 (password and biometric credentials) |
| verus | `react-native-verus` (keys, encryption, VerusLightClient / dlight) |
| tcp/udp | `react-native-tcp` fork, `react-native-udp` (the `net` and `dgram` shims) |
| randombytes | `react-native-randombytes` (key and seed randomness) |
| nfc | `react-native-nfc-manager` fork |
| camera | `react-native-vision-camera` |
| iap | `react-native-iap` (iOS StoreKit) |

Checks without a key use only React Native core, navigation, storage or JS.

## Test data

- Deeplink: a VerusPay invoice for 0.01 VRSCTEST to a QA address of the Mac VRSCTEST daemon.
  The exact URI is in `docs/upgrade/qa-wallets.local.md` (section "Deeplink").
  iOS: `xcrun simctl openurl <udid> '<uri>'`. Android: `adb shell am start -a android.intent.action.VIEW -d '<uri>'`.
- Send target: the same daemon QA address.
- Funding: send VRSCTEST to the profile address from the Mac daemon (`verus -chain=vrsctest sendtoaddress`).
- iOS biometrics: enrol Face ID with `xcrun simctl spawn <udid> notifyutil -s com.apple.BiometricKit.enrollmentChanged 1` and
  `notifyutil -p com.apple.BiometricKit.enrollmentChanged`; match with `notifyutil -p com.apple.BiometricKit_Sim.pearl.match`.
  Android: enrol a fingerprint in Settings, match with `adb -e emu finger touch 1`.

## Checks

| ID | Check | Pass when | Modules |
|---|---|---|---|
| S01 | Cold start of a fresh install | The welcome screen ("Get started") shows. No red box. | randombytes, keychain |
| S02 | Native module registry | `scripts/upgrade/probe-native-modules.js` reports each module in the key as present (iap: iOS only). | all |
| S03 | Create profile: name | "Get started", type the profile name, continue. The password step shows. | — |
| S04 | Create profile: password | Type and confirm the password. The wallet intro ("Create new wallet") shows. | — |
| S05 | Testnet profile | Tap the test-tube button, answer "Yes". "Testnet profile set" shows. | — |
| S06 | Create a new wallet | "Create new wallet", record the seed in the local file, finish the backup steps. The profile opens on Home. | randombytes, verus, keychain |
| S07 | Home | The Wallet tab shows VRSCTEST and a balance (0 is fine) without an error banner. | verus |
| S08 | Services tab | The tab opens and lists the services. | — |
| S09 | Identity tab | The tab opens. No error. | — |
| S10 | Settings tab | The tab opens and shows "Lock profile". | — |
| S11 | Scan tab | The camera permission prompt shows (first time). After "Allow", the scanner view shows without a crash (the simulator shows a black or placeholder frame). | camera |
| S12 | Receive | VRSCTEST → Receive. The address and its QR code show. Record the address. | — |
| S13 | Fund the profile | Send 0.5 VRSCTEST from the daemon. The balance updates on Home after a refresh (pending is fine). | verus |
| S14 | Send to Confirm | VRSCTEST → Send, recipient = daemon QA address, amount 0.01. The "Confirm" screen ("Review your transaction") shows the amount, recipient and fee. | verus |
| S15 | Real testnet send | Confirm S14 (only with a funded profile). The success screen shows a txid, and `verus -chain=vrsctest gettransaction <txid>` (or the explorer) finds it. | verus, randombytes |
| S16 | Deeplink | Open the invoice URI while unlocked. The app shows the VerusPay invoice for 0.01 VRSCTEST to the daemon address. Close it without paying. | — |
| S17 | Settings sub-screens | Open profile settings and one wallet or coin settings screen, then go Back. No error. | — |
| S18 | Enable biometric unlock | Turn on biometric unlock in profile settings and confirm with the password. The setting stays on. | keychain |
| S19 | Lock (sign out) | Settings → "Lock profile". The unlock or login screen shows the profile. | keychain |
| S20 | Unlock with password | Type the password. Home shows the same address and balance as before. | keychain, verus |
| S21 | Unlock with biometric | Lock again, then "Unlock with Face ID" / "Unlock with Fingerprint" and match. Home shows. | keychain |
| S22 | Kill and relaunch | Kill the app, open it again. The profile is listed. Unlock with the password. Same address and balance. | keychain, verus |
| S23 | Import from seed | Login → "Add a profile", testnet profile, "I already have a wallet" → "Enter your recovery phrase", paste the S06 seed. The new profile shows the same VRSCTEST address as S12. | verus, randombytes, keychain |
| S24 | NFC import entry | In the import sheet, open "Import using NFC" (if shown). The screen shows a "not supported" or "scan" state without a crash. | nfc |
| S25 | In-app purchase entry (iOS) | Services → Valu → the attestation purchase step loads products or shows a clear error. Do not buy. | iap |
| S26 | Log | Metro and the device log show no new native-module error, no "Invariant Violation" and no "TurboModule" error for the run. | all |

## Migration check (phase 1 and later)

Run this before S01 of the new phase, on a device that ran the earlier phase.

| ID | Check | Pass when | Modules |
|---|---|---|---|
| M1 | Install the new build over the old one | Install without uninstalling. The app starts and lists the profile created on the earlier build. | — |
| M2 | Password unlock of the old profile | Unlock with the password. Home shows the same address and balance as recorded on the earlier build. | keychain, verus |
| M3 | Biometric unlock of the old profile | Lock, then unlock with biometrics (if S18 was on). Home shows. | keychain |
| M4 | Old profile can still sign | Reach Confirm for a 0.01 VRSCTEST send (S14) from the old profile. Send it if the profile has funds. | verus |

## Navigation checks (phase 3 and later)

Run these after S01-S26, with the same VRSCTEST profile. They cover each flow where the React Navigation 7
audit found a possible change ([phase-3.md](phase-3.md), "Sites that needed a change"), and the main
navigation paths. A Debug build logs "The action 'NAVIGATE' ... was not handled by any navigator" when a
navigate call does nothing. Each such message is a `FAIL` of the check that caused it.

"No duplicate" means: after the step, one Back (Android back button, iOS edge swipe or header arrow) goes to
the screen before the flow, not to a second copy of the same screen and not into the closed flow.

| ID | Check | Steps | Pass when | Modules |
|---|---|---|---|---|
| N01 | Onboarding Next | Login → "Add a profile" (or a fresh install → "Get started"). Type a name → Next, password → Next, confirm → Next, biometrics step (if shown) → a choice. | Each Next opens the next step. The wallet intro ("Create new wallet") shows. | keychain |
| N02 | Onboarding Back | On the confirm-password step, go Back three times. | Each Back shows the step before it. The last Back leaves onboarding to the screen where it started. | — |
| N03 | Create seed and finish | Wallet intro → testnet profile → "Create new wallet" → seed intro → Next. Go Back once, then Next again. Finish the backup steps. | Seed words show after Next. Back shows the seed intro. After the last step, Home shows. Back on Home does not open onboarding again. | randombytes, verus, keychain |
| N04 | Import entry | Start a new profile as in N01. On the wallet intro, open "I already have a wallet" and pick "Enter your recovery phrase". Go Back. | The import screen opens. Back shows the wallet intro. Do not finish the import. | — |
| N05 | Revoke/recover entry | Lock the profile. On the unlock screen, open the menu → "Revoke/Recover VerusID". Go through the slider to the import step. Go Back, then "Skip" on the slider. | The import step opens from the slider. Skip closes the flow and the unlock screen shows. | — |
| N06 | Bell from the tabs | Unlock. Tap the bell on the Wallet tab, go Back. Do the same on the Services tab. | Notifications opens in the same tab each time. Back shows the screen where you tapped the bell. | — |
| N07 | Bell above the tabs | On the Wallet tab, open the add-coin screen (it shows the bell and no tab bar). Tap the bell. Go Back. | Notifications opens in the Wallet tab and the add-coin screen closes. Back shows the Wallets screen. No duplicate Home. | — |
| N08 | Receive Done | VRSCTEST → Receive → pick the asset → "Done". | Home shows. No duplicate: Back does not show the receive screens. | — |
| N09 | Send wizard Back | VRSCTEST → Send. Go to the recipient step, then Back to the first step, then Back once more. | Each Back shows the step before it. The last Back closes the wizard. | — |
| N10 | Send wizard address book | In the Send recipient step, open the address book sheet → "Manage". Go Back. | The Services tab shows the address book. The send wizard is closed. Back shows the Services root. | — |
| N11 | Send success Done | After a real send (S15), tap "Done". | Home shows on the Wallet tab. No duplicate: Back does not show the success screen. | verus |
| N12 | Convert modal steps | VRSCTEST → Convert (or a cross-chain send). Fill the form to Confirm, go back to the form, close the modal. | Form and Confirm switch in the modal. The step labels at the bottom (if shown) are uppercase, as in phase 2. Closing shows the coin screen. | verus |
| N13 | Deeplink while signed in, deep screen | Open Settings → a settings sub-screen. Open the invoice URI. Close the invoice. | The invoice shows. Close shows the settings sub-screen. | — |
| N14 | Deeplink while a deeplink is open | Open the invoice URI. While the invoice shows, open the same URI again. Close the invoice once. | One invoice shows after the second URI. One close leaves the deeplink screens. | — |
| N15 | Deeplink while signed out | Lock the profile. Open the invoice URI. Unlock if the app asks. Close the invoice. | The app shows the invoice (or asks to unlock first, then shows it). No red box. Close shows the unlock screen or Home. | keychain |
| N16 | VerusPay invoice Back | Open the invoice URI → "Pay" (or the next step). Go Back. Close the invoice. | Back shows the invoice. Close leaves the deeplink screens. Do not pay. | — |
| N17 | Invoice paid Done (funded profile only) | Open the invoice URI, pay 0.01 VRSCTEST, tap "Done" on the result. | Home shows. No deeplink screen stays open. `N/A` without funds. | verus |
| N18 | VerusID registration Back | Services → VerusID → "Create a VerusID". Go Back twice. | Each Back shows the screen before it. | — |
| N19 | VerusID "Save for later" (funded profile only) | Services → VerusID → "Create a VerusID", type a free name, continue to the commitment review, tap "Save for later". | The VerusID list shows, with the saved registration. No duplicate: Back does not show the review or a second list. `N/A` without funds. | verus |
| N20 | VerusID progress "Done for now" (after N19 only) | Open the saved registration → progress → "Done for now". | The VerusID list shows. No duplicate list. | — |
| N21 | Identity tab registration | Identity tab → start a VerusID registration. Go Back. | The registration start screen opens in the Identity tab. Back shows the Identity tab root. | — |
| N22 | Tab switch with a deep stack | Wallet tab → VRSCTEST (coin screen). Switch to Services, open a service. Switch back to Wallet, then to Services. | Each tab keeps its screen (coin screen, service). Back in each tab shows its root. | — |
| N23 | Lock and unlock from a deep screen | Wallet tab → VRSCTEST (coin screen). Settings tab → "Lock profile". Unlock with the password. | The unlock screen shows. After unlock, Home shows on the Wallet tab root. No red box. | keychain |
| N24 | Header and tab bar look | Compare with the phase 2 screenshots: Services → VerusID header, a Wallet stack screen header, and the bottom tab bar. | iOS back buttons in these stacks show only the arrow, as in phase 2. Record any change in the tab bar (icon or label position, bar height) for Max. | — |
| N25 | Services flows on testnet | Services → Attestations: open one attestation (if any). Valu PoP, off-ramp and USDC bridge: open each entry that testnet shows. | Each screen opens. `N/A` for a service that testnet does not offer. Do not buy or sell. | iap |
| N26 | Navigation log | Read the Metro log for N01-N25. | No "was not handled by any navigator" message, no "nested a NavigationContainer" error. | — |
