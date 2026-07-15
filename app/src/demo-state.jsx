import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createStellarRoom,
  drawStellarRoom,
  getStellarRooms,
  getStellarStatus,
  startStellarRoom,
} from "./stellar-client.js";

const STORAGE_KEY = "awrisan-demo-v2";

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
      nextDate: "18 Juli 2026",
      status: "ready",
      source: "local",
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
      nextDate: "25 Juli 2026",
      status: "funding",
      source: "local",
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
      rooms: parsed.rooms?.map((room) => ({ source: "local", ...room })) || initialDemoState.rooms,
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
        if (!status.connected) {
          setState((current) => ({ ...current, network: status }));
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
        if (active) {
          setState((current) => ({
            ...current,
            network: {
              connected: false,
              mode: "local",
              network: "testnet",
              message: "Gateway tidak aktif. Semua aksi tetap menjadi simulasi lokal.",
            },
          }));
        }
      }
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
        const result = room.source === "stellar"
          ? await drawStellarRoom(id)
          : {
            roomId: id,
            roomName: room.name,
            round: room.round,
            winner: "Rani Wulandari",
            firstName: "Rani",
            amount: room.pool,
            participants: room.memberLimit,
            transactionId: "local-a3f9b8421d7e0c21",
            timestamp: "15 Juli 2026, 19.32 WIB",
            source: "local",
          };
        setState((current) => ({
          ...current,
          drawResult: result,
          rooms: current.rooms.map((item) =>
            item.id === id ? { ...item, status: "paid", winner: result.winner, result } : item,
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
        if (state.network.connected) {
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
        const room = {
          id,
          code: `AWR-${String(Date.now()).slice(-6)}`,
          name: payload.name,
          host: state.profile.name,
          contribution: Number(payload.contribution),
          memberLimit: Number(payload.memberLimit),
          paidCount: 1,
          pool: Number(payload.contribution),
          round: 1,
          nextDate: payload.startDate || "1 Agustus 2026",
          status: "funding",
          source: "local",
          members: [
            {
              id: "host",
              name: state.profile.name,
              amount: Number(payload.contribution),
              paid: true,
            },
          ],
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
        setState((current) => ({ ...initialDemoState, network: current.network }));
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
