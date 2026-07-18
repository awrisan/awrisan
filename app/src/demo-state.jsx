import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createStellarRoom,
  drawStellarRoom,
  getStellarRooms,
  getStellarStatus,
  startStellarRoom,
} from "./stellar-client.js";
import { isRpcConfigured, readRooms, readStatus } from "./stellar-rpc.js";

/**
 * Can we actually send a transaction? Only the local gateway can sign, so only
 * `mode: "stellar"` may write. `connected` is a weaker claim: in `readonly` mode
 * the data on screen is genuinely from the chain, but nothing can be signed. A
 * room read over RPC is real and unactionable at the same time, and the UI has
 * to be able to say both.
 */
const canWrite = (network) => network?.mode === "stellar";

/**
 * A room that is real and unactionable at once. Asks the network, not the room,
 * and no room carries an answer to ask: the read path used to stamp each room
 * with a `readOnly` flag at fetch time, which is a snapshot of a mode that
 * outlives it. readState() replays rooms out of localStorage, so a room saved
 * beside a gateway comes back beside a network that cannot sign, still carrying
 * the flag it was born with — and the guard reading that flag waved it through
 * to a gateway that was no longer there. One rule wants one predicate, and
 * createRoom already picked this one. The flag has since been deleted rather
 * than left lying around for the next guard to reach for.
 *
 * A local room is never read-only: it is this app's own simulation, and nothing
 * about it is signed.
 */
export const isReadOnly = (room, network) => room.source === "stellar" && !canWrite(network);

/**
 * The chain is the only thing this app can truthfully show: no gateway answered,
 * so a direct RPC read is all there is. "reading" is that read in flight and
 * "readonly" is it landed — same surface, and only it can say which.
 *
 * Asks the network's mode and never a room's `source`, for the same reason
 * canWrite does: the gateway also produces `source: "stellar"` rooms
 * (server/testnet-gateway.mjs:199), so a room-level gate would take the gateway
 * path — this project's existing evidence — down with it. Named here rather than
 * spelled out at its one call site because a mode rule written twice is how the
 * stale flag above survived long enough to be reached for.
 */
export const isChainOnly = (network) => network?.mode === "reading" || network?.mode === "readonly";

export const READ_ONLY_MESSAGE =
  "Mode baca saja: data ini nyata dari smart contract, tetapi mengirim transaksi butuh wallet yang belum tersedia di web publik.";

const STORAGE_KEY = "awrisan-demo-v6";
const DEMO_CADENCE_SECONDS = 60;

const members = [
  "Dina Prameswari",
  "Rani Wulandari",
  "Sari Kusuma",
  "Lilis Handayani",
  "Maya Kartika",
  "Nia Ramadhani",
  "Putri Anindya",
  "Wati Lestari",
  "Yuni Rahma",
  "Tika Permata",
];

const defaultNetwork = {
  connected: false,
  mode: "checking",
  network: "testnet",
  message: "Memeriksa gateway Stellar...",
};

export const initialDemoState = {
  profile: {
    name: "Dina Prameswari",
    firstName: "Dina",
    email: "dina@awrisan.test",
    verified: true,
  },
  network: defaultNetwork,
  rooms: [
    {
      id: "rt-08",
      code: "RT08-2026",
      name: "Arisan RT 08",
      host: "Dina Prameswari",
      contribution: 10000000,
      memberLimit: 10,
      paidCount: 10,
      pool: 100000000,
      round: 4,
      drawAt: "2026-07-16T10:00:00+07:00",
      nextKocok: 1784170800,
      nextDate: "16 Juli 2026, 10.00",
      scheduleAgreed: true,
      cadenceSeconds: DEMO_CADENCE_SECONDS,
      status: "ready",
      source: "local",
      history: [
        { roomId: "rt-08", roomName: "Arisan RT 08", round: 1, winner: "Dina Prameswari", firstName: "Dina", amount: 100000000, participants: 10, transactionId: "local-rt08-round-1", timestamp: "27 Juni 2026, 19.08", source: "local" },
        { roomId: "rt-08", roomName: "Arisan RT 08", round: 2, winner: "Rani Wulandari", firstName: "Rani", amount: 100000000, participants: 10, transactionId: "local-rt08-round-2", timestamp: "4 Juli 2026, 19.06", source: "local" },
        { roomId: "rt-08", roomName: "Arisan RT 08", round: 3, winner: "Sari Kusuma", firstName: "Sari", amount: 100000000, participants: 10, transactionId: "local-rt08-round-3", timestamp: "11 Juli 2026, 19.11", source: "local" },
      ],
      winner: "Sari Kusuma",
      result: { roomId: "rt-08", roomName: "Arisan RT 08", round: 3, winner: "Sari Kusuma", firstName: "Sari", amount: 100000000, participants: 10, transactionId: "local-rt08-round-3", timestamp: "11 Juli 2026, 19.11", source: "local", isComplete: false, nextRound: 4, nextKocok: 1784170800, nextDate: "16 Juli 2026, 10.00" },
      members: members.map((name, index) => ({
        id: `member-${index + 1}`,
        name,
        amount: 10000000,
        paid: true,
      })),
    },
    {
      id: "keluarga",
      code: "KELUARGA-10",
      name: "Arisan Keluarga",
      host: "Sari Kusuma",
      contribution: 2500000,
      memberLimit: 10,
      paidCount: 7,
      pool: 17500000,
      round: 2,
      drawAt: "2026-07-25T19:00:00+07:00",
      nextKocok: 1784980800,
      nextDate: "25 Juli 2026, 19.00",
      scheduleAgreed: true,
      cadenceSeconds: DEMO_CADENCE_SECONDS,
      status: "funding",
      source: "local",
      history: [
        { roomId: "keluarga", roomName: "Arisan Keluarga", round: 1, winner: "Lilis Handayani", firstName: "Lilis", amount: 25000000, participants: 10, transactionId: "local-family-round-1", timestamp: "18 Juli 2026, 19.22", source: "local" },
      ],
      members: members.map((name, index) => ({
        id: `family-${index + 1}`,
        name,
        amount: index < 7 ? 2500000 : 0,
        paid: index < 7,
      })),
    },
  ],
  activities: [
    {
      id: "activity-1",
      title: "Setoran simulasi diterima",
      detail: "Arisan RT 08, Rp10.000.000",
      time: "Hari ini, 09.42",
      kind: "deposit",
    },
    {
      id: "activity-2",
      title: "Identitas sandbox terverifikasi",
      detail: "Akun Dina siap untuk demo",
      time: "Kemarin, 16.10",
      kind: "verified",
    },
  ],
  drawResult: null,
};

const DemoContext = createContext(null);

function readState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialDemoState;
    const parsed = JSON.parse(saved);
    return {
      ...initialDemoState,
      ...parsed,
      network: defaultNetwork,
      // A chain room is a cache of something authoritative and remote, and this
      // is the only place one can come back stale: the connect effect below runs
      // once, on mount, so within a session a chain room exists only where a read
      // just succeeded. Replaying one from storage is what rendered "1,8 XLM
      // terkunci di Stellar Testnet" under "Gateway dan RPC tidak dapat
      // dihubungi" — present-tense custody sourced from a read that failed, with
      // no ledger height beside it because there was no read.
      //
      // Dropped here, at the read, rather than at the failure path: the same
      // stale rooms render through mode "checking" too, where they are the FIRST
      // frame of every reload, and a guard in fallBackToLocal fixes only the mode
      // it names. Re-reading costs ~2.3s and answers with the chain's state; the
      // cache can only ever answer with an older one. Nothing else replays them,
      // so this filter is the whole fix.
      //
      // The `source: "local"` default stays for rooms saved before this app had
      // the field. That spread is exactly why the filter has to run first: a
      // saved chain room's own `source: "stellar"` overrides the default.
      rooms: parsed.rooms
        ?.filter((room) => room.source !== "stellar")
        .map((room) => ({ source: "local", ...room })) || initialDemoState.rooms,
    };
  } catch {
    return initialDemoState;
  }
}

function mergeStellarRooms(localRooms, stellarRooms) {
  const onChainIds = new Set(stellarRooms.map((room) => room.id));
  return [...stellarRooms, ...localRooms.filter((room) => room.source !== "stellar" && !onChainIds.has(room.id))];
}

export function DemoProvider({ children }) {
  const [state, setState] = useState(readState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let active = true;
    async function connect() {
      try {
        const status = await getStellarStatus();
        if (!active) return;
        // Only a signer-bearing gateway is a gateway. A gateway running without
        // a contract configured says so itself, in these words: mode "local",
        // connected false (testnet-gateway.mjs:91-98). That is a verdict about
        // the GATEWAY, and this app used to adopt it whole and call every room a
        // simulation — but the chain is readable without a gateway, so the same
        // reply that rules out signing rules out nothing about reading. Anything
        // else that answers with JSON carries no `mode` at all and lands here
        // too, which is the same conclusion for the same reason.
        if (!canWrite(status)) {
          await connectReadOnly();
          return;
        }
        const stellarRooms = await getStellarRooms();
        if (!active) return;
        setState((current) => ({
          ...current,
          network: status,
          rooms: mergeStellarRooms(current.rooms, stellarRooms),
        }));
      } catch {
        // No gateway. That is the normal case for the public web build: the
        // gateway holds member keys and shells out to the Stellar CLI, so it is
        // not something we host. Reads need none of that, so before pretending
        // everything is a simulation, ask the chain directly.
        if (!active) return;
        await connectReadOnly();
      }
    }

    /** Real on-chain data, straight from the public RPC. No backend, no keys. */
    async function connectReadOnly() {
      if (!isRpcConfigured()) {
        fallBackToLocal();
        return;
      }
      // Before the first await, because the wait is the point: "checking" covers
      // asking the gateway (~5ms) and reading the chain (~2.3s) alike, and for
      // those 2.3s the chain-only surface would otherwise have to render through
      // the pages it is replacing — a screenful of confident local fiction, which
      // is the window this mode exists to close. The gateway path returns at
      // :193-196 and never calls this function, so mode "stellar" never observes
      // "reading".
      setState((current) => ({
        ...current,
        network: { ...current.network, mode: "reading", message: "Membaca kontrak…" },
      }));
      try {
        const [status, chain] = await Promise.all([readStatus(), readRooms()]);
        if (!active) return;
        setState((current) => ({
          ...current,
          // How many of the contract's rooms this read could not get. The home
          // total is a sum over the rooms that answered, so without this it
          // cannot tell an empty contract from an empty answer — and readRooms
          // resolves either way, so the ledger height beside it is real while
          // the zero under it is not.
          network: { ...status, roomsUnread: chain.unread },
          rooms: mergeStellarRooms(current.rooms, chain.rooms),
        }));
      } catch {
        if (active) fallBackToLocal();
      }
    }

    function fallBackToLocal() {
      setState((current) => ({
        ...current,
        network: {
          connected: false,
          mode: "local",
          network: "testnet",
          message: "Gateway dan RPC tidak dapat dihubungi. Semua aksi menjadi simulasi lokal.",
        },
      }));
    }

    connect();
    return () => { active = false; };
  }, []);

  const actions = useMemo(
    () => ({
      getRoom(id) {
        return state.rooms.find((room) => room.id === id);
      },
      async sealRoom(id) {
        const room = state.rooms.find((item) => item.id === id);
        if (!room) throw new Error("Room tidak ditemukan.");
        // A room read straight off the chain is real. Without a signer we can
        // neither change it on-chain nor pretend to change it locally: writing a
        // fake "sealed" onto real data would put a lie on the screen.
        if (isReadOnly(room, state.network)) throw new Error(READ_ONLY_MESSAGE);
        const updated = room.source === "stellar" ? await startStellarRoom(id) : { ...room, status: "sealed" };
        setState((current) => ({
          ...current,
          rooms: current.rooms.map((item) => (item.id === id ? { ...item, ...updated } : item)),
          activities: [
            {
              id: `seal-${Date.now()}`,
              title: room.source === "stellar" ? "Room aktif di smart contract" : "Room simulasi berhasil dikunci",
              detail: room.source === "stellar" ? "Transaksi start_room dikirim ke Stellar Testnet" : "Daftar anggota dan nominal dikunci secara lokal",
              time: "Baru saja",
              kind: "locked",
            },
            ...current.activities,
          ],
        }));
      },
      async completeDraw(id) {
        const room = state.rooms.find((item) => item.id === id);
        if (!room) throw new Error("Room tidak ditemukan.");
        // Same reason as sealRoom: no signer, so a draw on a chain-read room can
        // only ever be theatre. Refuse rather than invent a winner.
        if (isReadOnly(room, state.network)) throw new Error(READ_ONLY_MESSAGE);
        const previousHistory = room.history?.length ? room.history : room.result ? [room.result] : [];
        const previousWinners = new Set(previousHistory.map((item) => item.winner));
        const candidates = room.members.filter((member) => !previousWinners.has(member.name));
        const localWinner = candidates[(room.round * 7) % Math.max(candidates.length, 1)] || room.members[0];
        const localComplete = room.round >= room.memberLimit;
        const localNextKocok = localComplete
          ? null
          : (room.nextKocok || Math.floor(Date.now() / 1000)) + DEMO_CADENCE_SECONDS;
        const result = room.source === "stellar"
          ? await drawStellarRoom(id)
          : {
            roomId: id,
            roomName: room.name,
            round: room.round,
            winner: localWinner.name,
            firstName: localWinner.name.split(" ")[0],
            amount: room.pool,
            participants: room.memberLimit,
            transactionId: `local-${id}-round-${room.round}`,
            timestamp: new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }),
            source: "local",
            isComplete: localComplete,
            nextRound: localComplete ? room.round : room.round + 1,
            nextKocok: localNextKocok,
            nextDate: localNextKocok ? new Date(localNextKocok * 1000).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : room.nextDate,
          };
        setState((current) => ({
          ...current,
          drawResult: result,
          rooms: current.rooms.map((item) =>
            item.id === id ? {
              ...item,
              status: result.isComplete ? "paid" : "sealed",
              round: result.nextRound || item.round,
              winner: result.winner,
              result,
              history: [...previousHistory.filter((entry) => entry.round !== result.round), result],
              nextKocok: result.nextKocok ?? item.nextKocok,
              nextDate: result.nextDate || item.nextDate,
            } : item,
          ),
          activities: [
            {
              id: `draw-${Date.now()}`,
              title: `${result.winner} mendapat giliran`,
              detail: room.source === "stellar" ? `${room.name}, pembayaran tercatat di Stellar Testnet` : `${room.name}, hasil hanya disimpan lokal`,
              time: "Baru saja",
              kind: "draw",
            },
            ...current.activities,
          ],
        }));
        return result;
      },
      async createRoom(payload) {
        if (canWrite(state.network)) {
          const room = await createStellarRoom(payload);
          setState((current) => ({
            ...current,
            rooms: [room, ...current.rooms.filter((item) => item.id !== room.id)],
            activities: [
              {
                id: `create-${Date.now()}`,
                title: "Room Testnet dibuat",
                detail: `${room.name}, contract room ${room.chainRoomId}`,
                time: "Baru saja",
                kind: "room",
              },
              ...current.activities,
            ],
          }));
          return room.id;
        }

        const id = `room-${Date.now()}`;
        const selectedMembers = members.slice(0, Number(payload.memberLimit));
        const nextKocok = Math.floor(new Date(payload.drawAt).getTime() / 1000);
        const room = {
          id,
          code: `AWR-${String(Date.now()).slice(-6)}`,
          name: payload.name,
          host: state.profile.name,
          contribution: Number(payload.contribution),
          memberLimit: Number(payload.memberLimit),
          paidCount: selectedMembers.length,
          pool: Number(payload.contribution) * selectedMembers.length,
          round: 1,
          drawAt: payload.drawAt,
          nextKocok,
          nextDate: new Date(payload.drawAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
          scheduleAgreed: payload.scheduleAgreed,
          cadenceSeconds: DEMO_CADENCE_SECONDS,
          status: "ready",
          source: "local",
          history: [],
          members: selectedMembers.map((name, index) => ({
              id: `local-${id}-${index}`,
              name,
              amount: Number(payload.contribution),
              paid: true,
            })),
        };
        setState((current) => ({
          ...current,
          rooms: [room, ...current.rooms],
          activities: [
            {
              id: `create-${Date.now()}`,
              title: "Room simulasi dibuat",
              detail: `${room.name}, kode ${room.code}`,
              time: "Baru saja",
              kind: "room",
            },
            ...current.activities,
          ],
        }));
        return id;
      },
      resetDemo() {
        localStorage.removeItem(STORAGE_KEY);
        setState((current) => ({
          ...initialDemoState,
          network: current.network,
          // Chain rooms survive a reset because this reset cannot touch them:
          // they are the contract's, and nothing here can undo one. Dropping
          // them from state would only make the app forget a room that still
          // exists, and forget it permanently — the fetch that found it runs
          // once, on mount (the connect effect above, deps []), so nothing
          // brings it back.
          //
          // Only the gateway reaches this now. The button is on /app/profil,
          // which isChainOnly routes to the chain board instead, and modes
          // "local" and "checking" have no chain room to keep — so what survives
          // here is the gateway's own rooms. The copy this re-persists is stale
          // the moment it lands, and readState drops it on the next load, which
          // is where the gateway re-supplies them.
          rooms: mergeStellarRooms(
            initialDemoState.rooms,
            current.rooms.filter((room) => room.source === "stellar"),
          ),
        }));
      },
    }),
    [state],
  );

  return <DemoContext.Provider value={{ state, ...actions }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}

export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const STROOPS_PER_XLM = 10_000_000;

/**
 * Stroops are the contract's own unit. Calling them XLM is a claim about which
 * token the contract was initialized with, and both deploy paths in this repo
 * make it true: server/bootstrap-testnet.mjs and .github/workflows/soroban.yml
 * each resolve the token with `--asset native`. A contract initialized with
 * anything else would make this suffix a guess, and this file would have to be
 * told. 7 fraction digits because that is exactly a stroop: fewer would round a
 * balance the chain states exactly.
 */
function formatXlm(stroops) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 7 }).format(stroops / STROOPS_PER_XLM)} XLM`;
}

/**
 * Money in the unit its room actually keeps it in, chosen by which number the
 * room can offer rather than by which one happens to be at hand.
 *
 * A room read off the chain has no Rupiah: nobody ever priced its share, so
 * stroops is all it has. A local or gateway room is the reverse — its Rupiah is
 * a figure its own demo declared, and the gateway deliberately keeps that apart
 * from the stroops it moves. Neither number is a conversion of the other, and
 * formatting whichever one was present is how 1.000.000 stroops (0,1 XLM)
 * became "Rp1.000.000".
 */
export function formatMoney({ stroops, rupiah }) {
  if (rupiah != null) return formatRupiah(rupiah);
  if (stroops != null) return formatXlm(stroops);
  // Neither means the amount is genuinely unknown: lockedStroops answers null
  // for a room whose status this build cannot account for. Zero is a claim, and
  // this is the one case where we have nothing to back it.
  return "Belum diketahui";
}
