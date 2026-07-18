import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoProvider, isChainOnly, useDemo } from "./demo-state.jsx";

/**
 * The two decisions the chain-only surface is routed on, tested where they are
 * made. Deliberately imports demo-state and not App: the seam's other half is
 * app/src/chain/ChainBoard.jsx, which another lane owns, and a test of this rule
 * should not go red because that file is mid-flight. What App.jsx adds on top is
 * one line — `if (isChainOnly(state.network)) return <ChainBoard />` — and the
 * readonly-* files already measure it end to end.
 */

const STORAGE_KEY = "awrisan-demo-v6";

const rpc = vi.hoisted(() => ({ configured: true, readStatus: null, readRooms: null }));
vi.mock("./stellar-rpc.js", () => ({
  isRpcConfigured: () => rpc.configured,
  readStatus: () => rpc.readStatus(),
  readRooms: () => rpc.readRooms(),
}));

function Probe() {
  const { state } = useDemo();
  return (
    <>
      <span data-testid="mode">{state.network.mode}</span>
      <span data-testid="sources">{state.rooms.map((room) => `${room.id}:${room.source}`).join(" ")}</span>
    </>
  );
}

const chainRoom = {
  id: "stellar-5",
  source: "stellar",
  status: "sealed",
  name: "Room Stellar",
  round: 2,
  memberLimit: 3,
  paidCount: 3,
  // 1,8 XLM. The number from the live report: real once, and this is the only
  // path that can put it back on screen after the read that found it is gone.
  lockedStroops: 18_000_000,
  members: [],
  history: [],
};
const localRoom = { id: "rt-08", source: "local", status: "ready", name: "Arisan RT 08", members: [], history: [] };

beforeEach(() => {
  // No gateway. That is the public build: a static host has nothing on /api/*.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no gateway")));
  rpc.configured = true;
  rpc.readStatus = async () => { throw new Error("RPC down"); };
  rpc.readRooms = async () => { throw new Error("RPC down"); };
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.removeItem(STORAGE_KEY);
});

describe("the chain-only discriminator", () => {
  it("names the two modes with no gateway behind them, and no others", () => {
    // The read in flight and the read landed. Same surface: only it can say which.
    expect(isChainOnly({ mode: "reading" })).toBe(true);
    expect(isChainOnly({ mode: "readonly" })).toBe(true);
    // The gateway signs, so it keeps the pages it was written for. This is the
    // case a room-level gate would get wrong: the gateway emits `source:
    // "stellar"` rooms too (server/testnet-gateway.mjs:199), so `room.source ===
    // "stellar"` would route the gateway's own rooms — the demo video's
    // evidence — onto a surface that cannot act on them.
    expect(isChainOnly({ mode: "stellar" })).toBe(false);
    expect(isChainOnly({ mode: "local" })).toBe(false);
    expect(isChainOnly({ mode: "checking" })).toBe(false);
    expect(isChainOnly(undefined)).toBe(false);
  });
});

describe("a chain room in localStorage", () => {
  it("is dropped on load, so a failed read cannot render custody it did not verify", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms: [chainRoom, localRoom] }));

    render(<DemoProvider><Probe /></DemoProvider>);

    // The first frame, before any await: this is where the replay used to land,
    // and mode "checking" renders it just as readily as mode "local" does.
    expect(screen.getByTestId("sources")).toHaveTextContent("rt-08:local");
    expect(screen.getByTestId("sources")).not.toHaveTextContent("stellar");

    // And after the read fails, which is the reported state: "1,8 XLM terkunci di
    // Stellar Testnet" under "Gateway dan RPC tidak dapat dihubungi". There is no
    // room left to sum, so there is no number to caption.
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("local"));
    expect(screen.getByTestId("sources")).not.toHaveTextContent("stellar");
  });

  it("does not take the local rooms with it", async () => {
    rpc.configured = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms: [chainRoom, localRoom] }));

    render(<DemoProvider><Probe /></DemoProvider>);

    expect(screen.getByTestId("sources")).toHaveTextContent("rt-08:local");
  });
});

describe("the gateway path", () => {
  it("re-supplies its own rooms, and never routes to the chain-only surface", async () => {
    // The gateway emits `source: "stellar"` too, so the load filter above drops
    // ITS cached rooms as well. That costs it nothing and this is the proof: the
    // gateway is the authority for its own rooms (it keeps them in a file and
    // hands back the lot, testnet-gateway.mjs:211/:322) and re-supplies them on
    // connect. A cache is only worth keeping when nothing will refill it.
    const gatewayRoom = {
      id: "stellar-1", source: "stellar", status: "ready", name: "Room Gateway",
      contribution: 1_000_000, pool: 5_000_000, memberLimit: 5, paidCount: 5, members: [], history: [],
    };
    const json = (body) => new Response(JSON.stringify(body), {
      status: 200, headers: { "content-type": "application/json" },
    });
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url).endsWith("/status")) {
        return json({ connected: true, mode: "stellar", network: "testnet", contractId: "CDTNEK", members: [] });
      }
      if (String(url).endsWith("/rooms")) return json([gatewayRoom]);
      throw new Error(`unexpected ${url}`);
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms: [chainRoom, localRoom] }));

    render(<DemoProvider><Probe /></DemoProvider>);

    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("stellar"));
    expect(screen.getByTestId("sources")).toHaveTextContent("stellar-1:stellar");
    expect(screen.getByTestId("sources")).toHaveTextContent("rt-08:local");
    // The readonly room the cache was carrying does not get merged in beside the
    // gateway's own. mergeStellarRooms drops it only once a read succeeds, and a
    // gateway that answers is not a read of the room this cache came from.
    expect(screen.getByTestId("sources")).not.toHaveTextContent("stellar-5");
    // The signer's mode, so the pages it was written for. This is the assertion
    // the whole round rests on: nothing here routes on a room's `source`.
    expect(isChainOnly({ mode: "stellar" })).toBe(false);
  });
});

describe("the read in flight", () => {
  it("says so before the first await, instead of borrowing the pages it replaces", async () => {
    // Never resolves: the 2.3s window, held open. What renders through it used to
    // be the local simulation's two hand-written rooms — Rp100.000.000 of
    // confident fiction — because "checking" covered the chain read as well as
    // the gateway's ~5ms question.
    rpc.readStatus = () => new Promise(() => {});
    rpc.readRooms = () => new Promise(() => {});

    render(<DemoProvider><Probe /></DemoProvider>);

    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("reading"));
  });
});
