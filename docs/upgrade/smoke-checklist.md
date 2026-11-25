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
