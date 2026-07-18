import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock;

/**
 * No test may touch the network, enforced rather than described.
 *
 * The check this replaces was a regex over each test file's own source, looking
 * for the string `vi.mock("./stellar-rpc.js"`. It never checked the mock replaced
 * anything: `vi.mock("@stellar/stellar-sdk", async (o) => await o())` matches the
 * needle, hands back the real SDK, and fires 29 live simulateTransaction POSTs at
 * soroban-testnet per render. Spelling is not effect.
 *
 * This is the effect. The real SDK's egress goes through globalThis.fetch —
 * probed, not assumed: an unmocked readStatus() calls fetch exactly once, at
 * https://soroban-testnet.stellar.org/, and propagates the error verbatim. So a
 * fetch that refuses is a suite that cannot reach the internet, whatever any file
 * claims about its mocks.
 *
 * It fires only on egress actually attempted, which makes it exact rather than
 * strict: a file that stubs fetch has replaced this and is offline by
 * construction, and a file that genuinely replaces rpc.Server never calls fetch
 * at all. The only thing left to catch is the file that does neither — and that
 * file used to be App.test.jsx, silently, for months.
 */
async function refuseNetwork(input) {
  throw new Error(
    `netguard: a test reached the network (fetch ${String(input?.url ?? input)}). ` +
      "Stub fetch (chain-stub.js's stubStaticHost) or replace @stellar/stellar-sdk's " +
      "rpc.Server. A run that is green only because the public testnet answered today, " +
      "and held whatever it held today, is not a green run."
  );
}

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
  // Reinstalled per test rather than once: a file that stubs fetch snapshots
  // whatever is here, and vi.unstubAllGlobals() puts that snapshot back. Assign
  // before the stub and the snapshot is this trap, so an afterEach that unstubs
  // restores the guard instead of the real fetch.
  globalThis.fetch = refuseNetwork;
});

afterEach(() => cleanup());
