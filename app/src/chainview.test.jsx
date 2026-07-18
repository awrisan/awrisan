import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

/**
 * The chain view's own traps: the ones a live board would not catch today.
 *
 * The fixtures are the live contract, copied out of a read taken while this was
 * written (ledger 3.640.335): room 6's three rounds, their real seeds, and the
 * roster in Members order. Hand-written fixtures cannot catch a producer that
 * stops emitting a field — that is field-contract.test.js's job, and
 * readonly-money.test.jsx's comment is right about why. What they can do is pin
 * the arithmetic and the ordering in this view, and both have a state with no
 * live example behind them.
 */

const demo = vi.hoisted(() => ({ value: null }));

vi.mock("./demo-state.jsx", async (importOriginal) => ({
  ...(await importOriginal()),
  useDemo: () => demo.value,
}));

const { ChainBoard } = await import("./chain/ChainBoard.jsx");
const { ChainRoomCard } = await import("./chain/ChainRoomCard.jsx");
const { boardState, roomState, verifyRound } = await import("./chain/chain-sentences.js");

/** Live: room 5, 6 and 7's roster, in the order get_members returns it. */
const ADDRESSES = [
  "GCANYLS5NNU2RERJZLFN6522I37PZPNRPYSUYL2MMUQME6JAJA2UUVYR",
  "GDQR45VM7CP4A6J6TGBNCSMZ3S6HKDTGLNZ576A5YYGKTBN3SSG2J6NS",
  "GBS4UB2FNG3VTNBCGLR7BOMYIT3L7NVNV5BJFU4Z77R5YYPRQ5AX2GED",
];

const SHARE = 1_000_000;
const PREFUND = SHARE * 3;
const NOW = 1_784_218_582;

/** Room 6 as the chain has it: Done, round 4 on a 3-seat room, every round won. */
const DONE_ROOM = {
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
  // Seeds as readWinners emits them: decimal digits, because a BigInt cannot
  // survive the JSON.stringify every room goes through on its way to
  // localStorage (demo-state.jsx:176).
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

const room = (overrides) => ({ ...DONE_ROOM, ...overrides });

describe("roomState", () => {
  it("calls a full Open room startable, not dead, when its join deadline has passed", () => {
    // No live example: room 7 was this room until someone started it. start_room
    // checks Open (lib.rs:387) and a full roster (:395) and never reads
    // join_deadline, so the deadline says nothing about whether this room can
    // still be locked. Ordered the natural way, this is "open-dead" and the card
    // tells a live room it will never draw.
    const full = room({ status: "funding", round: 0, paidCount: 6, memberLimit: 6, joinDeadline: NOW - 3600 });
    expect(roomState(full, NOW)).toBe("open-full");
  });

  it("calls an Open room dead only once the deadline has passed AND a seat is empty", () => {
    // Live: room 3, 1 of 3 seats, deadline long gone. Nothing can fill it
    // (join_room:279-281) so nothing can start it (:395).
    const short = room({ status: "funding", round: 0, paidCount: 1, memberLimit: 3, joinDeadline: NOW - 3600 });
    expect(roomState(short, NOW)).toBe("open-dead");
    // Strictly greater: join_room rejects only `now > join_deadline`, so joining
    // is legal AT the deadline and the room is still live on that second.
    expect(roomState({ ...short, joinDeadline: NOW }, NOW)).toBe("open-live");
  });

  it("opens the kocok at the deadline, not after it", () => {
    // kocok returns NotYet while `now < deadline` (lib.rs:541-548). Live on rooms
    // 1, 2 and 4, whose round-2 deadline passed a day ago.
    const active = room({ status: "sealed", round: 2, nextKocok: NOW });
    expect(roomState(active, NOW)).toBe("active-due");
    expect(roomState({ ...active, nextKocok: NOW + 1 }, NOW)).toBe("active-scheduled");
    expect(roomState({ ...active, nextKocok: null }, NOW)).toBe("active-unknown-schedule");
  });

  it("tells the two ways out of a room apart by round", () => {
    // cancel_room runs only from Open, where round is still 0 (create_room:243);
    // emergency_dissolve runs only from Active, which is round >= 1 (start_room:400).
    expect(roomState(room({ status: "dissolved", round: 0 }), NOW)).toBe("dissolved-cancelled");
    expect(roomState(room({ status: "dissolved", round: 1 }), NOW)).toBe("dissolved-emergency");
    expect(roomState(room({ status: "cancelled" }), NOW)).toBe("unknown");
  });
});

describe("boardState", () => {
  it("keeps a room it cannot account for out of the arithmetic, unread rooms or not", () => {
    // Both tags fit here, and the sum is why the stricter one wins: `total + null`
    // is `total` in JS, so the unknown room is silently worth nothing. As a lower
    // bound ("Minimal X") that survives — as a total it does not, and the state
    // that renders no figure at all is the only one true under both.
    const rooms = [room({ lockedStroops: 3_000_000 }), room({ status: "cancelled", lockedStroops: null })];
    expect(boardState({ mode: "readonly", rooms, unread: 1, count: 3 })).toBe("total-unknown");
    expect(boardState({ mode: "readonly", rooms, unread: 0, count: 2 })).toBe("total-unknown");
  });
});

describe("verifyRound", () => {
  it("recomputes the live winner with the seed as a BigInt", () => {
    const result = verifyRound({ members: DONE_ROOM.members, winners: DONE_ROOM.history, round: 1, seed: DONE_ROOM.history[0].seed });
    expect(result).toEqual({ status: "match", index: 2, unwonLength: 3, predicted: ADDRESSES[2] });
    // Why this fixture and not another: this is what the same seed does once it
    // has been through a double. The chain paid index 2; Number() lands on 1 and
    // the panel calls the contract a liar. Three of today's nine live rounds do
    // this — the seed does not have to be exotic, it has to be a u64.
    expect(Number(DONE_ROOM.history[0].seed) % 3).toBe(1);
    // Digits or BigInt: readWinners emits the first, scValToNative hands back the
    // second, and both are exact. Only `Number` is not.
    const asBigInt = verifyRound({ members: DONE_ROOM.members, winners: DONE_ROOM.history, round: 1, seed: 7314979439510601104n });
    expect(asBigInt).toEqual(result);
  });

  it("recomputes every round of the live cycle", () => {
    for (const row of DONE_ROOM.history) {
      const result = verifyRound({ members: DONE_ROOM.members, winners: DONE_ROOM.history, round: row.round, seed: row.seed });
      expect(result.status).toBe("match");
      expect(result.predicted).toBe(row.address);
    }
  });

  it("skips a round it cannot rebuild the unwon list for, rather than crying mismatch", () => {
    // readWinners drops an unreadable row silently (stellar-rpc.js:314-319). The
    // hole corrupts the unwon set, so round 2's modulo lands on the wrong address:
    // our bug, printed as the chain's, on the one panel that exists to be trusted.
    const holed = DONE_ROOM.history.filter((row) => row.round !== 1);
    const result = verifyRound({ members: DONE_ROOM.members, winners: holed, round: 2, seed: DONE_ROOM.history[1].seed });
    expect(result.status).toBe("skipped");
  });

  it("runs no verification without a seed", () => {
    const result = verifyRound({ members: DONE_ROOM.members, winners: DONE_ROOM.history, round: 1, seed: null });
    expect(result.status).toBe("no-seed");
  });

  it("says mismatch when the recomputation genuinely disagrees", () => {
    const wrong = [{ ...DONE_ROOM.history[0], address: ADDRESSES[0] }, ...DONE_ROOM.history.slice(1)];
    const result = verifyRound({ members: DONE_ROOM.members, winners: wrong, round: 1, seed: DONE_ROOM.history[0].seed });
    expect(result.status).toBe("mismatch");
    expect(result.predicted).toBe(ADDRESSES[2]);
  });
});

describe("ChainRoomCard", () => {
  it("prices a finished room in XLM, with no Rupiah and nothing locked", () => {
    const { container } = render(<ChainRoomCard room={DONE_ROOM} nowSeconds={NOW} />);
    // Lie 1: share is 1.000.000 STROOPS (0,1 XLM), and formatRupiah made it
    // "Rp1.000.000" beside a real contract id.
    expect(container).not.toHaveTextContent(/Rp/);
    // Lie 8: this row said "0,3 XLM terkunci untuk 3 putaran", three times, on a
    // room the contract had already paid out — beside "Pool terkunci 0 XLM".
    expect(container).not.toHaveTextContent(/terkunci/i);
    expect(container).toHaveTextContent("Disetor saat gabung: 0,3 XLM");
    expect(container).toHaveTextContent("= 3 × 0,1 XLM, seluruh siklus dibayar di muka");
    // Lie 6: a Done 3-member room stores round 4.
    expect(container).toHaveTextContent("Siklus selesai · 3 putaran, 3 pemenang");
    expect(container).not.toHaveTextContent(/putaran 4/i);
    // The zero is a sentence here, not a figure.
    expect(container).not.toHaveTextContent(/0 XLM/);
    expect(container).toHaveTextContent("Kontrak tidak lagi memegang dana room ini.");
    // Every seed on screen carries what it does and does not prove.
    expect(container).toHaveTextContent("Yang dibuktikan seed ini — dan yang belum");
    expect(container).toHaveTextContent("Seed: 7314979439510601104");
  });

  it("tells a full Open room past its deadline that the host can still start it", () => {
    const full = room({
      status: "funding",
      round: 0,
      paidCount: 6,
      memberLimit: 6,
      joinDeadline: NOW - 3600,
      poolStroops: SHARE * 6,
      lockedStroops: SHARE * 6 * 6,
      history: [],
    });
    const { container } = render(<ChainRoomCard room={full} nowSeconds={NOW} />);
    expect(container).toHaveTextContent("Kursi sudah penuh.");
    expect(container).not.toHaveTextContent(/tidak akan pernah dikocok/);
    // Conditional mood: nothing is pooled until start_room pins the roster.
    expect(container).toHaveTextContent("Jika room ini penuh dan dimulai, pemenang tiap putaran menerima 0,6 XLM.");
  });

  it("says nothing about the money of a room whose status it cannot read", () => {
    const { container } = render(<ChainRoomCard room={room({ status: "cancelled" })} nowSeconds={NOW} />);
    expect(container).toHaveTextContent("Status kontrak: cancelled.");
    expect(container).not.toHaveTextContent(/XLM/);
    expect(container).not.toHaveTextContent(/Kursi terisi/);
  });
});

describe("ChainBoard", () => {
  function board(network, rooms) {
    demo.value = { state: { network: { network: "testnet", ...network }, rooms } };
    return render(
      <MemoryRouter>
        <ChainBoard />
      </MemoryRouter>
    );
  }

  it("claims nothing while the read is in flight", () => {
    const { container } = board({ mode: "reading" }, []);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Membaca kontrak…");
    expect(container).not.toHaveTextContent(/XLM|ledger/);
  });

  it("sums the contract when every room answered", () => {
    const rooms = [room({ lockedStroops: 3_000_000 }), room({ id: "stellar-7", lockedStroops: 36_000_000 })];
    const { container } = board({ mode: "readonly", latestLedger: 3_640_335, roomsUnread: 0 }, rooms);
    expect(container).toHaveTextContent("Kontrak memegang 3,9 XLM untuk 2 room.");
    expect(container).toHaveTextContent("Dibaca pada ledger #3.640.335");
  });

  it("never calls a partial sum the total", () => {
    const { container } = board({ mode: "readonly", latestLedger: 3_640_335, roomsUnread: 2 }, [room({ lockedStroops: 3_000_000 })]);
    expect(container).toHaveTextContent("Minimal 0,3 XLM dipegang kontrak.");
    expect(container).toHaveTextContent("2 dari 3 room tidak terbaca");
    expect(container).not.toHaveTextContent(/Kontrak memegang/);
  });

  it("prints no zero when the contract has rooms and none of them answered", () => {
    // Lie 5, exactly: "0 XLM terkunci di Stellar Testnet", beside a live ledger
    // height, over a contract holding 5,7 XLM.
    const { container } = board({ mode: "readonly", latestLedger: 3_640_335, roomsUnread: 7 }, []);
    expect(container).toHaveTextContent("Kontrak melaporkan 7 room. Tidak satu pun bisa dibaca saat ini.");
    expect(container).not.toHaveTextContent(/XLM/);
  });

  it("puts no unknown into the arithmetic", () => {
    const { container } = board({ mode: "readonly", latestLedger: 3_640_335, roomsUnread: 0 }, [
      room({ lockedStroops: 3_000_000 }),
      room({ id: "stellar-9", status: "cancelled", lockedStroops: null }),
    ]);
    expect(container).toHaveTextContent("Total tidak bisa dihitung");
    expect(container).not.toHaveTextContent(/NaN|Kontrak memegang/);
  });
});
