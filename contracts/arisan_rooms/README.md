# Awrisan Soroban contract

This contract is the custody and rotation engine for an Awrisan room. It is built for Stellar Soroban and uses a Stellar Asset Contract as the token it holds.

## What it enforces

- Every member locks the full cycle commitment before the room starts.
- The host manages membership and timing but cannot withdraw the pool.
- A room only becomes active when the exact member target has joined.
- A two-transaction draw fixes the random seed before the winner is selected.
- The contract pays one unwon member automatically each round.
- Members can leave and receive a refund before activation.
- A stuck active room has a delayed emergency dissolution path.
- Room storage can be maintained before archival without changing funds.

The default build uses short demo cadences. Build with the `production-cadences` feature only after the timing and operational assumptions have been reviewed for a production deployment.

## Verify locally

```bash
cargo fmt --all -- --check
cargo test -p arisan-rooms
stellar contract build --package arisan-rooms
```

The GitHub workflow runs the same checks on Linux and uploads the verified WASM. A manual workflow run can also deploy and initialize a fresh instance on Stellar Testnet. The deployment artifact contains public IDs only. It never contains the deployer's secret.

## Current scope

This is a Testnet MVP, not a mainnet release. The demo gateway uses native Testnet XLM and sandbox identities. IDR values in the interface explain the arisan rules and are not an on-chain rupiah token.
