# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable product direction

- Selected direction: editorial, culture-first, trust-first, and crypto-invisible.
- Use warm mineral white, deep forest green as the only accent, black text, warm gray borders, and restrained rounded geometry.
- The landing page must explain arisan as a social ritual of belonging, mutual care, and keeping relationships alive before it explains the financial mechanism.
- The product supports two explicit data sources: local simulation and real Stellar Testnet transactions through the localhost gateway. Never present local data as on-chain data.
- Every blockchain, identity, and payment action must be labeled as Stellar Testnet or local simulation.
- A fully funded room must never draw automatically. Members agree on the first draw date and time before creation, and the draw action stays locked until that schedule arrives.
- The hackathon build uses the contract's 60-second demo cadence after the first draw. The UI and gateway must use the same cadence, show a live countdown, and offer a clearly labeled +3 minute demo schedule without weakening the agreed-schedule rule.
- Member count controls must support every prepared sandbox identity, and monetary inputs must always use readable Indonesian Rupiah separators.
- Long Stellar Testnet operations must show staged progress and explain why several signatures can take time.
- Drawing should feel playful through restrained dice motion and name rolling, while the winner result should feel celebratory and respect reduced-motion preferences.
- Every room must preserve a visible winner history by round so members can see who has already received a turn and who remains eligible.
- When only one eligible member remains, present the final turn as deterministic. Do not imply another random draw, but still run the smart contract action that records the turn and transfers the payout.
- Secrets for sandbox identities must remain server-side under the ignored `.stellar/` directory and must never be bundled into the web or PWA.
- Use one consistent Phosphor outline icon family. Do not use emoji as product icons.
- Do not use em dash or en dash characters in product copy or documentation.
- Selected references live in `design/selected-landing.png`, `design/selected-mobile-home.png`, `design/selected-mobile-room.png`, and `design/selected-mobile-result.png`.
