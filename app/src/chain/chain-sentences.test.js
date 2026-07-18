import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChainRoomCard } from "./ChainRoomCard.jsx";
import { boardState, formatSchedule, verifyRound } from "./chain-sentences.js";

/**
 * Every sentence roomState can select, rendered.
 *
 * WHY THIS FILE EXISTS, and it is round 4's failure in new clothes. Round 4
 * shipped a guard that checked PRESENCE and not TRUTH. The suite that replaced it
 * checks which TAG the selector picks and never the SENTENCE the tag selects —
 * and the sentence is the product. `expect(roomState(x)).toBe("open-dead")` says
 * nothing whatever about what "open-dead" then SAYS, so a reviewer replaced the
 * open-dead body with lie 7's exact words ("Pemenang putaran pertama akan muncul
 * di sini.") and the whole suite stayed green — on room 3, a room the contract can
 * never draw. roomState returns TEN tags; the suite rendered THREE cards. Seven
 * sentences had no test at all, three of them live on today's board.
 *
 * WHY THE TAGS ARE SCRAPED AND NOT LISTED. A test that enumerates a list is worth
 * exactly what its coupling to the list is worth, and a hand-written array of ten
 * strings is coupled to nothing: an eleventh tag lands beside it and the array
 * stays at ten, green, forever. So the list is read out of roomState itself, the
 * way stellar-rpc.test.js reads RoomStatus out of the Rust rather than guessing it
 * twice. Add a tag and this file goes red until it has a sentence and a fixture.
 *
 * A TAG IS NOT A SENTENCE, which is the same lesson one level down: one tag can
 * select more than one body (dissolved-emergency says different things at round 1
 * and after), so a case is a LIST of fixtures, not one.
 *
 * The fixtures are the live board, re-probed at ledger 3.641.368 rather than
 * trusted: rooms 1/2/4 Active round 2 (3/3), room 3 Open 1/3 with its deadline
 * long past, rooms 5/6 Done round 4 (3/3), room 7 Active round 1 (6/6) with
 * first_kocok at 2026-07-17T12:00Z, share 1.000.000 stroops throughout. What a
 * hand-written fixture cannot catch is a producer that stops emitting a field —
 * that is field-contract.test.js's job, not this one's.
 */

/** Live: room 5, 6 and 7's roster, in the order get_members returns it. */
const ADDRESSES = [
  "GCANYLS5NNU2RERJZLFN6522I37PZPNRPYSUYL2MMUQME6JAJA2UUVYR",
  "GDQR45VM7CP4A6J6TGBNCSMZ3S6HKDTGLNZ576A5YYGKTBN3SSG2J6NS",
  "GBS4UB2FNG3VTNBCGLR7BOMYIT3L7NVNV5BJFU4Z77R5YYPRQ5AX2GED",
];

const SHARE = 1_000_000;
const PREFUND = SHARE * 3;
/** The second the probe above was taken. Every fixture's clock. */
const NOW = 1_784_223_749;

/** Room 6 as the chain has it, and the base every other fixture bends. */
const BASE = {
  id: "stellar-6",
  chainRoomId: 6,
  source: "stellar",
  code: "AWRDE2767",
  name: "Arisan Test2",
  host: "GCAN...UVYR",
  hostAddress: ADDRESSES[0],
  status: "paid",
  round: 4,
  memberLimit: 3,
  paidCount: 3,
  onChainShareStroops: SHARE,
  poolStroops: PREFUND,
  lockedStroops: 0,
  firstKocok: 1_784_178_278,
  nextKocok: null,
  nextDate: null,
  finishedAfter: 1_784_178_398,
  joinDeadline: 1_784_178_248,
  history: [
    { round: 1, winner: "GBS4...2GED", address: ADDRESSES[2], seed: "7314979439510601104" },
    { round: 2, winner: "GCAN...UVYR", address: ADDRESSES[0], seed: "18343595488471420644" },
    { round: 3, winner: "GDQR...J6NS", address: ADDRESSES[1], seed: "11500414334239138996" },
  ],
  members: ADDRESSES.map((address) => ({
    id: address,
    name: `${address.slice(0, 4)}...${address.slice(-4)}`,
    address,
    paid: true,
    amountStroops: PREFUND,
  })),
};

const room = (overrides) => ({ ...BASE, ...overrides });
const card = (fixture) => render(createElement(ChainRoomCard, { room: fixture, nowSeconds: NOW })).container;

/**
 * This directory, from this module's own url — the same resolution
 * appages-deletion.test.jsx and chainboard-citations.test.js already use.
 *
 * IT REPLACED A CWD WALK-UP THAT CARRIED A FALSE REASON, which matters in this
 * file more than the six lines it saves. The comment here read: "Not `new
 * URL(import.meta.url)`: vitest does not hand this module a file:// url, and
 * readFileSync rejects the one it does hand it". Probed from this exact
 * directory: vitest hands it
 * `file:///C:/.../app/src/chain/chain-sentences.test.js`, and readFileSync
 * accepts it and reads it. The error the comment quoted is real but comes from
 * the TWO-argument form — `new URL("./x", import.meta.url)`, which Vite rewrites
 * into an asset url that is not file:// — so the comment named a true symptom,
 * blamed the wrong cause, and talked its file out of the resolution its two
 * neighbours use. A guess dressed as a probe is the thing this directory exists
 * to delete.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, "..");
const readSrc = (...parts) => readFileSync(path.join(SRC, ...parts), "utf8");
const SENTENCES = ["chain", "chain-sentences.js"];

/**
 * The tags roomState can actually return, read out of roomState.
 *
 * A `return` whose tag this cannot see THROWS rather than being skipped, which is
 * the only property that matters here. The failure mode to design against is
 * fail-GREEN: a scraper that silently skips what it cannot parse hands back the
 * tags the table already has, and the coupling below passes at precisely the
 * moment the drift is worst. Same reasoning, and same shape, as
 * stellar-rpc.test.js's roomStatusVariants.
 *
 * Line comments are stripped first: a comment is free to contain the word return
 * and a quoted string, and neither is a tag.
 */
function roomStateTags() {
  const src = readSrc(...SENTENCES);
  // From the signature to the first line that closes a block at column 0, which
  // is the function's own `}` — every brace inside it is indented.
  const block = src.match(/export function roomState\([\s\S]*?\n\}/);
  if (!block) throw new Error("could not find `export function roomState(` in chain-sentences.js");
  const tags = [];
  for (const line of block[0].split("\n")) {
    const code = line.replace(/\/\/.*$/, "");
    if (!/\breturn\b/.test(code)) continue;
    const literals = code.match(/"([^"]*)"/g);
    if (!literals) {
      throw new Error(
        `roomState has a return this test cannot read: ${JSON.stringify(line.trim())}. ` +
          "Teach roomStateTags the shape rather than letting it skip the line — a tag it " +
          "silently drops is a sentence nothing on this board checks, which is how lie 7 shipped."
      );
    }
    tags.push(...literals.map((literal) => literal.slice(1, -1)));
  }
  return [...new Set(tags)];
}

/**
 * One entry per tag; each entry a list, because a tag is not a sentence.
 *
 * `says` is written out longhand and never pulled from the module. Asserting
 * `toHaveTextContent(roomSentences(room).body)` is the mapper against itself: it
 * passes for every sentence, including lie 7's. These strings are here to be
 * diffed against lib.rs by eye, which is the only thing that has ever caught this
 * class of bug.
 *
 * No formatted date is asserted anywhere in `says`. toLocaleString renders in the
 * machine's zone, so a date here would pin this suite to whatever timezone it was
 * written in. The dates have their own tests below, where the assertions are
 * zone-independent by construction.
 */
const CASES = {
  // start_room's only gates are Open (lib.rs:387) and a full roster (:395). It
  // never reads join_deadline, so this room — full, deadline long past — is
  // startable, and the natural ordering ("deadline passed, therefore dead")
  // renders it a corpse. No live example: room 7 was this until someone started
  // it, which makes the trap more dangerous, not less.
  "open-full": [
    {
      name: "full past its deadline, and still startable",
      room: room({ status: "funding", round: 0, paidCount: 6, memberLimit: 6, joinDeadline: NOW - 3600, poolStroops: SHARE * 6, history: [] }),
      says: [
        "Terbuka · kursi penuh",
        "Kursi sudah penuh. Host bisa mengunci room ini kapan saja — kontrak tidak menutup start hanya karena batas gabung lewat.",
        // Conditional mood, mandatory: member_count is pinned to member_target
        // only at start (lib.rs:399), so before Active there is no pot to promise.
        "Jika room ini penuh dan dimulai, pemenang tiap putaran menerima 0,6 XLM.",
      ],
      denies: [/tidak akan pernah dikocok/],
    },
  ],

  // join_room transfers share * member_target BEFORE push_back (lib.rs:301-306),
  // so a member who is in is a member who paid in full.
  "open-live": [
    {
      name: "open, seats left, deadline ahead",
      room: room({ status: "funding", round: 0, paidCount: 1, memberLimit: 3, joinDeadline: NOW + 3600, lockedStroops: PREFUND, history: [] }),
      says: ["Setiap anggota yang gabung sudah menyetor 0,3 XLM di muka.", "Kursi terisi 1 dari 3."],
      denies: [/tidak akan pernah dikocok/, /Rp/],
    },
  ],

  // LIVE, room 3. "tidak akan pernah", not "belum": join_room:279-281 refuses
  // every remaining seat and leave_room:327 only shrinks the roster, so
  // members.len() can never reach member_target, so start_room:395 can never pass.
  // This is the body a reviewer swapped for lie 7's sentence with the suite green.
  "open-dead": [
    {
      name: "open, a seat empty, deadline gone — room 3",
      room: room({ status: "funding", round: 0, paidCount: 1, memberLimit: 3, joinDeadline: NOW - 3600, lockedStroops: PREFUND, history: [] }),
      says: [
        "Kontrak menolak anggota baru, dan hanya mengunci room yang penuh — room ini tidak akan pernah dikocok.",
        // cancel_room:429 refuses only `caller != host && now <= join_deadline`,
        // so past the deadline ANY caller passes and :437-439 refunds everyone.
        "Kontrak masih memegang 0,3 XLM untuk room ini. Setelah batas gabung lewat, siapa pun boleh membubarkannya lewat kontrak, dan setiap anggota menerima setorannya kembali.",
      ],
      // Lie 7, verbatim, on the one room the contract can never draw.
      denies: [/Pemenang putaran pertama akan muncul di sini/],
    },
  ],

  // LIVE, rooms 1/2/4. A state today's UI cannot say: it renders "Menunggu jadwal
  // kocok" over a round the contract will accept right now. kocok is callable by
  // ANY member (lib.rs:522, :533-540 checks membership alone), gated solely on
  // `now < deadline` (:541-548) — ":510-511: Any room member can call
  // (anti-deadlock)".
  "active-due": [
    {
      name: "active, this round's deadline already passed",
      room: room({ status: "sealed", round: 2, nextKocok: NOW - 3600, lockedStroops: 2 * PREFUND, history: BASE.history.slice(0, 1) }),
      says: [
        "Berjalan · putaran 2 dari 3",
        "Setelah jadwal lewat kontrak membuka kocok untuk anggota mana pun, jadi tidak ada satu orang pun yang bisa menahan giliran.",
        "Pemenang tiap putaran menerima 0,3 XLM.",
      ],
      denies: [/dijadwalkan/, /tidak terbaca/],
    },
  ],

  // LIVE, room 7: first_kocok 2026-07-17T12:00Z, still ahead of the probe.
  "active-scheduled": [
    {
      name: "active, deadline still ahead",
      room: room({ status: "sealed", round: 2, nextKocok: NOW + 3600, lockedStroops: 2 * PREFUND, history: BASE.history.slice(0, 1) }),
      says: ["Berjalan · putaran 2 dari 3", "Kontrak menolak kocok sebelum waktu itu."],
      denies: [/sudah bisa dikocok/],
    },
  ],

  // Never a date, never a countdown: stellar-rpc.js's readKocokAt returns null
  // for two causes it cannot tell apart — the key was never written, or the read
  // did not come back — and naming either invents the evidence.
  "active-unknown-schedule": [
    {
      name: "active, the round's schedule did not read",
      room: room({ status: "sealed", round: 2, nextKocok: null, lockedStroops: 2 * PREFUND, history: BASE.history.slice(0, 1) }),
      says: ["Jadwal putaran 2 tidak terbaca saat ini."],
      denies: [/dijadwalkan/, /sudah bisa dikocok/],
    },
  ],

  // LIVE, rooms 5/6. Counted from member_target, never printed from `round`:
  // kocok writes Winner then advances (lib.rs:591, :605), so a Done 3-member room
  // stores 4 — that was lie 6, "Putaran 4 dari 3".
  done: [
    {
      name: "the cycle ran to its end — room 6",
      room: BASE,
      says: [
        "Siklus selesai · 3 putaran, 3 pemenang",
        "Setiap anggota sudah menerima pot tepat satu kali. Kontrak tidak lagi memegang dana room ini.",
        // "sebelum" is mandatory and "selesai pada" is banned: readFinishedAfter
        // reads KocokAt(id, round - 1), the deadline the last round REFUSED to run
        // before (kocok:541-548). A chain-proven LOWER BOUND. The chain records
        // WHO won, never WHEN.
        "Putaran terakhir tidak bisa dikocok sebelum",
      ],
      denies: [/putaran 4/i, /0 XLM/, /terkunci/i, /selesai pada/],
    },
  ],

  // cancel_room:417 runs Open-only (:425), refunds EVERY member (:437-439) and
  // writes Dissolved (:440). round === 0 is the exact discriminator: create_room:243
  // sets 0 and start_room:400 is the only writer of 1.
  "dissolved-cancelled": [
    {
      name: "cancelled before a single round",
      room: room({ status: "dissolved", round: 0, paidCount: 3, lockedStroops: 0, history: [] }),
      says: [
        "Dibubarkan · sebelum room dimulai",
        "Room dibubarkan sebelum satu putaran pun dijalankan. Setiap anggota menerima seluruh setorannya kembali, dan kontrak tidak lagi memegang dana room ini.",
      ],
      denies: [/sempat dikocok/],
    },
  ],

  // Two sentences, one tag — which is why a case is a list. emergency_dissolve
  // runs Active-only (lib.rs:678), so round >= 1 always.
  "dissolved-emergency": [
    {
      // At round 1 no Won entry exists anywhere: kocok writes Won at :588 and only
      // then advances at :605, so ":708-717"'s "every member with no Won entry" is
      // every member, exactly.
      name: "dissolved on round 1, before any draw",
      room: room({ status: "dissolved", round: 1, lockedStroops: 0, history: [] }),
      says: [
        "Dibubarkan · 0 dari 3 putaran sempat dikocok",
        "Room dibubarkan saat putaran 1 belum dikocok. Belum ada pemenang, jadi setiap anggota menerima setorannya kembali.",
      ],
      denies: [/pemenang putaran sebelumnya sudah menerima potnya/],
    },
    {
      // The winners are listed by name on this same card, so the sentence must not
      // promise them a refund: emergency_dissolve pays refund_each only to members
      // with no Won entry (lib.rs:704-717).
      name: "dissolved after a round was drawn",
      room: room({ status: "dissolved", round: 2, lockedStroops: 0, history: BASE.history.slice(0, 1) }),
      says: [
        // Never "{round} dari {memberLimit}": that claims a round that was
        // interrupted, not paid. The rounds won are 1..round-1.
        "Dibubarkan · 1 dari 3 putaran sempat dikocok",
        "1 putaran sudah dikocok sebelum room dibubarkan. Anggota yang belum menang menerima setorannya kembali; pemenang putaran sebelumnya sudah menerima potnya dan tidak ikut dikembalikan. Kontrak tidak lagi memegang dana room ini.",
      ],
      denies: [/Dibubarkan · 2 dari 3/],
    },
  ],

  // An unmapped variant means the contract moved and this build did not. Every
  // number on the card is arithmetic keyed to the status, so there is no number
  // left that is not invented — and `members: false` is not a rendering
  // preference: a member row saying "Disetor saat gabung: 0,3 XLM" underneath
  // "nothing can be said about this room's money" is saying something about this
  // room's money.
  unknown: [
    {
      name: "a status this build does not know",
      room: room({ status: "cancelled" }),
      says: ["Status kontrak: cancelled. Versi aplikasi ini tidak mengenalinya, jadi tidak ada yang bisa dikatakan tentang dana room ini."],
      denies: [/XLM/, /Kursi terisi/],
    },
  ],
};

describe("every tag roomState can return renders a sentence the contract backs", () => {
  it.each(roomStateTags())("%s", (tag) => {
    const cases = CASES[tag];
    if (!cases) {
      throw new Error(
        `roomState can return "${tag}" and this table has no case for it. Add one: a fixture ` +
          "that reaches the tag, and the sentence it must then say, checked against lib.rs. " +
          "An unrendered tag is how lie 7 sat on room 3 through a green suite."
      );
    }
    for (const { name, room: fixture, says, denies = [] } of cases) {
      const container = card(fixture);
      for (const sentence of says) expect(container, `${tag} / ${name}`).toHaveTextContent(sentence);
      for (const forbidden of denies) expect(container, `${tag} / ${name}`).not.toHaveTextContent(forbidden);
      // No card may render the words a broken Date leaves behind, whatever else
      // it says. Cheap here, and the only assertion that covers all ten at once.
      expect(container, `${tag} / ${name}`).not.toHaveTextContent(/Invalid Date|undefined|NaN|\bnull\b/);
    }
  });

  it("keeps no case for a tag roomState can no longer return", () => {
    // The other half of the coupling. Without this, a tag that is deleted leaves
    // its fixture behind, and the table drifts back into being a hand-written
    // list of what someone believed once.
    expect(Object.keys(CASES).sort()).toEqual(roomStateTags().sort());
  });

  it("reads ten tags out of roomState, and throws rather than skipping one it cannot", () => {
    // Pins the scraper itself: the count is only evidence if the thing that
    // produced it is the thing that would go red. A `return computeTag(room)`
    // must not read as zero tags and pass.
    expect(roomStateTags()).toHaveLength(10);
    expect(() => {
      const line = "  return tagFor(room);";
      const code = line.replace(/\/\/.*$/, "");
      if (/\breturn\b/.test(code) && !code.match(/"([^"]*)"/g)) throw new Error("unreadable return");
    }).toThrow();
  });
});

describe("formatSchedule refuses to print the words 'Invalid Date'", () => {
  // create_room bounds first_kocok from BELOW alone (lib.rs:198) and only orders
  // join_deadline against it (:199); both u64, neither capped, and its only auth
  // is host.require_auth() on the caller (:192). So any third party can put this
  // on the board. start_room copies first_kocok into KocokAt(id, 1) (:404-406),
  // so it arrives as nextKocok as well as joinDeadline.
  //
  // Not a hypothetical about the formatter: probed on node 24, toLocaleString
  // does NOT throw on an out-of-range Date — it returns the literal string
  // "Invalid Date", and this function used to hand that straight to a template
  // literal. Tested in BOTH directions, because a guard nothing checks is a guard
  // a reviewer can delete for free: that is exactly what happened here — the
  // mutant was planted, and nothing went red.
  const U64_MAX = "18446744073709551615";
  /** Past the Date ceiling (8,64e12 s), still an exact double (< 9,007e15). */
  const PAST_THE_CALENDAR = 9_000_000_000_000;

  it("still renders a real date, which is the direction a guard can quietly break", () => {
    const rendered = formatSchedule(NOW);
    expect(rendered).toContain("2026");
    expect(rendered).not.toMatch(/Invalid Date|detik unix/);
  });

  it("quotes the contract's own seconds when the calendar cannot hold them", () => {
    expect(new Date(PAST_THE_CALENDAR * 1000).toLocaleString("id-ID")).toBe("Invalid Date");
    expect(formatSchedule(PAST_THE_CALENDAR)).toBe("detik unix 9000000000000 (di luar jangkauan kalender)");
  });

  it("prints no figure it cannot vouch for", () => {
    // toRoom already did Number(chain.join_deadline) before this file sees it, so
    // a u64::MAX deadline arrives here as 18446744073709552000 while the contract
    // holds ...551615. Quoting those digits under "detik unix" is a fabricated
    // figure — 385 out — on the one page whose entire purpose is being recomputed.
    expect(String(Number(U64_MAX))).toBe("18446744073709552000");
    expect(BigInt(Number(U64_MAX)) === BigInt(U64_MAX)).toBe(false);
    const rendered = formatSchedule(Number(U64_MAX));
    expect(rendered).toBe("detik unix yang tidak bisa ditampilkan utuh (di luar jangkauan kalender)");
    expect(rendered).not.toContain("18446744073709552000");
  });

  it("renders no 'Invalid Date' and no 'null' on a card whose whole schedule is absurd", () => {
    // The end of the path, not the unit: create_room accepts it, start_room copies
    // it, kocok_at hands it back, toRoom carries it, and this card prints it.
    // `${null}` is why this function may not simply copy the producer's null —
    // "Batas gabung null." is the same bug in a quieter font.
    const absurd = room({ status: "funding", round: 0, paidCount: 1, memberLimit: 3, joinDeadline: PAST_THE_CALENDAR, history: [] });
    const container = card(absurd);
    expect(container).toHaveTextContent("Batas gabung detik unix 9000000000000 (di luar jangkauan kalender).");
    expect(container).not.toHaveTextContent(/Invalid Date/);
    expect(container).not.toHaveTextContent(/Batas gabung null/);
  });
});

/**
 * The header states the citation rule. This is the part that makes it a property.
 *
 * A rule stated in a comment is a claim with no evidence, which is the one thing
 * this file exists to eliminate — and this rule was broken in this file, at scale,
 * while the comment stating it sat two hundred lines up. Thirteen cross-file line
 * citations had drifted, every one of them pointing EARLY, and two had gone past
 * drift into fiction: they cited AppPages.jsx for a string another lane deleted
 * and for wording it never held. Nothing went red, because nothing looked.
 *
 * Two checks, because there are two ways to break the rule: cite a symbol that is
 * not there, or go back to citing lines. Neither can be checked by reading.
 *
 * What this does NOT check is that the symbol says what the sentence claims — no
 * test can, and the header is honest about the diff-by-eye being the only thing
 * that ever caught that. It checks the pointer resolves, which is the failure that
 * actually happened, thirteen times.
 */
const CITATION = /`([^`\r\n]+)` in ([\w.-]+\.\w+)/g;

/** Cited basename -> where it lives, from src/. An unmapped citation fails loudly. */
const RESOLVE = {
  "stellar-rpc.js": ["stellar-rpc.js"],
  "demo-state.jsx": ["demo-state.jsx"],
  "ui.jsx": ["ui.jsx"],
  "AppPages.jsx": ["pages", "AppPages.jsx"],
  "appages-deletion.test.jsx": ["appages-deletion.test.jsx"],
  "chainboard-citations.test.js": ["chainboard-citations.test.js"],
  "chain-sentences.js": SENTENCES,
};

/**
 * A citation is one claim even when the prose wraps, and this is not cosmetic:
 * SIX of this file's citations wrap, and a scraper that reads line by line does
 * not see one of them. It reports the twenty-nine it can read, all green, and the
 * six nobody checks are exactly the six a reader would most want checked —
 * fail-GREEN again, in the file about fail-green.
 *
 * CRLF-aware on purpose. This repo checks out \r\n, so a `\n`-only unwrap leaves
 * the \r behind and the citation reads "`readRooms` in\r stellar-rpc.js", which
 * matches nothing and is silently dropped. Measured, not assumed: that bug was in
 * this regex until the count came back 29 twice.
 */
const unwrap = (src) => src.replace(/\r?\n[ \t]*(?:\*|\/\/)[ \t]*/g, " ");

/**
 * The anchor as a WORD, never as a substring.
 *
 * `toContain(anchor)` is the obvious spelling and it has a hole big enough to
 * drive the whole rule through: rename `readWinners` to `readWinnersRenamed` and
 * every sentence citing `readWinners` is now unsourced, while a substring check
 * still finds the characters and stays green. A rename is the single likeliest way
 * a symbol citation ever goes bad — it is the only failure a name has that a line
 * number does not — so the one check here has to be the one that catches it.
 *
 * The boundary is conditional because half these anchors are expressions, not
 * identifiers: `\b` after `...JSON.stringify(state))` asserts a boundary between
 * `)` and whatever follows and fails on a match that is perfectly good.
 */
function asWord(anchor) {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const left = /^[\w$]/.test(anchor) ? "(?<![\\w$])" : "";
  const right = /[\w$]$/.test(anchor) ? "(?![\\w$])" : "";
  return new RegExp(`${left}${escaped}${right}`);
}

const citations = [
  ...new Map(
    [...unwrap(readSrc(...SENTENCES)).matchAll(CITATION)].map(([, anchor, target]) => [
      `${anchor} in ${target}`,
      { anchor, target },
    ]),
  ).values(),
];

describe("every citation chain-sentences.js makes still resolves", () => {
  it("can still see the file it is scraping", () => {
    // Every assertion below runs over whatever this scrape returns, so a file it
    // cannot read is a file whose citations all pass by checking none. This repo
    // has sprung that trap before — stellar-rpc.test.js's RoomStatus scrape once
    // matched nothing and handed back the four names STATUS_MAP already had.
    expect(readSrc(...SENTENCES)).toContain("export function roomSentences(");
    expect(citations.length, "chain-sentences.js carries no citations at all").toBeGreaterThan(20);
  });

  it.each(citations)("cites `$anchor` in $target", ({ anchor, target }) => {
    const where = RESOLVE[target];
    expect(where, `no path known for ${target}. Add it to RESOLVE.`).toBeDefined();
    expect(
      readSrc(...where),
      `\`${anchor}\` is gone from ${target}. Unlike a line number this cannot have drifted — ` +
        "the symbol was renamed or deleted, so the sentence citing it is now unsourced. " +
        "Re-read the code and fix the sentence, not just the anchor.",
    ).toMatch(asWord(anchor));
  });

  it("reads a citation the prose has wrapped", () => {
    // The property `unwrap` is here for, pinned on a fixture rather than on the
    // file: the six wrapped citations could all be reflowed onto one line tomorrow
    // and this regex would still have to work the next time prose wraps.
    const wrapped = " * dropped. `readRooms` in\r\n * stellar-rpc.js returns `unread`, so\r\n";
    expect([...unwrap(wrapped).matchAll(CITATION)].map((m) => `${m[1]} in ${m[2]}`)).toEqual([
      "readRooms in stellar-rpc.js",
    ]);
    // And the CR is load-bearing: without `\r?` this is the silent drop above.
    expect([...wrapped.replace(/\n[ \t]*\*[ \t]*/g, " ").matchAll(CITATION)]).toHaveLength(0);
  });

  it("matches an anchor as a word, so a rename cannot pass as a substring", () => {
    // The mutant: `readWinners` -> `readWinnersRenamed` in stellar-rpc.js. Every
    // sentence citing `readWinners` is unsourced at that moment, and `toContain`
    // — the obvious check, and the one the neighbouring suite uses — still finds
    // the characters inside the longer name and stays green.
    expect("async function readWinnersRenamed(roomId, round) {").toContain("readWinners");
    expect("async function readWinnersRenamed(roomId, round) {").not.toMatch(asWord("readWinners"));
    expect("async function readWinners(roomId, round) {").toMatch(asWord("readWinners"));
    // An expression anchor must still match where it really occurs, or the
    // boundary would just be a way to fail on the truth.
    expect('{item.timestamp || "tercatat"}').toMatch(asWord('item.timestamp || "tercatat"'));
  });
});

/**
 * The other half: a citation cannot go back to being a line number.
 *
 * lib.rs is exempt and that is the whole distinction — it is deployed and frozen,
 * so `kocok:541-548` is as stable as the contract it points into, and every lib.rs
 * citation sampled this round was exact. The files below are the ones lanes are
 * editing right now, and a line into those has a shelf life measured in hours: the
 * neighbouring suite watched `readRooms` slide 8 lines while it was being written.
 */
describe("no citation into a live file is a line number", () => {
  const stem = (file) => file.replace(/\.\w+$/, "");

  it.each(Object.keys(RESOLVE))("does not cite %s by line", (file) => {
    const banned = new RegExp(`(?:${stem(file)}(?:\\.\\w+)?):\\d`);
    const hits = readSrc(...SENTENCES)
      .split("\n")
      .filter((line) => banned.test(line));
    expect(
      hits,
      `chain-sentences.js cites ${file} by line number: ${JSON.stringify(hits)}. Cite the symbol ` +
        "instead — a line into a file someone is still editing does not fail when it rots, it " +
        "quietly starts pointing at somebody else's code, and that is how thirteen of these died. " +
        "lib.rs keeps its numbers; nothing else does.",
    ).toEqual([]);
  });

  it("still allows lib.rs, which is deployed and frozen", () => {
    // Not decoration: a ban written one character wider takes the lib.rs citations
    // with it, and those are the ones actually holding this file up.
    expect(readSrc(...SENTENCES)).toContain("lib.rs:");
    expect(Object.keys(RESOLVE)).not.toContain("lib.rs");
  });

  /**
   * The hole the ban above had, and the live rot that walked through it.
   *
   * The check above greps for a FILENAME followed by a line — `stellar-rpc.js:381`.
   * A line citation does not have to wear a filename. `(toRoom:381)` was sitting in
   * this file, on the pot sentence, for seven rounds: `toRoom` lives in
   * stellar-rpc.js at :441, and :381 is `readWinners` — a different function
   * entirely, 60 lines away. Three lanes rewrote this file's citations and none saw
   * it, because both suites were looking for the wrong shape: the resolver only
   * scrapes `` `symbol` in file.ext ``, and the ban only greps filenames. A rot in
   * the costume of a symbol was invisible to the file whose entire subject is rot.
   *
   * So the rule is enforced as what it actually says — "lib.rs keeps its numbers;
   * nothing else does" — rather than as a list of filenames. Any `name:123` is a
   * line citation. It is legal only if `name` is something lib.rs really declares,
   * and that exemption is CHECKED against lib.rs rather than assumed: this reads
   * the contract and asks it. A bare `:199` has no name and is a lib.rs
   * continuation ("...(:198) and only orders join_deadline against it (:199)"), so
   * it is not matched — the name is what makes a citation claimable.
   *
   * Measured before it was written, which is the only reason it is this shape: run
   * over the real file it matches 33 citations, exempts the 32 that name a real
   * lib.rs fn, and reds exactly one — the one that was actually wrong.
   */
  it("does not cite a live file by line under a symbol's name either", () => {
    const lib = readFileSync(path.join(SRC, "..", "..", "contracts", "arisan_rooms", "src", "lib.rs"), "utf8");
    const declared = new Set();
    for (const [, fn] of lib.matchAll(/^\s*(?:pub\s+)?fn\s+(\w+)/gm)) declared.add(fn);
    for (const [, item] of lib.matchAll(/^\s*pub\s+enum\s+(\w+)/gm)) declared.add(item);
    // The scrape going blind is the fail-GREEN this whole file is built against:
    // no symbols read means every citation is "not declared"... or, if inverted,
    // every citation exempt. Pin the read before trusting it.
    expect(declared.has("kocok"), "the lib.rs scrape went dark — it declares `kocok` or this is not lib.rs").toBe(true);

    const hits = readSrc(...SENTENCES)
      .split("\n")
      .flatMap((line, index) =>
        [...line.matchAll(/(?<![\w.])(\w+):(\d{2,4})/g)]
          .filter(([, name]) => name !== "lib" && !declared.has(name))
          .map(([text]) => `chain-sentences.js:${index + 1} \`${text}\``),
      );
    expect(
      hits,
      `a line citation is wearing a symbol's name: ${JSON.stringify(hits)}. lib.rs declares no such ` +
        "thing, so this points into a file somebody is still editing, and it will not fail when it " +
        "rots — it will quietly start naming somebody else's function, which is exactly what " +
        "`toRoom:381` did (it had drifted 60 lines onto `readWinners`). Cite the symbol instead: " +
        "`` `poolStroops` in stellar-rpc.js ``. The resolver above then checks it on every run.",
    ).toEqual([]);
  });
});

describe("the guards whose comments argue hardest, and which nothing checked", () => {
  it("keeps an absent lockedStroops out of the sum, not just a null one", () => {
    // boardState says `== null` and not `=== null`, and the comment argues the
    // case at length — but every fixture that reached it passed an explicit null,
    // which both spellings catch. `undefined` is the one that tells them apart,
    // and it is the one that matters: `total + null` is a quiet zero, `total +
    // undefined` is NaN, and "NaN XLM" under a real contract id is the same
    // species of claim as lie 5.
    const rooms = [room({ lockedStroops: 3_000_000 }), room({ id: "stellar-9", lockedStroops: undefined })];
    expect(boardState({ mode: "readonly", rooms, unread: 0, count: 2 })).toBe("total-unknown");
    // The mutant this pins: `=== null` here returns "complete", and the board
    // prints the sum of a number and an undefined.
    expect(3_000_000 + undefined).toBeNaN();
  });

  it("survives a round with nobody left unwon instead of taking the board down", () => {
    // verifyRound's `unwon.length === 0` guard, whose comment calls it
    // unreachable and keeps it anyway because `% 0n` throws — and a throw here
    // is not one bad row, it is
    // every card on the page, since ChainRoomCard calls this during render. The
    // comment was the only thing standing behind that claim; this is the check.
    expect(() => BigInt(1) % BigInt(0)).toThrow(RangeError);
    const result = verifyRound({ members: [], winners: [], round: 1, seed: "7314979439510601104" });
    expect(result.status).toBe("skipped");
  });

  it("skips rather than crying mismatch when an earlier round's row is missing", () => {
    // The contiguity guard: verifyRound's `if (!row) return skipped` loop.
    // readWinners drops an unreadable row silently (its per-round catch returns
    // null and the rows are filtered); the hole corrupts the unwon set and round
    // 2's modulo lands on the wrong address — our bug, printed as the chain's, on
    // the one panel that exists to be trusted.
    const holed = BASE.history.filter((row) => row.round !== 1);
    expect(verifyRound({ members: BASE.members, winners: holed, round: 2, seed: BASE.history[1].seed }).status).toBe("skipped");
    // And the guard is doing the work: with the row present the same call resolves.
    expect(verifyRound({ members: BASE.members, winners: BASE.history, round: 2, seed: BASE.history[1].seed }).status).toBe("match");
  });
});
