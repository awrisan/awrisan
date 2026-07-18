import { describe, expect, it } from "vitest";

/**
 * No test in this suite may touch the network. This file proves the guard that
 * enforces it (test-setup.js) actually bites.
 *
 * App.test.jsx did touch it, silently, for as long as it existed: it mocked
 * neither fetch nor the SDK, so DemoProvider's connect effect fired 29 live
 * simulateTransaction POSTs at soroban-testnet.stellar.org per render and merged
 * the real contract's rooms into a suite about a landing page. A green run meant
 * "the public testnet answered today, and held what it held today", and nothing
 * said so.
 *
 * What this file replaces: a regex over every test file's source, asserting each
 * one contained `vi.mock("./stellar-rpc.js"` or `vi.mock("@stellar/stellar-sdk"`.
 * That checked the spelling of a mock, never its effect — and the gap is not
 * theoretical. This satisfies the needle in full:
 *
 *     vi.mock("@stellar/stellar-sdk", async (o) => await o());
 *
 * It replaces nothing. The file reads as mocked, the scan goes green, and the
 * real Server goes to the real RPC. The scan was also blind the other way: it
 * skipped any file not matching /DemoProvider|<App/, so a file reaching the chain
 * through stellar-rpc.js directly was never asked.
 *
 * So: mock nothing here, on purpose, and go and try. This file is the passthrough
 * case, and the two tests below are the only place in the suite where the real
 * SDK meets the real code path — which is exactly what makes them evidence.
 *
 * MEASURED, not asserted: deleting `globalThis.fetch = refuseNetwork` from
 * test-setup.js kills both tests below. (Run on a copy of src/ with setupFiles
 * pointed at it — mutating test-setup.js in place proves nothing, because vitest
 * loads the config's own path and the copy is never read.) The check this
 * replaced could not be killed that way at all: it read test files as text, so
 * the only thing that could break it was a rename.
 */
const { readStatus } = await import("./stellar-rpc.js");

describe("the suite is offline, and can be shown to be", () => {
  it("refuses a bare fetch at the public RPC", async () => {
    // The guard itself, at its own front door. If test-setup.js stops installing
    // it, this is the test that says so rather than the next silent live run.
    await expect(fetch("https://soroban-testnet.stellar.org")).rejects.toThrow(/netguard/);
  });

  it("blocks the real SDK's own egress, which is how the live POSTs got out", async () => {
    // The effect, end to end: real stellar-rpc.js, real @stellar/stellar-sdk,
    // real rpc.Server, real RPC URL — and no network. Nothing in this file is
    // mocked, so a passthrough mock elsewhere leaves behind precisely this, and
    // this is what it would do.
    //
    // It also pins the assumption the guard rests on: that the SDK's transport is
    // globalThis.fetch. The day it moves to XHR or a node http agent, this test
    // fails and the guard needs teaching, instead of quietly waving traffic
    // through while every file still reads as mocked.
    await expect(readStatus()).rejects.toThrow(/netguard/);
  });
});
