# AGENTS.md

Compact map for coding agents in this repository. Keep it short.

## What this repository is

- Product: Valu Wallet, a React Native iOS/Android wallet. This repository is Max's project for the Valu Wallet redesign.
- Local path: `~/dev/valu-wallet`.

## Upstream

- "Upstream" always means `https://github.com/Valu-verse/Valu-Wallet`, default branch `master`. The git remote is named `upstream`.
- Upstream is itself a fork of `https://github.com/VerusCoin/Verus-Mobile`. Call that repository "VerusCoin" or "Verus-Mobile", never "upstream".
- Max has read-only access to upstream. Never push to the `upstream` remote. Changes reach upstream only through a pull request that Max authorizes.
- Local `master` follows `upstream/master`. Do not commit work on `master`. Update it with `git fetch upstream` and `git merge --ff-only upstream/master`.
- `origin` is Max's public repository `https://github.com/Meyse/valu-wallet`. It is not a GitHub fork. Its default branch `main` is the integration branch for Max's work.
- Start each task branch from `main`. To take new upstream work, merge `upstream/master` into `main`. Do not rebase shared branches.
- Do not confuse this repository with `~/dev/Verus-Mobile` (Max's separate Verus Mobile redesign, where upstream means VerusCoin) or `~/dev/valu-mobile`.

## Stack facts

- React Native 0.88.1, React 19.3.1, Hermes, New Architecture (`newArchEnabled=true`, `RCT_NEW_ARCH_ENABLED=1`, Fabric, bridgeless). Legacy native modules run through the interop layer. No Expo.
- React Navigation 7 (JS stack, bottom tabs), React Native Paper 5, Reanimated 4, Redux.
- Android: minSdk 24, compile SDK 37, target SDK 36. Node 22 (`.nvmrc`), pnpm 12.6.0 through Corepack.
- Keep the dependency patches in `patches/`. See `README.md` for build instructions.

## Working rules

- Source shows what the app does. The Figma design from the Valu team shows what the redesign must look like. Report disagreements; do not change one to match the other without a decision from Max.
- Treat keys, seeds, addresses, identity records, balances, and QR or deeplink payloads as sensitive.
- Keep changes scoped. Do not refactor unrelated wallet code.
- Put agent working notes in `*.local.md` files. Do not commit them.
- Do not run destructive git commands.

## Common commands

- Install: `corepack pnpm install --frozen-lockfile`
- Metro: `corepack pnpm start`
- Test: `corepack pnpm test`
- Lint: `corepack pnpm lint`
- iOS: `corepack pnpm ios`
- Android: `corepack pnpm android`
