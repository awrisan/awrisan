import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AppPages is the gateway-and-local page now, and nothing else.
 *
 * Two edits outside this file make that true, and both are load-bearing:
 * App.jsx:29 routes `isChainOnly(network)` — modes "reading" and "readonly" — to
 * ChainBoard before AppPages renders, and readState (demo-state.jsx:192-194)
 * filters `source: "stellar"` out of localStorage, which is the only other way a
 * chain room ever reached this file (mode "checking" is the first frame of every
 * reload, and mode "local" is a failed read replaying a cached room). With both,
 * no room read off the chain reaches AppPages in any mode.
 *
 * So the ~240 lines rounds 1-4 bolted on here — isReadOnly panels, canNeverDraw,
 * MemberStake's stroops line, the dissolved branches, the round-ordinal clamp —
 * are unreachable, and this change deleted them. This file is the tripwire on
 * that: each entry below is a branch that only ever existed for a chain room, and
 * re-adding one means someone expects chain data here again, in sentences written
 * against the gateway's shape.
 *
 * The assertions are NEGATIVE, so an empty, renamed or moved file satisfies every
 * one of them. That is fail-GREEN, and this repo has already sprung that trap once
 * (stellar-rpc.test.js's RoomStatus scrape matched nothing and handed back the
 * four names STATUS_MAP already had). Hence the anchors: if AppPages stops looking
 * like AppPages, this file fails before it claims anything.
 */
const APP_PAGES = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "pages", "AppPages.jsx"),
  "utf8",
);

/** Things AppPages cannot lose without a rewrite that should re-read this file. */
const ANCHORS = [
  "function RoomPage(",
  "function HomePage(",
  'room.status === "funding"',
  'room.status === "ready"',
  'room.status === "paid"',
  "formatMoney(",
];

describe("the scrape can still see AppPages", () => {
  it.each(ANCHORS)("still finds %s", (anchor) => {
    expect(
      APP_PAGES,
      "the AppPages scrape went dark. Every assertion below is a `not.toContain`, so " +
        "a file this scraper cannot find passes all of them while checking none.",
    ).toContain(anchor);
  });
});

/**
 * Each entry: the reader, and the sentence it produced when a chain room reached
 * it. The `why` is the failure message, so a reviewer who re-adds one is told what
 * it did rather than just that it is banned.
 */
const DELETED = [
  [
    "member.amountStroops",
    'it printed the whole-cycle prefund under "terkunci untuk N putaran" — on Done rooms whose ' +
      "pot the contract had already paid out (lib.rs:585). The number was true; the word was not. " +
      "That was lie 8, and no field-presence guard catches it, because the field IS emitted.",
  ],
  [
    "room.joinDeadline",
    "it gated the dead-room sentence. start_room checks Open (lib.rs:387) and a full roster (:395) " +
      "and never reads join_deadline, so a gate written on the deadline alone declares a full, " +
      "perfectly startable room dead. ChainBoard owns that sentence now, and tests the order.",
  ],
  [
    'room.status === "dissolved"',
    "no path that reaches this file writes Dissolved: only the contract dissolves a room, and the " +
      "gateway's status vocabulary is ready/sealed/paid (grep testnet-gateway.mjs for 'dissolved': 0).",
  ],
  [
    "isReadOnly",
    "it is `source === \"stellar\" && !canWrite(network)`. Mode \"stellar\" can write, and no other " +
      "mode reaching this file has a chain room to ask about. It stays in demo-state as the " +
      "backstop on sealRoom/completeDraw, where gateway-path.test.jsx pins it.",
  ],
  [
    "READ_ONLY_MESSAGE",
    "the panel explaining why a real room offered no button. No unsignable room reaches this file.",
  ],
  [
    '"readonly"',
    "App.jsx:29 routes this mode to ChainBoard before AppPages renders. A branch on it here is a " +
      "branch on a mode this file never sees.",
  ],
];

describe("no chain-shaped branch grew back", () => {
  it.each(DELETED)("does not read %s", (reader, why) => {
    expect(
      APP_PAGES,
      `AppPages.jsx reads ${reader} again. It was deleted because ${why}`,
    ).not.toContain(reader);
  });
});
