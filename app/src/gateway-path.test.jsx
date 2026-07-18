import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLDS_FUNDS, STATUS_LABELS } from "./ui.jsx";

/**
 * What survives of readonly-consumer / -history / -home-total / -money / -actions,
 * which were deleted in this change rather than repaired.
 *
 * Those five files asserted AppPages sentences about rooms read off the chain.
 * That combination no longer exists: App.jsx:29 routes `isChainOnly(network)` —
 * modes "reading" and "readonly" — to ChainBoard, so AppPages is now fed only
 * gateway rooms (mode "stellar") and local ones. 39 of their 42 assertions were
 * about a page their room can no longer reach, and a test whose subject was
 * deliberately removed is not coverage — it is a file that can only fail.
 *
 * The three subjects that DID survive are here, because each is still reachable
 * and each still guards something:
 *
 *   1. The gateway path's Rupiah, and the home total that must stop counting a
 *      room whose rounds are all paid out. Mode "stellar", so AppPages renders it.
 *   2. sealRoom's read-only refusal — a trust boundary on a money path. Its old
 *      setup (a chain room replayed out of localStorage) is now unreachable:
 *      readState filters `source: "stellar"` at demo-state.jsx:192-194. It is
 *      re-reached here through the state that still produces a chain room, which
 *      is a chain read that worked.
 *   3. The date guards at AppPages:77 and :109, which had no coverage at all.
 *
 * What is NOT here, deliberately: every sentence ChainBoard now owns. Those
 * belong to the new view's own audit (chain-sentences.test.js, chainview.test.jsx)
 * and writing them here would be a second, unaudited copy of the claims this
 * round exists to make exactly once.
 */

const chain = vi.hoisted(() => ({
  rooms: [],
  failIds: new Set(),
  failWinners: false,
  down: false,
  calls: [],
}));

const simulate = vi.fn((tx) => simulateChain(chain, tx));
const getLatestLedger = vi.fn(async () => {
  if (chain.down) throw new Error("rpc unreachable");
  return { sequence: 3_634_942 };
});

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

const { ADDRESSES, simulateChain, stubStaticHost } = await import("./chain-stub.js");
const { App } = await import("./App.jsx");
const { DemoProvider, READ_ONLY_MESSAGE, formatRupiah, initialDemoState, useDemo } = await import("./demo-state.jsx");

const SOON = Math.floor(Date.now() / 1000) + 3600;
const STORAGE_KEY = "awrisan-demo-v6";

/** Active, round 3 of 3, two rounds already won: one prefund left in the contract. */
const activeRoom = {
  status: "Active",
  round: 3,
  memberCount: 3,
  memberTarget: 3,
  firstKocok: SOON,
  winners: { 1: ADDRESSES[2], 2: ADDRESSES[0] },
  kocokAt: { 3: SOON },
};

beforeEach(() => {
  chain.rooms = [];
  chain.failIds = new Set();
  chain.failWinners = false;
  chain.down = false;
  chain.calls = [];
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * A gateway that can sign, answering /status and /rooms separately the way one
 * actually would. Fixtures, unavoidably: this room's producer is
 * server/testnet-gateway.mjs, a node process no jsdom test can drive. That makes
 * the shape below a claim about the gateway rather than a reading of it, and this
 * file cannot check it — what it checks is the branch a room carrying `pool` takes.
 */
function stubGateway(rooms, drawResult) {
  const status = {
    connected: true,
    mode: "stellar",
    network: "testnet",
    contractId: "CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX",
    members: [],
  };
  // /draw is checked before /rooms because the draw path ends in both:
  // /api/stellar/rooms/stellar-6/draw.
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    const path = String(url);
    const body = path.endsWith("/draw") ? drawResult : path.endsWith("/rooms") ? rooms : status;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }));
}

const paidGatewayRoom = {
  id: "stellar-4",
  chainRoomId: 4,
  source: "stellar",
  code: "AWR123456",
  name: "Arisan Gateway",
  host: "Dina Prameswari",
  contribution: 1_000_000,
  onChainShareStroops: 1_000_000,
  memberLimit: 5,
  paidCount: 5,
  pool: 5_000_000,
  round: 5,
  nextDate: "16 Juli 2026, 10.00",
  status: "paid",
  history: [],
  members: [],
};

/**
 * Two rooms READ from the running gateway, not invented: `node
 * server/testnet-gateway.mjs` against .stellar/rooms.json, GET
 * /api/stellar/rooms, trimmed to the keys RoomPage reads and otherwise verbatim
 * (2026-07-17). Their chain rooms 6 and 7 were re-read the same day at ledger
 * 3,641,361 — room 6 is `Done`, room 7 is not.
 *
 * They are here because the invented one above cannot show the bug: it carries
 * `history: []` and no `result`, and the gateway cannot produce that at "paid" —
 * updateRoom writes status, winner, result and history in one call
 * (testnet-gateway.mjs:290-298), so a paid room has all four or none. A room I
 * make up is a room whose shape I am asserting rather than reading, and the
 * caption below is exactly the kind of claim that gets away with that.
 *
 * The pair differs in one thing that matters: status. Same producer, same
 * `pool`-in-Rupiah, one paid out and one still holding.
 */
const gatewayPaidRoom = {
  id: "stellar-6",
  chainRoomId: 6,
  source: "stellar",
  code: "AWRDE2767",
  name: "Arisan Test2",
  host: "Dina Prameswari",
  contribution: 1_000_000,
  onChainShareStroops: 1_000_000,
  memberLimit: 3,
  paidCount: 3,
  // Each of the three winners received exactly this, one round each
  // (testnet-gateway.mjs:270 hands `room.pool` to the winner). Three rounds of
  // 3.000.000 out of a room whose members locked 3 × 3 × 1.000.000 stroops in.
  pool: 3_000_000,
  round: 3,
  nextDate: "16 Jul 2026, 12.06",
  nextKocok: null,
  status: "paid",
  winner: "Rani Wulandari",
  result: { roomId: "stellar-6", round: 3, winner: "Rani Wulandari", firstName: "Rani", amount: 3_000_000, participants: 3, transactionId: "0208a1fc9fd173ada365af082885703a65ba2b62cf1884d35aa375ea4387d58d", source: "stellar" },
  history: [
    { roomId: "stellar-6", round: 1, winner: "Sari Kusuma", amount: 3_000_000, source: "stellar", timestamp: "16 Juli 2026 pukul 12.05" },
    { roomId: "stellar-6", round: 2, winner: "Dina Prameswari", amount: 3_000_000, source: "stellar", timestamp: "16 Juli 2026 pukul 13.06" },
    { roomId: "stellar-6", round: 3, winner: "Rani Wulandari", amount: 3_000_000, source: "stellar", timestamp: "16 Juli 2026 pukul 13.24" },
  ],
  members: [
    { id: "GCANYLS5NNU2RERJZLFN6522I37PZPNRPYSUYL2MMUQME6JAJA2UUVYR", name: "Dina Prameswari", amount: 1_000_000, paid: true },
    { id: "GDQR45VM7CP4A6J6TGBNCSMZ3S6HKDTGLNZ576A5YYGKTBN3SSG2J6NS", name: "Rani Wulandari", amount: 1_000_000, paid: true },
    { id: "GBS4UB2FNG3VTNBCGLR7BOMYIT3L7NVNV5BJFU4Z77R5YYPRQ5AX2GED", name: "Sari Kusuma", amount: 1_000_000, paid: true },
  ],
};

/** The same gateway, one status earlier: started, no round drawn, still holding. */
// Relative to now, never an absolute date. An absolute "future" kocok silently
// becomes past once the clock passes it, which flipped this room from
// "counting down" to "ready" and broke the countdown test on 2026-07-18. This
// fixture's whole point is a room whose schedule has NOT arrived, so its kocok
// has to stay in the future for every run.
const FUTURE_KOCOK_S = Math.floor(Date.now() / 1000) + 3600;

const gatewaySealedRoom = {
  id: "stellar-7",
  chainRoomId: 7,
  source: "stellar",
  code: "AWRDA572C",
  name: "Arisan Sahabat",
  host: "Dina Prameswari",
  contribution: 2_500_000,
  onChainShareStroops: 1_000_000,
  memberLimit: 6,
  paidCount: 6,
  pool: 15_000_000,
  round: 1,
  nextDate: "besok, 19.00",
  drawAt: new Date(FUTURE_KOCOK_S * 1000).toISOString(),
  nextKocok: FUTURE_KOCOK_S,
  scheduleAgreed: true,
  status: "sealed",
  history: [],
  members: [
    { id: "GCANYLS5NNU2RERJZLFN6522I37PZPNRPYSUYL2MMUQME6JAJA2UUVYR", name: "Dina Prameswari", amount: 2_500_000, paid: true },
  ],
};

describe("the pool caption over a gateway room", () => {
  it("does not say the contract holds a pot it has already paid out", async () => {
    // The blocker. "paid" is every round drawn (testnet-gateway.mjs:284, :291),
    // and this contract is a PREFUND arisan: N members lock N×s before round 1
    // and N rounds pay out N×s, so "After N rounds ... the contract balance for
    // the room is exactly zero" (lib.rs:7-9). Chain room 6 is `Done` — re-read
    // at ledger 3,641,361 — and the contract holds nothing for it.
    //
    // The caption said "Pool terkunci" over Rp3.000.000 anyway. Not the pot
    // being wrong — the pot is real, and all three winners were paid exactly it
    // — but the present tense over money that has left.
    stubGateway([gatewayPaidRoom]);
    window.history.pushState({}, "", "/app/room/stellar-6");

    const { container } = render(<App />);

    await screen.findByRole("heading", { name: "Arisan Test2", level: 1 });
    const panel = container.querySelector(".trust-panel");
    expect(panel.textContent).not.toMatch(/terkunci/i);
    // The number stays, and stays in the gateway's own Rupiah. A caption fixed
    // by blanking the figure would pass the line above and say less than before.
    // Through formatRupiah rather than a typed literal: it emits a NBSP after
    // "Rp", so "Rp3.000.000" is a string this app never renders.
    expect(panel.textContent).toContain(formatRupiah(3_000_000));
  });

  it("still says a started room's pool is locked, because the contract holds it", async () => {
    // The control, and the gateway's existing behaviour — DEPLOYMENTS.md and the
    // demo video are this path. "sealed" is start_room done and no round drawn,
    // so every member's prefund is still in the contract and "terkunci" is the
    // true word. A fix that reads `status !== "sealed"` or drops the branch
    // altogether passes the test above and quietly takes this with it.
    //
    // This is also the room the brief's "Pool terkunci Rp15.000.000" actually
    // is: 15.000.000 belongs to stellar-7, which is sealed and holding. No paid
    // room on this gateway carries that figure.
    stubGateway([gatewaySealedRoom]);
    window.history.pushState({}, "", "/app/room/stellar-7");

    const { container } = render(<App />);

    await screen.findByRole("heading", { name: "Arisan Sahabat", level: 1 });
    const panel = container.querySelector(".trust-panel");
    expect(panel.textContent).toContain("Pool terkunci");
    expect(panel.textContent).toContain(formatRupiah(15_000_000));
  });

  it("counts the started room and not the paid-out one in the home total", async () => {
    // The caption and the total have to agree about which rooms hold money, and
    // they are decided in different places from different sets (HOLDS_FUNDS at
    // ui.jsx:232, the label at AppPages). 15.000.000 and not 18.000.000.
    //
    // Scoped to .safe-balance and read off textContent, like the two above, and
    // not through getByText: getByText normalizes the node's text but NOT the
    // matcher, so formatRupiah's NBSP never equals the space it normalizes the
    // DOM to, and the assertion fails against a total that is already right.
    stubGateway([gatewayPaidRoom, gatewaySealedRoom]);
    window.history.pushState({}, "", "/app");

    const { container } = render(<App />);

    await screen.findByText("Arisan Test2");
    const total = container.querySelector(".safe-balance");
    expect(total.textContent).toContain(formatRupiah(15_000_000));
    expect(total.textContent).not.toContain(formatRupiah(18_000_000));
  });
});

describe("the gateway path keeps its own units, and its own total", () => {
  it("drops a finished gateway room from the total, and still prices it in Rupiah", async () => {
    // The gateway signs, so it may write, and its rooms carry the Rupiah its own
    // demo declared — a figure it deliberately keeps apart from the stroops it
    // moves. That path must keep formatting Rupiah, and must stop counting a room
    // whose rounds are all paid out: the caption says "terkunci", and this room's
    // last pot went to its last winner.
    stubGateway([paidGatewayRoom]);
    window.history.pushState({}, "", "/app");

    render(<App />);

    await screen.findByText("Arisan Gateway");
    expect(screen.getByText(/^Rp\s?0$/)).toBeInTheDocument();
    // Nothing reached the chain: a gateway that can sign is read through the
    // gateway. If this ever fires, the test is measuring the wrong path.
    expect(chain.calls).toEqual([]);
  });

  it("routes a gateway room to AppPages, not to the chain board", async () => {
    // The seam's control, from this side. isChainOnly asks network.mode, not
    // room.source — and the gateway also produces source "stellar" (testnet-
    // gateway.mjs:199). A seam that gated on the room would take this path, and
    // the project's existing evidence (DEPLOYMENTS.md, the demo video), with it.
    stubGateway([paidGatewayRoom]);
    window.history.pushState({}, "", "/app");

    render(<App />);

    await screen.findByText("Arisan Gateway");
    expect(screen.queryByTestId("chain-board-placeholder")).not.toBeInTheDocument();
  });
});

/**
 * stellar-6 one round earlier: the state it must have been in for the round-3
 * draw on its own record to have happened at all. Its recorded result and the
 * reply below are that draw, read from the running gateway with the rest of the
 * room (2026-07-17), not composed here.
 *
 * Two fields are wound back, and only two. `status` was "sealed": the gateway
 * writes "paid" in the same updateRoom call that appends round 3
 * (testnet-gateway.mjs:290-298), so before that call it was still the status
 * start_room left. `nextKocok` is NOT on record — drawRoom nulls it on the last
 * round (:288) — so this room's own real, past `firstKocok` stands in. All the
 * page reads from it is whether the schedule has arrived, and the recorded draw
 * is proof that it had.
 */
const gatewaySealedLastRound = {
  ...gatewayPaidRoom,
  status: "sealed",
  nextKocok: 1784178278,
  winner: undefined,
  result: undefined,
  history: gatewayPaidRoom.history.filter((item) => item.round < 3),
};

/** What POST /draw returned for that round: `{ ...result, isComplete, nextRound, nextKocok, nextDate }` (testnet-gateway.mjs:299). */
const lastRoundDrawReply = {
  roomId: "stellar-6",
  roomName: "Arisan Test2",
  round: 3,
  winner: "Rani Wulandari",
  firstName: "Rani",
  amount: 3_000_000,
  participants: 3,
  transactionId: "0208a1fc9fd173ada365af082885703a65ba2b62cf1884d35aa375ea4387d58d",
  source: "stellar",
  timestamp: "16 Juli 2026 pukul 13.24",
  isComplete: true,
  nextRound: 3,
  nextKocok: null,
  nextDate: "16 Jul 2026, 12.06",
};

/**
 * The gateway mid-cycle, and nothing wound back: chain room 4, read from the
 * running gateway the same day, trimmed to the keys the page reads. Sealed,
 * round 2 of 3, one round already won, its kocok 93.492s past — so it draws, and
 * with two candidates rather than one it takes the rolling-name flow and not the
 * final-recipient one.
 */
const gatewayMidCycleRoom = {
  id: "stellar-4",
  chainRoomId: 4,
  source: "stellar",
  code: "AWR2B0D20",
  name: "Arisan Sahabat",
  host: "Dina Prameswari",
  contribution: 1_000_000,
  onChainShareStroops: 1_000_000,
  memberLimit: 3,
  paidCount: 3,
  pool: 3_000_000,
  round: 2,
  status: "sealed",
  nextKocok: 1784134191,
  nextDate: "15 Jul 2026, 23.49",
  winner: "Dina Prameswari",
  history: [
    { roomId: "stellar-4", round: 1, winner: "Dina Prameswari", amount: 3_000_000, source: "stellar", timestamp: "15 Juli 2026 pukul 23.48" },
  ],
  members: [
    { id: "GCANYLS5NNU2RERJZLFN6522I37PZPNRPYSUYL2MMUQME6JAJA2UUVYR", name: "Dina Prameswari", amount: 1_000_000, paid: true },
    { id: "GDQR45VM7CP4A6J6TGBNCSMZ3S6HKDTGLNZ576A5YYGKTBN3SSG2J6NS", name: "Rani Wulandari", amount: 1_000_000, paid: true },
    { id: "GBS4UB2FNG3VTNBCGLR7BOMYIT3L7NVNV5BJFU4Z77R5YYPRQ5AX2GED", name: "Sari Kusuma", amount: 1_000_000, paid: true },
  ],
};

describe("a /kocok URL for a room with no round to draw", () => {
  it("does not offer to draw a room whose rounds are all paid out", async () => {
    // The blocker, reproduced in a real browser first: /app/room/stellar-6/kocok
    // against `node server/testnet-gateway.mjs` rendered "Semua nama punya
    // peluang yang sama" over the Done room, "0 anggota yang belum menang ikut
    // pada putaran ini" under it, "Pool Rp3.000.000 tersedia" in the present
    // tense over a pot the contract has already paid out, and an ENABLED "Kocok
    // sekarang".
    //
    // No button leads here at this status — RoomPage offers "Mulai kocok" only
    // at "sealed" (AppPages:665) — so the URL is the whole attack surface, and a
    // URL survives a bookmark and a reload.
    stubGateway([gatewayPaidRoom]);
    window.history.pushState({}, "", "/app/room/stellar-6/kocok");

    render(<App />);

    // Back on the room detail, which already says the true thing for this status
    // ("Semua putaran selesai") and gets corrected when the room moves.
    await screen.findByRole("heading", { name: "Arisan Test2", level: 1 });
    expect(window.location.pathname).toBe("/app/room/stellar-6");
    expect(screen.queryByRole("button", { name: /Kocok sekarang/i })).toBeNull();
    expect(screen.queryByText(/Semua nama punya peluang yang sama/)).toBeNull();
    expect(screen.queryByText(/0 anggota yang belum menang/)).toBeNull();
  });

  it("leaves the back button pointing somewhere other than the URL it just refused", async () => {
    // Why the Navigate carries `replace`. Without it the room detail is PUSHED
    // on top of /kocok, so Back returns to /kocok, the guard fires again and
    // pushes the user straight forward — a back button that visibly does
    // nothing. `replace` drops the refused URL instead, so Back reaches the page
    // before it.
    stubGateway([gatewayPaidRoom]);
    window.history.pushState({}, "", "/app");
    window.history.pushState({}, "", "/app/room/stellar-6/kocok");

    render(<App />);
    await screen.findByRole("heading", { name: "Arisan Test2", level: 1 });

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    expect(window.location.pathname).toBe("/app");
  });

  it("does not offer to draw a room that was never started", async () => {
    // Not the status the brief named, and found by walking the routes rather
    // than by being told: rt-08 ships in initialDemoState at "ready" with a
    // schedule in the past, and /kocok rendered an enabled "Kocok sekarang" and
    // the words "Daftar anggota terkunci" over it. "ready" is the status whose
    // own detail panel says the opposite — "Kunci daftar anggota dan nominal"
    // (AppPages:663), i.e. the list is NOT locked yet — and on the chain it is
    // `Open`, where kocok is rejected. A local room has no contract to refuse
    // it, so clicking simply drew a winner and skipped the seal.
    stubGateway([]);
    window.history.pushState({}, "", "/app/room/rt-08/kocok");

    render(<App />);

    await screen.findByRole("heading", { name: "Arisan RT 08", level: 1 });
    expect(window.location.pathname).toBe("/app/room/rt-08");
    expect(screen.queryByRole("button", { name: /Kocok sekarang/i })).toBeNull();
    expect(screen.queryByText(/Daftar anggota terkunci/)).toBeNull();
  });

  it("still draws a started room whose schedule has arrived", async () => {
    // The control that matters most: this is the gateway's own draw path, which
    // is DEPLOYMENTS.md and the demo video. A guard that gates on anything
    // coarser — `history.length`, `candidates.length`, "is there a result" —
    // passes the two above and takes this with it.
    stubGateway([gatewayMidCycleRoom]);
    window.history.pushState({}, "", "/app/room/stellar-4/kocok");

    render(<App />);

    expect(await screen.findByRole("button", { name: /Kocok sekarang/i })).toBeEnabled();
    expect(window.location.pathname).toBe("/app/room/stellar-4/kocok");
  });

  it("still waits out a started room whose schedule has not arrived", async () => {
    // The other half of the control. "sealed" with a future kocok is a real
    // state the gateway is in right now (stellar-7, 61.882s out — the same room
    // whose POST /draw answers 409 {error, waitSeconds}), and the page's honest
    // answer is a countdown, not a bounce.
    stubGateway([gatewaySealedRoom]);
    window.history.pushState({}, "", "/app/room/stellar-7/kocok");

    render(<App />);

    await screen.findByText(/Belum waktunya kocok/);
    expect(window.location.pathname).toBe("/app/room/stellar-7/kocok");
  });

  it("stays on the page through the last round, which turns the room paid mid-draw", async () => {
    // The regression this guard can cause, and the reason it reads `drawing`.
    // completeDraw flips the room to "paid" (demo-state.jsx:365) while startDraw
    // is still inside its 2.800ms await, so on the LAST round of every room that
    // completes, the room is already "paid" for the rest of the draw. A guard
    // that asks the status alone fires right there and throws the user off the
    // payment they are watching, back to the room detail — on the gateway's own
    // path, which is DEPLOYMENTS.md and the demo video.
    //
    // The bounce is what has to be caught, not the destination: startDraw's own
    // navigate() runs at 2.800ms regardless and lands on /hasil either way, so
    // asserting where it ENDS UP passes against the broken guard. Measured, not
    // assumed — with `!drawing` removed this test passed until it asserted the
    // window below.
    stubGateway([gatewaySealedLastRound], lastRoundDrawReply);
    window.history.pushState({}, "", "/app/room/stellar-6/kocok");

    render(<App />);

    // Rani is the one member of three who had not won: rounds 1 and 2 went to
    // Sari and Dina, so this is the final-recipient flow.
    const button = await screen.findByRole("button", { name: /Selesaikan putaran dan bayar/i });
    await userEvent.setup().click(button);

    // Mid-draw, and deterministically so: the stubbed POST /draw settles in
    // microtasks, so by 300ms the room is "paid" and any status-only guard has
    // already fired — while the 2.800ms animation still has ~2.5s to run, so
    // startDraw has not navigated yet. The user is watching a payment.
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(window.location.pathname).toBe("/app/room/stellar-6/kocok");
    expect(screen.getByRole("button", { name: /Memproses putaran akhir/i })).toBeInTheDocument();

    // And it still finishes where it always did.
    await screen.findByRole("heading", { name: /Siklus Awrisan selesai/i }, { timeout: 5_000 });
    expect(window.location.pathname).toBe("/app/room/stellar-6/hasil");
  }, 10_000);
});

describe("the receipt's own headline", () => {
  // Both rooms below were read in a real browser against `node
  // server/testnet-gateway.mjs` on port 4173 (2026-07-17), not reasoned about:
  // the two receipts printed the SAME headline, and only one of them had a
  // payment behind it. rt-08 is the local seed and needs no gateway to reach —
  // it is the first room on the home screen of anyone who clones this repo and
  // never starts one.
  it("does not claim a testnet payment on a room this app simulated itself", async () => {
    // Live, at /app/room/rt-08/tanda-terima: "Pembayaran testnet berhasil" over
    // "Jaringan: Simulasi lokal", transaction id `local-rt08-round-3`, and a
    // footer reading "Dokumen ini dibuat lokal dan tidak mewakili perpindahan
    // uang sungguhan". The card contradicted itself; the headline was the false
    // half. No URL needed either — a local room drawn to its last round
    // navigates to /hasil, whose "Lihat tanda terima" button lands here.
    stubGateway([]);
    window.history.pushState({}, "", "/app/room/rt-08/tanda-terima");

    render(<App />);

    // Its own record of what it is, still on the same card.
    await screen.findByText("Simulasi lokal");
    expect(screen.queryByText(/Pembayaran testnet berhasil/)).toBeNull();
  });

  it("still claims it on a room the gateway really paid on Testnet", async () => {
    // The control, and the reason the sentence is asked rather than deleted.
    // stellar-6 round 3 is a real Testnet payment: transaction
    // 0208a1fc9fd173ada365af082885703a65ba2b62cf1884d35aa375ea4387d58d, which
    // this same card links to stellar.expert as proof. A "fix" that drops the
    // headline, or asks the room instead of the result, passes the test above
    // and takes DEPLOYMENTS.md and the demo video with it.
    stubGateway([gatewayPaidRoom]);
    window.history.pushState({}, "", "/app/room/stellar-6/tanda-terima");

    render(<App />);

    await screen.findByText("Pembayaran testnet berhasil");
    expect(screen.getByText("Stellar Testnet")).toBeInTheDocument();
  });
});

describe("HOLDS_FUNDS", () => {
  it("names only statuses the app can actually render", () => {
    // A status renamed in STATUS_LABELS and missed here does not throw: the set
    // silently stops matching, the total silently reads zero, and the caption
    // silently understates what the contract holds.
    for (const status of HOLDS_FUNDS) {
      expect(Object.keys(STATUS_LABELS)).toContain(status);
    }
  });
});

/** Reports what sealRoom did, so the guard can be caught doing nothing. */
function SealProbe({ roomId }) {
  const { sealRoom, state } = useDemo();
  const [outcome, setOutcome] = useState("");
  return (
    <>
      <p>{`mode:${state.network.mode}/${state.rooms.filter((room) => room.source === "stellar").length}`}</p>
      <button
        type="button"
        onClick={() => sealRoom(roomId).then(
          () => setOutcome("dikirim tanpa penolakan"),
          (error) => setOutcome(error.message),
        )}
      >
        seal
      </button>
      <p>{outcome}</p>
    </>
  );
}

describe("the state layer refuses to write to a chain it can only read", () => {
  it("refuses to seal a room the network cannot sign for", async () => {
    // demo-state.jsx:310 — isReadOnly(room, network) is `room.source === "stellar"
    // && !canWrite(network)`, and it throws rather than posting. Unreachable from
    // the UI now that ChainBoard owns this mode and offers no button, which is
    // exactly why it is tested rather than deleted: it is the backstop that keeps
    // a fake status off real chain data if a later seam ever routes here again.
    //
    // Reached through the one state that still produces a chain room: a chain read
    // that worked. The old route in — a room replayed out of localStorage — is
    // gone, because readState now filters `source: "stellar"` (demo-state:192-194).
    chain.rooms = [activeRoom];
    stubStaticHost();

    render(<DemoProvider><SealProbe roomId="stellar-1" /></DemoProvider>);

    // The room is real and read, and the network cannot sign: without this the
    // refusal below could be nothing more than a room that was never there.
    await screen.findByText("mode:readonly/1");

    await userEvent.setup().click(screen.getByRole("button", { name: "seal" }));

    expect(await screen.findByText(READ_ONLY_MESSAGE)).toBeInTheDocument();
    // The harm, named: it never reached the gateway. Without the guard the POST
    // goes out and the user is handed whatever the static host said instead.
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/start"),
      expect.anything(),
    );
  });

  it("still seals a local room, which is this app's own simulation", async () => {
    // The control, and the reason the guard is a source+network question rather
    // than an unconditional throw. Without it, `if (true)` passes the test above.
    //
    // The RPC has to be down for this one. With no gateway hosted, a chain read
    // that ANSWERS lands on mode "readonly" whatever it found — room_count 0 is
    // still an answer — so "local" is now reachable only when both are gone.
    chain.down = true;
    stubStaticHost();

    render(<DemoProvider><SealProbe roomId="rt-08" /></DemoProvider>);
    await screen.findByText("mode:local/0");

    await userEvent.setup().click(screen.getByRole("button", { name: "seal" }));

    expect(await screen.findByText("dikirim tanpa penolakan")).toBeInTheDocument();
  });
});

/**
 * The date guards, which had no coverage at all before this file.
 *
 * TWO guards, and these tests reach exactly ONE of them. Measured, not assumed:
 * each was mutated on a copy of src/ and the file re-run.
 *
 *   AppPages:77, formatSchedule — REACHED. An Invalid Date hits
 *   Intl.DateTimeFormat.format() at :78, which throws RangeError: Invalid time
 *   value. That is not a wrong sentence, it is an unmounted subtree and a blank
 *   screen. Deleting the check kills 2 of the tests below.
 *
 *   AppPages:109, calendarUrl — NOT REACHED, and not reachable. Replacing its
 *   isNaN branch with `throw` changes nothing: both call sites already feed it a
 *   date that cannot be invalid. :539 gates on hasValidSchedule and then passes
 *   `scheduledAt.toISOString()`, i.e. a date it just validated; :429 passes
 *   `form.drawAt` from an <input type="datetime-local">, which yields a valid
 *   string or an empty one, and empty is caught by the `!start` half. So the
 *   calendar test below withholds its link because of the hasValidSchedule GATE
 *   (deleting that gate kills it), never because of calendarUrl's own check.
 *   That check is unreached defensive code and this file does not pretend to
 *   cover it.
 *
 * Reachable, and not contrived: readState replays whatever localStorage holds,
 * the key is on its SIXTH schema ("awrisan-demo-v6"), and nothing validates a
 * replayed room's dates. A room saved by an older build is exactly how a date the
 * parser rejects arrives.
 *
 * The RPC is down throughout, because that is the only way to AppPages now: with
 * no gateway hosted, any chain read that answers routes to ChainBoard, and these
 * guards live at AppPages:77 and :109.
 */
const roomWithBadDate = {
  ...initialDemoState.rooms.find((room) => room.id === "rt-08"),
  drawAt: "kemarin sore",
  nextKocok: Number.NaN,
  nextDate: undefined,
};

describe("a room whose saved date will not parse", () => {
  beforeEach(() => {
    chain.down = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...initialDemoState,
      rooms: [roomWithBadDate],
    }));
    stubStaticHost();
  });

  it("says the schedule is undetermined instead of throwing on it", async () => {
    window.history.pushState({}, "", "/app/room/rt-08");

    const { container } = render(<App />);

    // The page mounts at all, which is the guard's whole job: without it
    // formatSchedule throws RangeError out of a render and this heading never
    // appears — no sentence, wrong or right, just nothing.
    await screen.findByRole("heading", { name: "Arisan RT 08", level: 1 });

    // Scoped to the card rather than the page: formatSchedule feeds three slots
    // on this screen and they all answer, so a bare getByText finds three matches
    // and fails on the count while the guard is working perfectly.
    expect(container.querySelector(".schedule-card h2").textContent).toBe("Belum ditentukan");
    expect(container.textContent).not.toMatch(/Invalid Date/);
  });

  it("offers no calendar invite built from a date it could not read", async () => {
    window.history.pushState({}, "", "/app/room/rt-08");

    render(<App />);
    await screen.findByRole("heading", { name: "Arisan RT 08", level: 1 });

    // No link, rather than a link built from a date nothing could read. This is
    // the claim that outlives the app: it writes into the member's own Google
    // Calendar, where nothing we ship can ever correct it.
    //
    // The gate doing the work is hasValidSchedule at :539, not calendarUrl's own
    // check — see the block comment above. Deleting `hasValidSchedule &&` there
    // makes :539 call scheduledAt.toISOString() on an Invalid Date, which throws
    // RangeError out of the render and takes the page with it. That is what this
    // catches.
    expect(screen.queryByRole("link", { name: /Google Calendar/i })).toBeNull();
  });

  it("still offers one for the same room with a date that parses", async () => {
    // The control. Both guards return their fallback for a FALSY date too, so
    // without a room that has a real date, the two assertions above pass just as
    // well against a page that has quietly stopped offering anything at all.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDemoState));
    window.history.pushState({}, "", "/app/room/rt-08");

    render(<App />);
    await screen.findByRole("heading", { name: "Arisan RT 08", level: 1 });

    expect(screen.queryByText("Belum ditentukan")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Google Calendar/i })).toBeInTheDocument();
  });
});
