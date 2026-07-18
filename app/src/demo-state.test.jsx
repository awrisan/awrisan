import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Which way DemoProvider routes when it asks /api/stellar/status, and what it
 * does with an answer that is not a gateway's.
 *
 * The chain is stubbed here on purpose: the subject is the routing decision, not
 * the RPC. What the chain answers once we get there is the new view's question
 * (app/src/chain/), and its own tests drive the real read path to ask it.
 *
 * THE FIXTURE BELOW IS NOT A ROOM, and is cut down so it cannot be mistaken for
 * one. It carries `id` (mergeStellarRooms dedupes on it) and `source` (the probe
 * counts it) and nothing else — no status, no round, no memberLimit, no
 * lockedStroops. The earlier version added `name` and an empty `members` and
 * looked like the real thing while failing the field contract on every EMIT
 * field: a shape no producer can emit, sitting in a file whose readers might one
 * day believe it. Anything that needs a real room must read one through
 * chain-stub.js, which is the whole reason that file exists.
 */
vi.mock("./stellar-rpc.js", () => ({
  isRpcConfigured: () => true,
  readStatus: async () => ({
    connected: true,
    canWrite: false,
    mode: "readonly",
    network: "testnet",
    contractId: "CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX",
    message: "Data dibaca langsung dari smart contract di Stellar Testnet.",
  }),
  readRooms: async () => ({
    rooms: [{ id: "stellar-6", source: "stellar" }],
    unread: 0,
  }),
}));

const { DemoProvider, useDemo } = await import("./demo-state.jsx");

/** mode, and how many of the rooms on screen are real. Both, or the fix is half. */
function NetworkProbe() {
  const { state } = useDemo();
  return <p>{`${state.network.mode}/${state.rooms.filter((room) => room.source === "stellar").length}`}</p>;
}

function renderProbe() {
  render(<DemoProvider><NetworkProbe /></DemoProvider>);
}

/**
 * Answer /status and /rooms separately, the way anything sitting on this URL
 * actually would.
 *
 * The rooms body is why this helper exists, and it is the whole difference
 * between a test that bites and one that watches. The version before it answered
 * every path with the same object, so with the guard deleted `getStellarRooms()`
 * resolved to `{ ok: true }`, mergeStellarRooms called `.map` on it, and the
 * TypeError landed in connect()'s own catch — which calls connectReadOnly().
 * The suite stayed GREEN over a deleted guard, because the assertion below is
 * reachable twice: once by the guard, and once by a crash that happens to end up
 * somewhere similar. An outcome two paths reach is not evidence for either.
 */
function stubGateway({ status, rooms }) {
  vi.stubGlobal("fetch", vi.fn(async (url) => new Response(
    JSON.stringify(String(url).endsWith("/rooms") ? rooms : status),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
}

afterEach(() => vi.unstubAllGlobals());

describe("DemoProvider connect", () => {
  it("reads the chain when a static host answers /api/* with the SPA shell", async () => {
    // No gateway is hosted, so this is what the public build actually gets: a
    // rewrite to index.html at HTTP 200. The body does not parse, so this never
    // reaches the guard — request() throws and connect()'s catch is what routes
    // it. That is a different path from the test below, and it is the normal one.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "<!doctype html><html><body><div id=\"root\"></div></body></html>",
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    )));

    renderProbe();

    expect(await screen.findByText("readonly/1")).toBeInTheDocument();
  });

  it("reads the chain when something answers with JSON that is not a gateway status", async () => {
    // Parses fine, says nothing about the chain. An edge cache, a health check,
    // an older gateway: only mode "stellar" is a gateway that can sign. This is
    // the one test that reaches the guard, so it answers /rooms with a real list
    // — without it the no-guard path crashes into the catch and arrives at the
    // same screen, proving nothing.
    stubGateway({ status: { ok: true }, rooms: [] });

    renderProbe();

    // Delete the guard and this reads "undefined/0": network becomes the `{ok:
    // true}` body itself, and the chain rooms never get read. A mode of
    // undefined is not a harmless blank — canWrite is false for it, so it fails
    // safe, but the home page titles it "Mode simulasi lokal" and hands a real
    // contract's rooms the caption of a simulation.
    expect(await screen.findByText("readonly/1")).toBeInTheDocument();
  });

  it("uses the gateway, and does not go read-only, when one can actually sign", async () => {
    // The control, and the reason the guard is a `canWrite` question rather than
    // an unconditional connectReadOnly(). Without this, "if (true)" passes every
    // other test in this file: the guard's job is to tell these two apart, so
    // both directions have to be pinned or only one of them is.
    stubGateway({
      status: {
        connected: true,
        mode: "stellar",
        network: "testnet",
        contractId: "CDTNEK4EXYCEZY6XF5MZHQ7C7GBOYYVYR4MBS6D32LPP5OG2L2L4CIDX",
      },
      rooms: [{ id: "stellar-4", chainRoomId: 4, source: "stellar", name: "Arisan Gateway", members: [] }],
    });

    renderProbe();

    // The gateway's own room, through the gateway's own path. The stubbed
    // readRooms above would have said "stellar-6"; nothing here should reach it.
    expect(await screen.findByText("stellar/1")).toBeInTheDocument();
    expect(screen.getByText("stellar/1")).toBeInTheDocument();
  });
});
