# Android Debug build: what you need before the first build

The README covers the SDK, Java and the Verus wallet SDK. This page adds what the upgrade work found missing.

## Debug keystore (required)

`android/app/build.gradle` signs the Debug build with `android/keystores/debug.keystore`
(`signingConfigs.debug`, `storeFile file('../keystores/debug.keystore')`). That file is git-ignored, so a fresh
clone does not have it, and the Debug build fails at the signing step.

Make one once per machine and keep it outside the repository:

```sh
mkdir -p android/keystores
keytool -genkeypair -v -keystore android/keystores/debug.keystore \
  -storepass android -keypass android -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

Keep a copy (for example in `~/.cache/valu-wallet-upgrade/debug.keystore`) and copy it back after each clean
clone. **Always use the same keystore on the same device.** Android refuses an update that is signed with a
different key. The only way past that is an uninstall, and an uninstall deletes every profile and wallet on the
device. The upgrade migration checks (install the new build over the old one, keep the profiles) depend on this.

The Game PC QA slots use `%USERPROFILE%\.cache\valu-wallet-upgrade\debug.keystore`.

## Windows

The pnpm scripts use POSIX shell syntax (`postinstall`, `bundle-android`). On Windows, set Git Bash as the pnpm
script shell before `pnpm install`.

## After a dependency change

`corepack pnpm install --frozen-lockfile` runs `patch-package` in `postinstall`. Check that the output lists
each file in `patches/` with a tick. A Debug build with an unpatched `react-native-verus` installs and starts,
but the light-client module is missing (see `phase-1.md`, P1-3).

When a file in `patches/` changes but the lockfile does not, an existing checkout still has the old patch
applied, and `patch-package` 6.2.1 cannot apply the new version over it. Delete the patched package first (for
example `rm -rf node_modules/react-native-verus`), then run `corepack pnpm install --frozen-lockfile` again.
