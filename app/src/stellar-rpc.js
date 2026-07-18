// Read the contract straight from the browser. No gateway, no keys, no signing.
//
// Why this exists: the local gateway holds ten members' secret keys and shells
// out to the Stellar CLI, so it cannot be hosted for a reviewer to click, and
// hosting it would put ten keys on a server for a project whose entire thesis is
// that nobody should hold everyone's money. Reads do not need any of that. A
// Soroban read is a simulated transaction: no signature, no submission, no fee,
// no account required. So the browser can talk to the public RPC itself, and a
// static build can show real on-chain state to anyone, with no backend at all.
//
// Writes still need a real wallet (Freighter or passkey) and are not wired yet.
// Until they are, this module is honest about being read-only.

import {
  Account,
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

// Public data. The contract id is on-chain and in DEPLOYMENTS.md; nothing here
// is a secret. Overridable at build time so a fresh deploy needs no code change.
export const RPC_URL = import.meta.env?.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
export const CONTRACT_ID =
  import.meta.env?.VITE_AWRISAN_CONTRACT_ID ||
  "CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX";
export const NETWORK_PASSPHRASE = import.meta.env?.VITE_STELLAR_PASSPHRASE || Networks.TESTNET;

// Any well-formed account works as a simulation source: simulateTransaction
// never submits, so this account is never touched, never charged, and does not
// even have to exist. Using a fixed all-zero key keeps reads deterministic and
// makes it obvious to a reader that nothing is being signed.
const SIM_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

let cachedServer = null;
function server() {
  if (!cachedServer) cachedServer = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });
  return cachedServer;
}

/**
 * At most this many simulations in flight at once, across every caller.
 *
 * The fan-out is not one loop wide: readRooms fans out over rooms and readWinners
 * fans out over rounds inside it, so the burst multiplies. Today's 7-room board is
 * 39 simulateTransaction calls in one go — 1 room_count, 2 per room, 1 for each
 * Active room's round and each Done room's last, and 2 per finished round (its
 * winner and its seed) — and a 100-room contract is hundreds, all at a public RPC
 * nobody here pays for. (Counted against the live board, not estimated: 4 Active,
 * 2 Done, 1 Open, nine rounds won between them, re-counted at ledger 3,640,271
 * when the seed read took it from 30 to 39. getLatestLedger is not in it — that is
 * readStatus's own read, it is not a simulation, and does not pass through here.)
 *
 * Silence is what makes it dangerous. A 429 comes back to readRooms as
 * `catch { return null }`, which is the same answer as "this room does not
 * exist", so an over-eager read does not fail loudly — it quietly drops rooms and
 * the page renders a smaller contract than the one that exists.
 *
 * The gate sits here, and not around either loop, because this is the one place
 * every read already passes through: a cap on a caller only caps that caller.
 */
const MAX_IN_FLIGHT = 5;
let inFlight = 0;
const waiting = [];

/** Run `task` once a slot is free. ponytail: FIFO, no priorities, no timeout. */
async function withSlot(task) {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise((resolve) => waiting.push(resolve));
  else inFlight += 1;
  try {
    return await task();
  } finally {
    // Hand the slot straight to the next waiter instead of releasing it. A
    // decrement here would let a caller arriving before the woken waiter resumes
    // read the count as free and take the slot as well — and then both run, over
    // the cap. inFlight only falls when nobody is queued behind it.
    const next = waiting.shift();
    if (next) next();
    else inFlight -= 1;
  }
}

/** Invoke a read-only contract function through simulation. Returns native JS. */
async function readContract(fnName, args = []) {
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(new Account(SIM_SOURCE, "0"), {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(fnName, ...args))
    .setTimeout(30)
    .build();

  const sim = await withSlot(() => server().simulateTransaction(tx));
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`${fnName}: ${sim.error}`);
  }
  if (!sim.result?.retval) {
    throw new Error(`${fnName}: simulation returned no value`);
  }
  return scValToNative(sim.result.retval);
}

export function isRpcConfigured() {
  return Boolean(CONTRACT_ID && RPC_URL);
}

/** Ledger height, and proof the RPC is actually answering. */
export async function getLatestLedger() {
  const { sequence } = await server().getLatestLedger();
  return sequence;
}

export async function readRoomCount() {
  return Number(await readContract("room_count"));
}

export async function readRoom(roomId) {
  return readContract("get_room", [xdr.ScVal.scvU32(roomId)]);
}

export async function readMembers(roomId) {
  const raw = await readContract("get_members", [xdr.ScVal.scvU32(roomId)]);
  return (raw || []).map((entry) =>
    typeof entry === "string" ? entry : Address.fromScVal(entry).toString()
  );
}

/**
 * Keys are RoomStatus in contracts/arisan_rooms/src/lib.rs. Values must be keys
 * of STATUS_LABELS in ui.jsx, because that object is the app's entire status
 * vocabulary: a status it cannot name renders as a bare word over an action
 * panel with no branch for it. Neither end is visible from this file, so
 * stellar-rpc.test.js reads the Rust enum and imports the labels, and goes red
 * if either side drifts. The map that shipped before had both ends wrong at
 * once: a `Cancelled` the contract never had, no `Dissolved`, and "open"/"done"
 * that no badge and no panel knew.
 */
export const STATUS_MAP = {
  Open: "funding",
  Active: "sealed",
  Done: "paid",
  Dissolved: "dissolved",
};

/**
 * A payload-free Soroban enum arrives as a one-element vec, so `status` reads
 * back as ["Done"], not "Done". Indexing a map with the raw array happens to
 * work, because JS stringifies the key and ["Done"] becomes "Done", but that is
 * accidental: the day a variant carries a payload it silently becomes "Done,7"
 * and every lookup misses. Unwrap it on purpose instead.
 */
export function enumName(value) {
  if (Array.isArray(value)) return value.length ? String(value[0]) : "";
  return value === undefined || value === null ? "" : String(value);
}

/**
 * A unix second as an Indonesian date, or null when it is not one.
 *
 * The null branch is not defensive decoration: create_room bounds first_kocok
 * from BELOW alone (`first_kocok < now + JOIN_WINDOW`, lib.rs:198) and never from
 * above, so a room can be created with a first_kocok far outside the ~±8.64e15 ms
 * a Date can hold, and start_room copies it straight into KocokAt(id, 1)
 * (:404-406) for kocok_at to hand back here.
 *
 * toLocaleString does NOT throw on that (probed on node 24: an out-of-range Date
 * returns the literal string "Invalid Date"), which is worse than throwing — the
 * string is emitted as `nextDate` and printed where a date goes, so it reads as
 * something this room actually has. Null says we have no date to show. `nextKocok`
 * still carries the raw seconds the chain gave us, for a reader who wants them.
 */
function formatSchedule(unixSeconds) {
  if (!unixSeconds) return null;
  const at = new Date(Number(unixSeconds) * 1000);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortAddress(address) {
  return address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";
}

/**
 * What the contract still holds for this room, in stroops. This is NOT the pot:
 * the pot is one round's payout, and holdings are the whole cycle minus the
 * rounds already paid. Every member locks `share * member_target` at join, and
 * each kocok hands exactly one of those prefunds to a winner, so holdings fall
 * by one prefund per round and a finished room holds nothing.
 *
 * Zero for Dissolved is arithmetic, not a blanket "everyone was refunded", and
 * the two paths into that status do not refund the same people. cancel_room
 * (lib.rs:417) only runs from Open (:425) and hands every member their whole
 * lock back (:437-439, via refund_member at :860). emergency_dissolve (:670) only
 * runs from Active (:678) and pays `share * member_count` (:704) to each member
 * with no Won entry (:714) — a member who already won keeps their pot and is
 * refunded nothing. It still lands on zero: at round R the contract holds
 * (target - R + 1) prefunds and R - 1 members have won, so the remaining
 * target - R + 1 unwon members take exactly one prefund each.
 *
 * WHY THIS IS DERIVED AND NOT READ, since `locked_of` (lib.rs:756) is right there
 * and answers per member: locked_of does not mean what its name says. It returns
 * DataKey::Locked, which is written in exactly two places (create_room:258,
 * join_room:312, both `share * member_target`) and removed in exactly one
 * (refund_member:877, reached only from leave_room:359 and cancel_room:438).
 * kocok pays the winner at :585 and never touches it; emergency_dissolve
 * transfers refunds at :715 and never calls refund_member. So it says "locked"
 * and means "deposited at join, minus leave/cancel refunds", and it keeps saying
 * it over money the contract has already handed back out. Probed live at ledger
 * 3,640,271: locked_of(5, GCAN..UVYR) = 3000000 with has_won = true, on a Done
 * room whose real balance is zero. Reading it and printing it under "terkunci" is
 * the field-under-the-wrong-word bug wearing a chain read as proof — the same bug
 * this file's `amountStroops` comment is about, living inside the contract's own
 * ABI. The arithmetic below is checked against the one number that cannot be
 * argued with: sum over the board equals the contract's real native balance
 * (57,000,000 stroops, reconfirmed at ledger 3,640,271 against the native SAC's
 * balance() — see stellar-rpc.test.js).
 */
function lockedStroops({ status, prefund, memberCount, target, round }) {
  switch (status) {
    case "Done":
    case "Dissolved":
      return 0;
    case "Active":
      // Rounds 1..round-1 are paid out. start_room pins member_count to
      // member_target before Active is reachable, so target is the roster.
      return (target - round + 1) * prefund;
    case "Open":
      // Nobody has been paid; only the seated members have paid in.
      return memberCount * prefund;
    default:
      // An unknown variant means the contract moved and this file did not.
      // A number invented here is a room lying about its balance; say nothing.
      return null;
  }
}

/**
 * kocok_at(room_id, round): the deadline stored for ONE round, or null.
 *
 * Null is two answers this file cannot tell apart and does not try to: the
 * contract never wrote that key (Error::NotFound, lib.rs:774-778), or the read
 * did not come back. Both mean the same thing to a caller — no date to show —
 * and naming one of them would be inventing the evidence. Which rounds are worth
 * asking about is the two callers' question; this one only asks.
 */
async function readKocokAt(roomId, round) {
  try {
    return Number(
      await readContract("kocok_at", [xdr.ScVal.scvU32(roomId), xdr.ScVal.scvU32(round)])
    );
  } catch {
    return null;
  }
}

/**
 * The deadline of the round a room is on, or null when it has no such round.
 *
 * Only Active has one. start_room writes KocokAt(id, 1) (lib.rs:404-406) and
 * kocok writes KocokAt(id, round + 1) only while rounds remain (:600-603), but
 * advances `round` regardless (:605) — so a Done room's round is one past the
 * last key ever written and the read answers NotFound. An Open room has no key at
 * all. Dissolved is the one that can answer: emergency_dissolve runs only from
 * Active (:678), so the round it refunded on keeps its key, and reading it would
 * date a refunded room's next kocok. (The other way in, cancel_room, runs only
 * from Open (:425) at round 0 and has no key to offer.) Ask only where the answer
 * means something.
 *
 * A miss costs the room its round's date, not its place on the page.
 */
async function readRoundSchedule(roomId, status, round) {
  if (status !== "Active") return null;
  return readKocokAt(roomId, round);
}

/**
 * The last round's deadline on a finished room: the EARLIEST instant it can have
 * ended, never the instant it did.
 *
 * The chain records who won a round and never when — kocok stores Won and Winner
 * and no time (lib.rs:586-591), and seal_of (:782) returns the PRNG seed, not a
 * clock. What it does record is the deadline the round could not run before:
 * kocok reads KocokAt(id, round) and returns NotYet while `now < deadline`
 * (:542-548). So the last round ran at or after its own deadline, off by however
 * long the members took to call it. That is a floor, and a floor the chain proves.
 * It is emitted under a name that says so, because "the room finished at this
 * moment" is a claim nothing here can support.
 *
 * The last round on a Done room is `round - 1`: kocok writes Winner(id, round),
 * marks the room Done once `round >= member_count` (:597), and only then advances
 * (:605). Its key is always there — the keys written are exactly 1..member_count,
 * one by start_room and the rest by the round before each.
 *
 * Only Done, which is the one status that means the cycle ran to its end. An
 * Active room has not got there; an Open one never started; a Dissolved one
 * stopped without finishing, and its surviving KocokAt dates a refund, not a
 * finish. None of the three has an end for a floor to sit under.
 */
async function readFinishedAfter(roomId, status, round) {
  if (status !== "Done") return null;
  return readKocokAt(roomId, round - 1);
}

/**
 * seal_of(room_id, round): the round's sealed PRNG seed, as DECIMAL DIGITS, or null.
 *
 * A STRING, and neither of the two types this number naturally wants to be:
 *
 *   Number  — LOSSY, silently. The seed is a u64 and scValToNative hands it back
 *             as a BigInt, so Number() rounds it past 2^53: room 6's round 1 seed
 *             is 7314979439510601104 and Number() makes it ...601000. That is not
 *             a rounding you can shrug at — it lands on a DIFFERENT WINNER. The
 *             rounded seed picks index 1 of 3 where the chain picked 2, so the row
 *             would print a mismatch and accuse the contract of a draw it did not
 *             make. Checked against all nine rounds the live board has drawn: the
 *             rounding changes the recomputed winner on three of them, and leaves
 *             six untouched — which is the trap, because room 5's round 1 is one
 *             of the six. A seed can be wrong and look right.
 *   BigInt  — EXACT, and it takes the app down. Every read room lands in the
 *             DemoProvider state that demo-state.jsx puts through JSON.stringify
 *             on each change (the `localStorage.setItem(STORAGE_KEY, ...)`
 *             effect), and JSON.stringify throws TypeError on a BigInt (probed:
 *             "Do not know how to serialize a BigInt"). That throw is inside a
 *             useEffect with no catch.
 *
 * Decimal digits are exact (BigInt(String(seed)) === seed, probed) and survive the
 * round trip through localStorage. A reader doing the modulo must say BigInt(seed)
 * — which accepts this and a BigInt alike — because bare `seed % n` on a string
 * coerces through Number and is lossy again, quietly.
 *
 * Null is two answers this file cannot tell apart: the seal was never written, or
 * the read did not come back. Nothing in the contract ever removes a Seal (grep:
 * `.remove(` appears once in lib.rs, at :877, for Locked), so a round that ran has
 * one — unless its entry archived past its TTL, which maintain_room_entries
 * extends only for rounds 1..member_target (:851-856). Naming either cause would
 * be inventing the evidence, so the field says only that we asked and got nothing.
 */
async function readSeal(roomId, round) {
  try {
    return String(
      await readContract("seal_of", [xdr.ScVal.scvU32(roomId), xdr.ScVal.scvU32(round)])
    );
  } catch {
    return null;
  }
}

/**
 * Every round this room has already paid out, oldest first.
 *
 * The rounds that have a winner are exactly 1..round-1, under every status: kocok
 * writes Winner(id, round) and only then does `round += 1`, and nothing else in
 * the contract ever moves it — create leaves it 0, start_room sets it to 1. So
 * `round` counts the rounds that have begun, and one less counts the ones that
 * were won. A Done room reads member_count + 1 and has member_count winners; an
 * Open room reads 0 and asks nothing.
 *
 * The arithmetic needs no status guard, unlike readRoundSchedule, and that is not
 * an oversight: a Winner key exists only where a kocok actually paid, so it
 * cannot answer for a round that never ran the way a surviving KocokAt can. A
 * failed read costs its own row, not the room's page.
 *
 * Only rounds that have ALREADY RUN are asked for a seed, and that falls out of
 * the same 1..round-1 arithmetic rather than needing a guard of its own: the round
 * a room is sitting on is sealed in its own transaction (seal_kocok, lib.rs:465),
 * minutes or never before the kocok that spends it, so asking is a read that
 * mostly answers NotSealed. Probed at ledger 3,640,271: seal_of on the current
 * round of all four live Active rooms returned Error(Contract, #12).
 */
async function readWinners(roomId, round) {
  const rounds = Array.from({ length: Math.max(0, round - 1) }, (_, index) => index + 1);
  const rows = await Promise.all(
    rounds.map(async (roundNumber) => {
      try {
        // Together, not in sequence: the seed does not depend on the winner, and
        // a serial pair here would cost the board a round trip per finished round.
        // readSeal resolves either way, so only winner_of can reject — and a round
        // whose winner will not read has no row for a seed to sit on.
        const [address, seed] = await Promise.all([
          readContract("winner_of", [
            xdr.ScVal.scvU32(roomId),
            xdr.ScVal.scvU32(roundNumber),
          ]).then(String),
          readSeal(roomId, roundNumber),
        ]);
        return {
          round: roundNumber,
          // The room detail marks a member's row by matching this against
          // member.name, and a chain member is named by its short address.
          winner: shortAddress(address),
          address,
          // The seed this round's winner was derived from: kocok loads the seal
          // (lib.rs:552-556), builds the unwon pool by walking Members and skipping
          // Won (:558-568), and takes pool[seed % pool.len()] (:574-575). Nothing
          // rewrites Members once a room is Active — push_back is join_room's
          // (:306), the order-preserving rebuild is leave_room's (:348-355), and
          // both refuse anything but Open (:276, :335) — and Won is written only by
          // kocok, in round order (:588). So the pool that drew round N is Members
          // minus the winners of 1..N-1, which is reconstructible from these rows,
          // which is what makes the draw checkable by anyone holding this array.
          // What that checks is narrow, and the disclosure beside it is not
          // optional: it proves the winner was DERIVED from a seed sealed in an
          // earlier transaction, not that the seed was fair. lib.rs:23-29 says
          // plainly that seal_kocok returns the seed in the tx that writes it, so a
          // member willing to burn failed-tx fees can revert until it favours them.
          // Prefunding bounds that to slot order, never principal (:30-33).
          // Decimal digits or null; never undefined. See readSeal.
          seed,
          // No timestamp: the contract records who won a round, never when. kocok
          // refuses until now >= the round's deadline and then stores the winner
          // alone, so kocok_at is the earliest a kocok could have run and not the
          // moment it did. The row falls back to "tercatat" rather than carry a
          // date invented here.
        };
      } catch {
        return null;
      }
    })
  );
  return rows.filter(Boolean);
}

/**
 * Shape one on-chain room like the gateway's room objects, so the existing UI
 * renders it without changes. `source: "stellar"` marks it as real. Whether its
 * actions may be offered is the network's answer and not the room's, so nothing
 * here carries a flag for it: demo-state's isReadOnly asks the live mode, because
 * a flag frozen at read time outlives the mode that set it.
 */
function toRoom(roomId, chain, members, { kocokAt = null, finishedAfter = null, winners = [] } = {}) {
  // share is an i128, so scValToNative hands back a BigInt. A double holds an
  // exact integer to 2^53 — 9e15 stroops, ~900M XLM — which is every share a
  // room could actually be funded with, and not every share the type allows:
  // create_room bounds share from below alone (`share <= 0`, lib.rs:197), and an
  // i128 reaches far past the ~5e17 stroops of XLM that exist. What keeps the
  // chain inside the double is balances, not types: join_room must TRANSFER
  // share * member_target before it seats a member (lib.rs:305-306), so a share
  // nobody can fund leaves a room nobody can join.
  const share = Number(chain.share ?? 0);
  const memberCount = Number(chain.member_count ?? members.length);
  const target = Number(chain.member_target ?? memberCount);
  const status = enumName(chain.status);
  const round = Number(chain.round ?? 0);
  // What one member locked. join_room transfers share * member_target, the FULL
  // cycle, before it pushes the address into Members, so this equals the pot by
  // arithmetic (N*s and s*N) and not by meaning: the pot is what one winner
  // takes home, this is what one member put in.
  const prefund = share * target;
  return {
    id: `stellar-${roomId}`,
    chainRoomId: roomId,
    source: "stellar",
    contractId: CONTRACT_ID,
    code: String(chain.code ?? ""),
    // `||`, not `??`: create_room bounds member_target, share, first_kocok and
    // join_deadline (lib.rs:195-202) and never once looks at the name, so "" is a
    // name a real room can really carry — and Room.name is a plain String (:110),
    // never an Option, so an ABSENT name is the one case get_room cannot produce.
    // `??` caught only that, which is to say only rooms that cannot exist.
    name: String(chain.name || `Room ${roomId}`),
    host: shortAddress(String(chain.host ?? "")),
    hostAddress: String(chain.host ?? ""),
    // No `cadence`. Nothing rendered it, and the label it carried was primed to
    // lie the moment something did: Weekly is 60 SECONDS in the build these
    // rooms run on (lib.rs:803), so "Mingguan" named a week no room here waits.
    // The variant name is the contract's own and is the thing that is wrong; a
    // field that launders it into confident Indonesian is worse than no field.
    // `nextDate` already answers what a screen has actually asked: when next.
    // An unmapped variant still renders, under its raw name. A badge the UI
    // cannot style is a smaller lie than a real room quietly missing.
    status: STATUS_MAP[status] || status.toLowerCase(),
    round,
    memberLimit: target,
    paidCount: memberCount,
    onChainShareStroops: share,
    // The pot is what the contract pays a winner: every member's share, once.
    // Named for its unit, because `pool` is where a local room keeps the Rupiah
    // its own demo declared, and the two names met at formatRupiah: this room's
    // 3.000.000 stroops (0,3 XLM) reached the screen as "Rp3.000.000", beside a
    // real contract id. No `contribution` here for the same reason — nobody ever
    // priced this share, so any field the Rupiah formatter recognises is a lie.
    poolStroops: share * target,
    lockedStroops: lockedStroops({ status, prefund, memberCount, target, round }),
    firstKocok: Number(chain.first_kocok ?? 0),
    // The date of the round the room is on. first_kocok is round 1's deadline and
    // nothing ever moves it: kocok schedules the round after it at
    // KocokAt(round + 1) = deadline + cadence_seconds, and postpone_kocok rewrites
    // KocokAt and leaves first_kocok alone. So first_kocok answers for round 1 and
    // for no other round, and without this read a room past its first has no true
    // date to show — off by one cadence per round elapsed, and a cadence is 60s,
    // 120s or 300s in the default build these rooms run on (lib.rs
    // cadence_seconds), not the week or month its name says. Null is honest here:
    // the room detail falls back to first_kocok and captions it as first_kocok
    // rather than naming it for whatever round the room has reached.
    nextKocok: kocokAt,
    // The same date, pre-formatted, for the one screen that prints it raw. Null
    // where nextKocok is null, and NOT `?? chain.first_kocok`: the room list
    // prints this under a bare calendar glyph with nothing to caption it (the
    // `room.nextDate ? <CalendarBlank/> ...` row in RoomCard, AppPages.jsx), so
    // the fallback captioned round 1's long-gone deadline as the next draw — on
    // two rooms that had already paid every round, and one that can never start
    // (rooms 5, 6 and 3 on the live board, re-probed at ledger 3,641,360).
    // firstKocok is still emitted below for a reader willing to name it.
    //
    // The room detail is NOT a second home for the fallback, and this comment
    // used to say it was: its `scheduledAt` reads nextKocok and then `room.drawAt`
    // (AppPages.jsx, RoomDetailPage) — never first_kocok — and drawAt is a field a
    // chain room must not carry. So it shows no date either, and the caption it
    // would have used is `Jadwal putaran ${room.round}`, which names the round the
    // room is ON. Captioning round 1's deadline with it would date the wrong round.
    nextDate: formatSchedule(kocokAt),
    // A floor under a finished room's end, never the moment it ended. See
    // readFinishedAfter: the chain dates no kocok, and this is the closest thing
    // it can prove — the deadline the last round refused to run before. Unix
    // seconds, and only on a Done room. A reader must say "setelah"; anything
    // that reads as "finished at" is a claim past the evidence.
    finishedAfter,
    joinDeadline: Number(chain.join_deadline ?? 0),
    // Rounds 1..round-1, oldest first. Empty is a real answer for a room that
    // has not drawn yet, and also what a failed read leaves behind, so the room
    // detail decides which it is from `round` rather than from this length.
    history: winners,
    members: members.map((address) => ({
      // The contract has no separate "setor" step to still be waiting on:
      // join_room moves the money before it seats the address, so being on this
      // list IS the proof of payment. Anything unpaid is simply not a member.
      // Stroops, not Rupiah: an on-chain member's stake has no IDR price.
      id: address,
      name: shortAddress(address),
      address,
      paid: true,
      amountStroops: prefund,
    })),
  };
}

/**
 * Read every room the contract knows about. Rooms are ids 1..room_count; a room
 * that fails to read is skipped rather than failing the whole list, because one
 * bad id should not blank the page.
 *
 * `unread` is how many were skipped, and it comes back with them because
 * dropping them silently is a lie the caller cannot see through: a page summing
 * these rooms cannot tell "the contract holds nothing" from "nothing answered",
 * and it printed "0 XLM terkunci di Stellar Testnet", beside a live ledger
 * height, over a contract holding 5,7 XLM.
 *
 * It says how many, never why. An archived entry, an RPC 429 and a contract this
 * file has drifted from all arrive at the catch below as the same rejected
 * promise, and naming one of them here would be inventing the evidence. `unread`
 * claims only that we asked and got no answer. room_count is different: without
 * it there is no list to be partial about, so that one throws.
 */
export async function readRooms() {
  const count = await readRoomCount();
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const rooms = await Promise.all(
    ids.map(async (id) => {
      try {
        const [chain, members] = await Promise.all([readRoom(id), readMembers(id)]);
        // Serial on purpose: which round to ask about is the room's own answer,
        // so none of these can be batched with the read that supplies it.
        const status = enumName(chain.status);
        const round = Number(chain.round ?? 0);
        // The first two never both fire: one asks where the room is going, the
        // other where it has been, and no status is in both places at once.
        const [kocokAt, finishedAfter, winners] = await Promise.all([
          readRoundSchedule(id, status, round),
          readFinishedAfter(id, status, round),
          readWinners(id, round),
        ]);
        return toRoom(id, chain, members, { kocokAt, finishedAfter, winners });
      } catch {
        return null;
      }
    })
  );
  const read = rooms.filter(Boolean);
  return { rooms: read.reverse(), unread: count - read.length };
}

/**
 * The status object the app already understands, but sourced from the chain.
 * `mode: "readonly"` is deliberately not "stellar" and not "local": the data is
 * real, the actions are not available. Saying "connected" here while writes are
 * impossible would be the same kind of confident lie we removed elsewhere.
 */
export async function readStatus() {
  const ledger = await getLatestLedger();
  return {
    connected: true,
    // No `canWrite`. It said "we cannot act" a second time, next to the `mode`
    // that already says it, and nothing read it: demo-state's canWrite is a
    // PREDICATE over this object (`network?.mode === "stellar"`, demo-state.jsx),
    // not a field off it. A dead field would merely be noise; this one shadowed
    // the live name, and the shape it shadowed made it wrong. The gateway's
    // status emits `mode` and no canWrite (server/testnet-gateway.mjs, the
    // `connected: true, mode: "stellar"` branch), so `network.canWrite` read
    // false here, where writes are impossible, and undefined there, where they
    // are the whole point — falsy on the one path that CAN sign. A field that is
    // right by accident where it agrees with `mode` and wrong where it does not
    // is the `readOnly: true` flag again, which this file already deleted once
    // for this exact reason. One question, one answer, asked of `mode`.
    mode: "readonly",
    network: "testnet",
    contractId: CONTRACT_ID,
    // No `explorerBaseUrl`: nothing read it. The one page that links to the
    // explorer builds its own URL inline, and this copy existed only to mirror
    // the gateway's status shape (server/bootstrap-testnet.mjs:114) — which is
    // how the `readOnly` flag survived long enough to be reached for.
    latestLedger: ledger,
    message:
      "Data dibaca langsung dari smart contract di Stellar Testnet. Mode baca saja: membuat room dan kocok butuh wallet, dan itu belum tersedia di web publik.",
  };
}
