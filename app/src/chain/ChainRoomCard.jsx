import { CaretDown, Trophy } from "@phosphor-icons/react";
import {
  DISCLOSURE,
  DISCLOSURE_HEADING,
  MEMBERS_LEAD,
  ROUNDS_LEAD,
  explorerAccountUrl,
  memberStake,
  memberStakeMath,
  memberWon,
  roomLabel,
  roomSentences,
  roundRow,
  seedLine,
  shortAddress,
  verifyRound,
  verifySentence,
} from "./chain-sentences.js";

/**
 * One room, straight off the chain. Every word on it comes from
 * chain-sentences.js — there is not one quoted string in this file, and that is
 * the property worth keeping: it means the whole card can be audited against
 * lib.rs by reading one other file, which is the only thing that has ever caught
 * a lie of the kind this view exists to stop.
 *
 * Expands in place, and there is no detail route to open. That is not a layout
 * preference: /hasil and /tanda-terima each open by falling back to
 * `MissingResult` in AppPages.jsx, a guard they need only because a URL survives
 * a bookmark and a reload while the result behind it does not. No route, no
 * orphan URL, no guard to forget.
 *
 * (This sentence used to cite "read-only guards (AppPages:1099, :1143)". Both
 * numbers ran off the end of the file, which is the lesser half of it: there are
 * no read-only guards in AppPages.jsx to point at, at any line. They are
 * missing-result guards and always were. The rot took the DESCRIPTION down with
 * the pointer, so a reader who trusted that sentence came away with a fact about
 * this codebase that has never been true — and a symbol could not have carried
 * it, because you cannot name a thing that does not exist.)
 */
export function ChainRoomCard({ room, nowSeconds }) {
  const { state, headline, body, holdings, pot, finishedAfter, seats, members } = roomSentences(room, nowSeconds);
  // Oldest first. `readWinners` in stellar-rpc.js builds them in order and drops
  // what it cannot read, so a hole here is a round whose row is simply absent —
  // the verification below is what says so, out loud, on the next round.
  const rounds = room.history.slice().sort((a, b) => a.round - b.round);

  return (
    <article className={`chain-card chain-card-${state}`}>
      <div className="chain-card-head">
        <div>
          <p className="chain-card-id">{roomLabel(room.chainRoomId)}</p>
          <h2>{room.name}</h2>
        </div>
        {headline ? <p className="chain-card-chip">{headline}</p> : null}
      </div>

      <p className="chain-card-body">{body}</p>
      {holdings ? <p className="chain-card-note">{holdings}</p> : null}
      {pot ? <p className="chain-card-note chain-card-pot">{pot}</p> : null}
      {finishedAfter ? <p className="chain-card-note">{finishedAfter}</p> : null}

      {members ? (
        <details className="chain-more">
          {/* The summary carries a sentence rather than an invitation, because a
              label is a claim too and the inventory has no word for "open me".
              Native <details>: the expand/collapse, the keyboard and the state
              are the platform's, so none of it is ours to get wrong. */}
          <summary>
            <span>{seats}</span>
            <CaretDown size={17} weight="bold" aria-hidden="true" />
          </summary>
          <div className="chain-more-content">
            <div className="chain-block">
              <p className="chain-block-lead">{MEMBERS_LEAD}</p>
              <ul className="chain-members">
                {room.members.map((member) => {
                  // On the ADDRESS, never the 4+4 short name: a collision is
                  // unlikely, and matching the full address is free and exact.
                  const won = rounds.find((row) => row.address === member.address);
                  return (
                    <li key={member.address}>
                      {/* The last two characters, not the first. The first
                          character of a strkey is the version byte — identical
                          down the whole roster — so an initial drew one repeated
                          letter and the only job it has went unfilled. These two
                          vary, and they are the last two of the address printed
                          beside them. */}
                      <span className="chain-avatar" aria-hidden="true">{member.address.slice(-2)}</span>
                      <div>
                        <a
                          className="chain-address"
                          href={explorerAccountUrl(member.address)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddress(member.address)}
                        </a>
                        <small className="chain-member-stake">{memberStake(member.amountStroops)}</small>
                        <small className="chain-member-math">{memberStakeMath(room)}</small>
                      </div>
                      {won ? (
                        <span className="chain-won">
                          <Trophy size={13} weight="fill" aria-hidden="true" />
                          {memberWon(won.round)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            {rounds.length ? (
              <div className="chain-block">
                <p className="chain-block-lead">{ROUNDS_LEAD}</p>
                <ol className="chain-rounds">
                  {rounds.map((row) => {
                    const verify = verifyRound({
                      members: room.members,
                      winners: rounds,
                      round: row.round,
                      seed: row.seed,
                    });
                    return (
                      <li key={row.round}>
                        <p className="chain-round-head">{roundRow(row.round, row.address)}</p>
                        {row.seed == null ? null : <p className="chain-seed">{seedLine(row.seed)}</p>}
                        <p className={`chain-verify chain-verify-${verify.status}`}>{verifySentence(verify, row.seed)}</p>
                      </li>
                    );
                  })}
                </ol>
                {/* Wherever a seed is shown, and not only where one looks wrong:
                    a disclosure that appears on mismatch alone is an admission. */}
                {rounds.some((row) => row.seed != null) ? <SeedDisclosure /> : null}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </article>
  );
}

/**
 * A line's own label, or no match.
 *
 * Two groups and no third: `[1]` is the label with its colon, `[2]` is the rest
 * starting at the space. Together they are the line, character for character —
 * this file adds no separator and drops no whitespace, which is what lets the
 * test assert `p.textContent === DISCLOSURE[i]` and keeps the one property this
 * card has: not a single user-facing string is written here.
 *
 * Not a split on the first colon. DISCLOSURE's last line carries "(lib.rs:23-38)"
 * deep inside it, and a plain first-colon split labels that line "Catatan ini ada
 * di dokumentasi kontraknya sendiri (lib.rs:" — the citation inside the sentence
 * wearing the sentence's label. Hence three conditions, each of which rules that
 * out on its own: a label is short (<=24), has no sentence in it (no `.`), and is
 * followed by a space — and `lib.rs:23-38` is none of the three.
 *
 * That last paragraph is measured, not reasoned: the naive pattern was run
 * against these four strings, and it does label line 4. chainboard-citations.test.js
 * goes red on it, and is the only test there that does.
 *
 * ponytail: a heuristic on the four sentences it is tested against, not a parser.
 * A fifth line that opens with a >24-char label just renders unlabelled, which is
 * today's behaviour and not a lie. If these ever need real structure, the shape
 * belongs in chain-sentences.js as {label, text} — not in a smarter regex here.
 */
const LABEL = /^([^.:]{1,24}:)(\s[\s\S]*)$/;

/**
 * The split IS the disclosure.
 *
 * Four paragraphs at one size is a wall of small print, and the whole reason this
 * block exists is that "Belum terbukti: seed-nya sendiri" must not be skimmed —
 * it is the limitation the contract documents about itself, and a disclosure
 * nobody reads is decoration with a clean conscience. So where a sentence carries
 * its own label, it is rendered as one. The labels are read off the sentences
 * rather than listed here, because the sentences are chain-sentences.js's and a
 * copy of their leads in this file is one more thing to drift.
 */
export function SeedDisclosure() {
  return (
    <div className="chain-disclosure">
      <h3>{DISCLOSURE_HEADING}</h3>
      {DISCLOSURE.map((line) => {
        const label = LABEL.exec(line);
        return (
          <p key={line}>
            {label ? <strong>{label[1]}</strong> : null}
            {label ? label[2] : line}
          </p>
        );
      })}
    </div>
  );
}
