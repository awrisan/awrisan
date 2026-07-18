import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STATUS_LABELS } from "./ui.jsx";

// The module builds an rpc.Server at call time, so stub the SDK before import.
const simulate = vi.fn();
const getLatestLedger = vi.fn(async () => ({ sequence: 3_634_942 }));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: class {
        simulateTransaction = simulate;
        getLatestLedger = getLatestLedger;
      },
    },
  };
});

const { CONTRACT_ID, STATUS_MAP, enumName, isRpcConfigured, readRooms, readStatus } = await import(
  "./stellar-rpc.js"
);
const { nativeToScVal } = await import("@stellar/stellar-sdk");
// roomScVal and ok are the contract's wire format, shared with every other
// file that stubs this transport so the shape is one claim, not four.
const { ADDRESSES: MEMBERS, invocation, ok, roomScVal, simulateChain } = await import(
  "./chain-stub.js"
);

/**
 * readRooms answers { rooms, unread }, because a room it could not read is
 * dropped from the list and has to be counted somewhere. Most tests below only
 * ask about a room's shape and do not care how many went missing.
 */
const roomsOf = async () => (await readRooms()).rooms;

/**
 * Answer every read out of a board, by function name and arguments.
 *
 * The mockResolvedValueOnce queue the tests above use is a claim about call
 * ORDER as much as about answers, and it stops being writable once a room makes
 * a variable number of reads: a finished 3-seat room asks for its winners three
 * times and its last deadline once, and pinning that queue pins an ordering no
 * caller promised. simulateChain answers what was actually asked.
 */
function board(rooms) {
  const chain = { rooms, failIds: new Set(), calls: [] };
  simulate.mockImplementation((tx) => simulateChain(chain, tx));
  return chain;
}

const roomById = (rooms, id) => rooms.find((room) => room.id === `stellar-${id}`);

const CONTRACT_SRC = path.join("contracts", "arisan_rooms", "src", "lib.rs");

/**
 * The same walk-up as contract-errors.test.mjs. Not imported from that file:
 * importing a test module re-registers its suites inside this one.
 */
function findLibRs() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, CONTRACT_SRC);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`could not locate ${CONTRACT_SRC} from ${process.cwd()}`);
}

/**
 * Read `pub enum RoomStatus { Open, ... }` straight out of the contract.
 *
 * One variant per line, and every line in the block has to be accounted for.
 * The version this replaces scraped `/^\s*(\w+),/gm` over the block, which reads
 * a variant only if a comma follows the name immediately — so it was blind to
 * exactly the variants that matter:
 *
 *   Cancelled(u32),            the name is followed by `(`, not `,`
 *   Cancelled { by: Address }, the name is followed by `{`, not `,`
 *   Dissolved                  the last variant, if rustfmt left no trailing comma
 *
 * Blind in the fail-GREEN direction, which is the whole problem: a variant it
 * cannot see is a variant it does not return, so it handed back the same four
 * names STATUS_MAP already had and the equality below passed while the contract
 * and the map had drifted. And the first two shapes are not hypothetical trivia:
 * a payload variant is the one thing enumName exists for, and the one that sends
 * the UI a status of "Cancelled,7". The drift detector must not go dark at
 * precisely the moment the drift is worst.
 *
 * A line this cannot parse throws rather than being skipped. That is the point:
 * silence here is what shipped a `Cancelled` the contract never had.
 */
function roomStatusVariants() {
  const src = readFileSync(findLibRs(), "utf8");
  const block = src.match(/pub enum RoomStatus \{([\s\S]*?)\n\}/);
  if (!block) throw new Error("could not find `pub enum RoomStatus` in lib.rs");
  const names = [];
  for (const line of block[1].split("\n")) {
    const code = line.replace(/\/\/.*$/, "").trim();
    if (!code || code.startsWith("#")) continue; // blank, doc comment, or attribute
    // Name, an optional payload the rest of this file is built to survive, an
    // optional trailing comma. Anything else and we do not know what we read.
    const variant = code.match(/^(\w+)\s*(?:\(.*\)|\{.*\})?\s*,?$/);
    if (!variant) {
      throw new Error(
        `RoomStatus has a variant this test cannot read: ${JSON.stringify(line.trim())}. ` +
          "Teach roomStatusVariants the shape rather than letting it skip the line — " +
          "a variant it silently drops is a variant STATUS_MAP is silently missing."
      );
    }
    names.push(variant[1]);
  }
  return names;
}

/**
 * The contract functions the module actually asked for, in call order. Counting
 * calls instead was a proxy for "which reads happened", and it stopped being one
 * the moment a second per-round read existed: a room that asks for no schedule
 * and one winner makes the same four calls as one that asks for a schedule.
 */
function calledFunctions() {
  return simulate.mock.calls.map(([tx]) =>
    tx.operations[0].func.invokeContract().functionName().toString()
  );
}

/**
 * The same reads, with their arguments, for the tests that care WHICH round was
 * asked about rather than only which function. Sorted by the callers that use it:
 * the reads leave in slot order, and no caller promises one.
 */
function calledWith() {
  return simulate.mock.calls.map(([tx]) => {
    const { name, args } = invocation(tx);
    return `${name}(${args.join(",")})`;
  });
}

describe("enumName", () => {
  // Honest note about this block. A payload-free Soroban enum arrives as
  // ["Done"], and STATUS_MAP[["Done"]] happens to resolve, because JS
  // stringifies the key and ["Done"] becomes "Done". So for today's contract the
  // unwrap is a no-op and no integration test can tell it apart from the raw
  // lookup. It is not decoration: it is the thing that keeps working the day a
  // variant grows a payload. That is testable here, and only here.
  it("unwraps a payload-free enum vec", () => {
    expect(enumName(["Done"])).toBe("Done");
    expect(enumName(["Weekly"])).toBe("Weekly");
  });

  it("takes the variant name when a variant carries a payload", () => {
    // This is where the raw lookup silently breaks: String(["Done", 7]) is
    // "Done,7", which matches nothing in STATUS_MAP, and the UI shows "done,7".
    expect(enumName(["Done", 7])).toBe("Done");
    expect(String(["Done", 7])).toBe("Done,7"); // the coercion we refuse to rely on
  });

  it("passes a plain string through and never throws on empty input", () => {
    expect(enumName("Done")).toBe("Done");
    expect(enumName([])).toBe("");
    expect(enumName(null)).toBe("");
    expect(enumName(undefined)).toBe("");
  });
});

describe("STATUS_MAP is pinned to the two files it cannot see", () => {
  it("carries exactly the contract's RoomStatus variants, no more, no fewer", () => {
    // The map that shipped had `Cancelled`, a variant the contract has never
    // had, and no `Dissolved`, which it does. Reading the Rust is the only way
    // to catch either: a hand-written expected list here would just be the same
    // guess twice.
    expect(Object.keys(STATUS_MAP).sort()).toEqual(roomStatusVariants().sort());
  });

  it("maps every variant onto a status the UI can actually name", () => {
    // The test this replaces asserted room.status === "done" — the mapper
    // against itself. It passed while "open" and "done" reached a StatusBadge
    // that had no label for them and an action panel with no branch for them,
    // which is 3 of the 7 live rooms rendering a bare word over dead space.
    for (const [variant, status] of Object.entries(STATUS_MAP)) {
      expect(Object.keys(STATUS_LABELS), `RoomStatus::${variant} -> "${status}"`).toContain(status);
    }
  });
});

describe("stellar-rpc reads the contract without a gateway", () => {
  // Without this the mockResolvedValueOnce queue leaks between tests and a
  // later test silently consumes an earlier one's leftover response.
  beforeEach(() => {
    simulate.mockReset();
    getLatestLedger.mockClear();
  });

  it("is configured with a public contract id out of the box", () => {
    expect(isRpcConfigured()).toBe(true);
    expect(CONTRACT_ID).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it("reports readonly mode, and does NOT claim it can write", async () => {
    const status = await readStatus();
    // connected: the data is real. mode: whether we can sign. Not the same claim,
    // and `mode` is the only one that answers the second — which is why there is
    // no longer a `canWrite` beside it. It was read by nothing (demo-state's
    // canWrite is a predicate over this object, not a field off it) and the
    // gateway's status never carried one, so a reader reaching for the field got
    // false here, where writes are impossible, and undefined from the gateway,
    // where they are the point. Asserted absent, not merely unused: the shape it
    // mirrored is still there to be mirrored again.
    expect(status.connected).toBe(true);
    expect(Object.hasOwn(status, "canWrite")).toBe(false);
    expect(status.mode).toBe("readonly");
    expect(status.mode).not.toBe("stellar");
    expect(status.latestLedger).toBe(3_634_942);
  });

  it("maps a chain room onto the UI shape, unwrapping vec-wrapped enums", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" }))) // room_count
      .mockResolvedValueOnce(ok(roomScVal())) // get_room(1)
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" }))); // get_members(1)

    const rooms = await roomsOf();
    expect(rooms).toHaveLength(1);
    const room = rooms[0];

    // The bug this guards: a payload-free Soroban enum comes back as ["Done"],
    // not "Done". Indexing the map with the raw array only works by accident.
    expect(room.status).toBe("paid");
    expect(room.status).not.toContain("[");
    // No cadence assertion, because there is no cadence field: it was read by
    // nothing and its label said "Mingguan" over a 60-second round (lib.rs:803).
    expect(room.cadence).toBeUndefined();

    expect(room.id).toBe("stellar-1");
    expect(room.source).toBe("stellar");
    // No readOnly flag, on purpose. Nothing read it — demo-state's isReadOnly
    // asks the live network, because a flag frozen at read time outlives the
    // mode that set it and waves a stale room through. It survived only as this
    // assertion, which is how a dead field stays alive long enough for the next
    // person to gate on it and watch the gate silently not fire.
    expect(room.readOnly).toBeUndefined();
    expect(room.round).toBe(4);
    expect(room.onChainShareStroops).toBe(1_000_000);
    expect(room.poolStroops).toBe(3_000_000); // share x member_target, the pot a winner gets
    expect(room.members).toHaveLength(3);
    expect(room.members[0].address).toBe(MEMBERS[0]);
  });

  it("hands the UI no Rupiah-denominated field at all", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal()))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })));

    const [room] = await roomsOf();

    // The screen picks its formatter by which field a room carries, and these
    // three are the names a local room keeps its declared Rupiah under. A chain
    // room filling them in is a chain room printing Rupiah: `contribution` held
    // the raw share, so 1_000_000 stroops (0,1 XLM) rendered as "Rp1.000.000"
    // beside a real contract id, on a page whose whole claim is that the numbers
    // are real. Nobody ever priced this share. There is no Rupiah to give.
    expect(room.contribution).toBeUndefined();
    expect(room.pool).toBeUndefined();
    expect(room.members.every((member) => member.amount === undefined)).toBe(true);

    // The same numbers, under names that carry their unit with them.
    expect(room.poolStroops).toBe(3_000_000);
    expect(room.onChainShareStroops).toBe(1_000_000);
    expect(room.members[0].amountStroops).toBe(3_000_000);
  });

  it("marks every member paid, because joining IS paying", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal()))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })));

    const [room] = await roomsOf();

    // join_room transfers share * member_target before it pushes the address
    // into Members, so an unpaid member cannot exist. Emitting no `paid` sent
    // the room detail down its `member.paid ? ... : "Belum setor"` branch and
    // told every member of every real room they had not paid — including the
    // three in room 6, whose money the contract had already paid back out.
    expect(room.members.every((member) => member.paid === true)).toBe(true);
    expect(room.members.map((member) => member.amountStroops)).toEqual([
      3_000_000, 3_000_000, 3_000_000, // each locked the whole cycle: share x target
    ]);
    // Stroops carry no IDR price. Naming the field `amount` would feed it to
    // formatRupiah and print 3_000_000 stroops (0.3 XLM) as "Rp3.000.000".
    expect(room.members[0].amount).toBeUndefined();
    // React keys off member.id; undefined ids collide into a duplicate-key warning.
    expect(new Set(room.members.map((member) => member.id)).size).toBe(3);
  });

  // lockedStroops is what the contract still HOLDS, which the pot is not. The
  // home screen sums rooms and calls the total "terkunci di Stellar Testnet",
  // so a pot counted there is money the contract paid out rounds ago.
  it("says a Done room holds nothing: the pot has been paid out", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal({ status: "Done", round: 4 })))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })));

    const [room] = await roomsOf();
    expect(room.lockedStroops).toBe(0);
    expect(room.poolStroops).toBe(3_000_000); // still the pot. Different question, different answer.
  });

  it("drops an Active room's holdings by one pot per finished round", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal({ status: "Active", round: 3 })))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })));

    const [room] = await roomsOf();
    // 3 members x 3_000_000 prefunded = 9_000_000 in. Rounds 1 and 2 each paid a
    // 3_000_000 pot out, so one pot is left, for the round about to run.
    expect(room.lockedStroops).toBe(3_000_000);
  });

  it("counts an Open room's holdings from who joined, not from the target", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal({ status: "Open", round: 0, memberCount: 2 })))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS.slice(0, 2), { type: "address" })));

    const [room] = await roomsOf();
    expect(room.status).toBe("funding");
    // Two seats filled, each having locked the whole cycle up front.
    expect(room.lockedStroops).toBe(6_000_000);
    // member_count is NOT the pot, even here where the two differ. kocok cannot
    // run until the room is full, and then it pays share x member_target.
    expect(room.poolStroops).toBe(3_000_000);
    expect(room.paidCount).toBe(2);
    expect(room.memberLimit).toBe(3);
  });

  it("shows a Dissolved room rather than hiding it, and says it holds nothing", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal({ status: "Dissolved", round: 0, memberCount: 2 })))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS.slice(0, 2), { type: "address" })));

    const [room] = await roomsOf();
    // Filtering it out would be the same dishonesty this module exists to
    // remove: the room is real, and its members are owed an answer about it.
    expect(room.status).toBe("dissolved");
    // Round 0, so this one was cancel_room (lib.rs:417), which only runs from
    // Open (:425) and refunds every member's whole lock (:437-439). There is no
    // `dissolve_room` in the contract — this comment used to name one.
    expect(room.lockedStroops).toBe(0);
  });

  it("skips a room that cannot be read rather than blanking the whole list, and counts it", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(2, { type: "u32" }))) // room_count = 2
      .mockRejectedValueOnce(new Error("entry archived")) // get_room(1) gone
      .mockRejectedValueOnce(new Error("entry archived")) // get_members(1)
      .mockResolvedValueOnce(ok(roomScVal({ status: "Active" }))) // get_room(2)
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })));

    const { rooms, unread } = await readRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].status).toBe("sealed"); // Active maps to the UI's "sealed"
    // The room that did not answer, counted rather than forgotten. A caller
    // summing this list has one term missing and no way to know it: the list
    // itself looks complete, so the sum reads as the contract's whole balance.
    expect(unread).toBe(1);
  });

  it("does not report an empty contract when every room failed to read", async () => {
    // The shape behind the home page's false zero: room_count says the contract
    // has rooms, every one of them fails, and readRooms resolves — with []. It
    // throws nothing, so the caller's own error path never runs and the page
    // renders a confident total over an answer it never got.
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(2, { type: "u32" })))
      .mockRejectedValue(new Error("429 Too Many Requests"));

    const { rooms, unread } = await readRooms();

    expect(rooms).toEqual([]);
    // [] is what an empty contract answers too, and these two must not look the
    // same: room_count already said there are 2.
    expect(unread).toBe(2);
  });

  it("counts nothing unread when the contract is genuinely empty", async () => {
    // The other side of the same coin: unread must not be a standing hedge that
    // makes every zero unsayable. room_count 0 has no rooms to fail.
    simulate.mockResolvedValueOnce(ok(nativeToScVal(0, { type: "u32" })));

    expect(await readRooms()).toEqual({ rooms: [], unread: 0 });
  });

  // first_kocok is round 1's deadline and nothing ever moves it. The room detail
  // heads this date "Jadwal putaran {round}", so an Active room past round 1 was
  // captioning round 1's long-gone deadline with the round it is on now — and
  // calling it "Disepakati bersama anggota". kocok_at(id, round) is the only
  // read that answers for the round in question, and the only one that sees a
  // postponement: postpone_kocok rewrites KocokAt and leaves first_kocok alone.
  it("dates an Active room by the round it is on, not by first_kocok", async () => {
    const roundTwoAt = 1784178278n + 604800n; // a week past first_kocok
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal({ status: "Active", round: 2 })))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })))
      .mockResolvedValueOnce(ok(nativeToScVal(roundTwoAt, { type: "u64" }))); // kocok_at(1, 2)

    const [room] = await roomsOf();

    expect(room.nextKocok).toBe(Number(roundTwoAt));
    expect(room.nextKocok).not.toBe(room.firstKocok); // the whole point
    expect(room.firstKocok).toBe(1784178278); // still there, still round 1's
  });

  it("never asks for a round schedule outside Active, where the answer would mislead", async () => {
    // Dissolved is the dangerous one: it was Active when it refunded, so its
    // round's KocokAt survives and would answer. A refunded room has no next
    // kocok, and a date here would claim it does. Done and Open simply have no
    // key to read; only the guard keeps that from being a wasted round-trip.
    //
    // Answered by name and argument rather than by a mockResolvedValueOnce queue:
    // the stub HOLDS both deadlines below, so this asserts the module does not ask
    // rather than that the chain has nothing to say. A queue could not make that
    // distinction, and could not survive a room whose read count varies.
    board([
      {
        status: "Dissolved",
        round: 2,
        winners: { 1: MEMBERS[1] },
        seals: { 1: "7314979439510601104" },
        kocokAt: { 1: 1784178278, 2: 1784178338 },
      },
    ]);

    const [room] = await roomsOf();

    expect(room.nextKocok).toBeNull();
    expect(calledFunctions()).not.toContain("kocok_at");

    // Its round 1 still ran and still paid, and the emergency path refunds only
    // members who have not won (lib.rs:708-717), so that winner kept the pot. The
    // room has no next kocok and a real past — refusing the date is not a reason to
    // drop the history, and the two reads are guarded on different questions.
    expect(room.history).toEqual([
      { round: 1, winner: "GDQR...J6NS", address: MEMBERS[1], seed: "7314979439510601104" },
    ]);
  });

  it("keeps a room whose round schedule cannot be read", async () => {
    simulate
      .mockResolvedValueOnce(ok(nativeToScVal(1, { type: "u32" })))
      .mockResolvedValueOnce(ok(roomScVal({ status: "Active", round: 2 })))
      .mockResolvedValueOnce(ok(nativeToScVal(MEMBERS, { type: "address" })))
      .mockResolvedValueOnce({ error: "HostError: Error(Contract, #4)" }); // NotFound

    const [room] = await roomsOf();

    // One unreadable date must not cost the room its place on the page: it
    // still renders, on first_kocok, which is what it showed before this read.
    expect(room).toBeDefined();
    expect(room.status).toBe("sealed");
    expect(room.nextKocok).toBeNull();
    expect(room.firstKocok).toBe(1784178278);
  });

  // The contract records WHO won a round and never WHEN: kocok stores Won and
  // Winner and no time (lib.rs:586-591), and seal_of (:782) hands back the PRNG
  // seed, not a clock. What it does record is the deadline the round could not
  // run before — kocok returns NotYet while `now < deadline` (:542-548) — so the
  // last round's KocokAt is a floor under the room's finish, proven by the chain.
  // The round-3 read refused it along with every other non-Active status, which
  // was honest and too quiet: the key is there and it answers.
  it("bounds a finished room by its last round's deadline, the earliest it can have ended", async () => {
    const lastRoundAt = 1784178278 + 120; // round 3's deadline: two 60s cadences on
    board([
      {
        status: "Done",
        round: 4,
        winners: { 1: MEMBERS[0], 2: MEMBERS[1], 3: MEMBERS[2] },
        kocokAt: { 1: 1784178278, 2: 1784178278 + 60, 3: lastRoundAt },
      },
    ]);

    const [room] = await roomsOf();

    // A floor, not the finish. Whoever renders it must say "setelah".
    expect(room.finishedAfter).toBe(lastRoundAt);
    // Not the same question as "when next", and not allowed to answer it: round 4
    // is the counter one past the last round that ran, and KocokAt(id, 4) was
    // never written — kocok only schedules a round it is not closing (:600-603).
    expect(room.nextKocok).toBeNull();
  });

  it("bounds nothing on a room that has not finished", async () => {
    // Dissolved is the trap. emergency_dissolve only runs from Active (lib.rs:678),
    // so the round it refunded on still has its KocokAt and the read WOULD answer.
    // That date bounds a refund, not a finish, and this room never had one.
    const rounds = { winners: { 1: MEMBERS[0] }, kocokAt: { 1: 1784178278, 2: 1784178338 } };
    board([
      { status: "Active", round: 2, ...rounds },
      { status: "Dissolved", round: 2, ...rounds },
      { status: "Open", round: 0, memberCount: 1 },
    ]);

    const rooms = await roomsOf();

    expect(roomById(rooms, 1).finishedAfter).toBeNull(); // still running
    expect(roomById(rooms, 2).finishedAfter).toBeNull(); // refunded, never finished
    expect(roomById(rooms, 3).finishedAfter).toBeNull(); // never started
    // The Active room's own round still gets dated. Different question.
    expect(roomById(rooms, 1).nextKocok).toBe(1784178338);
  });

  it("dates the list only where there is a next round to date", async () => {
    board([
      {
        status: "Done",
        round: 4,
        winners: { 1: MEMBERS[0], 2: MEMBERS[1], 3: MEMBERS[2] },
        kocokAt: { 1: 1784178278, 2: 1784178338, 3: 1784178398 },
      },
    ]);

    const [room] = await roomsOf();

    // The list prints nextDate under a bare calendar glyph with no label at all
    // (the `room.nextDate ?` row in RoomCard, AppPages.jsx). `?? first_kocok` put
    // round 1's long-gone deadline there, on a room that had already paid every
    // round, where a calendar icon and the name "next" read it as the next draw.
    // Nor does the detail page rescue it: its `scheduledAt` falls back to
    // `room.drawAt`, never to first_kocok, and a chain room carries no drawAt. So
    // the honest answer to "when next" on a finished room is nothing, on both.
    expect(room.nextDate).toBeNull();
    // Not hidden, just not renamed: first_kocok is still here, still round 1's,
    // for a reader willing to caption it.
    expect(room.firstKocok).toBe(1784178278);
    expect(room.finishedAfter).toBe(1784178398);
  });

  it("names a room the contract left unnamed", async () => {
    // create_room bounds member_target, share, first_kocok and join_deadline
    // (lib.rs:195-202) and never once looks at the name, so "" is a name a real
    // room can really carry. `??` only catches a name that is absent, and an
    // absent name is the one thing get_room cannot return — Room.name is a plain
    // String (:110), never an Option. So the fallback only ever fired for a room
    // that could not exist, and the empty <h3> in the list was unreachable by it.
    board([{ status: "Open", round: 0, memberCount: 1, name: "" }]);

    const [room] = await roomsOf();

    expect(room.name).toBe("Room 1");
  });

  it("says it cannot price an unmapped status, in the one way the screen checks", async () => {
    board([{ status: "Frozen", round: 2 }]);

    const [room] = await roomsOf();

    // Kept, under its raw name. A badge the UI cannot style beats a real room
    // quietly missing from the page.
    expect(room.status).toBe("frozen");
    // Null and never undefined, as a PRODUCER contract — not, today, as a screen.
    // This comment used to claim the home total asks `lockedStroops === null` and
    // that undefined slips the check into `?? room.pool` and prints "RpNaN". Both
    // halves are inventions: nothing in AppPages compares lockedStroops to null,
    // the home total sums `room.pool` and never touches stroops, and the one
    // reader there is passes it to formatMoney, which asks `stroops != null`
    // (demo-state.jsx) — loose, so null and undefined both land on "Belum
    // diketahui" and today render the same. The assertion is kept because the
    // contract is worth pinning where it is produced rather than where it happens
    // to be survivable: number | null, always present. A reader that DOES tell
    // them apart is then wrong loudly instead of quietly.
    expect(room.lockedStroops).toBeNull();
    expect(Object.hasOwn(room, "lockedStroops")).toBe(true);
  });

  it("surfaces a simulation error instead of returning junk", async () => {
    simulate.mockResolvedValueOnce({ error: "contract not found" });
    await expect(readRooms()).rejects.toThrow(/room_count/);
  });

  it("refuses a date it cannot hold rather than emitting the words 'Invalid Date'", async () => {
    // A room the contract will really accept: create_room bounds first_kocok from
    // BELOW alone (`first_kocok < now + JOIN_WINDOW`, lib.rs:198) and never from
    // above, and start_room copies it straight into KocokAt(id, 1) (:404-406).
    board([{ status: "Active", round: 1, firstKocok: 99999999999999, kocokAt: { 1: 99999999999999 } }]);

    const [room] = await roomsOf();

    // The raw seconds still come through. That is what the contract holds, and
    // the read did not fail — there is nothing to hide.
    expect(room.nextKocok).toBe(99999999999999);
    // But not as a sentence. 9.9e16 ms is outside the ±8.64e15 a Date can hold,
    // and toLocaleString does NOT throw on that — it returns the literal string
    // "Invalid Date", which would be emitted as this room's schedule and printed
    // wherever a date goes. Null is the answer with no claim in it.
    expect(room.nextDate).toBeNull();
    expect(room.nextDate).not.toBe("Invalid Date");
  });

  it("still prints the date it CAN hold, which is the half every other test lets pass", async () => {
    // The guard above, pointed the other way, and it was missing: every nextDate
    // assertion in this file expected null, so `formatSchedule` could have been
    // `return null` — or `return unixSeconds ? null : null` — and the whole suite
    // stayed green while the room list silently lost its only date. A one-sided
    // guard is tested by a one-sided suite; this is the other side.
    board([{ status: "Active", round: 1, kocokAt: { 1: 1784178278 } }]);

    const [room] = await roomsOf();

    expect(room.nextKocok).toBe(1784178278);
    // Not an exact string: formatSchedule asks toLocaleString for an id-ID date in
    // the runner's own zone, and pinning the rendering would pin the machine's
    // timezone and ICU build, not this module. What is asserted is what the null
    // branch cannot fake — a real date, of the right instant, rendered as words.
    expect(typeof room.nextDate).toBe("string");
    expect(room.nextDate).not.toBe("Invalid Date");
    // 2026-07-16T08:24:38Z. No zone shifts that across a year boundary, so the
    // year survives wherever this runs.
    expect(room.nextDate).toContain("2026");
  });
});

/**
 * Room 6, verbatim off the live chain: a Done 3-seat room, its roster in Members
 * order, its three winners, and the seeds they were drawn from. Every value here
 * was READ from the contract, not derived from the cadence — winners and seeds at
 * ledger 3,640,271, deadlines re-read at 3,640,478 — and every recomputation below
 * was run against the real chain before it was written down here.
 *
 * Room 6 on purpose. It is the room lie 8 shipped on — three member rows each
 * claiming "0,3 XLM terkunci untuk 3 putaran", over a room the contract had
 * already paid out to the last stroop.
 */
const ROOM_6 = {
  status: "Done",
  round: 4,
  winners: { 1: MEMBERS[2], 2: MEMBERS[0], 3: MEMBERS[1] },
  seals: {
    1: "7314979439510601104",
    2: "18343595488471420644",
    3: "11500414334239138996",
  },
  kocokAt: { 1: 1784178278, 2: 1784178338, 3: 1784178398 },
};

describe("the seed, and the draw it lets anyone recheck", () => {
  beforeEach(() => {
    simulate.mockReset();
    getLatestLedger.mockClear();
  });

  it("hands the seed over as exact decimal digits, never a lossy Number", async () => {
    board([ROOM_6]);

    const [room] = await roomsOf();

    expect(room.history.map((row) => row.seed)).toEqual([
      "7314979439510601104",
      "18343595488471420644",
      "11500414334239138996",
    ]);
    // The bug this pins. seal_of is a u64 and scValToNative hands it back as a
    // BigInt, so Number() rounds it and says nothing: round 1's seed becomes
    // 7314979439510601000, which is close enough to look right in a log and is a
    // DIFFERENT WINNER once it is divided. The test below proves that half.
    expect(Number("7314979439510601104")).toBe(7_314_979_439_510_601_000);
  });

  it("hands over a seed that reproduces the winner the contract recorded", async () => {
    board([ROOM_6]);

    const [room] = await roomsOf();

    // kocok's own derivation, in JS: walk Members, skip whoever has already won,
    // take pool[seed % pool.len()] (lib.rs:558-575). Nothing rewrites Members once
    // a room is Active — join_room push_backs (:306) and leave_room rebuilds in
    // order (:348-355), and both refuse anything but Open (:276, :335) — and Won is
    // written only by kocok, in round order (:588). So the pool that drew round N
    // is Members minus the winners of the rows above it, exactly.
    const won = new Set();
    for (const row of room.history) {
      const unwon = room.members.map((member) => member.address).filter((a) => !won.has(a));
      const index = Number(BigInt(row.seed) % BigInt(unwon.length));
      expect(unwon[index], `round ${row.round} does not recompute to its winner`).toBe(row.address);
      won.add(row.address);
    }
    // Every seat drawn exactly once, which is the cycle's whole promise.
    expect(won.size).toBe(3);
  });

  it("survives the localStorage round trip the app puts every room through", async () => {
    board([ROOM_6]);

    const [room] = await roomsOf();

    // demo-state.jsx puts the WHOLE state through JSON.stringify on every change
    // (the `localStorage.setItem(STORAGE_KEY, ...)` effect), and a read room is in
    // that state. JSON.stringify throws TypeError on
    // a BigInt ("Do not know how to serialize a BigInt"), and that call sits in a
    // useEffect with no catch — so the exact BigInt seal_of hands us does not
    // degrade the seed, it takes the app down on the frame the read lands. Digits
    // are the only form that is both exact and serialisable.
    expect(() => JSON.stringify(room)).not.toThrow();
    expect(JSON.parse(JSON.stringify(room)).history[0].seed).toBe("7314979439510601104");
    // And exact on the way back: BigInt(digits) is the seed the chain sealed.
    expect(BigInt(JSON.parse(JSON.stringify(room)).history[0].seed)).toBe(7314979439510601104n);
  });

  it("gives a won round a seed even where the fixture named none, and the right one", async () => {
    // Every suite that stubs the chain used to get `seed: null` on every Done room,
    // because chain-stub.js had no seal_of case and its default answered NotFound.
    // So the seed card — the one panel that recomputes the draw — rendered its
    // no-seed branch everywhere but here, where this file shimmed it locally. The
    // stub now derives the seal a won round must have: the contract cannot pay a
    // winner it has no Seal for, since kocok loads it before it draws
    // (lib.rs:552-556) and nothing ever removes one.
    //
    // Derived, and not invented, is the whole claim under test. kocok does not
    // record a seed beside a winner it chose — it CHOOSES the winner from the seed
    // (`pool.get(seed % pool.len())`, lib.rs:574-575). A stub free to answer any
    // u64 would hand ChainRoomCard a seed that recomputes to somebody else, and
    // verifyRound renders that as MISMATCH: a false accusation against the
    // contract, in a fixture, with the suite green around it.
    board([{ status: "Done", round: 4, winners: { 1: MEMBERS[2], 2: MEMBERS[0], 3: MEMBERS[1] } }]);

    const [room] = await roomsOf();

    const won = new Set();
    for (const row of room.history) {
      expect(row.seed, `round ${row.round} came back with no seed`).not.toBeNull();
      // Big enough that Number() cannot hold it. A stub seed under 2^53 would let
      // a lossy `Number(seed) % n` recompute correctly and ship.
      expect(BigInt(row.seed)).toBeGreaterThan(2n ** 53n);
      const unwon = room.members.map((member) => member.address).filter((a) => !won.has(a));
      const index = Number(BigInt(row.seed) % BigInt(unwon.length));
      expect(unwon[index], `round ${row.round} does not recompute to its winner`).toBe(row.address);
      won.add(row.address);
    }
    expect(won.size).toBe(3);
  });

  it("keeps a winner row whose seed cannot be read, and says so with null", async () => {
    board([{ ...ROOM_6, seals: { 1: ROOM_6.seals[1], 3: ROOM_6.seals[3] } }]);

    const [room] = await roomsOf();

    // The row survives its missing seed. Dropping it would cost more than the
    // seed: a hole in rounds 1..N-1 corrupts the unwon set every LATER round is
    // recomputed from, so a missing round 2 turns round 3 into a mismatch — our
    // gap, printed as the chain's, on the one panel whose whole subject is whether
    // we can be trusted.
    expect(room.history.map((row) => row.round)).toEqual([1, 2, 3]);
    expect(room.history[1].seed).toBeNull();
    expect(room.history[1].address).toBe(MEMBERS[0]); // the winner still reads
    // null is "we asked and got nothing". undefined is "nobody asked", and a
    // reader cannot tell that from a seed it forgot to render.
    expect(Object.hasOwn(room.history[1], "seed")).toBe(true);
  });

  it("asks for a seed once per finished round, and never for the round in play", async () => {
    board([
      {
        status: "Active",
        round: 3,
        winners: { 1: MEMBERS[0], 2: MEMBERS[1] },
        // Round 3 HAS a seal here, so this pins the module's restraint and not the
        // stub's silence.
        seals: { 1: ROOM_6.seals[1], 2: ROOM_6.seals[2], 3: ROOM_6.seals[3] },
        kocokAt: { 3: 1784178398 },
      },
    ]);

    const [room] = await roomsOf();

    // Rounds 1 and 2 have run and have a winner to check the seed against. Round 3
    // is what the room is sitting on: seal_kocok (lib.rs:465) writes the seal in
    // its own transaction, shortly before the kocok that spends it, so asking is a
    // read that mostly answers NotSealed — probed at ledger 3,640,271, all four
    // live Active rooms answered Error(Contract, #12) for their current round. And
    // a seed with no winner beside it verifies nothing.
    expect(room.history.map((row) => row.round)).toEqual([1, 2]);
    expect(calledWith().filter((call) => call.startsWith("seal_of")).sort()).toEqual([
      "seal_of(1,1)",
      "seal_of(1,2)",
    ]);
  });

  it("never asks locked_of, whose name is the lie it would print", async () => {
    board([ROOM_6]);

    const [room] = await roomsOf();

    // locked_of (lib.rs:756) answers per member and is the obvious way to fill a
    // member's row. It is the wrong question. DataKey::Locked is written at join
    // (create_room:258, join_room:312) and removed in exactly one place
    // (refund_member:877), which only leave_room:359 and cancel_room:438 call —
    // kocok pays the winner at :585 and emergency_dissolve refunds at :715, and
    // NEITHER touches it. So it survives the payout intact and keeps answering
    // with the full prefund. Probed live at ledger 3,640,271, on this very room:
    // locked_of(6, GCAN..UVYR) = 3000000, has_won = true, on a room whose real
    // balance is zero. Printing that under "terkunci" is lie 8 again, with a live
    // chain read attached as its proof.
    expect(calledFunctions()).not.toContain("locked_of");
    expect(room.lockedStroops).toBe(0);
    // The number a member row needs is already here, and is already true — as what
    // was DEPOSITED AT JOIN, which is what join_room:301-306 transferred before it
    // seated anyone. Same number, and a word the contract cannot contradict.
    expect(room.members.map((member) => member.amountStroops)).toEqual([
      3_000_000, 3_000_000, 3_000_000,
    ]);
  });

  it("does not fire the whole board at the RPC at once", async () => {
    // The fan-out multiplies: readRooms loops over rooms and readWinners loops
    // over rounds inside it, and each finished round now asks twice — its winner
    // and its seed. So this 12-room board is 85 reads (1 + 12 x 2 + 12 x 5) where
    // it was 61, and uncapped they leave in two waves of 24 and 60. Nothing here
    // would notice — a 429 reaches readRooms as `catch { return null }`, the same
    // answer as "no such room" — so the page would just quietly show a smaller
    // contract than exists.
    let inFlight = 0;
    let peak = 0;
    let reads = 0;
    simulate.mockImplementation(async (tx) => {
      const name = tx.operations[0].func.invokeContract().functionName().toString();
      inFlight += 1;
      reads += 1;
      peak = Math.max(peak, inFlight);
      try {
        // A real read is a round trip; resolving on the spot would let the pool
        // drain as fast as it fills and measure a peak of 1 for any cap.
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (name === "room_count") return ok(nativeToScVal(12, { type: "u32" }));
        if (name === "get_room") return ok(roomScVal({ status: "Active", round: 3 }));
        if (name === "get_members") return ok(nativeToScVal(MEMBERS, { type: "address" }));
        if (name === "kocok_at") return ok(nativeToScVal(1784178278n, { type: "u64" }));
        if (name === "seal_of") return ok(nativeToScVal(7314979439510601104n, { type: "u64" }));
        if (name === "winner_of") return ok(nativeToScVal(MEMBERS[1], { type: "address" }));
        // Loudly, rather than handing back the last branch's answer. The version
        // this replaces ended in a bare `return` for winner_of, so seal_of — added
        // years after it was written — would have been answered with an ADDRESS and
        // read back as a seed, silently, in the one test that counts reads.
        throw new Error(`unstubbed read: ${name}`);
      } finally {
        inFlight -= 1;
      }
    });

    const { rooms, unread } = await readRooms();

    expect(rooms).toHaveLength(12);
    expect(unread).toBe(0); // capped, not dropped: every room still gets read
    expect(peak).toBeLessThanOrEqual(5);
    // Not a serial queue either. A cap of 1 would satisfy the line above and be
    // its own bug: 85 round trips end to end is a page nobody waits for.
    expect(peak).toBeGreaterThan(1);
    // The cap must not have become a filter. Counted, because "every room read"
    // and "every read made" are different claims and only the first is above.
    expect(reads).toBe(85);
  });
});
