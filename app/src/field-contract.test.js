import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STATUS_LABELS } from "./ui.jsx";

/**
 * The census: every field the UI reads off a room, classified, and checked
 * against the room the read path actually builds.
 *
 * Seven lies shipped, and all seven were one species. THE UI WAS BUILT AGAINST
 * THE GATEWAY'S DATA SHAPE. The gateway pre-digested everything — it clamped
 * `round` into an ordinal, set `paid: true`, priced the share in Rupiah. The
 * read-only path feeds RAW CHAIN DATA into that same UI, so every field the
 * gateway used to normalise became a place a lie could sit. And the shape of the
 * lie was never "toRoom threw": it was an undefined field rendering as a
 * confident false sentence. `member.paid` undefined told three prefunded members
 * "Belum setor". `room.history` undefined told a room that paid every round
 * "Belum ada pemenang". Nothing threw. Nothing went red. A reviewer found each
 * one by reading, three rounds running, while the suite reported 37/37, 70/70,
 * 92/92.
 *
 * So the check is not "does toRoom work". It is a two-way census:
 *
 *   1. Every `room.x` AppPages reads is classified below. A NEW reader nobody
 *      classified fails, which is the question the last three rounds never got
 *      asked: is this field one the chain can answer, or one it cannot?
 *   2. Every field classified EMIT is actually emitted, under every status, by
 *      the real readRooms — not by a fixture. A fixture cannot show you a
 *      producer field its author forgot; that is exactly how readonly-money
 *      passed 7/7 against the very Rupiah bug it was written to block.
 *
 * FORBID is the same census pointed the other way, and it is not symmetry for
 * its own sake: `pool` and `contribution` are the two names formatMoney routes
 * to formatRupiah, so a chain room carrying either prints Rupiah for a share
 * nobody ever priced. That is original bug #1, and it is one field away at all
 * times.
 *
 * WHAT THIS CANNOT SEE. Measured by running the scraper below against each
 * reader shape, not reasoned about. It is a regex over source text, so it sees a
 * literal first hop off a binding it knows by name, and nothing else:
 *
 *   SEES    room.x          room?.x          `${room.x}`
 *   BLIND   const {x} = room        destructuring never spells "room.x"
 *   BLIND   <C {...room}/>          the reader is C's props, in another scope
 *   BLIND   room[key]               computed access has no literal name
 *   BLIND   rooms.map(r => r.x)     an alias it was not told about
 *   BLIND   any reader in another file — it scrapes AppPages.jsx and only that
 *
 * Five shapes blind, three seen. The earlier version of this comment disclosed
 * only the alias, which made the file that exists to enforce honesty overclaim
 * its own reach. None of the five is used against a room or member today (grep:
 * no destructure, no spread, no computed access, and ui.jsx reads neither), so
 * the blindness is latent rather than live — it is a trap for the next refactor,
 * not a hole under the current code. A field moved behind any of those five stops
 * being censused SILENTLY, and this file goes green having seen nothing.
 *
 * That is the half it cannot fix. It catches "an EMIT field stopped being
 * emitted, so an undefined renders as a confident false sentence" — bugs 2, 4 and
 * 7. It is structurally incapable of catching "a field that IS present, IS
 * emitted and IS classified, rendered under a word that is not its meaning" —
 * bugs 1, 3, 6 and 8. Lie 8 read member.amountStroops, which is present, emitted
 * and classified EMIT, and printed it under "terkunci" on a room the contract had
 * already paid out. No field-presence guard catches that. The sentence audit in
 * app/src/chain/ is what does.
 *
 * Anchors below fail it loudly if the scrape goes dark — a scraper that silently
 * matches nothing is worse than no scraper, which this repo has already proved
 * once (stellar-rpc.test.js's RoomStatus scrape was fail-GREEN blind to payload
 * variants and handed back the four names STATUS_MAP already had).
 */

const chain = vi.hoisted(() => ({
  rooms: [],
  failIds: new Set(),
  failWinners: false,
  down: false,
  calls: [],
}));

const simulate = vi.fn((tx) => simulateChain(chain, tx));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: class {
        simulateTransaction = simulate;
        getLatestLedger = vi.fn(async () => ({ sequence: 3_634_942 }));
      },
    },
  };
});

const { ADDRESSES, simulateChain } = await import("./chain-stub.js");
// No STATUS_MAP: the test that read it is gone (see below), and the map's own
// coupling to STATUS_LABELS is pinned in stellar-rpc.test.js:158.
const { readRooms, readStatus } = await import("./stellar-rpc.js");

/** Present, and never undefined. null is allowed and is not the same claim. */
const EMIT = "emit";
/** Absent. Present is a lie, not a degradation. */
const FORBID = "forbid";
/** Classified so a new reader is noticed; the fix is a branch, not a field. */
const GATED = "gated";

/**
 * Every room field AppPages.jsx reads, plus the ones toRoom emits for a reader
 * that does not exist yet. The verdicts are the field contract's, and each one
 * is a claim about the CHAIN, not about the gateway: a local room may carry
 * anything, and does.
 */
const ROOM = {
  // --- Identity and provenance. `source` undefined calls a real contract room
  // a simulation, which is the worst single lie the page can tell.
  id: EMIT,
  source: EMIT,
  chainRoomId: EMIT,
  contractId: EMIT,
  code: EMIT,
  name: EMIT,
  host: EMIT,
  hostAddress: EMIT,

  // --- State. `status` undefined renders an empty action panel and parks the
  // PhaseTracker on "Setor" (ui.jsx findIndex -> -1 -> Math.max(0,-1) -> 0).
  status: EMIT,
  round: EMIT,
  memberLimit: EMIT,
  paidCount: EMIT,
  members: EMIT,
  history: EMIT,

  // --- Money, in the contract's own unit. Never undefined: AppPages tests
  // lockedStroops with === null STRICTLY, so undefined slips the guard, hits
  // `?? room.pool` and reaches the screen as "RpNaN" under "terkunci di
  // Stellar Testnet" — a currency the contract has never heard of.
  lockedStroops: EMIT,
  poolStroops: EMIT,
  onChainShareStroops: EMIT,

  // --- Time.
  firstKocok: EMIT,
  nextKocok: EMIT,
  // The disproof of bug 7, emitted with zero readers today. join_room rejects
  // every share of a room past this, so a room that is Open, not full and past
  // it can NEVER draw — and the page offered it a Google Calendar invite.
  // Classified EMIT so it stays available to the reader that needs it.
  joinDeadline: EMIT,

  // --- The Rupiah names. formatMoney routes these two to formatRupiah, which
  // is how 3.000.000 stroops (0,3 XLM) reached the screen as "Rp3.000.000"
  // beside a real contract id. Nobody ever priced this share.
  pool: FORBID,
  contribution: FORBID,
  // ISO string from the create form; participates in showsFirstKocok, so
  // emitting it would re-caption first_kocok with whatever round the room sits
  // on.
  drawAt: FORBID,
  // No function in lib.rs asks a member about the schedule. Absent is the true
  // answer and all three readers already render it.
  scheduleAgreed: FORBID,
  // Cadence::Weekly is 60 SECONDS in the deployed build. The variant name lies
  // about the duration; a field that launders it into "Mingguan" is worse than
  // no field.
  cadence: FORBID,
  cadenceSeconds: FORBID,
  // Emitting `winner` alone arms the synth branch, which fabricates a
  // transactionId and a timestamp as HARDCODED LITERALS and links the invented
  // hash to stellar.expert as proof.
  winner: FORBID,
  result: FORBID,

  // --- The fix is a branch, not a field: today this silently means first_kocok
  // for every status but Active, under a name that says "next" and an icon that
  // says calendar. Classified, not asserted, because the contract's verdict is
  // the reader's shape and this file must not pin a lane's hands to one of them.
  nextDate: GATED,
};

/**
 * A chain member. Membership IS proof of prefund: join_room transfers
 * share * member_target BEFORE push_back, and create_room charges the host
 * before seating. There is no "setor" step left to wait on.
 */
const MEMBER = {
  id: EMIT,
  name: EMIT,
  address: EMIT,
  // Literal true, unconditionally. Undefined here is bug 2, and it told every
  // member of every real room they had not paid.
  paid: EMIT,
  amountStroops: EMIT,
  // Rupiah. Same reason as room.pool.
  amount: FORBID,
};

/**
 * A winner row. The chain records WHO won a round and never WHEN: seal_of
 * returns the PRNG seed, and kocok stores the winner alone.
 */
const HISTORY = {
  round: EMIT,
  winner: EMIT,
  address: EMIT,
  // Undefined already renders the true, deliberately vague "tercatat". A date
  // here is a precision the contract does not hold.
  timestamp: FORBID,
};

/**
 * The status object, censused for the same reason the room is — and this ledger
 * is new because the hole it covers was live.
 *
 * `grep -ci network` over this file returned 0. Nothing classified a single field
 * of the one object every page reads before it says whose data it is showing, and
 * a fabricated sentence walked straight through: AppPages reads
 * `state.network.members?.length || 10`, and readStatus() emits no `members` at
 * all (stellar-rpc.js:593-609). So off the gateway the default fires and the
 * create form states "Tersedia 3 sampai 10 identitas sandbox" — ten identities
 * that exist only in that `|| 10`. Same species as every other lie here: a field
 * the chain cannot answer, rendered as a confident number.
 *
 * Verdicts are about the CHAIN's status object (what readStatus can answer), on
 * the same convention as ROOM above — not about the gateway's, which carries a
 * real roster and is entitled to.
 */
const NETWORK = {
  // Read before the app will call anything real. `connected` false over live
  // chain data is the same lie as `source` undefined on a real room.
  connected: EMIT,
  // No `canWrite`. It was emitted here and read nowhere: demo-state's canWrite is
  // a predicate over `mode`, not a field off this object, and the gateway's status
  // never carried one — so `network.canWrite` was false where writes are
  // impossible and undefined where they are the point. FORBID rather than deleted,
  // because "the chain status must not carry this" is the thing worth pinning: the
  // next author to mirror the gateway's shape gets a red test instead of a second
  // answer to a question `mode` already answers.
  canWrite: FORBID,
  mode: EMIT,
  network: EMIT,
  contractId: EMIT,
  latestLedger: EMIT,
  message: EMIT,
  // THE HOLE. The gateway holds ten funded sandbox keypairs and says so; a
  // browser reading the contract has no roster to report and never will. Any
  // consumer that defaults this is inventing the number it prints.
  members: FORBID,
  // Not readStatus's: connectReadOnly attaches it after the read (demo-state.jsx:230),
  // because how much of the contract went unread is a fact about the READ, not
  // about the network. Classified so a reader is noticed, not asserted here.
  roomsUnread: GATED,
};

const APP_PAGES = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "pages", "AppPages.jsx"),
  "utf8"
);

/**
 * The first property read off any binding with one of these names.
 *
 * No `\s*` after the dot, on purpose: prose says "room. Clamping to memberLimit
 * is exact" and code never does, so the space is what separates a comment from a
 * reader. Comments are not stripped — stripping `//` would eat the rest of any
 * line holding a URL, and silently losing a reader is the one failure this file
 * exists to prevent. A comment naming a real field costs nothing (it is already
 * classified); a comment naming a fake one fails loudly, which is the safe way
 * round.
 */
function readsOff(binding) {
  const found = new Set();
  const pattern = new RegExp(`\\b${binding}\\??\\.(\\w+)`, "g");
  let match;
  while ((match = pattern.exec(APP_PAGES))) found.add(match[1]);
  return found;
}

// `room` and `found` are the two names AppPages binds a whole room to.
const roomReads = new Set([...readsOff("room"), ...readsOff("found")]);
const memberReads = readsOff("member");
// `item` is both: a history row in the winner list, and a room in JoinRoomPage's
// `state.rooms.find((item) => item.code...)`. Nothing resolves that without a
// type checker, so it is censused against the union rather than guessed at.
const itemReads = readsOff("item");

/**
 * Fields whose readers cannot disappear without a rewrite of the room detail.
 * If the scrape stops finding these, it has gone dark and every census below it
 * is trivially satisfied by the empty set — green, and blind. That is the exact
 * failure mode of the RoomStatus scraper this repo already had to fix.
 */
const ROOM_ANCHORS = ["status", "members", "name", "id", "round", "memberLimit"];
const MEMBER_ANCHORS = ["name", "paid", "id"];
// `\bnetwork` matches inside `state.network.mode`: the dot before it is a word
// boundary. `mode` is the one field no page can render a heading without.
const networkReads = readsOff("network");
const NETWORK_ANCHORS = ["mode"];

describe("the census can still see", () => {
  it("finds the room readers it exists to count", () => {
    for (const field of ROOM_ANCHORS) {
      expect(
        [...roomReads],
        `the AppPages scrape lost room.${field}. Either the room detail was rewritten, ` +
          "or this scraper no longer matches how it reads a room — and a scraper that " +
          "matches nothing passes every census below it while seeing none of them."
      ).toContain(field);
    }
  });

  it("finds the member readers it exists to count", () => {
    for (const field of MEMBER_ANCHORS) {
      expect([...memberReads], `the AppPages scrape lost member.${field}`).toContain(field);
    }
  });

  it("finds the network readers it exists to count", () => {
    for (const field of NETWORK_ANCHORS) {
      expect([...networkReads], `the AppPages scrape lost network.${field}`).toContain(field);
    }
  });
});

describe("every field the UI reads is classified", () => {
  it("classifies every room field AppPages.jsx reads", () => {
    for (const field of roomReads) {
      expect(
        Object.keys(ROOM),
        `AppPages.jsx reads room.${field}, and nothing here says whether the chain can ` +
          "answer it. Classify it: EMIT if toRoom must always supply it (an undefined " +
          "field renders as a confident false sentence, never as an error), FORBID if a " +
          "chain room must not carry it, GATED if the honest fix is a branch in the reader."
      ).toContain(field);
    }
  });

  it("classifies every member field AppPages.jsx reads", () => {
    for (const field of memberReads) {
      expect(
        Object.keys(MEMBER),
        `AppPages.jsx reads member.${field}, unclassified. A chain member is an address ` +
          "and a prefund; anything else the row prints has to come from somewhere."
      ).toContain(field);
    }
  });

  it("classifies every network field AppPages.jsx reads", () => {
    for (const field of networkReads) {
      expect(
        Object.keys(NETWORK),
        `AppPages.jsx reads network.${field}, and nothing says whether a browser reading ` +
          "the contract can answer it. Classify it: a status field the chain cannot supply " +
          "is one a consumer will default, and a defaulted number renders as a fact. That " +
          "is where \"10 identitas sandbox\" came from."
      ).toContain(field);
    }
  });

  it("classifies every field read off an `item`, room or winner row", () => {
    const known = [...Object.keys(ROOM), ...Object.keys(HISTORY)];
    for (const field of itemReads) {
      expect(
        known,
        `AppPages.jsx reads item.${field}, unclassified. \`item\` is a room in ` +
          "JoinRoomPage and a winner row in the history list, so this must be a field of one."
      ).toContain(field);
    }
  });
});

/**
 * Every status the contract can produce. Not one shape: a field emitted on the
 * path the author happened to test is a field missing everywhere else, and
 * lockedStroops, nextKocok and history each branch on status inside toRoom.
 */
const FIXTURES = [
  {
    label: "Done",
    entry: {
      status: "Done",
      round: 4,
      memberCount: 3,
      memberTarget: 3,
      winners: { 1: ADDRESSES[2], 2: ADDRESSES[0], 3: ADDRESSES[1] },
    },
  },
  {
    label: "Active",
    entry: {
      status: "Active",
      round: 2,
      memberCount: 3,
      memberTarget: 3,
      winners: { 1: ADDRESSES[2] },
      kocokAt: { 2: 1784178278 + 60 },
    },
  },
  { label: "Open", entry: { status: "Open", round: 0, memberCount: 1, memberTarget: 3 } },
  {
    label: "Dissolved",
    entry: {
      status: "Dissolved",
      round: 3,
      memberCount: 3,
      memberTarget: 3,
      winners: { 1: ADDRESSES[2], 2: ADDRESSES[0] },
    },
  },
];

const fieldsOf = (ledger, verdict) =>
  Object.entries(ledger)
    .filter(([, value]) => value === verdict)
    .map(([field]) => field);

beforeEach(() => {
  chain.rooms = [];
  chain.failIds = new Set();
  chain.failWinners = false;
  chain.down = false;
  chain.calls = [];
});

describe.each(FIXTURES)("a $label room, built by the real read path", ({ entry }) => {
  async function readRoom() {
    chain.rooms = [entry];
    const { rooms } = await readRooms();
    expect(rooms, "the fixture did not produce a room; the census below would be vacuous").toHaveLength(1);
    return rooms[0];
  }

  it("emits every field the UI reads", async () => {
    const room = await readRoom();
    for (const field of fieldsOf(ROOM, EMIT)) {
      expect(
        room[field],
        `toRoom emitted no room.${field} for a ${entry.status} room. AppPages reads it, ` +
          "and an undefined field does not throw — it renders. That is how every one of " +
          "the seven lies reached a screen."
      ).toBeDefined();
    }
  });

  it("emits no field a chain room must not carry", async () => {
    const room = await readRoom();
    for (const field of fieldsOf(ROOM, FORBID)) {
      expect(
        room[field],
        `toRoom emitted room.${field} for a ${entry.status} room. A chain room must not ` +
          "carry it: the Rupiah names print a price nobody set, and the rest either " +
          "re-caption a date or arm a branch that fabricates its own evidence."
      ).toBeUndefined();
    }
  });

  it("emits every field a member row reads, and no Rupiah", async () => {
    const room = await readRoom();
    expect(room.members.length, "no members to census").toBeGreaterThan(0);
    for (const member of room.members) {
      for (const field of fieldsOf(MEMBER, EMIT)) {
        expect(member[field], `member.${field} missing on a ${entry.status} room`).toBeDefined();
      }
      for (const field of fieldsOf(MEMBER, FORBID)) {
        expect(member[field], `member.${field} present on a ${entry.status} room`).toBeUndefined();
      }
    }
  });

  it("shapes every winner row it read", async () => {
    const room = await readRoom();
    expect(Array.isArray(room.history), "history must always be an array").toBe(true);
    for (const row of room.history) {
      for (const field of fieldsOf(HISTORY, EMIT)) {
        expect(row[field], `history row is missing ${field}`).toBeDefined();
      }
      for (const field of fieldsOf(HISTORY, FORBID)) {
        expect(row[field], `history row carries ${field}, which the chain never recorded`).toBeUndefined();
      }
    }
  });
});

describe("the status object the real read path builds", () => {
  it("emits every field a page reads before it says whose data this is", async () => {
    const status = await readStatus();
    for (const field of fieldsOf(NETWORK, EMIT)) {
      expect(
        status[field],
        `readStatus emitted no network.${field}. An undefined here does not throw — the ` +
          "page renders, and captions real contract data with whatever the default was."
      ).toBeDefined();
    }
  });

  it("reports no roster, because a browser reading a contract has none", async () => {
    const status = await readStatus();
    for (const field of fieldsOf(NETWORK, FORBID)) {
      expect(
        status[field],
        `readStatus emitted network.${field}. The gateway has ten funded sandbox keypairs ` +
          "and may say so; this read has nothing of the kind, and a consumer that defaults " +
          "it prints a number the chain never gave it."
      ).toBeUndefined();
    }
  });
});

describe("null is not undefined, and the difference is a screen", () => {
  it("says a room holds nothing with a number, and says nothing with null", async () => {
    // lockedStroops is number | null and NEVER undefined — as a producer contract,
    // not, today, as a screen. This comment used to say AppPages tests it with
    // `=== null` and that undefined slips through `?? room.pool` into "RpNaN".
    // Neither exists: nothing in AppPages compares lockedStroops to null, the home
    // total sums `room.pool` and never reads stroops, and its one reader hands it
    // to formatMoney, which asks `stroops != null` — loose, so null and undefined
    // render alike. Pinned at the producer anyway: 0 and null are different real
    // answers, and undefined is neither.
    chain.rooms = [{ status: "Done", round: 4, memberCount: 3, memberTarget: 3 }];
    const [done] = (await readRooms()).rooms;
    expect(done.lockedStroops).toBe(0);

    // A status this build has no arithmetic for. Inventing a balance for a room
    // whose rules we do not know is the one thing lockedStroops refuses to do.
    chain.calls = [];
    chain.rooms = [{ status: "Sealed", round: 1, memberCount: 3, memberTarget: 3 }];
    const [unknown] = (await readRooms()).rooms;
    expect(unknown.lockedStroops).toBeNull();
    expect(unknown.lockedStroops).not.toBeUndefined();
  });
});

/**
 * Every status AppPages' action panel branches on, scraped from its literals.
 *
 * The panel's vocabulary is hardcoded, one `room.status === "..."` at a time, and
 * the badge's (STATUS_LABELS) is a separate object. They coincide by luck. A
 * reviewer once added a `Cancelled` variant, a STATUS_MAP entry and a matching
 * label, and the suite stayed 92/92 GREEN while the panel rendered EMPTY: a
 * status the panel has never heard of gets a styled badge over dead space.
 */
function panelStatuses() {
  const found = new Set();
  const pattern = /room\.status\s*===\s*"(\w+)"/g;
  let match;
  while ((match = pattern.exec(APP_PAGES))) found.add(match[1]);
  return found;
}

/**
 * DELETED with this change: "maps every variant onto a status the action panel
 * branches on", which required every STATUS_MAP target to have a `room.status ===`
 * branch in AppPages.jsx.
 *
 * Its premise expired the moment App.jsx:29 sent `isChainOnly(network)` to
 * ChainBoard. STATUS_MAP is the CHAIN's vocabulary — it translates RoomStatus
 * (lib.rs:91) for toRoom — and AppPages no longer renders a chain room. The
 * gateway, which is what AppPages does render, emits only ready/sealed/paid: grep
 * it for "funding" or "dissolved" and there are 0 hits. So the test was asserting
 * that a page must branch on statuses its rooms can never carry, and it went red
 * the moment `dissolved`'s dead branch was correctly deleted.
 *
 * Keeping it would have forced a dead branch back into AppPages to keep a test
 * green — the test dictating a lie to the code, which is the inversion this whole
 * round exists to stop. The question it asked (can every status the contract
 * produces actually be rendered?) is now app/src/chain/'s, where roomState() has
 * to answer for every RoomStatus variant and for an unknown one.
 */
describe("the badge and the panel share one vocabulary", () => {
  it("keeps the badge and the panel agreeing on the same vocabulary", () => {
    // Both halves, so a status can never be renderable by one and not the other.
    for (const status of panelStatuses()) {
      expect(
        Object.keys(STATUS_LABELS),
        `AppPages.jsx branches on status "${status}", which STATUS_LABELS cannot name: ` +
          "the panel would explain itself under a badge showing a bare lowercase word."
      ).toContain(status);
    }
  });
});
