// Every sentence this view can say, in one file, with the line of lib.rs that
// makes it true beside it.
//
// Why a file of strings: the pages this replaces were written against the
// gateway's data shape, where `round` was clamped, `paid` was always true, the
// money was Rupiah and a schedule was agreed. Feeding raw chain data through
// those ~200 sentences turned each one into a claim the contract does not back,
// and four rounds of patching found fourteen of them and kept finding more. The
// fix is not a better guard. A guard checks that a field is PRESENT; every one
// of the worst lies printed a field that was present, under a word that was not
// its meaning ("terkunci" over a pot the contract had already paid out). Only
// reading the sentence against the contract catches that, so the sentences are
// gathered where they can be read.
//
// The rule for adding one: open lib.rs, find the line, put it in the comment. A
// claim with no line under it does not go in. A vague truth beats a fluent lie.
//
// No React and no network here on purpose: this file is the audit, and it has to
// be testable without a browser or a chain.

import { formatMoney } from "../demo-state.jsx";

const plainNumber = new Intl.NumberFormat("id-ID");

/**
 * The chain's unit, and the only one this file knows.
 *
 * `formatMoney` in demo-state.jsx formats Rupiah when handed `rupiah` and XLM
 * when handed `stroops`. Nothing here has a Rupiah field to hand it: nobody ever
 * priced these shares, and `toRoom` in stellar-rpc.js deliberately emits no field
 * the Rupiah formatter would recognise. Every amount below goes
 * through this one wrapper, so "Rp3.000.000" over 3.000.000 stroops (0,3 XLM)
 * is unwritable rather than merely unwritten.
 */
const xlm = (stroops) => formatMoney({ stroops });

/** How a chain address is named on screen; `shortAddress` in stellar-rpc.js, not exported there. */
export const shortAddress = (address) => (address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "");

/**
 * Unix seconds, as the contract keeps them — as a date, or as the raw seconds
 * when no calendar can hold them.
 *
 * THIS COMMENT USED TO VOUCH FOR A GUARD THAT WAS NOT HERE. It cited a line
 * range in the producer's `formatSchedule` — the one function in this repo
 * written specifically to refuse this date. It has a NaN branch and this had
 * none, so the citation lent that branch's authority to code that did the
 * opposite. The cited lines were not even the function: they landed in the middle
 * of its doc comment, on the very paragraph explaining why the guard exists.
 *
 * SO THESE CITE NAMES, NOT LINES, and that is the actual repair. This was never
 * one bad comment. Every cross-file line citation in this file was re-opened and
 * checked, and the ones into files this repo is still editing were wrong more
 * often than right — every one of them pointing EARLY, `readKocokAt` by 45 lines,
 * `readFinishedAfter` by 60, `toRoom` by 66, `readWinners` by 102, `readRooms`'
 * unread by 119 (measured against the file, not estimated). Two had gone past rot
 * into fiction: one cited AppPages.jsx for a string another lane had since
 * deleted, the other credited it with wording a grep says it has never held. They
 * were written against an older copy and never reopened, which is what a line
 * number into a file somebody is still editing always becomes.
 *
 * A name does not drift, and — the part a line number could never do — a machine
 * can check it. So a citation here is a backticked symbol, the word "in", and a
 * filename, and chain-sentences.test.js greps every one of them on every run.
 * lib.rs keeps its numbers: it is deployed, it is frozen, and every lib.rs
 * citation this round relied on was re-opened and holds.
 *
 * WHY THE GUARD IS NOT DECORATION. create_room bounds first_kocok from BELOW
 * alone (`first_kocok < now + JOIN_WINDOW`, lib.rs:198) and only orders
 * join_deadline against it (:199); both are u64 and neither has a ceiling. Its
 * only auth is host.require_auth() on the caller itself (:192), so ANY third
 * party can create a room whose schedule sits past the ±8,64e12 seconds a Date
 * can hold, and put it on the board whose whole claim is that you can check it.
 * start_room copies first_kocok straight into KocokAt(id, 1) (:404-406), so it
 * reaches this file as `nextKocok` too, not just as `joinDeadline`.
 *
 * toLocaleString does not throw on that — probed on node 24, an out-of-range
 * Date returns the literal string "Invalid Date" — which is worse than throwing,
 * because it renders: "Batas gabung Invalid Date." and "Putaran 1 dijadwalkan
 * Invalid Date."
 *
 * WHY NOT null, THE PRODUCER'S ANSWER. stellar-rpc.js's own formatSchedule
 * returns null and lets its caller pick the words. Its callers can; ours cannot.
 * This feeds five template literals, where `${null}` renders "Batas gabung
 * null." — the same bug in a quieter font. So the fallback is a value, and the
 * only value that is not invented here is the number the contract itself stores,
 * which is also what you would hand kocok_at to read it back. Parenthetical,
 * because all five slots are mid-sentence and a date is all any of them has room
 * for.
 *
 * WHY THE FIGURE IS CONDITIONAL, which is not caution. Past 2^53 the seconds are
 * no longer ours to quote: toRoom already did `Number(chain.join_deadline)`
 * before this file ever sees it, and a u64::MAX deadline arrives here as
 * 18446744073709552000 when the contract holds 18446744073709551615 (probed).
 * Printing those digits under "detik unix" is a fabricated figure — 385 out — on
 * the one page that exists to be recomputed. Between the Date ceiling (8,64e12)
 * and MAX_SAFE_INTEGER (9,007e15) the double is exact and the figure is the
 * contract's own, so it is quoted; above it, only the fact is. A vague truth
 * beats a fluent lie.
 */
export function formatSchedule(unixSeconds) {
  const at = new Date(Number(unixSeconds) * 1000);
  if (!Number.isNaN(at.getTime())) {
    return at.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return Number.isSafeInteger(Number(unixSeconds))
    ? `detik unix ${String(unixSeconds)} (di luar jangkauan kalender)`
    : "detik unix yang tidak bisa ditampilkan utuh (di luar jangkauan kalender)";
}

// Room metadata is public by design — lib.rs:40-45 says so in as many words:
// room_count, get_room and get_members are public reads, so anyone can walk the
// rooms and see name, host, share, schedule and roster. Linking out is handing a
// reader the same reads we made. Both URLs probed live: HTTP 200.
export const explorerContractUrl = (contractId) => `https://stellar.expert/explorer/testnet/contract/${contractId}`;
export const explorerAccountUrl = (address) => `https://stellar.expert/explorer/testnet/account/${address}`;

// ─────────────────────────────────────────────────────────────── the board ──

/**
 * What the board may say about the contract as a whole.
 *
 * ORDER IS LOAD-BEARING:
 *
 * - "all-unread" before everything: room_count answered and no room did, so the
 *   only honest figure is no figure. This is lie 5's exact state — "0 XLM
 *   terkunci di Stellar Testnet", beside a live ledger height, over a contract
 *   holding 5,7 XLM. A sum of nothing is not "nothing is held".
 * - "total-unknown" before "complete", or the sum is confident and short.
 *   `lockedStroops` in stellar-rpc.js returns null for a room whose status this
 *   build has no arithmetic for, and a null does NOT poison the addition the way
 *   an undefined would — JS reads `total + null` as `total`, so the room is
 *   silently counted as holding nothing and "Kontrak memegang X untuk N room"
 *   comes out as a total that is missing one room's worth of unknown.
 * - "total-unknown" before "partial" as well, and that one is a choice rather
 *   than a repair: "Minimal X" over the same sum stays a true lower bound,
 *   because holdings cannot be negative. It is still the wrong sentence — an
 *   "I don't know" belongs in no arithmetic, even an arithmetic that survives it.
 */
export function boardState({ mode, rooms, unread, count }) {
  if (mode === "reading") return "reading";
  if (count > 0 && rooms.length === 0) return "all-unread";
  // `== null`, not `=== null`: `toRoom` in stellar-rpc.js always emits the field,
  // so only the unknown-status branch can reach this — but an absent field sums
  // to NaN rather than to a quiet zero, and "NaN XLM" under a real contract id is
  // the same species of claim. One character stops both.
  if (rooms.some((room) => room.lockedStroops == null)) return "total-unknown";
  if (unread > 0) return "partial";
  return "complete";
}

/**
 * What the contract holds, summed over the rooms that answered.
 *
 * `lockedStroops` in stellar-rpc.js is derived arithmetic and not a balance read,
 * and that is exactly what makes it checkable. Both sides probed live at ledger
 * 3.640.676: this sum over the seven rooms is 57.000.000 stroops, and
 * `balance(CDTNEK4E…CIDX)` on testnet's native SAC (CDLZFC3S…CYSC) answers
 * 57.000.000 stroops. Equal, so the caption may hand a reader the check — but it
 * says "dihitung dari status tiap room" and not "sama dengan saldo kontrak",
 * because this page makes the reads in stellar-rpc.js and that balance is not
 * one of them.
 *
 * No `HOLDS_FUNDS` in ui.jsx filter — Done and Dissolved return 0 by the same
 * arithmetic, so filtering them out would only hide the check above.
 */
export const heldStroops = (rooms) => rooms.reduce((total, room) => total + room.lockedStroops, 0);

/**
 * Nothing is known yet, so nothing is claimed. No rooms, no total, no zero, no
 * ledger. The read is a fan-out of simulations that takes seconds, and for the
 * whole of them the old home screen rendered a fake 100.000.000 Rupiah room. A
 * caption on that screen is what the last four rounds would have added; a
 * different screen is what stops the fake once the read starts.
 *
 * Once, not never, and the difference is measurable: `isChainOnly` in
 * demo-state.jsx matches "reading" and "readonly", so the ~120ms of "checking"
 * before the mode resolves still paints the demo shell. Its on-chain figure
 * reads "Belum diketahui" and its rooms say "simulasi lokal", so no money claim
 * is made in that window -- but it is a window, and saying "unrenderable" here
 * would be this file printing a sentence it would not let anyone else print.
 *
 * NO FIGURE HERE, ON PURPOSE, and that is the fix rather than a better figure.
 * This comment said "30 simulateTransaction calls and takes ~2,3s" and cited the
 * `MAX_IN_FLIGHT` doc in stellar-rpc.js — which says 39, in as many words, and
 * says it went 30 -> 39 when a lane added the seed read. So the citation disproved
 * the sentence it was propping up, in the file whose whole claim is that every
 * sentence has a source you can open. Both halves are re-measured and both were
 * false: 39 simulateTransaction + 1 getLatestLedger, four runs at ledger 3.642.168
 * -3.642.174, 3,2-3,8s.
 *
 * THE REPLACEMENT FIGURE ROTTED TOO, a few hundred ledgers later, which is the
 * argument finishing itself. The count held — re-counted from node against the live
 * chain at ledger 3.642.939-3.642.941, three runs, 39 simulateTransaction + 1
 * getLatestLedger every time. The duration did not: the same three runs took
 * 4,7-6,4s, outside the band two paragraphs up, and 6,4s is outside the browser
 * band below as well. The two figures are not the same kind of thing, and that is
 * the whole lesson: one is a property of this code and survived, the other is a
 * property of somebody else's server and did not.
 *
 * Neither number is copied back. The count belongs to `MAX_IN_FLIGHT` in
 * stellar-rpc.js, which owns the fan-out, recounts it when a read is added, and is
 * where a reader checking this would have to go anyway — a second copy here is a
 * second thing to rot, and it rotted. The duration is worse: it is not a property
 * of this code at all but of a public RPC nobody here pays for. Three measurements
 * of one unchanged read, all attributed above: 3,2-3,8s from node, 4,7-6,4s from
 * node at a later ledger, and 813ms-4826ms from a browser (`the reading band says
 * what it already knows` in chainboard-citations.test.js). No band contains the
 * next one, so there is no figure to quote — not a slower figure, none. "Seconds"
 * is the whole of what can be attributed, so "seconds" is what it says.
 */
export const READING = "Membaca kontrak…";

/**
 * A read is a simulated transaction: no signature, no submission, no fee, no
 * account — `readContract` in stellar-rpc.js builds it and simulates it and never
 * submits. `SIM_SOURCE` in stellar-rpc.js is an all-zero key that does not have to
 * exist. This is the thesis of the whole surface.
 */
export const BOARD_LEAD = "Dibaca langsung dari smart contract di Stellar Testnet. Tanpa perantara, tanpa wallet, tanpa kunci.";

/** `CONTRACT_ID` in stellar-rpc.js. Public: lib.rs:40-45 says treat room metadata as public. */
export const CONTRACT_LABEL = "Contract";
export const EXPLORER_LINK = "Periksa di Stellar Expert";

/**
 * "Dibaca pada", never "sekarang": this is the height the read happened at and the
 * ledger has moved on since. `getLatestLedger` in stellar-rpc.js reads it and
 * `readStatus` in stellar-rpc.js emits it as `latestLedger`.
 *
 * The comment here used to credit AppPages.jsx with this wording ("which already
 * got this right"). It never had it: grep AppPages.jsx for "Dibaca pada", or for
 * "ledger" at all, and both are zero. A citation that flatters another file for a
 * sentence it does not contain is the same bug as one pointing at the wrong line,
 * minus the excuse that something moved.
 */
export const ledgerRead = (latestLedger) => `Dibaca pada ledger #${plainNumber.format(latestLedger)}`;

/**
 * "memegang", not "terkunci": that IS the thesis — the contract holds the pool,
 * not a bandar. Rooms counted, not filtered (see heldStroops).
 */
export const totalHeld = (stroops, roomCount) => `Kontrak memegang ${xlm(stroops)} untuk ${roomCount} room.`;

/**
 * We computed this from each room's status; we did not read the contract's
 * balance. "Sama dengan saldo kontrak" would be a claim about a read we never
 * made. This says what we did and hands the reader the check.
 */
export const TOTAL_CAPTION = "Dihitung dari status tiap room. Periksa saldo aslinya sendiri di Stellar Expert.";

/**
 * "Minimal" is load-bearing and may never be dropped. `readRooms` in
 * stellar-rpc.js returns `unread = count - read.length`, holdings are
 * non-negative, so a sum over the rooms that answered is a true LOWER BOUND on
 * the contract. Captioning a partial sum as the total is lie 5's exact shape.
 */
export const totalAtLeast = (stroops) => `Minimal ${xlm(stroops)} dipegang kontrak.`;

/**
 * How many, never why. An archived entry, an RPC 429 and a contract this build
 * has drifted from all arrive at the per-room catch in `readRooms` in
 * stellar-rpc.js as the same rejected promise. Naming a cause here would be
 * inventing the evidence.
 */
export const unreadNote = (unread, count) =>
  `${unread} dari ${count} room tidak terbaca, jadi angka di atas belum tentu seluruh isi kontrak.`;

/**
 * room_count answered and no room did. No figure.
 *
 * `readRoomCount` in stellar-rpc.js is the one read `readRooms` does not wrap in a
 * catch: without it there is no list to be partial about, so that one throws and
 * this sentence never renders over a count nobody read.
 */
export const allUnread = (count) => `Kontrak melaporkan ${count} room. Tidak satu pun bisa dibaca saat ini.`;

/**
 * Replaces the figure entirely: an "I don't know" belongs in no arithmetic. The
 * default branch of `lockedStroops` in stellar-rpc.js returns null for a status
 * variant this build cannot account for.
 */
export const TOTAL_UNKNOWN = "Total tidak bisa dihitung: ada room dengan status yang aplikasi ini tidak kenali.";

// ──────────────────────────────────────────────────────────────── one room ──

/**
 * Which of the contract's states this room is in, as one tag.
 *
 * ORDER IS LOAD-BEARING: a full roster is tested BEFORE any deadline term.
 * start_room checks Open (lib.rs:387) and a full roster (:395) and never reads
 * join_deadline at all, so a FULL Open room past its deadline is perfectly
 * startable. Written the natural way — "deadline passed, therefore dead" — this
 * function declares a live room dead. There is no live example of that state
 * today (room 7 was full and past its deadline when this round was specced, and
 * has since been started), which makes the trap more dangerous, not less: only
 * a test can catch it now.
 *
 * Seconds, and strictly greater on the deadline: join_room rejects only
 * `now > join_deadline` (:279-281), so joining is legal AT the deadline.
 */
export function roomState(room, nowSeconds) {
  switch (room.status) {
    case "funding":
      if (room.paidCount >= room.memberLimit) return "open-full";
      return nowSeconds > room.joinDeadline ? "open-dead" : "open-live";
    case "sealed":
      // Null is two answers `readKocokAt` in stellar-rpc.js cannot tell apart —
      // the key was never written, or the read did not come back.
      if (room.nextKocok == null) return "active-unknown-schedule";
      // kocok returns NotYet while `now < deadline` (lib.rs:541-548), so at the
      // deadline it is callable.
      return nowSeconds >= room.nextKocok ? "active-due" : "active-scheduled";
    case "paid":
      return "done";
    case "dissolved":
      // round === 0 is an EXACT discriminator for cancel_room: create_room:243
      // sets round 0, start_room:400 is the only writer of round = 1, and
      // cancel_room:425 only runs from Open. emergency_dissolve:678 only runs
      // from Active, which start_room:398-400 always leaves at round >= 1.
      return room.round === 0 ? "dissolved-cancelled" : "dissolved-emergency";
    default:
      // `STATUS_MAP` in stellar-rpc.js covers exactly the four RoomStatus variants
      // (lib.rs:91-96) and `toRoom` in stellar-rpc.js falls back to the raw
      // lowercased name for anything else.
      return "unknown";
  }
}

/**
 * The whole card's copy, keyed by that tag. One switch, so the states are read
 * side by side rather than found one grep at a time.
 *
 * `members: false` is not a rendering preference. The unknown branch says
 * nothing can be said about this room's money, and a member row saying "Disetor
 * saat gabung: 0,3 XLM" underneath it is saying something about this room's
 * money. The two cannot both be on the screen.
 */
export function roomSentences(room, nowSeconds) {
  const state = roomState(room, nowSeconds);

  // member_count is kept in sync with the roster at join_room:315 and
  // leave_room:364, and start_room:399 pins it to member_target. "kursi terisi"
  // is about the roster, which is what this number is. Not "sudah setor" — that
  // invites "the rest still owe", which prefunding makes impossible.
  const seats = `Kursi terisi ${room.paidCount} dari ${room.memberLimit}.`;

  // kocok pays share * member_count (lib.rs:576-579) and start_room:399 pins
  // member_count = member_target, so the pot is share * member_target
  // (`poolStroops` in stellar-rpc.js). Equal to one member's prefund by
  // arithmetic, NOT by meaning: the pot is what one winner takes, the prefund is
  // what one member put in.
  const pot = `Pemenang tiap putaran menerima ${xlm(room.poolStroops)}.`;

  const base = { state, seats, headline: null, body: "", holdings: null, pot: null, finishedAfter: null, members: true };

  switch (state) {
    case "open-full":
      return {
        ...base,
        headline: "Terbuka · kursi penuh",
        // start_room:387 (Open) and :395 (members.len() == member_target) are its
        // only gates. The deadline is not one of them.
        body: "Kursi sudah penuh. Host bisa mengunci room ini kapan saja — kontrak tidak menutup start hanya karena batas gabung lewat.",
        // Conditional mood, mandatory: member_count is only pinned to
        // member_target at start (lib.rs:399), so before Active there is no pot.
        // Stating one flatly is a claim about a future the chain has not agreed to.
        pot: `Jika room ini penuh dan dimulai, pemenang tiap putaran menerima ${xlm(room.poolStroops)}.`,
      };

    case "open-live":
      return {
        ...base,
        // join_room transfers share * member_target BEFORE push_back
        // (lib.rs:301-306), so a member who is in is a member who paid in full.
        body: `Batas gabung ${formatSchedule(room.joinDeadline)}. Setiap anggota yang gabung sudah menyetor ${xlm(prefundStroops(room))} di muka.`,
        pot: `Jika room ini penuh dan dimulai, pemenang tiap putaran menerima ${xlm(room.poolStroops)}.`,
      };

    case "open-dead":
      return {
        ...base,
        // "tidak akan pernah", not "belum": join_room:279-281 refuses every
        // remaining seat, leave_room:327 only ever shrinks the roster, so
        // members.len() can never reach member_target, so start_room:395 can
        // never pass, so Active is unreachable, so kocok:530 can never run. The
        // room is not waiting for anything.
        body: `Batas gabung lewat ${formatSchedule(room.joinDeadline)} dengan ${room.paidCount} dari ${room.memberLimit} kursi terisi. Kontrak menolak anggota baru, dan hanya mengunci room yang penuh — room ini tidak akan pernah dikocok.`,
        // Real money in a room that can never draw: room 3 holds 3.000.000
        // stroops today. cancel_room:429 — `caller != host && now <= join_deadline`
        // is the only refusal, so past the deadline ANY caller passes, and :437-439
        // refunds every member. Deliberately permissionless: the anti-deadlock path.
        holdings: `Kontrak masih memegang ${xlm(room.lockedStroops)} untuk room ini. Setelah batas gabung lewat, siapa pun boleh membubarkannya lewat kontrak, dan setiap anggota menerima setorannya kembali.`,
      };

    case "active-due":
    case "active-scheduled":
    case "active-unknown-schedule":
      return {
        ...base,
        // The ONLY status where `round` may be printed as an ordinal:
        // start_room:398-400 sets Active with round = 1 and kocok:597-598 flips
        // to Done BEFORE :605 advances, so an Active room always has
        // round <= member_count. Everywhere else `round` is a counter and the
        // ordinal was lie 6 ("Putaran 4 dari 3").
        headline: `Berjalan · putaran ${room.round} dari ${room.memberLimit}`,
        body: activeBody(room, state),
        pot,
      };

    case "done":
      return {
        ...base,
        // Counted from member_target, never printed from `round`: kocok writes
        // Winner then advances (lib.rs:591, :605), so a Done 3-member room stores
        // 4. Every member won exactly once — kocok draws only from members with
        // no Won entry (:557-568) and closes at round >= member_count (:597).
        headline: `Siklus selesai · ${room.memberLimit} putaran, ${room.memberLimit} pemenang`,
        // Replaces the holdings figure rather than printing "0 XLM": lie 8 was a
        // number where a sentence belongs, on the same screen as three rows each
        // claiming 0,3 XLM terkunci. `lockedStroops` in stellar-rpc.js returns 0
        // for Done.
        body: "Setiap anggota sudah menerima pot tepat satu kali. Kontrak tidak lagi memegang dana room ini.",
        pot,
        // "sebelum" is mandatory, "selesai pada" is banned. `readFinishedAfter` in
        // stellar-rpc.js reads KocokAt(id, round - 1): the deadline the last round
        // REFUSED to run before (kocok:541-548). A chain-proven LOWER
        // BOUND, off by however long the members took to call it. The chain
        // records WHO won, never WHEN.
        finishedAfter:
          room.finishedAfter == null
            ? null
            : `Putaran terakhir tidak bisa dikocok sebelum ${formatSchedule(room.finishedAfter)}.`,
      };

    case "dissolved-cancelled":
      return {
        ...base,
        headline: "Dibubarkan · sebelum room dimulai",
        // cancel_room:417, Open-only at :425, refunds EVERY member at :437-439 via
        // refund_member (:860-878), writes Dissolved at :440. The zero is
        // `lockedStroops` in stellar-rpc.js doing arithmetic, not a blanket claim.
        body: "Room dibubarkan sebelum satu putaran pun dijalankan. Setiap anggota menerima seluruh setorannya kembali, dan kontrak tidak lagi memegang dana room ini.",
      };

    case "dissolved-emergency":
      return {
        ...base,
        // Never "{round} dari {memberLimit}" — that claims a round that was
        // interrupted, not paid. The rounds won are 1..round-1.
        headline: `Dibubarkan · ${Math.max(0, room.round - 1)} dari ${room.memberLimit} putaran sempat dikocok`,
        body: emergencyBody(room),
      };

    default:
      return {
        ...base,
        // An unmapped variant means the contract moved and this build did not. A
        // number invented here is a room lying about its balance, and every
        // number on this card comes from arithmetic keyed to the status.
        body: `Status kontrak: ${room.status}. Versi aplikasi ini tidak mengenalinya, jadi tidak ada yang bisa dikatakan tentang dana room ini.`,
        members: false,
      };
  }
}

/**
 * What one member locked at join: share * member_target, the FULL cycle
 * (join_room lib.rs:301-304). Equal to poolStroops by arithmetic — computed from
 * its own meaning anyway, because reaching for the pot to state a prefund is the
 * meaning-swap this whole round is about.
 */
const prefundStroops = (room) => room.memberLimit * room.onChainShareStroops;

function activeBody(room, state) {
  if (state === "active-unknown-schedule") {
    // Never a date, never a countdown: `readKocokAt` in stellar-rpc.js returns
    // null for two causes it cannot tell apart, and naming either invents the
    // evidence.
    return `Jadwal putaran ${room.round} tidak terbaca saat ini.`;
  }
  if (state === "active-due") {
    // A state today's UI cannot say: it renders "Menunggu jadwal kocok" over a
    // round the contract will accept right now. kocok is callable by ANY member
    // (lib.rs:522, :533-540 checks membership only), gated solely on
    // `now < deadline` (:541-548). lib.rs:510-511: "Any room member can call
    // (anti-deadlock)". Live on rooms 1, 2 and 4 right now.
    return `Putaran ${room.round} sudah bisa dikocok sejak ${formatSchedule(room.nextKocok)}. Setelah jadwal lewat kontrak membuka kocok untuk anggota mana pun, jadi tidak ada satu orang pun yang bisa menahan giliran.`;
  }
  return `Putaran ${room.round} dijadwalkan ${formatSchedule(room.nextKocok)}. Kontrak menolak kocok sebelum waktu itu.`;
}

function emergencyBody(room) {
  if (room.round === 1) {
    // At round 1 no Won entry exists anywhere — kocok writes Won at :588 and only
    // then advances at :605 — so emergency_dissolve's "every member with no Won
    // entry" (:708-717) is every member, exactly.
    return "Room dibubarkan saat putaran 1 belum dikocok. Belum ada pemenang, jadi setiap anggota menerima setorannya kembali.";
  }
  // The winners are listed by name further down this card, so the sentence must
  // not promise them a refund: emergency_dissolve pays refund_each only to
  // members with no Won entry (lib.rs:704-717). The arithmetic lands on zero —
  // at round R the contract holds (target - R + 1) prefunds and exactly
  // target - R + 1 members are unwon (`lockedStroops` in stellar-rpc.js).
  return `${room.round - 1} putaran sudah dikocok sebelum room dibubarkan. Anggota yang belum menang menerima setorannya kembali; pemenang putaran sebelumnya sudah menerima potnya dan tidak ikut dikembalikan. Kontrak tidak lagi memegang dana room ini.`;
}

/** The chain room id, which is what you would pass to get_room yourself. */
export const roomLabel = (chainRoomId) => `Room ${chainRoomId}`;

// ───────────────────────────────────────────────────────────────── members ──

/**
 * The prefund thesis, stated once at the head of the list instead of implied per
 * row. join_room transfers share * member_target and only THEN pushes the address
 * into Members (lib.rs:305-306); create_room charges the host at :226-229 before
 * seating them at :251-252. Membership IS proof of prefund, which is why this
 * list has no "Belum setor" row and why the `funding` entry of `STATUS_LABELS` in
 * ui.jsx ("Menunggu setoran") may not be reused here — an Open chain room refuses
 * deposits, so nobody owes anything, ever. That reuse is how lie 2 happened.
 */
export const MEMBERS_LEAD =
  "Kontrak memindahkan dana sebelum mendudukkan anggota. Ada di daftar ini artinya sudah membayar seluruh komitmennya — tidak ada baris \"belum setor\" di sini.";

/**
 * THE LIE-8 FIX, and it is a word rather than a read.
 *
 * `toRoom` in stellar-rpc.js emits amountStroops = share * member_target =
 * exactly what join_room:301-306 transferred. The NUMBER was always true;
 * "terkunci untuk N putaran" was the lie — the contract had already paid it out,
 * and that row sat three times on room 6's screen beside "Pool terkunci 0 XLM".
 * "Disetor saat gabung" is true forever and contradicts nothing, on every status.
 *
 * That sentence is gone from the app, so this cites its grave and not a line: the
 * reader that produced it is banned by name from AppPages.jsx, as
 * `member.amountStroops` in appages-deletion.test.jsx, with the reason attached.
 * The comment here used to cite the line the string lived on, which had long since
 * become somebody else's code.
 *
 * Not locked_of, whatever its name suggests. Probed live at ledger 3.640.071:
 * locked_of(5, GCAN..UVYR) = 3.000.000 with has_won = true, on a Done room the
 * contract holds nothing for. DataKey::Locked is written at create_room:258 and
 * join_room:312 and removed only by refund_member:877 (reached from leave_room:359
 * and cancel_room:438 alone) — kocok:585 and emergency_dissolve:715 pay out
 * without touching it. The getter means "deposited at join, minus leave/cancel
 * refunds"; printing it under "terkunci" would ship lie 8 again with a live chain
 * read attached as proof.
 */
export const memberStake = (amountStroops) => `Disetor saat gabung: ${xlm(amountStroops)}`;

/**
 * The multiplier that reconciles this row with the per-round share — the two
 * numbers that used to sit on one screen with nothing between them.
 * share is stroops (lib.rs:113, an i128); the prefund is share * member_target.
 */
export const memberStakeMath = (room) =>
  `= ${room.memberLimit} × ${xlm(room.onChainShareStroops)}, seluruh siklus dibayar di muka`;

/**
 * Matched on the full address, never the 4+4 short name — which is what
 * `item.winner === member.name` in AppPages.jsx matches on, and why it is not the
 * model to copy: two members of one room whose addresses share a first four and a
 * last four collide, and shortAddress is what the room list already prints.
 */
export const memberWon = (round) => `Menang putaran ${round}`;

// ────────────────────────────────────────────────────────────────── rounds ──

/**
 * No timestamp, ever. kocok writes Won and Winner and no time (lib.rs:586-591)
 * and seal_of:782 returns the PRNG seed, not a clock. Any date on one of these
 * rows would be invented here — `item.timestamp || "tercatat"` in AppPages.jsx
 * falls back to the literal word for exactly this reason.
 */
export const ROUNDS_LEAD = "Tidak ada waktu di baris ini: kontrak mencatat siapa yang menang, tidak pernah kapan.";

/** A Winner key exists only where a kocok actually paid (`readWinners` in stellar-rpc.js). */
export const roundRow = (round, address) => `Putaran ${round} — ${shortAddress(address)}`;

/**
 * RAW DIGITS, never through plainNumber/Intl: the seed is a u64 and Intl would
 * render 8815254550993936402 as "8.815.254.550.993.936.402", a 19-digit integer
 * dressed as a decimal.
 */
export const seedLine = (seed) => `Seed: ${String(seed)}`;

/**
 * Recompute the round's winner from the sealed seed, the way kocok does.
 *
 * kocok loads the sealed seed (lib.rs:552-556), builds its pool by iterating
 * Members and skipping Won (:557-568), and takes `pool.get(seed % pool.len())`
 * (:574-575). The browser can reconstruct that pool exactly: Members order is
 * frozen once Active (push_back at join_room:306, order-preserving rebuild at
 * leave_room:348-355, both Open-only — nothing writes Members from Active), and
 * Won is written only by kocok (:588), in round order. So unwon-at-round-N is
 * Members minus the winners of rounds 1..N-1, in Members order.
 *
 * Verified against the live chain for all 9 finished rounds: 9/9 match.
 *
 * BIGINT, MANDATORY. scValToNative hands seal_of back as a BigInt and Number() is
 * lossy: probed live, BigInt(Number(seed)) === seed is FALSE for every one of
 * today's 9 seeds. The modulo happens to survive it on today's board, which means
 * a Number here ships a bug that every test passes. `BigInt(seed)` is exact for a
 * BigInt and for a decimal string, and `readWinners` in stellar-rpc.js may hand
 * over either — a BigInt cannot survive the
 * `localStorage.setItem(STORAGE_KEY, JSON.stringify(state))` in demo-state.jsx
 * that every room goes through.
 *
 * THE CONTIGUITY GUARD IS NOT OPTIONAL. `readWinners` in stellar-rpc.js drops an
 * unreadable row silently — its per-round catch returns null and the
 * `rows.filter(Boolean)` in stellar-rpc.js takes the hole out without a trace — and
 * a hole in rounds 1..N-1 corrupts the
 * unwon set, lands the modulo on the wrong address, and prints a MISMATCH that is
 * our bug wearing the chain's name — on the one panel whose entire purpose is
 * being trustworthy. Verify only what can be reconstructed; never suppress a real
 * mismatch, never manufacture a fake one.
 */
export function verifyRound({ members, winners, round, seed }) {
  const skipped = { status: "skipped", index: null, unwonLength: null, predicted: null };
  if (seed == null) return { status: "no-seed", index: null, unwonLength: null, predicted: null };

  const before = [];
  for (let earlier = 1; earlier < round; earlier += 1) {
    const row = winners.find((winner) => winner.round === earlier);
    if (!row) return skipped;
    before.push(row.address);
  }

  const won = new Set(before);
  const unwon = members.filter((member) => !won.has(member.address));
  // Unreachable while the roster and the winner rows agree — at round r of an
  // N-seat room, r <= N and r-1 members have won, so at least one is left. Kept
  // because `% 0n` throws, and a throw here takes the whole board down.
  if (unwon.length === 0) return skipped;

  const index = Number(BigInt(seed) % BigInt(unwon.length));
  const predicted = unwon[index].address;
  const recorded = winners.find((winner) => winner.round === round)?.address;
  return {
    status: predicted === recorded ? "match" : "mismatch",
    index,
    unwonLength: unwon.length,
    predicted,
  };
}

export function verifySentence(result, seed) {
  switch (result.status) {
    case "match":
      return `unwon[${String(seed)} % ${result.unwonLength}] = indeks ${result.index} → ${shortAddress(result.predicted)}. Cocok. Dihitung ulang di browser ini.`;
    case "mismatch":
      // Never softened, never retried, and never the word "curang": a mismatch
      // means our model of lib.rs:557-575 is wrong or the chain is inconsistent,
      // and both are facts the reader is owed. We can attribute arithmetic, not
      // intent.
      return "Perhitungan ulang tidak cocok dengan pemenang yang tercatat kontrak. Ditampilkan apa adanya.";
    case "no-seed":
      // Not "gagal". Nothing removes a Seal (written lib.rs:503, read :555, no
      // remove anywhere), so a round that ran has one — unless the entry archived
      // past its TTL (maintain_room_entries:851-856 extends Seal for rounds
      // 1..member_target only). Two causes we cannot tell apart, so neither is named.
      return "Seed tidak terbaca, verifikasi tidak dijalankan.";
    default:
      return "Verifikasi dilewati: pemenang putaran sebelumnya tidak terbaca, jadi daftar yang belum menang tidak bisa disusun ulang.";
  }
}

// ────────────────────────────────────────────────────────────── disclosure ──

/**
 * Rendered wherever a seed is shown, UNCONDITIONALLY — not only on a mismatch. A
 * disclosure that appears only when something looks wrong is an admission, not a
 * disclosure. lib.rs:38 obliges this UI in as many words: "Badged as a preview in
 * the UI." (The "Pratinjau · Build-Award" chip lib.rs:54-55 claims exists does
 * not — grep finds zero. This is the badge.)
 *
 * Both failure modes here are lies. "Terbukti adil" overclaims; silence hides a
 * limitation the repo documents at lib.rs:23-38. So the split is exactly what the
 * seed proves and what it does not.
 */
export const DISCLOSURE_HEADING = "Yang dibuktikan seed ini — dan yang belum";

export const DISCLOSURE = [
  // kocok:513-521 — the winner is derived deterministically from a seed sealed in
  // an EARLIER transaction, so the outcome is fixed before the tx and is identical
  // in simulation and execution. That, and only that, is what the recomputation
  // above proves. The claim is narrow on purpose: DERIVED, not chosen.
  "Terbukti: pemenang dihitung dari seed yang sudah tersegel, dengan rumus yang bisa Anda hitung ulang sendiri di atas. Bukan host, bukan kami, yang memilihnya.",
  // lib.rs:23-29, the contract's own words: the two phases defeat
  // simulate-and-preview grinding but do NOT make the draw unbiasable. Expected
  // cost is a few failed-transaction fees.
  "Belum terbukti: seed-nya sendiri. seal_kocok mengembalikan seed di transaksi yang sama saat menyimpannya, jadi anggota yang bersedia membayar beberapa transaksi gagal bisa membatalkan transaksi berulang kali sampai seed menguntungkan dia.",
  // lib.rs:30-33 — damage is bounded by prefunding, not by the PRNG: every member
  // is owed the same pot, so a grinder can only buy an EARLIER SLOT, never a
  // larger payout, never anyone else's principal. :33 also says slot order is
  // genuinely worth something, so this states the bound rather than using it to
  // wave the limitation away.
  "Batasnya prefund: setiap anggota tetap menerima pot yang sama besar, jadi yang bisa direbut hanya urutan giliran — tidak pernah pokok dana siapa pun.",
  // lib.rs:34-37 — commit-reveal bonded by the existing prefund is the intended
  // fix, an external VRF the alternative, and "Neither is implemented yet". Do not
  // imply either is in flight.
  "Catatan ini ada di dokumentasi kontraknya sendiri (lib.rs:23-38). Perbaikan yang direncanakan — commit-reveal yang dijamin prefund — belum diterapkan.",
];
