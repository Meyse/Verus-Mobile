# Verus Mobile Product Language

This glossary defines the product terms used by the Verus Mobile signed-in experience. It keeps navigation, design, and implementation work aligned around the same user-facing concepts.

## Language

**Wallet**:
The named, locally protected wallet a person creates, imports, selects, and unlocks. Its signed-in Wallet view contains its portfolio, enabled Assets, Cards, balances, and wallet-level security and recovery actions.
_Avoid_: Profile, account, Dashboard, Home screen

**Asset**:
A currency or token enabled in the Wallet, potentially available through more than one Card.
_Avoid_: Coin when referring to all supported currency types

**Card**:
A distinct wallet context for an Asset, such as a transparent, private, service-backed, or network-specific holding context. A Card determines which balances, addresses, and actions are available.
_Avoid_: Account, subwallet in user-facing copy

**Transfer**:
The umbrella journey for receiving, sending, or converting assets, entered from Wallet or an Asset detail. It does not imply that all Cards support every transfer action.
_Avoid_: Transaction as a name for the journey

**Conversion**:
An exchange from one asset or network representation to another, entered through the send-or-convert branch of Transfer.
_Avoid_: Swap unless a specific protocol uses that term

**Identity**:
The signed-in VerusID experience for linking, viewing, and managing VerusIDs and their attestations.
_Avoid_: Personal, Personal Profile

**Personal Profile**:
The legacy local personal-data experience. It is not part of the redesigned signed-in navigation and is not synonymous with Identity.
_Avoid_: Identity

**Service**:
An optional wallet capability that has its own setup, state, and workflow outside ordinary asset management.
_Avoid_: App, plugin

**Gift Card**:
A Service that creates and shares spendable claim authority capable of holding funds or VerusIDs for another wallet to redeem.
_Avoid_: Transfer, voucher

**Buy/Sell**:
A future fiat on-ramp or off-ramp capability that requires a supported provider and product approval. It is not part of the initial signed-in redesign.
_Avoid_: Wyre as a generic name for future Buy/Sell

**Scan**:
The entry point for QR-based payment requests, wallet requests, VerusID requests, addresses, and other supported Verus deeplinks.
_Avoid_: Pay when referring to the complete scanner capability
