# Awrisan — Testnet Deployment and On-Chain Evidence

Network: **Stellar Testnet**. No mainnet funds. No real money moves.

Everything on this page is verifiable by you, right now, without an account and
without trusting us.

---

## The contract

| Item | Value |
|---|---|
| Contract | [`CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX`](https://stellar.expert/explorer/testnet/contract/CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX) |
| Token | Native XLM SAC, [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| WASM hash | `a822f2430d8612d9f11ce1701784e547a49fa78d8015904fc9b26125013dad8a` |
| RPC | `https://soroban-testnet.stellar.org` |

---

## Verify the running code

Two claims live here, and they are not the same claim. We keep them apart,
because collapsing them would let a hash pass for the wrong reason.

### 1. The live bytecode hashes to `a822f243...dad8a`

The contract instance on testnet names the WASM hash
`a822f2430d8612d9f11ce1701784e547a49fa78d8015904fc9b26125013dad8a`. Pull the
code entry off the ledger, sha256 the bytes, and you get that value back. This
needs no account and no trust in us:

```bash
curl -s https://api.stellar.expert/explorer/testnet/contract/CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX
# {"contract":"CDTNEK4E…","created":1784121084,"wasm":"a822f243…dad8a", …}
```

Or open the
[contract page](https://stellar.expert/explorer/testnet/contract/CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX)
and read the hash there. Note stellar.expert will also report this contract as
`validation: unverified` — that is its own source-verification service, which we
have not submitted to. It is not a claim that the bytecode is unknown; the hash
above is what the network is running.

### 2. It was built from commit `15246f05`, not from `main` today

CI run [`29420588469`](https://github.com/awrisan/awrisan/actions/runs/29420588469)
built commit `15246f05` ("Initial Awrisan release", the first commit of this
repository's public history). Fetch that artifact and hash it yourself:

```bash
gh run download 29420588469 -n arisan-rooms-wasm
sha256sum arisan_rooms.wasm
```

**The deployed bytecode is NOT a byte-for-byte build of `main` today, and we
would rather say so than let you discover it.** Since `15246f05`, the contract
source changed in **doc comments only**:

```bash
git diff 15246f05 HEAD -- contracts/arisan_rooms/src/lib.rs   # every line is //! or ///
git diff 15246f05 HEAD -- Cargo.toml Cargo.lock               # empty
```

`test.rs` is `#![cfg(test)]` and never reaches the release build. But Soroban
embeds **item doc comments in the contract's spec section**, so rewording a
`///` changes the bytecode. The evidence is measurable: CI's WASM artifact grows
from 9,098 to 9,235 bytes at exactly the commit that reworded those comments,
and the live code still carries the old wording.

```bash
# 15246f05 (deployed source) -> 9098 ; 3257c7a (doc comments reworded) -> 9235
for r in 29420588469 29479986494; do
  gh api repos/awrisan/awrisan/actions/runs/$r/artifacts \
    --jq '.artifacts[] | select(.name=="arisan-rooms-wasm") | .size_in_bytes'
done
```

So, precisely: **the logic executing on testnet is the logic in this repository**
— the entire diff since the deployed build is comments — but a fresh
`stellar contract build` at `HEAD` will *not* hash to `a822f243...dad8a`.
Redeploying from `HEAD` is the fix, and it has not been done.

**Provenance note:** the instance was created at `2026-07-15T13:11:24Z`
(`created: 1784121084` above), about 35 minutes *before* CI run `29420588469`
existed, so no run in this repository's history deployed it. Provenance here
rests on **bytecode identity plus a comment-only diff**, not on a deployment we
can point a commit at.

---

## A complete arisan cycle, proven on-chain

Room 6 ran an entire cycle to completion: 3 members, 3 rounds, every member won
exactly once, and the room settled to zero. Every transaction below returns
`successful: true` on Horizon today.

| Step | Round | Transaction |
|---|---|---|
| `create_room` | | [`c458c34c...7335`](https://stellar.expert/explorer/testnet/tx/c458c34c552c780796f4284a74b3036dab2f0389c9a5b13b1f23b84a6a3e7335) |
| `start_room` (all members prefunded) | | [`48f9c98c...1e46`](https://stellar.expert/explorer/testnet/tx/48f9c98ce400321f3d36c051fd41a8007299d5e026bc9da863da1cd1dc361e46) |
| `seal_kocok` | 1 | [`10c18162...b931`](https://stellar.expert/explorer/testnet/tx/10c18162fd04c76fd47566e88994cbbaf78a5cf464d48696e4b07a937c27b931) |
| `kocok` (winner paid) | 1 | [`a81862a0...cd9b`](https://stellar.expert/explorer/testnet/tx/a81862a0ce076f6d0262e2eb95b1ca834ebf05d7383400f8ef544b1c8e83cd9b) |
| `seal_kocok` | 2 | [`6bed17c0...7f31`](https://stellar.expert/explorer/testnet/tx/6bed17c0df1fd4a3fe30cc89f9f5aacd8c30ceb419481e42d7e4c8b2e6e17f31) |
| `kocok` (winner paid) | 2 | [`d68eb572...da3a`](https://stellar.expert/explorer/testnet/tx/d68eb57240a476e5913067228b591223bd9d993081a7b4037e42c413fc2ada3a) |
| `seal_kocok` | 3 | [`aa497dd1...4cba`](https://stellar.expert/explorer/testnet/tx/aa497dd1c4157f881ad656eb4b11f80a6aa13b1ef6ef7e068bdd841712164cba) |
| `kocok` (final winner paid, cycle Done) | 3 | [`0208a1fc...d58d`](https://stellar.expert/explorer/testnet/tx/0208a1fc9fd173ada365af082885703a65ba2b62cf1884d35aa375ea4387d58d) |

The two-phase draw is visible here as a pair of transactions per round: the seal
fixes the seed, the kocok derives the winner from it and pays the pot.

---

## Other rooms on the same contract

Read at ledger **3,640,257**. Rooms are live; these numbers move.

| Room | Members | Rounds paid | Create | Start |
|---|---|---|---|---|
| 7 "Arisan Sahabat" (Active) | 6 | 0, round 1 scheduled | [`ddec3901...e94b`](https://stellar.expert/explorer/testnet/tx/ddec3901226acf2bedd57da17479ef07b1b19d0b0d3ba148f4754f3f6b40e94b) | [`49cb70ef...8d2d`](https://stellar.expert/explorer/testnet/tx/49cb70ef8997e9f1d7befb3e13c30f794dd9277ae4aace3c303ae3a30a628d2d) |
| 5 "Arisan Sahabat" (Done, full cycle) | 3 | 3 | [`d2b0d1d6...f87a`](https://stellar.expert/explorer/testnet/tx/d2b0d1d630ea095d280937d8cfecf6059da8c3fcb157ff67e9e74d4dfd6ff87a) | [`2e65bf6c...0eae`](https://stellar.expert/explorer/testnet/tx/2e65bf6cbf7bcdef8ef7bbc41a42f405d7e35be1484005419ae372e508190eae) |
| 4 "Arisan Sahabat" (Active) | 3 | 1 | [`bef7362d...2a81`](https://stellar.expert/explorer/testnet/tx/bef7362d99b5073dbdd402ed83f02e9a017e8556669288fe4367fece6f8c2a81) | [`7a9fcb1d...b8b4`](https://stellar.expert/explorer/testnet/tx/7a9fcb1d0629fd513b029dca16bcbad73bfc3d269860f2cb7f1b52028170b8b4) |
| 2 "Arisan Sahabat" (Active) | 3 | 1 | [`ad365cb7...9be4`](https://stellar.expert/explorer/testnet/tx/ad365cb7f337e8e04c2e12a11604b57705012277e360a7096e962c44076a9be4) | [`597068c6...4291`](https://stellar.expert/explorer/testnet/tx/597068c6bb074e11486495cff4b412255ad326234495b2c6ec3ece1d4df94291) |
| 1 "QA Testnet Juli" (Active) | 3 | 1 | [`bf503c6f...661d`](https://stellar.expert/explorer/testnet/tx/bf503c6f556df9a7457392fb3122a90c62942d61bc3121e087e60f7f814e661d) | [`a9cdc2ed...db00`](https://stellar.expert/explorer/testnet/tx/a9cdc2ed998148f231ca710473ed56935ca0c492ebaf751b09f467613822db00) |

Room 3 is Open with 1 of 3 seats and its join deadline passed, so it can never
fill and never draw. Anyone may cancel it and every member is refunded
(`cancel_room` drops its host check once the deadline lapses).

**Reading `round` off the contract:** it counts rounds *begun*, not rounds
finished. `start_room` sets it to 1, and `kocok` pays the winner and *then*
increments, so a Done 3-member room stores `round = 4` and an Active room mid-cycle
stores one more than it has paid. Rounds actually paid = the `Winner` entries,
which is what the "Rounds paid" column above counts — one `winner_of(room, r)`
per row, not the `round` field.

Room 5's full cycle:
[seal r1](https://stellar.expert/explorer/testnet/tx/96c6ee166fb8d88fda94182d983f3a77dd7a0cfd6430462e47d428c87c9252c7) ·
[kocok r1](https://stellar.expert/explorer/testnet/tx/7e851cde2fc37f64d2e1ef4fad9a3f555467a222c5d030f291e2313261346375) ·
[seal r2](https://stellar.expert/explorer/testnet/tx/29d25c8687f446afada6f5e8b360398436757845fc6abfda3b78f67e63a9f23d) ·
[kocok r2](https://stellar.expert/explorer/testnet/tx/bf82bcc767c93b84839018a5d32ecbe7d93fa2ed2fb6ab07943f9e7498f4e4b2) ·
[seal r3](https://stellar.expert/explorer/testnet/tx/4caafcb96e1e1a5f60e6458fce86b0a7307198c6717d8684e8c952cc75e622e5) ·
[kocok r3](https://stellar.expert/explorer/testnet/tx/b30484f9ee6cf3970d6662f99a0d4615a75dfc4a33fa78823fb32fb224e31986)

---

## Read the live state yourself

No account needed. These are public reads — a Soroban read is a simulated
transaction, so it needs no signature, no fee, and no account. The app's
read-only board (see the README) makes exactly these calls from the browser,
with no backend and no keys.

```bash
# how many rooms exist
stellar contract invoke --id CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX \
  --network testnet -- room_count

# a room's full state
stellar contract invoke --id CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX \
  --network testnet -- get_room --room_id 6

# its members
stellar contract invoke --id CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX \
  --network testnet -- get_members --room_id 6
```

---

## Honest notes

- **Testnet only.** Stellar testnet is reset periodically. If these links stop
  resolving, the network was reset, not the code changed.
- **These are our own test identities**, not third-party users. This is a
  functional demonstration of the contract, not evidence of traction, and we do
  not present it as such.
- **The draw is biasable by a determined member.** See the "Known limitation"
  section in the README and the module docs in `contracts/arisan_rooms/src/lib.rs`.
  Prefunding bounds the damage to slot ordering, not principal. Commit-reveal
  bonded by the prefund is the intended fix and is not implemented yet.
- **Room metadata is public.** The invite code gates joining, not finding.
