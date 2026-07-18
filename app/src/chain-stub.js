// The contract's wire format, in one place, for tests that drive the real read
// path instead of hand-writing its output.
//
// Why one place: every test file that stubbed the RPC used to carry its own copy
// of this builder, and each copy was its own private claim about what the chain
// answers. A claim made three times is not checked three times — it is unchecked
// three times, and the copies are free to disagree with lib.rs one at a time.
// This file makes it one claim, exercised by every file that reads through it.
//
// Nothing here shapes a ROOM the way the app wants it. That is stellar-rpc's job,
// and handing a test a ready-made room is how readonly-money.test.jsx came to pass
// against the very producer bug it was written to block: it asserted "no Rupiah"
// over fixtures that had no Rupiah in them because the test author left it out.
// Stub the transport; let the code under test do its own work.

import { vi } from "vitest";
import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

/** Error::NotFound, which is what a key the contract never wrote answers. */
export const NOT_FOUND = { error: "HostError: Error(Contract, #4)" };

/**
 * Error::NotSealed (lib.rs:154), and NOT NotFound: seal_of is the one read here
 * that says a missing key with a different word, `.ok_or(Error::NotSealed)` at
 * lib.rs:786. Nothing downstream reads the code — readSeal catches everything and
 * answers null — so this costs nothing today and is the whole point: a stub that
 * mislabels the chain is a fixture that has quietly stopped being evidence, and
 * the next reader who does branch on the code inherits the lie.
 *
 * Probed at ledger 3,640,271: every live Active room answers this for the round it
 * is sitting on, because seal_kocok runs in its own transaction.
 */
export const NOT_SEALED = { error: "HostError: Error(Contract, #12)" };

/** Real testnet addresses: nativeToScVal checks the strkey, so junk will not do. */
export const ADDRESSES = [
  "GCANYLS5NNU2RERJZLFN6522I37PZPNRPYSUYL2MMUQME6JAJA2UUVYR",
  "GDQR45VM7CP4A6J6TGBNCSMZ3S6HKDTGLNZ576A5YYGKTBN3SSG2J6NS",
  "GBS4UB2FNG3VTNBCGLR7BOMYIT3L7NVNV5BJFU4Z77R5YYPRQ5AX2GED",
];

/** How a chain member is named on screen; stellar-rpc's shortAddress. */
export const short = (address) => `${address.slice(0, 4)}...${address.slice(-4)}`;

/** Build what simulateTransaction returns for a successful read. */
export function ok(scval) {
  return { result: { retval: scval }, transactionData: {}, minResourceFee: "1" };
}

/** Which contract function a built simulation tx is asking for, and with what. */
export function invocation(tx) {
  const call = tx.operations[0].func.invokeContract();
  return {
    name: call.functionName().toString(),
    args: call.args().map((arg) => scValToNative(arg)),
  };
}

/**
 * A room exactly as the contract returns it, enums wrapped in vecs and all.
 *
 * The defaults are a finished 3-seat room, because that is the shape most of
 * these tests care about: round 4 is where kocok's counter stops on a 3-member
 * room, one past the last round anyone drew (lib.rs:591-605).
 */
export function roomScVal({
  status = "Done",
  cadence = "Weekly",
  round = 4,
  memberCount = 3,
  memberTarget = 3,
  firstKocok = 1784178278,
  name = "Arisan Test2",
  share = 1_000_000n,
} = {}) {
  return nativeToScVal(
    {
      cadence: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(cadence)]),
      code: "AWRDE2767",
      first_kocok: BigInt(firstKocok),
      host: ADDRESSES[0],
      join_deadline: BigInt(firstKocok) - 30n,
      member_count: memberCount,
      member_target: memberTarget,
      name,
      round,
      share,
      status: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(status)]),
    },
    {
      type: {
        code: ["symbol", "string"],
        name: ["symbol", "string"],
        host: ["symbol", "address"],
        first_kocok: ["symbol", "u64"],
        join_deadline: ["symbol", "u64"],
        member_count: ["symbol", "u32"],
        member_target: ["symbol", "u32"],
        round: ["symbol", "u32"],
        share: ["symbol", "i128"],
      },
    }
  );
}

/**
 * A u64 big enough that Number() cannot hold it, which is the point.
 *
 * Real seeds are u64s around 7e18 (room 6 round 1 is 7314979439510601104 on the
 * live chain), and every consumer of a seed has to reach for BigInt to stay exact.
 * A stub seed small enough to survive Number() would let a reader ship the lossy
 * modulo and pass. Arbitrary digits, no meaning; only the magnitude is load-bearing.
 */
const SEED_BASE = 7_777_777_777_777_777_777n;

/**
 * The seed a round's kocok must have run on, derived from the winner the entry
 * declares — never invented independently of it.
 *
 * This is arithmetic, not convenience. kocok does not pick a winner and record a
 * seed beside it: it DERIVES the winner from the seed, `winner = pool.get(seed %
 * pool.len())` (lib.rs:574-575), over the pool it builds by walking Members and
 * skipping Won (:558-568). So a seed and a winner that disagree describe a chain
 * state the contract cannot produce. Handing the tests one would be worse than
 * handing them nothing: ChainRoomCard recomputes the draw through verifyRound and
 * renders a MISMATCH sentence, so an arbitrary seed would stand the suite up in
 * front of a false accusation against the contract and teach it to pass.
 *
 * Null where the entry declares no winner for the round, or declares a winner but
 * a hole before it — the pool at round R is Members minus the winners of 1..R-1,
 * so a missing earlier round is a pool this cannot honestly reconstruct. That
 * lands on Error::NotSealed, which is readSeal's real null branch.
 */
function sealFor(entry, round) {
  const winner = entry.winners?.[round];
  if (!winner) return null;
  const before = [];
  for (let earlier = 1; earlier < round; earlier += 1) {
    const address = entry.winners?.[earlier];
    if (!address) return null;
    before.push(address);
  }
  // Same roster get_members answers with, sliced the same way, so the pool this
  // derives over is the pool the reader reconstructs.
  const unwon = ADDRESSES.slice(0, entry.memberCount).filter((a) => !before.includes(a));
  const index = unwon.indexOf(winner);
  if (index < 0) return null;
  // Any u64 congruent to `index` modulo the pool size picks this winner, and the
  // contract cares about nothing else in the seed. Take the big one.
  const length = BigInt(unwon.length);
  return SEED_BASE - (SEED_BASE % length) + BigInt(index);
}

/**
 * simulateTransaction, answered out of a `chain` object the test owns:
 *
 *   rooms       ids 1..n, in order. Each entry is roomScVal's argument plus the
 *               things the contract keeps outside the Room struct: `winners`
 *               ({ round: address }, what winner_of answers), `kocokAt`
 *               ({ round: unixSeconds }, what kocok_at answers) and optionally
 *               `seals` ({ round: u64 }, what seal_of answers). Omit `seals` and
 *               every won round gets the seed its winner implies — a room that
 *               paid a winner it has no seal for is a room the contract cannot
 *               produce, because kocok loads the Seal before it draws
 *               (lib.rs:552-556) and nothing ever removes one. Declare `seals` to
 *               say otherwise, which is how the archived-past-TTL branch is
 *               reachable.
 *   failIds     room ids the RPC will not answer for, at all.
 *   failWinners winner_of misses for every round, get_room still answers.
 *   down        no RPC.
 *   calls       every function name asked for, in order, appended here.
 *
 * The failure knobs are not decoration: every read stellar-rpc makes can fail on
 * its own, and what the screen says when one does is why several of these tests
 * exist. Built here rather than in each file so `chain` means one thing.
 *
 * Declare it with vi.hoisted — the vi.mock factory that installs this runs before
 * the test file's imports, so it cannot call anything imported from here.
 */
export async function simulateChain(chain, tx) {
  if (chain.down) throw new Error("rpc unreachable");
  const { name, args } = invocation(tx);
  chain.calls.push(name);
  if (name === "room_count") return ok(nativeToScVal(chain.rooms.length, { type: "u32" }));

  const roomId = Number(args[0]);
  // An RPC that will not answer for this room. readRooms cannot tell this from
  // an archived entry, and does not try to — but it must not report either as
  // "the contract holds nothing".
  if (chain.failIds.has(roomId)) throw new Error("429 Too Many Requests");

  const entry = chain.rooms[roomId - 1];
  if (!entry) return NOT_FOUND;
  switch (name) {
    case "get_room":
      return ok(roomScVal(entry));
    case "get_members":
      return ok(nativeToScVal(ADDRESSES.slice(0, entry.memberCount), { type: "address" }));
    case "kocok_at":
      return entry.kocokAt?.[Number(args[1])]
        ? ok(nativeToScVal(BigInt(entry.kocokAt[Number(args[1])]), { type: "u64" }))
        : NOT_FOUND;
    case "winner_of": {
      // A winner the contract holds but the RPC will not hand over. Not
      // contrived: readWinners asks once per finished round, so a Done room is
      // several independent reads that can each fail on their own.
      if (chain.failWinners) return NOT_FOUND;
      const winner = entry.winners?.[Number(args[1])];
      return winner ? ok(nativeToScVal(winner, { type: "address" })) : NOT_FOUND;
    }
    case "seal_of": {
      const round = Number(args[1]);
      // An entry that declares `seals` is taken at its word, holes included.
      const seed = entry.seals ? entry.seals[round] : sealFor(entry, round);
      return seed == null ? NOT_SEALED : ok(nativeToScVal(BigInt(seed), { type: "u64" }));
    }
    default:
      return NOT_FOUND;
  }
}

/** No gateway is hosted, so this is what the public build gets on /api/*. */
export function stubStaticHost() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  )));
}
