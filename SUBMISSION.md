# Rise In Submission — Awrisan

## Target

**Stellar Journey to Mastery · Level 4 · Green Belt.**

An advanced Soroban contract that custodies real value on testnet, with a
frontend, tests, and CI.

**Try it now — live read-only board: <https://awrisan.vercel.app/app>.** It reads
the deployed contract straight from the browser (a static build, no backend, no
keys) and renders real on-chain state — the pool, each room's status, the
winners, and a per-round seed anyone can recompute. Every figure can be checked
against [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX).

> We are **not** claiming Levels 5 to 7. Those require demonstrated user
> traction, and Awrisan has none. See "What is NOT built" below. We would rather
> be scored accurately at Green than be caught overclaiming at Blue.

---

## What Awrisan is, in one paragraph

An arisan (Indonesian rotating savings circle, a ROSCA) has one structural
failure: a human, the *bandar*, holds everyone's money. That person can vanish
with it, and in Indonesia they regularly do. Awrisan replaces the bandar with a
Soroban contract. Every member prefunds their full cycle commitment before round
one, the contract draws a winner each round and pays the pot, and after N rounds
every member has won exactly once and the room settles to zero. The culture
stays. The custodian risk does not.

---

## Requirement to evidence

| What a reviewer should check | Where | Status |
|---|---|---|
| Advanced Soroban contract, deployed | [`CDTNEK4E...CIDX`](https://stellar.expert/explorer/testnet/contract/CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX) on testnet | Live |
| The contract really holds and moves value | [DEPLOYMENTS.md](DEPLOYMENTS.md): a **complete 3-round arisan cycle** on-chain, 8 transactions, all `successful` | Verifiable |
| The deployed bytecode is accounted for | [DEPLOYMENTS.md](DEPLOYMENTS.md): the live instance hashes to `a822f243...dad8a`, built by CI from commit `15246f05`. Since then the contract source changed in **doc comments only**, which Soroban embeds in the contract spec — so `HEAD` builds to a different hash with identical logic. We say so rather than let the hash pass for the wrong reason. | Verifiable, with a caveat we state |
| Contract source | [`contracts/arisan_rooms/src/lib.rs`](contracts/arisan_rooms/src/lib.rs) | 100% |
| Tests | [`contracts/arisan_rooms/src/test.rs`](contracts/arisan_rooms/src/test.rs), 13 tests, including 2 that run **without** mocked auth | Passing |
| CI | [`.github/workflows/soroban.yml`](.github/workflows/soroban.yml): `cargo fmt --check`, `cargo test --locked`, `stellar contract build --locked`, WASM uploaded as an artifact | Passing |
| Frontend | `app/`: web, installable PWA, and an Android build via Capacitor | Runs locally |
| Anyone can read the chain with no backend | **Live at [awrisan.vercel.app](https://awrisan.vercel.app/app)** — a static build reads the contract from the public RPC and renders live on-chain state. Reads only; writes need a wallet and are not built. | Deployed |
| Documentation | [README.md](README.md), bilingual (English and Bahasa Indonesia) | Complete |

---

## Verify it yourself in under five minutes

```bash
# 1. the contract is alive and holds state, no account needed
stellar contract invoke --id CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX \
  --network testnet -- room_count

# 2. read a room that ran a full cycle to completion
stellar contract invoke --id CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX \
  --network testnet -- get_room --room_id 6

# 3. the tests pass
cargo test --locked -p arisan-rooms

# 4. the bytecode running on testnet, and which commit it came from
gh run download 29420588469 -n arisan-rooms-wasm && sha256sum arisan_rooms.wasm
# That run built commit 15246f05. The live instance reports
# a822f2430d8612d9f11ce1701784e547a49fa78d8015904fc9b26125013dad8a — compare.
# It is NOT a build of HEAD: the diff since is doc comments only, and Soroban
# puts those in the contract spec. DEPLOYMENTS.md walks the whole check.
```

Or click any transaction in [DEPLOYMENTS.md](DEPLOYMENTS.md) and read it on
stellar.expert. Nothing here requires trusting us.

---

## What the tests prove

Each test name maps to a property the contract guarantees.

| Test | Property it locks down |
|---|---|
| `prefund_full_cycle_zero_residual` | Money conservation is exact. N x N x s in, N pots out, contract balance ends at **zero**. No dust, no leak. |
| `kocok_requires_seal_and_is_seed_determined` | The winner cannot be drawn without a seal, and is a pure function of the sealed seed. |
| `cannot_seal_twice` | A round's seed cannot be re-rolled once fixed. |
| `cannot_postpone_after_seal` | The host cannot postpone after the seal, which would otherwise let them re-roll. |
| `host_can_postpone_each_round_once` | The host's only asymmetric power is bounded: once per round, capped in duration. |
| `emergency_dissolve_after_unsealed_round_refunds_all` | The escape hatch is conservative: everyone owed is refunded, contract lands at zero. |
| `host_can_cancel_open_room_and_refund_all` | Cancelling an unstarted room returns every prefund in full. |
| `cannot_start_before_room_is_full` | No cycle begins underfunded. |
| `wrong_code_cannot_join` | The invite code gates joining. |
| `cannot_join_after_join_deadline` / `anyone_can_cancel_after_join_deadline` | Deadlines are enforced, and a stalled room cannot trap funds. |
| `create_room_requires_host_auth` | **Runs without mocked auth.** A room cannot be opened in a host's name without that host's signature. |
| `join_room_requires_member_auth` | **Runs without mocked auth.** The invite code alone is not enough: the code proves you were invited, the signature proves you are you. The victim's balance and the roster are asserted untouched. |

The last two matter more than they look. Every other test runs through a harness
that calls `env.mock_all_auths()`, which is correct for exercising the flow but
proves nothing about authorization: with all auths mocked, an unauthorized caller
is indistinguishable from an authorized one. These two build an env without the
mock, so the only thing that can let the call through is a real signature.

---

## Why this is a real problem, not a hackathon premise

Arisan fraud in Indonesia is prosecuted, repeatedly, with published verdicts.
Three convictions we cite in [BUSINESS-CONCEPT.md](BUSINESS-CONCEPT.md):

- **Gresik**, case `106/Pid.B/2025/PN Gsk`: Rp 1,662,550,000 taken from **63 victims**. Three years six months. **Zero restitution ordered**, meaning the victims got nothing back.
- **Banjarmasin**: Rp 11 billion, **320 victims**.
- **Salatiga**: two defendants, nine months each.

In every one of these, the money was gone before anyone could look. That is not
a people problem. It is a custody problem, and custody is the one thing a
contract can fix.

**Ecosystem gap:** we searched the Stellar ecosystem and the SCF funded list for
any ROSCA, arisan, paluwagan, chit fund, tanda, susu, stokvel, chama, hui, kye,
or equb implementation. There is none. The closest projects are community
currencies, which is a different mechanism. Awrisan is filling an actual gap,
not adding to a crowded category.

---

## What is NOT built

Stated up front, because a reviewer will find these anyway and we would rather
be the ones who told them.

- **No user traction.** Zero real users. The identities in the demo rooms are our
  own test accounts. This is why we target Green, not Blue.
- **Only the read-only board is hosted.** It is live and public at
  <https://awrisan.vercel.app>. The write path — the gateway that signs — is
  deliberately never hosted: it holds all ten test members' secret keys (next
  bullet). So the public URL can show real on-chain state but cannot create,
  join, or draw.
- **No wallet integration yet.** A local gateway holds all ten test members'
  secret keys and shells out to the Stellar CLI to sign for them. That is exactly
  why it is not hosted, and why the read-only path exists: reads need no keys at
  all. Real per-member signing (Freighter or passkey) is the next milestone, and
  it is the prerequisite for any traction claim later.
- **The deployed bytecode is one commit behind the source.** Doc comments only,
  but Soroban embeds them in the contract spec, so `HEAD` does not build to the
  deployed hash. Redeploying is the fix. Detailed in DEPLOYMENTS.md rather than
  left for a reviewer to trip over.
- **The draw is biasable.** A member willing to burn failed-transaction fees can
  revert `seal_kocok` until the seed favours them. Prefunding bounds this to slot
  ordering, never to principal, and never to anyone else's money. The intended
  fix is commit-reveal bonded by the prefund that already exists. Documented in
  the README and in the module docs. Not implemented yet.
- **Room metadata is public.** The invite code gates joining, not discovery.
- **Testnet only.** No mainnet, no real funds, no licences, no partnerships.

---

## Run it locally

```bash
cargo test --locked -p arisan-rooms       # contract tests
cd app && npm install && npm run dev      # web and PWA, reading the live contract
```

With no gateway configured, `npm run dev` puts the app in read-only mode: it
reads the deployed contract straight from the public Soroban RPC and shows real
on-chain state, with no backend and no keys. It cannot write — that needs a
wallet, and per-member signing is not built. See the README for all three modes
(gateway, read-only, and local simulation) and for what each one can and cannot
do.
