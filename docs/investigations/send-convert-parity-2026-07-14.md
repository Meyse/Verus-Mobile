# Send/Convert parity investigation — 2026-07-14

## Scope

Investigate the VRSCTEST target-option matrix and the chevron sheet semantics in
the redesigned Send/Convert wizard. Preserve Verus Asset, Card, channel, PBaaS,
conversion, export, preflight, deeplink, and scan contracts. The Valu checkout
is a read-only journey and presentation reference.

## Feedback loop

`node scripts/check-send-wizard-options.js`

The deterministic fixture represents one asset available as a Verus currency
and an Ethereum token, plus two conversion paths to the Verus representation.
The checker requires the wizard to keep all paths while distinguishing the
receive-network choice from the conversion-route choice. It executes the real
`buildTargetOptions` implementation after replacing only its CoinDirectory
dependency with a non-sensitive fixture.

Initial result: **RED**, deterministically, in about 0.1 seconds:

```text
AssertionError: DAI representations on Verus and Ethereum must be one target asset row
2 !== 1
```

## Hypotheses

1. **Prelaunch filtering removes real VRSCTEST targets.** If the unconditional
   `path.prelaunch` discard is the cause, retaining such paths will add the live
   prelaunch currency to the target list and its route will still carry the
   existing `preconvert` transaction flag.
2. **Receive network and conversion route are collapsed.** If this is the cause
   of the duplicate-looking sheet, grouping paths by receive network before
   presenting them will leave one row per network while Amount still receives
   every direct/via route for only the selected network.
3. **Raw destination IDs prevent canonical asset grouping.** If this causes the
   mapped-asset discrepancy, grouping display variants such as DAI.vETH and DAI
   will create one asset row with distinct Verus and Ethereum network choices.
4. **The selected source Card has a non-conversion channel.** If this explains
   some empty lists, changing only the source Card from a send-only DLight Card
   to a VRPC Card will enable path discovery; the UI must keep that capability
   boundary explicit rather than inventing conversions.
5. **The upstream VRSCTEST response is incomplete.** If this is the cause, the
   public discovery response itself will omit expected destinations before
   `buildTargetOptions` runs.

### Initial probes

- Hypothesis 5 is false for the main symptom: a read-only public VRSCTEST probe
  returned 46 destination keys and 80 routes, including the prelaunch target
  `SUPERVRSC`.
- Hypothesis 4 is a real product-specific capability boundary, but cannot
  explain VRPC paths that disappear after discovery.

## Findings

1. Hypothesis 1 was confirmed. `buildTargetOptions` discarded every
   `path.prelaunch` entry before constructing a target. The public VRSCTEST
   response contained `SUPERVRSC`, but the wizard removed it even though the
   existing estimate and submit paths already support the `preconvert` flag.
2. Hypothesis 2 was confirmed. The target screen treated every converter path
   as a network choice. Direct and `via` routes to the same receive network
   therefore appeared in a sheet titled **Select network**, while the Amount
   screen subsequently estimated all routes and could replace that selection.
3. Hypothesis 3 was confirmed for mapped representations. Verus and Ethereum
   representations were keyed by their raw currency IDs, so one logical asset
   appeared as separate targets instead of one asset with receive-network
   choices.
4. Hypothesis 4 remains an intentional capability boundary. Private DLight
   Cards are send-only; conversion discovery, preflight, and submission use
   VRPC, ETH, or ERC20 channels. The wizard now explains that boundary instead
   of presenting an unexplained empty conversion list.
5. Hypothesis 5 was falsified. The live discovery response contained the full
   path data before client-side option construction.

The selected VRPC Card's channel also carries its system ID. Amount estimation
previously ignored that value and used `sourceCoin.system_id`; estimates now use
the selected channel system first, preserving subwallet/network selection.

## Valu parity boundary

Valu first groups mapped representations as one asset, then asks for the
receive network, and only then compares direct/intermediate conversion routes.
The Verus fix now follows that semantic sequence while keeping Verus route
fields (`exportto`, `via`, `mapto`, `preconvert`, `bridgeprelaunch`), address
types, PBaaS IDs, Cards, and channels intact. The available currencies and
routes remain runtime VRSCTEST data rather than a Valu-derived or hardcoded
matrix.

## Result and verification

The deterministic checker is now green:

```text
Send wizard option matrix: PASS
```

It proves that ordinary send remains available, prelaunch paths remain
preconversions, unrelated PBaaS currencies stay distinct, mapped DAI
representations form one asset row, receive networks are distinct, and direct
plus intermediate converter paths remain route choices inside the selected
network.

A read-only post-fix live-data projection retained all 46 destination
currencies and all 80 routes, produced no duplicate route keys, and exposed
`SUPERVRSC` as a preconversion. Counts are evidence from the 2026-07-14 public
response, not application constants.

Checks:

- `node scripts/check-send-wizard-options.js` — pass
- Babel parsing of the three changed wizard UI modules plus `wizardUtils.js` —
  pass
- `node scripts/check-safe-area.js` for the three changed UI modules — pass
- scoped `git diff --check` for task files — pass
- production iOS React Native bundle command — pass, including 41 assets
- ESLint — blocked before file analysis by the repository's ESLint 8.19.0 /
  `eslint-plugin-import` package-export incompatibility under Node 22
- simulator visual proof — blocked: the running simulator is served by Metro
  from `/Users/maxtheyse/dev/Verus-Mobile`, not this worktree, and the available
  Verus profile is locked. No credentials were read, logged, or requested.
