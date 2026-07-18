import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";

/**
 * The three constants that decide WHICH chain, and WHICH contract, the shipped
 * build reads. Named in no test until this file: `grep -rl RPC_URL` and
 * `grep -rl NETWORK_PASSPHRASE` over the suite returned nothing, and CONTRACT_ID
 * appeared once, shape-checked against /^C[A-Z2-7]{55}$/ — which every one of the
 * 2^275 wrong contract ids also satisfies.
 *
 * Why that matters more here than it would anywhere else: the pitch is "real
 * on-chain data, verify it yourself". A judge reads DEPLOYMENTS.md, opens
 * stellar.expert at the id printed there, and compares it to what the app shows.
 * If this build reads a different contract, every number on screen is honestly
 * produced, correctly formatted, and about something else — and the whole claim
 * inverts. No sentence audit catches that: each sentence would be true of the
 * contract it actually read.
 *
 * So the defaults are pinned to the document, by reading the document. Not to a
 * literal copied into this file, which would only prove that two copies of a
 * string in the same repo match each other, and would go green on the day the
 * contract is redeployed and the docs are updated and the app is not.
 *
 * There is no .env in the build (`ls app/.env*` is empty), so these defaults are
 * what ships.
 */

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEPLOYMENTS = readFileSync(path.join(REPO, "DEPLOYMENTS.md"), "utf8");

const { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL, isRpcConfigured } = await import("./stellar-rpc.js");

/**
 * The contract id DEPLOYMENTS.md hands a judge, taken from the document itself.
 *
 * Anchored: a regex that finds nothing would make every assertion below compare
 * undefined to undefined and pass. That is the fail-GREEN scrape this repo has
 * already shipped once.
 */
const documentedContract = DEPLOYMENTS.match(/\bC[A-Z2-7]{55}\b/)?.[0];
const documentedRpc = DEPLOYMENTS.match(/https:\/\/[\w.-]*soroban[\w.-]*\.stellar\.org/)?.[0];

describe("the document a judge is pointed at", () => {
  it("still names a contract and an RPC this test can read", () => {
    // The anchor. If DEPLOYMENTS.md is restructured and these stop matching, this
    // file must go red rather than quietly stop checking anything.
    expect(documentedContract, "no contract id found in DEPLOYMENTS.md").toMatch(/^C[A-Z2-7]{55}$/);
    expect(documentedRpc, "no soroban RPC URL found in DEPLOYMENTS.md").toBeTruthy();
  });
});

describe("the shipped build reads what the docs promise", () => {
  it("reads the contract DEPLOYMENTS.md sends a judge to verify", () => {
    // The one wire that must not be wrong. Every other test in this suite checks
    // what we say ABOUT the data; this checks that it is the data we pointed at.
    expect(CONTRACT_ID).toBe(documentedContract);
  });

  it("reads it from the RPC DEPLOYMENTS.md names", () => {
    expect(RPC_URL).toBe(documentedRpc);
  });

  it("signs nothing, but talks to the network the contract is deployed on", () => {
    // A passphrase mismatch does not fail loudly on a read: simulateTransaction
    // does not verify signatures, so the wrong passphrase can still return data.
    // It is pinned because it is the network identity every future write depends
    // on, and because "testnet" is claimed in prose all over this app.
    expect(NETWORK_PASSPHRASE).toBe(Networks.TESTNET);
    expect(NETWORK_PASSPHRASE).toBe("Test SDF Network ; September 2015");
    expect(DEPLOYMENTS).toMatch(/[Tt]estnet/);
  });

  it("considers itself configured with those defaults, with no env at all", () => {
    // isRpcConfigured gates connectReadOnly (demo-state.jsx:250): false here and
    // the public build silently never reads the chain, and falls back to calling
    // every room a simulation.
    expect(isRpcConfigured()).toBe(true);
  });
});

describe("the build-time override the module documents", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /**
   * stellar-rpc.js:26 states, as a claim: "Overridable at build time so a fresh
   * deploy needs no code change." Nothing tested it. If it silently did not work,
   * a redeploy would ship a build still reading the OLD contract while every
   * document said otherwise — the failure this file exists to prevent, arriving
   * through the escape hatch meant to prevent it.
   */
  it("takes a fresh contract id from VITE_AWRISAN_CONTRACT_ID", async () => {
    const fresh = "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K";
    vi.stubEnv("VITE_AWRISAN_CONTRACT_ID", fresh);
    vi.resetModules();

    const reloaded = await import("./stellar-rpc.js");

    expect(reloaded.CONTRACT_ID).toBe(fresh);
    expect(reloaded.CONTRACT_ID).not.toBe(documentedContract);
  });

  it("takes a fresh RPC and passphrase too", async () => {
    vi.stubEnv("VITE_STELLAR_RPC_URL", "https://rpc.example.invalid");
    vi.stubEnv("VITE_STELLAR_PASSPHRASE", "Public Global Stellar Network ; September 2015");
    vi.resetModules();

    const reloaded = await import("./stellar-rpc.js");

    expect(reloaded.RPC_URL).toBe("https://rpc.example.invalid");
    expect(reloaded.NETWORK_PASSPHRASE).toBe("Public Global Stellar Network ; September 2015");
  });

  it("falls back to the documented defaults when the env is empty", async () => {
    // The control. Without it, an override test passes just as well against a
    // module that ignores its defaults entirely — and the defaults are what ships.
    vi.stubEnv("VITE_AWRISAN_CONTRACT_ID", "");
    vi.resetModules();

    const reloaded = await import("./stellar-rpc.js");

    expect(reloaded.CONTRACT_ID).toBe(documentedContract);
  });
});
