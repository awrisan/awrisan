import { useEffect, useState } from "react";
import { useDemo } from "../demo-state.jsx";
import { CONTRACT_ID } from "../stellar-rpc.js";
import { Logo, TestnetPill } from "../ui.jsx";
import { ChainRoomCard } from "./ChainRoomCard.jsx";
import {
  BOARD_BOUNDARY,
  BOARD_LEAD,
  CONTRACT_LABEL,
  EXPLORER_LINK,
  READING,
  TOTAL_CAPTION,
  TOTAL_UNKNOWN,
  allUnread,
  boardState,
  explorerContractUrl,
  heldStroops,
  ledgerRead,
  totalAtLeast,
  totalHeld,
  unreadNote,
} from "./chain-sentences.js";
import "./chain.css";

/**
 * The whole read-only surface: one page, no routes under it, and nothing on it
 * that did not come out of the contract.
 *
 * The local simulation is not here, and that is the point rather than an
 * omission. Today's home screen puts chain rooms first — but until the read lands
 * there ARE no chain rooms, so the first frame of every cold load is
 * "Arisan RT 08, Rp100.000.000, 10 anggota", pure fiction, under a heading that
 * says on-chain. A caption on that screen is what the last four rounds would have
 * added. A different screen means no fake can be on it, by construction. The cost
 * is real and stated: the public build no longer demos the arisan UX. That
 * evidence lives in DEPLOYMENTS.md and the demo video, which the gateway path
 * still serves untouched.
 *
 * On the citations below, and in this file's siblings: they name a SYMBOL, never
 * a line. All three line numbers this file shipped with were already false — the
 * `unread` arithmetic was cited at :471, the room page's tick at :606-609 — and
 * nobody who broke them ever opened this file: one lane inserted a function into
 * stellar-rpc.js above the first, another deleted from AppPages.jsx around the
 * second. Nothing announced either, and that is the whole failure mode. A rotted
 * citation still reads like a citation; :471 still had a perfectly good line of
 * code on it to point at.
 *
 * The decay is not theoretical and it is not slow. stellar-rpc.js and
 * AppPages.jsx were BOTH edited again while this comment was being written —
 * `readRooms` slid another 8 lines, `MissingResult` another 24 — so a line number
 * written at the top of a session is stale by the end of it. Every symbol named
 * below sat through those edits untouched, because a symbol has no position to
 * lose. That is not a claim about the future; the suite stayed green across it.
 *
 * And they are checkable, which is the part a line number could never manage:
 * chainboard-citations.test.js greps every citation in this directory and fails
 * the moment one stops resolving.
 */
export function ChainBoard() {
  const { state } = useDemo();
  const nowSeconds = useNowSeconds();
  // The chain read's rooms and nothing else. `mergeStellarRooms` in demo-state.jsx
  // drops any replayed `source: "stellar"` room as soon as a read lands, so in
  // this mode every one of these came from the read this page is describing.
  const rooms = state.rooms.filter((room) => room.source === "stellar");
  const unread = state.network.roomsUnread ?? 0;
  // `readRooms` in stellar-rpc.js returns `unread = count - read.length`, so the
  // contract's own room_count is exactly what answered plus what did not.
  const count = rooms.length + unread;
  const board = boardState({ mode: state.network.mode, rooms, unread, count });
  const reading = board === "reading";

  return (
    <div className="chain-page">
      <header className="chain-header">
        <div className="chain-header-brand">
          <Logo light />
          <TestnetPill compact />
        </div>
        {/* One heading slot, two contents: while the read is in flight the page
            says the read is in flight, and claims no result — no rooms, no total,
            no zero, no ledger. */}
        <h1 className={reading ? "chain-reading" : "chain-lead"}>{reading ? READING : BOARD_LEAD}</h1>
        {/* The write boundary, said out loud. Without it the missing create
            button reads as breakage — the founder himself filed it as a bug.
            True in every mode, so it does not wait for the read. */}
        <p className="chain-boundary">{BOARD_BOUNDARY}</p>
        {/* Rendered while reading too, and it is the only thing here that is.
            `CONTRACT_ID` in stellar-rpc.js is a build-time constant, not a read
            result: it is exactly as true in the first frame as in the last, so
            withholding it bought no honesty. It cost four seconds of a band that
            could only pulse — the read is a 39-simulation fan-out behind
            `MAX_IN_FLIGHT` in stellar-rpc.js, five at a time. (Measured, both
            ends, 2026-07-17 against the live contract: the fan-out alone is
            3,0-3,4s from node, and in the browser the band is up from 813ms to
            4826ms. The "~2,3s" this directory used to quote everywhere predates
            the seed read that took the fan-out from 30 calls to 39.) Whoever
            loads this page is being asked to believe it reads a real contract,
            and this is the address they check that against. Making them wait for
            it was the one claim on the page that did not need the chain to be
            true.

            Everything below still waits, and for the opposite reason: those ARE
            read results, and a zero that means "nothing answered" is the exact
            lie this surface exists to stop. */}
        <p className="chain-contract">
          <span>{CONTRACT_LABEL}</span>
          <code>{CONTRACT_ID}</code>
          <a href={explorerContractUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">
            {EXPLORER_LINK}
          </a>
        </p>
        {/* Two gates, and the second is not redundant: readStatus supplies the
            ledger, so during "reading" there is no height to print — but
            "#undefined" is not a ledger in any mode, and the day something else
            renders this branch the guard is already here. */}
        {reading || !state.network.latestLedger ? null : (
          <p className="chain-ledger">{ledgerRead(state.network.latestLedger)}</p>
        )}
      </header>

      {reading ? null : (
        <main className="chain-body">
          <BoardTotal board={board} rooms={rooms} unread={unread} count={count} />
          <div className="chain-cards">
            {rooms.map((room) => (
              <ChainRoomCard key={room.id} room={room} nowSeconds={nowSeconds} />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}

/**
 * The figure, or the sentence that replaces it.
 *
 * Two of these four states render no number at all, and that is the whole job:
 * "0 XLM terkunci di Stellar Testnet" beside a live ledger height, over a
 * contract holding 5,7 XLM, was a sum of rooms that never answered. boardState
 * keeps the null out of the arithmetic; this only picks which sentence.
 */
function BoardTotal({ board, rooms, unread, count }) {
  if (board === "all-unread") return <p className="chain-total chain-total-quiet">{allUnread(count)}</p>;
  if (board === "total-unknown") return <p className="chain-total chain-total-quiet">{TOTAL_UNKNOWN}</p>;

  const held = heldStroops(rooms);
  const partial = board === "partial";
  return (
    <div className="chain-total">
      <p className="chain-total-line">{partial ? totalAtLeast(held) : totalHeld(held, rooms.length)}</p>
      {partial ? <p className="chain-total-note">{unreadNote(unread, count)}</p> : null}
      <p className="chain-total-note">{TOTAL_CAPTION}</p>
    </div>
  );
}

/**
 * The clock the room states are read against, in the contract's own unit.
 *
 * A tick rather than a render-time snapshot because two of the tags flip on a
 * timestamp — an Open room's join deadline, an Active round's kocok deadline —
 * and a page left open would go on saying "dijadwalkan" about a round the
 * contract had already opened for anyone. Not hypothetical, and dated because
 * unlike a symbol the chain really does move: at ledger 3.641.413 rooms 1, 2 and
 * 4 were 25,0h, 26,6h and 28,5h past their round-2 deadline, open to anyone. One
 * second matches the interval `RoomPage` in AppPages.jsx already runs; the work
 * behind it is a few string builds and one BigInt modulo per finished round.
 */
function useNowSeconds() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
